import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { academicsApi } from '../api/academics.api.js';
import { studentsApi } from '../api/students.api.js';

const DAYS = [
  { n: 1, label: 'Monday' }, { n: 2, label: 'Tuesday' }, { n: 3, label: 'Wednesday' },
  { n: 4, label: 'Thursday' }, { n: 5, label: 'Friday' }, { n: 6, label: 'Saturday' }, { n: 0, label: 'Sunday' },
];
const DAY_LABEL = Object.fromEntries(DAYS.map(d => [d.n, d.label]));
const STATUS_STYLE = {
  AVAILABLE: 'bg-secondary/10 text-secondary border-secondary/20',
  ON_LEAVE: 'bg-error/10 text-error border-error/20',
  PARTIAL: 'bg-tertiary/10 text-tertiary border-tertiary/20',
};

const input = 'w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Generic modal shell ────────────────────────────────────────────────────
function Modal({ title, onClose, children, onSave, saveLabel = 'Save', saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/25 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl border border-outline-variant shadow-2xl flex flex-col animate-in fade-in zoom-in duration-150">
        <div className="p-5 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md">{title}</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <div className="p-5 space-y-3">{children}</div>
        <div className="p-5 border-t border-outline-variant flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-outline-variant rounded-lg text-label-md">Cancel</button>
          <button onClick={onSave} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-50">{saving ? 'Saving…' : saveLabel}</button>
        </div>
      </div>
    </div>
  );
}

const BatchSelect = ({ batches, value, onChange }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className={input + ' max-w-xs'}>
    <option value="">— Select a batch —</option>
    {batches.map(b => <option key={b.id} value={b.id}>{b.name}{b.course?.name ? ` · ${b.course.name}` : ''}</option>)}
  </select>
);

