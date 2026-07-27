import useAuth from '../../hooks/useAuth';
import StatCard from '../../components/common/StatCard';

// Shared layout for every role dashboard. Phase 1 only shows placeholder stats;
// each stat's label hints at the module that will populate it in a later phase.
const DashboardBase = ({ statLabels }) => {
  const { user } = useAuth();

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div className="card overflow-hidden">
        <div className="bg-navy-700 px-6 py-8 sm:px-8">
          <p className="text-sm font-medium text-navy-200">{today}</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Welcome back, {user?.firstName}</h1>
          <p className="mt-2 text-sm text-navy-100">
            {user?.role} · {user?.department?.departmentName || 'No department assigned'}
          </p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Overview</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statLabels.map((label) => (
            <StatCard key={label} label={label} value="—" hint="Available in a future phase" />
          ))}
        </div>
      </div>

      <div className="card p-6 text-center text-sm text-slate-500">
        Procurement, purchase orders, approvals, and payment workflows will appear here once those
        modules are built.
      </div>
    </div>
  );
};

export default DashboardBase;
