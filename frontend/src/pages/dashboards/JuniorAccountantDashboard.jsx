import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import { toast } from '../../components/requirements/Toast';
import NotificationWidget from '../../components/common/NotificationWidget';

const StatCard = ({ label, value, color, bg, emoji, pulse }) => (
  <div className={`card flex items-center gap-4 p-5 ${pulse ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${bg}`}>{emoji}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className={`mt-0.5 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  </div>
);

// ── Payment Recording Modal ───────────────────────────────────────────────────
const PaymentModal = ({ req, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    paymentDate:   new Date().toISOString().split('T')[0],
    paymentRef:    '',
    paymentMethod: 'Bank Transfer',
    bankName:      '',
    amountPaid:    req?.invoiceAmount || req?.estimatedTotalPrice || '',
    currency:      'AED',
    notes:         '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl bg-blue-50">📝</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{req?.requirementNumber} — {req?.itemName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Date <span className="text-red-500">*</span></label>
              <input type="date" className="input-field w-full" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Reference <span className="text-red-500">*</span></label>
              <input type="text" className="input-field w-full" placeholder="e.g. TT-2024-001" value={form.paymentRef} onChange={e => set('paymentRef', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
              <select className="input-field w-full" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                {['Bank Transfer','Cheque','Online Payment','Cash','Other'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name</label>
              <input type="text" className="input-field w-full" placeholder="e.g. Emirates NBD" value={form.bankName} onChange={e => set('bankName', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount Paid</label>
              <input type="number" className="input-field w-full" min="0" value={form.amountPaid} onChange={e => set('amountPaid', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
              <select className="input-field w-full" value={form.currency} onChange={e => set('currency', e.target.value)}>
                {['AED','USD','EUR','GBP','SAR'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea rows={2} className="input-field w-full resize-none text-sm" placeholder="Any additional payment notes..." value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-400">Req #: </span><span className="font-semibold">{req?.requirementNumber}</span></div>
            <div><span className="text-slate-400">Invoice: </span><span className="font-semibold">AED {(req?.invoiceAmount || req?.estimatedTotalPrice || 0).toLocaleString()}</span></div>
            <div><span className="text-slate-400">Vendor: </span><span className="font-semibold">{req?.poDetails?.toName || '—'}</span></div>
            <div><span className="text-slate-400">Inv #: </span><span className="font-semibold">{req?.invoiceNumber || '—'}</span></div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => form.paymentRef.trim() ? onSave(form) : toast.error('Payment reference is required')}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            ✅ Mark as Paid
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const JuniorAccountantDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const loadStats = useCallback(async () => {
    try { const { data } = await approvalService.getStats(); setStats(data); }
    catch { } finally { setLoadingStats(false); }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try { const { data } = await approvalService.getQueue({ limit: 20 }); setQueue(data.requirements || []); }
    catch { } finally { setLoadingQueue(false); }
  }, []);

  useEffect(() => { loadStats(); loadQueue(); }, [loadStats, loadQueue]);

  const openModal = async (r) => {
    try {
      const { data } = await approvalService.getOne(r._id);
      setSelectedReq(data.requirement);
    } catch { toast.error('Failed to load details'); }
  };

  const handleSaveAndPay = async (form) => {
    setModalLoading(true);
    try {
      // 1. Save payment record
      await approvalService.savePaymentRecord(selectedReq._id, form);
      // 2. Approve (marks as Paid)
      await approvalService.approve(selectedReq._id, `Payment recorded. Ref: ${form.paymentRef}. Method: ${form.paymentMethod}.`);
      toast.success('✅ Payment recorded! Procurement cycle complete.');
      setSelectedReq(null);
      loadStats(); loadQueue();
    } catch (err) { toast.error(err.message || 'Failed to record payment'); }
    finally { setModalLoading(false); }
  };

  const pending = stats?.stats?.['Payment Processing'] ?? 0;
  const paid    = stats?.stats?.['Paid'] ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-blue-200">
                {now.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                {' · '}{now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">Welcome, {user?.firstName}! 📝</h1>
              <p className="mt-1 text-sm text-blue-200">{user?.role} · Payment Processing</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              {[
                { label:'Pending',  val: loadingStats ? '…' : pending, color:'text-amber-300' },
                { label:'Paid',     val: loadingStats ? '…' : paid,    color:'text-emerald-300' },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-white/10 px-4 py-2">
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-blue-200">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-600">
          <span><span className="font-semibold text-slate-400">ID: </span>{user?.employeeId}</span>
          <span><span className="font-semibold text-slate-400">Email: </span>{user?.email}</span>
        </div>
      </div>

      {/* Role info */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-start gap-3">
        <span className="text-2xl">📝</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">Junior Accountant — Payment Processing</p>
          <p className="text-xs text-blue-700 mt-0.5">
            After the Finance Manager confirms payment, you record the actual payment details:
            payment reference number, bank name, payment method, and date.
            Once submitted, the procurement cycle is marked as <strong>Paid</strong> and fully closed.
          </p>
        </div>
      </div>

      {/* Pending alert */}
      {!loadingStats && pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-300 bg-blue-50 px-5 py-3">
          <span className="text-2xl animate-bounce">📝</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-800">{pending} payment{pending > 1 ? 's' : ''} waiting for payment details</p>
            <p className="text-xs text-blue-700">Finance Manager has confirmed. Please record payment reference and bank details.</p>
          </div>
          <button onClick={() => navigate('/review/queue')} className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700">Process Now →</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard emoji="📝" label="Pending"  value={pending} color="text-amber-600"   bg="bg-amber-50"   pulse={pending > 0} />
        <StatCard emoji="✅" label="Paid"     value={paid}    color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard emoji="❌" label="Rejected" value={stats?.stats?.rejected ?? 0} color="text-red-600" bg="bg-red-50" />
        <StatCard emoji="📊" label="Total"    value={(stats?.stats?.total ?? 0)} color="text-blue-600" bg="bg-blue-50" />
      </div>

      {/* Payment Processing Queue */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Payment Processing Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">Finance Manager confirmed — record payment details below</p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{queue.length} pending</span>
        </div>
        {loadingQueue ? (
          <div className="space-y-3 p-6">{[1,2,3].map(i=><div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100"/>)}</div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-5xl mb-4">📝</p>
            <h4 className="text-base font-semibold text-slate-700">No payments to process</h4>
            <p className="text-sm text-slate-500 mt-1">All payments have been recorded.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {['Req. #','Employee','Item','Invoice Amt','Invoice #','Status','Date','Action'].map(h=>(
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map(r=>(
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{r.requirementNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{r.employeeName}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-slate-700">{r.itemName}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-700">AED {(r.invoiceAmount || r.estimatedTotalPrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{r.invoiceNumber || '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status}/></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button onClick={() => openModal(r)}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                        📝 Record Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedReq && (
        <PaymentModal
          req={selectedReq}
          onClose={() => setSelectedReq(null)}
          onSave={handleSaveAndPay}
          loading={modalLoading}
        />
      )}

      <NotificationWidget />
    </div>
  );
};

export default JuniorAccountantDashboard;
