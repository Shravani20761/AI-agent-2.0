import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

export const getPipeline = async (req, res) => {
  const [admissions, demoPeople] = await Promise.all([
    prisma.admission.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        person: { select: { id: true, name: true, phone: true, email: true } },
        course: { select: { name: true } },
      },
    }),
    prisma.person.findMany({
      where: { lifecycleStage: { in: ['DEMO_SCHEDULED', 'DEMO_ATTENDED'] } },
      include: {
        appointments: { where: { type: 'DEMO' }, orderBy: { scheduledAt: 'desc' }, take: 1 }
      }
    })
  ]);

  const pipeline = {
    DEMO_SCHEDULED: demoPeople.map(p => ({
      id: `demo-${p.id}`,
      person: { id: p.id, name: p.name, phone: p.phone, email: p.email },
      stage: 'DEMO_SCHEDULED',
      demoAttended: p.lifecycleStage === 'DEMO_ATTENDED',
      course: p.appointments[0] ? { name: p.appointments[0].notes || 'Demo Class' } : { name: 'Demo Class' },
      createdAt: p.createdAt,
    })),
    QUALIFIED: admissions.filter(a => a.stage === 'QUALIFIED'),
    VISIT_SCHEDULED: admissions.filter(a => a.stage === 'VISIT_SCHEDULED'),
    ADMISSION_PENDING: admissions.filter(a => a.stage === 'ADMISSION_PENDING'),
    ADMITTED: admissions.filter(a => a.stage === 'ADMITTED'),
  };
  ok(res, { pipeline });
};

export const getById = async (req, res) => {
  const admission = await prisma.admission.findUnique({
    where: { id: req.params.id },
    include: { person: true, course: true, student: true },
  });
  if (!admission) return err(res, 'Not found', 404);
  ok(res, { admission });
};

export const create = async (req, res) => {
  const { personId, courseId, notes } = req.body;
  if (!personId) return err(res, 'personId required');

  const [admission] = await Promise.all([
    prisma.admission.create({ data: { personId, courseId, stage: 'QUALIFIED', notes } }),
    prisma.person.update({ where: { id: personId }, data: { lifecycleStage: 'ADMISSION_PENDING' } }),
  ]);
  ok(res, { admission }, 201);
};

export const advanceStage = async (req, res) => {
  const { stage, notes, scholarshipAmount } = req.body;
  if (!stage) return err(res, 'stage required');

  let admission;
  const isDemoCard = req.params.id.startsWith('demo-');
  if (isDemoCard) {
    const personId = req.params.id.replace(/^demo-/, '');
    // Create new admission record directly in target stage
    admission = await prisma.admission.create({
      data: {
        personId,
        stage,
        notes: notes || 'Advanced from Demo Scheduled stage'
      }
    });
  } else {
    const data = { stage, ...(notes && { notes }), ...(scholarshipAmount && { scholarshipAmount }) };
    if (stage === 'ADMITTED') { data.admittedAt = new Date(); data.seatConfirmed = true; }
    admission = await prisma.admission.update({ where: { id: req.params.id }, data });
  }

  const stageToLifecycle = {
    VISIT_SCHEDULED: 'VISIT_SCHEDULED',
    VISIT_COMPLETED: 'VISIT_COMPLETED',
    ADMISSION_PENDING: 'ADMISSION_PENDING',
    ADMITTED: 'STUDENT',
  };
  if (stageToLifecycle[stage]) {
    await prisma.person.update({ where: { id: admission.personId }, data: { lifecycleStage: stageToLifecycle[stage] } });
  }
  ok(res, { admission });
};

// Manually record the outcome of a scheduled demo (CRM, no voice agent).
// outcome: 'ATTENDED' → person moves to DEMO_ATTENDED (ready to schedule a visit);
//          'NO_SHOW'  → demo appointment flagged, person stays put.
export const recordDemoOutcome = async (req, res) => {
  const { personId, outcome, notes } = req.body;
  if (!personId) return err(res, 'personId required');
  if (!['ATTENDED', 'NO_SHOW'].includes(outcome)) return err(res, 'outcome must be ATTENDED or NO_SHOW');

  const appt = await prisma.appointment.findFirst({
    where: { personId, type: 'DEMO', status: { in: ['SCHEDULED', 'CONFIRMED'] } },
    orderBy: { scheduledAt: 'desc' },
  });

  await Promise.all([
    appt && prisma.appointment.update({
      where: { id: appt.id },
      data: { status: outcome, attended: outcome === 'ATTENDED', ...(notes && { notes }) },
    }),
    prisma.person.update({
      where: { id: personId },
      data: { lifecycleStage: outcome === 'ATTENDED' ? 'DEMO_ATTENDED' : 'DEMO_SCHEDULED' },
    }),
  ]);

  ok(res, { personId, outcome, appointmentId: appt?.id ?? null });
};

export const getStats = async (req, res) => {
  const [qualified, pending, admitted, revenue] = await Promise.all([
    prisma.admission.count({ where: { stage: 'QUALIFIED' } }),
    prisma.admission.count({ where: { stage: 'ADMISSION_PENDING' } }),
    prisma.admission.count({ where: { stage: 'ADMITTED' } }),
    prisma.feePlan.aggregate({ _sum: { paidAmount: true } }),
  ]);
  ok(res, { qualified, pending, admitted, revenue: revenue._sum.paidAmount ?? 0 });
};
