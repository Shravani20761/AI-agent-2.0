import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';
import * as dograhService from '../services/dograhService.js';
import { startWorker, stopWorker, isRunning } from '../workers/dialerWorker.js';

const WORKFLOW_MAP = {
  COLD_CALLING:         { uuid: process.env.DOGRAH_WORKFLOW_COLD_CALLING_UUID,  id: parseInt(process.env.DOGRAH_WORKFLOW_COLD_CALLING_ID)  },
  HOT_LEAD:             { uuid: process.env.DOGRAH_WORKFLOW_HOT_LEAD_UUID,       id: parseInt(process.env.DOGRAH_WORKFLOW_HOT_LEAD_ID)       },
  ADMISSION_CONVERSION: { uuid: process.env.DOGRAH_WORKFLOW_ADMISSION_UUID,      id: parseInt(process.env.DOGRAH_WORKFLOW_ADMISSION_ID)      },
  FEE_RECOVERY:         { uuid: process.env.DOGRAH_WORKFLOW_FEE_RECOVERY_UUID,   id: parseInt(process.env.DOGRAH_WORKFLOW_FEE_RECOVERY_ID)   },
  STUDENT_ENGAGEMENT:   { uuid: process.env.DOGRAH_WORKFLOW_ENGAGEMENT_UUID,     id: parseInt(process.env.DOGRAH_WORKFLOW_ENGAGEMENT_ID)     },
  REVIEW_REFERRAL:      { uuid: process.env.DOGRAH_WORKFLOW_REVIEW_UUID,         id: parseInt(process.env.DOGRAH_WORKFLOW_REVIEW_ID)         },
};

// GET /api/dialer/status
export const getStatus = async (req, res) => {
  const active = await prisma.outboundCallQueue.findFirst({ where: { status: 'IN_PROGRESS' }, include: { person: { select: { name: true, phone: true } } } });
  const counts  = await prisma.outboundCallQueue.groupBy({ by: ['agentType', 'status'], _count: { _all: true } });

  const queuedByType = {};
  counts.filter(c => c.status === 'QUEUED').forEach(c => { queuedByType[c.agentType] = c._count._all; });

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const [doneToday, failedToday] = await Promise.all([
    prisma.outboundCallQueue.count({ where: { status: 'DONE', updatedAt: { gte: todayStart } } }),
    prisma.outboundCallQueue.count({ where: { status: 'FAILED', updatedAt: { gte: todayStart } } }),
  ]);

  ok(res, {
    workerRunning: isRunning(),
    currentCall: active ? { agentType: active.agentType, personName: active.person?.name || active.phone, phone: active.phone } : null,
    queuedByType,
    doneToday,
    failedToday,
  });
};

// POST /api/dialer/control
export const control = async (req, res) => {
  const { action } = req.body;
  if (!action) return err(res, 'action required');
  if (action === 'start' || action === 'resume') startWorker();
  else if (action === 'pause' || action === 'stop') stopWorker();
  else return err(res, 'action must be start|resume|pause|stop');
  ok(res, { workerRunning: isRunning() });
};

// POST /api/dialer/queue — add one or many jobs
export const addToQueue = async (req, res) => {
  const jobs = Array.isArray(req.body) ? req.body : [req.body];
  const created = await Promise.all(jobs.map(j => prisma.outboundCallQueue.create({ data: j })));
  if (!isRunning()) startWorker();
  ok(res, { queued: created.length }, 201);
};

// GET /api/dialer/queue
export const listQueue = async (req, res) => {
  const { agentType, status = 'QUEUED', limit = '50' } = req.query;
  const where = { status, ...(agentType && { agentType }) };
  const jobs = await prisma.outboundCallQueue.findMany({
    where, take: parseInt(limit), orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
    include: { person: { select: { name: true } } },
  });
  ok(res, { jobs });
};

// GET /api/dialer/workflows
export const listWorkflows = async (req, res) => {
  try {
    const workflows = await dograhService.listWorkflows();
    ok(res, { workflows });
  } catch (e) { err(res, e.message, 502); }
};

