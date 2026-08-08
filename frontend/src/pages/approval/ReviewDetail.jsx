import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fileUrl, isLocalPath } from '../../utils/fileUrl';
import approvalService from '../../services/approvalService';
import FileViewer from '../../components/common/FileViewer';
import StatusBadge from '../../components/requirements/StatusBadge';
import PriorityBadge from '../../components/requirements/PriorityBadge';
import ApprovalTimeline from '../../components/requirements/ApprovalTimeline';
import ActionModal from '../../components/approval/ActionModal';
import { toast } from '../../components/requirements/Toast';
import useAuth from '../../hooks/useAuth';
import Button from '../../components/common/Button';
import { printPO } from '../../utils/printPO';

// AED thresholds — must match backend
const DM_THRESHOLD = 500;
const BC_THRESHOLD = 3000;

// Which status(es) each role can act on (mirrors backend WORKFLOW map)
const ACTION_STATUS_MAP = {
  'Senior Employee':     ['Submitted', 'Quotation Pending', 'PO Pending', 'PO Signed', 'GRN Pending', 'Payment Pending'],
  'Department Manager':  ['Under Review', 'Quotation Review', 'PO Review', 'GRN Review'],
  'Budget Controller':   ['Budget Check'],
  'Managing Director':   ['MD Review'],
  'Department Director': ['Director Review', 'Director Review2', 'PO Sign', 'GRN Review2'],
  'Accountant':          ['Payment Verification', 'Journal Review', 'Payment Entry'],
  'Finance Manager':     ['FM Verification'],
  'Junior Accountant':   ['Journal Entry', 'Filing'],
};

const FINAL_STATUSES   = ['Completed', 'Rejected', 'Returned'];
const ACTIVE_STATUSES  = [
  'Submitted','Under Review','Budget Check','MD Review','Director Review','Director Review2',
  'Quotation Pending','Quotation Review','PO Pending','PO Review','PO Sign','PO Signed',
  'GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification',
];

const Section = ({ title, children }) => (
  <div className="card p-6">
    <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
    {children}
  </div>
);

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
  </div>
);

// Routing info banner config for review page header
const getBudgetBanner = (role, canAct, total, reqStatus) => {
  if (!canAct) return null;
  if (role === 'Department Manager' && reqStatus === 'Under Review') {
    const over = total > DM_THRESHOLD;
    return {
      icon: over ? '💰' : '✅',
      border: over ? 'border-violet-300 bg-violet-50' : 'border-emerald-200 bg-emerald-50',
      titleColor: over ? 'text-violet-800' : 'text-emerald-800',
      descColor:  over ? 'text-violet-700' : 'text-emerald-700',
      title: over ? `Budget > AED ${DM_THRESHOLD} — Will forward to Budget Controller` : `Budget ≤ AED ${DM_THRESHOLD} — Forward directly to SE for quotations`,
      desc:  over
        ? `AED ${total.toLocaleString()} exceeds threshold. Approval sends to Budget Controller.`
        : `AED ${total.toLocaleString()} is within limit. Approval skips BC/MD and goes to SE.`,
    };
  }
  if (role === 'Budget Controller') {
    const toMD = total > BC_THRESHOLD;
    return {
      icon: toMD ? '🏛️' : '📁',
      border: toMD ? 'border-rose-200 bg-rose-50' : 'border-indigo-200 bg-indigo-50',
      titleColor: toMD ? 'text-rose-800' : 'text-indigo-800',
      descColor:  toMD ? 'text-rose-700' : 'text-indigo-700',
      title: toMD ? 'Budget > AED 3,000 — Will escalate to MD' : 'Budget ≤ AED 3,000 — Forward to Dept Head',
      desc:  toMD
        ? `AED ${total.toLocaleString()} exceeds AED ${BC_THRESHOLD.toLocaleString()} — needs MD executive approval.`
        : `AED ${total.toLocaleString()} approved by BC — forwarded to Dept Head.`,
    };
  }
  const MAP = {
    'Managing Director':   { icon:'🏛️', border:'border-rose-200 bg-rose-50',    titleColor:'text-rose-800',    descColor:'text-rose-700',    title:'MD Approval — Forward to Dept Head',              desc:`AED ${total.toLocaleString()} — your approval forwards to Dept Head.` },
    'Department Director': {
      'Director Review':  { icon:'📁', border:'border-indigo-200 bg-indigo-50', titleColor:'text-indigo-800', descColor:'text-indigo-700', title:'Approve — SE to Collect Quotations',              desc:'Your approval triggers the quotation stage.' },
      'Director Review2': { icon:'📋', border:'border-indigo-200 bg-indigo-50', titleColor:'text-indigo-800', descColor:'text-indigo-700', title:'Approve Quotations — SE to Upload PO',              desc:'Review quotations below. SE will upload the PO document next (not signed yet).' },
      'PO Sign':          { icon:'✍️', border:'border-violet-200 bg-violet-50', titleColor:'text-violet-800', descColor:'text-violet-700', title:'Digitally Sign the Purchase Order',               desc:'DM approved the PO. Sign below; SE will email to supplier.' },
      'GRN Review2':      { icon:'✅', border:'border-yellow-200 bg-yellow-50', titleColor:'text-yellow-800', descColor:'text-yellow-700', title:'Approve GRN — SE to Submit Payment Docs',         desc:'Final GRN approval. SE will compile PO+GRN+Invoice for Accountant.' },
    },
    'Senior Employee': {
      'Quotation Pending': { icon:'📤', border:'border-cyan-200 bg-cyan-50',    titleColor:'text-cyan-800',   descColor:'text-cyan-700',   title:'Submit Quotations to Dept Manager',               desc:'Upload quotations above then submit.' },
      'PO Pending':        { icon:'🛒', border:'border-sky-200 bg-sky-50',      titleColor:'text-sky-800',    descColor:'text-sky-700',    title:'Upload & Submit PO to Dept Manager',              desc:'Upload PO on the dedicated page, then submit for DM review.' },
      'PO Signed':         { icon:'📧', border:'border-emerald-200 bg-emerald-50', titleColor:'text-emerald-800', descColor:'text-emerald-700', title:'Confirm PO Emailed to Supplier',             desc:'Confirm the signed PO was sent. Status moves to GRN Pending.' },
      'GRN Pending':       { icon:'📦', border:'border-orange-200 bg-orange-50',titleColor:'text-orange-800', descColor:'text-orange-700', title:'Submit GRN to Dept Manager',                      desc:'Upload GRN document and submit for review.' },
      'Payment Pending':   { icon:'💳', border:'border-purple-200 bg-purple-50',titleColor:'text-purple-800', descColor:'text-purple-700', title:'Submit PO + GRN + Invoice to Senior Accountant',  desc:'Upload supplier invoice then submit for 3-way matching.' },
    },
    'Department Manager': {
      'Quotation Review': { icon:'📋', border:'border-teal-200 bg-teal-50',     titleColor:'text-teal-800',   descColor:'text-teal-700',   title:'Review Quotation Comparison — Forward to Dept Head',       desc:'The SE has compared 3 vendor quotations. Review the Q1/Q2/Q3 comparison table below with the SE\'s recommended vendor, then approve to forward to Dept Head.' },
      'PO Review':        { icon:'🛒', border:'border-blue-200 bg-blue-50',     titleColor:'text-blue-800',   descColor:'text-blue-700',   title:'Review PO — Forward to Dept Head to Sign',        desc:'Verify PO document and forward to Dept Head for signature.' },
      'GRN Review':       { icon:'📦', border:'border-amber-200 bg-amber-50',   titleColor:'text-amber-800',  descColor:'text-amber-700',  title:'Review GRN — Forward to Dept Head',               desc:'Verify receipt and forward to Dept Head for final GRN approval.' },
    },
    'Accountant': { icon:'🔍', border:'border-fuchsia-200 bg-fuchsia-50', titleColor:'text-fuchsia-800', descColor:'text-fuchsia-700', title:'Three-Way Matching Required',                       desc:'Verify PO, GRN, and Invoice all match before approving.' },
  };

  const val = MAP[role];
  if (!val) return null;
  if (typeof val.title === 'string') return val; // flat entry (MD, Accountant)
  return val[reqStatus] || null; // nested by status
};

const ReviewDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [req, setReq]               = useState(null);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // 'approve'|'reject'|'return'
  const [actionLoading, setActionLoading] = useState(false);
  const [comment, setComment]       = useState('');
  const [viewerFile, setViewerFile] = useState(null); // { path, name }
  const [journalModal, setJournalModal] = useState(false);
  const [journalForm, setJournalForm]   = useState({
    entryNumber: '', entryDate: new Date().toISOString().split('T')[0],
    voucherType: 'Payment Voucher', referenceNo: '',
    debitAccount: '', creditAccount: '', amount: '', narration: '',
  });
  const [journalFile,    setJournalFile]    = useState(null);
  const [journalLoading, setJournalLoading] = useState(false);
  const journalFileRef = useRef(null);
  const [paymentFile,    setPaymentFile]    = useState(null);
  const paymentFileRef = useRef(null);
  const [commentLoading, setCommentLoading] = useState(false);
  // SE quotation upload state
  const [quotFiles, setQuotFiles]   = useState([]);
  const [quotUploading, setQuotUploading] = useState(false);

  const load = async () => {
    try {
      const { data } = await approvalService.getOne(id);
      const r = data.requirement;
      setReq(r);
      // Pre-fill journal form with invoice amount and narration
      setJournalForm(prev => ({
        ...prev,
        amount:    r.invoiceAmount || r.estimatedTotalPrice || '',
        narration: `Payment for ${r.itemName || ''} — ${r.requirementNumber || ''}`,
      }));
    } catch {
      toast.error('Failed to load requirement');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const canAct = req && (ACTION_STATUS_MAP[user?.role] || []).includes(req.status);
  const total  = req?.estimatedTotalPrice || 0;
  const banner = getBudgetBanner(user?.role, canAct, total, req?.status);

  const getSuccessMsg = (action) => {
    if (action !== 'approve') return action === 'reject' ? 'Requirement rejected.' : 'Requirement returned for correction.';
    const role = user?.role; const status = req?.status;
    if (role === 'Senior Employee')     return status === 'Submitted' ? 'Forwarded to Department Manager.' : status === 'Quotation Pending' ? 'Quotations submitted to DM.' : status === 'PO Pending' ? 'PO submitted to Department Manager.' : status === 'PO Signed' ? 'PO confirmed sent. Awaiting delivery.' : status === 'GRN Pending' ? 'GRN submitted to Dept Manager.' : 'Documents submitted to Senior Accountant.';
    if (role === 'Department Manager')  return status === 'Under Review' ? (total > DM_THRESHOLD ? 'Forwarded to Budget Controller.' : 'Forwarded to SE for quotations.') : status === 'Quotation Review' ? 'Quotations approved. Forwarded to Dept Head.' : status === 'PO Review' ? 'PO approved. Forwarded to Dept Head for signature.' : 'GRN reviewed. Forwarded to Dept Head.';
    if (role === 'Budget Controller')   return total > BC_THRESHOLD ? 'Escalated to Managing Director.' : 'Forwarded to Department Head.';
    if (role === 'Managing Director')   return 'Forwarded to Department Head.';
    if (role === 'Department Director') return status === 'Director Review' ? 'Approved. SE to upload quotations.' : status === 'Director Review2' ? 'Quotations approved. SE to upload PO.' : status === 'PO Sign' ? 'PO signed. SE to email supplier.' : 'GRN approved. SE to submit payment docs.';
    if (role === 'Accountant')          return '✅ Three-way match passed. Invoice approved for payment!';
    return 'Approved.';
  };

  const handleAction = async (note) => {
    setActionLoading(true);
    try {
      if (modal === 'approve') await approvalService.approve(id, note);
      if (modal === 'reject')  await approvalService.reject(id, note);
      if (modal === 'return')  await approvalService.returnReq(id, note);
      toast.success(getSuccessMsg(modal));
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  // ── JA: journal entry completed ─────────────────────────────────────────
  const handleJournalSubmit = async () => {
    setJournalLoading(true);
    try {
      // Mark journal entry as done (no form needed) and send to SA
      await approvalService.saveJournalEntry(id, {
        entryNumber: `JE-${req.requirementNumber}`,
        entryDate: new Date().toISOString().split('T')[0],
        amount: req.invoiceAmount || req.estimatedTotalPrice || 0,
        narration: `Journal entry completed for ${req.requirementNumber}`,
      }, null);
      await approvalService.approve(id, 'Journal entry completed by Junior Accountant. Sent to Senior Accountant for verification.');
      toast.success('✅ Sent to Senior Accountant for verification.');
      const { data } = await approvalService.getOne(id); setReq(data.requirement);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setJournalLoading(false); }
  };

  // ── SA: payment completed + optional file upload ─────────────────────────
  const handlePaymentDone = async () => {
    setActionLoading(true);
    try {
      // If file uploaded, save payment record with file first
      if (paymentFile) {
        const form = new FormData();
        form.append('paymentRef', `PAY-${req.requirementNumber}`);
        form.append('paymentDate', new Date().toISOString().split('T')[0]);
        form.append('paymentMethod', 'Bank Transfer');
        form.append('amountPaid', req.invoiceAmount || req.estimatedTotalPrice || 0);
        form.append('file', paymentFile);
        await approvalService.savePaymentRecord(id, form);
      } else {
        await approvalService.savePaymentRecord(id, {
          paymentRef:    `PAY-${req.requirementNumber}`,
          paymentDate:   new Date().toISOString().split('T')[0],
          paymentMethod: 'Bank Transfer',
          amountPaid:    req.invoiceAmount || req.estimatedTotalPrice || 0,
        });
      }
      await approvalService.approve(id, 'Payment completed by Senior Accountant. Sent to Junior Accountant for filing.');
      toast.success('💳 Payment done — sent to Junior Accountant for filing.');
      setPaymentFile(null);
      const { data } = await approvalService.getOne(id); setReq(data.requirement);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setActionLoading(false); }
  };

  // ── JA: filing ───────────────────────────────────────────────────────────
  const handleFiling = async () => {
    setActionLoading(true);
    try {
      await approvalService.approve(id, 'All documents filed by Junior Accountant. Procurement cycle closed.');
      toast.success('📁 Filed — procurement cycle complete!');
      const { data } = await approvalService.getOne(id); setReq(data.requirement);
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    setCommentLoading(true);
    try {
      await approvalService.addComment(id, comment);
      setComment('');
      toast.success('Comment added');
      await load();
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setCommentLoading(false);
    }
  };

  const addQuotFiles = (files) => {
    const ALLOWED = ['.pdf','.doc','.docx','.xls','.xlsx','.jpg','.jpeg','.png'];
    const valid = files.filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      if (!ALLOWED.includes(ext)) { toast.error(`${f.name}: type not allowed`); return false; }
      if (f.size > 20*1024*1024)  { toast.error(`${f.name}: exceeds 20MB`); return false; }
      return true;
    });
    setQuotFiles(prev => [...prev, ...valid]);
  };

  const handleQuotUploadAndSubmit = async () => {
    // Accept either: old-style file uploads OR new quotation comparison form data
    const hasOldQuotations = req.quotations && req.quotations.length > 0;
    const qc = req.quotationComparison;
    const hasComparisonData = qc && (qc.q1?.vendorName || qc.q2?.vendorName || qc.q3?.vendorName);
    if (quotFiles.length === 0 && !hasOldQuotations && !hasComparisonData) {
      toast.error('Please fill in Q1/Q2/Q3 comparison on the quotation page before submitting.'); return;
    }
    if (quotFiles.length > 0) {
      setQuotUploading(true);
      try { await approvalService.uploadQuotations(id, quotFiles); setQuotFiles([]); await load(); }
      catch (err) { toast.error(err.message || 'Upload failed'); setQuotUploading(false); return; }
      setQuotUploading(false);
    }
    setModal('approve');
  };

  const removeQuotExisting = async (qId) => {
    try { await approvalService.removeQuotation(id, qId); toast.success('Removed'); await load(); }
    catch { toast.error('Remove failed'); }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent" />
    </div>
  );
  if (!req) return null;

  const fmtSize = (b) => b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;

  // Render a View button, or a "not available" notice for dead local files
  const FileLinks = ({ path, name, label = '' }) => {
    if (!path) return null;
    if (isLocalPath(path)) {
      return (
        <span className="text-xs text-slate-400 italic">
          ⚠️ File unavailable — re-upload needed
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setViewerFile({ path, name: name || path.split('/').pop() })}
        className="inline-flex items-center gap-1 rounded-md bg-pink-600 px-3 py-1 text-xs font-semibold text-white hover:bg-pink-700 transition-colors">
        👁️ View{label}
      </button>
    );
  };

  const isSEQuotPending   = user?.role === 'Senior Employee' && req.status === 'Quotation Pending';
  const isSEPOPending     = user?.role === 'Senior Employee' && req.status === 'PO Pending';
  const isSEPOSigned      = user?.role === 'Senior Employee' && req.status === 'PO Signed';
  const isSEGRNPending    = user?.role === 'Senior Employee' && req.status === 'GRN Pending';
  const isSEPayPending    = user?.role === 'Senior Employee' && req.status === 'Payment Pending';
  const isDMQuotReview    = user?.role === 'Department Manager' && req.status === 'Quotation Review';
  const isDMPOReview      = user?.role === 'Department Manager' && req.status === 'PO Review';
  const isDDQuotApproval  = user?.role === 'Department Director' && req.status === 'Director Review2';
  const isDDPOSign        = user?.role === 'Department Director' && req.status === 'PO Sign';
  const isAccVerification = user?.role === 'Accountant' && req.status === 'Payment Verification';
  const statusIsFinal     = FINAL_STATUSES.includes(req.status);
  const statusIsActive    = ACTIVE_STATUSES.includes(req.status);

  // Dedicated upload pages for SE stages
  const seStagePage = {
    'PO Pending':      `/review/${id}/po`,
    'GRN Pending':     `/review/${id}/grn`,
    'Payment Pending': `/review/${id}/invoice`,
  }[req.status];

  // DD dedicated page for signing PO
  const ddSignPage = (user?.role === 'Department Director' && req.status === 'PO Sign')
    ? `/review/${id}/po-sign` : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-navy-800 font-mono">{req.requirementNumber}</h1>
            <StatusBadge status={req.status} size="lg" />
            <PriorityBadge priority={req.priority} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Requested by <span className="font-semibold">{req.employeeName}</span>
            {' · '}{req.departmentName}
            {' · '}{new Date(req.createdAt).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => navigate(-1)} className="btn-secondary text-sm">← Back</button>
          {/* SE stages with dedicated upload pages */}
          {canAct && seStagePage && (
            <button onClick={() => navigate(seStagePage)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors">
              {req.status === 'GRN Pending' ? '📦 Upload GRN' : req.status === 'PO Pending' ? '🛒 Upload PO' : '💳 Upload Invoice'}
            </button>
          )}
          {/* DD: PO Sign dedicated page */}
          {ddSignPage && (
            <button onClick={() => navigate(ddSignPage)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors">
              ✍️ Sign PO
            </button>
          )}
          {canAct && !seStagePage && !ddSignPage && (
            <>
              <button onClick={() => setModal('return')} className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition-colors">↩ Return</button>
              <button onClick={() => setModal('reject')} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors">✕ Reject</button>
              <button onClick={() => setModal('approve')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors shadow-sm">✓ Approve</button>
            </>
          )}
        </div>
      </div>

      {/* ── Routing banner ─────────────────────────────────────────────── */}
      {banner && (
        <div className={`rounded-xl border px-5 py-4 flex items-start gap-3 ${banner.border}`}>
          <span className="text-2xl">{banner.icon}</span>
          <div>
            <p className={`text-sm font-bold ${banner.titleColor}`}>{banner.title}</p>
            <p className={`text-xs mt-0.5 leading-relaxed ${banner.descColor}`}>{banner.desc}</p>
          </div>
        </div>
      )}

      {/* SE: navigate to dedicated upload pages */}
      {canAct && seStagePage && (
        <div className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4
          ${req.status === 'GRN Pending'     ? 'border-orange-300 bg-orange-50' :
            req.status === 'PO Pending'      ? 'border-sky-300 bg-sky-50' :
                                               'border-purple-300 bg-purple-50'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {req.status === 'GRN Pending' ? '📦' : req.status === 'PO Pending' ? '🛒' : '💳'}
            </span>
            <div>
              <p className={`text-sm font-bold
                ${req.status === 'GRN Pending' ? 'text-orange-800' : req.status === 'PO Pending' ? 'text-sky-800' : 'text-purple-800'}`}>
                {req.status === 'GRN Pending' ? 'Upload Goods Receipt Note'
                  : req.status === 'PO Pending' ? 'Upload Purchase Order for DM Review'
                  : 'Upload Supplier Invoice'}
              </p>
              <p className={`text-xs mt-0.5
                ${req.status === 'GRN Pending' ? 'text-orange-700' : req.status === 'PO Pending' ? 'text-sky-700' : 'text-purple-700'}`}>
                {req.status === 'GRN Pending'
                  ? 'Goods received. Prepare GRN, fill delivery details, and submit to Dept Manager.'
                  : req.status === 'PO Pending'
                  ? 'Dept Head approved quotations. Prepare the PO document, upload, then submit to DM for review.'
                  : 'GRN approved. Upload the supplier invoice and submit to the Senior Accountant for 3-way matching.'}
              </p>
            </div>
          </div>
          <button onClick={() => navigate(seStagePage)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-bold text-white
              ${req.status === 'GRN Pending' ? 'bg-orange-600 hover:bg-orange-700'
                : req.status === 'PO Pending' ? 'bg-sky-600 hover:bg-sky-700'
                : 'bg-purple-600 hover:bg-purple-700'}`}>
            Go to Upload →
          </button>
        </div>
      )}

      {/* DD: navigate to PO Sign upload page */}
      {ddSignPage && (
        <div className="rounded-xl border border-violet-300 bg-violet-50 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">✍️</span>
            <div>
              <p className="text-sm font-bold text-violet-800">Sign the Purchase Order</p>
              <p className="text-xs text-violet-700 mt-0.5">
                Download the PO, sign it offline, upload the signed version, then confirm.
                The Senior Employee will email the signed PO to the supplier.
              </p>
            </div>
          </div>
          <button onClick={() => navigate(ddSignPage)}
            className="shrink-0 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
            ✍️ Sign PO →
          </button>
        </div>
      )}

      {/* Final status banner */}
      {statusIsFinal && (
        <div className={`rounded-xl border px-5 py-3 text-sm font-medium flex items-center gap-2
          ${req.status === 'Completed' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : ''}
          ${req.status === 'Rejected'  ? 'border-red-200 bg-red-50 text-red-800' : ''}
          ${req.status === 'Returned'  ? 'border-orange-200 bg-orange-50 text-orange-800' : ''}`}>
          {req.status === 'Completed' ? '✅' : req.status === 'Rejected' ? '❌' : '↩️'}
          <span>This requirement has been <strong className="mx-1">{req.status.toLowerCase()}</strong>
            {req.status === 'Returned' && ' — the requesting employee can resubmit after corrections.'}
            {req.status === 'Completed' && ' — invoice approved for payment. Process complete!'}
          </span>
        </div>
      )}

      {/* In-progress status banner */}
      {statusIsActive && !canAct && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm flex items-center gap-2 text-amber-800">
          <span>⏳</span> Currently <strong className="mx-1">{req.status}</strong>
          {req.currentApproverRole && <span>— waiting for <strong>{req.currentApproverRole}</strong></span>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">

          {/* Employee Info */}
          <Section title="Employee Information">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Employee Name"  value={req.employee?.firstName ? `${req.employee.firstName} ${req.employee.lastName}` : req.employeeName} />
              <Info label="Employee ID"   value={req.employee?.employeeId || req.employeeId} />
              <Info label="Department"    value={req.departmentName} />
              <Info label="Designation"   value={req.designationName} />
              <Info label="Request Date"  value={new Date(req.createdAt).toLocaleDateString()} />
              {req.submittedAt && <Info label="Submitted At" value={new Date(req.submittedAt).toLocaleString()} />}
            </div>
          </Section>

          {/* Item Details */}
          <Section title="Item Details">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Category"       value={req.category} />
              <Info label="Item Name"      value={req.itemName} />
              <Info label="Brand"          value={req.brand} />
              <Info label="Model"          value={req.model} />
              <Info label="Quantity"       value={req.quantity} />
              <Info label="Unit"           value={req.unit} />
              <Info label="Est. Unit Price" value={`AED ${(req.estimatedUnitPrice||0).toLocaleString()}`} />
              <Info label="Est. Total"     value={`AED ${(req.estimatedTotalPrice||0).toLocaleString()}`} />
            </div>
            {req.specification && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500 mb-1">Technical Specification</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.specification}</p>
              </div>
            )}
          </Section>

          {/* Purchase Details */}
          <Section title="Purchase Details">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Info label="Priority"           value={<PriorityBadge priority={req.priority} />} />
              <Info label="Required By"        value={new Date(req.requiredDate).toLocaleDateString()} />
              <Info label="Delivery Location"  value={req.deliveryLocation} />
            </div>
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Purpose / Justification</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.purpose}</p>
            </div>
          </Section>

          {/* Attachments */}
          <Section title={`Attachments (${req.attachments?.length || 0})`}>
            {!req.attachments?.length ? <p className="text-sm text-slate-400 italic">No attachments.</p> : (
              <div className="space-y-2">
                {req.attachments.map(att => {
                  const isPDF = att.mimeType === 'application/pdf' || att.originalName?.toLowerCase().endsWith('.pdf');
                  const isImage = att.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(att.originalName);
                  return (
                    <div key={att._id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl">{isPDF ? '📄' : isImage ? '🖼️' : '📎'}</span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{att.originalName}</p>
                          <p className="text-xs text-slate-500">{fmtSize(att.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <FileLinks path={att.path} name={att.originalName} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── Quotation Comparison Table (visible from Quotation Review onwards) ── */}
          {(req.quotationComparison?.preparedBy || ['Quotation Review','Director Review2','PO Pending','PO Review','PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status)) && req.quotationComparison && (
            <Section title="📊 Quotation Comparison (Q1 / Q2 / Q3)">
              {/* Header row */}
              <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs text-slate-500">
                    Prepared by <span className="font-semibold">{req.quotationComparison.preparedBy}</span>
                    {req.quotationComparison.preparedDate && ` · ${new Date(req.quotationComparison.preparedDate).toLocaleString()}`}
                  </p>
                </div>
                {req.quotationComparison.recommendedVendor && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                    ✅ Recommended: {req.quotationComparison.recommendedVendor}
                    {req.quotationComparison[req.quotationComparison.recommendedVendor.toLowerCase()]?.vendorName
                      ? ` — ${req.quotationComparison[req.quotationComparison.recommendedVendor.toLowerCase()].vendorName}`
                      : ''}
                  </span>
                )}
              </div>

              {/* Comparison table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-200 px-3 py-2 text-left font-semibold text-slate-600 w-32">Criteria</th>
                      {['q1','q2','q3'].map(k => {
                        const q = req.quotationComparison[k];
                        const isRec = req.quotationComparison.recommendedVendor?.toLowerCase() === k;
                        return (
                          <th key={k} className={`border border-slate-200 px-3 py-2 text-left font-semibold ${isRec ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600'}`}>
                            {k.toUpperCase()} {isRec && '✅'}
                            {q?.vendorName && <div className="font-normal text-xs mt-0.5 text-slate-700">{q.vendorName}</div>}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: 'Vendor Contact',  key: 'vendorContact', fmt: v => v || '—' },
                      { label: 'Unit Price (AED)', key: 'unitPrice',     fmt: v => v ? `AED ${Number(v).toLocaleString()}` : '—' },
                      { label: 'Total Price (AED)',key: 'totalPrice',    fmt: v => v ? `AED ${Number(v).toLocaleString()}` : '—' },
                      { label: 'Delivery Days',   key: 'deliveryDays',  fmt: v => v ? `${v} days` : '—' },
                      { label: 'Payment Terms',   key: 'paymentTerms',  fmt: v => v || '—' },
                      { label: 'Warranty',        key: 'warranty',      fmt: v => v || '—' },
                      { label: 'Remarks',         key: 'remarks',       fmt: v => v || '—' },
                    ].map(row => (
                      <tr key={row.label} className="hover:bg-slate-50">
                        <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-600 bg-slate-50">{row.label}</td>
                        {['q1','q2','q3'].map(k => {
                          const q = req.quotationComparison[k];
                          const isRec = req.quotationComparison.recommendedVendor?.toLowerCase() === k;
                          const val = q ? row.fmt(q[row.key]) : '—';
                          return (
                            <td key={k} className={`border border-slate-200 px-3 py-2 ${isRec ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-700'}`}>
                              {val}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Supporting document row */}
                    <tr className="hover:bg-slate-50 bg-blue-50/30">
                      <td className="border border-slate-200 px-3 py-2 font-semibold text-slate-600 bg-slate-50">📄 Supporting Doc</td>
                      {['q1','q2','q3'].map(k => {
                        const q = req.quotationComparison[k];
                        const isRec = req.quotationComparison.recommendedVendor?.toLowerCase() === k;
                        return (
                          <td key={k} className={`border border-slate-200 px-3 py-2 ${isRec ? 'bg-emerald-50' : ''}`}>
                            {q?.quotationFile
                              ? <FileLinks path={q.quotationFile.path} name={q.quotationFile.originalName} />
                              : <span className="text-slate-400 text-xs">Not uploaded</span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Recommendation reason */}
              {req.quotationComparison.recommendationReason && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-xs font-semibold text-emerald-700 mb-1">✅ Reason for Recommendation</p>
                  <p className="text-sm text-emerald-800">{req.quotationComparison.recommendationReason}</p>
                </div>
              )}

              {/* Also show any old-style uploaded quotation files */}
              {req.quotations && req.quotations.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Additional Uploaded Files ({req.quotations.length})</p>
                  <div className="space-y-2">
                    {req.quotations.map(q => (
                      <div key={q._id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-lg">📄</span>
                          <div>
                            <p className="text-xs font-medium text-slate-800">{q.originalName}</p>
                            <p className="text-xs text-slate-400">{fmtSize(q.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4 shrink-0">
                          <FileLinks path={q.path} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* ── Quotations (SE upload zone + DM/DD view) ─────────────────── */}
          {(isSEQuotPending || isDMQuotReview || isDDQuotApproval || (req.quotations && req.quotations.length > 0)) && (
            <Section title={`Quotations (${req.quotations?.length || 0})`}>
              {req.quotations?.length > 0 && (
                <div className="space-y-2 mb-4">
                  {req.quotations.map(q => (
                    <div key={q._id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xl">📄</span>
                        <div>
                          <p className="text-sm font-medium text-slate-800">{q.originalName}</p>
                          <p className="text-xs text-slate-500">{fmtSize(q.size)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4 shrink-0">
                        <FileLinks path={q.path} />
                        {isSEQuotPending && <button onClick={() => removeQuotExisting(q._id)} className="text-xs font-medium text-red-600 hover:underline">🗑️ Remove</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {isSEQuotPending && (
                <>
                  <div onDrop={e => { e.preventDefault(); addQuotFiles(Array.from(e.dataTransfer.files)); }}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => document.getElementById('quot-input-rd').click()}
                    className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center cursor-pointer hover:border-cyan-400 hover:bg-cyan-50 transition-colors">
                    <p className="text-3xl mb-1">📁</p>
                    <p className="text-sm font-medium text-slate-700">Drop quotation files or click to browse</p>
                    <p className="text-xs text-slate-500 mt-0.5">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG · Max 20 MB</p>
                    <input id="quot-input-rd" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" className="hidden" onChange={e => addQuotFiles(Array.from(e.target.files))} />
                  </div>
                  {quotFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase text-slate-500">Ready to Upload ({quotFiles.length})</p>
                      {quotFiles.map((f, i) => (
                        <div key={i} className="flex items-center justify-between rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2">
                          <span className="text-sm text-slate-700 truncate">{f.name}</span>
                          <button onClick={() => setQuotFiles(p => p.filter((_,j) => j !== i))} className="ml-3 text-xs text-red-600 hover:underline shrink-0">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex items-center justify-between rounded-xl border border-cyan-200 bg-cyan-50 px-5 py-3">
                    <div>
                      <p className="text-sm font-semibold text-cyan-800">Submit Quotations to Dept Manager</p>
                      <p className="text-xs text-cyan-700">Upload files above then submit for DM review.</p>
                    </div>
                    <button onClick={handleQuotUploadAndSubmit} disabled={quotUploading || actionLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
                      {(quotUploading || actionLoading) && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                      📤 Submit Quotations
                    </button>
                  </div>
                </>
              )}
            </Section>
          )}

          {/* ── PO Document (visible from PO Pending onwards) ─────────────── */}
          {(req.purchaseOrder?.document || req.poDetails?.poNumber || isSEPOPending || isDMPOReview || isDDPOSign || isSEPOSigned || ['PO Pending','PO Review','PO Sign','PO Signed'].includes(req.status)) && (
            <Section title="Purchase Order">

              {/* ── PO Details Preview (form-based, no file) — visible to DM for PO Review ── */}
              {req.poDetails?.poNumber && (
                <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-blue-200">
                    <p className="text-xs font-semibold text-blue-700">🛒 Structured Purchase Order — Prepared by SE</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-blue-600 font-semibold">PO# {req.poDetails.poNumber}</span>
                      <span className="text-xs text-blue-500">{req.poDetails.poDate ? new Date(req.poDetails.poDate).toLocaleDateString() : ''}</span>
                      <button
                        onClick={() => printPO(req.poDetails, req)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-navy-700 px-3 py-1 text-xs font-semibold text-white hover:bg-navy-800 transition-colors"
                      >
                        🖨️ Print / Download PDF
                      </button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* To / From */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold text-slate-500 mb-1">To (Vendor)</p>
                        <p className="font-semibold text-slate-800">{req.poDetails.toName || '—'}</p>
                        {req.poDetails.toAddress && <p className="text-slate-500 whitespace-pre-line">{req.poDetails.toAddress}</p>}
                        {req.poDetails.toContact && <p className="text-slate-500">Tel: {req.poDetails.toContact}</p>}
                        {req.poDetails.toEmail && <p className="text-slate-500">Email: {req.poDetails.toEmail}</p>}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500 mb-1">From (Dept)</p>
                        <p className="font-semibold text-slate-800">{req.poDetails.fromName || req.departmentName}</p>
                        {req.poDetails.subjectRef && <p className="text-slate-500 mt-1">Sub: {req.poDetails.subjectRef}</p>}
                        {req.poDetails.quotationRef && <p className="text-slate-500">Ref: {req.poDetails.quotationRef}</p>}
                      </div>
                    </div>
                    {/* Items table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="bg-navy-700 text-white">
                            {['#','Description','Qty','Unit','Unit Price','Total'].map(h => (
                              <th key={h} className="px-2 py-1.5 text-left font-semibold">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(req.poDetails.items || []).map((item, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-2 py-1.5 border border-slate-200">{i+1}</td>
                              <td className="px-2 py-1.5 border border-slate-200">{item.description}</td>
                              <td className="px-2 py-1.5 border border-slate-200 text-center">{item.quantity}</td>
                              <td className="px-2 py-1.5 border border-slate-200 text-center">{item.unit}</td>
                              <td className="px-2 py-1.5 border border-slate-200 text-right">AED {Number(item.unitPrice||0).toLocaleString()}</td>
                              <td className="px-2 py-1.5 border border-slate-200 text-right font-semibold">AED {Number(item.totalPrice||0).toLocaleString()}</td>
                            </tr>
                          ))}
                          {Number(req.poDetails.vatPercent) > 0 && (
                            <tr className="bg-slate-50">
                              <td colSpan={5} className="px-2 py-1.5 border border-slate-200 text-right text-slate-500">VAT ({req.poDetails.vatPercent}%)</td>
                              <td className="px-2 py-1.5 border border-slate-200 text-right">AED {Number(req.poDetails.vat||0).toLocaleString()}</td>
                            </tr>
                          )}
                          <tr className="bg-navy-50">
                            <td colSpan={5} className="px-2 py-1.5 border border-slate-200 text-right font-bold">Grand Total ({req.poDetails.currency || 'AED'})</td>
                            <td className="px-2 py-1.5 border border-slate-200 text-right font-bold text-navy-700">AED {Number(req.poDetails.grandTotal||0).toLocaleString()}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {/* Terms */}
                    {(req.poDetails.paymentTerms || req.poDetails.deliveryTerms || req.poDetails.warrantyTerms) && (
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        {req.poDetails.paymentTerms && <div><span className="font-semibold text-slate-500">Payment: </span>{req.poDetails.paymentTerms}</div>}
                        {req.poDetails.deliveryTerms && <div><span className="font-semibold text-slate-500">Delivery: </span>{req.poDetails.deliveryTerms}</div>}
                        {req.poDetails.warrantyTerms && <div><span className="font-semibold text-slate-500">Warranty: </span>{req.poDetails.warrantyTerms}</div>}
                      </div>
                    )}
                    {/* Authorized by */}
                    {req.poDetails.authorizedBy && (
                      <p className="text-xs text-slate-500">Authorized by: <span className="font-semibold text-slate-700">{req.poDetails.authorizedBy}</span>{req.poDetails.authorizedTitle ? ` — ${req.poDetails.authorizedTitle}` : ''}</p>
                    )}
                  </div>
                </div>
              )}
              {req.purchaseOrder?.document ? (
                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📄</span>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{req.purchaseOrder.document.originalName}</p>
                      <p className="text-xs text-slate-500">{fmtSize(req.purchaseOrder.document.size)} · Original (prepared by SE)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <FileLinks path={req.purchaseOrder.document.path} />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic mb-3">No PO document uploaded yet.</p>
              )}
              {req.purchaseOrder?.signedDocument && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✅</span>
                    <div>
                      <p className="text-sm font-medium text-emerald-800">{req.purchaseOrder.signedDocument.originalName}</p>
                      <p className="text-xs text-emerald-600">
                        Signed PO
                        {req.purchaseOrder.signedAt && ` · Signed ${new Date(req.purchaseOrder.signedAt).toLocaleDateString()}`}
                        {req.purchaseOrder.signedByName && ` by ${req.purchaseOrder.signedByName}`}
                      </p>
                      {req.purchaseOrder.sentAt && (
                        <p className="text-xs text-blue-600 font-semibold mt-0.5">
                          📧 Emailed to supplier {new Date(req.purchaseOrder.sentAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    <FileLinks path={req.purchaseOrder.signedDocument.path} label=" Signed" />
                  </div>
                </div>
              )}
              {isSEPOPending && (
                <button onClick={() => navigate(`/review/${id}/po`)} className="rounded-lg border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100">
                  🛒 Upload / Submit Purchase Order →
                </button>
              )}
              {isDDPOSign && req.purchaseOrder?.document && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-violet-800">Sign &amp; Upload Signed PO</p>
                    <p className="text-xs text-violet-700">Download the PO, sign it, then upload the signed version.</p>
                  </div>
                  <button onClick={() => navigate(`/review/${id}/po-sign`)} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">✍️ Sign PO →</button>
                </div>
              )}
              {isSEPOSigned && (
                <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">PO Signed — Email to Supplier</p>
                    <p className="text-xs text-emerald-700">Download the signed PO, email it to the supplier, then confirm below.</p>
                    {req.purchaseOrder?.supplierEmail && <p className="text-xs text-slate-500 mt-0.5">Supplier: {req.purchaseOrder.supplierEmail}</p>}
                  </div>
                  <button onClick={() => setModal('approve')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">📧 Confirm Sent</button>
                </div>
              )}
            </Section>
          )}

          {/* ── GRN (visible from GRN stage onwards) ──────────────────────── */}
          {(req.grn?.document || isSEGRNPending) && (
            <Section title="Goods Receipt Note (GRN)">
              {req.grn?.document ? (
                <div className="space-y-3 mb-3">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📦</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{req.grn.document.originalName}</p>
                        <p className="text-xs text-slate-500">{fmtSize(req.grn.document.size)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <FileLinks path={req.grn.document.path} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                    {req.grn.receivedAt && <div><span className="text-slate-400">Received: </span><span className="font-semibold">{new Date(req.grn.receivedAt).toLocaleDateString()}</span></div>}
                    {req.grn.quantityReceived != null && <div><span className="text-slate-400">Qty Recv: </span><span className="font-semibold">{req.grn.quantityReceived} {req.unit}</span></div>}
                    {req.grn.condition && <div className="sm:col-span-2"><span className="text-slate-400">Condition: </span><span className="font-semibold">{req.grn.condition}</span></div>}
                    {req.grn.deliveryNote && <div className="sm:col-span-4"><span className="text-slate-400">Notes: </span><span className="font-semibold">{req.grn.deliveryNote}</span></div>}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic mb-3">GRN not yet uploaded.</p>
              )}
              {isSEGRNPending && (
                <button onClick={() => navigate(`/review/${id}/grn`)} className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100">
                  📦 Upload GRN →
                </button>
              )}
            </Section>
          )}

          {/* ── Supplier Invoice & 3-way match (Payment stages) ───────────── */}
          {(req.supplierInvoice || isSEPayPending || isAccVerification) && (
            <Section title="Supplier Invoice & Payment">
              {req.supplierInvoice ? (
                <div className="space-y-3 mb-3">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🧾</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{req.supplierInvoice.originalName}</p>
                        <p className="text-xs text-slate-500">{fmtSize(req.supplierInvoice.size)}</p>
                        {req.invoiceNumber && <p className="text-xs text-slate-500">Inv# {req.invoiceNumber} · {req.invoiceDate ? new Date(req.invoiceDate).toLocaleDateString() : ''}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <FileLinks path={req.supplierInvoice.path} />
                    </div>
                  </div>
                  {req.invoiceAmount && <div className="text-xs"><span className="text-slate-400">Invoice Amount: </span><span className="font-bold text-slate-700">AED {req.invoiceAmount.toLocaleString()}</span></div>}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic mb-3">Invoice not yet uploaded.</p>
              )}
              {isSEPayPending && (
                <button onClick={() => navigate(`/review/${id}/invoice`)} className="rounded-lg border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-100">
                  💳 Upload Invoice →
                </button>
              )}
              {/* 3-way match result */}
              {req.threeWayMatch?.verifiedAt && (
                <div className={`mt-3 rounded-xl border p-4 ${req.threeWayMatch.poMatched && req.threeWayMatch.grnMatched && req.threeWayMatch.invoiceMatched ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Three-Way Match Result</p>
                  <div className="flex gap-4 text-xs mb-2">
                    <span>{req.threeWayMatch.poMatched      ? '✅' : '❌'} PO Match</span>
                    <span>{req.threeWayMatch.grnMatched     ? '✅' : '❌'} GRN Match</span>
                    <span>{req.threeWayMatch.invoiceMatched ? '✅' : '❌'} Invoice Match</span>
                  </div>
                  {req.threeWayMatch.notes && <p className="text-xs text-slate-600 italic">"{req.threeWayMatch.notes}"</p>}
                  <p className="text-xs text-slate-400 mt-1">Verified by {req.threeWayMatch.verifiedByName} on {new Date(req.threeWayMatch.verifiedAt).toLocaleString()}</p>
                </div>
              )}
            </Section>
          )}

          {/* ── Journal Entry Stage ────────────────────────────────────── */}
          {['Journal Entry','Journal Review','FM Verification','Payment Entry','Filing','Paid','Completed'].includes(req.status) && (
            <Section title="📝 Journal Entry">
              {/* JA — just a completion button */}
              {user?.role === 'Junior Accountant' && req.status === 'Journal Entry' && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-slate-600">Confirm journal entry has been completed in the accounting system, then send to Senior Accountant for verification.</p>
                  <button
                    onClick={handleJournalSubmit}
                    disabled={journalLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 w-fit"
                  >
                    {journalLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    ✅ Entry Completed — Send to Senior Accountant
                  </button>
                </div>
              )}

              {/* SA — verify or reject */}
              {user?.role === 'Accountant' && req.status === 'Journal Review' && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-slate-600">Junior Accountant has completed the journal entry. Verify and send to Finance Manager, or reject to return.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        setActionLoading(true);
                        try {
                          await approvalService.approve(id, 'Journal entry verified by SA. Forwarded to Finance Manager.');
                          toast.success('✅ Verified — sent to Finance Manager.');
                          const { data } = await approvalService.getOne(id); setReq(data.requirement);
                        } catch (e) { toast.error(e.message || 'Failed'); }
                        finally { setActionLoading(false); }
                      }}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {actionLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                      ✓ Verify — Send to Finance Manager
                    </button>
                    <button onClick={() => setModal('reject')} className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                      ✕ Reject
                    </button>
                  </div>
                </div>
              )}

              {/* FM — approve / reject / return */}
              {user?.role === 'Finance Manager' && req.status === 'FM Verification' && (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-slate-600">Senior Accountant has verified the journal entry. Approve to send back to SA for payment, or reject/return.</p>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={async () => {
                        setActionLoading(true);
                        try {
                          await approvalService.approve(id, 'Payment approved by Finance Manager. SA to make payment.');
                          toast.success('✅ Approved — sent to Senior Accountant for payment.');
                          const { data } = await approvalService.getOne(id); setReq(data.requirement);
                        } catch (e) { toast.error(e.message || 'Failed'); }
                        finally { setActionLoading(false); }
                      }}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {actionLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                      ✓ Approve
                    </button>
                    <button onClick={() => setModal('return')} className="rounded-lg border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 hover:bg-orange-100">↩ Return</button>
                    <button onClick={() => setModal('reject')} className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">✕ Reject</button>
                  </div>
                </div>
              )}

              {/* Waiting states for other roles */}
              {req.status === 'Journal Entry' && user?.role !== 'Junior Accountant' && (
                <p className="text-sm text-amber-600 italic">⏳ Awaiting Junior Accountant to complete journal entry...</p>
              )}
              {req.status === 'Journal Review' && user?.role !== 'Accountant' && (
                <p className="text-sm text-amber-600 italic">⏳ Awaiting Senior Accountant to verify journal entry...</p>
              )}
              {req.status === 'FM Verification' && user?.role !== 'Finance Manager' && (
                <p className="text-sm text-amber-600 italic">⏳ Awaiting Finance Manager approval...</p>
              )}
              {['Payment Entry','Filing','Paid','Completed'].includes(req.status) && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                  <span>✅</span><span className="text-sm font-semibold text-emerald-700">Journal entry completed &amp; verified</span>
                </div>
              )}
            </Section>
          )}

          {/* ── Payment Entry Stage ────────────────────────────────────── */}
          {['Payment Entry','Filing','Paid','Completed'].includes(req.status) && (
            <Section title="💳 Payment">
              {/* SA — payment completed + optional upload */}
              {user?.role === 'Accountant' && req.status === 'Payment Entry' && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-600">Finance Manager has approved payment. Make the payment, optionally upload a payment receipt, then confirm.</p>

                  {/* Optional payment document upload */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Receipt / Proof <span className="text-slate-400 font-normal">(Optional)</span></label>
                    {paymentFile ? (
                      <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span>📄</span>
                          <span className="text-xs font-medium text-amber-800 truncate max-w-[260px]">{paymentFile.name}</span>
                        </div>
                        <button type="button" onClick={() => setPaymentFile(null)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                      </div>
                    ) : (
                      <div onClick={() => paymentFileRef.current?.click()}
                        className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
                        <p className="text-sm text-slate-500">📎 Click to upload payment receipt</p>
                        <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG · Optional</p>
                      </div>
                    )}
                    <input ref={paymentFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={e => e.target.files[0] && setPaymentFile(e.target.files[0])} />
                  </div>

                  <button
                    onClick={handlePaymentDone}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 w-fit"
                  >
                    {actionLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    💳 Payment Completed — Send to Junior Accountant for Filing
                  </button>
                </div>
              )}

              {req.status === 'Payment Entry' && user?.role !== 'Accountant' && (
                <p className="text-sm text-amber-600 italic">⏳ Senior Accountant is making the payment...</p>
              )}

              {/* Payment done — show record */}
              {['Filing','Paid','Completed'].includes(req.status) && (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Payment Completed</p>
                    {req.paymentRecord?.paymentRef && <p className="text-xs text-emerald-700">Ref: {req.paymentRecord.paymentRef}</p>}
                  </div>
                  {req.paymentRecord?.document?.path && <FileLinks path={req.paymentRecord.document.path} name={req.paymentRecord.document.originalName} />}
                </div>
              )}

              {/* JA — filing button */}
              {user?.role === 'Junior Accountant' && req.status === 'Filing' && (
                <div className="mt-4 flex flex-col gap-3">
                  <p className="text-sm text-slate-600">Payment has been made. File all procurement documents to close the cycle.</p>
                  <button
                    onClick={handleFiling}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50 w-fit"
                  >
                    {actionLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                    📁 Documents Filed — Mark as Paid ✅
                  </button>
                </div>
              )}
              {req.status === 'Filing' && user?.role !== 'Junior Accountant' && (
                <p className="text-sm text-amber-600 italic mt-3">⏳ Junior Accountant is filing documents...</p>
              )}
            </Section>
          )}

          {/* ── Filing Status ─────────────────────────────────────────────── */}
          {['Filing','Paid','Completed'].includes(req.status) && (
            <Section title="📁 Filing & Closure">
              {req.status === 'Filing' ? (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">⏳</span>
                  <div>
                    <p className="text-sm font-semibold text-cyan-800">Awaiting document filing by Junior Accountant</p>
                    <p className="text-xs text-cyan-700">JA will file PO, GRN, Invoice, Journal Entry and Payment records.</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 flex items-center gap-3">
                  <span className="text-3xl">🎉</span>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">Procurement Cycle Complete</p>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      All documents filed. Payment processed. 
                      {req.paymentRecord?.paymentRef && ` Ref: ${req.paymentRecord.paymentRef}.`}
                    </p>
                  </div>
                </div>
              )}
            </Section>
          )}

          {/* Comments */}
          <Section title="Comments">
            {!req.comments?.length ? <p className="text-sm text-slate-400 italic mb-4">No comments yet.</p> : (
              <div className="mb-4 space-y-3">
                {req.comments.map(c => (
                  <div key={c._id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800">{c.authorName}</span>
                      <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs text-navy-700">{c.role}</span>
                      <span className="ml-auto text-xs text-slate-400">{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-slate-700">{c.text}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <textarea rows={2} className="input-field flex-1 resize-none text-sm"
                placeholder="Add a review comment..." value={comment}
                onChange={e => setComment(e.target.value)} />
              <Button onClick={handleComment} loading={commentLoading} disabled={!comment.trim()} className="self-start">Post</Button>
            </div>
          </Section>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <Section title="Approval Timeline">
            <ApprovalTimeline status={req.status} timeline={req.timeline || []} />
          </Section>
          {req.currentApprover && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Awaiting</p>
              <p className="text-sm font-bold text-blue-800">{req.currentApprover.firstName} {req.currentApprover.lastName}</p>
              <p className="text-xs text-blue-600">{req.currentApproverRole || req.currentApprover.role}</p>
            </div>
          )}
          {/* Routing path */}
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Routing Path</p>
            <div className="space-y-1.5 text-xs">
              {[
                { label:'SE Review',              status:'Submitted',           done:['Under Review','Budget Check','MD Review','Director Review','Quotation Pending','Quotation Review','Director Review2','PO Pending','PO Review','PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed','Rejected','Returned'].includes(req.status) },
                { label:'DM Review',              status:'Under Review',        done:['Budget Check','MD Review','Director Review','Quotation Pending','Quotation Review','Director Review2','PO Pending','PO Review','PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'Budget Check',           status:'Budget Check',        done:['MD Review','Director Review','Quotation Pending','Quotation Review','Director Review2','PO Pending','PO Review','PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status), skip: total <= DM_THRESHOLD },
                { label:'MD Review',              status:'MD Review',           done:['Director Review','Quotation Pending','Quotation Review','Director Review2','PO Pending','PO Review','PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status), skip: total <= BC_THRESHOLD },
                { label:'Dept Head (pre-quote)',    status:'Director Review',     done:['Quotation Pending','Quotation Review','Director Review2','PO Pending','PO Review','PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status), skip: total <= DM_THRESHOLD },
                { label:'Quotation Upload',       status:'Quotation Pending',   done:['Quotation Review','Director Review2','PO Pending','PO Review','PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'DM Quotation Review',    status:'Quotation Review',    done:['Director Review2','PO Pending','PO Review','PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'Dept Head (quotations)', status:'Director Review2',    done:['PO Pending','PO Review','PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'SE Upload PO',           status:'PO Pending',          done:['PO Review','PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'DM PO Review',           status:'PO Review',           done:['PO Sign','PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'Dept Head Sign PO',      status:'PO Sign',             done:['PO Signed','GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'PO Sent to Supplier',    status:'PO Signed',           done:['GRN Pending','GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'Goods Receipt (GRN)',    status:'GRN Pending',         done:['GRN Review','GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'GRN Approval',           status:'GRN Review',          done:['GRN Review2','Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'Dept Head GRN Approval', status:'GRN Review2',         done:['Payment Pending','Payment Verification','Completed'].includes(req.status) },
                { label:'Invoice Submission',     status:'Payment Pending',     done:['Payment Verification','Completed'].includes(req.status) },
                { label:'3-Way Match ✅',         status:'Payment Verification',done:['Completed'].includes(req.status) },
              ].filter(s => !s.skip).map((step, i) => (
                <div key={i} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 font-medium
                  ${req.status === step.status ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-300' : ''}
                  ${step.done ? 'text-emerald-700' : req.status !== step.status ? 'text-slate-400' : ''}`}>
                  <span className={`h-2 w-2 rounded-full shrink-0 ${req.status === step.status ? 'bg-amber-400' : step.done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {step.label}
                  {req.status === step.status && <span className="ml-auto text-amber-600">← now</span>}
                  {step.done && req.status !== step.status && <span className="ml-auto">✓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {modal && (
        <ActionModal type={modal} requirement={req} onConfirm={handleAction}
          onClose={() => setModal(null)} loading={actionLoading} userRole={user?.role} />
      )}

      {/* File Viewer Modal */}
      {viewerFile && (
        <FileViewer
          path={viewerFile.path}
          name={viewerFile.name}
          onClose={() => setViewerFile(null)}
        />
      )}

      {/* ── Journal Entry Modal (JA inline) ─────────────────────────────── */}
      {journalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto" onClick={() => setJournalModal(false)}>
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl my-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">📝</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">Journal Entry</h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate">{req?.requirementNumber} — {req?.itemName}</p>
              </div>
              <button onClick={() => setJournalModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Req summary */}
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-400">Req #: </span><span className="font-semibold">{req?.requirementNumber}</span></div>
                <div><span className="text-slate-400">Invoice: </span><span className="font-semibold">AED {(req?.invoiceAmount || req?.estimatedTotalPrice || 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400">Vendor: </span><span className="font-semibold">{req?.poDetails?.toName || '—'}</span></div>
                <div><span className="text-slate-400">Inv #: </span><span className="font-semibold">{req?.invoiceNumber || '—'}</span></div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Entry Number *', 'entryNumber', 'text', 'e.g. JE-2024-001'],
                  ['Entry Date',     'entryDate',   'date', ''],
                  ['Reference No.',  'referenceNo', 'text', 'e.g. REF-001'],
                  ['Amount (AED)',   'amount',      'number','0'],
                  ['Debit Account',  'debitAccount','text', 'e.g. Purchases A/c'],
                  ['Credit Account', 'creditAccount','text','e.g. Accounts Payable'],
                ].map(([label, key, type, placeholder]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
                    <input type={type} className="input-field w-full" placeholder={placeholder}
                      value={journalForm[key]} onChange={e => setJournalForm(p => ({ ...p, [key]: e.target.value }))} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Voucher Type</label>
                  <select className="input-field w-full" value={journalForm.voucherType}
                    onChange={e => setJournalForm(p => ({ ...p, voucherType: e.target.value }))}>
                    {['Payment Voucher','Journal Voucher','Receipt Voucher','Contra Voucher','Purchase Voucher'].map(v => <option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Narration</label>
                <textarea rows={2} className="input-field w-full resize-none text-sm"
                  value={journalForm.narration}
                  onChange={e => setJournalForm(p => ({ ...p, narration: e.target.value }))} />
              </div>

              {/* File upload */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Journal Voucher Document <span className="text-slate-400 font-normal">(Optional)</span></label>
                {journalFile ? (
                  <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span>📄</span>
                      <span className="text-xs font-medium text-blue-800 truncate max-w-[260px]">{journalFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setJournalFile(null)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  </div>
                ) : (
                  <div onClick={() => journalFileRef.current?.click()}
                    className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                    <p className="text-sm text-slate-500">📎 Click to upload journal voucher PDF</p>
                    <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG · Max 20 MB</p>
                  </div>
                )}
                <input ref={journalFileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => e.target.files[0] && setJournalFile(e.target.files[0])} />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setJournalModal(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleJournalSubmit} disabled={journalLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                {journalLoading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                📝 Submit to Senior Accountant
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDetail;
