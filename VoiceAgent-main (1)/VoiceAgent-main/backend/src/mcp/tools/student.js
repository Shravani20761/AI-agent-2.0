import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { normalizePhone } from './shared.js';

export function registerStudentTools(server) {

  server.tool(
    'log_support_ticket',
    'Create a support ticket when a student raises an issue or request during a call.',
    {
      phone: z.string(),
      type: z.enum(['TIMETABLE', 'BATCH_CHANGE', 'STUDY_MATERIAL', 'APP_ISSUE', 'ENGAGEMENT', 'GENERAL']),
      description: z.string().describe('What the student is requesting or reporting'),
    },
    async ({ phone, type, description }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
      if (!person) return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Student not found' }) }] };

      const ticket = await prisma.supportTicket.create({
        data: { personId: person.id, type, description, status: 'OPEN' },
      });

      await prisma.agentLog.create({
        data: { agentType: 'STUDENT_SUPPORT', personId: person.id, toolUsed: 'log_support_ticket', inputSummary: JSON.stringify({ type, description: description.slice(0, 100) }), outputSummary: JSON.stringify({ ticket_id: ticket.id }), success: true },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, ticket_id: ticket.id, type, status: 'OPEN' }) }] };
    }
  );
}
