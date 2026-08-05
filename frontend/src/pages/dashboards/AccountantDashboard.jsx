import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useAuth from '../../hooks/useAuth';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import { toast } from '../../components/requirements/Toast';
import NotificationWidget from '../../components/common/NotificationWidget';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const today = () => new Date().toISOString().split('T')[0];

const StatCard = ({ label, value, color, bg, emoji, pulse, sub }) => (
  <div className={`card flex items-center gap-4 p-5 ${pulse ? 'ring-2 ring-fuchsia-400 ring-offset-1' : ''}`}>
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${bg}`}>{emoji}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className={`mt-0.5 text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Payment Entry Modal (SA enters payment details at Step 5) ─────────────────
const PaymentEntryModal = ({ req, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    paymentDate: today(), paymentRef: '', paymentMethod: 'Bank Transfer',
    bankName: '', amountPaid: req?.invoiceAmount || req?.estimatedTotalPrice || '', currency: 'AED', notes: '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.paymentRef.trim()) { toast.error('Payment reference is required'); return; }
    await approvalService.savePaymentRecord(req._id, form);
    onSave(`Payment made. Ref: ${form.paymentRef}. Method: ${form.paymentMethod}. Bank: ${form.bankName}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-50 text-xl">💳</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">Enter Payment Details</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{req?.requirementNumber} — {req?.itemName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Payment Date</label>
              <input type="date" className="input-field w-full" value={form.paymentDate} onChange={e => set('paymentDate', e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Reference # <span className="text-red-500">*</span></label>
              <input type="text" className="input-field w-full" placeholder="e.g. TT-2024-001" value={form.paymentRef} onChange={e => set('paymentRef', e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Method</label>
              <select className="input-field w-full" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                {['Bank Transfer','Cheque','Online Payment','Cash','Other'].map(m => <option key={m}>{m}</option>)}
              </select></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name</label>
              <input type="text" className="input-field w-full" placeholder="e.g. Emirates NBD" value={form.bankName} onChange={e => set('bankName', e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Amount Paid</label>
              <input type="number" className="input-field w-full" min="0" value={form.amountPaid} onChange={e => set('amountPaid', e.target.value)} /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1">Currency</label>
              <select className="input-field w-full" value={form.currency} onChange={e => set('currency', e.target.value)}>
                {['AED','USD','EUR','GBP','SAR'].map(c => <option key={c}>{c}</option>)}
              </select></div>
          </div>
          <div><label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea rows={2} className="input-field w-full resize-none text-sm" value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-400">Invoice: </span><span className="font-semibold">AED {(req?.invoiceAmount || req?.estimatedTotalPrice || 0).toLocaleString()}</span></div>
            <div><span className="text-slate-400">Vendor: </span><span className="font-semibold">{req?.poDetails?.toName || '—'}</span></div>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            💳 Payment Made — Send for Filing
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const AccountantDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [modal, setModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

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
    try { const { data } = await approvalService.getOne(r._id); setModal(data.requirement); }
    catch { toast.error('Failed to load details'); }
  };

  const handleApprove = async (note) => {
    if (!modal) return;
    setActionLoading(true);
    try {
      await approvalService.approve(modal._id, note || `Approved by SA at ${modal.status}`);
      const msgs = {
        'Payment Verification': '✅ 3-way match verified. Sent to Junior Accountant for journal entry.',
        'Journal Review':       '✅ Journal entry verified. Sent to Finance Manager.',
        'Payment Entry':        '💳 Payment made. Sent to Junior Accountant for filing.',
      };
      toast.success(msgs[modal.status] || '✅ Done.');
      setModal(null); loadStats(); loadQueue();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async (payload) => {
    if (!modal) return;
    setActionLoading(true);
    try {
      await approvalService.threeWayReject(modal._id, payload);
      toast.error('❌ Returned for correction.');
      setModal(null); loadStats(); loadQueue();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const monthlyData = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push({ month: MONTH_NAMES[d.getMonth()], count: 0 }); }
    stats?.monthly?.forEach(({ _id, count }) => { const idx = months.findIndex((_, i) => { const d = new Date(); d.setMonth(d.getMonth()-(5-i)); return MONTH_NAMES[_id.month-1] === MONTH_NAMES[d.getMonth()]; }); if (idx >= 0) months[idx].count = count; });
    return months;
  })();

  const verifyPending  = stats?.stats?.['Payment Verification'] ?? 0;
  const journalReview  = stats?.stats?.['Journal Review']       ?? 0;
  const paymentEntry   = stats?.stats?.['Payment Entry']        ?? 0;
  const paid           = stats?.stats?.['Paid']                 ?? 0;
  const totalPending   = verifyPending + journalReview + paymentEntry;
  const totalPendingValue = queue.reduce((s, r) => s + (r.estimatedTotalPrice || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-fuchsia-900 to-fuchsia-700 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-fuchsia-200">{now.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})} · {now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</p>
              <h1 className="mt-1 text-2xl font-bold text-white">Welcome, {user?.firstName}! 🔍</h1>
              <p className="mt-1 text-sm text-fuchsia-200">{user?.role} · Step 1, 3 &amp; 5 of Payment Workflow</p>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label:'3-Way',    val: loadingStats ? '…' : verifyPending,  color:'text-fuchsia-300' },
                { label:'Jnl Rev',  val: loadingStats ? '…' : journalReview,  color:'text-indigo-300'  },
                { label:'Pay.Entry',val: loadingStats ? '…' : paymentEntry,   color:'text-amber-300'   },
                { label:'Paid',     val: loadingStats ? '…' : paid,           color:'text-emerald-300' },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-white/10 px-2 py-2">
                  <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-fuchsia-200">{s.label}</p>
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

      {/* Workflow info */}
      <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-5 py-4">
        <p className="text-sm font-semibold text-fuchsia-800">Senior Accountant — Steps 1, 3 &amp; 5</p>
        <p className="text-xs text-fuchsia-700 mt-1">
          <strong>Step 1:</strong> 3-way match (PO+GRN+Invoice) → JA journal entry.&nbsp;
          <strong>Step 3:</strong> Verify JA journal entry → Finance Manager.&nbsp;
          <strong>Step 5:</strong> FM approves → Enter payment details &amp; make payment → JA filing.
        </p>
      </div>

      {/* Alert */}
      {!loadingStats && totalPending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-fuchsia-300 bg-fuchsia-50 px-5 py-3">
          <span className="text-2xl animate-bounce">🔔</span>
          <p className="text-sm font-semibold text-fuchsia-800 flex-1">{totalPending} item{totalPending > 1 ? 's' : ''} require your action · AED {totalPendingValue.toLocaleString()}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard emoji="🔍" label="3-Way Verify"   value={verifyPending} color="text-fuchsia-600" bg="bg-fuchsia-50" pulse={verifyPending>0} sub={`AED ${totalPendingValue.toLocaleString()}`} />
        <StatCard emoji="📝" label="Journal Review" value={journalReview}  color="text-indigo-600"  bg="bg-indigo-50"  pulse={journalReview>0} />
        <StatCard emoji="💳" label="Payment Entry"  value={paymentEntry}   color="text-amber-600"   bg="bg-amber-50"   pulse={paymentEntry>0} />
        <StatCard emoji="✅" label="Paid"           value={paid}           color="text-emerald-600" bg="bg-emerald-50" />
      </div>

      {/* Chart */}
      <div className="card p-5">
        <h3 className="mb-4 text-sm font-semibold text-slate-700">Payments — Last 6 Months</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="month" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
            <Tooltip contentStyle={{borderRadius:'8px',border:'none',fontSize:12}}/>
            <Bar dataKey="count" name="Payments" fill="#a21caf" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Queue */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">My Action Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">3-way match · Journal review · Payment entry</p>
          </div>
          <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">{queue.length} pending</span>
        </div>
        {loadingQueue ? (
          <div className="space-y-3 p-6">{[1,2,3].map(i=><div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100"/>)}</div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-5xl mb-4">🔍</p>
            <h4 className="text-base font-semibold text-slate-700">All clear!</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {['Req. #','Item','Invoice Amt','Status','Action'].map(h=>(
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map(r=>(
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{r.requirementNumber}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-slate-700">{r.itemName}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-fuchsia-700">AED {(r.invoiceAmount||r.estimatedTotalPrice||0).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status}/></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.status === 'Payment Verification' && (
                        <button onClick={() => openModal(r)} className="rounded-md bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-700">🔍 3-Way Match</button>
                      )}
                      {r.status === 'Journal Review' && (
                        <button onClick={() => openModal(r)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">📝 Verify Journal</button>
                      )}
                      {r.status === 'Payment Entry' && (
                        <button onClick={() => openModal(r)} className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">💳 Enter Payment</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3-Way Match Modal */}
      {modal && modal.status === 'Payment Verification' && (
        <ThreeWayMatchModal req={modal} onClose={() => setModal(null)} onApprove={handleApprove} onReject={handleReject} loading={actionLoading} />
      )}

      {/* Journal Review Modal */}
      {modal && modal.status === 'Journal Review' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setModal(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-indigo-50 text-xl">📝</div>
              <div className="flex-1"><h3 className="text-base font-bold text-slate-900">Verify Journal Entry</h3><p className="text-xs text-slate-500 mt-0.5">{modal.requirementNumber}</p></div>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-5">
              {modal.journalEntry?.entryNumber ? (
                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Entry #</span><span className="font-bold">{modal.journalEntry.entryNumber}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Debit</span><span className="font-semibold">{modal.journalEntry.debitAccount||'—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Credit</span><span className="font-semibold">{modal.journalEntry.creditAccount||'—'}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Amount</span><span className="font-bold text-indigo-700">AED {(modal.journalEntry.amount||0).toLocaleString()}</span></div>
                  {modal.journalEntry.narration && <p className="text-xs text-slate-600">{modal.journalEntry.narration}</p>}
                </div>
              ) : <p className="text-sm text-slate-400 italic">No journal entry data found.</p>}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setModal(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={() => handleApprove('')} disabled={actionLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                {actionLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>}
                ✅ Verified — Forward to Finance Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Entry Modal */}
      {modal && modal.status === 'Payment Entry' && (
        <PaymentEntryModal req={modal} onClose={() => setModal(null)} onSave={handleApprove} loading={actionLoading} />
      )}

      <NotificationWidget />
    </div>
  );
};

export default AccountantDashboard;

// ── Three-Way Match Modal ─────────────────────────────────────────────────────
// (defined after main component to avoid hoisting issues — referenced via name)
function ThreeWayMatchModal({ req, onClose, onApprove, onReject, loading }) {
  const [poMatched, setPoMatched]         = useState(true);
  const [grnMatched, setGrnMatched]       = useState(true);
  const [invoiceMatched, setInvoiceMatched] = useState(true);
  const [notes, setNotes]                 = useState('');
  const allMatch = poMatched && grnMatched && invoiceMatched;
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000';

  if (!req) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-fuchsia-50 text-xl">🔍</div>
          <div className="flex-1 min-w-0"><h3 className="text-base font-bold text-slate-900">Three-Way Matching</h3><p className="text-xs text-slate-500 mt-0.5 truncate">{req.requirementNumber} — {req.itemName}</p></div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            {[['PO Amount','AED '+(req.estimatedTotalPrice||0).toLocaleString(),'bg-sky-50 text-sky-700'],
              ['GRN Qty',req.grn?.quantityReceived??req.quantity,'bg-orange-50 text-orange-700'],
              ['Invoice','AED '+(req.invoiceAmount||0).toLocaleString(),'bg-purple-50 text-purple-700']].map(([l,v,c])=>(
              <div key={l} className={`rounded-xl p-3 ${c.split(' ')[0]}`}><p className="text-xs text-slate-500 mb-1">{l}</p><p className={`text-sm font-bold ${c.split(' ')[1]}`}>{v}</p></div>
            ))}
          </div>
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            {[['📄 Purchase Order',req.purchaseOrder?.document,'PO'],['📦 GRN',req.grn?.document,'GRN'],['🧾 Invoice',req.supplierInvoice,'Invoice']].map(([label,doc,name])=>(
              <div key={name} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                {doc ? <a href={`${baseUrl}/${doc.path}`} target="_blank" rel="noreferrer" download className="text-xs font-semibold text-slate-600 hover:underline">View / Download</a>
                     : <span className="text-xs text-red-500 font-semibold">Missing</span>}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[['Purchase Order matches requirement',poMatched,setPoMatched],['GRN matches PO quantity & description',grnMatched,setGrnMatched],['Invoice matches PO amount & supplier',invoiceMatched,setInvoiceMatched]].map(([label,val,set])=>(
              <label key={label} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={val} onChange={e=>set(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"/>
                <span className={`text-sm ${val?'text-slate-700':'text-red-600 font-medium'}`}>{label}</span>
                <span className="ml-auto">{val?'✅':'❌'}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes {!allMatch&&<span className="text-red-500">* required when failing</span>}</label>
            <textarea rows={2} className="input-field w-full resize-none text-sm" placeholder={allMatch?'Optional notes...':'Describe the discrepancy...'} value={notes} onChange={e=>setNotes(e.target.value)}/>
          </div>
          <div className={`rounded-xl border p-3 flex items-center gap-3 ${allMatch?'border-emerald-200 bg-emerald-50':'border-red-200 bg-red-50'}`}>
            <span className="text-2xl">{allMatch?'✅':'❌'}</span>
            <p className={`text-sm font-semibold ${allMatch?'text-emerald-800':'text-red-800'}`}>{allMatch?'All documents match — send to JA for journal entry.':'Match failed — will be returned for correction.'}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          {!allMatch && (
            <button onClick={()=>onReject({poMatched,grnMatched,invoiceMatched,note:notes||'3-way match failed.'})} disabled={loading||!notes.trim()} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
              {loading&&<span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>}❌ Fail
            </button>
          )}
          {allMatch && (
            <button onClick={()=>onApprove(notes||'3-way match passed. Sending to JA for journal entry.')} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-fuchsia-700 disabled:opacity-50">
              {loading&&<span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"/>}🔍 Verified — Send to JA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
