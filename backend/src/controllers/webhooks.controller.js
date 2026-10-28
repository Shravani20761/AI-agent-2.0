import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

const DISPOSITION_TO_OUTCOME = {
  user_qualified:     'INTERESTED',
  not_interested:     'NOT_INTERESTED',
  user_hangup:        'NO_ANSWER',
  no_answer:          'NO_ANSWER',
  callback:           'CALLBACK',
  callback_requested: 'CALLBACK',
  do_not_call:        'DO_NOT_CALL',
  invalid_number:     'INVALID_NUMBER',
};

// Maps the agent's declared outcome (from log_communication) → ColdCall outcome enum
const COMM_OUTCOME_MAP = {
  interested:         'INTERESTED',
  demo_scheduled:     'INTERESTED',
  callback_required:  'CALLBACK',
  not_interested:     'NOT_INTERESTED',
  do_not_call:        'DO_NOT_CALL',
};

// 3-level priority chain for determining the true business outcome of a call.
// Level 1: agent declared it via log_communication.outcome (linked by call_id = run ID)
// Level 2: schedule_appointment was called during THIS call (detected via recent Appointment row)
// Level 3: Dograh call_disposition string as last resort
//
// NOTE: We deliberately do NOT use lifecycleStage for Level 2. The person may already
// be at DEMO_SCHEDULED from a previous call — reading stage gives false positives.
// A freshly created Appointment row is the only reliable signal that schedule_appointment
// ran during this specific call.
function resolveOutcome(commOutcome, hadRecentAppointment, callDisposition) {
  if (commOutcome && COMM_OUTCOME_MAP[commOutcome]) {
    console.log(`[webhook] Outcome source: log_communication (${commOutcome})`);
    return COMM_OUTCOME_MAP[commOutcome];
  }
  if (hadRecentAppointment) {
    console.log('[webhook] Outcome source: recent Appointment (schedule_appointment was called this call)');
    return 'INTERESTED';
  }
  const mapped = DISPOSITION_TO_OUTCOME[callDisposition] ?? 'NO_ANSWER';
  console.log(`[webhook] Outcome source: call_disposition (${callDisposition} → ${mapped})`);
  return mapped;
}

