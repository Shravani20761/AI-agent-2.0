import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/ui/Toast';
import { coldCallingApi } from '../api/coldCalling.api.js';
import { dialerApi } from '../api/dialer.api.js';
import { useVoiceCall } from '../contexts/VoiceCallContext';

// ─── Constants ────────────────────────────────────────────────────────────────

const COURSES = [
  'IIT-JEE Preparation',
  'NEET-UG Preparation',
  'MHT-CET Preparation',
  '11th & 12th Science',
  '9th & 10th Foundation',
  '6th to 8th Foundation',
  'NDA Preparation',
];

const OUTCOME_BADGE = {
  INTERESTED:     'bg-secondary/10 text-secondary border border-secondary/20',
  NOT_INTERESTED: 'bg-error/10 text-error border border-error/20',
  NO_ANSWER:      'bg-surface-container text-on-surface-variant border border-outline-variant',
  CALLBACK:       'bg-tertiary/10 text-tertiary border border-tertiary/20',
  INVALID_NUMBER: 'bg-error/10 text-error border border-error/20',
  DO_NOT_CALL:    'bg-error/10 text-error border border-error/20',
};
const OUTCOME_LABEL = {
  INTERESTED: 'Interested', NOT_INTERESTED: 'Not Interested', NO_ANSWER: 'No Answer',
  CALLBACK: 'Callback', INVALID_NUMBER: 'Invalid No.', DO_NOT_CALL: 'DNC',
};

const fmt = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n ?? 0);

// ─── CSV / paste parser ────────────────────────────────────────────────────────

function parseContactText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const contacts = [];
  const errors = [];
  lines.forEach((line, i) => {
    const sep = line.includes('\t') ? '\t' : ',';
    const parts = line.split(sep).map(p => p.trim().replace(/^"|"$/g, ''));
    const [rawPhone, name = '', course = '', notes = ''] = parts;
    if (i === 0 && !/\d/.test(rawPhone)) return;
    const phone = rawPhone.replace(/[\s\-().]/g, '');
    if (!phone || phone.length < 7) {
      errors.push(`Row ${i + 1}: invalid phone "${rawPhone}"`);
      return;
    }
    contacts.push({ phone, name, courseHint: course, notes });
  });
  return { contacts, errors };
}

// ─── AddContactsModal ────────────────────────────────────────────────────────

const FIELD_HINT = (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-label-md text-on-surface-variant space-y-0.5">
    <p className="font-bold text-on-surface mb-1">Fields the Cold Calling Agent uses:</p>
    <p><span className="font-bold">Phone</span> — who to call (required)</p>
    <p><span className="font-bold">Name</span> — agent greets: "Hello Rahul, I'm Priya from Seagull…"</p>
    <p><span className="font-bold">Course</span> — agent mentions: "…calling about IIT-JEE preparation"</p>
    <p><span className="font-bold">Notes</span> — background context: "10th student, board exams in March"</p>
  </div>
);

