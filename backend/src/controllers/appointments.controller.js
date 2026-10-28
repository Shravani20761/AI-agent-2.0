import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

export const list = async (req, res) => {
  const { type, status, from, to, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {
    ...(type && { type }),
    ...(status && { status }),
    ...(from || to) && { scheduledAt: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } },
  };
  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { scheduledAt: 'asc' },
      include: { person: { select: { id: true, name: true, phone: true, email: true } } },
    }),
    prisma.appointment.count({ where }),
  ]);
  ok(res, { appointments, total });
};

export const create = async (req, res) => {
  const { personId, type, scheduledAt, location, notes } = req.body;
  if (!personId || !type || !scheduledAt) return err(res, 'personId, type, scheduledAt required');

  const [appt] = await Promise.all([
    prisma.appointment.create({
      data: { personId, type, scheduledAt: new Date(scheduledAt), location, notes, createdBy: req.user.id },
    }),
    prisma.person.update({
      where: { id: personId },
      data: { lifecycleStage: type === 'DEMO' ? 'DEMO_SCHEDULED' : 'VISIT_SCHEDULED' },
    }),
  ]);
  ok(res, { appointment: appt }, 201);
};

export const update = async (req, res) => {
  const { status, attended, scheduledAt, notes } = req.body;
  const appt = await prisma.appointment.update({
    where: { id: req.params.id },
    data: {
      ...(status && { status }),
      ...(attended !== undefined && { attended }),
      ...(scheduledAt && { scheduledAt: new Date(scheduledAt) }),
      ...(notes && { notes }),
    },
  });

  if (attended) {
    const stage = appt.type === 'DEMO' ? 'DEMO_ATTENDED' : 'VISIT_COMPLETED';
    await prisma.person.update({ where: { id: appt.personId }, data: { lifecycleStage: stage } });
  }
  ok(res, { appointment: appt });
};
