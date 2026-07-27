import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import useAuth from '../../hooks/useAuth';
import approvalService from '../../services/approvalService';
import PriorityBadge from '../../components/requirements/PriorityBadge';
import StatusBadge from '../../components/requirements/StatusBadge';
import ActionModal from '../../components/approval/ActionModal';
import { toast } from '../../components/requirements/Toast';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = { 'Director Review':'#6366f1','Budget Check':'#8b5cf6','MD Review':'#e11d48',
  'Quotation Pending':'#0891b2','Quotation Review':'#0d9488','Purchase Order':'#059669',
  Approved:'#10b981',Rejected:'#ef4444',Returned:'#f97316',Draft:'#94a3b8' };

const StatCard = ({ label, value, color, bg, emoji, onClick, pulse, sub }) => (
  <button onClick={onClick} className={`card flex items-center gap-4 p-5 text-left w-full transition-all hover:shadow-md hover:-translate-y-0.5 ${pulse ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}>
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${bg}`}>{emoji}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className={`mt-0.5 text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </button>
);

const DepartmentDirectorDashboard = () => {
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
    try { const { data } = await approvalService.getQueue({ limit: 8 }); setQueue(data.requirements || []); }
    catch { } finally { setLoadingQueue(false); }
  }, []);

  useEffect(() => { loadStats(); loadQueue(); }, [loadStats, loadQueue]);

  const handleAction = async (note) => {
    const { type, req } = modal;
    setActionLoading(true);
    try {
      if (type === 'approve') await approvalService.approve(req._id, note);
      if (type === 'reject')  await approvalService.reject(req._id, note);
      if (type === 'return')  await approvalService.returnReq(req._id, note);
      toast.success(
        type === 'approve'
          ? ({
              'Director Review':  '✅ Approved. SE to upload quotations.',
              'Director Review2': '✅ Quotations approved. SE to upload PO.',
              'PO Sign':          '✍️ PO signed. SE to email supplier.',
              'GRN Review2':      '✅ GRN approved. SE to submit payment docs.',
            }[req.status] || '✅ Approved.')
          : type === 'reject'  ? '❌ Requirement rejected.' : '↩️ Returned for correction.'
      );
      setModal(null); loadStats(); loadQueue();
    } catch (err) { toast.error(err.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  const monthlyData = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push({ month: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), count: 0 }); }
    stats?.monthly?.forEach(({ _id, count }) => { const idx = months.findIndex(m => m.month === MONTH_NAMES[_id.month - 1] && m.year === _id.year); if (idx >= 0) months[idx].count = count; });
    return months;
  })();

  const pieData = stats?.byStatus?.filter(s => s.count > 0).map(s => ({ name: s._id, value: s.count })) || [];
  const pending = stats?.stats?.pending ?? 0;
  const quotPending = stats?.stats?.['Quotation Pending'] ?? 0;
  const quotReview  = stats?.stats?.['Quotation Review']  ?? 0;
  const purchaseOrders = (stats?.stats?.['PO Sign'] ?? 0) + (stats?.stats?.['PO Signed'] ?? 0);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-900 to-indigo-700 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-indigo-200">{now.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})} · {now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</p>
              <h1 className="mt-1 text-2xl font-bold text-white">Welcome, {user?.firstName}! 📋</h1>
              <p className="mt-1 text-sm text-indigo-200">{user?.role} · {user?.department?.departmentName || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              {[
                { label:'Pending',    val: loadingStats ? '…' : pending,         color:'text-amber-300'  },
                { label:'Quot.Pend',  val: loadingStats ? '…' : quotPending,     color:'text-cyan-300'   },
                { label:'PO Raised',  val: loadingStats ? '…' : purchaseOrders,  color:'text-emerald-300'},
                { label:'Approved',   val: loadingStats ? '…' : stats?.stats?.approved??0, color:'text-green-300' },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2">
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-indigo-200">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-slate-100 bg-slate-50 px-6 py-3 text-xs text-slate-600">
          <span><span className="font-semibold text-slate-400">ID: </span>{user?.employeeId}</span>
          <span><span className="font-semibold text-slate-400">Department: </span>{user?.department?.departmentName||'—'}</span>
          <span><span className="font-semibold text-slate-400">Designation: </span>{user?.designation?.designationName||'—'}</span>
          <span><span className="font-semibold text-slate-400">Email: </span>{user?.email}</span>
        </div>
      </div>

      {/* Role info */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4 flex items-start gap-3">
        <span className="text-2xl">📋</span>
        <div>
          <p className="text-sm font-semibold text-indigo-800">Department Director — Your Role</p>
          <p className="text-xs text-indigo-700 mt-0.5">
            You approve requests (Director Review), review quotations (Director Review2), digitally sign POs (PO Sign), and give final GRN approval.
            Flow after quotations: <strong>SE uploads PO → DM reviews → you sign → SE emails supplier</strong>.
          </p>
        </div>
      </div>

      {/* Alerts */}
      {!loadingStats && pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3">
          <span className="text-2xl animate-bounce">🔔</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">{pending} request{pending > 1 ? 's' : ''} awaiting your approval</p>
            <p className="text-xs text-amber-700">Your approval will notify the Senior Employee to upload quotations.</p>
          </div>
          <button onClick={() => navigate('/review/queue')} className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600">Review →</button>
        </div>
      )}
      {!loadingStats && quotPending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-cyan-300 bg-cyan-50 px-5 py-3">
          <span className="text-2xl">📁</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-cyan-800">{quotPending} request{quotPending > 1 ? 's' : ''} waiting for SE to upload quotations</p>
            <p className="text-xs text-cyan-700">Senior Employee has been notified to upload vendor quotations.</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
        {loadingStats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="card h-24 animate-pulse bg-slate-100"/>)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard emoji="📥" label="Director Review"    value={pending}       color="text-indigo-600"  bg="bg-indigo-50"  onClick={()=>navigate('/review/queue')} pulse={pending>0} />
            <StatCard emoji="📁" label="Quotation Pending"  value={quotPending}   color="text-cyan-600"    bg="bg-cyan-50"    onClick={()=>navigate('/review/queue')} sub="SE uploading" />
            <StatCard emoji="📋" label="Quotation Review"   value={quotReview}    color="text-teal-600"    bg="bg-teal-50"    onClick={()=>navigate('/review/queue')} sub="With DM" />
            <StatCard emoji="🛒" label="Purchase Orders"    value={purchaseOrders}color="text-emerald-600" bg="bg-emerald-50" onClick={()=>navigate('/review/queue')} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { emoji:'📥', label:'Review Queue',   onClick:()=>navigate('/review/queue') },
            { emoji:'📁', label:'Quot. Pending',  onClick:()=>navigate('/review/queue') },
            { emoji:'🛒', label:'Purchase Orders',onClick:()=>navigate('/review/queue') },
            { emoji:'✅', label:'Approved',       onClick:()=>navigate('/review/queue') },
            { emoji:'👤', label:'My Profile',     onClick:()=>navigate('/profile')      },
            { emoji:'🏠', label:'Dashboard',      onClick:()=>navigate('/dashboard/department-director') },
          ].map(a=>(
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
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Department Requests — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{borderRadius:'8px',border:'none',fontSize:12}}/>
              <Bar dataKey="count" name="Requests" fill="#6366f1" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Status Distribution</h3>
          {pieData.length===0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {pieData.map((e,i)=><Cell key={i} fill={PIE_COLORS[e.name]||'#94a3b8'}/>)}
                </Pie>
                <Tooltip contentStyle={{borderRadius:'8px',border:'none',fontSize:12}}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Review Queue */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Director Review Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">Requests approved by MD/BC awaiting your sign-off to initiate quotation stage</p>
          </div>
          <button onClick={()=>navigate('/review/queue')} className="text-xs font-medium text-navy-600 hover:underline">View all →</button>
        </div>
        {loadingQueue ? (
          <div className="space-y-3 p-6">{[1,2,3].map(i=><div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100"/>)}</div>
        ) : queue.length===0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-5xl mb-4">📋</p>
            <h4 className="text-base font-semibold text-slate-700">No pending director reviews</h4>
            <p className="text-sm text-slate-500 mt-1">All requirements have been processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {['Req. Number','Employee','Item','Priority','Amount','Status','Date','Actions'].map(h=>(
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map(r=>(
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-700 whitespace-nowrap">{r.requirementNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-medium text-slate-800">{r.employeeName}</p>
                      <p className="text-xs text-slate-400">{r.employee?.employeeId}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-slate-700" title={r.itemName}>{r.itemName}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={r.priority}/></td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-indigo-700">AED {(r.estimatedTotalPrice||0).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status}/></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button onClick={()=>navigate(`/review/${r._id}`)} className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Review</button>
                        <button onClick={()=>setModal({type:'approve',req:r})} className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">✓</button>
                        <button onClick={()=>setModal({type:'return',req:r})} className="rounded-md bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-100">↩</button>
                        <button onClick={()=>setModal({type:'reject',req:r})} className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Workflow */}
      <div className="card p-6">
        <h3 className="mb-5 text-sm font-semibold text-slate-700">Full Workflow — Your Position</h3>
        <ol className="relative border-l-2 border-slate-200 pl-8 space-y-4">
          {[
            { label:'RE submits',          desc:'Creates & submits requirement',                              done:true,  active:false },
            { label:'SE reviews',          desc:'Initial endorsement',                                        done:true,  active:false },
            { label:'DM reviews',          desc:'Dept-level approval (≤ AED 500 → quotation direct | > AED 500 → BC)', done:true, active:false },
            { label:'BC reviews',          desc:'Budget check (AED 500–AED 3,000 → Dept Head | > AED 3,000 → MD)', done:true, active:false },
            { label:'MD reviews',          desc:'Executive approval (> AED 3,000)',                           done:true,  active:false },
            { label:'Dept Head ← You',     desc:'Pre-quote approval | Quotation approval (Review2) | Sign PO (PO Sign) | Approve GRN (GRN Review2)', done:false, active:true },
            { label:'SE uploads quotations',desc:'Vendor quotations uploaded and submitted',                  done:false, active:false },
            { label:'DM reviews quotations',desc:'Approves and forwards for PO',                             done:false, active:false },
            { label:'PO signed & sent',    desc:'Dept Head signs PO, SE emails supplier',                    done:false, active:false },
            { label:'GRN created',         desc:'SE receives goods, submits GRN for review',                  done:false, active:false },
            { label:'Senior Accountant',   desc:'Three-way match: PO + GRN + Invoice → payment',             done:false, active:false },
          ].map((s,i)=>(
            <li key={i} className="relative">
              <span className={`absolute -left-[1.35rem] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold
                ${s.done?'border-emerald-500 bg-emerald-500 text-white':s.active?'border-indigo-600 bg-indigo-700 text-white ring-4 ring-indigo-100':'border-slate-300 bg-white text-slate-400'}`}>
                {s.done?'✓':i+1}
              </span>
              <p className={`text-sm font-semibold ${s.active?'text-indigo-700':s.done?'text-emerald-700':'text-slate-400'}`}>{s.label}</p>
              <p className={`text-xs ${s.active||s.done?'text-slate-500':'text-slate-300'}`}>{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>

      {modal && <ActionModal type={modal.type} requirement={modal.req} onConfirm={handleAction} onClose={()=>setModal(null)} loading={actionLoading} userRole={user?.role}/>}
    </div>
  );
};

export default DepartmentDirectorDashboard;
