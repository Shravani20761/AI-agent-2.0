import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { supportApi } from '../api/support.api.js';

const STATUS_BADGE = { OPEN: 'bg-error-container text-on-error-container', IN_PROGRESS: 'bg-secondary-container text-on-secondary-container', RESOLVED: 'bg-surface-variant text-on-surface-variant' };
const STATUS_LABEL = { OPEN: 'Open', IN_PROGRESS: 'In Progress', RESOLVED: 'Resolved' };

const OUTCOME_BADGE = {
  resolved: 'bg-secondary/10 text-secondary border-secondary/20',
  answered: 'bg-secondary/10 text-secondary border-secondary/20',
  escalated: 'bg-error/10 text-error border-error/20',
  callback_required: 'bg-tertiary/10 text-tertiary border-tertiary/20',
};
const fmtDuration = s => { if (!s) return '—'; const m = Math.floor(s / 60), sec = s % 60; return m ? `${m}m ${sec}s` : `${sec}s`; };

// ─── Call Logs tab (Phase E) ────────────────────────────────────────────────
function CallLogsTab() {
  const { showError } = useToast();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ handled_today: 0, escalated_today: 0, avg_duration_secs: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supportApi.callLogs({ limit: 30, ...(search && { search }) });
      setLogs(data.logs || []);
      setStats(data.stats || {});
      setTotal(data.total || 0);
    } catch { showError('Failed to load call logs'); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-gutter">
        {[
          ['Calls Handled Today', stats.handled_today, 'primary', 'support_agent'],
          ['Escalated Today', stats.escalated_today, 'error', 'priority_high'],
          ['Avg Duration', fmtDuration(stats.avg_duration_secs), 'secondary', 'timer'],
        ].map(([label, value, color, icon]) => (
          <div key={label} className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className={`material-symbols-outlined text-${color} text-[20px]`}>{icon}</span>
              <p className="text-label-md text-outline uppercase tracking-wider">{label}</p>
            </div>
            <p className={`font-display-lg text-display-lg text-${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/30 flex items-center justify-between gap-3">
          <h3 className="font-headline-md text-headline-md">Student Support Call Logs</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search caller..."
              className="pl-9 pr-4 py-2 bg-surface border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary w-56" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading call logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-2">
            <span className="material-symbols-outlined text-5xl">call</span>
            <p className="text-body-lg font-bold">No support calls yet</p>
            <p className="text-body-md">Calls handled by the Student Support agent will appear here</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-outline">
              <th className="px-5 py-3 uppercase">Caller</th>
              <th className="px-5 py-3 uppercase">Question / Notes</th>
              <th className="px-5 py-3 uppercase">Outcome</th>
              <th className="px-5 py-3 uppercase">Duration</th>
              <th className="px-5 py-3 uppercase">When</th>
              <th className="px-5 py-3 uppercase">Recording</th>
            </tr></thead>
            <tbody className="divide-y divide-outline-variant">
              {logs.map(l => (
                <tr key={l.id} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-bold text-on-surface">{l.person?.name || 'Unknown'}</div>
                    <div className="text-[10px] text-outline font-mono">{l.person?.phone}</div>
                  </td>
                  <td className="px-5 py-3 text-body-md text-on-surface-variant max-w-md truncate">{l.content || '—'}</td>
                  <td className="px-5 py-3">
                    {l.outcome
                      ? <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold border ${OUTCOME_BADGE[l.outcome] || 'bg-surface-container text-on-surface-variant border-outline-variant'}`}>{l.outcome.replace(/_/g, ' ')}</span>
                      : <span className="text-outline">—</span>}
                  </td>
                  <td className="px-5 py-3 text-body-md text-on-surface-variant font-mono">{fmtDuration(l.durationSecs)}</td>
                  <td className="px-5 py-3 text-body-md text-on-surface-variant">{new Date(l.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-3">
                    {l.recordingUrl
                      ? <a href={l.recordingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline text-label-md"><span className="material-symbols-outlined text-[16px]">play_circle</span>Listen</a>
                      : <span className="text-outline">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="px-5 py-3 border-t border-outline-variant bg-surface-container-low/30 text-label-md text-outline">{total} total support calls</div>
      </div>
    </div>
  );
}

// ─── Escalated Tickets tab (existing) ───────────────────────────────────────
function TicketsTab() {
  const { showSuccess, showError } = useToast();
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 30 };
      if (statusFilter) params.status = statusFilter;
      const data = await supportApi.list(params);
      setTickets(data.tickets);
      setTotal(data.total);
    } catch { showError('Failed to load tickets'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleResolve = async () => {
    if (!selected) return;
    try {
      await supportApi.resolve(selected.id, resolveNotes);
      showSuccess('Ticket resolved');
      setSelected(null);
      setResolveNotes('');
      load();
    } catch { showError('Failed to resolve'); }
  };

  const openCount  = tickets.filter(t => t.status === 'OPEN').length;
  const inProgCount= tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-gutter">
        {[['OPEN', openCount, 'error'], ['IN_PROGRESS', inProgCount, 'secondary'], ['RESOLVED', resolvedCount, 'outline']].map(([status, count, color]) => (
          <button key={status} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
            className={`bg-surface-container-lowest border p-5 rounded-xl text-left transition-all ${statusFilter === status ? 'border-primary shadow-md' : 'border-outline-variant hover:border-primary/40'}`}>
            <p className="text-label-md text-outline uppercase tracking-wider mb-2">{STATUS_LABEL[status]}</p>
            <p className={`font-display-lg text-display-lg text-${color}`}>{count}</p>
          </button>
        ))}
      </div>

      {/* Ticket list */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/30 flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md">Support Tickets {statusFilter && `— ${STATUS_LABEL[statusFilter]}`}</h3>
          <span className="text-label-md text-outline">{total} total</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading tickets...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-2">
            <span className="material-symbols-outlined text-5xl">support_agent</span>
            <p className="text-body-lg font-bold">No tickets found</p>
            <p className="text-body-md">Support tickets are created when students call in with issues</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {tickets.map(ticket => (
              <div key={ticket.id} className="p-5 hover:bg-surface-container-low/30 transition-colors flex items-start gap-4">
                <div className="w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-label-md shrink-0">
                  {(ticket.person?.name || '?').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-on-surface">{ticket.person?.name || 'Unknown'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[ticket.status]}`}>{STATUS_LABEL[ticket.status]}</span>
                    <span className="text-[10px] text-outline font-mono">#{ticket.id.substring(0, 8)}</span>
                  </div>
                  <p className="text-body-md text-on-surface font-medium">{ticket.type?.replace(/_/g, ' ')}</p>
                  <p className="text-body-md text-on-surface-variant truncate">{ticket.description}</p>
                  <p className="text-[10px] text-outline mt-1">{ticket.person?.phone} · {new Date(ticket.createdAt).toLocaleDateString('en-IN')}</p>
                </div>
                {ticket.status !== 'RESOLVED' && (
                  <button onClick={() => { setSelected(ticket); setResolveNotes(''); }}
                    className="px-3 py-1.5 bg-primary text-white rounded-lg text-label-sm font-bold hover:brightness-110 shrink-0">
                    Resolve
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolve modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/25 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl border border-outline-variant shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md">Resolve Ticket</h3>
              <button onClick={() => setSelected(null)}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-body-md"><span className="font-bold">{selected.person?.name}</span> — {selected.type?.replace(/_/g,' ')}</p>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Resolution Notes</label>
                <textarea rows="3" value={resolveNotes} onChange={e => setResolveNotes(e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Describe how this was resolved..." />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 py-2.5 border border-outline-variant rounded-lg font-label-md">Cancel</button>
                <button onClick={handleResolve} className="flex-1 py-2.5 bg-primary text-white rounded-lg font-label-md hover:brightness-110">Mark Resolved</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Support = () => {
  const [tab, setTab] = useState('logs'); // 'logs' | 'tickets'

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display-lg text-display-lg text-on-background">Student Support Center</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">What the AI support agent handled — and what it escalated to you.</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-surface-container rounded-lg w-fit">
        {[['logs', 'call', 'Call Logs'], ['tickets', 'confirmation_number', 'Escalated Tickets']].map(([key, icon, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-label-md font-bold transition-all ${tab === key ? 'bg-surface-container-lowest shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>{label}
          </button>
        ))}
      </div>

      {tab === 'logs' ? <CallLogsTab /> : <TicketsTab />}
    </div>
  );
};

export default Support;
