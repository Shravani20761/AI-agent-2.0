import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

// Normalise an Indian phone to a bare 10-digit-ish string (drop +, spaces, 91 prefix).
const normPhone = (p) => String(p || '').replace(/[\s\-().+]/g, '').replace(/^91/, '');

export const list = async (req, res) => {
  const { status = 'active', batchId, search, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {
    status,
    ...(batchId && { batchId }),
    ...(search && { person: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }] } }),
  };
  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { enrollmentDate: 'desc' },
      include: {
        person: { select: { id: true, name: true, phone: true, email: true } },
        batch: { include: { course: { select: { name: true } } } },
        feePlan: { select: { outstandingAmount: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);
  ok(res, { students, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

export const getById = async (req, res) => {
  const student = await prisma.student.findUnique({
    where: { id: req.params.id },
    include: {
      person: { include: { communications: { orderBy: { createdAt: 'desc' }, take: 5 }, supportTickets: { where: { status: 'OPEN' } } } },
      batch: { include: { course: true } },
      feePlan: { include: { payments: { orderBy: { paidAt: 'desc' }, take: 10 } } },
      admission: { include: { course: true } },
    },
  });
  if (!student) return err(res, 'Student not found', 404);
  ok(res, { student });
};

export const update = async (req, res) => {
  const { batchId, status, notes } = req.body;
  const student = await prisma.student.update({
    where: { id: req.params.id },
    data: { ...(batchId && { batchId }), ...(status && { status }) },
  });
  if (notes) {
    await prisma.person.update({ where: { id: student.personId }, data: { notes } });
  }
  ok(res, { student });
};

// ─── Phase 0: unified student creation ──────────────────────────────────────

// Resolve a batch by id, or by (case-insensitive) name. Returns batch or null.
async function resolveBatch(batchRef) {
  if (!batchRef) return null;
  const byId = await prisma.batch.findUnique({ where: { id: batchRef } });
  if (byId) return byId;
  return prisma.batch.findFirst({ where: { name: { equals: batchRef, mode: 'insensitive' } } });
}

// Core upsert: reuse Person by phone (the unified contact), attach/refresh Student,
// flip lifecycleStage to STUDENT, keep Batch.currentSeats in sync, optional FeePlan.
// Returns { student, created, action } where action ∈ created|updated.
async function upsertStudent({ name, phone, email, batchId, rollNumber, totalFee, dueDate, installments }) {
  const normalized = normPhone(phone);
  if (!normalized) throw new Error('phone required');

  const batch = batchId ? await resolveBatch(batchId) : null;
  if (batchId && !batch) throw new Error(`batch not found: ${batchId}`);

  // 1) Person — reuse the unified row if this number already exists, else create.
  let person = await prisma.person.findFirst({ where: { phone: { contains: normalized.slice(-10) } } });
  if (!person) {
    person = await prisma.person.create({
      data: {
        name: name || 'Unknown',
        phone: normalized,
        email: email || null,
        source: 'MANUAL',
        lifecycleStage: 'STUDENT',
      },
    });
  } else {
    person = await prisma.person.update({
      where: { id: person.id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        lifecycleStage: 'STUDENT',
      },
    });
  }

  // 2) Student — 1:1 with Person. Create or move batch.
  const existing = await prisma.student.findUnique({ where: { personId: person.id } });
  let student, action;
  if (existing) {
    student = await prisma.student.update({
      where: { id: existing.id },
      data: {
        ...(batch && { batchId: batch.id }),
        ...(rollNumber && { rollNumber }),
        status: 'active',
      },
    });
    action = 'updated';
    // currentSeats sync on batch change
    if (batch && existing.batchId !== batch.id) {
      await prisma.batch.update({ where: { id: batch.id }, data: { currentSeats: { increment: 1 } } });
      if (existing.batchId) await prisma.batch.update({ where: { id: existing.batchId }, data: { currentSeats: { decrement: 1 } } }).catch(() => {});
    }
  } else {
    student = await prisma.student.create({
      data: {
        personId: person.id,
        ...(batch && { batchId: batch.id }),
        ...(rollNumber && { rollNumber }),
        status: 'active',
      },
    });
    action = 'created';
    if (batch) await prisma.batch.update({ where: { id: batch.id }, data: { currentSeats: { increment: 1 } } });
  }

  // 3) Optional FeePlan in the same shot (0.4)
  if (totalFee && Number(totalFee) > 0) {
    const amount = Math.round(Number(totalFee));
    const existingFee = await prisma.feePlan.findUnique({ where: { studentId: student.id } });
    if (!existingFee) {
      await prisma.feePlan.create({
        data: {
          studentId: student.id,
          totalAmount: amount,
          installmentsCount: installments ? Number(installments) : 1,
          outstandingAmount: amount,
          nextDueDate: dueDate ? new Date(dueDate) : undefined,
        },
      });
    }
  }

  return { student, person, action };
}

// 0.1 — create a single student (create-or-reuse Person + Student + batch + optional fee)
export const createStudent = async (req, res) => {
  const { name, phone, email, batchId, rollNumber, totalFee, dueDate, installments } = req.body;
  if (!phone) return err(res, 'phone required');
  try {
    const { student, person, action } = await upsertStudent({ name, phone, email, batchId, rollNumber, totalFee, dueDate, installments });
    const full = await prisma.student.findUnique({
      where: { id: student.id },
      include: { person: { select: { name: true, phone: true } }, batch: { include: { course: { select: { name: true } } } }, feePlan: true },
    });
    ok(res, { student: full, action }, action === 'created' ? 201 : 200);
  } catch (e) {
    err(res, e.message || 'Failed to create student', 400);
  }
};

// 0.2 — bulk import. Body: array of { name, phone, batch, rollNumber?, email?, totalFee?, dueDate? }
export const bulkImport = async (req, res) => {
  const rows = req.body;
  if (!Array.isArray(rows)) return err(res, 'Array of students required');

  let created = 0, updated = 0;
  const skipped = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    try {
      const { action } = await upsertStudent({
        name: r.name,
        phone: r.phone,
        email: r.email,
        batchId: r.batchId || r.batch,
        rollNumber: r.rollNumber,
        totalFee: r.totalFee ?? r.fee,
        dueDate: r.dueDate,
        installments: r.installments,
      });
      if (action === 'created') created++; else updated++;
    } catch (e) {
      skipped.push({ row: i + 1, phone: r.phone, reason: e.message });
    }
  }
  ok(res, { created, updated, skipped, total: rows.length }, 201);
};

// 0.3 — reassign a student to a different batch (keeps currentSeats in sync)
export const assignBatch = async (req, res) => {
  const { batchId } = req.body;
  if (!batchId) return err(res, 'batchId required');
  const student = await prisma.student.findUnique({ where: { id: req.params.id } });
  if (!student) return err(res, 'Student not found', 404);

  const batch = await resolveBatch(batchId);
  if (!batch) return err(res, 'Batch not found', 404);

  if (student.batchId === batch.id) return ok(res, { student, unchanged: true });

  const updated = await prisma.student.update({ where: { id: student.id }, data: { batchId: batch.id } });
  await prisma.batch.update({ where: { id: batch.id }, data: { currentSeats: { increment: 1 } } });
  if (student.batchId) await prisma.batch.update({ where: { id: student.batchId }, data: { currentSeats: { decrement: 1 } } }).catch(() => {});

  ok(res, { student: updated });
};
