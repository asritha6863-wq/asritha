import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import useAuth from '../../hooks/useAuth';
import requirementService from '../../services/requirementService';
import StatusBadge from '../../components/requirements/StatusBadge';
import PriorityBadge from '../../components/requirements/PriorityBadge';
import NotificationWidget from '../../components/common/NotificationWidget';

// ── Icons (inline SVG) ────────────────────────────────────────────────────────
const Icon = ({ d, className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d={d} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const PIE_COLORS = ['#1e3a5f','#2563eb','#f59e0b','#10b981','#ef4444','#f97316','#8b5cf6','#64748b'];

// ── Stat card ─────────────────────────────────────────────────────────────────
const DashStatCard = ({ label, value, color, bgColor, iconPath, onClick }) => (
  <button
    onClick={onClick}
    className={`card flex items-center gap-4 p-5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 w-full`}
  >
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bgColor}`}>
      <Icon d={iconPath} className={`h-6 w-6 ${color}`} />
    </div>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 text-3xl font-bold text-navy-800">{value}</p>
    </div>
  </button>
);

// ── Quick action button ───────────────────────────────────────────────────────
const QuickAction = ({ icon, label, onClick, color = 'text-navy-700', bg = 'bg-navy-50' }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all hover:shadow-md hover:-translate-y-0.5 border border-slate-200 bg-white w-full`}
  >
    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
      <span className={`text-xl ${color}`}>{icon}</span>
    </div>
    <p className="text-xs font-semibold text-slate-700 leading-tight">{label}</p>
  </button>
);

