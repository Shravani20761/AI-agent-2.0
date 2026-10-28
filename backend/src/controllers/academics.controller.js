import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

// ─── B.1 Timetable (batch-wise) ─────────────────────────────────────────────

export const listTimetable = async (req, res) => {
  const { batchId, includeInactive } = req.query;
  const where = {
    ...(batchId && { batchId }),
    ...(includeInactive === 'true' ? {} : { isActive: true }),
  };
  const entries = await prisma.timetableEntry.findMany({
    where,
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    include: { batch: { select: { name: true } } },
  });
  ok(res, { entries });
};

// Create or update a single timetable cell. Pass `id` to update.
export const upsertTimetableEntry = async (req, res) => {
  const { id, batchId, dayOfWeek, startTime, endTime, subject, facultyName, room, isActive } = req.body;
  if (id) {
    const entry = await prisma.timetableEntry.update({
      where: { id },
      data: {
        ...(batchId && { batchId }),
        ...(dayOfWeek !== undefined && { dayOfWeek: Number(dayOfWeek) }),
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(subject && { subject }),
        ...(facultyName !== undefined && { facultyName: facultyName || null }),
        ...(room !== undefined && { room: room || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return ok(res, { entry });
  }
  if (batchId == null || dayOfWeek == null || !startTime || !endTime || !subject) {
    return err(res, 'batchId, dayOfWeek, startTime, endTime, subject required');
  }
  const entry = await prisma.timetableEntry.create({
    data: {
      batchId,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      subject,
      facultyName: facultyName || null,
      room: room || null,
    },
  });
  ok(res, { entry }, 201);
};

export const deleteTimetableEntry = async (req, res) => {
  await prisma.timetableEntry.delete({ where: { id: req.params.id } });
  ok(res, { deleted: true });
};

// ─── B.2 Teacher availability ───────────────────────────────────────────────

export const listAvailability = async (req, res) => {
  const { facultyName, date, from, to } = req.query;
  const where = {
    ...(facultyName && { facultyName: { equals: facultyName, mode: 'insensitive' } }),
    ...(date && { date: dayRange(date) }),
    ...((from || to) && {
      date: {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to + 'T23:59:59.999Z') }),
      },
    }),
  };
  const records = await prisma.teacherAvailability.findMany({ where, orderBy: { date: 'desc' } });
  ok(res, { records });
};

// Set (upsert) availability for a faculty on a given date.
export const setAvailability = async (req, res) => {
  const { id, facultyName, date, status, note } = req.body;
  if (id) {
    const record = await prisma.teacherAvailability.update({
      where: { id },
      data: { ...(facultyName && { facultyName }), ...(date && { date: new Date(date) }), ...(status && { status }), ...(note !== undefined && { note: note || null }) },
    });
    return ok(res, { record });
  }
  if (!facultyName || !date) return err(res, 'facultyName and date required');
  const record = await prisma.teacherAvailability.create({
    data: { facultyName, date: new Date(date), status: status || 'AVAILABLE', note: note || null },
  });
  ok(res, { record }, 201);
};

export const deleteAvailability = async (req, res) => {
  await prisma.teacherAvailability.delete({ where: { id: req.params.id } });
  ok(res, { deleted: true });
};

// ─── B.3 Test schedule (batch-wise) ─────────────────────────────────────────

export const listTests = async (req, res) => {
  const { batchId, upcoming, includeInactive } = req.query;
  const where = {
    ...(batchId && { batchId }),
    ...(includeInactive === 'true' ? {} : { isActive: true }),
    ...(upcoming === 'true' && { testDate: { gte: new Date() } }),
  };
  const tests = await prisma.testSchedule.findMany({
    where,
    orderBy: { testDate: 'asc' },
    include: { batch: { select: { name: true } } },
  });
  ok(res, { tests });
};

export const createTest = async (req, res) => {
  const { batchId, subject, testDate, syllabus, maxMarks } = req.body;
  if (!batchId || !subject || !testDate) return err(res, 'batchId, subject, testDate required');
  const test = await prisma.testSchedule.create({
    data: { batchId, subject, testDate: new Date(testDate), syllabus: syllabus || null, maxMarks: maxMarks != null ? Number(maxMarks) : null },
  });
  ok(res, { test }, 201);
};

export const updateTest = async (req, res) => {
  const { subject, testDate, syllabus, maxMarks, isActive } = req.body;
  const test = await prisma.testSchedule.update({
    where: { id: req.params.id },
    data: {
      ...(subject && { subject }),
      ...(testDate && { testDate: new Date(testDate) }),
      ...(syllabus !== undefined && { syllabus: syllabus || null }),
      ...(maxMarks !== undefined && { maxMarks: maxMarks != null ? Number(maxMarks) : null }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  ok(res, { test });
};

export const deleteTest = async (req, res) => {
  await prisma.testSchedule.delete({ where: { id: req.params.id } });
  ok(res, { deleted: true });
};

// ─── B.4 FAQ ────────────────────────────────────────────────────────────────

export const listFaqs = async (req, res) => {
  const { category, search, includeInactive } = req.query;
  const where = {
    ...(category && { category }),
    ...(includeInactive === 'true' ? {} : { isActive: true }),
    ...(search && { OR: [{ question: { contains: search, mode: 'insensitive' } }, { answer: { contains: search, mode: 'insensitive' } }] }),
  };
  const faqs = await prisma.faq.findMany({ where, orderBy: { createdAt: 'desc' } });
  ok(res, { faqs });
};

export const createFaq = async (req, res) => {
  const { question, answer, category } = req.body;
  if (!question || !answer) return err(res, 'question and answer required');
  const faq = await prisma.faq.create({ data: { question, answer, category: category || null } });
  ok(res, { faq }, 201);
};

export const updateFaq = async (req, res) => {
  const { question, answer, category, isActive } = req.body;
  const faq = await prisma.faq.update({
    where: { id: req.params.id },
    data: {
      ...(question && { question }),
      ...(answer && { answer }),
      ...(category !== undefined && { category: category || null }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  ok(res, { faq });
};

export const deleteFaq = async (req, res) => {
  await prisma.faq.delete({ where: { id: req.params.id } });
  ok(res, { deleted: true });
};

// ─── helpers ────────────────────────────────────────────────────────────────

// Whole-day range [00:00, 24:00) for a "YYYY-MM-DD" date string.
function dayRange(dateStr) {
  const start = new Date(dateStr + 'T00:00:00.000Z');
  const end = new Date(dateStr + 'T23:59:59.999Z');
  return { gte: start, lte: end };
}
