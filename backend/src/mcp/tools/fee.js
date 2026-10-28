import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { normalizePhone } from './shared.js';

export function registerFeeTools(server) {

  server.tool(
    'record_payment_promise',
    'Record when a student promises to pay by a specific date. Creates a fee follow-up automatically.',
    {
      phone: z.string(),
      promise_date: z.string().describe('ISO 8601 date they promised to pay by'),
      amount: z.number().optional().describe('Amount they promised to pay'),
      notes: z.string().optional(),
    },
    async ({ phone, promise_date, amount, notes }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
      if (!person) return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Student not found' }) }] };

      const followUp = await prisma.followUp.create({
        data: {
          personId: person.id,
          type: 'FEE',
          dueAt: new Date(promise_date),
          notes: `Payment promise: ₹${amount ?? 'unspecified'}. ${notes || ''}`,
          agentType: 'FEE_RECOVERY',
        },
      });

      await prisma.agentLog.create({
        data: { agentType: 'FEE_RECOVERY', personId: person.id, toolUsed: 'record_payment_promise', inputSummary: JSON.stringify({ phone, promise_date, amount }), outputSummary: JSON.stringify({ follow_up_id: followUp.id }), success: true },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, follow_up_id: followUp.id, promise_date, amount }) }] };
    }
  );

  server.tool(
    'log_payment_received',
    'Record an actual payment received from a student.',
    {
      phone: z.string(),
      amount: z.number().describe('Amount paid in rupees'),
      method: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER']).default('CASH'),
      reference: z.string().optional().describe('UPI ref, cheque number, or transaction ID'),
    },
    async ({ phone, amount, method, reference }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({
        where: { phone: { contains: normalized } },
        include: { student: { include: { feePlan: true } } },
      });

      if (!person?.student?.feePlan) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'No active fee plan found for student' }) }] };
      }

      const fp = person.student.feePlan;
      const newPaid = fp.paidAmount + amount;
      const newOutstanding = Math.max(0, fp.outstandingAmount - amount);

      await prisma.$transaction([
        prisma.payment.create({
          data: { feePlanId: fp.id, amount, method, reference },
        }),
        prisma.feePlan.update({
          where: { id: fp.id },
          data: { paidAmount: newPaid, outstandingAmount: newOutstanding },
        }),
      ]);

      await prisma.agentLog.create({
        data: { agentType: 'FEE_ACCOUNTS', personId: person.id, toolUsed: 'log_payment_received', inputSummary: JSON.stringify({ phone, amount, method }), outputSummary: JSON.stringify({ new_outstanding: newOutstanding }), success: true },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, amount_paid: amount, new_outstanding: newOutstanding }) }] };
    }
  );
}
