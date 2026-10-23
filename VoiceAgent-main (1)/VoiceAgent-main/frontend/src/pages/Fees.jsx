import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/ui/Toast';
import { feesApi } from '../api/fees.api.js';

const fmtRupee = (n) => n >= 100000 ? '₹'+(n/100000).toFixed(1)+'L' : n >= 1000 ? '₹'+(n/1000).toFixed(0)+'k' : '₹'+(n||0);

const PaymentModal = ({ onClose, onSave, feePlanId }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [reference, setReference] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); onSave({ feePlanId, amount: parseFloat(amount), method, reference }); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-background/25 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-2xl border border-outline-variant shadow-2xl animate-in fade-in zoom-in duration-150">
        <div className="p-5 border-b border-outline-variant flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md">Record Payment</h3>
          <button onClick={onClose}><span className="material-symbols-outlined text-on-surface-variant">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">Amount (₹) *</label>
            <input required type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" placeholder="8000" />
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 outline-none">
              {['UPI', 'CASH', 'NEFT', 'CHEQUE', 'CARD'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">Reference / Transaction ID</label>
            <input type="text" value={reference} onChange={e => setReference(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg p-2.5 text-body-md outline-none focus:ring-2 focus:ring-primary" placeholder="UPI Ref / Cheque No." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-outline-variant rounded-lg font-label-md">Cancel</button>
            <button type="submit" className="flex-1 py-2.5 bg-primary text-white rounded-lg font-label-md hover:brightness-110">Save Payment</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Fees = () => {
  const { showSuccess, showError } = useToast();
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showOutstanding, setShowOutstanding] = useState(false);
  const [paymentModal, setPaymentModal] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [listData, statsData] = await Promise.all([
        feesApi.list({ outstanding: showOutstanding, page, limit: 20 }),
        feesApi.getStats(),
      ]);
      setPlans(listData.plans);
      setTotal(listData.total);
      setStats(statsData);
    } catch { showError('Failed to load fees'); }
    finally { setLoading(false); }
  }, [showOutstanding, page]);

  useEffect(() => { load(); }, [load]);

  const handlePayment = async (body) => {
    try {
      await feesApi.recordPayment(body);
      showSuccess('Payment recorded!');
      setPaymentModal(null);
      load();
    } catch (e) { showError(e.message || 'Failed to record payment'); }
  };

  return (
    <div className="p-gutter max-w-container-max-width mx-auto w-full space-y-8 select-none animate-in fade-in duration-200">
      <div className="flex items-center gap-2 text-label-md">
        <span className="text-on-surface-variant">Billing</span>
        <span className="material-symbols-outlined text-sm text-outline">chevron_right</span>
        <span className="text-primary font-bold">Fees & Accounts</span>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-display-lg text-on-surface">Fees & Accounts</h2>
          <p className="text-body-md text-on-surface-variant">Real-time financial health and collection tracking.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-lg font-label-md bg-surface hover:bg-surface-container">
          <span className="material-symbols-outlined text-sm">refresh</span><span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-secondary" />
          <div className="flex justify-between items-start mb-4">
            <p className="text-label-md text-outline uppercase">Collected</p>
            <span className="material-symbols-outlined text-secondary bg-secondary-container/20 p-2 rounded-lg">payments</span>
          </div>
          <p className="font-display-lg text-display-lg">{fmtRupee(stats.total_collected ?? 0)}</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
          <div className="flex justify-between items-start mb-4">
            <p className="text-label-md text-outline uppercase">Outstanding</p>
            <span className="material-symbols-outlined text-primary bg-primary-container/10 p-2 rounded-lg">schedule</span>
          </div>
          <p className="font-display-lg text-display-lg">{fmtRupee(stats.outstanding_total ?? 0)}</p>
          <p className="text-label-sm text-on-surface-variant mt-2">{stats.outstanding_count ?? 0} students with pending fees</p>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 relative overflow-hidden hover:shadow-md transition-shadow">
          <div className="absolute top-0 left-0 w-full h-1 bg-error" />
          <div className="flex justify-between items-start mb-4">
            <p className="text-label-md text-outline uppercase">Overdue Count</p>
            <span className="material-symbols-outlined text-error bg-error-container/20 p-2 rounded-lg">warning</span>
          </div>
          <p className="font-display-lg text-display-lg text-error">{stats.outstanding_count ?? 0}</p>
        </div>
      </div>

      {/* Fee Plans Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden shadow-sm">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low/30 flex items-center justify-between gap-4 flex-wrap">
          <h3 className="font-headline-md text-headline-md">Fee Plans</h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-label-md cursor-pointer">
              <input type="checkbox" checked={showOutstanding} onChange={e => { setShowOutstanding(e.target.checked); setPage(1); }}
                className="w-4 h-4 text-primary rounded border-outline-variant" />
              <span>Show outstanding only</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin">progress_activity</span><span>Loading...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant gap-2">
              <span className="material-symbols-outlined text-5xl">receipt_long</span>
              <p className="text-body-lg font-bold">No fee plans yet</p>
              <p className="text-body-md">Fee plans are created when students are admitted</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead><tr className="bg-surface-container-low border-b border-outline-variant text-label-sm text-outline">
                <th className="px-6 py-3 uppercase">Student</th>
                <th className="px-6 py-3 uppercase">Course / Batch</th>
                <th className="px-6 py-3 uppercase">Total</th>
                <th className="px-6 py-3 uppercase">Paid</th>
                <th className="px-6 py-3 uppercase">Outstanding</th>
                <th className="px-6 py-3 uppercase">Next Due</th>
                <th className="px-6 py-3 text-right uppercase">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-outline-variant">
                {plans.map(plan => (
                  <tr key={plan.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="px-6 py-4 font-bold">{plan.student?.person?.name || '—'}</td>
                    <td className="px-6 py-4 text-on-surface-variant text-body-md">{plan.student?.batch?.course?.name || '—'}</td>
                    <td className="px-6 py-4 font-bold">{fmtRupee(plan.totalAmount)}</td>
                    <td className="px-6 py-4 text-secondary font-bold">{fmtRupee(plan.paidAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${plan.outstandingAmount > 0 ? 'text-error' : 'text-secondary'}`}>{fmtRupee(plan.outstandingAmount)}</span>
                    </td>
                    <td className="px-6 py-4 text-body-md text-on-surface-variant">
                      {plan.nextDueDate ? new Date(plan.nextDueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {plan.outstandingAmount > 0 && (
                        <button onClick={() => setPaymentModal(plan.id)}
                          className="px-3 py-1.5 bg-primary text-white rounded-lg text-label-sm font-bold hover:brightness-110 active:scale-95 transition-all">
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-outline-variant bg-surface-container-low/30 flex items-center justify-between">
          <span className="text-label-md text-outline">{total} fee plans</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1} className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-md disabled:opacity-50">Previous</button>
            <button onClick={() => setPage(p => p+1)} disabled={plans.length < 20} className="px-3 py-1.5 border border-outline-variant rounded-lg text-label-md disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

      {paymentModal && <PaymentModal feePlanId={paymentModal} onClose={() => setPaymentModal(null)} onSave={handlePayment} />}
    </div>
  );
};

export default Fees;
