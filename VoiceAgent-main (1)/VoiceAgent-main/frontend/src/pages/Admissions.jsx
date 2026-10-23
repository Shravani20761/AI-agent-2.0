import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { admissionsApi } from '../api/admissions.api.js';

const STAGE_ORDER = ['DEMO_SCHEDULED', 'QUALIFIED', 'VISIT_SCHEDULED', 'ADMISSION_PENDING', 'ADMITTED'];
const STAGE_META = {
  DEMO_SCHEDULED:   { label: 'Demo Scheduled',    dot: 'bg-primary/50 border border-primary', color: 'primary', next: 'VISIT_SCHEDULED',  nextLabel: 'Schedule Visit' },
  QUALIFIED:        { label: 'Qualified',         dot: 'bg-outline',   color: 'primary',   next: 'VISIT_SCHEDULED',  nextLabel: 'Schedule Visit' },
  VISIT_SCHEDULED:  { label: 'Visit Scheduled',    dot: 'bg-tertiary',  color: 'tertiary',  next: 'ADMISSION_PENDING', nextLabel: 'Mark Attended' },
  ADMISSION_PENDING:{ label: 'Admission Pending',  dot: 'bg-primary',   color: 'primary',   next: 'ADMITTED',         nextLabel: 'Confirm Enroll' },
  ADMITTED:         { label: 'Admitted',           dot: 'bg-secondary', color: 'secondary', next: null,               nextLabel: null },
};