function AddContactsModal({ onClose, onAdd }) {
  const [tab, setTab] = useState('manual');
  const [staged, setStaged] = useState([]);
  const fileRef = useRef();
  const [manual, setManual] = useState({ phone: '', name: '', courseHint: '', notes: '' });
  const [manualError, setManualError] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [parseResult, setParseResult] = useState(null);

  const addManual = () => {
    if (!manual.phone.trim()) { setManualError('Phone is required'); return; }
    const phone = manual.phone.replace(/[\s\-().]/g, '');
    if (phone.length < 7) { setManualError('Enter a valid phone number'); return; }
    setStaged(s => [...s, { phone, name: manual.name, courseHint: manual.courseHint, notes: manual.notes }]);
    setManual({ phone: '', name: '', courseHint: '', notes: '' });
    setManualError('');
  };

  const parsePaste = () => {
    const result = parseContactText(pasteText);
    setParseResult(result);
    if (result.contacts.length) setStaged(s => [...s, ...result.contacts]);
  };

  const handleCsvFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = parseContactText(ev.target.result);
      setParseResult(result);
      if (result.contacts.length) setStaged(s => [...s, ...result.contacts]);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/25 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest w-full max-w-2xl max-h-[90vh] rounded-2xl border border-outline-variant shadow-2xl flex flex-col animate-in fade-in zoom-in duration-150">
        <div className="p-5 border-b border-outline-variant flex justify-between items-center shrink-0">
          <h3 className="font-headline-md text-headline-md">Add Contacts to Queue</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {FIELD_HINT}
          <div className="flex gap-1 p-1 bg-surface-container rounded-lg">
            {[['manual', 'add_circle', 'Manual Entry'], ['paste', 'content_paste', 'Paste / Bulk'], ['csv', 'upload_file', 'CSV / Excel']].map(([key, icon, label]) => (
              <button key={key} onClick={() => { setTab(key); setParseResult(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-label-md font-bold transition-all ${tab === key ? 'bg-surface-container-lowest shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
                <span className="material-symbols-outlined text-[16px]">{icon}</span>{label}
              </button>
            ))}
          </div>

          {tab === 'manual' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-1">Phone Number *</label>
                  <input type="tel" placeholder="+91 98765 43210" value={manual.phone}
                    onChange={e => { setManual(m => ({ ...m, phone: e.target.value })); setManualError(''); }}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary font-mono" />
                  {manualError && <p className="text-error text-label-sm mt-0.5">{manualError}</p>}
                </div>
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-1">Name (optional)</label>
                  <input type="text" placeholder="Rahul Sharma" value={manual.name}
                    onChange={e => setManual(m => ({ ...m, name: e.target.value }))}
                    className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Course Interested (optional)</label>
                <select value={manual.courseHint} onChange={e => setManual(m => ({ ...m, courseHint: e.target.value }))}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary">
                  <option value="">— Unknown / Let agent ask —</option>
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Notes for Agent (optional)</label>
                <input type="text" placeholder="e.g. 10th student, board exams in March, father is a teacher"
                  value={manual.notes} onChange={e => setManual(m => ({ ...m, notes: e.target.value }))}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <button onClick={addManual}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-label-md font-bold hover:brightness-110 active:scale-95 transition-all">
                + Add to Queue
              </button>
            </div>
          )}

          {tab === 'paste' && (
            <div className="space-y-3">
              <p className="text-body-md text-on-surface-variant">Paste numbers — one per line. You can copy directly from Excel too.</p>
              <div className="bg-surface-container rounded-lg p-3 text-label-md text-on-surface-variant font-mono space-y-0.5">
                <p className="text-on-surface font-bold mb-1">Format (any of these work):</p>
                <p>9876543210</p>
                <p>9876543210, Rahul Sharma</p>
                <p>9876543210, Rahul Sharma, IIT-JEE Preparation</p>
                <p>9876543210, Rahul Sharma, IIT-JEE, 10th student board exams March</p>
              </div>
              <textarea rows="8" value={pasteText}
                onChange={e => { setPasteText(e.target.value); setParseResult(null); }}
                placeholder={"9876543210, Rahul Sharma, IIT-JEE Preparation\n9123456789, Priya Patil, NEET-UG Preparation\n9000000001"}
                className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-body-md font-mono outline-none focus:ring-2 focus:ring-primary resize-none" />
              <button onClick={parsePaste} disabled={!pasteText.trim()}
                className="w-full py-2.5 bg-primary text-white rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-50">
                Parse & Add to Queue
              </button>
              {parseResult && (
                <div className="space-y-1">
                  <p className="text-secondary font-bold text-label-md">✓ {parseResult.contacts.length} contacts parsed</p>
                  {parseResult.errors.map((e, i) => <p key={i} className="text-error text-label-sm">{e}</p>)}
                </div>
              )}
            </div>
          )}

          {tab === 'csv' && (
            <div className="space-y-4">
              <div className="bg-surface-container rounded-lg p-4 space-y-2">
                <p className="font-bold text-on-surface text-label-md">CSV Column Order:</p>
                <p className="font-mono text-label-md text-on-surface-variant">phone, name, course, notes</p>
                <a href="data:text/csv;charset=utf-8,phone,name,course,notes%0A9876543210,Rahul Sharma,IIT-JEE Preparation,10th student%0A9123456789,Priya Patil,NEET-UG Preparation,"
                  download="cold_call_template.csv"
                  className="inline-flex items-center gap-1.5 text-primary text-label-md hover:underline font-bold">
                  <span className="material-symbols-outlined text-[16px]">download</span>Download Template CSV
                </a>
              </div>
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-outline-variant rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant">upload_file</span>
                <p className="font-bold text-on-surface mt-2">Click to select CSV file</p>
                <p className="text-on-surface-variant text-label-md">or drop a .csv file here</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCsvFile} />
              </div>
              {parseResult && (
                <div className="space-y-1">
                  <p className="text-secondary font-bold text-label-md">✓ {parseResult.contacts.length} contacts loaded from file</p>
                  {parseResult.errors.map((e, i) => <p key={i} className="text-error text-label-sm">{e}</p>)}
                </div>
              )}
            </div>
          )}

          {staged.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-bold text-on-surface text-label-md">{staged.length} contact{staged.length > 1 ? 's' : ''} ready to queue</p>
                <button onClick={() => setStaged([])} className="text-error text-label-sm hover:underline">Clear all</button>
              </div>
              <div className="border border-outline-variant rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-label-md">
                  <thead><tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="px-3 py-2 text-on-surface-variant">Phone</th>
                    <th className="px-3 py-2 text-on-surface-variant">Name</th>
                    <th className="px-3 py-2 text-on-surface-variant">Course</th>
                    <th className="px-3 py-2 text-on-surface-variant">Notes</th>
                    <th className="px-3 py-2"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-outline-variant">
                    {staged.map((c, i) => (
                      <tr key={i} className="hover:bg-surface-container-low/30">
                        <td className="px-3 py-1.5 font-mono text-on-surface">{c.phone}</td>
                        <td className="px-3 py-1.5 text-on-surface">{c.name || <span className="text-outline">—</span>}</td>
                        <td className="px-3 py-1.5 text-on-surface-variant">{c.courseHint || <span className="text-outline">—</span>}</td>
                        <td className="px-3 py-1.5 text-on-surface-variant truncate max-w-[120px]" title={c.notes}>{c.notes || <span className="text-outline">—</span>}</td>
                        <td className="px-3 py-1.5 text-right">
                          <button onClick={() => setStaged(s => s.filter((_, idx) => idx !== i))} className="text-on-surface-variant hover:text-error">
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-outline-variant bg-surface-container-low/30 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container">Cancel</button>
          <button onClick={() => staged.length > 0 && onAdd(staged)} disabled={staged.length === 0}
            className="flex-1 py-2.5 bg-primary text-white rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-50 active:scale-95 transition-all">
            Add {staged.length > 0 ? `${staged.length} Contact${staged.length > 1 ? 's' : ''}` : 'Contacts'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DateFilter ───────────────────────────────────────────────────────────────

function DateFilter({ from, to, onFrom, onTo, onClear }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-label-md text-on-surface-variant">Added:</span>
      <input type="date" value={from} onChange={e => onFrom(e.target.value)}
        className="bg-surface border border-outline-variant rounded-lg px-2.5 py-1.5 text-label-md outline-none focus:ring-2 focus:ring-primary" />
      <span className="text-on-surface-variant text-label-md">→</span>
      <input type="date" value={to} onChange={e => onTo(e.target.value)}
        className="bg-surface border border-outline-variant rounded-lg px-2.5 py-1.5 text-label-md outline-none focus:ring-2 focus:ring-primary" />
      {(from || to) && (
        <button onClick={onClear} className="text-primary text-label-md hover:underline">Clear</button>
      )}
    </div>
  );
}

// ─── BulkActionBar (floating) ─────────────────────────────────────────────────

function BulkActionBar({ count, onQueue, onClear, queuing }) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 bg-on-surface text-surface rounded-2xl px-6 py-3.5 shadow-2xl animate-in slide-in-from-bottom duration-150">
      <span className="font-label-md font-bold">{count} selected</span>
      <div className="w-px h-4 bg-surface/20" />
      <button onClick={onQueue} disabled={queuing}
        className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-lg text-label-md font-bold hover:brightness-110 disabled:opacity-60 active:scale-95 transition-all">
        <span className="material-symbols-outlined text-[16px]">call</span>
        <span>{queuing ? 'Queuing…' : 'Queue for Call'}</span>
      </button>
      <button onClick={onClear} className="text-surface/50 hover:text-surface transition-colors">
        <span className="material-symbols-outlined text-[20px]">close</span>
      </button>
    </div>
  );
}

// ─── Outcome Chips ────────────────────────────────────────────────────────────

function OutcomeChips({ value, onChange }) {
  const opts = [['', 'All'], ...Object.entries(OUTCOME_LABEL)];
  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      <span className="text-label-md text-on-surface-variant">Outcome:</span>
      {opts.map(([key, label]) => (
        <button key={key} onClick={() => onChange(key === value ? '' : key)}
          className={`px-2.5 py-1 rounded-full text-label-sm font-bold border transition-all ${
            value === key
              ? key ? OUTCOME_BADGE[key] + ' opacity-100' : 'bg-primary/10 text-primary border-primary/20'
              : 'bg-surface border-outline-variant text-on-surface-variant hover:border-primary/30 hover:text-on-surface'
          }`}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

function Checkbox({ checked, indeterminate, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  return (
    <input ref={ref} type="checkbox" checked={checked} onChange={onChange}
      className="w-4 h-4 rounded border-outline-variant accent-primary cursor-pointer" />
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const ColdCalling = () => {
  const { showSuccess, showError } = useToast();
  const { startCall } = useVoiceCall();

  const [activeTab, setActiveTab] = useState('contacts'); // 'contacts' | 'uncalled' | 'logs'

  // ── Logs tab state ──
  const [calls,     setCalls]     = useState([]);
  const [stats,     setStats]     = useState({ today: {}, campaigns: [] });
  const [loading,   setLoading]   = useState(true);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [logOutcome, setLogOutcome] = useState('');

  // ── Contacts tab state ──
  const [contacts,       setContacts]       = useState([]);
  const [contactsTotal,  setContactsTotal]  = useState(0);
  const [contactsPage,   setContactsPage]   = useState(1);
  const [contactsPages,  setContactsPages]  = useState(1);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [contactOutcome, setContactOutcome] = useState('');
  const [contactDateFrom, setContactDateFrom] = useState('');
  const [contactDateTo,   setContactDateTo]   = useState('');

  // ── Never Called tab state ──
  const [uncalled,       setUncalled]       = useState([]);
  const [uncalledTotal,  setUncalledTotal]  = useState(0);
  const [uncalledPage,   setUncalledPage]   = useState(1);
  const [uncalledPages,  setUncalledPages]  = useState(1);
  const [uncalledDateFrom, setUncalledDateFrom] = useState('');
  const [uncalledDateTo,   setUncalledDateTo]   = useState('');

  // ── Selection (shared, one tab visible at a time) ──
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkQueuing, setBulkQueuing] = useState(false);

  // ── Dialer ──
  const [dialerStatus, setDialerStatus]   = useState(null);
  const [addModal,     setAddModal]       = useState(false);
  const [stopping,     setStopping]       = useState(false);
  const pollRef = useRef(null);

  // ── Data loaders ─────────────────────────────────────────────────────────

  const loadCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (logOutcome) params.outcome = logOutcome;
      const [listData, statsData] = await Promise.all([
        coldCallingApi.list(params),
        coldCallingApi.stats(),
      ]);
      setCalls(listData.calls);
      setTotal(listData.total);
      setPages(listData.pages);
      setStats(statsData);
    } catch { showError('Failed to load call logs'); }
    finally { setLoading(false); }
  }, [page, logOutcome]);

  const loadContactsList = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: contactsPage, limit: 20 };
      if (searchQuery)      params.search   = searchQuery;
      if (contactOutcome)   params.outcome  = contactOutcome;
      if (contactDateFrom)  params.dateFrom = contactDateFrom;
      if (contactDateTo)    params.dateTo   = contactDateTo;
      const data = await coldCallingApi.listContacts(params);
      setContacts(data.contacts);
      setContactsTotal(data.total);
      setContactsPages(data.pages);
    } catch { showError('Failed to load contacts'); }
    finally { setLoading(false); }
  }, [contactsPage, searchQuery, contactOutcome, contactDateFrom, contactDateTo]);

  const loadUncalled = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: uncalledPage, limit: 20, uncalled: 'true' };
      if (uncalledDateFrom) params.dateFrom = uncalledDateFrom;
      if (uncalledDateTo)   params.dateTo   = uncalledDateTo;
      const data = await coldCallingApi.listContacts(params);
      setUncalled(data.contacts);
      setUncalledTotal(data.total);
      setUncalledPages(data.pages);
    } catch { showError('Failed to load uncalled contacts'); }
    finally { setLoading(false); }
  }, [uncalledPage, uncalledDateFrom, uncalledDateTo]);

  // Also keep uncalledTotal fresh for the tab badge when on other tabs
  const refreshUncalledCount = useCallback(async () => {
    try {
      const data = await coldCallingApi.listContacts({ uncalled: 'true', limit: 1 });
      setUncalledTotal(data.total);
    } catch {}
  }, []);

  useEffect(() => {
    setSelectedIds(new Set());
    if (activeTab === 'contacts')  loadContactsList();
    else if (activeTab === 'uncalled') loadUncalled();
    else loadCalls();
  }, [activeTab, loadCalls, loadContactsList, loadUncalled]);

  // Keep uncalled badge count fresh across tab switches
  useEffect(() => {
    if (activeTab !== 'uncalled') refreshUncalledCount();
  }, [activeTab, refreshUncalledCount]);

  // Load stats on mount for the stats strip
  useEffect(() => {
    coldCallingApi.stats().then(setStats).catch(() => {});
  }, []);

  // ── Dialer polling ────────────────────────────────────────────────────────

  const pollDialer = useCallback(async () => {
    try {
      const s = await dialerApi.status();
      setDialerStatus(s);
      if (!s.workerRunning && pollRef.current) {
        if (activeTab === 'contacts') loadContactsList();
        else if (activeTab === 'uncalled') loadUncalled();
        else loadCalls();
      }
    } catch { /* non-fatal */ }
  }, [activeTab, loadCalls, loadContactsList, loadUncalled]);

  useEffect(() => {
    pollDialer();
    pollRef.current = setInterval(pollDialer, 8000);
    return () => clearInterval(pollRef.current);
  }, [pollDialer]);

  // ── Selection helpers ─────────────────────────────────────────────────────

  const currentList = activeTab === 'uncalled' ? uncalled : contacts;

  const toggleSelect = (id) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () => {
    const allSelected = currentList.length > 0 && currentList.every(c => selectedIds.has(c.id));
    setSelectedIds(prev => {
      const n = new Set(prev);
      allSelected ? currentList.forEach(c => n.delete(c.id)) : currentList.forEach(c => n.add(c.id));
      return n;
    });
  };

  const allPageSelected  = currentList.length > 0 && currentList.every(c => selectedIds.has(c.id));
  const somePageSelected = currentList.some(c => selectedIds.has(c.id)) && !allPageSelected;

  // ── Action handlers ───────────────────────────────────────────────────────

  const handleBulkQueue = async () => {
    if (selectedIds.size === 0) return;
    setBulkQueuing(true);
    try {
      const contactsList = Array.from(selectedIds).map(id => ({ personId: id }));
      await dialerApi.triggerColdCall({ contacts: contactsList });
      showSuccess(`Queued ${selectedIds.size} contact${selectedIds.size > 1 ? 's' : ''} for calling`);
      setSelectedIds(new Set());
      pollDialer();
    } catch (e) {
      showError(e.message || 'Failed to queue contacts');
    } finally {
      setBulkQueuing(false);
    }
  };

  const handleContactsAdded = async (newContacts) => {
    setAddModal(false);
    try {
      await coldCallingApi.importContacts(newContacts);
      showSuccess(`Successfully added ${newContacts.length} contacts`);
      setContactsPage(1);
      loadContactsList();
      loadUncalled();
    } catch (e) {
      showError(e.message || 'Failed to add contacts to CRM');
    }
  };

  const handleTriggerCall = async (contact) => {
    // Open the VoiceKit demo widget immediately for visual demo
    startCall({
      name: contact.name,
      phone: contact.phone,
      courseHint: contact.enquiries?.[0]?.courseInterested || '',
    });
    // Also queue the real dialer call if backend is configured
    try {
      await dialerApi.triggerColdCall({ personId: contact.id });
      showSuccess(`Demo call started · ${contact.name || contact.phone} queued for AI dialer`);
      pollDialer();
    } catch {
      showSuccess(`Demo call started for ${contact.name || contact.phone}`);
    }
  };

  const handleRecall = async (call) => {
    try {
      await dialerApi.triggerColdCall({ personId: call.personId });
      showSuccess(`Recall queued for ${call.person?.name || call.phone}`);
      pollDialer();
    } catch (e) {
      showError(e.message || 'Failed to queue recall');
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await dialerApi.control('pause');
      showSuccess('Dialer paused — current call will finish then stop');
      pollDialer();
    } catch { showError('Failed to stop dialer'); }
    finally { setStopping(false); }
  };

  const workerRunning = dialerStatus?.workerRunning;
  const currentCall   = dialerStatus?.currentCall;
  const totalQueued   = dialerStatus?.queuedByType
    ? Object.values(dialerStatus.queuedByType).reduce((a, b) => a + b, 0) : 0;

  const statCards = [
    { label: 'Calls Made',  val: fmt(stats.today?.total),       icon: 'call',          color: 'primary'   },
    { label: 'Answered',    val: fmt(stats.today?.answered),     icon: 'phone_in_talk', color: 'secondary' },
    { label: 'Interested',  val: fmt(stats.today?.interested),   icon: 'favorite',      color: 'secondary' },
    { label: 'No Answer',   val: fmt((stats.today?.total || 0) - (stats.today?.answered || 0)), icon: 'phone_missed', color: 'error' },
    { label: 'Callbacks',   val: fmt(stats.today?.callbacks),    icon: 'schedule',      color: 'tertiary'  },
  ];

  // ── Avatar initials ───────────────────────────────────────────────────────
  const initials = name => (name || '?').substring(0, 2).toUpperCase();

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Cold Calling</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">Manager</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-display-lg text-on-surface">Cold Calling Dashboard</h2>
          <p className="text-on-surface-variant font-body-md">Manage contacts and trigger AI agent phone calls.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { if (activeTab === 'contacts') loadContactsList(); else if (activeTab === 'uncalled') loadUncalled(); else loadCalls(); }}
            className="flex items-center gap-2 border border-outline-variant px-4 py-2 rounded-lg font-label-md bg-surface hover:bg-surface-container">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
          {workerRunning ? (
            <button onClick={handleStop} disabled={stopping}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-label-md shadow-sm bg-error text-white hover:brightness-110 disabled:opacity-60">
              <span className="material-symbols-outlined text-[18px]">pause</span>
              <span>{stopping ? 'Stopping…' : 'Pause Dialer'}</span>
            </button>
          ) : (
            <button onClick={() => setAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-label-md shadow-sm bg-primary text-white hover:brightness-110 active:scale-95">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add Contacts</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Dialer Status Bar */}
      {workerRunning && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-3 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-error animate-ping" />
            <span className="font-bold text-primary text-body-md">Dialer Active</span>
          </div>
          {currentCall ? (
            <span className="text-body-md text-on-surface">
              Calling <span className="font-bold">{currentCall.personName}</span>
              <span className="text-on-surface-variant font-mono ml-2 text-label-md">{currentCall.phone}</span>
            </span>
          ) : (
            <span className="text-on-surface-variant text-body-md">Idle (waiting for queue job)...</span>
          )}
          <div className="ml-auto flex items-center gap-4 text-label-md text-on-surface-variant">
            <span><span className="font-bold text-on-surface">{totalQueued}</span> queued</span>
            <span><span className="font-bold text-secondary">{dialerStatus?.doneToday ?? 0}</span> done today</span>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map(({ label, val, icon, color }) => (
          <div key={label} className="bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <span className="text-on-surface-variant font-label-md text-label-md">{label}</span>
              <span className={`material-symbols-outlined text-${color} text-[20px]`}>{icon}</span>
            </div>
            <span className="font-display-lg text-display-lg text-on-surface">{val}</span>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b border-outline-variant">
        {[
          { key: 'contacts', label: 'Contacts', count: contactsTotal },
          { key: 'uncalled', label: 'Never Called', count: uncalledTotal, accent: true },
          { key: 'logs',     label: 'Call History', count: total },
        ].map(({ key, label, count, accent }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`pb-2.5 px-5 text-label-lg font-bold border-b-2 transition-all ${
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}>
            {label}
            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${
              activeTab === key
                ? 'bg-primary/10 text-primary'
                : accent && count > 0
                  ? 'bg-error/10 text-error'
                  : 'bg-surface-container text-on-surface-variant'
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════ CONTACTS TAB ══════════════════ */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 space-y-3">
            {/* Row 1: search + date */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-surface border border-outline-variant rounded-lg px-3 py-1.5 flex-1 min-w-[180px] max-w-xs">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
                <input type="text" placeholder="Search phone or name…" value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setContactsPage(1); setSelectedIds(new Set()); }}
                  className="bg-transparent border-none outline-none text-body-md placeholder:text-on-surface-variant flex-1" />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setContactsPage(1); }} className="text-on-surface-variant hover:text-error">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                )}
              </div>
              <DateFilter
                from={contactDateFrom} to={contactDateTo}
                onFrom={v => { setContactDateFrom(v); setContactsPage(1); setSelectedIds(new Set()); }}
                onTo={v =>   { setContactDateTo(v);   setContactsPage(1); setSelectedIds(new Set()); }}
                onClear={() => { setContactDateFrom(''); setContactDateTo(''); setContactsPage(1); setSelectedIds(new Set()); }}
              />
              <span className="ml-auto text-label-md text-outline">{contactsTotal} contacts</span>
            </div>
            {/* Row 2: outcome chips */}
            <OutcomeChips value={contactOutcome} onChange={v => { setContactOutcome(v); setContactsPage(1); setSelectedIds(new Set()); }} />
          </div>

          {/* Table */}
          {!loading && contacts.length === 0 ? (
            <div className="border-2 border-dashed border-outline-variant rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant">group</span>
              <div>
                <p className="font-headline-md text-headline-md text-on-surface mb-1">No contacts found</p>
                <p className="text-body-md text-on-surface-variant">Try adjusting your filters, or add new contacts.</p>
              </div>
              <button onClick={() => setAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all">
                <span className="material-symbols-outlined">add_circle</span>Add Contacts
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading…</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant">
                        <th className="px-4 py-3">
                          <Checkbox checked={allPageSelected} indeterminate={somePageSelected} onChange={toggleSelectAll} />
                        </th>
                        {['Name', 'Phone', 'Last Outcome', 'Last Called', 'Notes', 'Actions'].map(h => (
                          <th key={h} className={`px-4 py-3 font-label-sm text-on-surface-variant uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {contacts.map(contact => {
                        const lastCall = contact.coldCalls?.[0];
                        const sel = selectedIds.has(contact.id);
                        return (
                          <tr key={contact.id} onClick={() => toggleSelect(contact.id)}
                            className={`cursor-pointer transition-colors ${sel ? 'bg-primary/5' : 'hover:bg-surface-container-low/30'}`}>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <Checkbox checked={sel} onChange={() => toggleSelect(contact.id)} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {initials(contact.name)}
                                </div>
                                <div>
                                  <p className="font-label-md text-on-surface leading-tight">{contact.name || 'Unknown'}</p>
                                  <p className="text-[10px] text-on-surface-variant">{contact.lifecycleStage}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant font-mono">{contact.phone}</td>
                            <td className="px-4 py-3">
                              {lastCall ? (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${OUTCOME_BADGE[lastCall.outcome] || 'bg-surface-container text-on-surface-variant'}`}>
                                  {OUTCOME_LABEL[lastCall.outcome] || lastCall.outcome}
                                </span>
                              ) : <span className="text-outline text-[11px]">—</span>}
                            </td>
                            <td className="px-4 py-3 text-label-md text-on-surface-variant whitespace-nowrap">
                              {lastCall ? new Date(lastCall.calledAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                            </td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant max-w-[180px] truncate" title={contact.notes || ''}>
                              {contact.notes || '—'}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleTriggerCall(contact)}
                                className="bg-primary text-white px-3 py-1.5 rounded-lg text-label-sm font-bold hover:brightness-110 transition-all active:scale-95 inline-flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">call</span>Call
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              <div className="px-5 py-3 bg-surface-container-low/30 border-t border-outline-variant flex justify-between items-center">
                <span className="text-body-md text-on-surface-variant">
                  Page {contactsPage} of {contactsPages} · {contactsTotal} contacts
                  {selectedIds.size > 0 && <span className="ml-2 text-primary font-bold">· {selectedIds.size} selected</span>}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setContactsPage(p => Math.max(1, p - 1)); setSelectedIds(new Set()); }} disabled={contactsPage <= 1}
                    className="p-1.5 border border-outline-variant rounded-md hover:bg-surface-container disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="px-3 py-1 bg-primary text-white rounded-md text-label-md font-bold">{contactsPage}</span>
                  <button onClick={() => { setContactsPage(p => Math.min(contactsPages, p + 1)); setSelectedIds(new Set()); }} disabled={contactsPage >= contactsPages}
                    className="p-1.5 border border-outline-variant rounded-md hover:bg-surface-container disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ NEVER CALLED TAB ══════════════════ */}
      {activeTab === 'uncalled' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-wrap items-center gap-3">
            <DateFilter
              from={uncalledDateFrom} to={uncalledDateTo}
              onFrom={v => { setUncalledDateFrom(v); setUncalledPage(1); setSelectedIds(new Set()); }}
              onTo={v =>   { setUncalledDateTo(v);   setUncalledPage(1); setSelectedIds(new Set()); }}
              onClear={() => { setUncalledDateFrom(''); setUncalledDateTo(''); setUncalledPage(1); setSelectedIds(new Set()); }}
            />
            <span className="ml-auto text-label-md text-outline">{uncalledTotal} never-called contacts</span>
          </div>

          {!loading && uncalled.length === 0 ? (
            <div className="border-2 border-dashed border-outline-variant rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
              <span className="material-symbols-outlined text-6xl text-secondary">check_circle</span>
              <div>
                <p className="font-headline-md text-headline-md text-on-surface mb-1">All contacts have been called</p>
                <p className="text-body-md text-on-surface-variant">Add new contacts to start a fresh calling batch.</p>
              </div>
              <button onClick={() => setAddModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:brightness-110 active:scale-95 transition-all">
                <span className="material-symbols-outlined">add_circle</span>Add Contacts
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading…</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant">
                        <th className="px-4 py-3">
                          <Checkbox checked={allPageSelected} indeterminate={somePageSelected} onChange={toggleSelectAll} />
                        </th>
                        {['Name', 'Phone', 'Notes', 'Added On', 'Actions'].map(h => (
                          <th key={h} className={`px-4 py-3 font-label-sm text-on-surface-variant uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {uncalled.map(contact => {
                        const sel = selectedIds.has(contact.id);
                        return (
                          <tr key={contact.id} onClick={() => toggleSelect(contact.id)}
                            className={`cursor-pointer transition-colors ${sel ? 'bg-primary/5' : 'hover:bg-surface-container-low/30'}`}>
                            <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                              <Checkbox checked={sel} onChange={() => toggleSelect(contact.id)} />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center font-bold text-[11px] shrink-0">
                                  {initials(contact.name)}
                                </div>
                                <p className="font-label-md text-on-surface">{contact.name || 'Unknown'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant font-mono">{contact.phone}</td>
                            <td className="px-4 py-3 text-body-md text-on-surface-variant max-w-[200px] truncate" title={contact.notes || ''}>
                              {contact.notes || '—'}
                            </td>
                            <td className="px-4 py-3 text-label-md text-on-surface-variant whitespace-nowrap">
                              {new Date(contact.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                              <button onClick={() => handleTriggerCall(contact)}
                                className="bg-primary text-white px-3 py-1.5 rounded-lg text-label-sm font-bold hover:brightness-110 transition-all active:scale-95 inline-flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px]">call</span>Call
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              <div className="px-5 py-3 bg-surface-container-low/30 border-t border-outline-variant flex justify-between items-center">
                <span className="text-body-md text-on-surface-variant">
                  Page {uncalledPage} of {uncalledPages} · {uncalledTotal} contacts
                  {selectedIds.size > 0 && <span className="ml-2 text-primary font-bold">· {selectedIds.size} selected</span>}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setUncalledPage(p => Math.max(1, p - 1)); setSelectedIds(new Set()); }} disabled={uncalledPage <= 1}
                    className="p-1.5 border border-outline-variant rounded-md hover:bg-surface-container disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="px-3 py-1 bg-primary text-white rounded-md text-label-md font-bold">{uncalledPage}</span>
                  <button onClick={() => { setUncalledPage(p => Math.min(uncalledPages, p + 1)); setSelectedIds(new Set()); }} disabled={uncalledPage >= uncalledPages}
                    className="p-1.5 border border-outline-variant rounded-md hover:bg-surface-container disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ CALL HISTORY TAB ══════════════════ */}
      {activeTab === 'logs' && (
        <>
          {!loading && calls.length === 0 ? (
            <div className="border-2 border-dashed border-outline-variant rounded-2xl p-12 flex flex-col items-center gap-4 text-center">
              <span className="material-symbols-outlined text-6xl text-on-surface-variant">history</span>
              <div>
                <p className="font-headline-md text-headline-md text-on-surface mb-1">No calls logged yet</p>
                <p className="text-body-md text-on-surface-variant">Trigger calls from the Contacts list. History and outcomes appear here in real time.</p>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-outline-variant flex flex-wrap items-center gap-3 bg-surface-container-low/30">
                <span className="font-headline-md text-headline-md mr-2">Call History</span>
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">filter_list</span>
                <select value={logOutcome} onChange={e => { setLogOutcome(e.target.value); setPage(1); }}
                  className="bg-surface border border-outline-variant rounded-lg text-label-md px-3 py-1.5 outline-none">
                  <option value="">All Outcomes</option>
                  {Object.entries(OUTCOME_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {logOutcome && (
                  <button onClick={() => { setLogOutcome(''); setPage(1); }} className="text-primary font-label-md hover:underline">Clear</button>
                )}
                <span className="ml-auto text-label-md text-outline">{total} calls total</span>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading…</span>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant">
                        {['Name', 'Phone', 'Outcome', 'Duration', 'Called At', 'Notes', 'Actions'].map(h => (
                          <th key={h} className={`px-5 py-3 font-label-sm text-on-surface-variant uppercase tracking-wider ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant">
                      {calls.map(call => (
                        <tr key={call.id} className="hover:bg-surface-container-low/30 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-[11px] shrink-0">
                                {initials(call.person?.name)}
                              </div>
                              <div>
                                <p className="font-label-md text-on-surface leading-tight">{call.person?.name || 'Unknown'}</p>
                                <p className="text-[10px] text-on-surface-variant">{call.person?.lifecycleStage}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-body-md text-on-surface-variant font-mono">{call.person?.phone}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${OUTCOME_BADGE[call.outcome] || 'bg-surface-container text-on-surface-variant'}`}>
                              {OUTCOME_LABEL[call.outcome] || call.outcome || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-body-md text-on-surface-variant">
                            {call.durationSecs ? `${Math.floor(call.durationSecs / 60)}m ${call.durationSecs % 60}s` : '—'}
                          </td>
                          <td className="px-5 py-3 text-body-md text-on-surface-variant whitespace-nowrap">
                            {new Date(call.calledAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-3 text-body-md text-on-surface-variant max-w-[200px] truncate" title={call.notes}>
                            {call.notes || '—'}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => handleRecall(call)}
                              className="bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-lg text-label-sm font-bold hover:bg-primary hover:text-white transition-all active:scale-95 inline-flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">phone_forwarded</span>Recall
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="px-5 py-3 bg-surface-container-low/30 border-t border-outline-variant flex justify-between items-center">
                <span className="text-body-md text-on-surface-variant">Page {page} of {pages} · {total} calls</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                    className="p-1.5 border border-outline-variant rounded-md hover:bg-surface-container disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <span className="px-3 py-1 bg-primary text-white rounded-md text-label-md font-bold">{page}</span>
                  <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages}
                    className="p-1.5 border border-outline-variant rounded-md hover:bg-surface-container disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Floating bulk action bar ── */}
      <BulkActionBar
        count={selectedIds.size}
        onQueue={handleBulkQueue}
        onClear={() => setSelectedIds(new Set())}
        queuing={bulkQueuing}
      />

      {/* ── Add contacts modal ── */}
      {addModal && (
        <AddContactsModal onClose={() => setAddModal(false)} onAdd={handleContactsAdded} />
      )}
    </div>
  );
};

export default ColdCalling;
