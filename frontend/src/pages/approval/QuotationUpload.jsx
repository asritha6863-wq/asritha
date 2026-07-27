import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import { toast } from '../../components/requirements/Toast';
import Button from '../../components/common/Button';

const ALLOWED_EXTS = ['.pdf','.doc','.docx','.xls','.xlsx','.jpg','.jpeg','.png'];
const MAX_SIZE = 20 * 1024 * 1024;

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

const QuotationUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [req, setReq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const addFiles = (incoming) => {
    const valid = incoming.filter(f => {
      const ext = '.' + f.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTS.includes(ext)) { toast.error(`${f.name}: type not allowed`); return false; }
      if (f.size > MAX_SIZE) { toast.error(`${f.name}: exceeds 20MB`); return false; }
      return true;
    });
    setFiles(prev => [...prev, ...valid]);
  };

  const removeNew = (idx) => setFiles(prev => prev.filter((_,i) => i !== idx));

  const removeExisting = async (qId) => {
    try {
      await approvalService.removeQuotation(id, qId);
      toast.success('Quotation removed');
      load();
    } catch { toast.error('Failed to remove quotation'); }
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      await approvalService.uploadQuotations(id, files);
      toast.success(`${files.length} quotation(s) uploaded`);
      setFiles([]);
      load();
    } catch (err) { toast.error(err.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!req?.quotations?.length && !files.length) {
      toast.error('Please upload at least one quotation before submitting.');
      return;
    }
    if (files.length > 0) {
      setUploading(true);
      try { await approvalService.uploadQuotations(id, files); setFiles([]); }
      catch (err) { toast.error(err.message || 'Upload failed'); setUploading(false); return; }
      finally { setUploading(false); }
    }
    setSubmitting(true);
    try {
      await approvalService.approve(id, 'Quotations uploaded and submitted to Department Manager.');
      toast.success('✅ Quotations submitted to Department Manager for review!');
      navigate('/review/queue');
    } catch (err) { toast.error(err.message || 'Submit failed'); }
    finally { setSubmitting(false); }
  };

  const fmt = (bytes) => bytes < 1048576 ? `${(bytes/1024).toFixed(1)} KB` : `${(bytes/1048576).toFixed(1)} MB`;
  const baseUrl = import.meta.env.VITE_API_URL?.replace('/api','') || 'http://localhost:5000';

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent"/>
    </div>
  );
  if (!req) return null;

  const isQuotPending = req.status === 'Quotation Pending';

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-navy-800 font-mono">{req.requirementNumber}</h1>
            <StatusBadge status={req.status} size="lg"/>
          </div>
          <p className="text-sm text-slate-500 mt-1">{req.itemName} · AED {(req.estimatedTotalPrice||0).toLocaleString()}</p>
        </div>
        <button onClick={()=>navigate('/review/queue')} className="btn-secondary text-sm">← Back</button>
      </div>

      {isQuotPending ? (
        <div className="rounded-xl border border-cyan-300 bg-cyan-50 px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">📁</span>
          <div>
            <p className="text-sm font-bold text-cyan-800">Action Required — Upload Quotations</p>
            <p className="text-xs text-cyan-700 mt-0.5">
              The Department Head has approved this request. Upload vendor quotations (minimum 1),
              then click <strong>Submit Quotations to DM</strong>. The Department Manager will review
              and forward to the Department Head to sign the Purchase Order.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>⏳</span> This requirement is <strong className="mx-1">{req.status}</strong> — quotation upload is only available when status is "Quotation Pending".
        </div>
      )}

      {/* Requirement summary */}
      <Section title="Requirement Summary">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Info label="Item Name" value={req.itemName}/>
          <Info label="Category" value={req.category}/>
          <Info label="Quantity" value={`${req.quantity} ${req.unit}`}/>
          <Info label="Est. Unit Price" value={`AED ${(req.estimatedUnitPrice||0).toLocaleString()}`}/>
          <Info label="Est. Total Price" value={`AED ${(req.estimatedTotalPrice||0).toLocaleString()}`}/>
          <Info label="Priority" value={req.priority}/>
          <Info label="Requested By" value={req.employeeName}/>
          <Info label="Department" value={req.departmentName}/>
          <Info label="Delivery Location" value={req.deliveryLocation}/>
        </div>
        {req.specification && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500 mb-1">Specification</p>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{req.specification}</p>
          </div>
        )}
      </Section>

      {/* Uploaded quotations */}
      <Section title={`Uploaded Quotations (${req.quotations?.length || 0})`}>
        {!req.quotations?.length ? (
          <p className="text-sm text-slate-400 italic">No quotations uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {req.quotations.map(q => (
              <div key={q._id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xl">📄</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{q.originalName}</p>
                    <p className="text-xs text-slate-500">{fmt(q.size)} · {new Date(q.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-3 ml-4 shrink-0">
                  <a href={`${baseUrl}/${q.path}`} target="_blank" rel="noreferrer" download className="text-xs font-medium text-navy-600 hover:underline">Download</a>
                  {isQuotPending && (
                    <button onClick={()=>removeExisting(q._id)} className="text-xs font-medium text-red-600 hover:underline">Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drop zone */}
        {isQuotPending && (
          <div className="mt-4">
            <div
              onDrop={e=>{e.preventDefault();addFiles(Array.from(e.dataTransfer.files));}}
              onDragOver={e=>e.preventDefault()}
              className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center hover:border-cyan-400 hover:bg-cyan-50 transition-colors cursor-pointer"
              onClick={()=>document.getElementById('quot-input').click()}
            >
              <p className="text-4xl mb-2">📁</p>
              <p className="text-sm font-medium text-slate-700">Drop quotation files here or click to browse</p>
              <p className="text-xs text-slate-500 mt-1">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG · Max 20 MB per file</p>
              <input id="quot-input" type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="hidden" onChange={e=>addFiles(Array.from(e.target.files))}/>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500">Ready to Upload ({files.length})</p>
                {files.map((f,i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">🆕</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800 truncate">{f.name}</p>
                        <p className="text-xs text-slate-500">{fmt(f.size)}</p>
                      </div>
                    </div>
                    <button onClick={()=>removeNew(i)} className="ml-4 text-xs text-red-600 hover:underline shrink-0">Remove</button>
                  </div>
                ))}
                <Button variant="secondary" onClick={handleUpload} loading={uploading} disabled={submitting} className="mt-2">
                  Upload Files Only
                </Button>
              </div>
            )}
          </div>
        )}
      </Section>

      {/* Submit */}
      {isQuotPending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Submit to Department Manager</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Once submitted, the Department Manager will review the quotations and forward to the
              Department Head to digitally sign the Purchase Order.
            </p>
          </div>
          <Button onClick={handleSubmit} loading={submitting} disabled={uploading}>
            📤 Submit Quotations to DM
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuotationUpload;
