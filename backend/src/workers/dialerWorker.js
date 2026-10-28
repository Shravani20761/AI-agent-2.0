import prisma from '../lib/prisma.js';
import * as dograh from '../services/dograhService.js';

const TICK_MS = 12000; // 12 seconds between ticks
let _interval  = null;
let _running   = false;

// ─── Public API ──────────────────────────────────────────────────────────────

export function startWorker() {
  if (_running) return;
  _running = true;
  _interval = setInterval(tick, TICK_MS);
  console.log('[dialer] Worker started');
  tick(); // immediate first tick
}

export function stopWorker() {
  if (_interval) clearInterval(_interval);
  _running = false;
  _interval = null;
  console.log('[dialer] Worker stopped');
}

export function isRunning() { return _running; }

// ─── Core tick ───────────────────────────────────────────────────────────────

async function tick() {
  try {
    // 1. Check for any IN_PROGRESS job — poll Dograh for result
    const active = await prisma.outboundCallQueue.findFirst({
      where: { status: 'IN_PROGRESS' },
    });

    if (active) {
      if (!active.dograhRunId) {
        // Stuck — reset to QUEUED
        await prisma.outboundCallQueue.update({ where: { id: active.id }, data: { status: 'QUEUED' } });
        return;
      }
      const result = await dograh.getRunResult(active.workflowId, active.dograhRunId);
      if (!result.isCompleted) return; // still ringing/talking
      await processResult(active, result);
      return;
    }

    // 2. Pick next QUEUED job (priority ASC, then scheduledAt ASC)
    const next = await prisma.outboundCallQueue.findFirst({
      where: { status: 'QUEUED', scheduledAt: { lte: new Date() } },
      orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
    });

    if (!next) return; // queue empty

    // 3. Fire the call
    await prisma.outboundCallQueue.update({ where: { id: next.id }, data: { status: 'IN_PROGRESS', attempts: { increment: 1 } } });

    let runResult;
    try {
      runResult = await dograh.triggerCall(next.workflowUuid, next.phone, next.initialContext);
    } catch (e) {
      console.error('[dialer] triggerCall failed:', e.message);
      await prisma.outboundCallQueue.update({
        where: { id: next.id },
        data: { status: next.attempts + 1 >= next.maxAttempts ? 'FAILED' : 'QUEUED', scheduledAt: new Date(Date.now() + 7200000) },
      });
      return;
    }

    await prisma.outboundCallQueue.update({
      where: { id: next.id },
      data: { dograhRunId: runResult.workflow_run_id },
    });
    console.log(`[dialer] Call fired → ${next.phone} | runId=${runResult.workflow_run_id} | agent=${next.agentType}`);

  } catch (e) {
    console.error('[dialer] tick error:', e.message);
  }
}

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

const COMM_OUTCOME_MAP = {
  interested:         'INTERESTED',
  demo_scheduled:     'INTERESTED',
  callback_required:  'CALLBACK',
  not_interested:     'NOT_INTERESTED',
  do_not_call:        'DO_NOT_CALL',
};

// 3-level priority chain — mirrors webhooks.controller.js
function resolveOutcome(commOutcome, hadRecentAppointment, callDisposition) {
  if (commOutcome && COMM_OUTCOME_MAP[commOutcome]) {
    console.log(`[dialer] Outcome source: log_communication (${commOutcome})`);
    return COMM_OUTCOME_MAP[commOutcome];
  }
  if (hadRecentAppointment) {
    console.log('[dialer] Outcome source: recent Appointment (schedule_appointment was called this call)');
    return 'INTERESTED';
  }
  const mapped = DISPOSITION_TO_OUTCOME[callDisposition] ?? 'NO_ANSWER';
  console.log(`[dialer] Outcome source: call_disposition (${callDisposition} → ${mapped})`);
  return mapped;
}

// ─── Process call result ──────────────────────────────────────────────────────

