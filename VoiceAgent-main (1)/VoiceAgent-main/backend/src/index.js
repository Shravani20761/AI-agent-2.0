import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import cors from 'cors';

import { errorHandler } from './middleware/errorHandler.js';
import { mcpHandler } from './mcp/server.js';
import { startWorker } from './workers/dialerWorker.js';
import prisma from './lib/prisma.js';
import { computeRole, routeForRole } from './lib/role.js';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import enquiriesRoutes from './routes/enquiries.routes.js';
import coldCallingRoutes from './routes/coldCalling.routes.js';
import warmLeadsRoutes from './routes/warmLeads.routes.js';
import followUpsRoutes from './routes/followUps.routes.js';
import appointmentsRoutes from './routes/appointments.routes.js';
import admissionsRoutes from './routes/admissions.routes.js';
import feesRoutes from './routes/fees.routes.js';
import studentsRoutes from './routes/students.routes.js';
import coursesRoutes from './routes/courses.routes.js';
import communicationsRoutes from './routes/communications.routes.js';
import supportRoutes from './routes/support.routes.js';
import reviewsRoutes from './routes/reviews.routes.js';
import agentLogsRoutes from './routes/agentLogs.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import dialerRoutes from './routes/dialer.routes.js';
import webhooksRoutes from './routes/webhooks.routes.js';
import academicsRoutes from './routes/academics.routes.js';
import voicekitRoutes from './routes/voicekit.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// ─── Pre-call fetch (public — Dograh calls this before every inbound call) ───
app.post('/api/calls/pre-fetch', async (req, res) => {
  try {
    console.log('[pre-fetch] Received payload:', JSON.stringify(req.body, null, 2));
    const fromNumber = req.body?.call_inbound?.from_number || 
                       req.body?.from_number || 
                       req.body?.phone_number || 
                       req.body?.caller_phone_number || 
                       req.body?.phone ||
                       req.body?.customer_phone;

    if (!fromNumber) {
      console.log('[pre-fetch] No phone number detected in payload.');
      return res.json({ call_inbound: { dynamic_variables: { is_known_contact: false, customer_name: 'there', role: 'UNKNOWN', route: routeForRole('UNKNOWN') } } });
    }

    const normalised = fromNumber.toString().replace(/[\s\-().+]/g, '').replace(/^91/, '');
    const person = await prisma.person.findFirst({
      where: { phone: { contains: normalised.slice(-10) } },
      include: {
        enquiries:    { orderBy: { createdAt: 'desc' }, take: 1 },
        followUps:    { where: { status: 'PENDING' }, take: 1 },
        student:      { include: { batch: { include: { course: true } }, feePlan: true } },
      },
    });

    if (!person) {
      // 0.5.4 — unknown number → new-enquiry capture sub-flow
      console.log('[pre-fetch] Unknown number', fromNumber, '→ role=UNKNOWN');
      return res.json({
        call_inbound: {
          dynamic_variables: {
            is_known_contact: false,
            role: 'UNKNOWN',
            route: routeForRole('UNKNOWN'),
            customer_name: 'there',
            customer_phone: fromNumber,
            phone: fromNumber,
            caller_number: fromNumber,
            lifecycle_stage: '',
            course_interested: ''
          }
        }
      });
    }

    const student    = person.student;
    const latestEnq  = person.enquiries?.[0];
    const feePlan    = student?.feePlan;
    const openFU     = person.followUps?.length || 0;

    // 0.5.2/0.5.3 — derive role and the Dograh sub-flow to branch into
    const role  = computeRole(person);
    const route = routeForRole(role);
    console.log('[pre-fetch] Known contact', person.phone, '→ role=' + role, 'route=' + route);

    return res.json({
      call_inbound: {
        dynamic_variables: {
          is_known_contact:    true,
          role,
          route,
          customer_name:       person.name,
          customer_phone:      person.phone,
          phone:               person.phone,
          caller_number:       person.phone,
          lifecycle_stage:     person.lifecycleStage,
          course_interested:   latestEnq?.courseInterested || '',
          is_student:          !!student,
          is_active_student:   student?.status === 'active',
          // student-context (populated only when role=STUDENT)
          batch_name:          student?.batch?.name || '',
          batch_timings:       student?.batch?.timings || '',
          batch_id:            student?.batchId || '',
          roll_number:         student?.rollNumber || '',
          faculty_name:        student?.batch?.facultyName || '',
          course_name:         student?.batch?.course?.name || '',
          fee_outstanding:     feePlan?.outstandingAmount || 0,
          next_fee_due:        feePlan?.nextDueDate?.toISOString()?.split('T')[0] || '',
          // lead-context (populated for HOT_LEAD / LEAD)
          open_follow_ups:     openFU,
          last_contact_date:   person.updatedAt?.toISOString()?.split('T')[0] || '',
          last_enquiry_notes:  latestEnq?.notes || '',
        },
      },
    });
  } catch (e) {
    console.error('[pre-fetch] error:', e.message);
    return res.json({ call_inbound: { dynamic_variables: { is_known_contact: false, customer_name: 'there' } } });
  }
});

// ─── Auth (public) ────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Dograh webhooks (public — no JWT) ───────────────────────────────────────
app.use('/api/webhooks', webhooksRoutes);

// ─── Protected CRM routes ────────────────────────────────────────────────────
app.use('/api/dashboard',       dashboardRoutes);
app.use('/api/enquiries',       enquiriesRoutes);
app.use('/api/cold-calls',      coldCallingRoutes);
app.use('/api/warm-leads',      warmLeadsRoutes);
app.use('/api/follow-ups',      followUpsRoutes);
app.use('/api/appointments',    appointmentsRoutes);
app.use('/api/admissions',      admissionsRoutes);
app.use('/api/fees',            feesRoutes);
app.use('/api/students',        studentsRoutes);
app.use('/api/academics',       academicsRoutes);
app.use('/api/courses',         coursesRoutes);
app.use('/api/communications',  communicationsRoutes);
app.use('/api/support',         supportRoutes);
app.use('/api/reviews',         reviewsRoutes);
app.use('/api/agent-logs',      agentLogsRoutes);
app.use('/api/settings',        settingsRoutes);
app.use('/api/dialer',          dialerRoutes);
app.use('/api/voicekit',        voicekitRoutes);

// ─── Dograh MCP endpoint ─────────────────────────────────────────────────────
app.all('/mcp', mcpHandler);

app.use(errorHandler);

app.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
  console.log(`Pre-call fetch: http://localhost:${PORT}/api/calls/pre-fetch`);

  // Resume dialer if there were queued jobs from before restart.
  // Wrapped so a transient DB timeout (e.g. Neon SocketTimeout) doesn't crash boot.
  try {
    const pending = await prisma.outboundCallQueue.count({ where: { status: { in: ['QUEUED', 'IN_PROGRESS'] } } });
    if (pending > 0) {
      console.log(`[dialer] Resuming — ${pending} job(s) in queue`);
      // Reset any stuck IN_PROGRESS to QUEUED
      await prisma.outboundCallQueue.updateMany({ where: { status: 'IN_PROGRESS' }, data: { status: 'QUEUED', dograhRunId: null } });
      startWorker();
    }
  } catch (e) {
    console.error('[dialer] Could not check queue on startup (continuing anyway):', e.message);
  }
});
