import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import useAuth from '../../hooks/useAuth';
import approvalService from '../../services/approvalService';
import PriorityBadge from '../../components/requirements/PriorityBadge';
import ActionModal from '../../components/approval/ActionModal';
import { toast } from '../../components/requirements/Toast';
import NotificationWidget from '../../components/common/NotificationWidget';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = { 'Budget Check':'#8b5cf6', Approved:'#10b981', Rejected:'#ef4444', Returned:'#f97316', 'Under Review':'#f59e0b', Draft:'#94a3b8' };

const StatCard = ({ label, value, color, bg, emoji, onClick, pulse, sub }) => (
  <button onClick={onClick} className={`card flex items-center gap-4 p-5 text-left w-full transition-all hover:shadow-md hover:-translate-y-0.5 ${pulse?'ring-2 ring-violet-400 ring-offset-1':''}`}>
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${bg}`}>{emoji}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className={`mt-0.5 text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </button>
);

const BudgetControllerDashboard = () => {
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
      const total = req.estimatedTotalPrice || 0;
      toast.success(
        type === 'approve'
          ? total > 3000
            ? `🏛️ Budget > AED 3,000 (AED ${total.toLocaleString()}) — Escalated to Managing Director.`
            : `✅ Budget Approved (AED ${total.toLocaleString()}) — Forwarded to Department Head.`
          : type === 'reject' ? '❌ Budget rejected. Requirement rejected.' : '↩️ Returned for correction.'
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

  // Calculate total value pending budget approval
  const totalPendingValue = queue.reduce((sum, r) => sum + (r.estimatedTotalPrice || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-violet-900 to-violet-700 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-violet-200">{now.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})} · {now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</p>
              <h1 className="mt-1 text-2xl font-bold text-white">Welcome, {user?.firstName}! 💰</h1>
              <p className="mt-1 text-sm text-violet-200">{user?.role} · {user?.department?.departmentName || '—'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              {[
                { label:'Pending',     val: loadingStats ? '…' : pending,                  color:'text-amber-300'  },
                { label:'Approved',    val: loadingStats ? '…' : stats?.stats?.approved??0, color:'text-emerald-300'},
                { label:'Rejected',    val: loadingStats ? '…' : stats?.stats?.rejected??0, color:'text-red-300'    },
                { label:'Returned',    val: loadingStats ? '…' : stats?.stats?.returned??0, color:'text-orange-300' },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2">
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-violet-200">{s.label}</p>
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
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-4 flex items-start gap-3">
        <span className="text-2xl">💰</span>
        <div>
          <p className="text-sm font-semibold text-violet-800">Budget Controller — Your Role</p>
          <p className="text-xs text-violet-700 mt-0.5">
            You review requirements where the total <strong>exceeds AED 500</strong>. These have been approved by SE and DM.
            <br/>
            <span className="font-semibold">AED 500 – AED 3,000:</span> you approve directly → forwards to Dept Head.
            <br/>
            <span className="font-semibold">Above AED 3,000:</span> you approve → escalates to <strong>Managing Director</strong>.
          </p>
        </div>
      </div>

      {/* Pending alert */}
      {!loadingStats && pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-violet-300 bg-violet-50 px-5 py-3">
          <span className="text-2xl animate-bounce">💰</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-violet-800">
              {pending} budget request{pending > 1 ? 's' : ''} awaiting your review
            </p>
            <p className="text-xs text-violet-700">
              Total pending value: <strong>AED {totalPendingValue.toLocaleString()}</strong>
            </p>
          </div>
          <button onClick={() => navigate('/review/queue')} className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700">
            Review Now →
          </button>
        </div>
      )}

      {/* Stats */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
        {loadingStats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="card h-24 animate-pulse bg-slate-100"/>)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard emoji="💰" label="Pending Budget Check" value={pending}                       color="text-violet-600"  bg="bg-violet-50"  onClick={()=>navigate('/review/queue')} pulse={pending>0} sub={`AED ${totalPendingValue.toLocaleString()} total`} />
            <StatCard emoji="✅" label="Budget Approved"      value={stats?.stats?.approved??0}     color="text-emerald-600" bg="bg-emerald-50" onClick={()=>navigate('/review/queue')} />
            <StatCard emoji="❌" label="Budget Rejected"      value={stats?.stats?.rejected??0}     color="text-red-600"     bg="bg-red-50"     onClick={()=>navigate('/review/queue')} />
            <StatCard emoji="↩️" label="Returned"             value={stats?.stats?.returned??0}     color="text-orange-600"  bg="bg-orange-50"  onClick={()=>navigate('/review/queue')} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { emoji:'💰', label:'Budget Queue',    onClick:()=>navigate('/review/queue')               },
            { emoji:'✅', label:'Approved',        onClick:()=>navigate('/review/queue')               },
            { emoji:'❌', label:'Rejected',        onClick:()=>navigate('/review/queue')               },
            { emoji:'📊', label:'All Requests',    onClick:()=>navigate('/review/queue')               },
            { emoji:'👤', label:'My Profile',      onClick:()=>navigate('/profile')                    },
            { emoji:'🏠', label:'Dashboard',       onClick:()=>navigate('/dashboard/budget-controller') },
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
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Budget Requests — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{borderRadius:'8px',border:'none',fontSize:12}}/>
              <Bar dataKey="count" name="Requests" fill="#7c3aed" radius={[4,4,0,0]}/>
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

      {/* Budget Queue table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Budget Review Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">High-value requirements (&gt; AED 500) escalated from Department Manager</p>
          </div>
          <button onClick={()=>navigate('/review/queue')} className="text-xs font-medium text-navy-600 hover:underline">View all →</button>
        </div>
        {loadingQueue ? (
          <div className="space-y-3 p-6">{[1,2,3].map(i=><div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100"/>)}</div>
        ) : queue.length===0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-5xl mb-4">💰</p>
            <h4 className="text-base font-semibold text-slate-700">No budget reviews pending</h4>
            <p className="text-sm text-slate-500 mt-1">All high-value requests have been processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {['Req. Number','Employee','Item','Category','Priority','Est. Amount','Date','Actions'].map(h=>(
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
                    <td className="px-4 py-3 max-w-[140px] truncate text-slate-700" title={r.itemName}>{r.itemName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{r.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={r.priority}/></td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-violet-700">AED {(r.estimatedTotalPrice||0).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button onClick={()=>navigate(`/review/${r._id}`)} className="rounded-md bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100">Review</button>
                        <button onClick={()=>setModal({type:'approve',req:r})} className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">✓ Approve</button>
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
        <h3 className="mb-5 text-sm font-semibold text-slate-700">Approval Workflow — Your Position</h3>
        <ol className="relative border-l-2 border-slate-200 pl-8 space-y-5">
          {[
            { label:'Requesting Employee', desc:'Creates & submits',          done:true,  active:false },
            { label:'Senior Employee',     desc:'Initial review',              done:true,  active:false },
            { label:'Department Manager',  desc:'Dept approval (budget routing)', done:true, active:false },
            { label:'Budget Controller ← You', desc:'AED 500–AED 3,000: approve directly | >AED 3,000: escalate to MD', done:false, active:true },
            { label:'Managing Director',   desc:'Reviews requests > ₹5,000',  done:false, active:false },
            { label:'Completed',           desc:'Fully approved',              done:false, active:false },
          ].map((s,i)=>(
            <li key={i} className="relative">
              <span className={`absolute -left-[1.35rem] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold
                ${s.done?'border-emerald-500 bg-emerald-500 text-white':s.active?'border-violet-600 bg-violet-700 text-white ring-4 ring-violet-100':'border-slate-300 bg-white text-slate-400'}`}>
                {s.done?'✓':i+1}
              </span>
              <p className={`text-sm font-semibold ${s.active?'text-violet-700':s.done?'text-emerald-700':'text-slate-400'}`}>{s.label}</p>
              <p className={`text-xs ${s.active||s.done?'text-slate-500':'text-slate-300'}`}>{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>

      {modal && (
        <ActionModal type={modal.type} requirement={modal.req} onConfirm={handleAction} onClose={()=>setModal(null)} loading={actionLoading} userRole={user?.role} />
      )}

      <NotificationWidget />
    </div>
  );
};

export default BudgetControllerDashboard;
