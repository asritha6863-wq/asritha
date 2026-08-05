import { useState, useEffect } from 'react';

// AED thresholds — keep in sync with backend approvalController.js
const DM_THRESHOLD = 500;
const BC_THRESHOLD = 3000;

const BASE_CONFIG = {
  approve: {
    title: 'Approve',
    btnLabel: 'Approve',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    noteRequired: false,
    notePlaceholder: 'Optional: add a note for your approval...',
    icon: '✅',
    iconBg: 'bg-emerald-50',
  },
  reject: {
    title: 'Reject Requirement',
    btnLabel: 'Reject',
    btnClass: 'bg-red-600 hover:bg-red-700 text-white',
    noteRequired: true,
    notePlaceholder: 'Required: provide a reason for rejection...',
    icon: '❌',
    iconBg: 'bg-red-50',
  },
  return: {
    title: 'Return for Correction',
    btnLabel: 'Return',
    btnClass: 'bg-orange-500 hover:bg-orange-600 text-white',
    noteRequired: true,
    notePlaceholder: 'Required: describe what needs to be corrected...',
    icon: '↩️',
    iconBg: 'bg-orange-50',
  },
};

// Returns a routing-info banner for the approve action based on role + status
const getRoutingBanner = (userRole, type, total, reqStatus) => {
  if (type !== 'approve') return null;

  // ── SE: initial review ─────────────────────────────────────────────────────
  if (userRole === 'Senior Employee' && reqStatus === 'Submitted') {
    return {
      icon: '📋', bg: 'border-slate-200 bg-slate-50', titleColor: 'text-slate-800', descColor: 'text-slate-600',
      title: 'Forward to Department Manager',
      desc: 'Your approval confirms the request is complete and forwards it to the Department Manager for budget verification.',
      btnOverride: '✅ Approve & Forward to Dept Manager',
    };
  }

  // ── DM: initial review → budget routing ───────────────────────────────────
  if (userRole === 'Department Manager' && reqStatus === 'Under Review') {
    const over = total > DM_THRESHOLD;
    return {
      icon: over ? '💰' : '✅',
      bg: over ? 'border-violet-200 bg-violet-50' : 'border-emerald-200 bg-emerald-50',
      titleColor: over ? 'text-violet-800' : 'text-emerald-800',
      descColor: over ? 'text-violet-700' : 'text-emerald-700',
      title: over ? `Budget > AED ${DM_THRESHOLD.toLocaleString()} — Forward to Budget Controller` : `Budget ≤ AED ${DM_THRESHOLD.toLocaleString()} — Skip to Quotation Stage`,
      desc: over
        ? `AED ${total.toLocaleString()} exceeds the AED ${DM_THRESHOLD} threshold. Approving forwards to Budget Controller.`
        : `AED ${total.toLocaleString()} is within limit. Approving skips BC/MD and sends directly to SE for quotations.`,
      btnOverride: over ? 'Approve & Send to Budget Controller' : '✅ Approve — Request Quotations from SE',
    };
  }

  // ── BC ─────────────────────────────────────────────────────────────────────
  if (userRole === 'Budget Controller' && reqStatus === 'Budget Check') {
    const toMD = total > BC_THRESHOLD;
    return {
      icon: toMD ? '🏛️' : '📁',
      bg: toMD ? 'border-rose-200 bg-rose-50' : 'border-indigo-200 bg-indigo-50',
      titleColor: toMD ? 'text-rose-800' : 'text-indigo-800',
      descColor: toMD ? 'text-rose-700' : 'text-indigo-700',
      title: toMD ? 'Budget > AED 3,000 — Escalate to Managing Director' : 'Budget ≤ AED 3,000 — Forward to Department Head',
      desc: toMD
        ? `AED ${total.toLocaleString()} exceeds AED ${BC_THRESHOLD.toLocaleString()} — requires MD executive approval.`
        : `AED ${total.toLocaleString()} is within budget. Approving forwards to Dept Head for sign-off.`,
      btnOverride: toMD ? 'Approve & Escalate to MD' : 'Approve & Forward to Dept Head',
    };
  }

  // ── MD ─────────────────────────────────────────────────────────────────────
  if (userRole === 'Managing Director' && reqStatus === 'MD Review') {
    return {
      icon: '🏛️', bg: 'border-rose-200 bg-rose-50', titleColor: 'text-rose-800', descColor: 'text-rose-700',
      title: 'Executive Approval — Forward to Department Head',
      desc: `AED ${total.toLocaleString()} — Your approval forwards to the Department Head for final sign-off.`,
      btnOverride: '✅ Approve & Send to Dept Head',
    };
  }

  // ── Dept Head: Director Review → Quotation Pending ───────────────────────
  if (userRole === 'Department Director' && reqStatus === 'Director Review') {
    return {
      icon: '📁', bg: 'border-indigo-200 bg-indigo-50', titleColor: 'text-indigo-800', descColor: 'text-indigo-700',
      title: 'Approve — SE to Request Supplier Quotations',
      desc: 'Your approval triggers the quotation stage. The Senior Employee will be notified to collect and upload vendor quotations.',
      btnOverride: '✅ Approve & Request Quotations from SE',
    };
  }

  // ── SE: submit quotations ─────────────────────────────────────────────────
  if (userRole === 'Senior Employee' && reqStatus === 'Quotation Pending') {
    return {
      icon: '📤', bg: 'border-cyan-200 bg-cyan-50', titleColor: 'text-cyan-800', descColor: 'text-cyan-700',
      title: 'Submit Quotations to Department Manager',
      desc: 'Upload all quotations above, then submit. The Department Manager will review and forward to the Dept Head for quotation approval.',
      btnOverride: '📤 Submit Quotations to Dept Manager',
    };
  }

  // ── DM: approve quotations → Dept Head (quotation approval) ───────────────
  if (userRole === 'Department Manager' && reqStatus === 'Quotation Review') {
    return {
      icon: '📋', bg: 'border-teal-200 bg-teal-50', titleColor: 'text-teal-800', descColor: 'text-teal-700',
      title: 'Approve Quotations — Forward to Dept Head',
      desc: 'Review the quotations above. Approving forwards to the Department Head for quotation sign-off (not PO yet).',
      btnOverride: '✅ Approve Quotations & Forward to Dept Head',
    };
  }

  // ── Dept Head: approve quotations → SE uploads PO ──────────────────────────
  if (userRole === 'Department Director' && reqStatus === 'Director Review2') {
    return {
      icon: '✅', bg: 'border-indigo-200 bg-indigo-50', titleColor: 'text-indigo-800', descColor: 'text-indigo-700',
      title: 'Approve Quotations — SE to Upload PO',
      desc: 'Final quotation approval. The Senior Employee will prepare and upload the Purchase Order document for DM review.',
      btnOverride: '✅ Approve Quotations & Notify SE',
    };
  }

  // ── SE: submit PO document → DM review ────────────────────────────────────
  if (userRole === 'Senior Employee' && reqStatus === 'PO Pending') {
    return {
      icon: '📤', bg: 'border-sky-200 bg-sky-50', titleColor: 'text-sky-800', descColor: 'text-sky-700',
      title: 'Submit Purchase Order to Department Manager',
      desc: 'Upload the PO document above, then submit. The Department Manager will review before forwarding to the Dept Head for signature.',
      btnOverride: '📤 Submit PO to Dept Manager',
    };
  }

  // ── DM: PO review → Dept Head sign ────────────────────────────────────────
  if (userRole === 'Department Manager' && reqStatus === 'PO Review') {
    return {
      icon: '🛒', bg: 'border-blue-200 bg-blue-50', titleColor: 'text-blue-800', descColor: 'text-blue-700',
      title: 'Approve PO — Forward to Dept Head for Signature',
      desc: 'Review the Purchase Order document. Approving forwards to the Department Head for digital signature.',
      btnOverride: '✅ Approve PO & Forward to Dept Head',
    };
  }

  // ── Dept Head: digitally sign PO ──────────────────────────────────────────
  if (userRole === 'Department Director' && reqStatus === 'PO Sign') {
    return {
      icon: '✍️', bg: 'border-violet-200 bg-violet-50', titleColor: 'text-violet-800', descColor: 'text-violet-700',
      title: 'Digitally Sign the Purchase Order',
      desc: 'Review the Purchase Order document and sign. The Senior Employee will then email the signed PO to the supplier.',
      btnOverride: '✍️ Sign Purchase Order',
    };
  }

  // ── SE: confirm PO sent to supplier ──────────────────────────────────────
  if (userRole === 'Senior Employee' && reqStatus === 'PO Signed') {
    return {
      icon: '📧', bg: 'border-emerald-200 bg-emerald-50', titleColor: 'text-emerald-800', descColor: 'text-emerald-700',
      title: 'Confirm Purchase Order Emailed to Supplier',
      desc: 'Confirm you have emailed the signed PO to the supplier. Status will move to GRN Pending — prepare a GRN once goods arrive.',
      btnOverride: '📧 Confirm PO Sent to Supplier',
    };
  }

  // ── SE: submit GRN ────────────────────────────────────────────────────────
  if (userRole === 'Senior Employee' && reqStatus === 'GRN Pending') {
    return {
      icon: '📦', bg: 'border-orange-200 bg-orange-50', titleColor: 'text-orange-800', descColor: 'text-orange-700',
      title: 'Submit Goods Receipt Note to Dept Manager',
      desc: 'Upload the GRN document above (with delivery details), then submit to the Department Manager for review.',
      btnOverride: '📦 Submit GRN to Dept Manager',
    };
  }

  // ── DM: review GRN ────────────────────────────────────────────────────────
  if (userRole === 'Department Manager' && reqStatus === 'GRN Review') {
    return {
      icon: '📦', bg: 'border-amber-200 bg-amber-50', titleColor: 'text-amber-800', descColor: 'text-amber-700',
      title: 'Review GRN — Forward to Dept Head',
      desc: 'Verify the goods receipt details. Approving forwards to the Department Head for final GRN approval.',
      btnOverride: '✅ Approve GRN & Forward to Dept Head',
    };
  }

  // ── Dept Head: approve GRN ────────────────────────────────────────────────
  if (userRole === 'Department Director' && reqStatus === 'GRN Review2') {
    return {
      icon: '✅', bg: 'border-yellow-200 bg-yellow-50', titleColor: 'text-yellow-800', descColor: 'text-yellow-700',
      title: 'Approve GRN — SE to Submit Docs to Accountant',
      desc: 'Final GRN approval. The SE will then compile the signed PO, GRN, and supplier invoice to submit for payment.',
      btnOverride: '✅ Approve GRN & Notify SE',
    };
  }

  // ── SE: submit payment docs to Accountant ─────────────────────────────────
  if (userRole === 'Senior Employee' && reqStatus === 'Payment Pending') {
    return {
      icon: '💳', bg: 'border-purple-200 bg-purple-50', titleColor: 'text-purple-800', descColor: 'text-purple-700',
      title: 'Submit Documents to Senior Accountant',
      desc: 'Upload the supplier invoice above. Submitting sends PO + GRN + Invoice to the Senior Accountant for three-way matching.',
      btnOverride: '💳 Submit Docs to Senior Accountant',
    };
  }

  // ── Step 1: SA — 3-way match → JA journal entry ─────────────────────────
  if (userRole === 'Accountant' && reqStatus === 'Payment Verification') {
    return { icon:'🔍', bg:'border-fuchsia-200 bg-fuchsia-50', titleColor:'text-fuchsia-800', descColor:'text-fuchsia-700',
      title:'3-Way Match Verified — Send to Junior Accountant', desc:'Confirm all documents match. Junior Accountant will make the journal entry.', btnOverride:'✅ Verified — Send to JA for Journal Entry' };
  }
  // ── Step 2: JA — journal entry → SA review ───────────────────────────────
  if (userRole === 'Junior Accountant' && reqStatus === 'Journal Entry') {
    return { icon:'📝', bg:'border-blue-200 bg-blue-50', titleColor:'text-blue-800', descColor:'text-blue-700',
      title:'Submit Journal Entry to Senior Accountant', desc:'Save the journal entry details above, then submit for SA verification.', btnOverride:'📝 Submit Journal Entry' };
  }
  // ── Step 3: SA — verifies journal entry → FM ─────────────────────────────
  if (userRole === 'Accountant' && reqStatus === 'Journal Review') {
    return { icon:'✅', bg:'border-indigo-200 bg-indigo-50', titleColor:'text-indigo-800', descColor:'text-indigo-700',
      title:'Journal Entry Verified — Forward to Finance Manager', desc:'Verify the journal entry made by JA and forward to Finance Manager for payment approval.', btnOverride:'✅ Verified — Forward to Finance Manager' };
  }
  // ── Step 4: FM — approves → SA makes payment ─────────────────────────────
  if (userRole === 'Finance Manager' && reqStatus === 'FM Verification') {
    return { icon:'💰', bg:'border-teal-200 bg-teal-50', titleColor:'text-teal-800', descColor:'text-teal-700',
      title:'Approve Payment — Send to Senior Accountant', desc:'Review and approve the payment. Senior Accountant will enter payment details and process the payment.', btnOverride:'💰 Approve Payment' };
  }
  // ── Step 5: SA — enters payment → JA for filing ──────────────────────────
  if (userRole === 'Accountant' && reqStatus === 'Payment Entry') {
    return { icon:'💳', bg:'border-amber-200 bg-amber-50', titleColor:'text-amber-800', descColor:'text-amber-700',
      title:'Payment Made — Send to Junior Accountant for Filing', desc:'Enter payment details above and confirm payment is made. JA will file the documents.', btnOverride:'💳 Payment Made — Send for Filing' };
  }
  // ── Step 6: JA — files documents → Paid ─────────────────────────────────
  if (userRole === 'Junior Accountant' && reqStatus === 'Filing') {
    return { icon:'📁', bg:'border-cyan-200 bg-cyan-50', titleColor:'text-cyan-800', descColor:'text-cyan-700',
      title:'File Documents — Mark as Paid', desc:'Confirm all documents have been filed. This will close the procurement cycle.', btnOverride:'📁 Filed — Mark as Paid ✅' };
  }

  return null;
};

