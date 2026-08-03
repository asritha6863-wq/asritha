import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api';
import approvalService from '../../services/approvalService';
import NotificationWidget from '../../components/common/NotificationWidget';
import { ROLES, ALL_ROLES } from '../../constants/roles';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const ROLE_COLORS = {
  [ROLES.REQUESTING_EMPLOYEE]: '#2563eb',
  [ROLES.SENIOR_EMPLOYEE]:     '#0891b2',
  [ROLES.DEPARTMENT_MANAGER]:  '#f59e0b',
  [ROLES.BUDGET_CONTROLLER]:   '#8b5cf6',
  [ROLES.DEPARTMENT_DIRECTOR]: '#6366f1',
  [ROLES.MANAGING_DIRECTOR]:   '#e11d48',
  [ROLES.CHAIRMAN]:            '#b45309',
  [ROLES.ACCOUNTANT]:          '#a21caf',
  [ROLES.ADMIN]:               '#475569',
};

const StatCard = ({ label, value, color, bg, emoji, onClick, sub }) => (
  <button onClick={onClick}
    className="card flex items-center gap-4 p-5 text-left w-full transition-all hover:shadow-md hover:-translate-y-0.5">
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${bg}`}>{emoji}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className={`mt-0.5 text-3xl font-bold ${color}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </button>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  // Users state
  const [users, setUsers]               = useState([]);
  const [departments, setDepartments]   = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Procurement stats
  const [procStats, setProcStats]         = useState(null);
  const [loadingStats, setLoadingStats]   = useState(true);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const loadUsers = useCallback(async () => {
    try {
      const [u, d] = await Promise.all([
        api.get('/admin/users', { params: { limit: 100 } }),
        api.get('/admin/departments'),
      ]);
      setUsers(u.data.users || []);
      setDepartments(d.data.departments || []);
    } catch { } finally { setLoadingUsers(false); }
  }, []);

  const loadStats = useCallback(async () => {
    try { const { data } = await approvalService.getStats(); setProcStats(data); }
    catch { } finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { loadUsers(); loadStats(); }, [loadUsers, loadStats]);

  // Derived stats
  const totalUsers   = users.length;
  const activeUsers  = users.filter(u => u.isActive).length;
  const totalDepts   = departments.length;
  const activeDepts  = departments.filter(d => d.status === 'Active').length;

  // Users by role for bar chart
  const roleData = ALL_ROLES.map(r => ({
    role: r.split(' ').map(w => w[0]).join(''), // abbreviation
    fullRole: r,
    count: users.filter(u => u.role === r).length,
  })).filter(r => r.count > 0);

  // Procurement monthly chart
  const monthlyData = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months.push({ month: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), count: 0 });
    }
    procStats?.monthly?.forEach(({ _id, count }) => {
      const idx = months.findIndex(m => m.month === MONTH_NAMES[_id.month - 1] && m.year === _id.year);
      if (idx >= 0) months[idx].count = count;
    });
    return months;
  })();

  const procCompleted = procStats?.stats?.completed ?? 0;
  const procRejected  = procStats?.stats?.rejected  ?? 0;
  const procPending   = procStats?.byStatus
    ?.filter(s => !['Completed','Rejected','Returned','Draft'].includes(s._id))
    ?.reduce((s, x) => s + x.count, 0) ?? 0;

  // Recent 5 users
  const recentUsers = [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome card */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-300">
                {now.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                {' · '}{now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">Welcome, {user?.firstName}! ⚙️</h1>
              <p className="mt-1 text-sm text-slate-300">{user?.role} · System Administration</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              {[
                { label:'Total Users',  val: loadingUsers ? '…' : totalUsers,   color:'text-blue-300'    },
                { label:'Active Users', val: loadingUsers ? '…' : activeUsers,  color:'text-emerald-300' },
                { label:'Departments',  val: loadingUsers ? '…' : totalDepts,   color:'text-amber-300'   },
                { label:'In Progress',  val: loadingStats ? '…' : procPending,  color:'text-purple-300'  },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2">
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-slate-300">{s.label}</p>
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

      {/* System stats */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">System Overview</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard emoji="👥" label="Total Users"     value={totalUsers}   color="text-navy-700"   bg="bg-navy-50"    onClick={()=>navigate('/dashboard/admin/users')}    sub={`${activeUsers} active`}/>
          <StatCard emoji="🏢" label="Departments"     value={totalDepts}   color="text-amber-600"  bg="bg-amber-50"   onClick={()=>navigate('/dashboard/admin/departments')} sub={`${activeDepts} active`}/>
          <StatCard emoji="📋" label="Proc. In Progress" value={procPending} color="text-purple-600" bg="bg-purple-50"  onClick={()=>navigate('/review/queue')}               sub="Active requests"/>
          <StatCard emoji="✅" label="Proc. Completed" value={procCompleted} color="text-emerald-600" bg="bg-emerald-50" onClick={()=>navigate('/review/queue')}              sub={`${procRejected} rejected`}/>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Administration</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { emoji:'👥', label:'Manage Users',       onClick:()=>navigate('/dashboard/admin/users'),        bg:'bg-navy-50'    },
            { emoji:'🏢', label:'Manage Departments', onClick:()=>navigate('/dashboard/admin/departments'),  bg:'bg-amber-50'   },
            { emoji:'📋', label:'Procurement Queue',  onClick:()=>navigate('/review/queue'),                 bg:'bg-purple-50'  },
            { emoji:'🔔', label:'Notifications',      onClick:()=>navigate('/notifications'),                bg:'bg-blue-50'    },
          ].map(a=>(
            <button key={a.label} onClick={a.onClick}
              className="card flex flex-col items-center gap-2 p-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all border border-slate-200">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${a.bg}`}>{a.emoji}</div>
              <p className="text-xs font-semibold text-slate-700">{a.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Users by role */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Users by Role</h3>
          {loadingUsers ? (
            <div className="h-[200px] animate-pulse bg-slate-100 rounded-lg"/>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={roleData} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="role" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip
                  contentStyle={{borderRadius:'8px',border:'none',fontSize:12}}
                  formatter={(val, _, props) => [val, props.payload.fullRole]}
                />
                <Bar dataKey="count" name="Users" fill="#1e3a5f" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Procurement monthly */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Procurement Requests — Last 6 Months</h3>
          {loadingStats ? (
            <div className="h-[200px] animate-pulse bg-slate-100 rounded-lg"/>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{top:0,right:0,left:-20,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                <XAxis dataKey="month" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={{borderRadius:'8px',border:'none',fontSize:12}}/>
                <Bar dataKey="count" name="Requests" fill="#475569" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Departments table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Departments</h3>
            <p className="text-xs text-slate-400 mt-0.5">{totalDepts} total department{totalDepts !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={()=>navigate('/dashboard/admin/departments')} className="text-xs font-medium text-navy-600 hover:underline">Manage →</button>
        </div>
        {loadingUsers ? (
          <div className="space-y-3 p-6">{[1,2,3].map(i=><div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100"/>)}</div>
        ) : departments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No departments yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {['Department','Code','Head','Status'].map(h=>(
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departments.map(d=>(
                  <tr key={d._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{d.departmentName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.departmentCode}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {d.departmentHead ? `${d.departmentHead.firstName} ${d.departmentHead.lastName}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent users */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Recently Added Users</h3>
            <p className="text-xs text-slate-400 mt-0.5">{totalUsers} total users in the system</p>
          </div>
          <button onClick={()=>navigate('/dashboard/admin/users')} className="text-xs font-medium text-navy-600 hover:underline">Manage →</button>
        </div>
        {loadingUsers ? (
          <div className="space-y-3 p-6">{[1,2,3].map(i=><div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100"/>)}</div>
        ) : recentUsers.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No users yet. Run the seeder to add demo users.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {['Employee ID','Name','Role','Department','Status','Joined'].map(h=>(
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentUsers.map(u=>(
                  <tr key={u._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{u.employeeId}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{u.firstName} {u.lastName}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{u.role}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{u.department?.departmentName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notification widget */}
      <NotificationWidget />
    </div>
  );
};

export default AdminDashboard;