// POST /api/webhooks/dograh
// Dograh fires this after every workflow run completes (including user_hangup).
// No JWT — this is a machine-to-machine call. Verify optional secret header.
export const dograhWebhook = async (req, res) => {
  const secret = process.env.DOGRAH_WEBHOOK_SECRET;
  if (secret) {
    const incoming = req.headers['x-webhook-secret'] || req.headers['x-dograh-secret'];
    if (incoming !== secret) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }

  const body = req.body;
  const _v = (v) => v || '(none)';

  console.log('\n' + '─'.repeat(60));
  console.log('[webhook] Dograh webhook fired');
  console.log('[webhook] Timestamp     :', new Date().toISOString());
  console.log('[webhook] Run ID        :', body.workflow_run_id ?? '(missing)');
  console.log('[webhook] Campaign      :', _v(body.campaign_id));
  console.log('[webhook] Call time     :', _v(body.call_time));
  console.log('[webhook] Duration (s)  :', _v(body.duration_seconds));
  console.log('[webhook] Disposition   :', _v(body.gathered_context?.call_disposition));
  console.log('[webhook] Customer phone:', _v(body.initial_context?.customer_phone || body.customer_phone));
  console.log('[webhook] Customer name :', _v(body.initial_context?.customer_name));
  console.log('[webhook] Summary       :', _v(body.gathered_context?.call_summary || body.gathered_context?.summary));
  console.log('[webhook] Recording URL :', body.recording_url ?? '(none)');
  console.log('[webhook] Transcript URL:', body.transcript_url ?? '(none)');
  console.log('[webhook] Full payload  :\n', JSON.stringify(body, null, 2));
  console.log('─'.repeat(60) + '\n');

  const workflowRunId   = body.workflow_run_id;
  const callDisposition = body.gathered_context?.call_disposition;
  const callSummary     = body.gathered_context?.call_summary || body.gathered_context?.summary || null;
  const customerPhone   = body.initial_context?.customer_phone || body.customer_phone;
  const durationSecs    = body.duration_seconds ? Math.floor(parseFloat(body.duration_seconds)) : null;
  const campaignId      = body.campaign_id || null;

  if (!workflowRunId) {
    return err(res, 'Missing workflow_run_id');
  }

  // OutboundCallQueue.dograhRunId is Int — Dograh sends the run ID as a string
  const runIdInt = parseInt(workflowRunId, 10);

  // Deduplicate: if we already created a ColdCall for this exact run, skip
  const existing = await prisma.coldCall.findUnique({ where: { dograhRunId: workflowRunId } });
  if (existing) {
    console.log(`[webhook] ColdCall already exists for run ${workflowRunId} — skipping`);
    return ok(res, { skipped: true, coldCallId: existing.id });
  }

  // Find the queue job to get personId + agentType + campaign
  const queueJob = !isNaN(runIdInt)
    ? await prisma.outboundCallQueue.findFirst({
        where: { dograhRunId: runIdInt },
        select: { personId: true, agentType: true, campaign: true, phone: true },
      })
    : null;

  let personId  = queueJob?.personId;
  let agentType = queueJob?.agentType || 'COLD_CALLING';
  let campaign  = queueJob?.campaign  || campaignId || 'Cold Call';
  let phone     = queueJob?.phone     || customerPhone;

  // Fall back to phone lookup if queue job not found
  if (!personId && phone) {
    const normalised = phone.toString().replace(/[\s\-().+]/g, '').replace(/^91/, '');
    const person = await prisma.person.findFirst({
      where: { phone: { contains: normalised.slice(-10) } },
      select: { id: true },
    });
    personId = person?.id;
  }

  if (!personId) {
    console.warn(`[webhook] Could not resolve personId for run ${workflowRunId} (phone=${phone})`);
    return ok(res, { skipped: true, reason: 'person not found' });
  }

  // Only create ColdCall records for COLD_CALLING agent type
  if (agentType !== 'COLD_CALLING') {
    console.log(`[webhook] Skipping ColdCall creation for agentType=${agentType}`);
    return ok(res, { skipped: true, reason: 'not a cold call' });
  }

  // 30-minute window — all DB writes from the same call fall within this range
  const callWindow = new Date(Date.now() - 1800000);

  // Level 1: agent declared outcome via log_communication (linked by call_id = run ID)
  const commRecord = await prisma.communication.findFirst({
    where: { personId, agentType: 'COLD_CALLING', callId: workflowRunId },
    select: { outcome: true, content: true },
    orderBy: { createdAt: 'desc' },
  });

  // Level 2: did schedule_appointment run during THIS call?
  // Checking recent Appointment rows is precise — lifecycle stage alone is stale/ambiguous.
  const recentAppt = await prisma.appointment.findFirst({
    where: { personId, createdAt: { gte: callWindow } },
    select: { id: true },
  });

  const outcome = resolveOutcome(commRecord?.outcome, !!recentAppt, callDisposition);
  const notes   = commRecord?.content || callSummary;

  // Read lifecycle stage only for the warm-lead / lifecycle-advance logic below
  const person = await prisma.person.findUnique({
    where: { id: personId },
    select: { lifecycleStage: true },
  });

  const coldCall = await prisma.coldCall.create({
    data: {
      personId,
      campaign,
      agentType:   'COLD_CALLING',
      outcome,
      durationSecs,
      notes,
      dograhRunId: workflowRunId,
    },
  });

  console.log(`[webhook] ColdCall created → personId=${personId} | outcome=${outcome} | run=${workflowRunId}`);

  // Auto-create WarmLead only on genuine positive outcomes from THIS call
  if (outcome === 'INTERESTED') {
    const existingWarm = await prisma.warmLead.findFirst({ where: { personId } });
    if (!existingWarm) {
      await prisma.warmLead.create({
        data: { personId, notes: notes || 'Interested via cold call (webhook)' },
      });
      console.log(`[webhook] WarmLead auto-created for personId=${personId}`);
    }
  }

  // Advance lifecycle only if still at LEAD (MCP tools may have already moved it forward)
  if (person?.lifecycleStage === 'LEAD') {
    const stageMap = { INTERESTED: 'INTERESTED', DO_NOT_CALL: 'LOST' };
    if (stageMap[outcome]) {
      await prisma.person.update({ where: { id: personId }, data: { lifecycleStage: stageMap[outcome] } });
    }
  }

  return ok(res, { coldCallId: coldCall.id, outcome });
};
