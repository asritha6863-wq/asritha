/**
 * QuotationUpload.jsx
 *
 * Senior Employee — Quotation Pending stage
 *
 * Two sections:
 *  1. Quotation Comparison Table  — Q1 / Q2 / Q3 with vendor details + PDF upload per quote
 *  2. Submit to Dept Manager      — saves comparison then submits
 */
import { useState, useEffect, useRef } from 'react';
import { fileUrl } from '../../utils/fileUrl';
import { useParams, useNavigate } from 'react-router-dom';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import { toast } from '../../components/requirements/Toast';
import Button from '../../components/common/Button';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt   = (b) => b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB`;
const fmtAED = (n) => `AED ${(Number(n)||0).toLocaleString()}`;

const EMPTY_QUOTE = { vendorName:'', vendorContact:'', unitPrice:'', totalPrice:'',
  deliveryDays:'', paymentTerms:'', warranty:'', remarks:'' };

const QUOTE_COLORS = {
  Q1: { border:'border-blue-300',  bg:'bg-blue-50',  title:'text-blue-800',  badge:'bg-blue-100 text-blue-700'  },
  Q2: { border:'border-violet-300',bg:'bg-violet-50',title:'text-violet-800',badge:'bg-violet-100 text-violet-700'},
  Q3: { border:'border-teal-300',  bg:'bg-teal-50',  title:'text-teal-800',  badge:'bg-teal-100 text-teal-700'  },
};

// ── sub-component: one quote card ────────────────────────────────────────────
const QuoteCard = ({ label, color, data, onChange, onFile, fileObj, existingFile, readOnly }) => {
  const inputRef = useRef(null);

  const field = (key, label_, type='text', placeholder='') => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-0.5">{label_}</label>
      <input
        type={type}
        readOnly={readOnly}
        className={`input-field w-full text-sm ${readOnly ? 'bg-slate-50 cursor-default' : ''}`}
        placeholder={placeholder}
        value={data[key] || ''}
        onChange={e => onChange(key, e.target.value)}
      />
    </div>
  );

  return (
    <div className={`rounded-xl border-2 ${color.border} ${color.bg} p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${color.badge}`}>{label}</span>
        {data.vendorName && (
          <span className="text-xs font-semibold text-slate-600 truncate max-w-[140px]">{data.vendorName}</span>
        )}
      </div>

      {/* Fields grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {field('vendorName',    'Vendor / Supplier Name', 'text', 'e.g. ABC Trading LLC')}
        {field('vendorContact', 'Contact / Email',        'text', 'phone or email')}
        {field('unitPrice',     'Unit Price (AED)',        'number', '0.00')}
        {field('totalPrice',    'Total Price (AED)',       'number', '0.00')}
        {field('deliveryDays',  'Delivery (days)',         'number', '0')}
        {field('paymentTerms',  'Payment Terms',           'text',   'e.g. 30 days net')}
        {field('warranty',      'Warranty',                'text',   'e.g. 1 year')}
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-0.5">Remarks</label>
        <textarea rows={2} readOnly={readOnly}
          className={`input-field w-full text-sm resize-none ${readOnly ? 'bg-slate-50 cursor-default' : ''}`}
          placeholder="Any additional notes about this quotation..."
          value={data.remarks || ''}
          onChange={e => onChange('remarks', e.target.value)}
        />
      </div>

      {/* PDF upload */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Quotation Document (PDF)</label>
        {existingFile && (
          <div className="mb-2 flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">📄</span>
              <div>
                <p className="text-xs font-medium text-slate-800 truncate">{existingFile.originalName}</p>
                <p className="text-xs text-slate-400">{fmt(existingFile.size)}</p>
              </div>
            </div>
            <button type="button" onClick={() => window.open(fileUrl(existingFile.path), `_blank`, `noopener,noreferrer`)} className="inline-flex items-center gap-1 rounded-md bg-pink-600 px-3 py-1 text-xs font-semibold text-white hover:bg-pink-700">👁️ View</button>
          </div>
        )}
        {!readOnly && (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-3 text-center cursor-pointer hover:border-current hover:bg-white/60 transition-colors text-xs text-slate-500"
            >
              {fileObj ? `📎 ${fileObj.name}` : existingFile ? '🔄 Replace PDF' : '⬆️ Upload PDF'}
            </div>
            <input ref={inputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="hidden" onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
          </>
        )}
      </div>
    </div>
  );
};

// ── main component ────────────────────────────────────────────────────────────
const QuotationUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [req,       setReq]       = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [submitting,setSubmitting]= useState(false);

  // comparison form state
  const [q1, setQ1] = useState({ ...EMPTY_QUOTE });
  const [q2, setQ2] = useState({ ...EMPTY_QUOTE });
  const [q3, setQ3] = useState({ ...EMPTY_QUOTE });
  const [q1File, setQ1File] = useState(null);
  const [q2File, setQ2File] = useState(null);
  const [q3File, setQ3File] = useState(null);
  const [recommended,        setRecommended]        = useState('');
  const [recommendationReason, setRecommendationReason] = useState('');

  const load = async () => {
    try {
      const { data } = await approvalService.getOne(id);
      const r = data.requirement;
      setReq(r);
      // Populate saved comparison if exists
      if (r.quotationComparison) {
        const qc = r.quotationComparison;
        if (qc.q1) setQ1({ vendorName: qc.q1.vendorName||'', vendorContact: qc.q1.vendorContact||'', unitPrice: qc.q1.unitPrice||'', totalPrice: qc.q1.totalPrice||'', deliveryDays: qc.q1.deliveryDays||'', paymentTerms: qc.q1.paymentTerms||'', warranty: qc.q1.warranty||'', remarks: qc.q1.remarks||'' });
        if (qc.q2) setQ2({ vendorName: qc.q2.vendorName||'', vendorContact: qc.q2.vendorContact||'', unitPrice: qc.q2.unitPrice||'', totalPrice: qc.q2.totalPrice||'', deliveryDays: qc.q2.deliveryDays||'', paymentTerms: qc.q2.paymentTerms||'', warranty: qc.q2.warranty||'', remarks: qc.q2.remarks||'' });
        if (qc.q3) setQ3({ vendorName: qc.q3.vendorName||'', vendorContact: qc.q3.vendorContact||'', unitPrice: qc.q3.unitPrice||'', totalPrice: qc.q3.totalPrice||'', deliveryDays: qc.q3.deliveryDays||'', paymentTerms: qc.q3.paymentTerms||'', warranty: qc.q3.warranty||'', remarks: qc.q3.remarks||'' });
        setRecommended(qc.recommendedVendor || '');
        setRecommendationReason(qc.recommendationReason || '');
      }
    } catch {
      toast.error('Failed to load requirement');
      navigate(-1);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const comparison = { q1, q2, q3, recommendedVendor: recommended, recommendationReason };
      await approvalService.saveQuotationComparison(id, comparison, q1File, q2File, q3File);
      toast.success('Quotation comparison saved.');
      setQ1File(null); setQ2File(null); setQ3File(null);
      await load();
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleSubmit = async () => {
    if (!recommended) { toast.error('Please select the recommended vendor before submitting.'); return; }
    if (!q1.vendorName && !q2.vendorName && !q3.vendorName) {
      toast.error('Please fill in at least one quotation (Q1, Q2, or Q3) before submitting.');
      return;
    }

    // Step 1: save comparison data (includes any pending file uploads)
    setSaving(true);
    try {
      const comparison = { q1, q2, q3, recommendedVendor: recommended, recommendationReason };
      await approvalService.saveQuotationComparison(id, comparison, q1File, q2File, q3File);
      setQ1File(null); setQ2File(null); setQ3File(null);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to save comparison');
      setSaving(false);
      return;
    }
    setSaving(false);

    // Step 2: submit (approve) — backend will now find the saved comparison data
    setSubmitting(true);
    try {
      await approvalService.approve(id, `Quotations compared. Recommended: ${recommended} — ${recommendationReason || 'See comparison table'}`);
      toast.success('✅ Quotations submitted to Department Manager for review!');
      navigate('/review/queue');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Submit failed');
      // Reload so user can retry submit without losing their data
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent"/>
    </div>
  );
  if (!req) return null;

  const isQuotPending = req.status === 'Quotation Pending';
  const qc = req.quotationComparison;

  // Which quote has lowest total price (for highlighting)
  const prices = [
    { key:'Q1', val: Number(q1.totalPrice)||0 },
    { key:'Q2', val: Number(q2.totalPrice)||0 },
    { key:'Q3', val: Number(q3.totalPrice)||0 },
  ].filter(p => p.val > 0);
  const lowestKey = prices.length ? prices.reduce((a,b) => a.val < b.val ? a : b).key : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-navy-800 font-mono">{req.requirementNumber}</h1>
            <StatusBadge status={req.status} size="lg"/>
          </div>
          <p className="text-sm text-slate-500 mt-1">{req.itemName} · {fmtAED(req.estimatedTotalPrice)}</p>
        </div>
        <button onClick={() => navigate('/review/queue')} className="btn-secondary text-sm">← Back</button>
      </div>

      {/* Status banner */}
      {isQuotPending ? (
        <div className="rounded-xl border border-cyan-300 bg-cyan-50 px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">📊</span>
          <div>
            <p className="text-sm font-bold text-cyan-800">Quotation Comparison — Q1 / Q2 / Q3</p>
            <p className="text-xs text-cyan-700 mt-0.5">
              Enter details for up to 3 vendor quotations, upload the PDF for each, select the recommended vendor,
              then submit to the Department Manager for review.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>⏳</span> Status is <strong className="mx-1">{req.status}</strong> — quotation comparison is read-only.
        </div>
      )}

      {/* Requirement summary */}
      <div className="card p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Requirement Summary</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-sm">
          {[
            ['Item',          req.itemName],
            ['Qty / Unit',    `${req.quantity} ${req.unit}`],
            ['Est. Total',    fmtAED(req.estimatedTotalPrice)],
            ['Delivery To',   req.deliveryLocation],
            ['Requested By',  req.employeeName],
            ['Department',    req.departmentName],
            ['Category',      req.category],
            ['Priority',      req.priority],
          ].map(([l,v]) => (
            <div key={l}>
              <p className="text-xs text-slate-400">{l}</p>
              <p className="font-medium text-slate-800">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Q1 / Q2 / Q3 Cards ────────────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Quotation Details</h2>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {[
            { label:'Q1', color:QUOTE_COLORS.Q1, data:q1, setData:setQ1, file:q1File, setFile:setQ1File, existing:qc?.q1?.quotationFile },
            { label:'Q2', color:QUOTE_COLORS.Q2, data:q2, setData:setQ2, file:q2File, setFile:setQ2File, existing:qc?.q2?.quotationFile },
            { label:'Q3', color:QUOTE_COLORS.Q3, data:q3, setData:setQ3, file:q3File, setFile:setQ3File, existing:qc?.q3?.quotationFile },
          ].map(({ label, color, data, setData, file, setFile, existing }) => (
            <QuoteCard
              key={label}
              label={label}
              color={color}
              data={data}
              onChange={(k,v) => setData(p => ({ ...p, [k]: v }))}
              onFile={setFile}
              fileObj={file}
              existingFile={existing}
              readOnly={!isQuotPending}
            />
          ))}
        </div>
      </div>

      {/* ── Comparison Summary Table ──────────────────────────────────────── */}
      {(q1.vendorName || q2.vendorName || q3.vendorName) && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-700">Comparison Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Criteria</th>
                  {['Q1','Q2','Q3'].map(k => (
                    <th key={k} className={`px-4 py-3 text-xs font-semibold uppercase ${
                      recommended === k ? 'text-emerald-700' : 'text-slate-500'
                    }`}>
                      {k} {recommended === k && '✅'}
                      {lowestKey === k && recommended !== k && <span className="ml-1 text-blue-500">💰</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { label:'Vendor',         keys: ['vendorName'] },
                  { label:'Total Price',    keys: ['totalPrice'],  fmt: fmtAED },
                  { label:'Unit Price',     keys: ['unitPrice'],   fmt: fmtAED },
                  { label:'Delivery Days',  keys: ['deliveryDays'], fmt: v => v ? `${v} days` : '—' },
                  { label:'Payment Terms',  keys: ['paymentTerms'] },
                  { label:'Warranty',       keys: ['warranty'] },
                  { label:'Remarks',        keys: ['remarks'] },
                ].map(row => {
                  const vals = [q1, q2, q3].map(q => {
                    const raw = q[row.keys[0]];
                    return raw ? (row.fmt ? row.fmt(raw) : raw) : '—';
                  });
                  return (
                    <tr key={row.label} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-xs font-semibold text-slate-600">{row.label}</td>
                      {vals.map((v, i) => (
                        <td key={i} className={`px-4 py-2.5 text-xs ${
                          recommended === ['Q1','Q2','Q3'][i] ? 'font-semibold text-emerald-700 bg-emerald-50/50' : 'text-slate-700'
                        }`}>{v}</td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Recommendation ────────────────────────────────────────────────── */}
      {isQuotPending && (
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-700">Recommendation</h3>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-2">Recommended Vendor <span className="text-red-500">*</span></p>
            <div className="flex gap-3 flex-wrap">
              {[
                { key:'Q1', label: q1.vendorName ? `Q1 — ${q1.vendorName}` : 'Q1', color:'border-blue-400 bg-blue-50 text-blue-800' },
                { key:'Q2', label: q2.vendorName ? `Q2 — ${q2.vendorName}` : 'Q2', color:'border-violet-400 bg-violet-50 text-violet-800' },
                { key:'Q3', label: q3.vendorName ? `Q3 — ${q3.vendorName}` : 'Q3', color:'border-teal-400 bg-teal-50 text-teal-800' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setRecommended(opt.key)}
                  className={`rounded-lg border-2 px-4 py-2 text-sm font-semibold transition-all
                    ${recommended === opt.key
                      ? `${opt.color} ring-2 ring-offset-1 ring-current`
                      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'}`}>
                  {recommended === opt.key && '✅ '}{opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Reason for Recommendation</label>
            <textarea rows={3} className="input-field w-full text-sm resize-none"
              placeholder="e.g. Lowest price with best delivery terms and warranty coverage..."
              value={recommendationReason}
              onChange={e => setRecommendationReason(e.target.value)} />
          </div>
        </div>
      )}

      {/* Saved comparison banner */}
      {qc?.preparedBy && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 flex items-center gap-3 text-sm">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-semibold text-emerald-800">Comparison saved — Recommended: {qc.recommendedVendor || 'Not set'}</p>
            <p className="text-xs text-emerald-700">Saved by {qc.preparedBy} on {new Date(qc.preparedDate).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Action bar */}
      {isQuotPending && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Save or Submit</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Save to continue later, or submit directly to the Department Manager.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleSave} loading={saving} disabled={submitting}>
              💾 Save Comparison
            </Button>
            <Button onClick={handleSubmit} loading={submitting} disabled={saving || !recommended}>
              📤 Submit to Dept Manager
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuotationUpload;