// POST /api/dialer/trigger/cold-call
export const triggerColdCall = async (req, res) => {
  const { personId, contacts, workflowUuid, workflowId } = req.body;
  const wf = workflowUuid ? { uuid: workflowUuid, id: parseInt(workflowId) } : WORKFLOW_MAP.COLD_CALLING;
  if (!wf.uuid) return err(res, 'DOGRAH_WORKFLOW_COLD_CALLING_UUID not configured');

  let jobs = [];

  if (personId) {
    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: { enquiries: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });
    if (!person) return err(res, 'Person not found', 404);

    jobs.push({
      agentType:      'COLD_CALLING',
      phone:          person.phone,
      personId:       person.id,
      workflowUuid:   wf.uuid,
      workflowId:     wf.id,
      campaign:       'Cold Call',
      priority:       4,
      scheduledAt:    new Date(),
      initialContext: {
        customer_name: person.name,
        customer_phone: person.phone,
        course_interested: person.enquiries[0]?.courseInterested || '',
        notes: person.notes || '',
        prior_contact: 'first_time'
      },
    });
  } else if (contacts && Array.isArray(contacts)) {
    for (const c of contacts) {
      let pid = c.personId || c.id;
      let phone = c.phone;
      let name = c.name || '';
      let courseInterested = c.courseHint || '';
      let notes = c.notes || '';

      if (pid) {
        const person = await prisma.person.findUnique({ where: { id: pid }, include: { enquiries: { orderBy: { createdAt: 'desc' }, take: 1 } } });
        if (person) {
          phone = person.phone;
          name = person.name;
          notes = person.notes || notes;
          courseInterested = person.enquiries[0]?.courseInterested || courseInterested;
        }
      }

      jobs.push({
        agentType:      'COLD_CALLING',
        phone,
        personId:       pid || null,
        workflowUuid:   wf.uuid,
        workflowId:     wf.id,
        campaign:       'Cold Call',
        priority:       4,
        scheduledAt:    new Date(),
        initialContext: {
          customer_name: name,
          customer_phone: phone,
          course_interested: courseInterested,
          notes: notes,
          prior_contact: 'first_time'
        },
      });
    }
  } else {
    return err(res, 'personId or contacts array required');
  }

  if (jobs.length === 0) return err(res, 'No valid jobs to queue');

  await prisma.outboundCallQueue.createMany({ data: jobs });
  if (!isRunning()) startWorker();
  ok(res, { queued: jobs.length }, 201);
};

// POST /api/dialer/trigger/hot-lead
export const triggerHotLead = async (req, res) => {
  const { followUpId, personId } = req.body;
  const wf = WORKFLOW_MAP.HOT_LEAD;
  if (!wf?.uuid) return err(res, 'DOGRAH_WORKFLOW_HOT_LEAD_UUID not configured');

  let pid = personId;
  let phone, name, courseInterested;
  if (followUpId) {
    const fu = await prisma.followUp.findUnique({ where: { id: followUpId }, include: { person: true } });
    if (!fu) return err(res, 'Follow-up not found', 404);
    pid = fu.personId; phone = fu.person.phone; name = fu.person.name;
  } else {
    const p = await prisma.person.findUnique({ where: { id: pid } });
    if (!p) return err(res, 'Person not found', 404);
    phone = p.phone; name = p.name;
  }

  const lead = await prisma.warmLead.findFirst({ where: { personId: pid } });
  const job = await prisma.outboundCallQueue.create({ data: {
    agentType: 'HOT_LEAD', phone, personId: pid, workflowUuid: wf.uuid, workflowId: wf.id, priority: 3, scheduledAt: new Date(),
    relatedId: followUpId || lead?.id, relatedType: followUpId ? 'FOLLOW_UP' : 'WARM_LEAD',
    initialContext: { customer_name: name, customer_phone: phone, course_interested: courseInterested || '', lifecycle_stage: 'HOT_LEAD', prior_contact: 'follow_up' },
  }});
  if (!isRunning()) startWorker();
  ok(res, { queued: 1, jobId: job.id }, 201);
};

