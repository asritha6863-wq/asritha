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
import NotificationWidget from '../../components/common/NotificationWidget';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS = {
  Completed: '#059669', Rejected: '#ef4444', Returned: '#f97316',
  'Payment Verification': '#a21caf', 'MD Review': '#e11d48',
  'Budget Check': '#8b5cf6', Draft: '#94a3b8', Submitted: '#2563eb',
  'Under Review': '#f59e0b',
};

const StatCard = ({ label, value, color, bg, emoji, sub, pulse }) => (
  <div className={`card flex items-center gap-4 p-5 ${pulse ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}`}>
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${bg}`}>{emoji}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className={`mt-0.5 text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const ChairmanDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(true);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const loadStats = useCallback(async () => {
    try { const { data } = await approvalService.getStats(); setStats(data); }
    catch { } finally { setLoadingStats(false); }
  }, []);

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true);
    try { const { data } = await approvalService.getQueue({ limit: 10 }); setQueue(data.requirements || []); }
    catch { } finally { setLoadingQueue(false); }
  }, []);

  useEffect(() => { loadStats(); loadQueue(); }, [loadStats, loadQueue]);

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

  const pieData = stats?.byStatus?.filter(s => s.count > 0).map(s => ({ name: s._id, value: s.count })) || [];
  const completed       = stats?.stats?.completed ?? 0;
  const rejected        = stats?.stats?.rejected  ?? 0;
  const returned        = stats?.stats?.returned  ?? 0;
  const mdPending       = stats?.stats?.['MD Review'] ?? 0;
  const totalInProgress = stats?.byStatus
    ?.filter(s => !['Completed','Rejected','Returned','Draft'].includes(s._id))
    ?.reduce((s, x) => s + x.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-900 to-yellow-700 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-yellow-200">
                {now.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                {' · '}{now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">Welcome, {user?.firstName}! 🏆</h1>
              <p className="mt-1 text-sm text-yellow-200">{user?.role} · Board-Level Oversight</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              {[
                { label:'In Progress', val: loadingStats ? '…' : totalInProgress, color:'text-amber-300'   },
                { label:'Completed',   val: loadingStats ? '…' : completed,        color:'text-emerald-300' },
                { label:'MD Pending',  val: loadingStats ? '…' : mdPending,        color:'text-rose-300'   },
                { label:'Rejected',    val: loadingStats ? '…' : rejected,         color:'text-red-300'    },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2">
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-yellow-200">{s.label}</p>
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

      {/* Role banner */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4 flex items-start gap-3">
        <span className="text-2xl">🏆</span>
        <div>
          <p className="text-sm font-semibold text-yellow-800">Chairman — Board-Level Oversight</p>
          <p className="text-xs text-yellow-700 mt-0.5">
            Full visibility across the entire procurement lifecycle. Monitor all active requests, track spend,
            and review completion rates. Workflow: <strong>RE → SE → DM → BC → MD → Dept Head → Quotation → PO → GRN → Accountant (3-way match)</strong>.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Organisation Overview</h2>
        {loadingStats ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="card h-24 animate-pulse bg-slate-100"/>)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard emoji="📊" label="In Progress"          value={totalInProgress}  color="text-amber-600"   bg="bg-amber-50"   sub="Active requests" pulse={totalInProgress > 0} />
            <StatCard emoji="✅" label="Completed"            value={completed}        color="text-emerald-600" bg="bg-emerald-50" sub="Fully processed" />
            <StatCard emoji="🏛️" label="MD Review"           value={mdPending}        color="text-rose-600"    bg="bg-rose-50"    sub="> AED 3,000" />
            <StatCard emoji="↩️" label="Rejected / Returned"  value={rejected+returned} color="text-orange-600" bg="bg-orange-50" sub={`${rejected} rej · ${returned} ret`} />
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { emoji:'📊', label:'All Requests',   onClick:()=>navigate('/review/queue') },
            { emoji:'✅', label:'Completed',      onClick:()=>navigate('/review/queue') },
            { emoji:'🔔', label:'Notifications',  onClick:()=>navigate('/notifications') },
            { emoji:'👤', label:'My Profile',     onClick:()=>navigate('/profile') },
          ].map(a=>(
            <button key={a.label} onClick={a.onClick} className="card flex flex-col items-center gap-2 p-4 text-center hover:shadow-md hover:-translate-y-0.5 transition-all border border-slate-200">
              <span className="text-2xl">{a.emoji}</span>
              <p className="text-xs font-semibold text-slate-700">{a.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Organisation Requests — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="month" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip contentStyle={{borderRadius:'8px',border:'none',fontSize:12}}/>
              <Bar dataKey="count" name="Requests" fill="#b45309" radius={[4,4,0,0]}/>
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
                  {pieData.map((e,i)=><Cell key={i} fill={PIE_COLORS[e.name]||'#94a3b8'}/>)}
                </Pie>
                <Tooltip contentStyle={{borderRadius:'8px',border:'none',fontSize:12}}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:11}}/>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Org-wide queue */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Active Procurement Requests</h3>
            <p className="text-xs text-slate-400 mt-0.5">Organisation-wide view of all requests in progress</p>
          </div>
        </div>
        {loadingQueue ? (
          <div className="space-y-3 p-6">{[1,2,3].map(i=><div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100"/>)}</div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-5xl mb-4">🏆</p>
            <h4 className="text-base font-semibold text-slate-700">No active requests</h4>
            <p className="text-sm text-slate-500 mt-1">All procurement requests have been processed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {['Req. #','Employee','Department','Item','Priority','Amount','Status','Date'].map(h=>(
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
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">{r.departmentName}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-slate-700" title={r.itemName}>{r.itemName}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><PriorityBadge priority={r.priority}/></td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-yellow-700">AED {(r.estimatedTotalPrice||0).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status}/></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NotificationWidget />
    </div>
  );
};

export default ChairmanDashboard;
