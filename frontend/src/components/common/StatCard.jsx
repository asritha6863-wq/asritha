// Empty/placeholder statistics card shown on role dashboards ahead of future modules.
const StatCard = ({ label, value = '—', hint }) => {
  return (
    <div className="card p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-display font-bold text-navy-800">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
};

export default StatCard;
