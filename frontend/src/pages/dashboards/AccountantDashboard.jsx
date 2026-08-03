import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import useAuth from '../../hooks/useAuth';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import PriorityBadge from '../../components/requirements/PriorityBadge';
import { toast } from '../../components/requirements/Toast';
import NotificationWidget from '../../components/common/NotificationWidget';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = {
  'Payment Verification': '#a21caf',
  'Payment Pending':      '#7c3aed',
  Completed:              '#059669',
  Rejected:               '#ef4444',
  Returned:               '#f97316',
  Draft:                  '#94a3b8',
};

const StatCard = ({ label, value, color, bg, emoji, onClick, pulse, sub }) => (
  <button
    onClick={onClick}
    className={`card flex items-center gap-4 p-5 text-left w-full transition-all hover:shadow-md hover:-translate-y-0.5 ${pulse ? 'ring-2 ring-fuchsia-400 ring-offset-1' : ''}`}
  >
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${bg}`}>{emoji}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className={`mt-0.5 text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </button>
);

// ── Three-Way Match Modal ─────────────────────────────────────────────────────
const ThreeWayModal = ({ req, onClose, onApprove, onReject, loading }) => {
  const [poMatched, setPoMatched]         = useState(true);
  const [grnMatched, setGrnMatched]       = useState(true);
  const [invoiceMatched, setInvoiceMatched] = useState(true);
  const [notes, setNotes]                 = useState('');
  const allMatch = poMatched && grnMatched && invoiceMatched;
  const baseUrl  = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
  const fmtAED   = (n) => `AED ${(n || 0).toLocaleString()}`;

  if (!req) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-4" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl text-xl bg-fuchsia-50">🔍</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">Three-Way Matching</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{req.requirementNumber} — {req.itemName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'PO Amount',      val: fmtAED(req.estimatedTotalPrice),  color: 'text-sky-700',     bg: 'bg-sky-50'     },
              { label: 'GRN Qty Recv.',  val: req.grn?.quantityReceived ?? req.quantity, color: 'text-orange-700', bg: 'bg-orange-50' },
              { label: 'Invoice Amount', val: fmtAED(req.invoiceAmount),         color: 'text-purple-700',  bg: 'bg-purple-50'  },
            ].map(s => (
              <div key={s.label} className={`rounded-xl p-3 ${s.bg}`}>
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-sm font-bold ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>

          {/* Document links */}
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
            {[
              { label: '📄 Purchase Order',    doc: req.purchaseOrder?.document, badge: req.purchaseOrder?.signedByName ? `Signed by ${req.purchaseOrder.signedByName}` : null },
              { label: '📦 Goods Receipt Note',doc: req.grn?.document,           badge: req.grn?.receivedAt ? `Received ${new Date(req.grn.receivedAt).toLocaleDateString()}` : null },
              { label: '🧾 Supplier Invoice',  doc: req.supplierInvoice,          badge: req.invoiceNumber ? `Inv# ${req.invoiceNumber}` : null },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{row.label}</span>
                  {row.badge && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{row.badge}</span>}
                </div>
                {row.doc
                  ? <a href={`${baseUrl}/${row.doc.path}`} target="_blank" rel="noreferrer" download className="text-xs font-semibold text-navy-600 hover:underline">View / Download</a>
                  : <span className="text-xs text-red-500 font-semibold">Missing</span>
                }
              </div>
            ))}
          </div>

          {/* Match checkboxes */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Matching Checklist</p>
            {[
              { label: 'Purchase Order matches requirement',           val: poMatched,      set: setPoMatched      },
              { label: 'GRN matches PO (quantity & description)',      val: grnMatched,     set: setGrnMatched     },
              { label: 'Invoice matches PO amount & supplier details', val: invoiceMatched, set: setInvoiceMatched },
            ].map(c => (
              <label key={c.label} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={c.val}
                  onChange={e => c.set(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className={`text-sm ${c.val ? 'text-slate-700' : 'text-red-600 font-medium'}`}>{c.label}</span>
                <span className="ml-auto text-base">{c.val ? '✅' : '❌'}</span>
              </label>
            ))}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Notes {!allMatch && <span className="text-red-500">* (required when failing)</span>}
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder-slate-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500 resize-none"
              placeholder={allMatch ? 'Optional: add verification notes...' : 'Required: describe the discrepancy...'}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Result banner */}
          <div className={`rounded-xl border p-3 flex items-center gap-3 ${allMatch ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
            <span className="text-2xl">{allMatch ? '✅' : '❌'}</span>
            <p className={`text-sm font-semibold ${allMatch ? 'text-emerald-800' : 'text-red-800'}`}>
              {allMatch ? 'All three documents match — ready to approve for payment.' : 'Match failed — requirement will be returned for correction.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          {!allMatch && (
            <button
              onClick={() => onReject({ poMatched, grnMatched, invoiceMatched, note: notes || 'Three-way match failed.' })}
              disabled={loading || (!notes.trim())}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              ❌ Fail — Return for Correction
            </button>
          )}
          {allMatch && (
            <button
              onClick={() => onApprove(notes || 'Three-way match passed. Invoice approved for payment.')}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              🔍 Approve — 3-Way Match Passed
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
const AccountantDashboard = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [now, setNow]               = useState(new Date());
  const [stats, setStats]           = useState(null);
  const [queue, setQueue]           = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [modal, setModal]           = useState(null); // requirement object
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const loadStats = useCallback(async () => {
    try { const { data } = await approvalService.getStats(); setStats(data); }
    catch { /* graceful */ } finally { setLoadingStats(false); }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try { const { data } = await approvalService.getQueue({ limit: 20 }); setQueue(data.requirements || []); }
    catch { /* graceful */ } finally { setLoadingQueue(false); }
  }, []);

  useEffect(() => { loadStats(); loadQueue(); }, [loadStats, loadQueue]);

  const handleApprove = async (note) => {
    setActionLoading(true);
    try {
      await approvalService.approve(modal._id, note);
      toast.success('✅ Three-way match passed. Invoice approved for payment. Process complete!');
      setModal(null);
      loadStats(); loadQueue();
    } catch (err) { toast.error(err.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  const handleReject = async (payload) => {
    setActionLoading(true);
    try {
      await approvalService.threeWayReject(modal._id, payload);
      toast.error('❌ Three-way match failed. Requirement returned for correction.');
      setModal(null);
      loadStats(); loadQueue();
    } catch (err) { toast.error(err.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  // Open full detail view to load all doc links, then show modal
  const openMatchModal = async (req) => {
    try {
      const { data } = await approvalService.getOne(req._id);
      setModal(data.requirement);
    } catch { toast.error('Failed to load requirement details'); }
  };

  const monthlyData = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months.push({ month: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), count: 0 });
    }
    stats?.monthly?.forEach(({ _id, count }) => {
      const idx = months.findIndex(m => m.month === MONTH_NAMES[_id.month - 1] && m.year === _id.year);
      if (idx >= 0) months[idx].count = count;
    });
    return months;
  })();

  const pieData     = stats?.byStatus?.filter(s => s.count > 0).map(s => ({ name: s._id, value: s.count })) || [];
  const pending     = stats?.stats?.pending ?? 0;
  const completed   = stats?.stats?.completed ?? 0;
  const rejected    = stats?.stats?.rejected ?? 0;
  const payPending  = stats?.stats?.['Payment Pending'] ?? 0;
  const totalPendingValue = queue.reduce((s, r) => s + (r.estimatedTotalPrice || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-fuchsia-900 to-fuchsia-700 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-fuchsia-200">
                {now.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                {' · '}{now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">Welcome, {user?.firstName}! 🔍</h1>
              <p className="mt-1 text-sm text-fuchsia-200">{user?.role} · Accounts & Payment Verification</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              {[
                { label: 'Pending',   val: loadingStats ? '…' : pending,   color: 'text-amber-300'   },
                { label: 'Completed', val: loadingStats ? '…' : completed, color: 'text-emerald-300' },
                { label: 'Rejected',  val: loadingStats ? '…' : rejected,  color: 'text-red-300'     },
                { label: 'Pay.Pend',  val: loadingStats ? '…' : payPending,color: 'text-purple-300'  },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2">
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-fuchsia-200">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-600">
          <span><span className="font-semibold text-slate-400">ID: </span>{user?.employeeId}</span>
          <span><span className="font-semibold text-slate-400">Email: </span>{user?.email}</span>
          <span><span className="font-semibold text-slate-400">Designation: </span>{user?.designation?.designationName || '—'}</span>
        </div>
      </div>

      {/* Role info */}
      <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-5 py-4 flex items-start gap-3">
        <span className="text-2xl">🔍</span>
        <div>
          <p className="text-sm font-semibold text-fuchsia-800">Senior Accountant — Three-Way Matching</p>
          <p className="text-xs text-fuchsia-700 mt-0.5">
            You receive completed procurement requests at the final payment stage. Your task is to verify that the
            <strong> Purchase Order</strong>, <strong>Goods Receipt Note (GRN)</strong>, and <strong>Supplier Invoice</strong> all match.
            If all three align, approve for payment. If any discrepancy is found, fail the match and return for correction.
          </p>
        </div>
      </div>

      {/* Pending alert */}
      {!loadingStats && pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-fuchsia-300 bg-fuchsia-50 px-5 py-3">
          <span className="text-2xl animate-bounce">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-fuchsia-800">
              {pending} payment{pending > 1 ? 's' : ''} awaiting three-way verification
            </p>
            <p className="text-xs text-fuchsia-700">
              Total pending value: <strong>AED {totalPendingValue.toLocaleString()}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
        {loadingStats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1,2,3,4].map(i => <div key={i} className="card h-24 animate-pulse bg-slate-100" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard emoji="🔍" label="Awaiting Verification" value={pending}    color="text-fuchsia-600" bg="bg-fuchsia-50" pulse={pending > 0} sub={`AED ${totalPendingValue.toLocaleString()}`} />
            <StatCard emoji="💳" label="Payment Pending (SE)"  value={payPending} color="text-purple-600"  bg="bg-purple-50"  sub="Docs being compiled" />
            <StatCard emoji="✅" label="Completed"             value={completed}  color="text-emerald-600" bg="bg-emerald-50" />
            <StatCard emoji="❌" label="Returned / Rejected"   value={rejected}   color="text-red-600"     bg="bg-red-50"     />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { emoji:'🔍', label:'Verify Now',     onClick: () => {} },
            { emoji:'✅', label:'Completed',      onClick: () => {} },
            { emoji:'👤', label:'My Profile',     onClick: () => navigate('/profile') },
            { emoji:'🏠', label:'Dashboard',      onClick: () => navigate('/dashboard/accountant') },
          ].map(a => (
            <button key={a.label} onClick={a.onClick} className="card flex flex-col items-center gap-2 p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 border border-slate-200">
              <span className="text-2xl">{a.emoji}</span>
              <p className="text-xs font-semibold text-slate-700">{a.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Payment Requests — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{borderRadius:'8px',border:'none',fontSize:12}} />
              <Bar dataKey="count" name="Requests" fill="#a21caf" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Status Distribution</h3>
          {pieData.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={PIE_COLORS[e.name] || '#94a3b8'} />)}
                </Pie>
                <Tooltip contentStyle={{borderRadius:'8px',border:'none',fontSize:12}} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Payment Verification queue */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Payment Verification Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Procurement requests with PO + GRN + Invoice submitted — awaiting your three-way match
            </p>
          </div>
          <span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">
            {queue.length} pending
          </span>
        </div>

        {loadingQueue ? (
          <div className="space-y-3 p-6">
            {[1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-5xl mb-4">🔍</p>
            <h4 className="text-base font-semibold text-slate-700">No verifications pending</h4>
            <p className="text-sm text-slate-500 mt-1">All submitted documents have been processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {['Req. #','Employee','Dept','Item','Priority','Est. Amount','Invoice Amt','Status','Date','Action'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map(r => (
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-700 whitespace-nowrap">{r.requirementNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-slate-800">{r.employeeName}</p>
                      <p className="text-xs text-slate-400">{r.employee?.employeeId}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{r.departmentName}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-slate-700" title={r.itemName}>{r.itemName}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                      AED {(r.estimatedTotalPrice || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-fuchsia-700">
                      {r.invoiceAmount ? `AED ${r.invoiceAmount.toLocaleString()}` : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => openMatchModal(r)}
                        className="rounded-md bg-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-fuchsia-700 transition-colors"
                      >
                        🔍 Verify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workflow position */}
      <div className="card p-6">
        <h3 className="mb-5 text-sm font-semibold text-slate-700">Full Procurement Workflow — Your Position</h3>
        <ol className="relative border-l-2 border-slate-200 pl-8 space-y-4">
          {[
            { label:'RE submits Purchase Request',        desc:'Creates and submits requirement',                done:true,  active:false },
            { label:'SE initial review',                  desc:'Endorses and forwards to Dept Manager',          done:true,  active:false },
            { label:'Dept Manager budget check',          desc:'≤ AED 500 → quotation stage | > AED 500 → BC',  done:true,  active:false },
            { label:'Budget Controller / MD approval',    desc:'BC ≤ AED 3,000 | MD for higher amounts',         done:true,  active:false },
            { label:'Dept Head sign-off',                 desc:'Approves → SE collects quotations',              done:true,  active:false },
            { label:'Quotation & PO stage',               desc:'SE uploads quotes → DM reviews → Dept Head signs PO', done:true, active:false },
            { label:'Goods Receipt (GRN)',                desc:'Supplier delivers → SE creates GRN → DM → Dept Head approves', done:true, active:false },
            { label:'Senior Accountant ← You',           desc:'Three-way match: PO + GRN + Invoice → approve for payment', done:false, active:true },
            { label:'Payment processed',                  desc:'Invoice approved — procurement complete',         done:false, active:false },
          ].map((s, i) => (
            <li key={i} className="relative">
              <span className={`absolute -left-[1.35rem] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold
                ${s.done ? 'border-emerald-500 bg-emerald-500 text-white' : s.active ? 'border-fuchsia-600 bg-fuchsia-700 text-white ring-4 ring-fuchsia-100' : 'border-slate-300 bg-white text-slate-400'}`}>
                {s.done ? '✓' : i + 1}
              </span>
              <p className={`text-sm font-semibold ${s.active ? 'text-fuchsia-700' : s.done ? 'text-emerald-700' : 'text-slate-400'}`}>{s.label}</p>
              <p className={`text-xs ${s.active || s.done ? 'text-slate-500' : 'text-slate-300'}`}>{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* Three-Way Match Modal */}
      {modal && (
        <ThreeWayModal
          req={modal}
          onClose={() => setModal(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          loading={actionLoading}
        />
      )}

      <NotificationWidget />
    </div>
  );
};

export default AccountantDashboard;
