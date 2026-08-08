import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import PriorityBadge from '../../components/requirements/PriorityBadge';
import { toast } from '../../components/requirements/Toast';
import NotificationWidget from '../../components/common/NotificationWidget';

const today = () => new Date().toISOString().split('T')[0];

const StatCard = ({ label, value, color, bg, emoji, pulse }) => (
  <div className={`card flex items-center gap-4 p-5 ${pulse ? 'ring-2 ring-blue-400 ring-offset-1' : ''}`}>
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${bg}`}>{emoji}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className={`mt-0.5 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  </div>
);

// ── Journal Entry Modal ───────────────────────────────────────────────────────
const JournalModal = ({ req, onClose, onSave, loading }) => {
  const fileRef = React.useRef(null);
  const [form, setForm] = useState({
    entryNumber:   '',
    entryDate:     today(),
    voucherType:   'Payment Voucher',
    referenceNo:   '',
    debitAccount:  '',
    creditAccount: '',
    amount:        req?.invoiceAmount || req?.estimatedTotalPrice || '',
    narration:     `Payment for ${req?.itemName || ''} — ${req?.requirementNumber || ''}`,
  });
  const [file, setFile]         = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setFilePreview(f.name); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">📝</div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">Journal Entry</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{req?.requirementNumber} — {req?.itemName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Requirement summary strip */}
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-400">Req #: </span><span className="font-semibold">{req?.requirementNumber}</span></div>
            <div><span className="text-slate-400">Invoice: </span><span className="font-semibold">AED {(req?.invoiceAmount || req?.estimatedTotalPrice || 0).toLocaleString()}</span></div>
            <div><span className="text-slate-400">Vendor: </span><span className="font-semibold">{req?.poDetails?.toName || '—'}</span></div>
            <div><span className="text-slate-400">Inv #: </span><span className="font-semibold">{req?.invoiceNumber || '—'}</span></div>
          </div>

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Entry Number <span className="text-red-500">*</span></label>
              <input type="text" className="input-field w-full" placeholder="e.g. JE-2024-001" value={form.entryNumber} onChange={e => set('entryNumber', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Entry Date</label>
              <input type="date" className="input-field w-full" value={form.entryDate} onChange={e => set('entryDate', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Voucher Type</label>
              <select className="input-field w-full" value={form.voucherType} onChange={e => set('voucherType', e.target.value)}>
                {['Payment Voucher','Journal Voucher','Receipt Voucher','Contra Voucher','Purchase Voucher'].map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reference No.</label>
              <input type="text" className="input-field w-full" placeholder="e.g. REF-2024-001" value={form.referenceNo} onChange={e => set('referenceNo', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Debit Account</label>
              <input type="text" className="input-field w-full" placeholder="e.g. Purchases A/c" value={form.debitAccount} onChange={e => set('debitAccount', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Credit Account</label>
              <input type="text" className="input-field w-full" placeholder="e.g. Accounts Payable" value={form.creditAccount} onChange={e => set('creditAccount', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Amount (AED)</label>
              <input type="number" className="input-field w-full" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Narration</label>
            <textarea rows={2} className="input-field w-full resize-none text-sm" value={form.narration} onChange={e => set('narration', e.target.value)} />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Journal Voucher / Supporting Document</label>
            {filePreview ? (
              <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <span className="text-xs font-medium text-blue-800 truncate max-w-[240px]">{filePreview}</span>
                </div>
                <button type="button" onClick={() => { setFile(null); setFilePreview(''); }} className="text-xs text-red-500 hover:text-red-700">Remove</button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <p className="text-sm text-slate-500">📎 Click to upload journal voucher PDF</p>
                <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG · Max 20 MB · Optional</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFile} />
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
          <button
            onClick={() => form.entryNumber.trim() ? onSave(form, file) : toast.error('Entry number is required')}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            📝 Submit Journal Entry to SA
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
  const [modalReq, setModalReq] = useState(null);
  const [modalType, setModalType] = useState(null); // 'journal' | 'filing'
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

  const openModal = async (r, type) => {
    try {
      const { data } = await approvalService.getOne(r._id);
      setModalReq(data.requirement);
      setModalType(type);
    } catch { toast.error('Failed to load details'); }
  };

  const handleJournalSubmit = async (form, file) => {
    setModalLoading(true);
    try {
      await approvalService.saveJournalEntry(modalReq._id, form, file);
      await approvalService.approve(modalReq._id, `Journal entry submitted. Entry#: ${form.entryNumber}`);
      toast.success('✅ Journal entry submitted to Senior Accountant for review.');
      setModalReq(null);
      loadStats(); loadQueue();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setModalLoading(false); }
  };

  const handleFiling = async () => {
    setModalLoading(true);
    try {
      await approvalService.approve(modalReq._id, 'All documents filed by Junior Accountant. Procurement cycle closed.');
      toast.success('✅ Documents filed! Procurement cycle complete.');
      setModalReq(null);
      loadStats(); loadQueue();
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setModalLoading(false); }
  };

  const journalPending = stats?.stats?.['Journal Entry'] ?? 0;
  const filingPending  = stats?.stats?.['Filing'] ?? 0;
  const paid           = stats?.stats?.['Paid'] ?? 0;
  const totalPending   = journalPending + filingPending;

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
              <p className="mt-1 text-sm text-blue-200">{user?.role} · Journal Entry & Filing</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label:'Journal Entry', val: loadingStats ? '…' : journalPending, color:'text-amber-300' },
                { label:'Filing',        val: loadingStats ? '…' : filingPending,  color:'text-cyan-300'  },
                { label:'Paid',          val: loadingStats ? '…' : paid,           color:'text-emerald-300'},
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2">
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

      {/* Workflow info */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-start gap-3">
        <span className="text-2xl">📝</span>
        <div>
          <p className="text-sm font-semibold text-blue-800">Junior Accountant — Step 2 &amp; Step 6</p>
          <p className="text-xs text-blue-700 mt-1">
            <strong>Step 2 — Journal Entry:</strong> SA sends 3-way matched invoices to you. Make the journal entry and send back.<br/>
            <strong>Step 6 — Filing:</strong> After SA makes payment, file all documents to close the procurement cycle.
          </p>
        </div>
      </div>

      {/* Alert */}
      {!loadingStats && totalPending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-300 bg-blue-50 px-5 py-3">
          <span className="text-2xl animate-bounce">📝</span>
          <p className="text-sm font-semibold text-blue-800 flex-1">
            {journalPending > 0 && `${journalPending} journal entr${journalPending > 1 ? 'ies' : 'y'} to complete`}
            {journalPending > 0 && filingPending > 0 && ' · '}
            {filingPending > 0 && `${filingPending} document${filingPending > 1 ? 's' : ''} to file`}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard emoji="📝" label="Journal Entry"  value={journalPending} color="text-blue-600"    bg="bg-blue-50"    pulse={journalPending > 0} />
        <StatCard emoji="📁" label="Filing"         value={filingPending}  color="text-cyan-600"    bg="bg-cyan-50"    pulse={filingPending > 0} />
        <StatCard emoji="✅" label="Paid"           value={paid}           color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard emoji="❌" label="Rejected"       value={stats?.stats?.rejected ?? 0} color="text-red-600" bg="bg-red-50" />
      </div>

      {/* Queue */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">My Action Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">Journal entries to complete + documents to file</p>
          </div>
          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">{queue.length} pending</span>
        </div>
        {loadingQueue ? (
          <div className="space-y-3 p-6">{[1,2,3].map(i=><div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100"/>)}</div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-5xl mb-4">📝</p>
            <h4 className="text-base font-semibold text-slate-700">No pending actions</h4>
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
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-700">
                      AED {(r.invoiceAmount || r.estimatedTotalPrice || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status}/></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {r.status === 'Journal Entry' && (
                        <button onClick={() => openModal(r, 'journal')}
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                          📝 Make Journal Entry
                        </button>
                      )}
                      {r.status === 'Filing' && (
                        <button onClick={() => openModal(r, 'filing')}
                          className="rounded-md bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700">
                          📁 File Documents
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Journal Entry Modal */}
      {modalReq && modalType === 'journal' && (
        <JournalModal req={modalReq} onClose={() => setModalReq(null)} onSave={handleJournalSubmit} loading={modalLoading} />
      )}

      {/* Filing confirmation modal */}
      {modalReq && modalType === 'filing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalReq(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-xl">📁</div>
              <div>
                <h3 className="text-base font-bold text-slate-900">File Documents</h3>
                <p className="text-xs text-slate-500 mt-0.5">{modalReq.requirementNumber} — {modalReq.itemName}</p>
              </div>
              <button onClick={() => setModalReq(null)} className="ml-auto text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>
            <div className="px-6 py-5">
              <div className="rounded-xl bg-cyan-50 border border-cyan-200 p-4 mb-4">
                <p className="text-sm font-semibold text-cyan-800">Confirm document filing</p>
                <p className="text-xs text-cyan-700 mt-1">
                  Confirm that all procurement documents (PO, GRN, Invoice, Journal Entry, Payment records) have been physically filed. 
                  This will mark the procurement as <strong>Paid</strong> and close the cycle.
                </p>
              </div>
              {/* Payment summary */}
              {modalReq.paymentRecord?.paymentRef && (
                <div className="rounded-lg border border-slate-200 p-3 text-xs space-y-1">
                  <div><span className="text-slate-400">Payment Ref: </span><span className="font-semibold">{modalReq.paymentRecord.paymentRef}</span></div>
                  <div><span className="text-slate-400">Amount: </span><span className="font-semibold">AED {(modalReq.paymentRecord.amountPaid || 0).toLocaleString()}</span></div>
                  <div><span className="text-slate-400">Method: </span><span className="font-semibold">{modalReq.paymentRecord.paymentMethod}</span></div>
                  <div><span className="text-slate-400">Bank: </span><span className="font-semibold">{modalReq.paymentRecord.bankName}</span></div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setModalReq(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
              <button onClick={handleFiling} disabled={modalLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
                {modalLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                📁 Filed — Mark as Paid ✅
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationWidget />
    </div>
  );
};

export default JuniorAccountantDashboard;
