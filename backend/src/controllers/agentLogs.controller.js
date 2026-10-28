import prisma from '../lib/prisma.js';
import { ok } from '../lib/response.js';

export const list = async (req, res) => {
  const { agentType, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = agentType ? { agentType } : {};
  const [logs, total] = await Promise.all([
    prisma.agentLog.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { person: { select: { id: true, name: true } } },
    }),
    prisma.agentLog.count({ where }),
  ]);
  ok(res, { logs, total });
};
