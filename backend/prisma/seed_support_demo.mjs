// Seeds a complete, testable Student-Support dataset:
//   • Rohit (9209568974) as a STUDENT in a batch
//   • a batch-wise weekly timetable (Vikram sir + other faculty)
//   • teacher availability for today (available / on-leave / partial)
//   • upcoming tests
//   • common FAQs
// Idempotent: re-running refreshes the same demo data without duplicating.
import prisma from '../src/lib/prisma.js';

const PHONE = '9209568974';
const TODAY = '2026-06-08'; // current project date
const norm = (p) => String(p).replace(/[\s\-().+]/g, '').replace(/^91/, '');

async function main() {
  // ── 1. Pick a batch (prefer IIT-JEE Batch A, else first active) ──────────────
  const batch =
    (await prisma.batch.findFirst({ where: { name: { contains: 'IIT-JEE', mode: 'insensitive' } } })) ||
    (await prisma.batch.findFirst({ where: { isActive: true } }));
  if (!batch) throw new Error('No batch exists — create a course/batch first.');
  console.log(`→ Using batch: ${batch.name} (${batch.id})`);

  // ── 2. Rohit → Student (reuse existing Person by phone, flip to STUDENT) ──────
  let person = await prisma.person.findFirst({ where: { phone: { contains: norm(PHONE).slice(-10) } } });
  if (!person) {
    person = await prisma.person.create({ data: { name: 'Rohit', phone: norm(PHONE), source: 'MANUAL', lifecycleStage: 'STUDENT' } });
    console.log('→ Created Person Rohit');
  } else {
    person = await prisma.person.update({ where: { id: person.id }, data: { name: 'Rohit', lifecycleStage: 'STUDENT' } });
    console.log('→ Reused existing Person, set name=Rohit, stage=STUDENT');
  }

  let student = await prisma.student.findUnique({ where: { personId: person.id } });
  if (!student) {
    student = await prisma.student.create({ data: { personId: person.id, batchId: batch.id, rollNumber: 'R-101', status: 'active' } });
    console.log('→ Created Student row (roll R-101)');
  } else {
    student = await prisma.student.update({ where: { id: student.id }, data: { batchId: batch.id, rollNumber: student.rollNumber || 'R-101', status: 'active' } });
    console.log('→ Updated Student row → this batch');
  }

  // ── 3. Timetable (batch-wise). Wipe this batch's entries, then reseed. ────────
  await prisma.timetableEntry.deleteMany({ where: { batchId: batch.id } });
  // dayOfWeek: 0=Sun … 6=Sat
  const timetable = [
    { dayOfWeek: 1, startTime: '07:00', endTime: '09:00', subject: 'Physics',   facultyName: 'Vikram', room: '101' },
    { dayOfWeek: 1, startTime: '17:00', endTime: '19:00', subject: 'Mathematics', facultyName: 'Sharma', room: '102' },
    { dayOfWeek: 2, startTime: '07:00', endTime: '09:00', subject: 'Chemistry',  facultyName: 'Verma',  room: '103' },
    { dayOfWeek: 2, startTime: '17:00', endTime: '19:00', subject: 'Physics',    facultyName: 'Vikram', room: '101' },
    { dayOfWeek: 3, startTime: '07:00', endTime: '09:00', subject: 'Mathematics', facultyName: 'Sharma', room: '102' },
    { dayOfWeek: 3, startTime: '17:00', endTime: '19:00', subject: 'Chemistry',  facultyName: 'Verma',  room: '103' },
    { dayOfWeek: 4, startTime: '07:00', endTime: '09:00', subject: 'Physics',    facultyName: 'Vikram', room: '101' },
    { dayOfWeek: 4, startTime: '17:00', endTime: '19:00', subject: 'Mathematics', facultyName: 'Sharma', room: '102' },
    { dayOfWeek: 5, startTime: '07:00', endTime: '09:00', subject: 'Chemistry',  facultyName: 'Verma',  room: '103' },
    { dayOfWeek: 5, startTime: '17:00', endTime: '19:00', subject: 'Physics',    facultyName: 'Vikram', room: '101' },
    { dayOfWeek: 6, startTime: '09:00', endTime: '11:00', subject: 'Doubt Session', facultyName: 'Vikram', room: '101' },
  ];
  await prisma.timetableEntry.createMany({ data: timetable.map(t => ({ batchId: batch.id, ...t })) });
  console.log(`→ Seeded ${timetable.length} timetable classes (Mon–Sat)`);

  // ── 4. Teacher availability for today ────────────────────────────────────────
  const faculties = [
    { facultyName: 'Vikram', status: 'AVAILABLE', note: 'In all day' },
    { facultyName: 'Sharma', status: 'ON_LEAVE',  note: 'Medical leave' },
    { facultyName: 'Verma',  status: 'PARTIAL',   note: 'Available after 2 PM' },
  ];
  for (const f of faculties) {
    await prisma.teacherAvailability.deleteMany({
      where: { facultyName: f.facultyName, date: { gte: new Date(TODAY + 'T00:00:00Z'), lte: new Date(TODAY + 'T23:59:59Z') } },
    });
    await prisma.teacherAvailability.create({ data: { facultyName: f.facultyName, date: new Date(TODAY + 'T00:00:00Z'), status: f.status, note: f.note } });
  }
  console.log('→ Seeded teacher availability: Vikram=AVAILABLE, Sharma=ON_LEAVE, Verma=PARTIAL');

  // ── 5. Upcoming tests for this batch ─────────────────────────────────────────
  await prisma.testSchedule.deleteMany({ where: { batchId: batch.id } });
  const tests = [
    { subject: 'Mathematics', testDate: '2026-06-15', syllabus: 'Calculus — limits, differentiation', maxMarks: 80 },
    { subject: 'Physics',     testDate: '2026-06-20', syllabus: 'Mechanics — kinematics, NLM',         maxMarks: 100 },
    { subject: 'Chemistry',   testDate: '2026-06-25', syllabus: 'Organic — GOC, hydrocarbons',         maxMarks: 50 },
  ];
  await prisma.testSchedule.createMany({ data: tests.map(t => ({ batchId: batch.id, subject: t.subject, testDate: new Date(t.testDate + 'T00:00:00Z'), syllabus: t.syllabus, maxMarks: t.maxMarks })) });
  console.log(`→ Seeded ${tests.length} upcoming tests`);

  // ── 6. FAQs (create only if not already present, by question) ────────────────
  const faqs = [
    { question: 'How do I apply for a scholarship?', answer: 'Submit the scholarship form at the front desk along with your last mark sheet. Results are announced within 7 working days.', category: 'Admissions' },
    { question: 'What are the fee payment methods?',  answer: 'We accept Cash, UPI, Bank Transfer, Card and Cheque at the front desk. You can pay in full or in installments.', category: 'Fees' },
    { question: 'What are the institute timings?',    answer: 'The institute is open Monday to Saturday, 7 AM to 8 PM. Sunday is a holiday except during exam weeks.', category: 'General' },
    { question: 'How do I get study material?',       answer: 'Printed modules are handed out batch-wise at the front desk. Digital PDFs are shared on the student WhatsApp group.', category: 'Study Material' },
    { question: 'Can I change my batch?',             answer: 'Yes, batch changes are allowed subject to seat availability. Raise a request at the front desk and the academic head will confirm within 2 days.', category: 'General' },
  ];
  let added = 0;
  for (const f of faqs) {
    const exists = await prisma.faq.findFirst({ where: { question: f.question } });
    if (!exists) { await prisma.faq.create({ data: f }); added++; }
  }
  console.log(`→ FAQs: ${added} added (${faqs.length - added} already present)`);

  // ── 7. Reconcile batch seat counters ─────────────────────────────────────────
  for (const b of await prisma.batch.findMany()) {
    const c = await prisma.student.count({ where: { batchId: b.id, status: 'active' } });
    if (b.currentSeats !== c) await prisma.batch.update({ where: { id: b.id }, data: { currentSeats: c } });
  }

  console.log('\n✅ Demo data ready.');
  console.log(`   Student: Rohit · ${PHONE} · roll R-101 · batch "${batch.name}"`);
  console.log('   Call from this number → role=STUDENT → Student Support flow.');
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error('SEED FAILED:', e); await prisma.$disconnect(); process.exit(1); });
