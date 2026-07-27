import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import PriorityBadge from '../../components/requirements/PriorityBadge';
import Pagination from '../../components/requirements/Pagination';
import EmptyState from '../../components/requirements/EmptyState';
import ActionModal from '../../components/approval/ActionModal';
import { toast } from '../../components/requirements/Toast';
import useAuth from '../../hooks/useAuth';

const CATEGORIES = ['IT Equipment','Office Supplies','Furniture','Machinery','Software','Services','Raw Materials','Other'];
const PRIORITIES  = ['Low','Medium','High','Urgent'];

// Per-role queue header description
const QUEUE_LABEL = {
  'Senior Employee':     'Submitted requests awaiting your review, plus quotation/PO/GRN/invoice stages',
  'Department Manager':  'Requirements under review, quotation reviews, and GRN reviews pending your approval',
  'Budget Controller':   'High-value requests (> AED 500) awaiting budget verification',
  'Managing Director':   'Very high-value requests (> AED 3,000) requiring executive approval',
  'Department Director': 'Director reviews, PO signature requests, and GRN final approvals',
  'Accountant':          'Payment verification queue — PO + GRN + Invoice submitted for three-way matching',
};

// Inline action buttons per role + status combination
const getRowActions = (r, userRole, navigate, openModal) => {
  const status = r.status;

  // ── Senior Employee ────────────────────────────────────────────────────────
  if (userRole === 'Senior Employee') {
    if (status === 'Quotation Pending')
      return (
        <button onClick={() => navigate(`/review/${r._id}/quotations`)}
          className="rounded-md bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-700">
          📁 Upload Quotations
        </button>
      );
    if (status === 'PO Pending')
      return (
        <button onClick={() => navigate(`/review/${r._id}/po`)}
          className="rounded-md bg-sky-600 px-3 py-1 text-xs font-semibold text-white hover:bg-sky-700">
          🛒 Upload PO
        </button>
      );
    if (status === 'PO Signed')
      return (
        <>
          <button onClick={() => navigate(`/review/${r._id}`)}
            className="rounded-md bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-100">Review</button>
          <button onClick={() => openModal({ type: 'approve', req: r })}
            className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">📧 Confirm Sent</button>
        </>
      );
    if (status === 'GRN Pending')
      return (
        <button onClick={() => navigate(`/review/${r._id}/grn`)}
          className="rounded-md bg-orange-600 px-3 py-1 text-xs font-semibold text-white hover:bg-orange-700">
          📦 Upload GRN
        </button>
      );
    if (status === 'Payment Pending')
      return (
        <button onClick={() => navigate(`/review/${r._id}/invoice`)}
          className="rounded-md bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700">
          💳 Upload Invoice
        </button>
      );
    // Default SE: Submitted
    return (
      <>
        <button onClick={() => navigate(`/review/${r._id}`)}
          className="rounded-md bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-100">Review</button>
        <button onClick={() => openModal({ type: 'approve', req: r })}
          className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">✓</button>
        <button onClick={() => openModal({ type: 'return', req: r })}
          className="rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100">↩</button>
        <button onClick={() => openModal({ type: 'reject', req: r })}
          className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">✕</button>
      </>
    );
  }

  // ── Department Director ────────────────────────────────────────────────────
  if (userRole === 'Department Director') {
    if (status === 'PO Sign')
      return (
        <>
          <button onClick={() => navigate(`/review/${r._id}/po-sign`)}
            className="rounded-md bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700">
            ✍️ Sign PO
          </button>
          <button onClick={() => navigate(`/review/${r._id}`)}
            className="rounded-md bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100">View</button>
        </>
      );
    if (status === 'Director Review2')
      return (
        <>
          <button onClick={() => navigate(`/review/${r._id}`)}
            className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Review Quotations</button>
          <button onClick={() => openModal({ type: 'approve', req: r })}
            className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">✓ Approve</button>
          <button onClick={() => openModal({ type: 'return', req: r })}
            className="rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100">↩</button>
          <button onClick={() => openModal({ type: 'reject', req: r })}
            className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">✕</button>
        </>
      );
    if (status === 'GRN Review2')
      return (
        <>
          <button onClick={() => navigate(`/review/${r._id}`)}
            className="rounded-md bg-yellow-50 px-2.5 py-1 text-xs font-semibold text-yellow-700 hover:bg-yellow-100">Review GRN</button>
          <button onClick={() => openModal({ type: 'approve', req: r })}
            className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">✓ Approve</button>
          <button onClick={() => openModal({ type: 'return', req: r })}
            className="rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100">↩</button>
          <button onClick={() => openModal({ type: 'reject', req: r })}
            className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">✕</button>
        </>
      );
    // Default DD: Director Review
    return (
      <>
        <button onClick={() => navigate(`/review/${r._id}`)}
          className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Review</button>
        <button onClick={() => openModal({ type: 'approve', req: r })}
          className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">✓</button>
        <button onClick={() => openModal({ type: 'return', req: r })}
          className="rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100">↩</button>
        <button onClick={() => openModal({ type: 'reject', req: r })}
          className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">✕</button>
      </>
    );
  }

  // ── Department Manager ─────────────────────────────────────────────────────
  if (userRole === 'Department Manager') {
    const reviewLabel = status === 'Quotation Review' ? 'Review Quotations' : status === 'PO Review' ? 'Review PO' : status === 'GRN Review' ? 'Review GRN' : 'Review';
    return (
      <>
        <button onClick={() => navigate(`/review/${r._id}`)}
          className="rounded-md bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-100">{reviewLabel}</button>
        <button onClick={() => openModal({ type: 'approve', req: r })}
          className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">✓</button>
        <button onClick={() => openModal({ type: 'return', req: r })}
          className="rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100">↩</button>
        <button onClick={() => openModal({ type: 'reject', req: r })}
          className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">✕</button>
      </>
    );
  }

  // ── Accountant ─────────────────────────────────────────────────────────────
  if (userRole === 'Accountant')
    return (
      <button onClick={() => navigate(`/review/${r._id}`)}
        className="rounded-md bg-fuchsia-600 px-3 py-1 text-xs font-semibold text-white hover:bg-fuchsia-700">
        🔍 Verify
      </button>
    );

  // ── Default (BC, MD, Chairman) ─────────────────────────────────────────────
  return (
    <>
      <button onClick={() => navigate(`/review/${r._id}`)}
        className="rounded-md bg-navy-50 px-2.5 py-1 text-xs font-semibold text-navy-700 hover:bg-navy-100">Review</button>
      <button onClick={() => openModal({ type: 'approve', req: r })}
        className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">✓</button>
      <button onClick={() => openModal({ type: 'return', req: r })}
        className="rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100">↩</button>
      <button onClick={() => openModal({ type: 'reject', req: r })}
        className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">✕</button>
    </>
  );
};

