import { llm } from '@livekit/agents';
import { z } from 'zod';

const backendUrl = () => (process.env.DEMO_BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');

export function parseMcpBody(text, contentType = '') {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (contentType.includes('application/json') || trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed);
  }
  const data = trimmed
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean);
  return data.length ? JSON.parse(data[data.length - 1]) : null;
}

export function mcpResultText(message) {
  const content = message?.result?.content;
  if (Array.isArray(content)) {
    const text = content.filter((part) => part?.type === 'text').map((part) => part.text).join('\n');
    if (text) return text;
  }
  if (message?.error) return JSON.stringify({ success: false, error: message.error.message || 'MCP error' });
  return JSON.stringify(message?.result || { success: false, error: 'Empty MCP response' });
}

async function callMcp(name, args) {
  const response = await fetch(`${backendUrl()}/mcp`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MCP ${name} failed (${response.status}): ${text.slice(0, 300)}`);
  }
  return mcpResultText(parseMcpBody(text, response.headers.get('content-type') || ''));
}

async function recordTool(demoCallId, toolName, args, result, durationMs, success) {
  if (!demoCallId) return;
  await fetch(`${backendUrl()}/api/demo/tool-call`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      demoCallId,
      toolName,
      arguments: args,
      result: safeJson(result),
      durationMs,
      success,
    }),
  }).catch((error) => {
    console.error(`[agent] Tool log failed for ${toolName}: ${error.message}`);
  });
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return { text: String(value).slice(0, 2000) };
  }
}

function crmTool(demoCallId, name, description, parameters) {
  return llm.tool({
    name,
    description,
    parameters,
    execute: async (args) => {
      const started = Date.now();
      try {
        const text = await callMcp(name, args);
        const parsed = safeJson(text);
        const success = !(parsed && typeof parsed === 'object' && parsed.success === false);
        await recordTool(demoCallId, name, args, text, Date.now() - started, success);
        return text;
      } catch (error) {
        const failure = JSON.stringify({ success: false, error: error.message });
        await recordTool(demoCallId, name, args, failure, Date.now() - started, false);
        return failure;
      }
    },
  });
}

const agentType = z.enum([
  'ENQUIRY', 'COLD_CALLING', 'WARM_LEAD', 'ADMISSION_CONVERSION',
  'REVIEW_REFERRAL', 'STUDENT_SUPPORT', 'FEE_ACCOUNTS',
  'STUDENT_ENGAGEMENT', 'FEE_RECOVERY', 'MANUAL',
]);

export function buildCrmTools(demoCallId) {
  return {
    lookup_contact: crmTool(
      demoCallId,
      'lookup_contact',
      'Look up an existing contact by phone number before treating them as a known student or parent.',
      z.object({ phone: z.string().describe('Phone number spoken by the caller') }),
    ),
    get_course_info: crmTool(
      demoCallId,
      'get_course_info',
      'Get fee, duration, and batch timings for one course. Required before stating any fee or timing.',
      z.object({
        course_slug: z.string().describe('iit-jee, neet-ug, mht-cet, 11-12-science, 9-10-foundation, 6-8-foundation, or nda'),
      }),
    ),
    get_fee_status: crmTool(
      demoCallId,
      'get_fee_status',
      'Get a student fee balance and next due date. Required before stating any outstanding amount.',
      z.object({ phone: z.string() }),
    ),
    get_student_info: crmTool(
      demoCallId,
      'get_student_info',
      'Get a student batch, timetable, and attendance. Required before describing a student record.',
      z.object({ phone: z.string() }),
    ),
    answer_faq: crmTool(
      demoCallId,
      'answer_faq',
      'Answer a general academy question from the FAQ knowledge base. Do not invent an answer if this finds nothing.',
      z.object({
        query: z.string(),
        category: z.string().optional(),
      }),
    ),
    create_enquiry: crmTool(
      demoCallId,
      'create_enquiry',
      'Create an admission enquiry after collecting name, phone, and course interest.',
      z.object({
        name: z.string(),
        phone: z.string(),
        email: z.string().optional(),
        course_interested: z.string().optional(),
        notes: z.string().optional(),
        source: z.enum(['WEBSITE', 'PHONE', 'WALKIN', 'WHATSAPP', 'VOICE_AGENT', 'META_ADS', 'GOOGLE_ADS', 'JUSTDIAL', 'MANUAL']).optional(),
      }),
    ),
    schedule_appointment: crmTool(
      demoCallId,
      'schedule_appointment',
      'Book a demo class or visit only after the caller confirms a specific date and time.',
      z.object({
        phone: z.string(),
        type: z.enum(['DEMO', 'VISIT']),
        scheduled_at: z.string().describe('ISO 8601 datetime'),
        location: z.string().optional(),
        notes: z.string().optional(),
      }),
    ),
    create_follow_up: crmTool(
      demoCallId,
      'create_follow_up',
      'Record a callback when a demo date is not confirmed yet.',
      z.object({
        phone: z.string(),
        type: z.enum(['DEMO', 'DEMO_SCHEDULING', 'VISIT', 'ADMISSION', 'FEE', 'FEE_FOLLOW_UP', 'CALLBACK', 'REVIEW', 'GENERAL']).optional(),
        due_at: z.string().describe('ISO 8601 datetime'),
        notes: z.string().optional(),
        agent_type: agentType.optional(),
      }),
    ),
    log_communication: crmTool(
      demoCallId,
      'log_communication',
      'Save a short call summary and outcome at the end of the conversation.',
      z.object({
        phone: z.string(),
        agent_type: agentType,
        content: z.string(),
        outcome: z.enum(['interested', 'not_interested', 'demo_scheduled', 'callback_required', 'do_not_call']).optional(),
        direction: z.enum(['INBOUND', 'OUTBOUND']).optional(),
        duration_secs: z.number().optional(),
      }),
    ),
  };
}