// ── Main Dashboard ────────────────────────────────────────────────────────────
const RequestingEmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    requirementService.getStats()
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Requirements', key: 'total',         color: 'text-navy-600',    bgColor: 'bg-navy-100',    icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2', filter: '' },
    { label: 'Drafts',             key: 'Draft',         color: 'text-slate-600',   bgColor: 'bg-slate-100',   icon: 'M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 0 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z', filter: 'Draft' },
    { label: 'Submitted',          key: 'Submitted',     color: 'text-blue-600',    bgColor: 'bg-blue-100',    icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8', filter: 'Submitted' },
    { label: 'Under Review',       key: 'Under Review',  color: 'text-amber-600',   bgColor: 'bg-amber-100',   icon: 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z', filter: 'Under Review' },
    { label: 'Approved',           key: 'Approved',      color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', filter: 'Approved' },
    { label: 'Rejected',           key: 'Rejected',      color: 'text-red-600',     bgColor: 'bg-red-100',     icon: 'M10 14l2-2m0 0 2-2m-2 2-2-2m2 2 2 2m7-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', filter: 'Rejected' },
    { label: 'Returned',           key: 'Returned',      color: 'text-orange-600',  bgColor: 'bg-orange-100',  icon: 'M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6 6-6', filter: 'Returned' },
    { label: 'Completed',          key: 'Completed',     color: 'text-purple-600',  bgColor: 'bg-purple-100',  icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', filter: 'Completed' },
  ];

  const quickActions = [
    { icon: '➕', label: 'New Requirement',   onClick: () => navigate('/requirements/new'),              bg: 'bg-navy-100'    },
    { icon: '📋', label: 'My Requirements',   onClick: () => navigate('/requirements'),                  bg: 'bg-blue-100'    },
    { icon: '📝', label: 'Drafts',            onClick: () => navigate('/requirements?status=Draft'),     bg: 'bg-slate-100'   },
    { icon: '⏳', label: 'Pending Requests',  onClick: () => navigate('/requirements?status=Submitted'), bg: 'bg-amber-100'   },
    { icon: '🔔', label: 'Notifications',     onClick: () => navigate('/notifications'),                 bg: 'bg-purple-100'  },
    { icon: '👤', label: 'My Profile',        onClick: () => navigate('/profile'),                       bg: 'bg-emerald-100' },
  ];

  // Build monthly chart data
  const monthlyData = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({ month: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), count: 0 });
    }
    if (stats?.monthly) {
      stats.monthly.forEach(({ _id, count }) => {
        const idx = months.findIndex(m => m.month === MONTH_NAMES[_id.month - 1] && m.year === _id.year);
        if (idx >= 0) months[idx].count = count;
      });
    }
    return months;
  })();

  // Pie data
  const pieData = stats ? [
    { name: 'Draft',        value: stats.stats.Draft },
    { name: 'Submitted',    value: stats.stats.Submitted },
    { name: 'Under Review', value: stats.stats['Under Review'] },
    { name: 'Approved',     value: stats.stats.Approved },
    { name: 'Rejected',     value: stats.stats.Rejected },
    { name: 'Returned',     value: stats.stats.Returned },
    { name: 'Completed',    value: stats.stats.Completed },
  ].filter(d => d.value > 0) : [];

  const categoryData = stats?.byCategory?.map(c => ({ name: c._id, value: c.count })) || [];

  return (
    <div className="space-y-6">
      {/* ── Welcome card ─────────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-navy-800 to-navy-600 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-navy-200">
                {now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {' · '}
                {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">
                Welcome back, {user?.firstName}! 👋
              </h1>
              <p className="mt-1 text-sm text-navy-200">
                {user?.role}
                {user?.designation?.designationName && ` · ${user.designation.designationName}`}
                {user?.department?.departmentName && ` · ${user.department.departmentName}`}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              {[
                { label: 'Total', val: stats?.stats.total ?? '—', color: 'text-white' },
                { label: 'Active', val: stats ? (stats.stats.Submitted + stats.stats['Under Review']) : '—', color: 'text-blue-200' },
                { label: 'Approved', val: stats?.stats.Approved ?? '—', color: 'text-emerald-300' },
                { label: 'Pending', val: stats?.stats.Draft ?? '—', color: 'text-amber-300' },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2">
                  <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-navy-200">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Employee info strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 bg-slate-50 px-6 py-3 text-sm">
          {/* Profile photo */}
          {user?.profileImage ? (
            <img
              src={user.profileImage.startsWith('http') ? user.profileImage : `${(import.meta.env.VITE_API_URL || '').replace('/api', '')}/${user.profileImage}`}
              alt={user.firstName}
              className="h-10 w-10 rounded-full object-cover border-2 border-pink-200 shrink-0"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-pink-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() : '—'}
            </div>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-600">
            <span><span className="font-semibold text-slate-400">Employee ID </span>{user?.employeeId}</span>
            <span><span className="font-semibold text-slate-400">Department </span>
              <span className="font-medium text-pink-700">{user?.department?.departmentName || '—'}</span>
            </span>
            <span><span className="font-semibold text-slate-400">Designation </span>
              <span className="font-medium text-pink-700">
                {typeof user?.designation === 'object'
                  ? (user.designation?.designationName || 'Staff')
                  : 'Staff'}
              </span>
            </span>
            <span><span className="font-semibold text-slate-400">Email </span>{user?.email}</span>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {quickActions.map(a => <QuickAction key={a.label} {...a} />)}
        </div>
      </div>

      {/* ── Stats cards ───────────────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card h-24 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {statCards.map(c => (
              <DashStatCard
                key={c.label}
                label={c.label}
                value={stats?.stats[c.key] ?? 0}
                color={c.color}
                bgColor={c.bgColor}
                iconPath={c.icon}
                onClick={() => c.filter ? navigate(`/requirements?status=${encodeURIComponent(c.filter)}`) : navigate('/requirements')}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly bar chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Monthly Requests (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,.1)', fontSize: 12 }} />
              <Bar dataKey="count" name="Requests" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status distribution pie */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Status Distribution</h3>
          {pieData.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 12 }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category bar chart */}
      {categoryData.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-700">Requests by Category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={60} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', fontSize: 12 }} />
              <Bar dataKey="value" name="Count" fill="#2563eb" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Recent Requests ───────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-700">Recent Requests</h3>
          <button onClick={() => navigate('/requirements')} className="text-xs font-medium text-navy-600 hover:underline">View all →</button>
        </div>
        {loading ? (
          <div className="space-y-3 p-6">
            {[1,2,3].map(i => <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        ) : !stats?.recentRequirements?.length ? (
          <div className="p-8 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm font-medium text-slate-700">No requirements yet</p>
            <p className="text-xs text-slate-500 mt-1">Create your first requirement to get started</p>
            <button onClick={() => navigate('/requirements/new')} className="btn-primary mt-4 text-sm">Create Requirement</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {['Req. Number','Item Name','Priority','Est. Amount','Status','Date'].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentRequirements.map(r => (
                  <tr key={r._id} className="cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => navigate(`/requirements/${r._id}`)}>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-navy-700">{r.requirementNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">{r.itemName}</td>
                    <td className="px-4 py-3"><PriorityBadge priority={r.priority} /></td>
                    <td className="px-4 py-3 font-medium">AED {(r.estimatedTotalPrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
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

export default RequestingEmployeeDashboard;
