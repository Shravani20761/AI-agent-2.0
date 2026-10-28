import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/ui/Toast';
import { studentsApi } from '../api/students.api.js';
import AcademicSetup from './AcademicSetup.jsx';

const STATUS_BADGE = { active: 'bg-secondary/10 text-secondary border-secondary/20', inactive: 'bg-error/10 text-error border-error/20', alumni: 'bg-surface-container text-on-surface-variant border-outline-variant' };

// ─── Bulk paste/CSV parser ──────────────────────────────────────────────────
// Columns: name, phone, batch, rollNumber, [totalFee], [dueDate]
function parseStudentText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  const rows = [];
  const errors = [];
  lines.forEach((line, i) => {
    const sep = line.includes('\t') ? '\t' : ',';
    const parts = line.split(sep).map(p => p.trim().replace(/^"|"$/g, ''));
    const [name = '', rawPhone = '', batch = '', rollNumber = '', totalFee = '', dueDate = ''] = parts;
    // skip header row
    if (i === 0 && /name/i.test(name) && /phone/i.test(rawPhone)) return;
    const phone = rawPhone.replace(/[\s\-().]/g, '');
    if (!phone || phone.length < 7) { errors.push(`Row ${i + 1}: invalid phone "${rawPhone}"`); return; }
    rows.push({ name, phone, batch, rollNumber, totalFee: totalFee || undefined, dueDate: dueDate || undefined });
  });
  return { rows, errors };
}

