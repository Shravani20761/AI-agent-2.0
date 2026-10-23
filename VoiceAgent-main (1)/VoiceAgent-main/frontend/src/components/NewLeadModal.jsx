import React, { useState } from 'react';
import { useToast } from './ui/Toast';
import { enquiriesApi } from '../api/enquiries.api.js';

const COURSES = [
  'IIT-JEE Preparation', 'NEET-UG Preparation', 'MHT-CET Preparation',
  '11th & 12th Science (PCMB)', '9th & 10th Foundation',
  'Foundation Course (6th–8th)', 'NDA Preparation',
];

const SOURCE_MAP = { Website: 'WEBSITE', Phone: 'PHONE', WhatsApp: 'WHATSAPP', 'Walk-In': 'WALKIN' };

const NewLeadModal = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', course: '', source: 'Website', notes: '' });
  const [saving, setSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  if (!isOpen) return null;

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;
    setSaving(true);
    try {
      const data = await enquiriesApi.create({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        courseInterested: form.course || undefined,
        notes: form.notes || undefined,
        source: SOURCE_MAP[form.source] || 'WEBSITE',
      });
      showSuccess(`Lead for ${form.name} created!`);
      onSave?.(data.enquiry);
      setForm({ name: '', email: '', phone: '', course: '', source: 'Website', notes: '' });
      onClose();
    } catch (err) {
      showError(err.message || 'Failed to create lead');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-background/25 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl border border-outline-variant overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
          <h3 className="font-headline-md text-headline-md text-on-surface">Create New Lead</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-label-md font-label-md text-on-surface-variant mb-1">Student Name *</label>
              <input required type="text" placeholder="e.g. Arjun Mehta" value={form.name} onChange={e => set('name', e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md focus:ring-2 focus:ring-primary outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md font-label-md text-on-surface-variant mb-1">Phone *</label>
                <input required type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md focus:ring-2 focus:ring-primary outline-none" />
              </div>
              <div>
                <label className="block text-label-md font-label-md text-on-surface-variant mb-1">Email</label>
                <input type="email" placeholder="name@example.com" value={form.email} onChange={e => set('email', e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md focus:ring-2 focus:ring-primary outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label-md font-label-md text-on-surface-variant mb-1">Course of Interest</label>
                <select value={form.course} onChange={e => set('course', e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md focus:ring-2 focus:ring-primary outline-none">
                  <option value="">Select a Course</option>
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-label-md font-label-md text-on-surface-variant mb-1">Lead Source</label>
                <select value={form.source} onChange={e => set('source', e.target.value)}
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md focus:ring-2 focus:ring-primary outline-none">
                  {Object.keys(SOURCE_MAP).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-label-md font-label-md text-on-surface-variant mb-1">Notes</label>
              <textarea placeholder="Inquired about weekend class availability…" rows="3" value={form.notes} onChange={e => set('notes', e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md focus:ring-2 focus:ring-primary outline-none" />
            </div>
          </div>
          <div className="p-6 bg-surface-container-low/50 border-t border-outline-variant flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-outline-variant text-on-surface-variant font-label-md rounded-lg hover:bg-surface-container transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-primary text-white font-label-md rounded-lg hover:brightness-110 shadow-sm active:scale-95 transition-all disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewLeadModal;
