import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { normalizePhone } from './shared.js';
import { getBatchByPhone } from '../../lib/academics.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_LOOKUP = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5, sat: 6, saturday: 6,
};

// Parse a loose "day" arg (number 0–6, weekday name, "today", "tomorrow") → 0–6 or null.
function parseDay(day) {
  if (day == null || day === '') return null;
  const s = String(day).trim().toLowerCase();
  if (/^[0-6]$/.test(s)) return Number(s);
  if (s === 'today') return new Date().getDay();
  if (s === 'tomorrow') return (new Date().getDay() + 1) % 7;
  return DAY_LOOKUP[s] ?? null;
}

async function logAcademic(toolUsed, personId, input, output) {
  try {
    await prisma.agentLog.create({
      data: {
        agentType: 'STUDENT_SUPPORT', personId: personId || null, toolUsed,
        inputSummary: JSON.stringify(input).slice(0, 300),
        outputSummary: JSON.stringify(output).slice(0, 300),
        success: true,
      },
    });
  } catch { /* logging must never break a tool call */ }
}

export function registerAcademicTools(server) {

  // C.1 — get_timetable
  server.tool(
    'get_timetable',
    "Get the class timetable for the caller's batch. Use when a student/parent asks about class timings or what subjects are scheduled. Resolves the batch automatically from the caller's phone. Optionally pass `day` (e.g. \"tomorrow\", \"Monday\", or 0–6) to get just that day.",
    {
      phone: z.string().describe('Caller phone from context (e.g. customer_phone or caller_number).'),
      day: z.string().optional().describe('Optional: "today", "tomorrow", a weekday name, or 0–6 (0=Sunday). Omit for the full week.'),
    },
    async ({ phone, day }) => {
      const ctx = await getBatchByPhone(phone);
      if (!ctx) return { content: [{ type: 'text', text: JSON.stringify({ found: false, error: 'No student record found for this number' }) }] };
      if (!ctx.batch) return { content: [{ type: 'text', text: JSON.stringify({ found: true, has_batch: false, name: ctx.person.name, message: 'Student is not assigned to a batch yet' }) }] };

      const dayFilter = parseDay(day);
      const entries = await prisma.timetableEntry.findMany({
        where: { batchId: ctx.batch.id, isActive: true, ...(dayFilter != null && { dayOfWeek: dayFilter }) },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      const result = {
        found: true,
        has_batch: true,
        name: ctx.person.name,
        batch: ctx.batch.name,
        course: ctx.batch.course?.name || null,
        ...(dayFilter != null && { day: DAY_NAMES[dayFilter] }),
        classes: entries.map(e => ({
          day: DAY_NAMES[e.dayOfWeek],
          start: e.startTime,
          end: e.endTime,
          subject: e.subject,
          faculty: e.facultyName || null,
          room: e.room || null,
        })),
        class_count: entries.length,
      };
      await logAcademic('get_timetable', ctx.person.id, { phone, day }, { count: entries.length });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // C.2 — get_test_schedule
  server.tool(
    'get_test_schedule',
    "Get upcoming tests/exams for the caller's batch. Use when a student/parent asks whether a test is scheduled, when the next test is, or what the syllabus is. Resolves the batch automatically from the caller's phone.",
    {
      phone: z.string().describe('Caller phone from context (e.g. customer_phone or caller_number).'),
      include_past: z.boolean().optional().describe('Set true to also include tests whose date has already passed. Default false (upcoming only).'),
    },
    async ({ phone, include_past }) => {
      const ctx = await getBatchByPhone(phone);
      if (!ctx) return { content: [{ type: 'text', text: JSON.stringify({ found: false, error: 'No student record found for this number' }) }] };
      if (!ctx.batch) return { content: [{ type: 'text', text: JSON.stringify({ found: true, has_batch: false, name: ctx.person.name, message: 'Student is not assigned to a batch yet' }) }] };

      const tests = await prisma.testSchedule.findMany({
        where: { batchId: ctx.batch.id, isActive: true, ...(include_past ? {} : { testDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }) },
        orderBy: { testDate: 'asc' },
      });

      const result = {
        found: true,
        has_batch: true,
        name: ctx.person.name,
        batch: ctx.batch.name,
        tests: tests.map(t => ({
          subject: t.subject,
          date: t.testDate.toISOString().split('T')[0],
          syllabus: t.syllabus || null,
          max_marks: t.maxMarks ?? null,
        })),
        test_count: tests.length,
      };
      await logAcademic('get_test_schedule', ctx.person.id, { phone }, { count: tests.length });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // C.3 — get_teacher_status
  server.tool(
    'get_teacher_status',
    'Check whether a teacher/faculty is available or on leave on a given date. Use when a caller asks "Is Sharma sir in today?". If no leave is recorded for that date, the teacher is assumed available.',
    {
      faculty_name: z.string().describe('Teacher/faculty name as the caller said it (matched case-insensitively).'),
      date: z.string().optional().describe('Date to check as YYYY-MM-DD. Defaults to today.'),
    },
    async ({ faculty_name, date }) => {
      const dateStr = date || new Date().toISOString().split('T')[0];
      const start = new Date(dateStr + 'T00:00:00.000Z');
      const end = new Date(dateStr + 'T23:59:59.999Z');

      const record = await prisma.teacherAvailability.findFirst({
        where: { facultyName: { contains: faculty_name, mode: 'insensitive' }, date: { gte: start, lte: end } },
        orderBy: { createdAt: 'desc' },
      });

      const status = record?.status || 'AVAILABLE';
      const result = {
        faculty_name: record?.facultyName || faculty_name,
        date: dateStr,
        status,
        is_available: status === 'AVAILABLE',
        on_leave: status === 'ON_LEAVE',
        note: record?.note || null,
        has_record: !!record, // false = no leave marked, assumed available
      };
      await logAcademic('get_teacher_status', null, { faculty_name, date: dateStr }, { status });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );

  // C.4 — answer_faq
  server.tool(
    'answer_faq',
    'Answer a common/general academy question (fees policy, scholarships, admissions process, holidays, facilities, etc.) by matching it against the academy FAQ knowledge base. Use for routine questions not tied to a specific student. Returns the best-matching answer(s).',
    {
      query: z.string().describe("The caller's question in their own words."),
      category: z.string().optional().describe('Optional category hint to narrow the search.'),
    },
    async ({ query, category }) => {
      const faqs = await prisma.faq.findMany({ where: { isActive: true, ...(category && { category }) } });

      // Lightweight keyword scoring: overlap of query tokens with question (weighted) + answer.
      const stop = new Set(['the', 'a', 'an', 'is', 'are', 'do', 'i', 'how', 'what', 'when', 'where', 'can', 'to', 'for', 'of', 'my', 'me', 'you', 'your', 'in', 'on', 'and', 'it']);
      const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 2 && !stop.has(t));

      const scored = faqs.map(f => {
        const q = f.question.toLowerCase();
        const a = f.answer.toLowerCase();
        let score = 0;
        for (const t of tokens) {
          if (q.includes(t)) score += 2;
          else if (a.includes(t)) score += 1;
        }
        return { f, score };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

      if (scored.length === 0) {
        await logAcademic('answer_faq', null, { query, category }, { matched: 0 });
        return { content: [{ type: 'text', text: JSON.stringify({ matched: false, message: 'No FAQ matched. Escalate via log_support_ticket if the caller still needs an answer.' }) }] };
      }

      const result = {
        matched: true,
        best_answer: scored[0].f.answer,
        results: scored.map(x => ({ question: x.f.question, answer: x.f.answer, category: x.f.category || null })),
      };
      await logAcademic('answer_faq', null, { query, category }, { matched: scored.length });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
  );
}