// ─── Add Student modal ──────────────────────────────────────────────────────
function AddStudentModal({ batches, onClose, onSaved }) {
  const { showError, showSuccess } = useToast();
  const [f, setF] = useState({ name: '', phone: '', email: '', batchId: '', rollNumber: '', totalFee: '', dueDate: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!f.phone.trim()) { setError('Phone is required'); return; }
    setSaving(true);
    try {
      const body = { ...f, totalFee: f.totalFee ? Number(f.totalFee) : undefined };
      const res = await studentsApi.create(body);
      showSuccess(`Student ${res.action === 'created' ? 'added' : 'updated'}: ${res.student?.person?.name}`);
      onSaved();
      onClose();
    } catch (e) { setError(e.message || 'Failed to save'); showError('Failed to save student'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/25 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl border border-outline-variant shadow-2xl flex flex-col animate-in fade-in zoom-in duration-150">
        <div className="p-5 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md">Add Student</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Name</label>
              <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" placeholder="Rahul Sharma" />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Phone *</label>
              <input value={f.phone} onChange={e => { setF({ ...f, phone: e.target.value }); setError(''); }}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary font-mono" placeholder="9876543210" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Batch</label>
              <select value={f.batchId} onChange={e => setF({ ...f, batchId: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary">
                <option value="">— Unassigned —</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.name} {b.course?.name ? `· ${b.course.name}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Roll Number</label>
              <input value={f.rollNumber} onChange={e => setF({ ...f, rollNumber: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary font-mono" placeholder="R001" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Total Fee (optional)</label>
              <input type="number" value={f.totalFee} onChange={e => setF({ ...f, totalFee: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" placeholder="45000" />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Fee Due Date (optional)</label>
              <input type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          {error && <p className="text-error text-label-md">{error}</p>}
        </div>
        <div className="p-5 border-t border-outline-variant flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-outline-variant rounded-lg text-label-md">Cancel</button>
          <button onClick={save} disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Student'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Upload modal ──────────────────────────────────────────────────────
function BulkUploadModal({ batches, onClose, onSaved }) {
  const { showError, showSuccess } = useToast();
  const fileRef = useRef();
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const parse = (raw) => { const r = parseStudentText(raw); setParsed(r); };
  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setText(ev.target.result); parse(ev.target.result); };
    reader.readAsText(file);
  };

  const upload = async () => {
    if (!parsed?.rows?.length) return;
    setSaving(true);
    try {
      const res = await studentsApi.bulkImport(parsed.rows);
      setResult(res);
      showSuccess(`${res.created} created, ${res.updated} updated`);
      onSaved();
    } catch (e) { showError('Bulk upload failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/25 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest w-full max-w-2xl max-h-[90vh] rounded-2xl border border-outline-variant shadow-2xl flex flex-col animate-in fade-in zoom-in duration-150">
        <div className="p-5 border-b border-outline-variant flex justify-between items-center shrink-0">
          <h3 className="font-headline-md text-headline-md">Bulk Upload Students</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-surface-container rounded-lg p-4 space-y-2 text-label-md">
            <p className="font-bold text-on-surface">Column order (paste from Excel or CSV):</p>
            <p className="font-mono text-on-surface-variant">name, phone, batch, rollNumber, [totalFee], [dueDate]</p>
            <p className="font-mono text-on-surface-variant">Rahul Sharma, 9209568974, JEE-2026-A, R001, 45000, 2026-07-10</p>
            <p className="text-on-surface-variant">Batch can be the batch <span className="font-bold">name</span> or id. Existing numbers are reused (no duplicates).</p>
            <a href="data:text/csv;charset=utf-8,name,phone,batch,rollNumber,totalFee,dueDate%0ARahul Sharma,9209568974,JEE-2026-A,R001,45000,2026-07-10"
              download="students_template.csv"
              className="inline-flex items-center gap-1.5 text-primary hover:underline font-bold">
              <span className="material-symbols-outlined text-[16px]">download</span>Download Template CSV
            </a>
            {batches.length > 0 && (
              <p className="text-on-surface-variant">Available batches: {batches.map(b => b.name).join(', ')}</p>
            )}
          </div>
          <textarea rows="7" value={text}
            onChange={e => { setText(e.target.value); setParsed(null); setResult(null); }}
            placeholder={"Rahul Sharma, 9209568974, JEE-2026-A, R001, 45000, 2026-07-10\nPriya Patil, 9123456789, NEET-2026-B, R002"}
            className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-body-md font-mono outline-none focus:ring-2 focus:ring-primary resize-none" />
          <div className="flex gap-2">
            <button onClick={() => parse(text)} disabled={!text.trim()}
              className="flex-1 py-2.5 bg-surface-container border border-outline-variant rounded-lg font-label-md font-bold disabled:opacity-50">Parse</button>
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 py-2.5 bg-surface-container border border-outline-variant rounded-lg font-label-md font-bold flex items-center justify-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">upload_file</span>Choose CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFile} />
          </div>

          {parsed && (
            <div className="space-y-2">
              <p className="text-secondary font-bold text-label-md">✓ {parsed.rows.length} row{parsed.rows.length !== 1 ? 's' : ''} parsed</p>
              {parsed.errors.map((e, i) => <p key={i} className="text-error text-label-sm">{e}</p>)}
              {parsed.rows.length > 0 && (
                <div className="border border-outline-variant rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-label-md">
                    <thead><tr className="bg-surface-container-low border-b border-outline-variant">
                      <th className="px-3 py-2 text-on-surface-variant">Name</th>
                      <th className="px-3 py-2 text-on-surface-variant">Phone</th>
                      <th className="px-3 py-2 text-on-surface-variant">Batch</th>
                      <th className="px-3 py-2 text-on-surface-variant">Roll</th>
                      <th className="px-3 py-2 text-on-surface-variant">Fee</th>
                    </tr></thead>
                    <tbody className="divide-y divide-outline-variant">
                      {parsed.rows.map((r, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5 text-on-surface">{r.name || '—'}</td>
                          <td className="px-3 py-1.5 font-mono text-on-surface">{r.phone}</td>
                          <td className="px-3 py-1.5 text-on-surface-variant">{r.batch || '—'}</td>
                          <td className="px-3 py-1.5 font-mono text-on-surface-variant">{r.rollNumber || '—'}</td>
                          <td className="px-3 py-1.5 text-on-surface-variant">{r.totalFee || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-3 text-label-md space-y-1">
              <p className="font-bold text-secondary">Import complete</p>
              <p className="text-on-surface-variant">{result.created} created · {result.updated} updated · {result.skipped?.length || 0} skipped</p>
              {result.skipped?.map((s, i) => <p key={i} className="text-error text-label-sm">Row {s.row} ({s.phone}): {s.reason}</p>)}
            </div>
          )}
        </div>
        <div className="p-5 border-t border-outline-variant flex gap-2 justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 border border-outline-variant rounded-lg text-label-md">Close</button>
          <button onClick={upload} disabled={saving || !parsed?.rows?.length}
            className="px-4 py-2 bg-primary text-white rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-50">
            {saving ? 'Uploading…' : `Upload ${parsed?.rows?.length || ''} Students`}
          </button>
        </div>
      </div>
    </div>
  );
}

const Academics = () => {
  const { showError, showSuccess } = useToast();
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [view, setView] = useState('students'); // 'students' | 'setup'

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const data = await studentsApi.list(params);
      setStudents(data.students);
      setTotal(data.total);
      setPages(data.pages);
    } catch { showError('Failed to load students'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { studentsApi.batches().then(d => setBatches(d.batches || [])).catch(() => {}); }, []);

  const reassign = async (studentId, batchId) => {
    try {
      await studentsApi.assignBatch(studentId, batchId);
      showSuccess('Batch updated');
      load();
    } catch { showError('Failed to reassign batch'); }
  };

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Academics</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">{view === 'students' ? 'Students' : 'Academic Setup'}</span>
      </div>

      {/* Top-level view toggle */}
      <div className="flex gap-1 p-1 bg-surface-container rounded-lg w-fit">
        {[['students', 'school', 'Students'], ['setup', 'tune', 'Academic Setup']].map(([key, icon, label]) => (
          <button key={key} onClick={() => setView(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-label-md font-bold transition-all ${view === key ? 'bg-surface-container-lowest shadow text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}>
            <span className="material-symbols-outlined text-[18px]">{icon}</span>{label}
          </button>
        ))}
      </div>

      {view === 'setup' && <AcademicSetup />}

      {view === 'students' && <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-display-lg text-on-surface">Student Directory</h2>
          <p className="text-body-md text-on-surface-variant">{total} enrolled students across all batches.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 pr-4 py-2 bg-surface border border-outline-variant rounded-lg text-body-md outline-none focus:ring-2 focus:ring-primary w-56"
              placeholder="Search by name or phone..." />
          </div>
          <button onClick={() => setShowBulk(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-outline-variant rounded-lg text-label-md font-bold hover:bg-surface-container">
            <span className="material-symbols-outlined text-[18px]">upload_file</span>Bulk Upload
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-label-md font-bold hover:brightness-110">
            <span className="material-symbols-outlined text-[18px]">person_add</span>Add Student
          </button>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading students...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-2">
              <span className="material-symbols-outlined text-5xl">school</span>
              <p className="text-body-lg font-bold">No students yet</p>
              <p className="text-body-md">Add a student or bulk-upload your roster to get started</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-outline">
                <th className="px-6 py-3 uppercase">Student</th>
                <th className="px-6 py-3 uppercase">Roll No.</th>
                <th className="px-6 py-3 uppercase">Batch</th>
                <th className="px-6 py-3 uppercase">Course</th>
                <th className="px-6 py-3 uppercase">Status</th>
                <th className="px-6 py-3 uppercase">Enrolled</th>
                <th className="px-6 py-3 uppercase">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-outline-variant">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-surface-container-low/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-label-md">
                          {(s.person?.name || '?').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-on-surface">{s.person?.name}</div>
                          <div className="text-[10px] text-outline font-mono">{s.person?.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-body-md text-on-surface-variant">{s.rollNumber || '—'}</td>
                    <td className="px-6 py-4">
                      <select value={s.batchId || ''} onChange={e => reassign(s.id, e.target.value)}
                        className="bg-surface border border-outline-variant rounded-lg px-2 py-1 text-body-md outline-none focus:ring-2 focus:ring-primary max-w-[160px]">
                        <option value="" disabled>— Assign batch —</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">{s.batch?.course?.name || '—'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold border ${STATUS_BADGE[s.status] || STATUS_BADGE.inactive}`}>{s.status}</span>
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">
                      {s.enrollmentDate ? new Date(s.enrollmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelected(s)}
                        className="flex items-center gap-1 text-primary font-label-md hover:underline text-label-md">
                        <span className="material-symbols-outlined text-[16px]">info</span>View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low/30 flex items-center justify-between">
          <span className="text-label-md text-outline">Page {page} of {pages} · {total} students</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-md disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page >= pages} className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-md disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {showAdd && <AddStudentModal batches={batches} onClose={() => setShowAdd(false)} onSaved={load} />}
      {showBulk && <BulkUploadModal batches={batches} onClose={() => setShowBulk(false)} onSaved={load} />}

      {/* Student detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-on-background/25 backdrop-blur-sm">
          <div className="fixed inset-0" onClick={() => setSelected(null)} />
          <div className="relative h-screen w-96 bg-surface-container-lowest border-l border-outline-variant shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
              <h3 className="font-headline-md text-headline-md">Student Profile</h3>
              <button onClick={() => setSelected(null)}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-headline-md">
                  {(selected.person?.name || '?').substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-headline-md text-headline-md">{selected.person?.name}</h4>
                  <p className="text-body-md text-on-surface-variant">{selected.person?.phone}</p>
                  <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold border ${STATUS_BADGE[selected.status] || STATUS_BADGE.inactive}`}>{selected.status}</span>
                </div>
              </div>
              {[
                ['Roll Number', selected.rollNumber || '—'],
                ['Batch', selected.batch?.name || '—'],
                ['Course', selected.batch?.course?.name || '—'],
                ['Batch Timings', selected.batch?.timings || '—'],
                ['Faculty', selected.batch?.facultyName || '—'],
                ['Enrollment Date', selected.enrollmentDate ? new Date(selected.enrollmentDate).toLocaleDateString('en-IN') : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-start py-3 border-b border-outline-variant">
                  <span className="text-label-md text-on-surface-variant">{label}</span>
                  <span className="text-body-md font-bold text-on-surface text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </>}
    </div>
  );
};

export default Academics;
