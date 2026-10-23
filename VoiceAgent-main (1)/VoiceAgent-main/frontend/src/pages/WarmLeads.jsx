import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { hotLeadsApi } from '../api/hotLeads.api.js';
import { dialerApi } from '../api/dialer.api.js';

const STAGE_LABELS = { LEAD: 'New', INTERESTED: 'Interested', DEMO_SCHEDULED: 'Demo Scheduled', DEMO_ATTENDED: 'Demo Attended', VISIT_SCHEDULED: 'Visit Scheduled', ADMISSION_PENDING: 'Admission Pending' };
const STAGE_COLOR  = { LEAD: 'bg-surface-container text-on-surface-variant', INTERESTED: 'bg-primary/10 text-primary border-primary/20', DEMO_SCHEDULED: 'bg-tertiary/10 text-tertiary border-tertiary/20', DEMO_ATTENDED: 'bg-secondary/10 text-secondary border-secondary/20', VISIT_SCHEDULED: 'bg-tertiary/10 text-tertiary border-tertiary/20', ADMISSION_PENDING: 'bg-error/10 text-error border-error/20' };

const HotLeads = () => {
  const { showSuccess, showError } = useToast();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stageFilter, setStageFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (stageFilter) params.stage = stageFilter;
      const data = await hotLeadsApi.list(params);
      setLeads(data.leads);
      setTotal(data.total);
      setPages(data.pages);
    } catch { showError('Failed to load hot leads'); }
    finally { setLoading(false); }
  }, [page, stageFilter]);

  useEffect(() => { load(); }, [load]);

  const handleDial = async (lead) => {
    try {
      await dialerApi.triggerFollowUp({ personId: lead.person?.id });
      showSuccess(`Queued call to ${lead.person?.name}`);
    } catch { showError('Failed to queue call'); }
  };

  const handleStageUpdate = async (id, stage) => {
    try {
      await hotLeadsApi.update(id, { person: { update: { lifecycleStage: stage } } });
      showSuccess('Stage updated');
      load();
    } catch { showError('Failed to update stage'); }
  };

  const followUpCount = leads.filter(l => l.person?.lifecycleStage === 'INTERESTED').length;

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Hot Leads</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">Pipeline</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-display-lg text-on-surface">Hot Leads</h2>
          <p className="text-body-md text-on-surface-variant">Interested contacts from cold calls, social media, and referrals — actively being nurtured.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-label-md bg-surface hover:bg-surface-container">
          <span className="material-symbols-outlined text-sm">refresh</span><span>Refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />
          <p className="text-label-md text-outline uppercase tracking-wider mb-2">Total Hot Leads</p>
          <p className="font-display-lg text-display-lg text-on-surface">{total}</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <p className="text-label-md text-outline uppercase tracking-wider mb-2">Interested (Active)</p>
          <p className="font-display-lg text-display-lg text-primary">{followUpCount}</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-tertiary" />
          <p className="text-label-md text-outline uppercase tracking-wider mb-2">Demo Scheduled</p>
          <p className="font-display-lg text-display-lg text-tertiary">{leads.filter(l => l.person?.lifecycleStage === 'DEMO_SCHEDULED').length}</p>
        </div>
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'All'], ...Object.entries(STAGE_LABELS)].map(([val, label]) => (
          <button key={val} onClick={() => { setStageFilter(val); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-label-md border transition-colors ${stageFilter === val ? 'bg-primary text-white border-primary' : 'bg-surface border-outline-variant hover:bg-surface-container'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading hot leads...</span>
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-2">
              <span className="material-symbols-outlined text-5xl">local_fire_department</span>
              <p className="text-body-lg font-bold">No hot leads yet</p>
              <p className="text-body-md">Hot leads appear here when cold calls result in "Interested" or when social media leads are added</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-3 text-label-sm text-outline uppercase">Student</th>
                <th className="px-6 py-3 text-label-sm text-outline uppercase">Course Interest</th>
                <th className="px-6 py-3 text-label-sm text-outline uppercase">Stage</th>
                <th className="px-6 py-3 text-label-sm text-outline uppercase">Added</th>
                <th className="px-6 py-3 text-right text-label-sm text-outline uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-outline-variant">
                {leads.map(lead => {
                  const stage = lead.person?.lifecycleStage || 'LEAD';
                  const enq = lead.person?.enquiries?.[0];
                  const course = enq?.courseInterested || lead.notes || '—';
                  const origin = enq?.source || lead.person?.source;
                  return (
                    <tr key={lead.id} className="hover:bg-surface-container-low/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-primary inline-flex items-center justify-center font-bold text-label-md mr-3">
                          {(lead.person?.name || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-on-surface">{lead.person?.name || '—'}</span>
                        <div className="text-[10px] text-outline font-mono mt-0.5">{lead.person?.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-body-md text-on-surface">{course}</div>
                        {origin && <div className="text-[10px] text-outline uppercase tracking-wider mt-0.5">via {origin}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold border ${STAGE_COLOR[stage] || STAGE_COLOR.LEAD}`}>
                          {STAGE_LABELS[stage] || stage}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-body-md text-on-surface-variant">
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleDial(lead)}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-outline-variant rounded-lg text-label-sm font-bold hover:bg-surface-container">
                            <span className="material-symbols-outlined text-[16px]">phone</span><span>Call</span>
                          </button>
                          <button onClick={() => handleStageUpdate(lead.id, 'DEMO_SCHEDULED')}
                            className="px-3 py-1.5 bg-primary text-white rounded-lg text-label-sm font-bold hover:brightness-110 active:scale-95 transition-all">
                            Schedule Demo
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low/30 flex items-center justify-between">
          <span className="text-label-md text-outline">Page {page} of {pages} · {total} total</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-md disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page >= pages} className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-md disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HotLeads;
