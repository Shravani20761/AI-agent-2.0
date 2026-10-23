import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { reviewsApi } from '../api/reviews.api.js';

const TYPE_BADGE = { REVIEW: 'bg-primary/10 text-primary border-primary/20', REFERRAL: 'bg-secondary/10 text-secondary border-secondary/20' };
const STATUS_BADGE = { REQUESTED: 'bg-tertiary/10 text-tertiary border-tertiary/20', RECEIVED: 'bg-secondary/10 text-secondary border-secondary/20' };

const Reviews = () => {
  const { showSuccess, showError } = useToast();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await reviewsApi.list({ limit: 50 });
      setItems(data.reviews);
      setTotal(data.total);
    } catch { showError('Failed to load reviews'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkReceived = async (id) => {
    try { await reviewsApi.markReceived(id); showSuccess('Marked as received'); load(); }
    catch { showError('Failed to update'); }
  };

  const reviews   = items.filter(i => i.type === 'REVIEW');
  const referrals = items.filter(i => i.type === 'REFERRAL');

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Marketing</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">Reviews & Referrals</span>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-display-lg text-on-surface">Reviews & Referrals</h2>
          <p className="text-body-md text-on-surface-variant">Track student reviews and word-of-mouth referrals.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-label-md bg-surface hover:bg-surface-container">
          <span className="material-symbols-outlined text-sm">refresh</span><span>Refresh</span>
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
        {[
          ['Total Records', total, 'on-surface'],
          ['Reviews Requested', reviews.length, 'primary'],
          ['Reviews Received', reviews.filter(r=>r.status==='RECEIVED').length, 'secondary'],
          ['Referrals', referrals.length, 'tertiary'],
        ].map(([label, val, color]) => (
          <div key={label} className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl">
            <p className="text-label-md text-outline uppercase tracking-wider mb-2">{label}</p>
            <h3 className={`font-display-lg text-display-lg text-${color}`}>{val}</h3>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/30">
          <h3 className="font-headline-md text-headline-md">All Records</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
            <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-2">
            <span className="material-symbols-outlined text-5xl">star</span>
            <p className="text-body-lg font-bold">No reviews or referrals yet</p>
            <p className="text-body-md">The Review & Referral Agent creates records here after calling students</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead><tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-outline">
              <th className="px-6 py-3 uppercase">Student</th>
              <th className="px-6 py-3 uppercase">Type</th>
              <th className="px-6 py-3 uppercase">Platform / Details</th>
              <th className="px-6 py-3 uppercase">Status</th>
              <th className="px-6 py-3 uppercase">Date</th>
              <th className="px-6 py-3 uppercase">Action</th>
            </tr></thead>
            <tbody className="divide-y divide-outline-variant">
              {items.map(item => (
                <tr key={item.id} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-6 py-4 font-bold">{item.person?.name || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold border ${TYPE_BADGE[item.type]}`}>{item.type}</span>
                  </td>
                  <td className="px-6 py-4 text-body-md text-on-surface-variant">{item.platform || (item.referredPerson ? `Referred: ${item.referredPerson?.name || 'Unknown'}` : '—')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-label-sm font-bold border ${STATUS_BADGE[item.status]}`}>{item.status}</span>
                  </td>
                  <td className="px-6 py-4 text-body-md text-on-surface-variant">
                    {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4">
                    {item.type === 'REVIEW' && item.status === 'REQUESTED' && (
                      <button onClick={() => handleMarkReceived(item.id)}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-label-sm font-bold hover:brightness-110 active:scale-95 transition-all">
                        Mark Received
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reviews;
