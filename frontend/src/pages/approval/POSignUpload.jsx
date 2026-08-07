/**
 * POSignUpload.jsx
 * Dept Head workflow for PO Sign stage:
 *  1. View the auto-generated PO from SE's form data
 *  2. Print/Download it as PDF
 *  3. Sign it offline (print+scan, DocuSign, PDF editor, etc.)
 *  4. Upload the signed version back
 *  5. Click "Confirm & Send to SE"
 */
import { useState, useEffect } from 'react';
import { fileUrl } from '../../utils/fileUrl';
import { useParams, useNavigate } from 'react-router-dom';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import { toast } from '../../components/requirements/Toast';
import Button from '../../components/common/Button';
import { printPO } from '../../utils/printPO';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_SIZE = 20 * 1024 * 1024;

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
  </div>
);

const POSignUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [req, setReq]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [file, setFile]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    try {
      const { data } = await approvalService.getOne(id);
      setReq(data.requirement);
    } catch {
      toast.error('Failed to load requirement');
      navigate(-1);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const addFile = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) { toast.error(`${f.name}: type not allowed`); return; }
    if (f.size > MAX_SIZE)           { toast.error(`${f.name}: exceeds 20 MB`); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await approvalService.uploadSignedPO(id, file);
      toast.success('Signed PO uploaded successfully.');
      setFile(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleConfirm = async () => {
    if (!req?.purchaseOrder?.signedDocument && !file) {
      toast.error('Please upload the signed Purchase Order before confirming.');
      return;
    }
    if (file) {
      setUploading(true);
      try {
        await approvalService.uploadSignedPO(id, file);
        setFile(null);
        await load();
      } catch (err) {
        toast.error(err.message || 'Upload failed');
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    setConfirming(true);
    try {
      await approvalService.approve(id, 'Signed PO uploaded and confirmed by Department Head. SE to email to supplier.');
      toast.success('✅ Signed PO confirmed! Senior Employee will now email the PO to the supplier.');
      navigate('/review/queue');
    } catch (err) {
      toast.error(err.message || 'Confirm failed');
    } finally { setConfirming(false); }
  };

  const fmt     = (b) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent" />
    </div>
  );
  if (!req) return null;

  const isPOSign   = req.status === 'PO Sign';
  const originalPO = req.purchaseOrder?.document;
  const signedPO   = req.purchaseOrder?.signedDocument;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-navy-800 font-mono">{req.requirementNumber}</h1>
            <StatusBadge status={req.status} size="lg" />
          </div>
          <p className="text-sm text-slate-500 mt-1">{req.itemName} · AED {(req.estimatedTotalPrice || 0).toLocaleString()}</p>
        </div>
        <button onClick={() => navigate('/review/queue')} className="btn-secondary text-sm">← Back</button>
      </div>

      {/* Info banner */}
      {isPOSign ? (
        <div className="rounded-xl border border-violet-300 bg-violet-50 px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">✍️</span>
          <div>
            <p className="text-sm font-bold text-violet-800">Sign &amp; Return Purchase Order</p>
            <p className="text-xs text-violet-700 mt-1 leading-relaxed">
              <strong>Step 1:</strong> Print the auto-generated PO below as PDF and sign it.<br/>
              <strong>Step 2:</strong> Upload the signed version here.<br/>
              <strong>Step 3:</strong> Click <strong>"Confirm &amp; Send to SE"</strong> — SE will email it to the supplier.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>⏳</span> PO signing is only available when status is "PO Sign". Current: <strong className="ml-1">{req.status}</strong>
        </div>
      )}

      {/* Step 1 — Auto-generated PO Preview + Print */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            Step 1 — Review &amp; Print Purchase Order
          </h3>
          <button
            onClick={() => req.poDetails ? printPO(req.poDetails, req) : toast.error('PO details not found. SE must fill in PO form first.')}
            className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
          >
            🖨️ Print / Download PDF
          </button>
        </div>

        {req.poDetails?.poNumber ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            {/* PO summary preview */}
            <div className="grid grid-cols-2 gap-4 p-4 text-xs sm:grid-cols-4">
              <div><p className="text-slate-400">PO Number</p><p className="font-bold text-slate-800">{req.poDetails.poNumber}</p></div>
              <div><p className="text-slate-400">Date</p><p className="font-bold text-slate-800">{req.poDetails.poDate ? new Date(req.poDetails.poDate).toLocaleDateString() : '—'}</p></div>
              <div><p className="text-slate-400">Vendor</p><p className="font-bold text-slate-800">{req.poDetails.toName || '—'}</p></div>
              <div><p className="text-slate-400">Grand Total</p><p className="font-bold text-navy-700">AED {(req.poDetails.grandTotal || 0).toLocaleString()}</p></div>
            </div>
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-navy-700 text-white">
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(req.poDetails.items || []).map((item, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-1.5 border-b border-slate-100">{i+1}</td>
                      <td className="px-3 py-1.5 border-b border-slate-100">{item.description}</td>
                      <td className="px-3 py-1.5 border-b border-slate-100 text-center">{item.quantity} {item.unit}</td>
                      <td className="px-3 py-1.5 border-b border-slate-100 text-right">AED {Number(item.unitPrice||0).toLocaleString()}</td>
                      <td className="px-3 py-1.5 border-b border-slate-100 text-right font-semibold">AED {Number(item.totalPrice||0).toLocaleString()}</td>
                    </tr>
                  ))}
                  <tr className="bg-navy-50">
                    <td colSpan={4} className="px-3 py-2 text-right font-bold text-sm">Grand Total</td>
                    <td className="px-3 py-2 text-right font-bold text-sm text-navy-700">AED {(req.poDetails.grandTotal||0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Terms summary */}
            <div className="grid grid-cols-2 gap-3 p-4 text-xs border-t border-slate-200 sm:grid-cols-3">
              {req.poDetails.paymentTerms && <div><span className="text-slate-400">Payment: </span><span className="font-semibold">{req.poDetails.paymentTerms}</span></div>}
              {req.poDetails.deliveryTerms && <div><span className="text-slate-400">Delivery: </span><span className="font-semibold">{req.poDetails.deliveryTerms}</span></div>}
              {req.poDetails.warrantyTerms && <div><span className="text-slate-400">Warranty: </span><span className="font-semibold">{req.poDetails.warrantyTerms}</span></div>}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            ⚠️ The SE has not yet filled in the PO details form. Ask SE to complete the PO form first.
          </div>
        )}
      </div>

      {/* Step 2 — Upload signed PO */}
      <div className="card p-6">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Step 2 — Upload Signed Purchase Order
        </h3>

        {/* Existing signed PO */}
        {signedPO && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <p className="text-sm font-semibold text-emerald-800">{signedPO.originalName}</p>
                <p className="text-xs text-emerald-600">{fmt(signedPO.size)} · Signed version uploaded</p>
                {req.purchaseOrder?.signedAt && (
                  <p className="text-xs text-emerald-600">Uploaded {new Date(req.purchaseOrder.signedAt).toLocaleString()}</p>
                )}
              </div>
            </div>
            <button type="button" onClick={() => window.open(fileUrl(signedPO.path), `_blank`, `noopener,noreferrer`)} className="inline-flex items-center gap-1 rounded-md bg-pink-600 px-3 py-1 text-xs font-semibold text-white hover:bg-pink-700">??? View</button>
          </div>
        )}

        {isPOSign && (
          <>
            <div
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) addFile(f); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => document.getElementById('signed-po-input').click()}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors"
            >
              <p className="text-4xl mb-2">✍️</p>
              <p className="text-sm font-medium text-slate-700">Drop signed PO here or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, JPG, PNG · Max 20 MB</p>
              <input id="signed-po-input" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden" onChange={e => e.target.files[0] && addFile(e.target.files[0])} />
            </div>

            {file && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-violet-200 bg-violet-50 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🆕</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{fmt(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="ml-4 text-xs text-red-600 hover:underline">Remove</button>
              </div>
            )}

            {file && !signedPO && (
              <Button variant="secondary" onClick={handleUpload} loading={uploading} className="mt-3">
                Upload Only (save without confirming)
              </Button>
            )}
          </>
        )}
      </div>

      {/* Step 3 — Confirm & send to SE */}
      {isPOSign && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-violet-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Confirm &amp; Send Signed PO to Senior Employee</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Once confirmed, the SE will be notified to email the PO to the supplier.
              You can optionally upload the signed copy above.
            </p>
          </div>
          <Button onClick={handleConfirm} loading={uploading || confirming}>
            ✅ Confirm &amp; Send to SE
          </Button>
        </div>
      )}
    </div>
  );
};

export default POSignUpload;
