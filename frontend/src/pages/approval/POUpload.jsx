/**
 * POUpload.jsx — SE uploads PO after Dept Head approves quotations (status: PO Pending).
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import ActionModal from '../../components/approval/ActionModal';
import { toast } from '../../components/requirements/Toast';
import Button from '../../components/common/Button';
import useAuth from '../../hooks/useAuth';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
const MAX_SIZE = 20 * 1024 * 1024;

const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
    <p className="text-sm font-medium text-slate-800">{value || '—'}</p>
  </div>
);

const POUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [supplierEmail, setSupplierEmail] = useState('');
  const [modal, setModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    try {
      const { data } = await approvalService.getOne(id);
      setReq(data.requirement);
      if (data.requirement.purchaseOrder?.supplierEmail) {
        setSupplierEmail(data.requirement.purchaseOrder.supplierEmail);
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
    if (f.size > MAX_SIZE) { toast.error(`${f.name}: exceeds 20 MB`); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await approvalService.uploadPurchaseOrder(id, file);
      toast.success('Purchase Order document uploaded.');
      setFile(null);
      await load();
    } catch (err) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!supplierEmail.trim()) return;
    try {
      await approvalService.recordSupplierEmail(id, supplierEmail.trim());
      toast.success('Supplier email saved.');
    } catch (err) {
      toast.error(err.message || 'Failed to save email');
    }
  };

  const handleSubmitToDM = async (note) => {
    setActionLoading(true);
    try {
      await approvalService.approve(id, note);
      toast.success('PO submitted to Department Manager for review.');
      setModal(false);
      navigate('/review/queue');
    } catch (err) {
      toast.error(err.message || 'Submit failed');
    } finally {
      setActionLoading(false);
    }
  };

  const fmt = (b) => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent" />
    </div>
  );
  if (!req) return null;

  const canUpload = req.status === 'PO Pending';
  const existingPO = req.purchaseOrder?.document;
  const canSubmit = canUpload && !!existingPO;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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

      {canUpload ? (
        <div className="rounded-xl border border-sky-300 bg-sky-50 px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">🛒</span>
          <div>
            <p className="text-sm font-bold text-sky-800">Upload Purchase Order → Submit to Department Manager</p>
            <p className="text-xs text-sky-700 mt-0.5">
              Dept Head approved the quotations. Upload the PO document here, then submit to the DM for review.
              After DM approval, the Dept Head will digitally sign the PO before you email it to the supplier.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>⏳</span> PO upload is only available when status is <strong className="mx-1">PO Pending</strong>. Current: <strong>{req.status}</strong>
        </div>
      )}

      <div className="card p-6">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Requirement Summary</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Info label="Item" value={req.itemName} />
          <Info label="Category" value={req.category} />
          <Info label="Quantity" value={`${req.quantity} ${req.unit}`} />
          <Info label="Est. Total" value={`AED ${(req.estimatedTotalPrice || 0).toLocaleString()}`} />
          <Info label="Requested By" value={req.employeeName} />
          <Info label="Department" value={req.departmentName} />
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Purchase Order Document
        </h3>

        {existingPO ? (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xl">📄</span>
              <div>
                <p className="text-sm font-medium text-slate-800">{existingPO.originalName}</p>
                <p className="text-xs text-slate-500">{fmt(existingPO.size)}</p>
              </div>
            </div>
            <a href={`${baseUrl}/${existingPO.path}`} target="_blank" rel="noreferrer" download
               className="ml-4 shrink-0 text-xs font-semibold text-navy-600 hover:underline">Download</a>
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic mb-4">No PO document uploaded yet.</p>
        )}

        {canUpload && (
          <>
            <div
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) addFile(f); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => document.getElementById('po-file-input').click()}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors"
            >
              <p className="text-4xl mb-2">🛒</p>
              <p className="text-sm font-medium text-slate-700">Drop PO document here or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, JPG, PNG · Max 20 MB</p>
              <input id="po-file-input" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden" onChange={e => e.target.files[0] && addFile(e.target.files[0])} />
            </div>

            {file && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg">🆕</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{fmt(file.size)}</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="ml-4 text-xs text-red-600 hover:underline shrink-0">Remove</button>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button onClick={handleUpload} loading={uploading} disabled={!file}>
                📤 Upload Purchase Order
              </Button>
            </div>
          </>
        )}
      </div>

      {canUpload && (
        <>
          <div className="card p-6">
            <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Supplier Contact</h3>
            <div className="flex gap-3">
              <input
                type="email"
                className="input-field flex-1"
                placeholder="supplier@example.com (optional — used when emailing PO later)"
                value={supplierEmail}
                onChange={e => setSupplierEmail(e.target.value)}
              />
              <button onClick={handleSaveEmail} className="btn-secondary text-sm whitespace-nowrap">Save Email</button>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-sky-800">Submit to Department Manager</p>
              <p className="text-xs text-sky-700 mt-0.5">
                {canSubmit
                  ? 'PO document is uploaded. Submit for DM review before Dept Head signature.'
                  : 'Upload the PO document above before submitting.'}
              </p>
            </div>
            <button
              onClick={() => canSubmit && setModal(true)}
              disabled={!canSubmit}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              📤 Submit PO to DM
            </button>
          </div>
        </>
      )}

      {modal && (
        <ActionModal
          type="approve"
          requirement={req}
          onConfirm={handleSubmitToDM}
          onClose={() => setModal(false)}
          loading={actionLoading}
          userRole={user?.role}
        />
      )}
    </div>
  );
};

export default POUpload;
