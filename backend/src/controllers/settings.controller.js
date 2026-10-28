import prisma from '../lib/prisma.js';
import { ok, err } from '../lib/response.js';

const defaults = {
  institute_name: 'Seagull Science Academy',
  address: '',
  phone: '',
  email: '',
  logo_url: '',
  primary_color: '#6750A4',
  timezone: 'Asia/Kolkata',
};

let settings = { ...defaults };

export const getSettings = (_req, res) => ok(res, { settings });

export const updateSettings = (req, res) => {
  settings = { ...settings, ...req.body };
  ok(res, { settings });
};

// Wipe all operational data (leads, contacts, calls, admissions, fees…).
// Preserves users (so you can still log in) and the course/batch catalog.
// Requires body { confirm: 'CLEAR' } to guard against accidents.
export const clearDatabase = async (req, res) => {
  if (req.body?.confirm !== 'CLEAR') {
    return err(res, "Confirmation required: send { confirm: 'CLEAR' }");
  }

  // Delete children before parents to respect foreign keys.
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.feePlan.deleteMany(),
    prisma.student.deleteMany(),
    prisma.admission.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.warmLead.deleteMany(),
    prisma.coldCall.deleteMany(),
    prisma.enquiry.deleteMany(),
    prisma.communication.deleteMany(),
    prisma.agentLog.deleteMany(),
    prisma.reviewReferral.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.outboundCallQueue.deleteMany(),
    prisma.followUp.deleteMany(),
    prisma.person.deleteMany(),
  ]);

  ok(res, { message: 'Database cleared. Users and courses were preserved.' });
};
