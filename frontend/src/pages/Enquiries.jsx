import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { enquiriesApi } from '../api/enquiries.api.js';

const SOURCE_LABEL = { WEBSITE: 'Website', PHONE: 'Phone', WHATSAPP: 'WhatsApp', WALKIN: 'Walk-In', VOICE_AGENT: 'Voice Agent', MANUAL: 'Manual' };

const STATUS_OPTIONS = ['New', 'Contacted', 'Interested', 'Demo Scheduled', 'Not Interested'];

const statusBadge = (s) => ({
  New:          'bg-primary/10 text-primary border border-primary/20',
  Contacted:    'bg-tertiary/10 text-tertiary border border-tertiary/20',
  Interested:   'bg-secondary/10 text-secondary border border-secondary/20',
  'Demo Scheduled': 'bg-tertiary/10 text-tertiary border border-tertiary/20',
  Converted:    'bg-secondary/10 text-secondary border border-secondary/20',
  Lost:         'bg-error/10 text-error border border-error/20',
  'Not Interested': 'bg-error/10 text-error border border-error/20',
}[s] || 'bg-surface-container text-on-surface-variant');

const sourceIcon = (s) => ({
  WEBSITE:     'language',
  WHATSAPP:    'chat',
  PHONE:       'phone',
  WALKIN:      'directions_walk',
  VOICE_AGENT: 'record_voice_over',
}[s] || 'help');

