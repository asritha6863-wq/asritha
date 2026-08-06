/**
 * GRNUpload.jsx
 * SE uploads the Goods Receipt Note after delivery.
 * Accessible when status is "GRN Pending".
 */
import { useState, useEffect } from 'react';
import { fileUrl } from '../../utils/fileUrl';
import { useParams, useNavigate } from 'react-router-dom';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import { toast } from '../../components/requirements/Toast';
import Button from '../../components/common/Button';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_SIZE = 20 * 1024 * 1024;

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
  </div>
);

const GRNUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [req, setReq]         = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile]       = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [grnData, setGrnData] = useState({
    receivedAt:       new Date().toISOString().split('T')[0],
    deliveryNote:     '',
    quantityReceived: '',
    condition:        '',
  });

  const load = async () => {
    try {
      const { data } = await approvalService.getOne(id);
      setReq(data.requirement);
      if (data.requirement.quantity) {
        setGrnData(p => ({ ...p, quantityReceived: String(data.requirement.quantity) }));
      }
    } catch {
      toast.error('Failed to load requirement');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const addFile = (f) => {
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) { toast.error(`${f.name}: type not allowed`); return; }
    if (f.size > MAX_SIZE)           { toast.error(`${f.name}: exceeds 20 MB`); return; }
    setFile(f);
  };

  const handleUploadAndSubmit = async () => {
    if (!file && !req?.grn?.document) {
      toast.error('Upload a GRN document before submitting.'); return;
    }
    // Upload file first if new one selected
    if (file) {
      setUploading(true);
      try {
        await approvalService.uploadGRN(id, file, grnData);
        setFile(null);
        await load();
      } catch (err) {
        toast.error(err.message || 'Upload failed');
        setUploading(false); return;
      }
      setUploading(false);
    }
    // Then approve (submit GRN to DM)
    setSubmitting(true);
    try {
      await approvalService.approve(id, 'GRN prepared and submitted to Department Manager for review.');
      toast.success('📦 GRN submitted to Department Manager for review!');
      navigate('/review/queue');
    } catch (err) {
      toast.error(err.message || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt     = (b) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent" />
    </div>
  );
  if (!req) return null;

  const isGRNPending = req.status === 'GRN Pending';
  const existingGRN  = req.grn?.document;

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
      {isGRNPending ? (
        <div className="rounded-xl border border-orange-300 bg-orange-50 px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">📦</span>
          <div>
            <p className="text-sm font-bold text-orange-800">Action Required — Prepare Goods Receipt Note</p>
            <p className="text-xs text-orange-700 mt-0.5">
              The supplier has delivered the goods. Verify the delivery, fill in the receipt details below,
              upload the GRN document, and submit to the Department Manager for review.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>⏳</span> GRN upload is only available when status is "GRN Pending". Current: <strong className="ml-1">{req.status}</strong>
        </div>
      )}

      {/* PO reference */}
      {req.purchaseOrder?.document && (
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Reference — Signed Purchase Order</p>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">📄</span>
              <span className="text-sm font-medium text-slate-700">{req.purchaseOrder.document.originalName}</span>
              {req.purchaseOrder.signedAt && (
                <span className="text-xs text-emerald-600 font-semibold">✍️ Signed</span>
              )}
            </div>
            <a href={`${fileUrl(req.purchaseOrder.document.path)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-pink-600 px-3 py-1 text-xs font-semibold text-white hover:bg-pink-700">??? View</a>
          </div>
        </div>
      )}

      {/* GRN Details form */}
      {isGRNPending && (
        <div className="card p-6">
          <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Delivery Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date Received <span className="text-red-500">*</span></label>
              <input type="date" className="input-field w-full"
                value={grnData.receivedAt}
                onChange={e => setGrnData(p => ({ ...p, receivedAt: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Quantity Received <span className="text-red-500">*</span></label>
              <input type="number" min="0" className="input-field w-full"
                placeholder={`Expected: ${req.quantity} ${req.unit}`}
                value={grnData.quantityReceived}
                onChange={e => setGrnData(p => ({ ...p, quantityReceived: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Condition of Goods</label>
              <input type="text" className="input-field w-full"
                placeholder="e.g. Good condition, no damage observed"
                value={grnData.condition}
                onChange={e => setGrnData(p => ({ ...p, condition: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Notes</label>
              <textarea rows={3} className="input-field w-full resize-none text-sm"
                placeholder="Any notes about the delivery, discrepancies, or observations..."
                value={grnData.deliveryNote}
                onChange={e => setGrnData(p => ({ ...p, deliveryNote: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* GRN Document upload */}
      <div className="card p-6">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          GRN Document {existingGRN ? '(Uploaded)' : ''}
        </h3>

        {existingGRN && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">📄</span>
              <div>
                <p className="text-sm font-medium text-slate-800">{existingGRN.originalName}</p>
                <p className="text-xs text-slate-500">{fmt(existingGRN.size)}</p>
              </div>
            </div>
            <a href={`${fileUrl(existingGRN.path)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-md bg-pink-600 px-3 py-1 text-xs font-semibold text-white hover:bg-pink-700">??? View</a>
          </div>
        )}

        {isGRNPending && (
          <>
            <div
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) addFile(f); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => document.getElementById('grn-file-input').click()}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
            >
              <p className="text-4xl mb-2">📦</p>
              <p className="text-sm font-medium text-slate-700">Drop GRN document here or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, JPG, PNG · Max 20 MB</p>
              <input id="grn-file-input" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden" onChange={e => e.target.files[0] && addFile(e.target.files[0])} />
            </div>

            {file && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-2.5">
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
          </>
        )}
      </div>

      {/* Submit bar */}
      {isGRNPending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Submit GRN to Department Manager</p>
            <p className="text-xs text-slate-500 mt-0.5">Upload GRN document above, then submit for DM review and approval.</p>
          </div>
          <Button onClick={handleUploadAndSubmit} loading={uploading || submitting}>
            📦 Submit GRN to Dept Manager
          </Button>
        </div>
      )}
    </div>
  );
};

export default GRNUpload;
