const CONFIG = {
  Low:    { bg: 'bg-slate-100', text: 'text-slate-600', icon: '↓' },
  Medium: { bg: 'bg-blue-50',   text: 'text-blue-700',  icon: '→' },
  High:   { bg: 'bg-orange-50', text: 'text-orange-700',icon: '↑' },
  Urgent: { bg: 'bg-red-50',    text: 'text-red-700',   icon: '⚡' },
};

const PriorityBadge = ({ priority }) => {
  const c = CONFIG[priority] || CONFIG.Medium;
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${c.bg} ${c.text}`}>
      <span>{c.icon}</span>
      {priority}
    </span>
  );
};

export default PriorityBadge;
