const CONFIG = {
  // ── Request lifecycle ──────────────────────────────────────────────────────
  Draft:                { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'   },
  Submitted:            { bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'    },
  'Under Review':       { bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-400'   },

  // ── Budget approval chain ──────────────────────────────────────────────────
  'Budget Check':       { bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500'  },
  'MD Review':          { bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-500'    },
  'Director Review':    { bg: 'bg-indigo-50',   text: 'text-indigo-700',  dot: 'bg-indigo-500'  },

  // ── Quotation stage ────────────────────────────────────────────────────────
  'Quotation Pending':  { bg: 'bg-cyan-50',     text: 'text-cyan-700',    dot: 'bg-cyan-500'    },
  'Quotation Review':   { bg: 'bg-teal-50',     text: 'text-teal-700',    dot: 'bg-teal-500'    },

  // ── Quotation approval chain ───────────────────────────────────────────────
  'Director Review2':   { bg: 'bg-indigo-50',   text: 'text-indigo-700',  dot: 'bg-indigo-400'  },

  // ── Purchase Order stage ───────────────────────────────────────────────────
  'PO Pending':         { bg: 'bg-sky-50',      text: 'text-sky-700',     dot: 'bg-sky-500'     },
  'PO Review':          { bg: 'bg-blue-50',     text: 'text-blue-700',    dot: 'bg-blue-500'    },
  'PO Sign':            { bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500'  },
  'PO Signed':          { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },

  // ── Goods Receipt stage ────────────────────────────────────────────────────
  'GRN Pending':        { bg: 'bg-orange-50',   text: 'text-orange-700',  dot: 'bg-orange-400'  },
  'GRN Review':         { bg: 'bg-amber-50',    text: 'text-amber-800',   dot: 'bg-amber-500'   },
  'GRN Review2':        { bg: 'bg-yellow-50',   text: 'text-yellow-800',  dot: 'bg-yellow-500'  },

  // ── Payment / Accounts stage ───────────────────────────────────────────────
  'Payment Pending':    { bg: 'bg-purple-50',   text: 'text-purple-700',  dot: 'bg-purple-500'  },
  'Payment Verification':{ bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', dot: 'bg-fuchsia-500' },

  // ── Terminal statuses ──────────────────────────────────────────────────────
  Completed:            { bg: 'bg-green-50',    text: 'text-green-700',   dot: 'bg-green-500'   },
  Rejected:             { bg: 'bg-red-50',      text: 'text-red-700',     dot: 'bg-red-500'     },
  Returned:             { bg: 'bg-orange-50',   text: 'text-orange-700',  dot: 'bg-orange-400'  },

  // ── Legacy (kept for backward compat) ─────────────────────────────────────
  'Purchase Order':     { bg: 'bg-emerald-50',  text: 'text-emerald-800', dot: 'bg-emerald-600' },
  Approved:             { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
};

const StatusBadge = ({ status, size = 'sm' }) => {
  const c  = CONFIG[status] || CONFIG.Draft;
  const px = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${px} ${c.bg} ${c.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
};

export default StatusBadge;