const Enquiries = () => {
  const { showSuccess, showError, showInfo } = useToast();

  const [enquiries,  setEnquiries]  = useState([]);
  const [stats,      setStats]      = useState({});
  const [loading,    setLoading]    = useState(true);
  const [total,      setTotal]      = useState(0);
  const [page,       setPage]       = useState(1);
  const [pages,      setPages]      = useState(1);
  const [tab,        setTab]        = useState('All');
  const [search,     setSearch]     = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (tab !== 'All') params.source = tab;
      if (search)        params.search = search;
      if (statusFilter)  params.status = statusFilter;

      const [listData, statsData] = await Promise.all([
        enquiriesApi.list(params),
        enquiriesApi.stats(),
      ]);
      setEnquiries(listData.enquiries);
      setTotal(listData.total);
      setPages(listData.pages);
      setStats(statsData);
    } catch (e) {
      showError('Failed to load enquiries');
    } finally {
      setLoading(false);
    }
  }, [page, tab, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const handleConvert = async (enq) => {
    try {
      await enquiriesApi.update(enq.id, { status: 'Converted' });
      showSuccess(`${enq.person?.name} converted!`);
      load();
    } catch { showError('Failed to convert'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await enquiriesApi.update(id, { status });
      showSuccess('Status updated');
      load();
    } catch { showError('Failed to update'); }
  };

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Enquiries</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">Inbox</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-background">Inbound Call Enquiries</h2>
          <p className="text-body-md text-on-surface-variant">Inbound voice-agent calls — what each caller asked about and the call outcome.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {[
          { label: 'New Enquiries',   val: stats.new,           color: 'primary',   icon: 'add_chart' },
          { label: 'Contacted',       val: stats.contacted,     color: 'secondary',  icon: 'ring_volume' },
          { label: 'Demo Scheduled',  val: stats.demo_scheduled, color: 'tertiary', icon: 'play_lesson' },
        ].map(({ label, val, color, icon }) => (
          <div key={label} className={`bg-surface-container-lowest p-6 rounded-xl border border-outline-variant border-t-4 border-t-${color} shadow-sm`}>
            <div className="flex justify-between items-start mb-2">
              <span className="text-label-md text-outline uppercase tracking-wider">{label}</span>
              <span className={`material-symbols-outlined text-${color}`}>{icon}</span>
            </div>
            <span className="font-display-lg text-display-lg text-on-surface">{val ?? '—'}</span>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-outline-variant flex items-center justify-between gap-3 bg-surface-container-low/30 flex-wrap">
          <div className="flex gap-2 items-center flex-1">
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary"
                placeholder="Search name or phone…" />
            </div>
            <button onClick={() => setFilterOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-label-md text-on-surface-variant hover:bg-surface-container-high">
              <span className="material-symbols-outlined text-[18px]">filter_list</span><span>Filter</span>
            </button>
          </div>
          <div className="text-label-md text-outline">
            Showing <span className="text-on-surface font-bold">{enquiries.length}</span> of <span className="text-on-surface font-bold">{total}</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              <span>Loading enquiries…</span>
            </div>
          ) : enquiries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant gap-2">
              <span className="material-symbols-outlined text-5xl">inbox</span>
              <p className="text-body-lg">No enquiries found</p>
              <p className="text-body-md">Enquiries created by voice agents or manually will appear here</p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-3 text-label-sm text-outline uppercase tracking-wider">Lead Name</th>
                  <th className="px-6 py-3 text-label-sm text-outline uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-label-sm text-outline uppercase tracking-wider">Course Interested</th>
                  <th className="px-6 py-3 text-label-sm text-outline uppercase tracking-wider">What They Asked</th>
                  <th className="px-6 py-3 text-label-sm text-outline uppercase tracking-wider">Outcome</th>
                  <th className="px-6 py-3 text-label-sm text-outline uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-label-sm text-outline uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {enquiries.map(enq => (
                  <tr key={enq.id} className="hover:bg-surface-container-low/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-label-md">
                          {(enq.person?.name || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-body-md font-bold text-on-surface leading-none mb-0.5">{enq.person?.name}</div>
                          <div className="text-[10px] text-outline leading-none">{enq.person?.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[18px]">{sourceIcon(enq.source)}</span>
                        <span className="text-body-md">{SOURCE_LABEL[enq.source] || enq.source}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface">{enq.courseInterested || enq.course?.name || '—'}</td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant max-w-[240px] truncate" title={enq.notes || ''}>{enq.notes || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold ${statusBadge(enq.status)}`}>{enq.status}</span>
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">
                      {new Date(enq.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={enq.status}
                          onChange={e => handleStatusChange(enq.id, e.target.value)}
                          className="text-label-sm border border-outline-variant rounded-lg px-2 py-1 bg-surface outline-none"
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        <button onClick={() => handleConvert(enq)}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-label-sm hover:brightness-110 active:scale-95 transition-all">
                          Convert
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-outline-variant flex items-center justify-between bg-surface-container-low/30">
          <div className="text-label-md text-outline">Page {page} of {pages}</div>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-md text-outline hover:bg-surface-container-high disabled:opacity-50">
              Previous
            </button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
              className="px-3 py-1.5 bg-surface border border-outline-variant rounded-lg text-label-md hover:bg-surface-container-high disabled:opacity-50">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Filter Drawer */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-on-background/25 backdrop-blur-xs">
          <div className="fixed inset-0" onClick={() => setFilterOpen(false)} />
          <div className="relative h-screen w-80 bg-surface-container-lowest border-l border-outline-variant shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
              <h3 className="font-headline-md text-headline-md">Filters</h3>
              <button onClick={() => setFilterOpen(false)} className="p-2 hover:bg-surface-container rounded-full text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-label-sm text-outline uppercase font-bold tracking-widest block">Lead Status</label>
                <div className="flex flex-wrap gap-2">
                  {['', 'New', 'Contacted', 'Interested', 'Demo Scheduled', 'Not Interested', 'Converted', 'Lost'].map(s => (
                    <button key={s}
                      onClick={() => { setStatusFilter(s); setPage(1); }}
                      className={`px-3 py-1.5 rounded-full text-label-md border transition-colors ${statusFilter === s ? 'bg-primary/10 text-primary border-primary/20' : 'bg-surface border-outline-variant'}`}>
                      {s || 'All'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-outline-variant flex gap-3 bg-surface-container-low/30">
              <button onClick={() => { setStatusFilter(''); setPage(1); setFilterOpen(false); }}
                className="flex-1 px-4 py-2 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container-high">Reset</button>
              <button onClick={() => { setFilterOpen(false); load(); }}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-label-md hover:brightness-110">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Enquiries;
