import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

export const list = async (req, res) => {
  const { stage, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = stage ? { person: { lifecycleStage: stage } } : {};
  const [leads, total] = await Promise.all([
    prisma.warmLead.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        person: {
          select: {
            id: true, name: true, phone: true, email: true, lifecycleStage: true, source: true,
            enquiries: { orderBy: { createdAt: 'desc' }, take: 1, select: { courseInterested: true, source: true, notes: true } },
          },
        },
        assignedUser: { select: { name: true } },
      },
    }),
    prisma.warmLead.count({ where }),
  ]);
  ok(res, { leads, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

export const getById = async (req, res) => {
  const lead = await prisma.warmLead.findUnique({ where: { id: req.params.id }, include: { person: true } });
  if (!lead) return err(res, 'Not found', 404);
  ok(res, { lead });
};

export const create = async (req, res) => {
  const { personId, enquiryId, qualificationScore, notes } = req.body;
  if (!personId) return err(res, 'personId required');
  const lead = await prisma.warmLead.create({
    data: { personId, enquiryId, qualificationScore, notes },
    include: { person: true },
  });
  ok(res, { lead }, 201);
};

export const update = async (req, res) => {
  const lead = await prisma.warmLead.update({ where: { id: req.params.id }, data: req.body });
  ok(res, { lead });
};