// ─── Timetable tab ──────────────────────────────────────────────────────────
function TimetableTab({ batches }) {
  const { showSuccess, showError } = useToast();
  const [batchId, setBatchId] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { dayOfWeek, ... } | null
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!batchId) { setEntries([]); return; }
    setLoading(true);
    try { const d = await academicsApi.listTimetable({ batchId }); setEntries(d.entries || []); }
    catch { showError('Failed to load timetable'); }
    finally { setLoading(false); }
  }, [batchId]);
  useEffect(() => { load(); }, [load]);

  const openAdd = (dayOfWeek) => setModal({ batchId, dayOfWeek, startTime: '', endTime: '', subject: '', facultyName: '', room: '' });
  const openEdit = (e) => setModal({ ...e });

  const save = async () => {
    if (!modal.subject || !modal.startTime || !modal.endTime) { showError('Subject, start and end time are required'); return; }
    setSaving(true);
    try {
      await academicsApi.saveTimetable(modal);
      showSuccess(modal.id ? 'Class updated' : 'Class added');
      setModal(null); load();
    } catch { showError('Failed to save'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this class?')) return;
    try { await academicsApi.deleteTimetable(id); showSuccess('Deleted'); load(); }
    catch { showError('Failed to delete'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <BatchSelect batches={batches} value={batchId} onChange={setBatchId} />
        {batchId && <span className="text-label-md text-outline">{entries.length} classes scheduled</span>}
      </div>

      {!batchId ? (
        <Empty icon="calendar_month" title="Select a batch" sub="Choose a batch to view and edit its weekly timetable" />
      ) : loading ? <Loading /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {DAYS.map(({ n, label }) => {
            const dayEntries = entries.filter(e => e.dayOfWeek === n).sort((a, b) => a.startTime.localeCompare(b.startTime));
            return (
              <div key={n} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-3 space-y-2 min-h-[120px]">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-on-surface text-label-lg">{label}</h4>
                  <button onClick={() => openAdd(n)} className="text-primary hover:bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center" title={`Add class on ${label}`}>
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
                {dayEntries.length === 0 ? <p className="text-label-sm text-outline italic">No classes</p> : dayEntries.map(e => (
                  <div key={e.id} className="bg-surface-container-low border border-outline-variant rounded-lg p-2 group">
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <p className="font-bold text-on-surface text-label-md truncate">{e.subject}</p>
                        <p className="text-label-sm text-on-surface-variant font-mono">{e.startTime}–{e.endTime}</p>
                        {(e.facultyName || e.room) && <p className="text-[10px] text-outline truncate">{[e.facultyName, e.room].filter(Boolean).join(' · ')}</p>}
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(e)} className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                        <button onClick={() => remove(e.id)} className="text-on-surface-variant hover:text-error"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Edit Class' : `Add Class — ${DAY_LABEL[modal.dayOfWeek]}`} onClose={() => setModal(null)} onSave={save} saving={saving}>
          <Field label="Subject *"><input className={input} value={modal.subject} onChange={e => setModal({ ...modal, subject: e.target.value })} placeholder="Physics" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start (HH:MM) *"><input className={input + ' font-mono'} value={modal.startTime} onChange={e => setModal({ ...modal, startTime: e.target.value })} placeholder="07:00" /></Field>
            <Field label="End (HH:MM) *"><input className={input + ' font-mono'} value={modal.endTime} onChange={e => setModal({ ...modal, endTime: e.target.value })} placeholder="09:00" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Faculty"><input className={input} value={modal.facultyName || ''} onChange={e => setModal({ ...modal, facultyName: e.target.value })} placeholder="Sharma" /></Field>
            <Field label="Room"><input className={input} value={modal.room || ''} onChange={e => setModal({ ...modal, room: e.target.value })} placeholder="101" /></Field>
          </div>
          {modal.id && (
            <Field label="Day">
              <select className={input} value={modal.dayOfWeek} onChange={e => setModal({ ...modal, dayOfWeek: Number(e.target.value) })}>
                {DAYS.map(d => <option key={d.n} value={d.n}>{d.label}</option>)}
              </select>
            </Field>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Teacher Availability tab ───────────────────────────────────────────────
function AvailabilityTab() {
  const { showSuccess, showError } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await academicsApi.listAvailability(filterName ? { facultyName: filterName } : {}); setRecords(d.records || []); }
    catch { showError('Failed to load availability'); }
    finally { setLoading(false); }
  }, [filterName]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!modal.facultyName || !modal.date) { showError('Faculty name and date are required'); return; }
    setSaving(true);
    try { await academicsApi.setAvailability(modal); showSuccess(modal.id ? 'Updated' : 'Marked'); setModal(null); load(); }
    catch { showError('Failed to save'); }
    finally { setSaving(false); }
  };
  const remove = async (id) => { if (!window.confirm('Delete this record?')) return; try { await academicsApi.deleteAvailability(id); showSuccess('Deleted'); load(); } catch { showError('Failed to delete'); } };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <input value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Filter by faculty name..." className={input + ' max-w-xs'} />
        <button onClick={() => setModal({ facultyName: filterName, date: new Date().toISOString().split('T')[0], status: 'ON_LEAVE', note: '' })}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-label-md font-bold hover:brightness-110">
          <span className="material-symbols-outlined text-[18px]">event_busy</span>Mark Leave / Availability
        </button>
      </div>

      {loading ? <Loading /> : records.length === 0 ? (
        <Empty icon="person_off" title="No availability records" sub="Mark a teacher's leave so the support agent can tell callers" />
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-outline">
              <th className="px-5 py-3 uppercase">Faculty</th><th className="px-5 py-3 uppercase">Date</th><th className="px-5 py-3 uppercase">Status</th><th className="px-5 py-3 uppercase">Note</th><th className="px-5 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-outline-variant">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-surface-container-low/30 group">
                  <td className="px-5 py-3 font-bold text-on-surface">{r.facultyName}</td>
                  <td className="px-5 py-3 text-body-md text-on-surface-variant">{fmtDate(r.date)}</td>
                  <td className="px-5 py-3"><span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold border ${STATUS_STYLE[r.status]}`}>{r.status.replace('_', ' ')}</span></td>
                  <td className="px-5 py-3 text-body-md text-on-surface-variant">{r.note || '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModal({ ...r, date: r.date.split('T')[0] })} className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                      <button onClick={() => remove(r.id)} className="text-on-surface-variant hover:text-error"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Edit Availability' : 'Mark Availability'} onClose={() => setModal(null)} onSave={save} saving={saving}>
          <Field label="Faculty Name *"><input className={input} value={modal.facultyName} onChange={e => setModal({ ...modal, facultyName: e.target.value })} placeholder="Sharma" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *"><input type="date" className={input} value={modal.date} onChange={e => setModal({ ...modal, date: e.target.value })} /></Field>
            <Field label="Status">
              <select className={input} value={modal.status} onChange={e => setModal({ ...modal, status: e.target.value })}>
                <option value="AVAILABLE">Available</option><option value="ON_LEAVE">On Leave</option><option value="PARTIAL">Partial</option>
              </select>
            </Field>
          </div>
          <Field label="Note"><input className={input} value={modal.note || ''} onChange={e => setModal({ ...modal, note: e.target.value })} placeholder="Medical leave" /></Field>
        </Modal>
      )}
    </div>
  );
}

// ─── Test Schedule tab ──────────────────────────────────────────────────────
function TestsTab({ batches }) {
  const { showSuccess, showError } = useToast();
  const [batchId, setBatchId] = useState('');
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!batchId) { setTests([]); return; }
    setLoading(true);
    try { const d = await academicsApi.listTests({ batchId }); setTests(d.tests || []); }
    catch { showError('Failed to load tests'); }
    finally { setLoading(false); }
  }, [batchId]);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!modal.subject || !modal.testDate) { showError('Subject and test date are required'); return; }
    setSaving(true);
    try {
      const body = { ...modal, maxMarks: modal.maxMarks ? Number(modal.maxMarks) : null };
      if (modal.id) await academicsApi.updateTest(modal.id, body);
      else await academicsApi.createTest({ ...body, batchId });
      showSuccess(modal.id ? 'Test updated' : 'Test added'); setModal(null); load();
    } catch { showError('Failed to save'); }
    finally { setSaving(false); }
  };
  const remove = async (id) => { if (!window.confirm('Delete this test?')) return; try { await academicsApi.deleteTest(id); showSuccess('Deleted'); load(); } catch { showError('Failed to delete'); } };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <BatchSelect batches={batches} value={batchId} onChange={setBatchId} />
        {batchId && (
          <button onClick={() => setModal({ subject: '', testDate: '', syllabus: '', maxMarks: '' })}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-label-md font-bold hover:brightness-110">
            <span className="material-symbols-outlined text-[18px]">add</span>Add Test
          </button>
        )}
      </div>

      {!batchId ? <Empty icon="quiz" title="Select a batch" sub="Choose a batch to manage its test schedule" />
        : loading ? <Loading /> : tests.length === 0 ? <Empty icon="quiz" title="No tests scheduled" sub="Add a test so the support agent can answer exam questions" />
        : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-outline">
              <th className="px-5 py-3 uppercase">Subject</th><th className="px-5 py-3 uppercase">Date</th><th className="px-5 py-3 uppercase">Syllabus</th><th className="px-5 py-3 uppercase">Max Marks</th><th className="px-5 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-outline-variant">
              {tests.map(t => (
                <tr key={t.id} className="hover:bg-surface-container-low/30 group">
                  <td className="px-5 py-3 font-bold text-on-surface">{t.subject}</td>
                  <td className="px-5 py-3 text-body-md text-on-surface-variant">{fmtDate(t.testDate)}</td>
                  <td className="px-5 py-3 text-body-md text-on-surface-variant max-w-xs truncate">{t.syllabus || '—'}</td>
                  <td className="px-5 py-3 text-body-md text-on-surface-variant">{t.maxMarks ?? '—'}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModal({ ...t, testDate: t.testDate.split('T')[0], maxMarks: t.maxMarks ?? '' })} className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                      <button onClick={() => remove(t.id)} className="text-on-surface-variant hover:text-error"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Edit Test' : 'Add Test'} onClose={() => setModal(null)} onSave={save} saving={saving}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Subject *"><input className={input} value={modal.subject} onChange={e => setModal({ ...modal, subject: e.target.value })} placeholder="Physics" /></Field>
            <Field label="Test Date *"><input type="date" className={input} value={modal.testDate} onChange={e => setModal({ ...modal, testDate: e.target.value })} /></Field>
          </div>
          <Field label="Syllabus"><input className={input} value={modal.syllabus || ''} onChange={e => setModal({ ...modal, syllabus: e.target.value })} placeholder="Mechanics, Thermodynamics" /></Field>
          <Field label="Max Marks"><input type="number" className={input} value={modal.maxMarks} onChange={e => setModal({ ...modal, maxMarks: e.target.value })} placeholder="100" /></Field>
        </Modal>
      )}
    </div>
  );
}

// ─── FAQ tab ────────────────────────────────────────────────────────────────
function FaqTab() {
  const { showSuccess, showError } = useToast();
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await academicsApi.listFaqs(search ? { search } : {}); setFaqs(d.faqs || []); }
    catch { showError('Failed to load FAQs'); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const save = async () => {
    if (!modal.question || !modal.answer) { showError('Question and answer are required'); return; }
    setSaving(true);
    try {
      if (modal.id) await academicsApi.updateFaq(modal.id, modal);
      else await academicsApi.createFaq(modal);
      showSuccess(modal.id ? 'FAQ updated' : 'FAQ added'); setModal(null); load();
    } catch { showError('Failed to save'); }
    finally { setSaving(false); }
  };
  const remove = async (id) => { if (!window.confirm('Delete this FAQ?')) return; try { await academicsApi.deleteFaq(id); showSuccess('Deleted'); load(); } catch { showError('Failed to delete'); } };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search FAQs..." className={input + ' pl-9 w-64'} />
        </div>
        <button onClick={() => setModal({ question: '', answer: '', category: '' })}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-label-md font-bold hover:brightness-110">
          <span className="material-symbols-outlined text-[18px]">add</span>Add FAQ
        </button>
      </div>

      {loading ? <Loading /> : faqs.length === 0 ? <Empty icon="quiz" title="No FAQs yet" sub="Add common Q&A so the agent can answer routine questions" /> : (
        <div className="space-y-3">
          {faqs.map(f => (
            <div key={f.id} className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 group">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-primary text-[18px]">help</span>
                    <p className="font-bold text-on-surface">{f.question}</p>
                    {f.category && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{f.category}</span>}
                  </div>
                  <p className="text-body-md text-on-surface-variant pl-6">{f.answer}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => setModal({ ...f })} className="text-on-surface-variant hover:text-primary"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                  <button onClick={() => remove(f.id)} className="text-on-surface-variant hover:text-error"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal title={modal.id ? 'Edit FAQ' : 'Add FAQ'} onClose={() => setModal(null)} onSave={save} saving={saving}>
          <Field label="Question *"><input className={input} value={modal.question} onChange={e => setModal({ ...modal, question: e.target.value })} placeholder="How do I apply for a scholarship?" /></Field>
          <Field label="Answer *"><textarea rows="3" className={input} value={modal.answer} onChange={e => setModal({ ...modal, answer: e.target.value })} placeholder="Submit the form at the front desk..." /></Field>
          <Field label="Category"><input className={input} value={modal.category || ''} onChange={e => setModal({ ...modal, category: e.target.value })} placeholder="Admissions, Fees, Facilities" /></Field>
        </Modal>
      )}
    </div>
  );
}

// ─── shared bits ────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div><label className="block text-label-md text-on-surface-variant mb-1">{label}</label>{children}</div>
);
const Loading = () => (
  <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
    <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading...</span>
  </div>
);
const Empty = ({ icon, title, sub }) => (
  <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-2">
    <span className="material-symbols-outlined text-5xl">{icon}</span>
    <p className="text-body-lg font-bold">{title}</p>
    <p className="text-body-md">{sub}</p>
  </div>
);

const SUBTABS = [
  { key: 'timetable', icon: 'calendar_month', label: 'Timetable' },
  { key: 'availability', icon: 'person_off', label: 'Teacher Availability' },
  { key: 'tests', icon: 'quiz', label: 'Test Schedule' },
  { key: 'faq', icon: 'help', label: 'FAQ' },
];

export default function AcademicSetup() {
  const { showError } = useToast();
  const [sub, setSub] = useState('timetable');
  const [batches, setBatches] = useState([]);

  useEffect(() => { studentsApi.batches().then(d => setBatches(d.batches || [])).catch(() => showError('Failed to load batches')); }, []);

  return (
    <div className="space-y-6">
      <div className="flex gap-1 p-1 bg-surface-container rounded-lg w-fit">
        {SUBTABS.map(t => (
          <button key={t.key} onClick={() => setSub(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-label-md font-bold transition-all ${sub === t.key ? 'bg-surface-container-lowest shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-[18px]">{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {sub === 'timetable' && <TimetableTab batches={batches} />}
      {sub === 'availability' && <AvailabilityTab />}
      {sub === 'tests' && <TestsTab batches={batches} />}
      {sub === 'faq' && <FaqTab />}
    </div>
  );
}