const ReviewQueue = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData]           = useState({ requirements: [], total: 0, pages: 1 });
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [filters, setFilters]     = useState({ search: '', priority: '', category: '' });
  const [activeFilters, setActiveFilters] = useState({});
  const [modal, setModal]         = useState(null); // { type, req }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async (pg = 1, f = activeFilters) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: 10, ...f };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data: res } = await approvalService.getQueue(params);
      setData(res);
    } catch {
      toast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => { fetchData(page); }, [page, fetchData]);

  const applyFilters = () => { setActiveFilters({ ...filters }); setPage(1); };
  const clearFilters = () => { setFilters({ search: '', priority: '', category: '' }); setActiveFilters({}); setPage(1); };

  const handleAction = async (note) => {
    const { type, req } = modal;
    setActionLoading(true);
    try {
      if (type === 'approve') await approvalService.approve(req._id, note);
      if (type === 'reject')  await approvalService.reject(req._id, note);
      if (type === 'return')  await approvalService.returnReq(req._id, note);
      const msgs = {
        approve: {
          'Submitted':        'Forwarded to Department Manager.',
          'Under Review':     (req.estimatedTotalPrice||0) > 500 ? 'Forwarded to Budget Controller.' : 'Forwarded to SE for quotations.',
          'Budget Check':     (req.estimatedTotalPrice||0) > 3000 ? 'Escalated to Managing Director.' : 'Forwarded to Department Head.',
          'MD Review':        'Forwarded to Department Head.',
          'Director Review':  'Approved. SE to upload quotations.',
          'Quotation Pending':'Quotations submitted to Dept Manager.',
          'Quotation Review': 'Quotations approved. Forwarded to Dept Head.',
          'Director Review2': 'Quotations approved. SE to upload PO.',
          'PO Pending':       'PO submitted to Department Manager.',
          'PO Review':        'PO approved. Forwarded to Dept Head for signature.',
          'PO Sign':          '✍️ PO signed. SE to email supplier.',
          'PO Signed':        '📧 Confirmed. Awaiting goods delivery.',
          'GRN Pending':      'GRN submitted to Dept Manager.',
          'GRN Review':       'GRN forwarded to Dept Head.',
          'GRN Review2':      'GRN approved. SE to compile payment docs.',
          'Payment Pending':  'Documents submitted to Accountant.',
          'Payment Verification': '✅ Three-way match passed!',
        }[req.status] || 'Approved.',
        reject:  '❌ Requirement rejected.',
        return:  '↩️ Returned for correction.',
      };
      toast.success(msgs[type]);
      setModal(null);
      fetchData(page);
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">Review Queue</h1>
          <p className="text-sm text-slate-500">{QUEUE_LABEL[user?.role] || 'Requirements pending your review'}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          {data.total} Pending
        </span>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <input className="input-field flex-1 min-w-[200px]"
            placeholder="🔍 Search by number, name, employee..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && applyFilters()} />
          <select className="input-field w-40" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="input-field w-44" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={applyFilters}  className="btn-primary text-sm">Apply</button>
          <button onClick={clearFilters}  className="btn-secondary text-sm">Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent" />
          </div>
        ) : data.requirements.length === 0 ? (
          <EmptyState icon="📥" title="No pending reviews"
            description="All requirements have been processed. Check back later." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    {['Req. #','Employee','Item','Category','Priority','Est. Amount','Status','Date','Actions'].map(h => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.requirements.map(r => (
                    <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-700 whitespace-nowrap">{r.requirementNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium text-slate-800">{r.employeeName}</p>
                        <p className="text-xs text-slate-400">{r.employee?.employeeId}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[150px] truncate font-medium text-slate-800" title={r.itemName}>{r.itemName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 text-xs">{r.category}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={r.priority} /></td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-700">
                        AED {(r.estimatedTotalPrice || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getRowActions(r, user?.role, navigate, setModal)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-4">
              <Pagination page={page} pages={data.pages} total={data.total} limit={10} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>

      {modal && (
        <ActionModal type={modal.type} requirement={modal.req} onConfirm={handleAction}
          onClose={() => setModal(null)} loading={actionLoading} userRole={user?.role} />
      )}
    </div>
  );
};

export default ReviewQueue;
