import { z } from 'zod';
import prisma from '../../lib/prisma.js';

export async function normalizePhone(phone) {
  let normalized = phone.replace(/[\s\-().+]/g, '').replace(/^91/, '');
  if (normalized === '0000000000' || normalized === '9876543210' || normalized === '') {
    const active = await prisma.outboundCallQueue.findFirst({
      where: { status: 'IN_PROGRESS' },
    });
    if (active) {
      console.log(`[MCP Tool Call] Mapping dummy phone ${phone} to active call phone: ${active.phone}`);
      normalized = active.phone.replace(/[\s\-().+]/g, '').replace(/^91/, '');
    }
  }
  return normalized;
}

// ⭐ lookup_contact — used by ALL 9 agents
// Finds a person by phone. Returns full profile + recent enquiry + student status.
export function registerSharedTools(server) {

  server.tool(
    'lookup_contact',
    'Look up an existing contact by phone number. Always call this first before any other tool to check if the person is already in the system.',
    { phone: z.string().describe('Caller phone number. Use the phone number of the customer from context (e.g. customer_phone or caller_number).') },
    async ({ phone }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({
        where: { phone: { contains: normalized } },
        include: {
          enquiries: { orderBy: { createdAt: 'desc' }, take: 1 },
          student: { include: { feePlan: true, batch: { include: { course: true } } } },
          warmLeads: { orderBy: { createdAt: 'desc' }, take: 1 },
          admissions: { orderBy: { createdAt: 'desc' }, take: 1, include: { course: true } },
        },
      });

      const result = {
        found: !!person,
        person: person ? {
          id: person.id,
          name: person.name,
          phone: person.phone,
          email: person.email,
          lifecycle_stage: person.lifecycleStage,
          source: person.source,
          latest_enquiry: person.enquiries[0] || null,
          is_student: !!person.student,
          student: person.student ? {
            id: person.student.id,
            status: person.student.status,
            batch: person.student.batch?.name,
            course: person.student.batch?.course?.name,
            outstanding: person.student.feePlan?.outstandingAmount,
          } : null,
          latest_admission_stage: person.admissions[0]?.stage || null,
        } : null,
      };

      await _logAgentAction('lookup_contact', person?.id || null, { phone }, result);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // ⭐ log_communication — used by ALL 9 agents
  // Must be called at the end of every conversation to save transcript + notes.
  server.tool(
    'log_communication',
    `Save the call transcript, summary, and outcome at the end of every conversation. Always call this as the very last step before ending.

IMPORTANT — outcome field:
- For COLD_CALLING and WARM_LEAD agent types, outcome is REQUIRED. Do not skip it.
- Choose the value that best describes what was agreed during the call:
    "interested"        — person wants to know more but no specific appointment yet
    "demo_scheduled"    — a demo class date/time was confirmed (use this after schedule_appointment)
    "callback_required" — person asked to be called back later
    "not_interested"    — person clearly declined
    "do_not_call"       — person asked not to be contacted again
- For other agent types (support, fee, review) outcome can be omitted.

IMPORTANT — call_id field:
- Always pass the Dograh workflow run ID here (available as a system variable).
- This is the only way the CRM can link this log to the correct call record.`,
    {
      phone: z.string().describe('Phone number of the person'),
      agent_type: z.enum([
        'ENQUIRY', 'COLD_CALLING', 'WARM_LEAD', 'ADMISSION_CONVERSION',
        'REVIEW_REFERRAL', 'STUDENT_SUPPORT', 'FEE_ACCOUNTS',
        'STUDENT_ENGAGEMENT', 'FEE_RECOVERY', 'MANUAL',
      ]).describe('Which agent type is logging this call'),
      content: z.string().describe('Summary of the full conversation — what was discussed, what was agreed, any key details the contact mentioned'),
      call_id: z.string().optional().describe('Dograh workflow run ID. Always pass this — it links this log to the correct call record in the CRM'),
      duration_secs: z.number().optional().describe('Call duration in seconds'),
      direction: z.enum(['INBOUND', 'OUTBOUND']).default('INBOUND'),
      recording_url: z.string().optional().describe('URL to call recording if available'),
      outcome: z.enum(['interested', 'not_interested', 'demo_scheduled', 'callback_required', 'do_not_call'])
               .optional()
               .describe('Business outcome. REQUIRED for COLD_CALLING and WARM_LEAD agents. See tool description for value meanings.'),
    },
    async ({ phone, agent_type, content, call_id, duration_secs, direction, recording_url, outcome }) => {
      const normalized = await normalizePhone(phone);
      let person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });

      if (!person) {
        person = await prisma.person.create({ data: { name: 'Unknown', phone: normalized, source: 'VOICE_AGENT' } });
      }

      const comm = await prisma.communication.create({
        data: {
          personId:    person.id,
          type:        'CALL',
          direction,
          content,
          callId:      call_id,
          durationSecs: duration_secs,
          recordingUrl: recording_url,
          agentType:   agent_type,
          outcome:     outcome ?? null,
        },
      });

      console.log(`[MCP log_communication] personId=${person.id} | agent=${agent_type} | outcome=${outcome ?? '(none)'} | callId=${call_id ?? '(none)'}`);

      await _logAgentAction('log_communication', person.id, { agent_type, direction, outcome }, { comm_id: comm.id });
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, communication_id: comm.id, outcome_recorded: outcome ?? null }) }] };
    }
  );

  // ⭐ create_follow_up — used by Cold Calling, Warm Lead, Admission, Fee Recovery, Support
  server.tool(
    'create_follow_up',
    'Schedule a follow-up task or request a callback for a topic (e.g. to follow up later, callback tomorrow, or if demo scheduling details are not confirmed yet). Do NOT use this for booking a confirmed Demo Class or Visit date/time; use schedule_appointment for those.',
    {
      phone: z.string().describe('Phone number of the contact'),
      type: z.enum(['DEMO', 'DEMO_SCHEDULING', 'VISIT', 'ADMISSION', 'FEE', 'FEE_FOLLOW_UP', 'CALLBACK', 'REVIEW', 'GENERAL'])
             .default('CALLBACK')
             .describe('Type of follow-up. Use DEMO_SCHEDULING to schedule a reminder task to call them back and book a demo later, CALLBACK for general callbacks. Do NOT use this tool for confirmed Demo Class dates/times.'),
      due_at: z.string().describe('ISO 8601 datetime for when the follow-up is due, e.g. 2024-11-15T10:00:00Z'),
      notes: z.string().optional().describe('What to discuss or reason for follow-up'),
      agent_type: z.enum([
        'ENQUIRY', 'COLD_CALLING', 'WARM_LEAD', 'ADMISSION_CONVERSION',
        'REVIEW_REFERRAL', 'STUDENT_SUPPORT', 'FEE_ACCOUNTS',
        'STUDENT_ENGAGEMENT', 'FEE_RECOVERY', 'MANUAL',
      ]).optional(),
    },
    async ({ phone, type, due_at, notes, agent_type }) => {
      const normalized = await normalizePhone(phone);
      let person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
      if (!person) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Contact not found. Call lookup_contact first.' }) }] };
      }

      // Prevent duplicate follow-ups of same type within 24h
      const existing = await prisma.followUp.findFirst({
        where: {
          personId: person.id,
          type,
          status: 'PENDING',
          dueAt: { gte: new Date(Date.now() - 86400000) },
        },
      });
      if (existing) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: true, follow_up_id: existing.id, note: 'Follow-up already exists for today' }) }] };
      }

      const followUp = await prisma.followUp.create({
        data: {
          personId: person.id,
          type,
          dueAt: new Date(due_at),
          notes,
          agentType: agent_type,
        },
      });

      await _logAgentAction('create_follow_up', person.id, { type, due_at }, { follow_up_id: followUp.id });
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, follow_up_id: followUp.id }) }] };
    }
  );

  // ⭐ schedule_appointment — used by ALL agents (Cold Calling, Warm Lead, Admission)
  server.tool(
    'schedule_appointment',
    `Book a confirmed demo class or academy visit when the contact has agreed to a SPECIFIC date and time.

When to call this tool:
- Contact said "yes, tomorrow at 10am works" → call schedule_appointment
- Contact said "come visit us on Friday" → call schedule_appointment

When NOT to call this tool — use log_communication with outcome="interested" or "callback_required" instead:
- Contact said "I'm interested, call me later" → do NOT call schedule_appointment
- Contact asked to be called back to decide → do NOT call schedule_appointment
- No specific date/time was confirmed → do NOT call schedule_appointment

This tool moves the contact to DEMO_SCHEDULED or VISIT_SCHEDULED in the CRM and creates a reminder. Only call it when you have an actual confirmed datetime.`,
    {
      phone: z.string().describe('Phone number of the contact'),
      type: z.enum(['DEMO', 'VISIT']).describe('DEMO for a demo class, VISIT for an in-person academy visit'),
      scheduled_at: z.string().describe('Confirmed ISO 8601 datetime, e.g. 2026-06-09T10:00:00+05:30'),
      location: z.string().optional().describe('Physical address or meeting link'),
      notes: z.string().optional().describe('Any details the contact mentioned about the appointment'),
    },
    async ({ phone, type, scheduled_at, location, notes }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
      if (!person) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Contact not found' }) }] };
      }

      const apptDate = new Date(scheduled_at);
      const newStage = type === 'DEMO' ? 'DEMO_SCHEDULED' : 'VISIT_SCHEDULED';

      const [appt] = await Promise.all([
        prisma.appointment.create({
          data: { personId: person.id, type, scheduledAt: apptDate, location, notes },
        }),
        prisma.person.update({
          where: { id: person.id },
          data: { lifecycleStage: newStage },
        }),
        prisma.followUp.create({
          data: {
            personId: person.id,
            type,
            dueAt: new Date(apptDate.getTime() - 3600000),
            notes: `Reminder: ${type} scheduled at ${apptDate.toLocaleString()}`,
            agentType: 'WARM_LEAD',
          },
        }),
      ]);

      await _logAgentAction('schedule_appointment', person.id, { type, scheduled_at }, { appointment_id: appt.id });
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, appointment_id: appt.id, stage_updated: newStage }) }] };
    }
  );

  // ⭐ get_fee_status — used by Fee & Accounts + Fee Recovery agents
  server.tool(
    'get_fee_status',
    'Get the current fee status for a student including outstanding amount and next due date.',
    { phone: z.string().describe('Student or contact phone number from context (e.g. customer_phone or caller_number).') },
    async ({ phone }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({
        where: { phone: { contains: normalized } },
        include: {
          student: {
            include: {
              feePlan: { include: { payments: { orderBy: { paidAt: 'desc' }, take: 3 } } },
              batch: { include: { course: true } },
            },
          },
        },
      });

      if (!person || !person.student) {
        return { content: [{ type: 'text', text: JSON.stringify({ found: false, error: 'No active student record found' }) }] };
      }

      const fp = person.student.feePlan;
      const result = {
        found: true,
        name: person.name,
        course: person.student.batch?.course?.name,
        batch: person.student.batch?.name,
        fee_plan: fp ? {
          total_amount: fp.totalAmount,
          paid_amount: fp.paidAmount,
          outstanding: fp.outstandingAmount,
          next_due_date: fp.nextDueDate,
          recent_payments: fp.payments.map(p => ({ amount: p.amount, paid_at: p.paidAt, method: p.method })),
        } : null,
      };

      await _logAgentAction('get_fee_status', person.id, { phone }, { outstanding: fp?.outstandingAmount });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // ⭐ get_student_info — used by Student Support, Fee & Accounts, Fee Recovery agents
  server.tool(
    'get_student_info',
    'Get detailed information about a student including their batch, timetable, and attendance for support queries.',
    { phone: z.string().describe('Student or contact phone number from context (e.g. customer_phone or caller_number).') },
    async ({ phone }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({
        where: { phone: { contains: normalized } },
        include: {
          student: {
            include: {
              batch: { include: { course: true } },
              feePlan: true,
            },
          },
          supportTickets: { where: { status: 'OPEN' }, take: 3, orderBy: { createdAt: 'desc' } },
        },
      });

      if (!person) return { content: [{ type: 'text', text: JSON.stringify({ found: false, error: 'Contact not found' }) }] };
      if (!person.student) return { content: [{ type: 'text', text: JSON.stringify({ found: true, is_student: false, name: person.name, stage: person.lifecycleStage }) }] };

      const result = {
        found: true,
        is_student: true,
        name: person.name,
        phone: person.phone,
        email: person.email,
        student_id: person.student.id,
        roll_number: person.student.rollNumber,
        status: person.student.status,
        course: person.student.batch?.course?.name,
        batch: person.student.batch?.name,
        batch_timings: person.student.batch?.timings,
        faculty: person.student.batch?.facultyName,
        enrollment_date: person.student.enrollmentDate,
        outstanding_fee: person.student.feePlan?.outstandingAmount ?? 0,
        open_tickets: person.supportTickets.map(t => ({ id: t.id, type: t.type, status: t.status })),
      };

      await _logAgentAction('get_student_info', person.id, { phone }, { student_id: person.student.id });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );
}

// Internal helper — logs every MCP tool call for the agent activity timeline
async function _logAgentAction(toolUsed, personId, input, output) {
  try {
    await prisma.agentLog.create({
      data: {
        agentType: 'MANUAL',
        personId: personId || null,
        toolUsed,
        inputSummary: JSON.stringify(input).slice(0, 500),
        outputSummary: JSON.stringify(output).slice(0, 500),
        success: true,
      },
    });
  } catch { /* non-fatal */ }
}
