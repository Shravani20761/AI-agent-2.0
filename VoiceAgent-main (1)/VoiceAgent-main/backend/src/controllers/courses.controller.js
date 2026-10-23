import prisma from '../lib/prisma.js';
import { ok } from '../lib/response.js';

export const list = async (_req, res) => {
  const courses = await prisma.course.findMany({ where: { isActive: true }, include: { batches: { where: { isActive: true } } } });
  ok(res, { courses });
};

export const getBatches = async (req, res) => {
  const where = req.query.courseId ? { courseId: req.query.courseId, isActive: true } : { isActive: true };
  const batches = await prisma.batch.findMany({ where, include: { course: { select: { name: true } } } });
  ok(res, { batches });
};
