import { z } from 'zod';
import prisma from '../../lib/prisma.js';
import { normalizePhone } from './shared.js';

export function registerEnquiryTools(server) {

  server.tool(
    'create_enquiry',
    'COMPULSORY: Create a new lead enquiry for every single inbound call. You MUST gather all details (such as parent/student name, phone number, email, course of interest, and detailed notes) and invoke this tool before the call ends. Call after lookup_contact.',
    {
      name: z.string().describe('Full name of the student or parent'),
      phone: z.string().describe('Phone number of the contact. Use the phone number from context (e.g. customer_phone or caller_number).'),
      email: z.string().optional(),
      course_interested: z.string().optional().describe('Course slug or name they asked about'),
      notes: z.string().optional().describe('Summary of what they asked or are interested in'),
      source: z.enum(['WEBSITE', 'PHONE', 'WALKIN', 'WHATSAPP', 'VOICE_AGENT', 'META_ADS', 'GOOGLE_ADS', 'JUSTDIAL', 'MANUAL'])
               .default('VOICE_AGENT'),
    },
    async ({ name, phone, email, course_interested, notes, source }) => {
      const normalized = await normalizePhone(phone);

      // Upsert person
      let person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
      if (!person) {
        person = await prisma.person.create({
          data: { name, phone: normalized, email, source, lifecycleStage: 'INTERESTED' },
        });
      } else {
        await prisma.person.update({
          where: { id: person.id },
          data: { lifecycleStage: 'INTERESTED', ...(email && { email }) },
        });
      }

      const enquiry = await prisma.enquiry.create({
        data: {
          personId: person.id,
          source,
          courseInterested: course_interested,
          notes,
          status: 'New',
        },
      });

      await prisma.agentLog.create({
        data: { agentType: 'ENQUIRY', personId: person.id, toolUsed: 'create_enquiry', inputSummary: JSON.stringify({ name, phone, course_interested }), outputSummary: JSON.stringify({ enquiry_id: enquiry.id }), success: true },
      });

      return { content: [{ type: 'text', text: JSON.stringify({ success: true, person_id: person.id, enquiry_id: enquiry.id }) }] };
    }
  );

  server.tool(
    'update_enquiry_stage',
    'Update the status of an existing enquiry after the conversation progresses.',
    {
      enquiry_id: z.string().describe('Enquiry UUID from create_enquiry or lookup_contact'),
      status: z.enum(['New', 'Contacted', 'Interested', 'Not Interested', 'Converted', 'Lost']).optional(),
      notes: z.string().optional().describe('Updated notes or outcome from the call'),
    },
    async ({ enquiry_id, status, notes }) => {
      const enquiry = await prisma.enquiry.update({
        where: { id: enquiry_id },
        data: { ...(status && { status }), ...(notes && { notes }) },
      });
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, enquiry_id: enquiry.id, status: enquiry.status }) }] };
    }
  );

  server.tool(
    'get_course_info',
    'Get details about a specific course including fees, duration, and batch timings. You MUST call this tool whenever the caller asks about course fees, batch timings, class details, or specific courses (JEE, NEET, Board, Foundation) to provide accurate information.',
    {
      course_slug: z.string().describe('Course slug or name e.g. iit-jee, neet-ug, mht-cet, 11-12-science, 9-10-foundation, 6-8-foundation, nda'),
    },
    async ({ course_slug }) => {
      const course = await prisma.course.findFirst({
        where: { OR: [{ slug: course_slug }, { slug: { contains: course_slug } }, { name: { contains: course_slug, mode: 'insensitive' } }] },
        include: { batches: { where: { isActive: true } } },
      });
      if (!course) {
        return { content: [{ type: 'text', text: JSON.stringify({ found: false, error: 'Course not found. Available: iit-jee, neet-ug, mht-cet, 11-12-science, 9-10-foundation, 6-8-foundation, nda' }) }] };
      }
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            found: true,
            name: course.name,
            duration: course.duration,
            fee: `₹${course.feeMonthly}/month`,
            batches: course.batches.map(b => b.name + ' — ' + b.timings),
            description: course.description,
          }),
        }],
      };
    }
  );
}