const ActionModal = ({ type, requirement, onConfirm, onClose, loading, userRole }) => {
  const [note, setNote] = useState('');
  const cfg = BASE_CONFIG[type];

  useEffect(() => { setNote(''); }, [type]);

  if (!cfg || !requirement) return null;

  const total  = requirement.estimatedTotalPrice || 0;
  const banner = getRoutingBanner(userRole, type, total, requirement.status);
  const canSubmit = !cfg.noteRequired || note.trim().length > 0;

  const getDesc = () => {
    if (banner) return null;
    if (type === 'approve') return 'Confirm approval. The requirement will be forwarded to the next stage.';
    if (type === 'reject')  return 'This will permanently reject the requirement.';
    return 'The requirement will be returned to the requesting employee for correction.';
  };

  // Override title with stage-specific label
  const title = banner && type === 'approve'
    ? banner.title
    : cfg.title;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl ${cfg.iconBg}`}>
            {banner?.icon || cfg.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {requirement.requirementNumber} — {requirement.itemName}
            </p>
          </div>
          <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Routing banner */}
          {banner && (
            <div className={`rounded-xl border p-4 flex items-start gap-3 ${banner.bg}`}>
              <span className="text-2xl mt-0.5 shrink-0">{banner.icon}</span>
              <div>
                <p className={`text-sm font-bold ${banner.titleColor}`}>{banner.title}</p>
                <p className={`text-xs mt-1 leading-relaxed ${banner.descColor}`}>{banner.desc}</p>
              </div>
            </div>
          )}

          {getDesc() && <p className="text-sm text-slate-600">{getDesc()}</p>}

          {/* Summary grid */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400">Requested by: </span>
              <span className="font-semibold text-slate-700">{requirement.employeeName}</span>
            </div>
            <div>
              <span className="text-slate-400">Priority: </span>
              <span className="font-semibold text-slate-700">{requirement.priority}</span>
            </div>
            <div>
              <span className="text-slate-400">Category: </span>
              <span className="font-semibold text-slate-700">{requirement.category}</span>
            </div>
            <div>
              <span className="text-slate-400">Est. Amount: </span>
              <span className="font-bold text-slate-700">AED {total.toLocaleString()}</span>
            </div>
          </div>

          {/* Note field */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {cfg.noteRequired ? 'Reason ' : 'Note '}
              {cfg.noteRequired && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500 resize-none"
              placeholder={cfg.notePlaceholder}
              value={note}
              onChange={e => setNote(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => canSubmit && onConfirm(note)}
            disabled={!canSubmit || loading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${cfg.btnClass}`}
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {banner?.btnOverride || cfg.btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
