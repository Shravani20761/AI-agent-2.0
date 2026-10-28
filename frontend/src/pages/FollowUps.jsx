import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { followUpsApi } from '../api/followUps.api.js';
import { dialerApi } from '../api/dialer.api.js';

const TYPE_LABEL = { DEMO_SCHEDULING: 'Demo', CALLBACK: 'Callback', FEE_FOLLOW_UP: 'Fee', VISIT: 'Visit', REVIEW: 'Review', GENERAL: 'General' };
const TYPE_COLOR = { DEMO_SCHEDULING: 'text-primary bg-primary/10 border-primary/20', CALLBACK: 'text-tertiary bg-tertiary/10 border-tertiary/20', FEE_FOLLOW_UP: 'text-error bg-error/10 border-error/20', VISIT: 'text-secondary bg-secondary/10 border-secondary/20', REVIEW: 'text-on-surface-variant bg-surface-container border-outline-variant', GENERAL: 'text-on-surface-variant bg-surface-container border-outline-variant' };

const fmtTime = (d) => {
  const dt = new Date(d);
  const now = new Date();
  const diff = dt - now;
  if (diff < 0) {
    const hours = Math.floor(-diff / 3600000);
    return hours < 24 ? `Overdue by ${hours}h` : `Overdue by ${Math.floor(hours / 24)}d`;
  }
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const TABS = [
  { key: 'due_today', label: 'Due Today',  color: 'text-error', dot: 'bg-error' },
  { key: 'overdue',   label: 'Overdue',    color: 'text-tertiary', dot: 'bg-tertiary' },
  { key: 'completed', label: 'Completed',  color: 'text-secondary', dot: 'bg-secondary' },
];

const RescheduleModal = ({ followUp, onClose, onSave }) => {
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');
  if (!followUp) return null;
  const handleSubmit = (e) => { e.preventDefault(); onSave(followUp.id, dueAt, notes); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/25 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl border border-outline-variant shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="p-5 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md">Reschedule Follow-Up</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-container rounded-full"><span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">New Date & Time</label>
            <input required type="datetime-local" value={dueAt} onChange={e => setDueAt(e.target.value)} className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">Notes</label>
            <textarea rows="2" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" placeholder="Optional notes..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-primary text-white rounded-lg font-label-md hover:brightness-110">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FollowUps = () => {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState('due_today');
  const [followUps, setFollowUps] = useState([]);
  const [counts, setCounts] = useState({ due_today: 0, overdue: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(null);
  const [dialerStatus, setDialerStatus] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, due, overdue, completed] = await Promise.all([
        followUpsApi.list({ filter: activeTab, limit: 50 }),
        followUpsApi.list({ filter: 'due_today', limit: 1 }),
        followUpsApi.list({ filter: 'overdue', limit: 1 }),
        followUpsApi.list({ filter: 'completed', limit: 1 }),
      ]);
      setFollowUps(data.followUps);
      setCounts({ due_today: due.total, overdue: overdue.total, completed: completed.total });
    } catch { showError('Failed to load follow-ups'); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    dialerApi.status().then(setDialerStatus).catch(() => {});
  }, []);

  const handleComplete = async (id) => {
    try { await followUpsApi.complete(id); showSuccess('Marked as done'); load(); }
    catch { showError('Failed to complete'); }
  };

  const handleReschedule = async (id, dueAt, notes) => {
    try { await followUpsApi.reschedule(id, dueAt, notes); showSuccess('Rescheduled'); setRescheduling(null); load(); }
    catch { showError('Failed to reschedule'); }
  };

  const handleCallNow = async (fu) => {
    try {
      await dialerApi.triggerFollowUp({ followUpId: fu.id });
      showSuccess(`Queued call to ${fu.person?.name}`);
      dialerApi.status().then(setDialerStatus).catch(() => {});
    } catch { showError('Failed to queue call — check dialer settings'); }
  };

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Follow-Ups</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">Queue</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-display-lg text-on-surface">Follow-Ups Queue</h2>
          <p className="text-body-md text-on-surface-variant">Scheduled callbacks and reminders across all contacts and stages.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-label-md bg-surface hover:bg-surface-container">
          <span className="material-symbols-outlined text-sm">refresh</span><span>Refresh</span>
        </button>
      </div>

      {/* Dialer status bar */}
      {dialerStatus?.workerRunning && dialerStatus.currentCall && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-error animate-ping" />
          <span className="text-body-md font-bold text-primary">Calling {dialerStatus.currentCall.personName}</span>
          <span className="text-on-surface-variant text-label-md">{dialerStatus.currentCall.phone}</span>
          <span className="ml-auto text-label-md text-on-surface-variant">{dialerStatus.queuedByType ? Object.values(dialerStatus.queuedByType).reduce((a,b)=>a+b,0) : 0} queued</span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {TABS.map(({ key, label, color, dot }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`bg-surface-container-lowest border p-6 rounded-xl relative overflow-hidden text-left transition-all ${activeTab === key ? 'border-primary shadow-md' : 'border-outline-variant hover:border-primary/40'}`}>
            <div className={`absolute top-0 left-0 w-full h-1 ${dot}`} />
            <p className="text-label-md text-outline uppercase tracking-wider mb-2">{label}</p>
            <p className={`font-display-lg text-display-lg ${color}`}>{String(counts[key]).padStart(2, '0')}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low/30 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md">{TABS.find(t=>t.key===activeTab)?.label}</h3>
          <span className="text-label-md text-outline">{followUps.length} items</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading...</span>
            </div>
          ) : followUps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-2">
              <span className="material-symbols-outlined text-5xl">event_available</span>
              <p className="text-body-lg font-bold">Nothing here</p>
              <p className="text-body-md">Follow-ups are auto-created by agents when contacts request callbacks</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-surface-container-low border-b border-outline-variant">
                <th className="px-6 py-3 text-label-sm text-outline uppercase">Contact</th>
                <th className="px-6 py-3 text-label-sm text-outline uppercase">Type</th>
                <th className="px-6 py-3 text-label-sm text-outline uppercase">Due</th>
                <th className="px-6 py-3 text-label-sm text-outline uppercase">Created By</th>
                <th className="px-6 py-3 text-label-sm text-outline uppercase">Notes</th>
                <th className="px-6 py-3 text-right text-label-sm text-outline uppercase">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-outline-variant">
                {followUps.map(fu => (
                  <tr key={fu.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-label-md font-bold text-on-surface">{fu.person?.name || '—'}</div>
                      <div className="text-[10px] text-outline font-mono">{fu.person?.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-label-sm font-bold border ${TYPE_COLOR[fu.type] || TYPE_COLOR.GENERAL}`}>{TYPE_LABEL[fu.type] || fu.type}</span>
                    </td>
                    <td className={`px-6 py-4 font-bold text-body-md ${activeTab === 'overdue' ? 'text-error' : activeTab === 'completed' ? 'text-secondary' : 'text-on-surface'}`}>
                      {activeTab === 'completed' ? new Date(fu.completedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : fmtTime(fu.dueAt)}
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">{fu.agentType?.replace(/_/g,' ') || fu.createdByUser?.name || '—'}</td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant max-w-xs truncate" title={fu.notes}>{fu.notes || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      {activeTab !== 'completed' && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleCallNow(fu)} title="Queue call now"
                            className="p-1.5 border border-outline-variant rounded-lg text-on-surface-variant hover:bg-surface-container-high">
                            <span className="material-symbols-outlined text-[18px]">phone_forwarded</span>
                          </button>
                          <button onClick={() => setRescheduling(fu)}
                            className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-sm font-bold text-on-surface hover:bg-surface-container">
                            Snooze
                          </button>
                          <button onClick={() => handleComplete(fu.id)}
                            className="px-3 py-1.5 bg-primary text-white rounded-lg text-label-sm font-bold hover:brightness-110 active:scale-95 transition-all">
                            Done
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <RescheduleModal followUp={rescheduling} onClose={() => setRescheduling(null)} onSave={handleReschedule} />
    </div>
  );
};

export default FollowUps;
