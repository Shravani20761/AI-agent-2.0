import prisma from '../lib/prisma.js';
import { ok } from '../lib/response.js';

export const getStats = async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    coldCallsToday,
    newEnquiries,
    warmLeadsCount,
    demosScheduled,
    visitsScheduled,
    admissionsDone,
    activeStudents,
    openSupportTickets,
    feeStats,
    followUpDueToday,
    followUpOverdue,
    followUpCompletedToday,
    recentAgentLogs,
  ] = await Promise.all([
    prisma.coldCall.count({ where: { calledAt: { gte: todayStart } } }),
    prisma.enquiry.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.warmLead.count({ where: { person: { lifecycleStage: { in: ['INTERESTED', 'DEMO_SCHEDULED', 'DEMO_ATTENDED', 'VISIT_SCHEDULED'] } } } }),
    prisma.appointment.count({ where: { type: 'DEMO', status: { in: ['SCHEDULED', 'CONFIRMED'] }, scheduledAt: { gte: todayStart } } }),
    prisma.appointment.count({ where: { type: 'VISIT', status: { in: ['SCHEDULED', 'CONFIRMED'] }, scheduledAt: { gte: todayStart } } }),
    prisma.admission.count({ where: { stage: 'ADMITTED', admittedAt: { gte: todayStart } } }),
    prisma.student.count({ where: { status: 'active' } }),
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    prisma.feePlan.aggregate({ _sum: { outstandingAmount: true }, _count: { _all: true }, where: { outstandingAmount: { gt: 0 } } }),
    prisma.followUp.count({ where: { status: 'PENDING', dueAt: { gte: todayStart, lt: new Date(todayStart.getTime() + 86400000) } } }),
    prisma.followUp.count({ where: { status: 'PENDING', dueAt: { lt: todayStart } } }),
    prisma.followUp.count({ where: { status: 'COMPLETED', completedAt: { gte: todayStart } } }),
    prisma.agentLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10, include: { person: { select: { name: true } } } }),
  ]);

  ok(res, {
    marketing: {
      cold_calls_today: coldCallsToday,
      new_enquiries: newEnquiries,
      warm_leads: warmLeadsCount,
      demos_scheduled: demosScheduled,
      visits_scheduled: visitsScheduled,
      admissions_done: admissionsDone,
    },
    operations: {
      active_students: activeStudents,
      open_support_tickets: openSupportTickets,
      fees_pending_count: feeStats._count._all,
      outstanding_amount: feeStats._sum.outstandingAmount ?? 0,
    },
    follow_ups: {
      due_today: followUpDueToday,
      overdue: followUpOverdue,
      completed_today: followUpCompletedToday,
    },
    agent_timeline: recentAgentLogs.map(l => ({
      id: l.id,
      agent_type: l.agentType,
      tool: l.toolUsed,
      person_name: l.person?.name,
      summary: l.outputSummary,
      created_at: l.createdAt,
    })),
  });
};