async function processResult(job, result) {
  const { callDisposition, gatheredContext, durationSecs, transcriptUrl } = result;

  // Always log the communication if not already logged via MCP
  try {
    if (job.personId) {
      const runIdStr = String(job.dograhRunId);
      const existingComm = await prisma.communication.findFirst({
        where: {
          personId: job.personId,
          OR: [
            { callId: runIdStr },
            { createdAt: { gte: new Date(Date.now() - 600000) }, agentType: job.agentType },
          ],
        },
      });

      if (!existingComm) {
        await prisma.communication.create({
          data: {
            personId:    job.personId,
            type:        'CALL',
            direction:   'OUTBOUND',
            content:     transcriptUrl || `${job.agentType} call — ${callDisposition || 'completed'}`,
            agentType:   job.agentType,
            callId:      runIdStr,
            durationSecs: durationSecs ? Math.floor(durationSecs) : undefined,
          },
        });
      }

      await prisma.agentLog.create({
        data: {
          agentType:     job.agentType,
          personId:      job.personId,
          toolUsed:      'outbound_call_completed',
          inputSummary:  `Polled run ${runIdStr}`,
          outputSummary: `Completed call to ${job.phone}. Disposition=${callDisposition || 'completed'}.`,
          success: true,
        },
      });
    }
  } catch (e) { console.error('[dialer] comm log error:', e.message); }

  // ── Guarantee a ColdCall record for COLD_CALLING jobs ──────────────────────
  // The voice agent should call log_cold_call via MCP, but if it doesn't (e.g.
  // it called schedule_appointment instead), we create the record here so that
  // the Call Logs tab, "Never Called" filter, and Last Outcome column all update.
  if (job.agentType === 'COLD_CALLING' && job.personId) {
    try {
      const cutoff = new Date(Date.now() - 900000); // 15-minute dedup window
      const existing = await prisma.coldCall.findFirst({
        where: { personId: job.personId, calledAt: { gte: cutoff } },
      });

      if (!existing) {
        const runIdStr = job.dograhRunId ? String(job.dograhRunId) : null;

        // Check if webhook already created a record for this run
        const webhookCreated = runIdStr
          ? await prisma.coldCall.findUnique({ where: { dograhRunId: runIdStr } })
          : null;

        const callWindow = new Date(Date.now() - 1800000); // 30-minute window

        // Level 1: agent declared outcome via log_communication (linked by call_id = run ID)
        const commRecord = runIdStr
          ? await prisma.communication.findFirst({
              where: { personId: job.personId, agentType: 'COLD_CALLING', callId: runIdStr },
              select: { outcome: true, content: true },
              orderBy: { createdAt: 'desc' },
            })
          : null;

        // Level 2: did schedule_appointment run during THIS call?
        const recentAppt = await prisma.appointment.findFirst({
          where: { personId: job.personId, createdAt: { gte: callWindow } },
          select: { id: true },
        });

        // Level 3: fall back to Dograh call_disposition
        const person = await prisma.person.findUnique({
          where: { id: job.personId }, select: { lifecycleStage: true },
        });

        const outcome = resolveOutcome(commRecord?.outcome, !!recentAppt, callDisposition);
        const callNotes = commRecord?.content ||
          gatheredContext?.call_summary ||
          gatheredContext?.summary ||
          gatheredContext?.notes ||
          null;

        if (webhookCreated) {
          console.log(`[dialer] ColdCall already created by webhook for run ${runIdStr} — skipping insert`);
        } else {
          await prisma.coldCall.create({
            data: {
              personId:    job.personId,
              campaign:    job.campaign || 'Cold Call',
              outcome,
              durationSecs: durationSecs ? Math.floor(durationSecs) : null,
              notes:        callNotes,
              agentType:   'COLD_CALLING',
              dograhRunId: runIdStr,
            },
          });
          console.log(`[dialer] ColdCall record created (fallback) → ${job.phone} | outcome=${outcome}`);
        }

        // Auto-create WarmLead only on genuine positive outcomes from THIS call
        if (outcome === 'INTERESTED') {
          const existingWarm = await prisma.warmLead.findFirst({ where: { personId: job.personId } });
          if (!existingWarm) {
            await prisma.warmLead.create({
              data: {
                personId: job.personId,
                notes: callNotes || 'Interested via cold call (auto-created after call)',
              },
            });
          }
        }

        // Advance lifecycle only if still at LEAD
        if (person?.lifecycleStage === 'LEAD') {
          const stageMap = { INTERESTED: 'INTERESTED', DO_NOT_CALL: 'LOST' };
          if (stageMap[outcome]) {
            await prisma.person.update({
              where: { id: job.personId },
              data: { lifecycleStage: stageMap[outcome] },
            });
          }
        }
      }
    } catch (e) { console.error('[dialer] ColdCall fallback error:', e.message); }
  }

  // Check if job was updated to DNC by MCP tool during the call
  const currentJob = await prisma.outboundCallQueue.findUnique({
    where: { id: job.id },
    select: { status: true }
  });
  const isDnc = currentJob?.status === 'DNC';

  // Retry if no answer
  const isNoAnswer = ['user_hangup', 'no_answer', null].includes(callDisposition);
  const canRetry   = job.attempts < job.maxAttempts && isNoAnswer && job.agentType !== 'COLD_CALLING' && !isDnc;

  await prisma.outboundCallQueue.update({
    where: { id: job.id },
    data: {
      status:      isDnc ? 'DNC' : (canRetry ? 'QUEUED' : 'DONE'),
      outcome:     callDisposition,
      gatheredCtx: gatheredContext,
      ...(canRetry && { scheduledAt: new Date(Date.now() + 7200000), dograhRunId: null }),
    },
  });

  console.log(`[dialer] Call done → ${job.phone} | disposition=${callDisposition} | agent=${job.agentType}`);
}

