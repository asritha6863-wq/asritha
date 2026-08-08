import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import requirementService from '../../services/requirementService';
import StatusBadge from '../../components/requirements/StatusBadge';
import PriorityBadge from '../../components/requirements/PriorityBadge';
import Pagination from '../../components/requirements/Pagination';
import EmptyState from '../../components/requirements/EmptyState';
import { toast } from '../../components/requirements/Toast';
import Button from '../../components/common/Button';

const STATUSES = ['Draft','Submitted','Under Review','Approved','Rejected','Returned','Completed'];
const CATEGORIES = ['IT Equipment','Office Supplies','Furniture','Machinery','Software','Services','Raw Materials','Other'];
const PRIORITIES = ['Low','Medium','High','Urgent'];

const MyRequirements = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Read ?status= from URL on mount / URL change
  const urlStatus = new URLSearchParams(location.search).get('status') || '';

  const [data, setData] = useState({ requirements: [], total: 0, pages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: urlStatus, priority: '', category: '', dateFrom: '', dateTo: '' });
  const [activeFilters, setActiveFilters] = useState(urlStatus ? { status: urlStatus } : {});

  // When URL changes (e.g. clicking Drafts sidebar link), update filter
  useEffect(() => {
    const s = new URLSearchParams(location.search).get('status') || '';
    setFilters(f => ({ ...f, status: s }));
    setActiveFilters(s ? { status: s } : {});
    setPage(1);
  }, [location.search]);

  const fetchData = useCallback(async (pg = 1, f = activeFilters) => {
    setLoading(true);
    try {
      const params = { page: pg, limit: 10, ...f };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data: res } = await requirementService.getAll(params);
      setData(res);
    } catch {
      toast.error('Failed to load requirements');
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  useEffect(() => { fetchData(page); }, [page, fetchData]);

  const applyFilters = () => { setActiveFilters({ ...filters }); setPage(1); };
  const clearFilters = () => { setFilters({ search: '', status: '', priority: '', category: '', dateFrom: '', dateTo: '' }); setActiveFilters({}); setPage(1); };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this draft requirement?')) return;
    try {
      await requirementService.remove(id);
      toast.success('Requirement deleted');
      fetchData(page);
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleSubmit = async (id) => {
    if (!window.confirm('Submit this requirement for approval?')) return;
    try {
      await requirementService.submit(id);
      toast.success('Submitted for approval!');
      fetchData(page);
    } catch (err) {
      toast.error(err.message || 'Submit failed');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-navy-800">My Requirements</h1>
          <p className="text-sm text-slate-500">Manage and track all your procurement requests</p>
        </div>
        <Button onClick={() => navigate('/requirements/new')}>+ New Requirement</Button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <input className="input-field col-span-1 xl:col-span-2" placeholder="🔍 Search by number, name, category..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} onKeyDown={e => e.key === 'Enter' && applyFilters()} />
          <select className="input-field" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-field" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="input-field" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={applyFilters} className="btn-primary flex-1 text-sm">Apply</button>
            <button onClick={clearFilters} className="btn-secondary text-sm px-3">Clear</button>
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <input type="date" className="input-field text-sm" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
          <span className="flex items-center text-slate-400 text-sm">to</span>
          <input type="date" className="input-field text-sm" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent" />
          </div>
        ) : data.requirements.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No requirements found"
            description="No requirements match your filters, or you haven't created any yet."
            action={<Button onClick={() => navigate('/requirements/new')}>Create First Requirement</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    {['Req. Number','Date','Item Name','Category','Priority','Est. Amount','Status','Current Approver','Actions'].map(h => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.requirements.map(r => (
                    <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-700 whitespace-nowrap">{r.requirementNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 max-w-[180px] truncate font-medium text-slate-800" title={r.itemName}>{r.itemName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{r.category}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={r.priority} /></td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                        ₹{(r.estimatedTotalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                        {r.currentApprover ? `${r.currentApprover.firstName} ${r.currentApprover.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/requirements/${r._id}`)} className="text-xs text-navy-600 hover:underline font-medium">View</button>
                          {['Draft','Returned'].includes(r.status) && (
                            <button onClick={() => navigate(`/requirements/${r._id}/edit`)} className="text-xs text-amber-600 hover:underline font-medium">Edit</button>
                          )}
                          {r.status === 'Draft' && (
                            <>
                              <button onClick={() => handleSubmit(r._id)} className="text-xs text-emerald-600 hover:underline font-medium">Submit</button>
                              <button onClick={() => handleDelete(r._id)} className="text-xs text-red-600 hover:underline font-medium">Delete</button>
                            </>
                          )}
                          {r.status === 'Returned' && (
                            <button onClick={() => handleSubmit(r._id)} className="text-xs text-emerald-600 hover:underline font-medium">Resubmit</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-slate-100 px-4 py-4">
              <Pagination page={page} pages={data.pages} total={data.total} limit={10} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MyRequirements;
