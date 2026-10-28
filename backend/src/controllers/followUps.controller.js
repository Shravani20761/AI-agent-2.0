import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

export const list = async (req, res) => {
  const { filter, type, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const now = new Date();
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const statusFilter = {
    due_today: { status: 'PENDING', dueAt: { gte: todayStart, lt: todayEnd } },
    overdue:   { status: 'PENDING', dueAt: { lt: todayStart } },
    completed: { status: 'COMPLETED', completedAt: { gte: todayStart } },
  }[filter] || {};

  const where = { ...statusFilter, ...(type && { type }) };

  const [followUps, total] = await Promise.all([
    prisma.followUp.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { dueAt: 'asc' },
      include: { person: { select: { id: true, name: true, phone: true } }, createdByUser: { select: { name: true } } },
    }),
    prisma.followUp.count({ where }),
  ]);
  ok(res, { followUps, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

export const create = async (req, res) => {
  const { personId, type, dueAt, notes, agentType } = req.body;
  if (!personId || !dueAt) return err(res, 'personId and dueAt required');
  const followUp = await prisma.followUp.create({
    data: { personId, type: type || 'GENERAL', dueAt: new Date(dueAt), notes, createdBy: req.user.id, agentType },
  });
  ok(res, { followUp }, 201);
};

export const complete = async (req, res) => {
  const followUp = await prisma.followUp.update({
    where: { id: req.params.id },
    data: { status: 'COMPLETED', completedAt: new Date(), ...(req.body.notes && { notes: req.body.notes }) },
  });
  ok(res, { followUp });
};

export const reschedule = async (req, res) => {
  const { dueAt, notes } = req.body;
  if (!dueAt) return err(res, 'dueAt required');
  const followUp = await prisma.followUp.update({
    where: { id: req.params.id },
    data: { dueAt: new Date(dueAt), ...(notes && { notes }) },
  });
  ok(res, { followUp });
};
