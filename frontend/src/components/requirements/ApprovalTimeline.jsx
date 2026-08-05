import StatusBadge from './StatusBadge';

// Full ordered workflow steps matching backend state machine
const WORKFLOW_STEPS = [
  { label: 'Purchase Request Created',    statuses: ['Draft', 'Submitted'] },
  { label: 'SE Initial Review',           statuses: ['Under Review'] },
  { label: 'Budget Verification',         statuses: ['Budget Check', 'MD Review', 'Director Review'] },
  { label: 'Quotation Process',           statuses: ['Quotation Pending', 'Quotation Review', 'Director Review2'] },
  { label: 'Purchase Order',              statuses: ['PO Pending', 'PO Review', 'PO Sign', 'PO Signed'] },
  { label: 'Goods Receipt (GRN)',         statuses: ['GRN Pending', 'GRN Review', 'GRN Review2'] },
  { label: 'Accounts / 3-Way Matching',  statuses: ['Payment Pending', 'Payment Verification'] },
  { label: 'Finance Manager Approval',   statuses: ['Payment Approved'] },
  { label: 'Payment Processing',         statuses: ['Payment Processing'] },
  { label: 'Paid / Completed',           statuses: ['Paid', 'Completed'] },
];

const TERMINAL = ['Rejected', 'Returned'];

// Returns { stepIndex, isDone } for any status
const resolveStep = (status) => {
  if (status === 'Rejected' || status === 'Returned') return { stepIndex: -1, isDone: false, isTerminal: true };
  for (let i = 0; i < WORKFLOW_STEPS.length; i++) {
    if (WORKFLOW_STEPS[i].statuses.includes(status)) return { stepIndex: i, isDone: false, isTerminal: false };
  }
  return { stepIndex: 0, isDone: false, isTerminal: false };
};

const CheckIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
  </svg>
);

const ApprovalTimeline = ({ status, timeline = [] }) => {
  const { stepIndex, isTerminal } = resolveStep(status);
  const isCompleted = status === 'Completed';

  return (
    <div className="space-y-6">
      {/* ── Visual step tracker ─────────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute left-4 top-0 h-full w-0.5 bg-slate-200" />
        <ol className="space-y-3">
          {WORKFLOW_STEPS.map((step, i) => {
            const done   = isCompleted || i < stepIndex;
            const active = !isTerminal && i === stepIndex;
            return (
              <li key={step.label} className="relative flex items-start gap-4 pl-10">
                <span className={`absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors
                  ${done   ? 'border-emerald-500 bg-emerald-500 text-white' : ''}
                  ${active ? 'border-navy-600 bg-navy-600 text-white ring-2 ring-navy-200' : ''}
                  ${!done && !active ? 'border-slate-300 bg-white text-slate-400' : ''}`}>
                  {done ? <CheckIcon /> : i + 1}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className={`text-sm font-semibold ${active ? 'text-navy-700' : done ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {step.label}
                  </p>
                  {active && (
                    <p className="mt-0.5 text-xs text-slate-500">Current stage — <StatusBadge status={status} /></p>
                  )}
                </div>
              </li>
            );
          })}

          {/* Terminal node */}
          {isTerminal && (
            <li className="relative flex items-start gap-4 pl-10">
              <span className={`absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold
                ${status === 'Rejected' ? 'border-red-500 bg-red-500 text-white' : 'border-orange-400 bg-orange-400 text-white'}`}>
                {status === 'Rejected' ? '✕' : '↩'}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={`text-sm font-semibold ${status === 'Rejected' ? 'text-red-700' : 'text-orange-700'}`}>
                  {status}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {status === 'Rejected' ? 'Permanently rejected.' : 'Returned for correction — can be resubmitted.'}
                </p>
              </div>
            </li>
          )}
        </ol>
      </div>

      {/* ── Audit log ───────────────────────────────────────────────────── */}
      {timeline.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Activity Log</h4>
          <ol className="relative border-l border-slate-200 pl-6 space-y-4">
            {[...timeline].reverse().map((entry) => (
              <li key={entry._id} className="relative">
                <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-navy-500" />
                <p className="text-sm font-semibold text-slate-800">{entry.action}</p>
                {entry.actorName && (
                  <p className="text-xs text-slate-500">{entry.actorName} · {entry.role}</p>
                )}
                {entry.note && (
                  <p className="mt-1 text-xs italic text-slate-500">"{entry.note}"</p>
                )}
                {entry.toStatus && (
                  <span className="mt-1 inline-block">
                    <StatusBadge status={entry.toStatus} />
                  </span>
                )}
                <p className="mt-0.5 text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
};

export default ApprovalTimeline;
