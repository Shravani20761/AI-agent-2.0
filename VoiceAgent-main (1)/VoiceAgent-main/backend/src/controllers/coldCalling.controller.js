import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

export const list = async (req, res) => {
  const { campaign, outcome, page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const where = {
    ...(campaign && { campaign }),
    ...(outcome && { outcome }),
  };
  const [calls, total] = await Promise.all([
    prisma.coldCall.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { calledAt: 'desc' },
      include: { person: { select: { id: true, name: true, phone: true, lifecycleStage: true } } },
    }),
    prisma.coldCall.count({ where }),
  ]);
  ok(res, { calls, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

export const getStats = async (req, res) => {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const [total, answered, interested, callbacks, campaigns] = await Promise.all([
    prisma.coldCall.count({ where: { calledAt: { gte: todayStart } } }),
    prisma.coldCall.count({ where: { calledAt: { gte: todayStart }, outcome: { not: 'NO_ANSWER' } } }),
    prisma.coldCall.count({ where: { calledAt: { gte: todayStart }, outcome: 'INTERESTED' } }),
    prisma.coldCall.count({ where: { calledAt: { gte: todayStart }, outcome: 'CALLBACK' } }),
    prisma.coldCall.groupBy({ by: ['campaign'], _count: { _all: true }, where: { campaign: { not: null } } }),
  ]);
  ok(res, { today: { total, answered, interested, callbacks }, campaigns });
};

export const logCall = async (req, res) => {
  const { personId, campaign, outcome, durationSecs, notes } = req.body;
  if (!personId) return err(res, 'personId required');
  const call = await prisma.coldCall.create({
    data: { personId, campaign: campaign || 'Cold Call', outcome, durationSecs, notes, agentType: 'MANUAL' },
  });
  ok(res, { call }, 201);
};

export const listContacts = async (req, res) => {
  const { page = '1', limit = '20', search = '', outcome = '', dateFrom = '', dateTo = '', uncalled = '' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    source: 'COLD_CALL',
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ],
    }),
    ...(dateFrom || dateTo ? {
      createdAt: {
        ...(dateFrom && { gte: new Date(dateFrom) }),
        ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
      },
    } : {}),
    // uncalled=true → contacts with no cold call records at all
    ...(uncalled === 'true'
      ? { coldCalls: { none: {} } }
      : outcome
        ? { coldCalls: { some: { outcome } } }
        : {}),
  };

  const [contacts, total] = await Promise.all([
    prisma.person.findMany({
      where, skip, take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: { coldCalls: { orderBy: { calledAt: 'desc' }, take: 1 } },
    }),
    prisma.person.count({ where }),
  ]);

  ok(res, { contacts, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
};

export const importContacts = async (req, res) => {
  const contacts = req.body;
  if (!Array.isArray(contacts)) return err(res, 'Array of contacts required');

  const results = [];
  for (const c of contacts) {
    const normalized = c.phone.replace(/[\s\-().+]/g, '').replace(/^91/, '');
    
    let person = await prisma.person.findFirst({ where: { phone: { contains: normalized } } });
    if (!person) {
      person = await prisma.person.create({
        data: {
          name: c.name || 'Unknown',
          phone: normalized,
          source: 'COLD_CALL',
          lifecycleStage: 'LEAD',
          notes: c.notes || null,
        }
      });
    } else {
      person = await prisma.person.update({
        where: { id: person.id },
        data: {
          name: c.name || person.name,
          source: 'COLD_CALL',
          ...(c.notes && { notes: c.notes }),
        }
      });
    }

    if (c.courseHint) {
      await prisma.enquiry.create({
        data: {
          personId: person.id,
          source: 'COLD_CALL',
          courseInterested: c.courseHint,
          notes: c.notes || 'Imported course interest',
        }
      });
    }
    results.push(person);
  }

  ok(res, { imported: results.length }, 201);
};

