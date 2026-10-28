import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { communicationsApi } from '../api/communications.api.js';

const TYPE_ICON = { CALL: 'call', WHATSAPP: 'chat', SMS: 'sms', NOTE: 'edit_note', EMAIL: 'email' };
const DIR_BADGE = { INBOUND: 'bg-secondary/10 text-secondary border-secondary/20', OUTBOUND: 'bg-primary/10 text-primary border-primary/20' };
const AGENT_LABEL = { ENQUIRY: 'Enquiry Agent', COLD_CALLING: 'Cold Calling', WARM_LEAD: 'Hot Lead Agent', ADMISSION_CONVERSION: 'Admission Agent', STUDENT_SUPPORT: 'Support Agent', FEE_ACCOUNTS: 'Fee Agent', FEE_RECOVERY: 'Fee Recovery', STUDENT_ENGAGEMENT: 'Engagement Agent', REVIEW_REFERRAL: 'Review Agent', MANUAL: 'Manual' };

const CommunicationHub = () => {
  const { showSuccess, showError } = useToast();
  const [comms, setComms] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [noteModal, setNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({ personPhone: '', content: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (typeFilter) params.type = typeFilter;
      const data = await communicationsApi.list(params);
      setComms(data.communications);
      setTotal(data.total);
    } catch { showError('Failed to load communications'); }
    finally { setLoading(false); }
  }, [page, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      await communicationsApi.addNote({ phone: noteForm.personPhone, content: noteForm.content, type: 'NOTE', direction: 'OUTBOUND' });
      showSuccess('Note saved');
      setNoteModal(false);
      setNoteForm({ personPhone: '', content: '' });
      load();
    } catch (err) { showError(err.message || 'Failed to save note'); }
  };

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Communications</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">All Interactions</span>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="font-headline-lg text-display-lg text-on-surface">Communication Hub</h2>
          <p className="text-body-md text-on-surface-variant">Full history of all calls, messages, and notes across every contact.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-label-md bg-surface hover:bg-surface-container">
            <span className="material-symbols-outlined text-sm">refresh</span><span>Refresh</span>
          </button>
          <button onClick={() => setNoteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-label-md hover:brightness-110">
            <span className="material-symbols-outlined text-sm">add</span><span>Add Note</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[['', 'All'], ['CALL', 'Calls'], ['WHATSAPP', 'WhatsApp'], ['NOTE', 'Notes'], ['EMAIL', 'Email']].map(([val, label]) => (
          <button key={val} onClick={() => { setTypeFilter(val); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-md border transition-colors ${typeFilter === val ? 'bg-primary text-white border-primary' : 'bg-surface border-outline-variant hover:bg-surface-container'}`}>
            {val && <span className="material-symbols-outlined text-[16px]">{TYPE_ICON[val]}</span>}
            {label}
          </button>
        ))}
        <span className="ml-auto text-label-md text-outline self-center">{total} records</span>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading...</span>
          </div>
        ) : comms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-2">
            <span className="material-symbols-outlined text-5xl">forum</span>
            <p className="text-body-lg font-bold">No communications yet</p>
            <p className="text-body-md">Call logs, transcripts, and notes appear here automatically</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant">
            {comms.map(c => (
              <div key={c.id} className="p-5 hover:bg-surface-container-low/30 transition-colors flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${c.direction === 'INBOUND' ? 'bg-secondary-container' : 'bg-primary-container'}`}>
                  <span className={`material-symbols-outlined text-[20px] ${c.direction === 'INBOUND' ? 'text-secondary' : 'text-primary'}`}>{TYPE_ICON[c.type] || 'forum'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-on-surface">{c.person?.name || 'Unknown'}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${DIR_BADGE[c.direction] || 'bg-surface-container text-on-surface-variant'}`}>{c.direction}</span>
                    {c.agentType && <span className="px-2 py-0.5 bg-surface-container text-on-surface-variant rounded text-[10px] font-semibold">{AGENT_LABEL[c.agentType] || c.agentType}</span>}
                  </div>
                  <p className="text-body-md text-on-surface line-clamp-2">{c.content || '—'}</p>
                  {c.recordingUrl && (
                    <a href={c.recordingUrl} target="_blank" rel="noreferrer" className="text-primary text-label-sm hover:underline flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[14px]">transcription</span>View Transcript
                    </a>
                  )}
                  <p className="text-[10px] text-outline mt-1">
                    {c.person?.phone} · {new Date(c.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && comms.length > 0 && (
          <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low/30 flex justify-end gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-md disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => p+1)} disabled={comms.length < 30} className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-md disabled:opacity-50">Next</button>
          </div>
        )}
      </div>

      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/25 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl border border-outline-variant shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md">Add Manual Note</h3>
              <button onClick={() => setNoteModal(false)}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
            </div>
            <form onSubmit={handleAddNote} className="p-5 space-y-4">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Contact Phone *</label>
                <input required type="tel" value={noteForm.personPhone} onChange={e => setNoteForm(f=>({...f,personPhone:e.target.value}))}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" placeholder="+91 98765 43210" />
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Note *</label>
                <textarea required rows="4" value={noteForm.content} onChange={e => setNoteForm(f=>({...f,content:e.target.value}))}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Add your observation or note here..." />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setNoteModal(false)} className="flex-1 py-2.5 border border-outline-variant rounded-lg font-label-md">Cancel</button>
                <button type="submit" className="flex-1 py-2.5 bg-primary text-white rounded-lg font-label-md hover:brightness-110">Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationHub;
