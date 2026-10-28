import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { normalizePhone } from './shared.js';

export function registerColdCallingTools(server) {

  server.tool(
    'log_cold_call',
    'Log the result of a cold call attempt. Call after every call whether answered or not.',
    {
      phone: z.string().describe('Phone number that was called'),
      name: z.string().optional().describe('Name if they answered and introduced themselves'),
      campaign: z.string().optional().describe('Campaign name e.g. Q4-2024-Schools'),
      outcome: z.enum(['INTERESTED', 'NOT_INTERESTED', 'NO_ANSWER', 'CALLBACK', 'INVALID_NUMBER', 'DO_NOT_CALL'])
               .describe('Result of the call'),
      duration_secs: z.number().optional(),
      notes: z.string().optional().describe('Key points from the conversation'),
    },
    async ({ phone, name, campaign, outcome, duration_secs, notes }) => {
      const normalized = await normalizePhone(phone);

      let person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
      if (!person) {
        person = await prisma.person.create({
          data: {
            name: name || 'Unknown',
            phone: normalized,
            source: 'COLD_CALL',
            lifecycleStage: outcome === 'INTERESTED' ? 'INTERESTED' : 'LEAD',
          },
        });
      } else if (name && person.name === 'Unknown') {
        await prisma.person.update({ where: { id: person.id }, data: { name } });
      }

      const coldCall = await prisma.coldCall.create({
        data: { personId: person.id, campaign, outcome, durationSecs: duration_secs, notes, agentType: 'COLD_CALLING' },
      });

      if (outcome === 'INVALID_NUMBER' || outcome === 'DO_NOT_CALL') {
        await prisma.outboundCallQueue.updateMany({
          where: {
            OR: [
              { phone },
              { phone: { contains: normalized } }
            ],
            status: { in: ['QUEUED', 'IN_PROGRESS'] }
          },
          data: { status: 'DNC' }
        });
      }

      await prisma.agentLog.create({
        data: { agentType: 'COLD_CALLING', personId: person.id, toolUsed: 'log_cold_call', inputSummary: JSON.stringify({ phone, outcome, campaign }), outputSummary: JSON.stringify({ cold_call_id: coldCall.id }), success: true },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, person_id: person.id, cold_call_id: coldCall.id, person_is_new: !person }) }] };
    }
  );

  server.tool(
    'create_warm_lead',
    'Promote an interested cold call contact into the warm leads pipeline.',
    {
      phone: z.string().describe('Phone number of the interested contact'),
      qualification_score: z.number().min(1).max(10).optional().describe('Interest level 1-10'),
      notes: z.string().optional().describe('What they were interested in'),
    },
    async ({ phone, qualification_score, notes }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
      if (!person) {
        return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Contact not found. Call log_cold_call first.' }) }] };
      }

      const existingFollowUp = await prisma.followUp.findFirst({
        where: {
          personId: person.id,
          type: 'DEMO_SCHEDULING',
          status: 'PENDING',
          dueAt: { gte: new Date(Date.now() - 86400000) },
        },
      });

      const promises = [
        prisma.warmLead.create({
          data: { personId: person.id, qualificationScore: qualification_score, notes },
        }),
        prisma.person.update({
          where: { id: person.id },
          data: { lifecycleStage: 'INTERESTED' },
        }),
      ];

      if (!existingFollowUp) {
        promises.push(
          prisma.followUp.create({
            data: {
              personId: person.id,
              type: 'DEMO_SCHEDULING',
              dueAt: new Date(Date.now() + 86400000),
              notes: 'From cold call — interested',
              agentType: 'COLD_CALLING',
            },
          })
        );
      }

      const [warmLead] = await Promise.all(promises);

      await prisma.agentLog.create({
        data: { agentType: 'COLD_CALLING', personId: person.id, toolUsed: 'create_warm_lead', inputSummary: JSON.stringify({ phone, qualification_score }), outputSummary: JSON.stringify({ warm_lead_id: warmLead.id }), success: true },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, warm_lead_id: warmLead.id }) }] };
    }
  );
}
