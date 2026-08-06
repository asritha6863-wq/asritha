/**
 * InvoiceUpload.jsx
 * SE uploads the supplier invoice for 3-way matching.
 * Accessible when status is "Payment Pending".
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

const DocRow = ({ label, doc, signedNote, baseUrl }) => (
  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-xl">📄</span>
      <div>
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {doc && <p className="text-xs text-slate-500">{doc.originalName}</p>}
        {signedNote && <p className="text-xs text-emerald-600 font-semibold">{signedNote}</p>}
      </div>
    </div>
    {doc
      ? <a href={`${fileUrl(doc.path)}`} target="_blank" rel="noreferrer" download className="shrink-0 text-xs font-semibold text-navy-600 hover:underline">Download</a>
      : <span className="text-xs text-red-500 font-semibold">Missing</span>
    }
  </div>
);

const InvoiceUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [req, setReq]           = useState(null);
  const [loading, setLoading]   = useState(true);
  const [file, setFile]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate:   new Date().toISOString().split('T')[0],
    invoiceAmount: '',
  });

  const load = async () => {
    try {
      const { data } = await approvalService.getOne(id);
      setReq(data.requirement);
      const r = data.requirement;
      setInvoiceData({
        invoiceNumber: r.invoiceNumber || '',
        invoiceDate:   r.invoiceDate ? new Date(r.invoiceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        invoiceAmount: r.invoiceAmount ? String(r.invoiceAmount) : '',
      });
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
    if (!file && !req?.supplierInvoice) {
      toast.error('Upload the supplier invoice before submitting.'); return;
    }
    if (file) {
      setUploading(true);
      try {
        await approvalService.uploadInvoice(id, file, invoiceData);
        setFile(null);
        await load();
      } catch (err) {
        toast.error(err.message || 'Upload failed');
        setUploading(false); return;
      }
      setUploading(false);
    }
    setSubmitting(true);
    try {
      await approvalService.approve(id, 'PO, GRN and Supplier Invoice submitted to Senior Accountant for three-way matching.');
      toast.success('💳 Documents submitted to Senior Accountant for three-way matching!');
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

  const isPaymentPending = req.status === 'Payment Pending';
  const existingInvoice  = req.supplierInvoice;

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
      {isPaymentPending ? (
        <div className="rounded-xl border border-purple-300 bg-purple-50 px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">💳</span>
          <div>
            <p className="text-sm font-bold text-purple-800">Final Step — Submit Documents to Senior Accountant</p>
            <p className="text-xs text-purple-700 mt-0.5">
              Upload the supplier invoice and enter its details. Once submitted, the Senior Accountant will perform
              a three-way match of the PO, GRN, and Invoice to approve payment.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>⏳</span> Invoice upload is only available when status is "Payment Pending". Current: <strong className="ml-1">{req.status}</strong>
        </div>
      )}

      {/* Documents already on file */}
      <div className="card p-6">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Supporting Documents (for Accountant Review)
        </h3>
        <div className="space-y-2">
          <DocRow label="Purchase Order" doc={req.purchaseOrder?.document}
            signedNote={req.purchaseOrder?.signedAt ? `✍️ Signed by ${req.purchaseOrder.signedByName}` : null}
            baseUrl={baseUrl} />
          <DocRow label="Goods Receipt Note" doc={req.grn?.document}
            signedNote={req.grn?.receivedAt ? `📦 Received ${new Date(req.grn.receivedAt).toLocaleDateString()}` : null}
            baseUrl={baseUrl} />
        </div>
      </div>

      {/* Invoice details */}
      {isPaymentPending && (
        <div className="card p-6">
          <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">Invoice Details</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Number</label>
              <input type="text" className="input-field w-full" placeholder="e.g. INV-2024-001"
                value={invoiceData.invoiceNumber}
                onChange={e => setInvoiceData(p => ({ ...p, invoiceNumber: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Date</label>
              <input type="date" className="input-field w-full"
                value={invoiceData.invoiceDate}
                onChange={e => setInvoiceData(p => ({ ...p, invoiceDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Amount (AED)</label>
              <input type="number" min="0" step="0.01" className="input-field w-full"
                placeholder={`Est. AED ${(req.estimatedTotalPrice || 0).toLocaleString()}`}
                value={invoiceData.invoiceAmount}
                onChange={e => setInvoiceData(p => ({ ...p, invoiceAmount: e.target.value }))} />
            </div>
          </div>
        </div>
      )}

      {/* Invoice document upload */}
      <div className="card p-6">
        <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Supplier Invoice {existingInvoice ? '(Uploaded)' : ''}
        </h3>

        {existingInvoice && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧾</span>
              <div>
                <p className="text-sm font-medium text-slate-800">{existingInvoice.originalName}</p>
                <p className="text-xs text-slate-500">{fmt(existingInvoice.size)}</p>
                {req.invoiceNumber && <p className="text-xs text-slate-500">Inv# {req.invoiceNumber}</p>}
              </div>
            </div>
            <a href={`${fileUrl(existingInvoice.path)}`} target="_blank" rel="noreferrer" download
               className="text-xs font-semibold text-navy-600 hover:underline">Download</a>
          </div>
        )}

        {isPaymentPending && (
          <>
            <div
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) addFile(f); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => document.getElementById('inv-file-input').click()}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
            >
              <p className="text-4xl mb-2">🧾</p>
              <p className="text-sm font-medium text-slate-700">Drop invoice file here or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, JPG, PNG · Max 20 MB</p>
              <input id="inv-file-input" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden" onChange={e => e.target.files[0] && addFile(e.target.files[0])} />
            </div>

            {file && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 px-4 py-2.5">
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
      {isPaymentPending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Submit to Senior Accountant</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload the invoice above and click Submit. The Accountant will verify PO + GRN + Invoice.
            </p>
          </div>
          <Button onClick={handleUploadAndSubmit} loading={uploading || submitting}>
            💳 Submit to Senior Accountant
          </Button>
        </div>
      )}
    </div>
  );
};

export default InvoiceUpload;
