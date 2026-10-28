import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

export const list = async (req, res) => {
  const { outstanding, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = outstanding === 'true' ? { outstandingAmount: { gt: 0 } } : {};
  const [plans, total] = await Promise.all([
    prisma.feePlan.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { nextDueDate: 'asc' },
      include: {
        student: {
          include: {
            person: { select: { id: true, name: true, phone: true } },
            batch: { include: { course: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.feePlan.count({ where }),
  ]);
  ok(res, { plans, total });
};

export const getByStudent = async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.studentId },
    include: {
      feePlan: { include: { payments: { orderBy: { paidAt: 'desc' } } } },
      person: { select: { name: true, phone: true } },
      batch: { include: { course: true } },
    },
  });
  if (!student) return err(res, 'Student not found', 404);
  ok(res, { student });
};

export const createFeePlan = async (req, res) => {
  const { studentId, totalAmount, installmentsCount, nextDueDate } = req.body;
  if (!studentId || !totalAmount) return err(res, 'studentId and totalAmount required');
  const plan = await prisma.feePlan.create({
    data: { studentId, totalAmount, installmentsCount: installmentsCount || 1, outstandingAmount: totalAmount, nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined },
  });
  ok(res, { plan }, 201);
};

export const recordPayment = async (req, res) => {
  const { feePlanId, amount, method, reference, notes } = req.body;
  if (!feePlanId || !amount) return err(res, 'feePlanId and amount required');

  const fp = await prisma.feePlan.findUnique({ where: { id: feePlanId } });
  if (!fp) return err(res, 'Fee plan not found', 404);

  const newPaid = fp.paidAmount + amount;
  const newOutstanding = Math.max(0, fp.outstandingAmount - amount);

  const [payment] = await prisma.$transaction([
    prisma.payment.create({ data: { feePlanId, amount, method: method || 'CASH', reference, notes, recordedBy: req.user.id } }),
    prisma.feePlan.update({ where: { id: feePlanId }, data: { paidAmount: newPaid, outstandingAmount: newOutstanding } }),
  ]);
  ok(res, { payment, new_outstanding: newOutstanding }, 201);
};

export const getStats = async (req, res) => {
  const [outstanding, collected] = await Promise.all([
    prisma.feePlan.aggregate({ _sum: { outstandingAmount: true }, _count: { _all: true }, where: { outstandingAmount: { gt: 0 } } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);
  ok(res, {
    outstanding_count: outstanding._count._all,
    outstanding_total: outstanding._sum.outstandingAmount ?? 0,
    total_collected: collected._sum.amount ?? 0,
  });
};
