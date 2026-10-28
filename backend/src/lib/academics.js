import prisma from './prisma.js';

const normPhone = (p) => String(p || '').replace(/[\s\-().+]/g, '').replace(/^91/, '');

/**
 * Resolve a caller's batch from their phone via Person → Student → Batch.
 * Shared by the academic MCP tools (Phase C) so they all resolve identically.
 *
 * @param {string} phone
 * @returns {Promise<{person, student, batch}|null>} null if no student found
 */
export async function getBatchByPhone(phone) {
  const normalized = normPhone(phone);
  if (!normalized) return null;

  const person = await prisma.person.findFirst({
    where: { phone: { contains: normalized.slice(-10) } },
    include: { student: { include: { batch: { include: { course: { select: { name: true } } } } } } },
  });

  if (!person || !person.student) return null;
  return { person, student: person.student, batch: person.student.batch || null };
}
