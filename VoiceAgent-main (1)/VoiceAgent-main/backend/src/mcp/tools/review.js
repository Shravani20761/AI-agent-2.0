import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { normalizePhone } from './shared.js';

export function registerReviewTools(server) {

  server.tool(
    'request_review',
    'Log a review request made to a satisfied student or parent.',
    {
      phone: z.string(),
      platform: z.enum(['GOOGLE', 'FACEBOOK', 'JUSTDIAL', 'OTHER']).default('GOOGLE'),
      notes: z.string().optional(),
    },
    async ({ phone, platform, notes }) => {
      const normalized = await normalizePhone(phone);
      const person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
      if (!person) return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Contact not found' }) }] };

      const review = await prisma.reviewReferral.create({
        data: { personId: person.id, type: 'REVIEW', status: 'REQUESTED', platform, notes },
      });

      await prisma.agentLog.create({
        data: { agentType: 'REVIEW_REFERRAL', personId: person.id, toolUsed: 'request_review', inputSummary: JSON.stringify({ phone, platform }), outputSummary: JSON.stringify({ review_id: review.id }), success: true },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, review_id: review.id, platform }) }] };
    }
  );

  server.tool(
    'log_referral',
    'Record a referral from a satisfied student. Automatically creates an enquiry for the referred person.',
    {
      referrer_phone: z.string().describe('Phone of the student who is referring'),
      referred_name: z.string().describe('Name of the person being referred'),
      referred_phone: z.string().describe('Phone of the person being referred'),
      notes: z.string().optional(),
    },
    async ({ referrer_phone, referred_name, referred_phone, notes }) => {
      const normReferrer = await normalizePhone(referrer_phone);
      const normReferred = await normalizePhone(referred_phone);

      const referrer = await prisma.person.findFirst({ where: { phone: { contains: normReferrer } } });
      if (!referrer) return { content: [{ type: 'text', text: JSON.stringify({ success: false, error: 'Referrer not found' }) }] };

      let referred = await prisma.person.findFirst({ where: { phone: { contains: normReferred } } });
      if (!referred) {
        referred = await prisma.person.create({
          data: { name: referred_name, phone: normReferred, source: 'REFERRAL', lifecycleStage: 'LEAD' },
        });
        await prisma.enquiry.create({
          data: { personId: referred.id, source: 'REFERRAL', notes: `Referred by ${referrer.name} (${referrer.phone}). ${notes || ''}` },
        });
      }

      const referral = await prisma.reviewReferral.create({
        data: { personId: referrer.id, type: 'REFERRAL', status: 'RECEIVED', referredPersonId: referred.id, notes },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, referral_id: referral.id, referred_person_id: referred.id }) }] };
    }
  );
}
