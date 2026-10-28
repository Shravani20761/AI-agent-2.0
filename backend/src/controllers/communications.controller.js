import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

export const list = async (req, res) => {
  const { personId, type, agentType, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {
    ...(personId && { personId }),
    ...(type && { type }),
    ...(agentType && { agentType }),
  };
  const [comms, total] = await Promise.all([
    prisma.communication.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { person: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.communication.count({ where }),
  ]);
  ok(res, { communications: comms, total });
};

export const addNote = async (req, res) => {
  const { personId, content, type = 'NOTE' } = req.body;
  if (!personId || !content) return err(res, 'personId and content required');
  const comm = await prisma.communication.create({
    data: { personId, type, direction: 'INBOUND', content, agentType: 'MANUAL' },
  });
  ok(res, { communication: comm }, 201);
};
