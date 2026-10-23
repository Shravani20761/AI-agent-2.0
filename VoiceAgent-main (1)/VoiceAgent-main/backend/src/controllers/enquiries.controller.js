import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

export const list = async (req, res) => {
  const { source, status, search, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    source: source ? source : 'VOICE_AGENT',
    ...(status && { status }),
    ...(search && {
      person: {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      },
    }),
  };

  const [enquiries, total] = await Promise.all([
    prisma.enquiry.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { person: { select: { id: true, name: true, phone: true, email: true, lifecycleStage: true } }, course: { select: { name: true } } },
    }),
    prisma.enquiry.count({ where }),
  ]);

  ok(res, { enquiries, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

export const getById = async (req, res) => {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: req.params.id },
    include: { person: true, course: true },
  });
  if (!enquiry) return err(res, 'Enquiry not found', 404);
  ok(res, { enquiry });
};

export const create = async (req, res) => {
  const { name, phone, email, courseInterested, courseId, notes, source = 'WEBSITE' } = req.body;
  if (!name || !phone) return err(res, 'name and phone are required');

  const normalized = phone.replace(/[\s\-().+]/g, '').replace(/^91/, '');
  let person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
  if (!person) {
    person = await prisma.person.create({ data: { name, phone: normalized, email, source } });
  }

  const enquiry = await prisma.enquiry.create({
    data: { personId: person.id, source, courseInterested, courseId, notes, status: 'New' },
    include: { person: true },
  });

  // Form / WhatsApp leads who approached with an interest land in the Warm Leads pipeline
  if (['WEBSITE', 'WHATSAPP'].includes(source)) {
    const existingWarm = await prisma.warmLead.findFirst({ where: { personId: person.id } });
    if (!existingWarm) {
      await prisma.warmLead.create({
        data: {
          personId: person.id,
          enquiryId: enquiry.id,
          notes: notes || `Interested in ${courseInterested || 'course'} (via ${source})`,
        },
      });
    }
    await prisma.person.update({ where: { id: person.id }, data: { lifecycleStage: 'INTERESTED' } });
  }

  ok(res, { enquiry }, 201);
};

export const update = async (req, res) => {
  const enquiry = await prisma.enquiry.update({
    where: { id: req.params.id },
    data: req.body,
    include: { person: true },
  });
  ok(res, { enquiry });
};

export const remove = async (req, res) => {
  await prisma.enquiry.delete({ where: { id: req.params.id } });
  ok(res, { message: 'Deleted' });
};

export const getStats = async (req, res) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const [total, newCount, contacted, demoScheduled, bySource] = await Promise.all([
    prisma.enquiry.count({ where: { source: 'VOICE_AGENT' } }),
    prisma.enquiry.count({ where: { source: 'VOICE_AGENT', status: 'New' } }),
    prisma.enquiry.count({ where: { source: 'VOICE_AGENT', status: 'Contacted' } }),
    prisma.enquiry.count({ where: { source: 'VOICE_AGENT', status: 'Demo Scheduled' } }),
    prisma.enquiry.groupBy({ by: ['source'], _count: { _all: true } }),
  ]);
  ok(res, { total, new: newCount, contacted, demo_scheduled: demoScheduled, by_source: bySource });
};
