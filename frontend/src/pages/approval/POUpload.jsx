/**
 * POUpload.jsx — PO Form Builder
 * SE enters structured PO details → saves → generates formatted printable PO
 * Status: PO Pending
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import ActionModal from '../../components/approval/ActionModal';
import { toast } from '../../components/requirements/Toast';
import Button from '../../components/common/Button';
import useAuth from '../../hooks/useAuth';

const fmtAED = (n) => `AED ${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today  = () => new Date().toISOString().split('T')[0];

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
  </div>
);

// ── Printable PO View ─────────────────────────────────────────────────────────
const POPrintView = ({ po, req }) => (
  <div id="po-print-area" className="bg-white p-10 text-slate-900 font-sans text-sm" style={{ minWidth: 700 }}>
    {/* Letterhead */}
    <div className="flex items-start justify-between border-b-2 border-navy-800 pb-4 mb-6">
      <div>
        <p className="text-xl font-bold text-navy-800">{po.fromName || req.departmentName}</p>
        {po.fromAddress && <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{po.fromAddress}</p>}
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold text-navy-700">PURCHASE ORDER</p>
        <p className="text-sm font-semibold text-slate-600 mt-1">PO No: {po.poNumber}</p>
        <p className="text-xs text-slate-500">Date: {po.poDate ? new Date(po.poDate).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) : '—'}</p>
      </div>
    </div>

    {/* To / Subject */}
    <div className="grid grid-cols-2 gap-6 mb-6">
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase text-slate-400 mb-2">Vendor / Supplier</p>
        <p className="font-semibold">{po.toName || '—'}</p>
        {po.toAddress  && <p className="text-xs text-slate-500 mt-0.5 whitespace-pre-line">{po.toAddress}</p>}
        {po.toContact  && <p className="text-xs text-slate-500">Tel: {po.toContact}</p>}
        {po.toEmail    && <p className="text-xs text-slate-500">Email: {po.toEmail}</p>}
      </div>
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-xs font-bold uppercase text-slate-400 mb-2">Reference</p>
        <p className="font-semibold">{po.subjectRef || req.itemName}</p>
        <p className="text-xs text-slate-500 mt-1">Req #: {req.requirementNumber}</p>
        <p className="text-xs text-slate-500">Dept: {req.departmentName}</p>
        {po.deliveryLocation && <p className="text-xs text-slate-500">Deliver to: {po.deliveryLocation}</p>}
      </div>
    </div>

    {/* Items table */}
    <table className="w-full mb-6 border-collapse">
      <thead>
        <tr className="bg-navy-800 text-white">
          <th className="px-3 py-2 text-left text-xs font-semibold">#</th>
          <th className="px-3 py-2 text-left text-xs font-semibold">Description</th>
          <th className="px-3 py-2 text-center text-xs font-semibold">Qty</th>
          <th className="px-3 py-2 text-center text-xs font-semibold">Unit</th>
          <th className="px-3 py-2 text-right text-xs font-semibold">Unit Price</th>
          <th className="px-3 py-2 text-right text-xs font-semibold">Total</th>
        </tr>
      </thead>
      <tbody>
        {(po.items || []).map((item, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
            <td className="px-3 py-2 text-xs border-b border-slate-100">{i + 1}</td>
            <td className="px-3 py-2 text-xs border-b border-slate-100">{item.description}</td>
            <td className="px-3 py-2 text-xs text-center border-b border-slate-100">{item.quantity}</td>
            <td className="px-3 py-2 text-xs text-center border-b border-slate-100">{item.unit}</td>
            <td className="px-3 py-2 text-xs text-right border-b border-slate-100">{fmtAED(item.unitPrice)}</td>
            <td className="px-3 py-2 text-xs text-right border-b border-slate-100 font-semibold">{fmtAED(item.totalPrice)}</td>
          </tr>
        ))}
      </tbody>
    </table>

    {/* Totals */}
    <div className="flex justify-end mb-6">
      <div className="w-64 space-y-1">
        <div className="flex justify-between text-sm"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{fmtAED(po.subtotal)}</span></div>
        {po.vatPercent > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">VAT ({po.vatPercent}%)</span><span>{fmtAED(po.vat)}</span></div>}
        <div className="flex justify-between text-base font-bold border-t border-slate-300 pt-1 mt-1">
          <span>Grand Total ({po.currency || 'AED'})</span>
          <span className="text-navy-800">{fmtAED(po.grandTotal)}</span>
        </div>
      </div>
    </div>

    {/* Terms */}
    <div className="grid grid-cols-2 gap-4 mb-8 text-xs">
      {[
        ['Payment Terms',      po.paymentTerms],
        ['Delivery Terms',     po.deliveryTerms],
        ['Warranty',           po.warrantyTerms],
        ['Special Conditions', po.specialConditions],
      ].filter(([,v]) => v).map(([l, v]) => (
        <div key={l} className="rounded-lg border border-slate-200 p-3">
          <p className="font-bold text-slate-500 uppercase mb-1">{l}</p>
          <p className="text-slate-700">{v}</p>
        </div>
      ))}
    </div>

    {/* Signature */}
    <div className="grid grid-cols-2 gap-8 mt-8 pt-6 border-t border-slate-200">
      <div>
        <p className="text-xs text-slate-400 mb-6">Authorized Signatory</p>
        <div className="border-b border-slate-400 mb-1 w-48" />
        <p className="text-xs font-semibold">{po.authorizedBy || '—'}</p>
        <p className="text-xs text-slate-500">{po.authorizedTitle || ''}</p>
      </div>
      <div>
        <p className="text-xs text-slate-400 mb-6">Vendor Acknowledgement</p>
        <div className="border-b border-slate-400 mb-1 w-48" />
        <p className="text-xs text-slate-500">Signature / Stamp</p>
      </div>
    </div>
    <p className="text-xs text-slate-400 text-center mt-6">This is a computer-generated Purchase Order — {po.fromName || req.departmentName}</p>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const EMPTY_ITEM = { description: '', quantity: 1, unit: '', unitPrice: '', totalPrice: 0 };

const POUpload = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const printRef = useRef(null);

  const [req,          setReq]          = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const [modal,        setModal]        = useState(false);
  const [actionLoading,setActionLoading]= useState(false);

  // PO form state
  const [po, setPo] = useState({
    poNumber: '', poDate: today(),
    toName: '', toAddress: '', toContact: '', toEmail: '',
    fromName: '', fromAddress: '',
    subjectRef: '', deliveryLocation: '',
    items: [{ ...EMPTY_ITEM }],
    vatPercent: '0', currency: 'AED',
    paymentTerms: '', deliveryTerms: '', warrantyTerms: '', specialConditions: '',
    authorizedBy: '', authorizedTitle: '',
  });

  const set = (key, val) => setPo(p => ({ ...p, [key]: val }));

  // Recalculate totals whenever items or vatPercent change
  const subtotal   = po.items.reduce((s, it) => s + (Number(it.quantity)||0) * (Number(it.unitPrice)||0), 0);
  const vatAmt     = +(subtotal * (Number(po.vatPercent)||0) / 100).toFixed(2);
  const grandTotal = +(subtotal + vatAmt).toFixed(2);

  const updateItem = (i, key, val) => {
    setPo(p => {
      const items = [...p.items];
      items[i] = { ...items[i], [key]: val };
      items[i].totalPrice = (Number(items[i].quantity)||0) * (Number(items[i].unitPrice)||0);
      return { ...p, items };
    });
  };
  const addItem    = () => setPo(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }));
  const removeItem = (i) => setPo(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }));

  const load = async () => {
    try {
      const { data } = await approvalService.getOne(id);
      const r = data.requirement;
      setReq(r);
      // Pre-fill from saved poDetails or defaults
      const d = r.poDetails;
      setPo(prev => ({
        ...prev,
        poNumber:      d?.poNumber      || `PO-${r.requirementNumber}`,
        poDate:        d?.poDate        ? new Date(d.poDate).toISOString().split('T')[0] : today(),
        toName:        d?.toName        || r.quotationComparison?.recommendedVendor
          ? (() => { const rv = r.quotationComparison?.recommendedVendor; return r.quotationComparison?.[rv?.toLowerCase()]?.vendorName || ''; })()
          : '',
        toAddress:     d?.toAddress     || '',
        toContact:     d?.toContact     || '',
        toEmail:       d?.toEmail       || '',
        fromName:      d?.fromName      || r.departmentName,
        fromAddress:   d?.fromAddress   || '',
        subjectRef:    d?.subjectRef    || `Purchase of ${r.itemName}`,
        deliveryLocation: d?.deliveryLocation || r.deliveryLocation,
        items: d?.items?.length ? d.items.map(it => ({
          description: it.description, quantity: it.quantity,
          unit: it.unit, unitPrice: it.unitPrice,
          totalPrice: (it.quantity||0)*(it.unitPrice||0),
        })) : [{ description: r.itemName, quantity: r.quantity, unit: r.unit, unitPrice: r.estimatedUnitPrice, totalPrice: r.estimatedTotalPrice }],
        vatPercent:        d?.vatPercent?.toString()   || '0',
        currency:          d?.currency          || 'AED',
        paymentTerms:      d?.paymentTerms      || '',
        deliveryTerms:     d?.deliveryTerms     || '',
        warrantyTerms:     d?.warrantyTerms     || '',
        specialConditions: d?.specialConditions || '',
        authorizedBy:      d?.authorizedBy      || `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        authorizedTitle:   d?.authorizedTitle   || user?.role || '',
      }));
    } catch {
      toast.error('Failed to load requirement');
      navigate(-1);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await approvalService.savePoDetails(id, { ...po, subtotal, vat: vatAmt, grandTotal });
      toast.success('PO details saved.');
      await load();
    } catch (err) { toast.error(err.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleSubmitToDM = async (note) => {
    // Save first, then approve
    setActionLoading(true);
    try {
      await approvalService.savePoDetails(id, { ...po, subtotal, vat: vatAmt, grandTotal });
      await approvalService.approve(id, note || 'PO prepared and submitted to Department Manager for review.');
      toast.success('✅ PO submitted to Department Manager for review.');
      setModal(false);
      navigate('/review/queue');
    } catch (err) { toast.error(err.message || 'Submit failed'); }
    finally { setActionLoading(false); }
  };

  const handlePrint = () => {
    const el = document.getElementById('po-print-area');
    if (!el) return;
    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Purchase Order — ${po.poNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #1e3a5f; color: white; padding: 8px; text-align: left; font-size: 11px; }
        td { padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
        .right { text-align: right; } .center { text-align: center; }
        .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
        .totals-box { width: 260px; }
        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
        .grand { font-weight: bold; font-size: 14px; border-top: 2px solid #cbd5e1; padding-top: 6px; }
        .sig-row { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
        .sig-line { border-bottom: 1px solid #94a3b8; width: 180px; margin-bottom: 4px; margin-top: 40px; }
        @media print { body { padding: 0; } }
      </style></head><body>${el.innerHTML}</body></html>
    `);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-600 border-t-transparent" />
    </div>
  );
  if (!req) return null;

  const canEdit = req.status === 'PO Pending';

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-navy-800 font-mono">{req.requirementNumber}</h1>
            <StatusBadge status={req.status} size="lg" />
          </div>
          <p className="text-sm text-slate-500 mt-1">{req.itemName} · {fmtAED(req.estimatedTotalPrice)}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate('/review/queue')} className="btn-secondary text-sm">← Back</button>
          {req.poDetails?.poNumber && (
            <button onClick={() => setShowPreview(v => !v)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {showPreview ? '✏️ Edit Form' : '👁 Preview PO'}
            </button>
          )}
        </div>
      </div>

      {/* Banner */}
      {canEdit ? (
        <div className="rounded-xl border border-sky-300 bg-sky-50 px-5 py-4 flex items-start gap-3">
          <span className="text-2xl">🛒</span>
          <div>
            <p className="text-sm font-bold text-sky-800">Prepare Purchase Order</p>
            <p className="text-xs text-sky-700 mt-0.5">
              Fill in the PO details below. The form auto-populates from the requirement and quotation comparison.
              Save at any time, preview the formatted PO, then submit to the Department Manager.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>⏳</span> PO builder is only available when status is <strong className="mx-1">PO Pending</strong>. Current: <strong>{req.status}</strong>
        </div>
      )}

      {/* ── PREVIEW MODE ───────────────────────────────────────────────────── */}
      {showPreview && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <p className="text-sm font-semibold text-slate-700">Purchase Order Preview</p>
            <button onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">
              🖨️ Print / Download PDF
            </button>
          </div>
          <div className="overflow-x-auto">
            <POPrintView po={{ ...po, subtotal, vat: vatAmt, grandTotal }} req={req} />
          </div>
        </div>
      )}

      {/* ── FORM MODE ──────────────────────────────────────────────────────── */}
      {!showPreview && (
        <>
          {/* PO Header */}
          <div className="card p-6 space-y-4">
            <h3 className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">PO Header</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="PO Number" required>
                <input type="text" className="input-field w-full" readOnly={!canEdit}
                  value={po.poNumber} onChange={e => set('poNumber', e.target.value)} />
              </Field>
              <Field label="PO Date" required>
                <input type="date" className="input-field w-full" readOnly={!canEdit}
                  value={po.poDate} onChange={e => set('poDate', e.target.value)} />
              </Field>
              <Field label="Currency">
                <select className="input-field w-full" disabled={!canEdit}
                  value={po.currency} onChange={e => set('currency', e.target.value)}>
                  {['AED','USD','EUR','GBP','SAR'].map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Subject / Reference" required>
                <input type="text" className="input-field w-full sm:col-span-2" readOnly={!canEdit}
                  placeholder="e.g. Purchase of Office Laptops"
                  value={po.subjectRef} onChange={e => set('subjectRef', e.target.value)} />
              </Field>
              <Field label="Delivery Location">
                <input type="text" className="input-field w-full" readOnly={!canEdit}
                  value={po.deliveryLocation} onChange={e => set('deliveryLocation', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="card p-6 space-y-3">
              <h3 className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">From (Issuing Department)</h3>
              <Field label="Department / Company Name"><input type="text" className="input-field w-full" readOnly={!canEdit} value={po.fromName} onChange={e => set('fromName', e.target.value)} /></Field>
              <Field label="Address"><textarea rows={3} className="input-field w-full resize-none text-sm" readOnly={!canEdit} value={po.fromAddress} onChange={e => set('fromAddress', e.target.value)} /></Field>
            </div>
            <div className="card p-6 space-y-3">
              <h3 className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">To (Vendor / Supplier)</h3>
              <Field label="Vendor Name" required><input type="text" className="input-field w-full" readOnly={!canEdit} placeholder="Supplier company name" value={po.toName} onChange={e => set('toName', e.target.value)} /></Field>
              <Field label="Address"><textarea rows={2} className="input-field w-full resize-none text-sm" readOnly={!canEdit} value={po.toAddress} onChange={e => set('toAddress', e.target.value)} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone / Contact"><input type="text" className="input-field w-full" readOnly={!canEdit} value={po.toContact} onChange={e => set('toContact', e.target.value)} /></Field>
                <Field label="Email"><input type="email" className="input-field w-full" readOnly={!canEdit} value={po.toEmail} onChange={e => set('toEmail', e.target.value)} /></Field>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Line Items</h3>
              {canEdit && <button onClick={addItem} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">+ Add Row</button>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    {['#','Description','Qty','Unit','Unit Price (AED)','Total (AED)', canEdit ? 'Del' : ''].map(h => (
                      <th key={h} className="pb-2 pr-3 text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {po.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-3 text-xs text-slate-400">{i + 1}</td>
                      <td className="py-2 pr-3"><input type="text" readOnly={!canEdit} className="input-field w-full min-w-[160px] text-xs" placeholder="Item description" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} /></td>
                      <td className="py-2 pr-3"><input type="number" readOnly={!canEdit} className="input-field w-20 text-xs" min="0" value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} /></td>
                      <td className="py-2 pr-3"><input type="text" readOnly={!canEdit} className="input-field w-20 text-xs" placeholder="pcs" value={item.unit} onChange={e => updateItem(i, 'unit', e.target.value)} /></td>
                      <td className="py-2 pr-3"><input type="number" readOnly={!canEdit} className="input-field w-28 text-xs" min="0" step="0.01" placeholder="0.00" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} /></td>
                      <td className="py-2 pr-3 font-semibold text-xs text-slate-700">{fmtAED((item.quantity||0)*(item.unitPrice||0))}</td>
                      {canEdit && <td className="py-2"><button onClick={() => removeItem(i)} disabled={po.items.length === 1} className="text-red-400 hover:text-red-600 disabled:opacity-30 text-lg leading-none">×</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Totals */}
            <div className="flex justify-end mt-4">
              <div className="w-64 space-y-1.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{fmtAED(subtotal)}</span></div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500">VAT %</span>
                  <div className="flex items-center gap-1">
                    <input type="number" min="0" max="100" readOnly={!canEdit}
                      className="input-field w-16 text-xs text-right"
                      value={po.vatPercent} onChange={e => set('vatPercent', e.target.value)} />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
                {Number(po.vatPercent) > 0 && <div className="flex justify-between text-xs text-slate-500"><span>VAT Amount</span><span>{fmtAED(vatAmt)}</span></div>}
                <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2 mt-2">
                  <span>Grand Total ({po.currency})</span>
                  <span className="text-navy-800">{fmtAED(grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="card p-6 space-y-4">
            <h3 className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Terms & Conditions</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ['paymentTerms',      'Payment Terms',      'e.g. 30 days net from invoice date'],
                ['deliveryTerms',     'Delivery Terms',     'e.g. DDP — Delivered Duty Paid'],
                ['warrantyTerms',     'Warranty Terms',     'e.g. 1 year on-site warranty'],
                ['specialConditions', 'Special Conditions', 'Any additional conditions or notes...'],
              ].map(([key, label, placeholder]) => (
                <Field key={key} label={label}>
                  <textarea rows={2} readOnly={!canEdit} className="input-field w-full resize-none text-sm"
                    placeholder={placeholder} value={po[key]} onChange={e => set(key, e.target.value)} />
                </Field>
              ))}
            </div>
          </div>

          {/* Authorization */}
          <div className="card p-6 space-y-4">
            <h3 className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Prepared & Authorized By</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name">
                <input type="text" className="input-field w-full" readOnly={!canEdit}
                  value={po.authorizedBy} onChange={e => set('authorizedBy', e.target.value)} />
              </Field>
              <Field label="Title / Designation">
                <input type="text" className="input-field w-full" readOnly={!canEdit}
                  value={po.authorizedTitle} onChange={e => set('authorizedTitle', e.target.value)} />
              </Field>
            </div>
          </div>
        </>
      )}

      {/* Action bar */}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Save or Submit to Dept Manager</p>
            <p className="text-xs text-slate-500 mt-0.5">Save to preview the formatted PO, then submit for DM review.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => { handleSave(); setTimeout(() => setShowPreview(true), 500); }}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />}
              👁 Save & Preview PO
            </button>
            <Button onClick={() => setModal(true)} disabled={saving}>
              📤 Submit PO to DM
            </Button>
          </div>
        </div>
      )}

      {modal && (
        <ActionModal type="approve" requirement={req}
          onConfirm={handleSubmitToDM} onClose={() => setModal(false)}
          loading={actionLoading} userRole={user?.role} />
      )}
    </div>
  );
};

export default POUpload;