const Admissions = () => {
  const { showSuccess, showError } = useToast();
  const [pipeline, setPipeline] = useState({ DEMO_SCHEDULED: [], QUALIFIED: [], VISIT_SCHEDULED: [], ADMISSION_PENDING: [], ADMITTED: [] });
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(null);
  const [demoModal, setDemoModal] = useState(null); // { card }
  const [demoNotes, setDemoNotes] = useState('');
  const [savingDemo, setSavingDemo] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pData, sData] = await Promise.all([admissionsApi.getPipeline(), admissionsApi.getStats()]);
      setPipeline(pData.pipeline);
      setStats(sData);
    } catch { showError('Failed to load admissions'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdvance = async (admission) => {
    const meta = STAGE_META[admission.stage];
    if (!meta.next) return;
    setAdvancing(admission.id);
    try {
      await admissionsApi.advanceStage(admission.id, { stage: meta.next });
      showSuccess(`${admission.person?.name} moved to ${STAGE_META[meta.next]?.label}`);
      load();
    } catch { showError('Failed to advance stage'); }
    finally { setAdvancing(null); }
  };

  const handleDemoOutcome = async (outcome) => {
    setSavingDemo(true);
    try {
      await admissionsApi.recordDemoOutcome({ personId: demoModal.card.person.id, outcome, notes: demoNotes });
      showSuccess(outcome === 'ATTENDED' ? 'Demo marked attended — ready to schedule visit' : 'Demo marked no-show');
      setDemoModal(null); setDemoNotes('');
      load();
    } catch { showError('Failed to record demo outcome'); }
    finally { setSavingDemo(false); }
  };

  const fmtRupee = (n) => n >= 100000 ? '₹' + (n/100000).toFixed(1)+'L' : n >= 1000 ? '₹'+(n/1000).toFixed(1)+'k' : '₹'+(n||0);

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Admissions</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">Pipeline Board</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="font-headline-lg text-display-lg text-on-surface mb-2">Admissions Pipeline</h2>
          <p className="font-body-md text-on-surface-variant">Real-time tracking from qualification to admission.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-label-md bg-surface hover:bg-surface-container">
          <span className="material-symbols-outlined text-sm">refresh</span><span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <p className="text-label-md text-outline uppercase mb-4">Admissions This Month</p>
          <h3 className="font-display-lg text-display-lg">{stats.admitted ?? 0}</h3>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />
          <p className="text-label-md text-outline uppercase mb-4">Pending Confirmation</p>
          <h3 className="font-display-lg text-display-lg">{stats.pending ?? 0}</h3>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-tertiary" />
          <p className="text-label-md text-outline uppercase mb-4">Revenue Collected</p>
          <h3 className="font-display-lg text-display-lg">{fmtRupee(stats.revenue)}</h3>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading pipeline...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-gutter overflow-x-auto pb-6">
          {STAGE_ORDER.map(stage => {
            const meta = STAGE_META[stage];
            const cards = pipeline[stage] || [];
            return (
              <div key={stage} className="flex flex-col gap-4 min-w-[250px]">
                <div className="flex items-center gap-2 px-2">
                  <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                  <h4 className="font-label-md text-label-md font-bold uppercase tracking-wider text-on-surface-variant">{meta.label}</h4>
                  <span className="px-2 py-0.5 bg-surface-container-high rounded text-label-sm font-bold">{cards.length}</span>
                </div>
                <div className="min-h-[400px] flex flex-col gap-3 bg-surface-container-low/50 rounded-xl p-2 border border-dashed border-outline-variant">
                  {cards.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-outline text-label-sm">Empty</div>
                  ) : cards.map(card => (
                    <div key={card.id} className={`bg-surface-container-lowest border rounded-lg p-4 shadow-sm hover:shadow-md transition-all ${stage === 'ADMITTED' ? 'border-secondary/20' : 'border-outline-variant'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-0.5 bg-${meta.color}/10 text-${meta.color} text-[10px] font-bold rounded uppercase`}>{card.course?.name?.split(' ')[0] || '—'}</span>
                        {stage === 'ADMITTED' && <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>}
                      </div>
                      <h5 className={`font-body-lg font-bold mb-1 ${stage === 'ADMITTED' ? 'text-secondary' : ''}`}>{card.person?.name}</h5>
                      <p className="text-[11px] text-on-surface-variant mb-3">{card.person?.phone}</p>
                      {card.scholarshipAmount > 0 && (
                        <p className="text-[11px] text-secondary font-bold mb-2">Scholarship: {fmtRupee(card.scholarshipAmount)}</p>
                      )}
                      {stage === 'DEMO_SCHEDULED' ? (
                        <div className="pt-3 border-t border-outline-variant">
                          {card.demoAttended ? (
                            <>
                              <p className="text-[11px] text-secondary font-bold mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">check_circle</span>Demo attended
                              </p>
                              <button
                                onClick={() => handleAdvance(card)}
                                disabled={advancing === card.id}
                                className="w-full py-2 bg-primary text-white rounded text-label-sm font-bold hover:brightness-110 transition-all disabled:opacity-50">
                                {advancing === card.id ? 'Moving...' : 'Schedule Visit'}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => { setDemoModal({ card }); setDemoNotes(''); }}
                              className="w-full py-2 bg-primary text-white rounded text-label-sm font-bold hover:brightness-110 transition-all">
                              Record Demo Outcome
                            </button>
                          )}
                        </div>
                      ) : meta.next && (
                        <div className="pt-3 border-t border-outline-variant">
                          <button
                            onClick={() => handleAdvance(card)}
                            disabled={advancing === card.id}
                            className="w-full py-2 bg-primary text-white rounded text-label-sm font-bold hover:brightness-110 transition-all disabled:opacity-50">
                            {advancing === card.id ? 'Moving...' : meta.nextLabel}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Demo outcome modal */}
      {demoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/25 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl border border-outline-variant shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md">Record Demo Outcome</h3>
              <button onClick={() => setDemoModal(null)}>
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="font-bold text-on-surface">{demoModal.card.person?.name}</p>
                <p className="text-label-md text-on-surface-variant">{demoModal.card.person?.phone}</p>
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Notes (optional)</label>
                <textarea
                  rows="3" value={demoNotes} onChange={e => setDemoNotes(e.target.value)}
                  placeholder="How did the demo go? Any next steps…"
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="p-5 border-t border-outline-variant flex gap-3">
              <button
                onClick={() => handleDemoOutcome('NO_SHOW')} disabled={savingDemo}
                className="flex-1 py-2.5 border border-error/30 text-error rounded-lg font-label-md font-bold hover:bg-error/5 disabled:opacity-50">
                No-Show
              </button>
              <button
                onClick={() => handleDemoOutcome('ATTENDED')} disabled={savingDemo}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-50">
                {savingDemo ? 'Saving…' : 'Attended'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admissions;
