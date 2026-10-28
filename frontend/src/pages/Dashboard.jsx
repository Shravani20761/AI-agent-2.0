import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard.api.js';

const fmt = (n) => (n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n ?? 0));
const fmtRupee = (n) => n >= 100000 ? '₹' + (n/100000).toFixed(1)+'L' : n >= 1000 ? '₹'+(n/1000).toFixed(1)+'k' : '₹'+(n??0);

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(d => setStats(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const m = stats?.marketing   || {};
  const o = stats?.operations  || {};
  const f = stats?.follow_ups  || {};
  const timeline = stats?.agent_timeline || [];

  const marketingKPIs = [
    { name: 'Cold Calls Today',  value: fmt(m.cold_calls_today),  change: null },
    { name: 'New Enquiries',     value: fmt(m.new_enquiries),      change: null },
    { name: 'Warm Leads',        value: fmt(m.warm_leads),         change: null, stable: true },
    { name: 'Demos Scheduled',   value: fmt(m.demos_scheduled),    change: null },
    { name: 'Visits Scheduled',  value: fmt(m.visits_scheduled),   change: null },
    { name: 'Admissions Done',   value: fmt(m.admissions_done),    verified: true, border: 'border-t-4 border-t-secondary' },
  ];

  const operationsKPIs = [
    { name: 'Active Students',       value: fmt(o.active_students),      icon: 'groups',          color: 'text-primary bg-primary-fixed' },
    { name: 'Open Support Requests', value: fmt(o.open_support_tickets), icon: 'live_help',       color: 'text-tertiary bg-tertiary-fixed border-l-4 border-l-tertiary' },
    { name: 'Fees Pending',          value: fmt(o.fees_pending_count),   icon: 'pending_actions', color: 'text-on-surface bg-surface-container-highest' },
    { name: 'Outstanding Amount',    value: fmtRupee(o.outstanding_amount), icon: 'payments',     color: 'text-error bg-error-container' },
  ];

  const agentTypeLabel = {
    ENQUIRY: 'Enquiry Agent', COLD_CALLING: 'Cold Calling Agent', WARM_LEAD: 'Warm Lead Agent',
    ADMISSION_CONVERSION: 'Admission Agent', STUDENT_SUPPORT: 'Support Agent',
    FEE_ACCOUNTS: 'Fee Agent', FEE_RECOVERY: 'Fee Recovery Agent',
    STUDENT_ENGAGEMENT: 'Engagement Agent', REVIEW_REFERRAL: 'Review Agent', MANUAL: 'Manual',
  };

  if (loading) {
    return (
      <div className="p-gutter flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin">progress_activity</span>
          <span className="text-body-lg">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Dashboard</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">Overview</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-surface mb-1">Performance Dashboard</h2>
          <p className="text-body-lg text-on-surface-variant">
            Live metrics across all AI Voice Agents and CRM modules.
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); dashboardApi.getStats().then(d => setStats(d)).finally(() => setLoading(false)); }}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-bold text-label-md bg-surface hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* Marketing Overview */}
      <section>
        <h3 className="font-headline-md text-headline-md mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">campaign</span>
          <span>Marketing Overview</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {marketingKPIs.map((kpi, idx) => (
            <div key={idx} className={`bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm hover:-translate-y-1 transition-transform ${kpi.border || ''}`}>
              <p className={`text-label-sm mb-2 ${kpi.verified ? 'text-secondary font-bold uppercase tracking-tighter' : 'text-on-surface-variant'}`}>
                {kpi.name}
              </p>
              <div className="flex items-end justify-between">
                <span className="font-display-lg text-display-lg">{kpi.value}</span>
                {kpi.verified && (
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Operations & Follow-Ups */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8">
          <h3 className="font-headline-md text-headline-md mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">analytics</span>
            <span>Operations Overview</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {operationsKPIs.map((kpi, idx) => (
              <div key={idx} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex items-center justify-between hover:bg-surface-container-low transition-colors shadow-sm">
                <div>
                  <p className={`text-label-sm uppercase mb-1 ${kpi.name.includes('Support') ? 'text-tertiary font-bold' : 'text-on-surface-variant'}`}>{kpi.name}</p>
                  <p className={`font-display-lg text-display-lg ${kpi.name.includes('Support') ? 'text-tertiary' : ''}`}>{kpi.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${kpi.color}`}>
                  <span className="material-symbols-outlined text-3xl">{kpi.icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Follow-Up Summary */}
        <div className="lg:col-span-4">
          <h3 className="font-headline-md text-headline-md mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">history</span>
            <span>Follow-Up Overview</span>
          </h3>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 h-[calc(100%-44px)] shadow-sm flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-error"></div>
                  <span className="font-label-md text-on-surface-variant">Due Today</span>
                </div>
                <span className="font-headline-lg text-error">{fmt(f.due_today)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-tertiary"></div>
                  <span className="font-label-md text-on-surface-variant">Overdue</span>
                </div>
                <span className="font-headline-lg text-tertiary">{fmt(f.overdue)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-secondary"></div>
                  <span className="font-label-md text-on-surface-variant">Completed Today</span>
                </div>
                <span className="font-headline-lg text-secondary">{fmt(f.completed_today)}</span>
              </div>
            </div>
            <button onClick={() => navigate('/admin/follow-ups')} className="w-full mt-6 py-3 border border-primary text-primary font-bold rounded-lg hover:bg-primary/5 transition-colors">
              Manage Queue
            </button>
          </div>
        </div>
      </div>

      {/* Agent Activity Timeline */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-surface-container-low/30 flex items-center justify-between border-b border-outline-variant">
          <h4 className="font-headline-md text-headline-md">Agent Activity Timeline</h4>
          <span className="text-label-sm text-outline">{timeline.length} recent actions</span>
        </div>
        <div className="p-6 relative">
          {timeline.length === 0 ? (
            <p className="text-on-surface-variant text-body-md text-center py-8">No agent activity yet. Agents will appear here once calls start.</p>
          ) : (
            <div className="absolute left-[31px] top-8 bottom-8 w-px bg-outline-variant" />
          )}
          <div className="space-y-5 relative">
            {timeline.map((log, idx) => (
              <div key={log.id || idx} className="flex items-start gap-4">
                <div className={`w-4 h-4 rounded-full ring-4 z-10 mt-1 ml-1 ${idx === 0 ? 'bg-secondary ring-secondary-container' : 'bg-primary ring-primary-fixed'}`} />
                <div>
                  <p className="font-label-md text-on-surface leading-tight">
                    <span className="font-bold">{agentTypeLabel[log.agent_type] || log.agent_type}</span>
                    {log.person_name && <span className="text-on-surface-variant font-normal"> — {log.person_name}</span>}
                    {' '}<span className="text-on-surface-variant font-normal">used <span className="font-mono text-xs bg-surface-container px-1 rounded">{log.tool}</span></span>
                  </p>
                  <p className="text-[10px] text-outline font-medium mt-0.5">
                    {new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
