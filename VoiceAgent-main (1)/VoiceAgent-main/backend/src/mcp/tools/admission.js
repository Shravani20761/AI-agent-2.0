import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { normalizePhone } from './shared.js';

export function registerAdmissionTools(server) {

  server.tool(
    'confirm_admission',
    'Mark a lead as admitted. Creates a student record and a fee plan skeleton. Call this when the person confirms enrollment.',
    {
      phone: z.string(),
      course_slug: z.string().optional().describe('Course slug they are enrolling in'),
      scholarship_amount: z.number().optional().describe('Scholarship/discount in rupees if any'),
      notes: z.string().optional(),
    },
    async ({ phone, course_slug, scholarship_amount, notes }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({
        where: { phone: { contains: normalized } },
        include: { admissions: { take: 1, orderBy: { createdAt: 'desc' } } },
      });
      if (!person) return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Contact not found' }) }] };

      const course = course_slug
        ? await prisma.course.findFirst({ where: { OR: [{ slug: course_slug }, { name: { contains: course_slug, mode: 'insensitive' } }] } })
        : null;

      const existingAdmission = person.admissions[0];

      const admission = existingAdmission
        ? await prisma.admission.update({ where: { id: existingAdmission.id }, data: { stage: 'ADMITTED', admittedAt: new Date(), scholarshipAmount: scholarship_amount, seatConfirmed: true, notes } })
        : await prisma.admission.create({ data: { personId: person.id, courseId: course?.id, stage: 'ADMITTED', admittedAt: new Date(), scholarshipAmount: scholarship_amount, seatConfirmed: true, notes } });

      // Create student record if not exists
      let student = await prisma.student.findUnique({ where: { personId: person.id } });
      if (!student) {
        student = await prisma.student.create({
          data: { personId: person.id, admissionId: admission.id, status: 'active' },
        });

        const feeAmount = (course?.feeMonthly ?? 0) - (scholarship_amount ?? 0);
        if (feeAmount > 0) {
          await prisma.feePlan.create({
            data: {
              studentId: student.id,
              totalAmount: feeAmount,
              outstandingAmount: feeAmount,
              nextDueDate: new Date(Date.now() + 30 * 86400000),
            },
          });
        }
      }

      await prisma.person.update({ where: { id: person.id }, data: { lifecycleStage: 'STUDENT' } });

      await prisma.agentLog.create({
        data: { agentType: 'ADMISSION_CONVERSION', personId: person.id, toolUsed: 'confirm_admission', inputSummary: JSON.stringify({ phone, course_slug, scholarship_amount }), outputSummary: JSON.stringify({ admission_id: admission.id, student_id: student.id }), success: true },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, admission_id: admission.id, student_id: student.id }) }] };
    }
  );

  server.tool(
    'offer_scholarship',
    'Apply a scholarship or discount offer to an admission in progress.',
    {
      phone: z.string(),
      scholarship_amount: z.number().describe('Discount amount in rupees'),
      reason: z.string().optional().describe('Reason for scholarship e.g. sibling discount, merit scholarship'),
    },
    async ({ phone, scholarship_amount, reason }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({
        where: { phone: { contains: normalized } },
        include: { admissions: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (!person?.admissions[0]) return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'No admission record found' }) }] };

      const admission = await prisma.admission.update({
        where: { id: person.admissions[0].id },
        data: { scholarshipAmount: scholarship_amount, notes: reason },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, admission_id: admission.id, scholarship_applied: scholarship_amount }) }] };
    }
  );
}