// POST /api/dialer/trigger/admission
export const triggerAdmission = async (req, res) => {
  const { personId } = req.body;
  if (!personId) return err(res, 'personId required');
  const wf = WORKFLOW_MAP.ADMISSION_CONVERSION;
  if (!wf?.uuid) return err(res, 'DOGRAH_WORKFLOW_ADMISSION_UUID not configured');

  const person = await prisma.person.findUnique({ where: { id: personId } });
  if (!person) return err(res, 'Person not found', 404);

  const job = await prisma.outboundCallQueue.create({ data: {
    agentType: 'ADMISSION_CONVERSION', phone: person.phone, personId, workflowUuid: wf.uuid, workflowId: wf.id, priority: 1, scheduledAt: new Date(),
    initialContext: { customer_name: person.name, customer_phone: person.phone, lifecycle_stage: 'ADMISSION_PENDING', prior_contact: 'follow_up' },
  }});
  if (!isRunning()) startWorker();
  ok(res, { queued: 1, jobId: job.id }, 201);
};

// POST /api/dialer/trigger/fee-recovery
export const triggerFeeRecovery = async (req, res) => {
  const { studentId } = req.body;
  if (!studentId) return err(res, 'studentId required');
  const wf = WORKFLOW_MAP.FEE_RECOVERY;
  if (!wf?.uuid) return err(res, 'DOGRAH_WORKFLOW_FEE_RECOVERY_UUID not configured');

  const student = await prisma.student.findUnique({ where: { id: studentId }, include: { person: true, feePlan: true } });
  if (!student) return err(res, 'Student not found', 404);

  const job = await prisma.outboundCallQueue.create({ data: {
    agentType: 'FEE_RECOVERY', phone: student.person.phone, personId: student.personId, workflowUuid: wf.uuid, workflowId: wf.id, priority: 2, scheduledAt: new Date(),
    relatedId: studentId, relatedType: 'STUDENT',
    initialContext: { customer_name: student.person.name, customer_phone: student.person.phone, fee_outstanding: student.feePlan?.outstandingAmount || 0, next_due_date: student.feePlan?.nextDueDate?.toISOString() || '' },
  }});
  if (!isRunning()) startWorker();
  ok(res, { queued: 1, jobId: job.id }, 201);
};

// POST /api/dialer/trigger/engagement
export const triggerEngagement = async (req, res) => {
  const { studentIds } = req.body;
  if (!studentIds?.length) return err(res, 'studentIds array required');
  const wf = WORKFLOW_MAP.STUDENT_ENGAGEMENT;
  if (!wf?.uuid) return err(res, 'DOGRAH_WORKFLOW_ENGAGEMENT_UUID not configured');

  const students = await prisma.student.findMany({ where: { id: { in: studentIds } }, include: { person: true, batch: { include: { course: true } } } });
  const jobs = students.map(s => ({
    agentType: 'STUDENT_ENGAGEMENT', phone: s.person.phone, personId: s.personId, workflowUuid: wf.uuid, workflowId: wf.id, priority: 5, scheduledAt: new Date(),
    relatedId: s.id, relatedType: 'STUDENT',
    initialContext: { customer_name: s.person.name, customer_phone: s.person.phone, batch_name: s.batch?.name || '', faculty_name: s.batch?.facultyName || '' },
  }));
  await prisma.outboundCallQueue.createMany({ data: jobs });
  if (!isRunning()) startWorker();
  ok(res, { queued: jobs.length }, 201);
};

// POST /api/dialer/trigger/review
export const triggerReview = async (req, res) => {
  const { studentIds } = req.body;
  if (!studentIds?.length) return err(res, 'studentIds array required');
  const wf = WORKFLOW_MAP.REVIEW_REFERRAL;
  if (!wf?.uuid) return err(res, 'DOGRAH_WORKFLOW_REVIEW_UUID not configured');

  const students = await prisma.student.findMany({ where: { id: { in: studentIds } }, include: { person: true } });
  const jobs = students.map(s => ({
    agentType: 'REVIEW_REFERRAL', phone: s.person.phone, personId: s.personId, workflowUuid: wf.uuid, workflowId: wf.id, priority: 6, scheduledAt: new Date(),
    relatedId: s.id, relatedType: 'STUDENT',
    initialContext: { customer_name: s.person.name, customer_phone: s.person.phone, review_platforms: 'Google Maps and JustDial' },
  }));
  await prisma.outboundCallQueue.createMany({ data: jobs });
  if (!isRunning()) startWorker();
  ok(res, { queued: jobs.length }, 201);
};
