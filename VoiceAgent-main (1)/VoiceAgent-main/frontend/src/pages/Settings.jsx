import React, { useState, useEffect } from 'react';
import { useToast } from '../components/ui/Toast';
import { settingsApi } from '../api/settings.api.js';

const Settings = () => {
  const { showSuccess, showError } = useToast();
  const [settings, setSettings] = useState({
    instituteName: 'Seagull Science Academy',
    outboundEnabled: true,
    maxConcurrentCalls: 1,
    callRetries: 3,
    callRetryDelayHours: 2,
    workingHoursStart: '09:00',
    workingHoursEnd: '20:00',
    dograhBaseUrl: 'https://api.qdeploy.online',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearModal, setClearModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    settingsApi.get()
      .then(d => setSettings(prev => ({ ...prev, ...d.settings })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsApi.update(settings);
      showSuccess('Settings saved successfully!');
    } catch { showError('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const set = (k, v) => setSettings(prev => ({ ...prev, [k]: v }));

  const handleClearDb = async () => {
    setClearing(true);
    try {
      const res = await settingsApi.clearDb();
      showSuccess(res?.message || 'Database cleared');
      setClearModal(false);
      setConfirmText('');
    } catch (e) {
      showError(e.message || 'Failed to clear database');
    } finally {
      setClearing(false);
    }
  };

  if (loading) return (
    <div className="p-gutter flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-on-surface-variant">progress_activity</span>
    </div>
  );

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Settings</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">Preferences</span>
      </div>

      <div>
        <h2 className="font-headline-lg text-display-lg text-on-surface">CRM Settings</h2>
        <p className="text-body-md text-on-surface-variant">Configure your AI agent parameters and outreach schedule.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">

        {/* Institute */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-4">
          <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">business</span><span>Institute Info</span>
          </h3>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">Institute Name</label>
            <input value={settings.instituteName || ''} onChange={e => set('instituteName', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        {/* Dialer */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-4">
          <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">phone_forwarded</span><span>Dialer Configuration</span>
          </h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-label-md text-on-surface">Outbound Calls Enabled</p>
              <p className="text-body-sm text-on-surface-variant">Allow AI agents to make outbound calls</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={!!settings.outboundEnabled} onChange={e => set('outboundEnabled', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-outline-variant rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Max Retry Attempts</label>
              <input type="number" min="1" max="5" value={settings.callRetries || 3} onChange={e => set('callRetries', parseInt(e.target.value))}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Retry Delay (hours)</label>
              <input type="number" min="1" max="24" value={settings.callRetryDelayHours || 2} onChange={e => set('callRetryDelayHours', parseInt(e.target.value))}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Calling Hours — Start</label>
              <input type="time" value={settings.workingHoursStart || '09:00'} onChange={e => set('workingHoursStart', e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-1">Calling Hours — End</label>
              <input type="time" value={settings.workingHoursEnd || '20:00'} onChange={e => set('workingHoursEnd', e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        </div>

        {/* Dograh */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 space-y-4">
          <h3 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">mic</span><span>Dograh Voice Agent</span>
          </h3>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">Dograh Base URL</label>
            <input value={settings.dograhBaseUrl || ''} onChange={e => set('dograhBaseUrl', e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md font-mono outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div className="bg-surface-container-low rounded-lg p-4">
            <p className="text-label-md text-on-surface-variant">API Key and workflow UUIDs are configured via environment variables on the backend server for security.</p>
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="px-6 py-3 bg-primary text-white rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-sm">
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* Danger Zone */}
      <div className="max-w-2xl border border-error/30 bg-error/5 rounded-xl p-6 space-y-4">
        <h3 className="font-headline-md text-headline-md text-error flex items-center gap-2">
          <span className="material-symbols-outlined">warning</span><span>Danger Zone</span>
        </h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-label-md text-on-surface">Clear Database</p>
            <p className="text-body-sm text-on-surface-variant">
              Permanently deletes all leads, contacts, calls, enquiries, admissions, and fees.
              Your login and course catalog are preserved. This cannot be undone.
            </p>
          </div>
          <button onClick={() => setClearModal(true)}
            className="shrink-0 px-4 py-2.5 bg-error text-white rounded-lg font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm">
            Clear DB
          </button>
        </div>
      </div>

      {/* Clear DB confirmation modal */}
      {clearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/25 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl border border-outline-variant shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md text-error flex items-center gap-2">
                <span className="material-symbols-outlined">delete_forever</span><span>Clear Database</span>
              </h3>
              <button onClick={() => { setClearModal(false); setConfirmText(''); }}>
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-body-md text-on-surface-variant">
                This will permanently delete <span className="font-bold text-on-surface">all operational data</span> —
                people, enquiries, cold calls, warm leads, appointments, admissions, students, and fees.
                Users and courses are kept. <span className="font-bold text-error">This action cannot be undone.</span>
              </p>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-1">Type <span className="font-mono font-bold text-on-surface">CLEAR</span> to confirm</label>
                <input
                  value={confirmText} onChange={e => setConfirmText(e.target.value)}
                  placeholder="CLEAR"
                  className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md font-mono outline-none focus:ring-2 focus:ring-error"
                />
              </div>
            </div>
            <div className="p-5 border-t border-outline-variant flex gap-3">
              <button onClick={() => { setClearModal(false); setConfirmText(''); }}
                className="flex-1 py-2.5 border border-outline-variant rounded-lg font-label-md hover:bg-surface-container">
                Cancel
              </button>
              <button
                onClick={handleClearDb}
                disabled={confirmText !== 'CLEAR' || clearing}
                className="flex-1 py-2.5 bg-error text-white rounded-lg font-label-md font-bold hover:brightness-110 disabled:opacity-50 active:scale-95 transition-all">
                {clearing ? 'Clearing…' : 'Permanently Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
