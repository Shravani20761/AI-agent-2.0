import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { normalizePhone } from './shared.js';

export function registerWarmLeadTools(server) {

  server.tool(
    'update_warm_lead',
    'Update the qualification notes and status of a warm lead after a conversation.',
    {
      phone: z.string(),
      demo_status: z.enum(['PENDING', 'SCHEDULED', 'ATTENDED', 'NO_SHOW']).optional(),
      visit_status: z.enum(['PENDING', 'SCHEDULED', 'ATTENDED', 'NO_SHOW']).optional(),
      qualification_score: z.number().min(1).max(10).optional(),
      notes: z.string().optional(),
    },
    async ({ phone, demo_status, visit_status, qualification_score, notes }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({
        where: { phone: { contains: normalized } },
        include: { warmLeads: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });
      if (!person?.warmLeads[0]) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'No warm lead found for this contact' }) }] };
      }

      const warmLead = await prisma.warmLead.update({
        where: { id: person.warmLeads[0].id },
        data: {
          ...(demo_status && { demoStatus: demo_status }),
          ...(visit_status && { visitStatus: visit_status }),
          ...(qualification_score && { qualificationScore: qualification_score }),
          ...(notes && { notes }),
        },
      });

      await prisma.agentLog.create({
        data: { agentType: 'WARM_LEAD', personId: person.id, toolUsed: 'update_warm_lead', inputSummary: JSON.stringify({ phone, demo_status, visit_status }), outputSummary: JSON.stringify({ warm_lead_id: warmLead.id }), success: true },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, warm_lead_id: warmLead.id }) }] };
    }
  );

  server.tool(
    'mark_appointment_outcome',
    'Mark a demo or visit as attended, cancelled, or no-show. Automatically advances the person lifecycle stage.',
    {
      phone: z.string(),
      appointment_type: z.enum(['DEMO', 'VISIT']),
      outcome: z.enum(['ATTENDED', 'CANCELLED', 'NO_SHOW']),
      notes: z.string().optional(),
    },
    async ({ phone, appointment_type, outcome, notes }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
      if (!person) return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Contact not found' }) }] };

      const appt = await prisma.appointment.findFirst({
        where: { personId: person.id, type: appointment_type, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
        orderBy: { scheduledAt: 'desc' },
      });

      const statusMap = { ATTENDED: 'ATTENDED', CANCELLED: 'CANCELLED', NO_SHOW: 'NO_SHOW' };
      const stageMap = {
        'DEMO_ATTENDED': 'DEMO_ATTENDED',
        'VISIT_COMPLETED': 'VISIT_COMPLETED',
      };
      const newStage = appointment_type === 'DEMO' && outcome === 'ATTENDED'
        ? 'DEMO_ATTENDED'
        : appointment_type === 'VISIT' && outcome === 'ATTENDED'
        ? 'VISIT_COMPLETED'
        : person.lifecycleStage;

      await Promise.all([
        appt && prisma.appointment.update({
          where: { id: appt.id },
          data: { status: statusMap[outcome], attended: outcome === 'ATTENDED', notes },
        }),
        prisma.person.update({ where: { id: person.id }, data: { lifecycleStage: newStage } }),
      ]);

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, stage_updated: newStage, appointment_id: appt?.id }) }] };
    }
  );
}
