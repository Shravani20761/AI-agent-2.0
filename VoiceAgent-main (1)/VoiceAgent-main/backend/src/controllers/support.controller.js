import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

export const list = async (req, res) => {
  const { status, type, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = { ...(status && { status }), ...(type && { type }) };
  const [tickets, total] = await Promise.all([
    prisma.supportTicket.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { person: { select: { id: true, name: true, phone: true } }, assignedUser: { select: { name: true } } },
    }),
    prisma.supportTicket.count({ where }),
  ]);
  ok(res, { tickets, total });
};

export const create = async (req, res) => {
  const { personId, type, description } = req.body;
  if (!personId) return err(res, 'personId required');
  const ticket = await prisma.supportTicket.create({ data: { personId, type: type || 'GENERAL', description } });
  ok(res, { ticket }, 201);
};

export const resolve = async (req, res) => {
  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: { status: 'RESOLVED', resolvedAt: new Date() },
  });
  ok(res, { ticket });
};

export const assign = async (req, res) => {
  const { userId } = req.body;
  const ticket = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: { assignedTo: userId, status: 'IN_PROGRESS' },
  });
  ok(res, { ticket });
};

// ─── E.1 Call Logs (what the Student Support agent actually handled) ──────────
export const listCallLogs = async (req, res) => {
  const { search, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    agentType: 'STUDENT_SUPPORT',
    ...(search && {
      person: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] },
    }),
  };

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

  const [logs, total, handledToday, escalatedToday, durationAgg] = await Promise.all([
    prisma.communication.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { person: { select: { id: true, name: true, phone: true, lifecycleStage: true } } },
    }),
    prisma.communication.count({ where }),
    prisma.communication.count({ where: { agentType: 'STUDENT_SUPPORT', createdAt: { gte: todayStart } } }),
    prisma.supportTicket.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.communication.aggregate({
      _avg: { durationSecs: true },
      where: { agentType: 'STUDENT_SUPPORT', durationSecs: { not: null } },
    }),
  ]);

  ok(res, {
    logs,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    stats: {
      handled_today: handledToday,
      escalated_today: escalatedToday,
      avg_duration_secs: Math.round(durationAgg._avg.durationSecs ?? 0),
    },
  });
};
