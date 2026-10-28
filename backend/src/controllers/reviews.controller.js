import prisma from '../lib/prisma.js';
import { ok } from '../lib/response.js';

export const list = async (req, res) => {
  const { type, status, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = { ...(type && { type }), ...(status && { status }) };
  const [items, total] = await Promise.all([
    prisma.reviewReferral.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { person: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.reviewReferral.count({ where }),
  ]);
  ok(res, { reviews: items, total });
};

export const create = async (req, res) => {
  const { personId, type, platform, notes } = req.body;
  const item = await prisma.reviewReferral.create({
    data: { personId, type: type || 'REVIEW', platform, notes, status: 'REQUESTED' },
  });
  ok(res, { review: item }, 201);
};

export const markReceived = async (req, res) => {
  const item = await prisma.reviewReferral.update({
    where: { id: req.params.id },
    data: { status: 'RECEIVED' },
  });
  ok(res, { review: item });
};
