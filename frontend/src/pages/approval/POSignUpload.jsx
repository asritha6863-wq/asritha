/**
 * POSignUpload.jsx
 * Dept Head (Department Director) workflow for PO Sign stage:
 *  1. Download the original PO document prepared by SE
 *  2. Sign it offline (print+scan, DocuSign, PDF editor, etc.)
 *  3. Upload the signed version back
 *  4. Click "Confirm & Send to SE" → status moves to PO Signed → SE emails supplier
 */
import { useState, useEffect } from 'react';
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
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

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
            <p className="text-sm font-bold text-violet-800">Sign & Return Purchase Order</p>
            <p className="text-xs text-violet-700 mt-1 leading-relaxed">
              <strong>Step 1:</strong> Download the original PO below.<br/>
              <strong>Step 2:</strong> Sign it (print &amp; scan, PDF editor, DocuSign, etc.).<br/>
              <strong>Step 3:</strong> Upload the signed version here.<br/>
              <strong>Step 4:</strong> Click <strong>"Confirm &amp; Send to SE"</strong> — the Senior Employee will email it to the supplier.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>⏳</span> PO signing is only available when status is "PO Sign". Current: <strong className="ml-1">{req.status}</strong>
        </div>
      )}

      {/* Requirement summary */}
      <div className="card p-6">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Requirement Summary</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Info label="Item"             value={req.itemName} />
          <Info label="Category"         value={req.category} />
          <Info label="Quantity"         value={`${req.quantity} ${req.unit}`} />
          <Info label="Est. Total"       value={`AED ${(req.estimatedTotalPrice || 0).toLocaleString()}`} />
          <Info label="Requested By"     value={req.employeeName} />
          <Info label="Department"       value={req.departmentName} />
          <Info label="Delivery Location" value={req.deliveryLocation} />
          <Info label="Required By"      value={req.requiredDate ? new Date(req.requiredDate).toLocaleDateString() : '—'} />
        </div>
      </div>

      {/* Step 1 — Download original PO */}
      <div className="card p-6">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Step 1 — Download Original Purchase Order
        </h3>
        {originalPO ? (
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <p className="text-sm font-semibold text-slate-800">{originalPO.originalName}</p>
                <p className="text-xs text-slate-500">{fmt(originalPO.size)} · Prepared by SE</p>
              </div>
            </div>
            <a
              href={`${baseUrl}/${originalPO.path}`}
              target="_blank" rel="noreferrer" download
              className="inline-flex items-center gap-1.5 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 transition-colors"
            >
              ⬇️ Download PO
            </a>
          </div>
        ) : (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠️ No PO document found. The SE may not have uploaded it yet.
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
            <a href={`${baseUrl}/${signedPO.path}`} target="_blank" rel="noreferrer" download
               className="text-xs font-semibold text-navy-600 hover:underline">Download</a>
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
              Once confirmed, the SE will be notified to email the signed PO to the supplier.
            </p>
            {!signedPO && !file && (
              <p className="text-xs text-red-500 mt-1 font-semibold">⚠️ Upload the signed PO document first.</p>
            )}
          </div>
          <Button
            onClick={handleConfirm}
            loading={uploading || confirming}
            disabled={!signedPO && !file}
          >
            ✅ Confirm &amp; Send to SE
          </Button>
        </div>
      )}
    </div>
  );
};

export default POSignUpload;
