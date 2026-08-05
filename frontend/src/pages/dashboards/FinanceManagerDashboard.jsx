import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useAuth from '../../hooks/useAuth';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import PriorityBadge from '../../components/requirements/PriorityBadge';
import ActionModal from '../../components/approval/ActionModal';
import { toast } from '../../components/requirements/Toast';
import NotificationWidget from '../../components/common/NotificationWidget';

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const StatCard = ({ label, value, color, bg, emoji, pulse, sub }) => (
  <div className={`card flex items-center gap-4 p-5 ${pulse ? 'ring-2 ring-emerald-400 ring-offset-1' : ''}`}>
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${bg}`}>{emoji}</div>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 truncate">{label}</p>
      <p className={`mt-0.5 text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const FinanceManagerDashboard = () => {
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
    try { const { data } = await approvalService.getQueue({ limit: 15 }); setQueue(data.requirements || []); }
    catch { } finally { setLoadingQueue(false); }
  }, []);

  useEffect(() => { loadStats(); loadQueue(); }, [loadStats, loadQueue]);

  const handleAction = async (note) => {
    const { type, req } = modal;
    setActionLoading(true);
    try {
      if (type === 'approve') await approvalService.approve(req._id, note);
      if (type === 'reject')  await approvalService.reject(req._id, note);
      toast.success(type === 'approve'
        ? '✅ Payment approved. Sent back to Senior Accountant to enter payment details.'
        : '❌ Rejected.');
      setModal(null); loadStats(); loadQueue();
    } catch (err) { toast.error(err.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  const monthlyData = (() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      months.push({ month: MONTH_NAMES[d.getMonth()], count: 0 });
    }
    stats?.monthly?.forEach(({ _id, count }) => {
      const idx = months.findIndex((m, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        return MONTH_NAMES[_id.month - 1] === m.month;
      });
      if (idx >= 0) months[idx].count = count;
    });
    return months;
  })();

  const pending  = stats?.stats?.['FM Verification'] ?? 0;
  const paid     = stats?.stats?.['Paid'] ?? 0;
  const totalValue = queue.reduce((s, r) => s + (r.estimatedTotalPrice || 0), 0);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-600 px-6 py-7 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-emerald-200">
                {now.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
                {' · '}{now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'})}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">Welcome, {user?.firstName}! 💰</h1>
              <p className="mt-1 text-sm text-emerald-200">{user?.role} · Payment Confirmation</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-3">
              {[
                { label:'Awaiting Confirm', val: loadingStats ? '…' : pending,  color:'text-amber-300' },
                { label:'Paid',             val: loadingStats ? '…' : paid,     color:'text-emerald-300' },
                { label:'Total Value',      val: loadingStats ? '…' : `AED ${totalValue.toLocaleString()}`, color:'text-blue-300' },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-white/10 px-3 py-2">
                  <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-emerald-200">{s.label}</p>
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

      {/* Role info */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-start gap-3">
        <span className="text-2xl">💰</span>
        <div>
          <p className="text-sm font-semibold text-emerald-800">Finance Manager — Step 4: Payment Verification</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            The Senior Accountant has verified the journal entry and sends it for your approval.
            Review the journal entry details and approve. SA will then enter payment details and make the payment.
          </p>
        </div>
      </div>

      {/* Alert */}
      {!loadingStats && pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3">
          <span className="text-2xl animate-bounce">💰</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-800">{pending} payment{pending > 1 ? 's' : ''} awaiting your confirmation</p>
            <p className="text-xs text-emerald-700">Total value: <strong>AED {totalValue.toLocaleString()}</strong></p>
          </div>
          <button onClick={() => navigate('/review/queue')} className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Review Now →</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard emoji="💰" label="Awaiting Confirm" value={pending}  color="text-amber-600"   bg="bg-amber-50"   pulse={pending > 0} />
        <StatCard emoji="✅" label="Paid"             value={paid}    color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard emoji="❌" label="Rejected"         value={stats?.stats?.rejected ?? 0} color="text-red-600" bg="bg-red-50" />
        <StatCard emoji="📊" label="Total Processed"  value={(stats?.stats?.['Payment Processing'] ?? 0) + paid} color="text-blue-600" bg="bg-blue-50" />
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
            <Bar dataKey="count" name="Payments" fill="#059669" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Queue */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Payment Verification Queue</h3>
            <p className="text-xs text-slate-400 mt-0.5">Journal entries verified by SA — awaiting your approval before payment</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">{queue.length} pending</span>
        </div>
        {loadingQueue ? (
          <div className="space-y-3 p-6">{[1,2,3].map(i=><div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100"/>)}</div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-5xl mb-4">💰</p>
            <h4 className="text-base font-semibold text-slate-700">No payments pending confirmation</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {['Req. #','Employee','Item','Invoice Amount','Status','Date','Actions'].map(h=>(
                    <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.map(r=>(
                  <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">{r.requirementNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">{r.employeeName}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-slate-700">{r.itemName}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-emerald-700">
                      AED {(r.invoiceAmount || r.estimatedTotalPrice || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={r.status}/></td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button onClick={()=>navigate(`/review/${r._id}`)} className="rounded-md bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">View</button>
                        <button onClick={()=>setModal({type:'approve',req:r})} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700">💰 Confirm</button>
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

      {modal && <ActionModal type={modal.type} requirement={modal.req} onConfirm={handleAction} onClose={()=>setModal(null)} loading={actionLoading} userRole={user?.role}/>}
      <NotificationWidget />
    </div>
  );
};

export default FinanceManagerDashboard;
