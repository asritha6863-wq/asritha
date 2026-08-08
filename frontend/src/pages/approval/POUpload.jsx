/**
 * POUpload.jsx — PO Form Builder
 * SE enters structured PO details → saves → auto-generates formatted printable PO PDF
 * Status: PO Pending — NO file upload needed, poDetails IS the PO
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import approvalService from '../../services/approvalService';
import StatusBadge from '../../components/requirements/StatusBadge';
import ActionModal from '../../components/approval/ActionModal';
import { toast } from '../../components/requirements/Toast';
import Button from '../../components/common/Button';
import useAuth from '../../hooks/useAuth';
import { printPO } from '../../utils/printPO';

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

// ── Printable PO View — matches the exact PO format (inline styles for print) ─
const POPrintView = ({ po, req }) => {
  const poDate   = po.poDate ? new Date(po.poDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '___________';
  const dueDate  = po.completionDate ? new Date(po.completionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '[DD-Month-YYYY]';
  const grandTotalWords = po.grandTotalWords || '';

  const S = {
    page:     { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12, color: '#000', background: '#fff', padding: '40px 48px', maxWidth: 740, margin: '0 auto', lineHeight: 1.5 },
    heading:  { textAlign: 'center', fontSize: 15, fontWeight: 700, textDecoration: 'underline', marginBottom: 16 },
    topMeta:  { marginBottom: 16, fontSize: 12 },
    label:    { fontWeight: 700 },
    toBlock:  { marginBottom: 14 },
    sub:      { fontWeight: 700, marginBottom: 2, fontSize: 12 },
    ref:      { marginBottom: 14, fontSize: 12 },
    body:     { marginBottom: 14, fontSize: 12 },
    table:    { width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 },
    th:       { border: '1px solid #000', padding: '6px 8px', background: '#e8e8e8', fontWeight: 700, textAlign: 'left' },
    thC:      { border: '1px solid #000', padding: '6px 8px', background: '#e8e8e8', fontWeight: 700, textAlign: 'center' },
    thR:      { border: '1px solid #000', padding: '6px 8px', background: '#e8e8e8', fontWeight: 700, textAlign: 'right' },
    td:       { border: '1px solid #000', padding: '5px 8px', textAlign: 'left' },
    tdC:      { border: '1px solid #000', padding: '5px 8px', textAlign: 'center' },
    tdR:      { border: '1px solid #000', padding: '5px 8px', textAlign: 'right' },
    tdTotal:  { border: '1px solid #000', padding: '5px 8px', textAlign: 'right', fontWeight: 700 },
    tcSection:{ marginBottom: 14, fontSize: 12 },
    tcHead:   { fontWeight: 700, textDecoration: 'underline', marginBottom: 6 },
    tcRow:    { display: 'flex', gap: 8, marginBottom: 4 },
    tcKey:    { fontWeight: 700, minWidth: 140 },
    tcVal:    { flex: 1 },
    signRow:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 20 },
    sigBox:   { fontSize: 12 },
    sigLine:  { borderBottom: '1px solid #000', width: 200, margin: '32px 0 4px' },
    acceptBox:{ marginTop: 32, border: '1px solid #000', padding: '16px 20px', fontSize: 12 },
    acceptHead:{ textAlign: 'center', fontWeight: 700, textDecoration: 'underline', marginBottom: 12 },
    fieldLine: { borderBottom: '1px solid #000', display: 'inline-block', minWidth: 180, marginLeft: 8, verticalAlign: 'bottom' },
  };

  return (
    <div id="po-print-area" style={S.page}>

      {/* PO Header — Date + No */}
      <div style={S.topMeta}>
        <div>Date: <span style={{ borderBottom: '1px solid #000', paddingRight: 60 }}>{poDate}</span></div>
        <div>No: <span style={{ borderBottom: '1px solid #000', paddingRight: 60 }}>{po.poNumber || '___/___'}</span></div>
      </div>

      {/* To block */}
      <div style={S.toBlock}>
        <p style={{ margin: '0 0 2px' }}>To</p>
        <p style={{ fontWeight: 700, margin: '0 0 2px' }}>{po.toName || '[Vendor / Company Name]'}</p>
        {po.toAddress
          ? po.toAddress.split('\n').map((l, i) => <p key={i} style={{ margin: 0 }}>{l}</p>)
          : <><p style={{ margin: 0 }}>[Vendor Address Line 1]</p><p style={{ margin: 0 }}>[Vendor Address Line 2, City, State - PIN]</p></>
        }
        {po.toContact && <p style={{ margin: 0 }}>Contact: {po.toContact}</p>}
      </div>

      {/* Sub / Ref */}
      <p style={S.sub}>
        Sub: {po.subjectRef || 'Purchase, Delivery, Supply, Erection, Testing and Commissioning Order For [Description of Work/Material] at [Site Location].'}
      </p>
      <p style={S.ref}>
        Ref: Your Quotation No: {po.quotationRef || '[Quotation No.]'} dated: {po.quotationDate || '[Date]'}
      </p>

      {/* Body text */}
      <p style={S.body}>
        With reference to your quotation referred above to {po.siteProject || '[Site/Project Name]'} and subsequent discussions we had with you,
        we are pleased to place our order on you for the subject with following mutually agreed terms and conditions.
      </p>

      {/* Items table */}
      <table style={S.table}>
        <thead>
          <tr>
            <th style={{ ...S.th, width: 40 }}>Sl No</th>
            <th style={S.th}>Description</th>
            <th style={{ ...S.thC, width: 70 }}>Qty</th>
            <th style={{ ...S.thR, width: 110 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {(po.items || []).map((item, i) => (
            <tr key={i}>
              <td style={{ ...S.tdC }}>{i + 1}</td>
              <td style={S.td}>{item.description || '[Item / Work Description]'}</td>
              <td style={S.tdC}>{item.quantity} {item.unit}</td>
              <td style={S.tdR}>{fmtAED((Number(item.quantity)||0) * (Number(item.unitPrice)||0))}</td>
            </tr>
          ))}
          {/* Empty row if only 1 item */}
          {(po.items || []).length < 2 && (
            <tr>
              <td style={S.tdC}>2</td>
              <td style={S.td}>&nbsp;</td>
              <td style={S.tdC}>&nbsp;</td>
              <td style={S.tdR}>&nbsp;</td>
            </tr>
          )}
          {Number(po.vatPercent) > 0 && (
            <tr>
              <td colSpan={3} style={{ ...S.td, textAlign: 'right' }}>VAT ({po.vatPercent}%)</td>
              <td style={S.tdR}>{fmtAED(po.vat)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={3} style={{ ...S.tdTotal, textAlign: 'right' }}>Total (Including GST)</td>
            <td style={S.tdTotal}>{fmtAED(po.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Terms & Conditions */}
      <div style={S.tcSection}>
        <p style={S.tcHead}>Terms &amp; Conditions</p>

        <div style={S.tcRow}>
          <span style={S.tcKey}>Price</span>
          <span style={S.tcVal}>
            : The Total price is {po.currency || 'AED'} {fmtAED(po.grandTotal)}{grandTotalWords ? `/ - (${grandTotalWords} only)` : ''}. The price is inclusive of GST.
          </span>
        </div>

        <div style={S.tcRow}>
          <span style={S.tcKey}>Payment<br/>Terms</span>
          <span style={S.tcVal}>: {po.paymentTerms || '[Payment terms, e.g. 60% advance, 30% at delivery, 10% at installation].'}</span>
        </div>

        <div style={S.tcRow}>
          <span style={S.tcKey}>Delivery Terms</span>
          <span style={S.tcVal}>: {po.deliveryTerms || 'CIF'} {po.deliveryLocation || '[Delivery Location]'}</span>
        </div>

        <div style={S.tcRow}>
          <span style={S.tcKey}>Completion Date</span>
          <span style={S.tcVal}>: {dueDate}</span>
        </div>

        {po.billingAddress && (
          <div style={S.tcRow}>
            <span style={S.tcKey}>Billing &amp; Shipping Address</span>
            <span style={S.tcVal}>: {po.billingAddress}</span>
          </div>
        )}

        {po.warrantyTerms && (
          <div style={S.tcRow}>
            <span style={S.tcKey}>Warranty</span>
            <span style={S.tcVal}>: {po.warrantyTerms}</span>
          </div>
        )}

        {po.specialConditions && (
          <div style={{ ...S.tcRow, marginTop: 8 }}>
            <span style={S.tcVal}>{po.specialConditions}</span>
          </div>
        )}
      </div>

      {/* Closing */}
      <p style={{ fontSize: 12, marginBottom: 14 }}>
        If the above terms and conditions are acceptable, as a token of acceptance, please sign with stamp and return the
        duplicate copy of this Purchase Order.
      </p>
      <p style={{ fontSize: 12, margin: '0 0 2px' }}>Thanking you,</p>
      <p style={{ fontSize: 12, margin: '0 0 14px' }}>Yours sincerely,</p>
      <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 24 }}>For {po.fromName || req?.departmentName || '[Company / Organization Name]'}</p>

      {/* Signatories */}
      <div style={S.signRow}>
        <div style={S.sigBox}>
          <div style={S.sigLine} />
          <p style={{ margin: 0, fontWeight: 600 }}>{po.authorizedBy || '[Name]'}</p>
          <p style={{ margin: 0 }}>{po.authorizedTitle || '[Designation]'}</p>
        </div>
        <div style={S.sigBox}>
          <div style={S.sigLine} />
          <p style={{ margin: 0, fontWeight: 600 }}>{po.authorizedBy2 || '[Name]'}</p>
          <p style={{ margin: 0 }}>{po.authorizedTitle2 || '[Designation]'}</p>
        </div>
      </div>

      {/* Acceptance block */}
      <div style={S.acceptBox}>
        <p style={S.acceptHead}>ACCEPTED THE PURCHASE ORDER</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top', paddingBottom: 10 }}>
                <div>Signature: <span style={S.fieldLine} /></div>
                <div style={{ marginTop: 8 }}>Name: <span style={S.fieldLine} /></div>
                <div style={{ marginTop: 8 }}>Designation: <span style={S.fieldLine} /></div>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', paddingBottom: 10, paddingLeft: 20 }}>
                <div>Date: <span style={S.fieldLine} /></div>
                <div style={{ marginTop: 24 }}>(Seal)</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
};

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
    subjectRef: '', deliveryLocation: '', billingAddress: '',
    siteProject: '', quotationRef: '', quotationDate: today(),
    completionDate: '', grandTotalWords: '',
    items: [{ ...EMPTY_ITEM }],
    vatPercent: '0', currency: 'AED',
    paymentTerms: '', deliveryTerms: 'CIF', warrantyTerms: '', specialConditions: '',
    authorizedBy: '', authorizedTitle: '',
    authorizedBy2: '', authorizedTitle2: '',
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
        siteProject:       d?.siteProject       || '',
        quotationRef:      d?.quotationRef      || '',
        quotationDate:     d?.quotationDate ? new Date(d.quotationDate).toISOString().split('T')[0] : today(),
        completionDate:    d?.completionDate ? new Date(d.completionDate).toISOString().split('T')[0] : '',
        grandTotalWords:   d?.grandTotalWords   || '',
        billingAddress:    d?.billingAddress    || '',
        authorizedBy2:     d?.authorizedBy2     || '',
        authorizedTitle2:  d?.authorizedTitle2  || '',
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
    printPO({ ...po, subtotal, vat: vatAmt, grandTotal }, req);
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
                  placeholder="e.g. Purchase, Delivery, Supply of Office Laptops at Site"
                  value={po.subjectRef} onChange={e => set('subjectRef', e.target.value)} />
              </Field>
              <Field label="Site / Project Name">
                <input type="text" className="input-field w-full" readOnly={!canEdit}
                  placeholder="e.g. Main Office Building Project"
                  value={po.siteProject} onChange={e => set('siteProject', e.target.value)} />
              </Field>
              <Field label="Quotation Ref No">
                <input type="text" className="input-field w-full" readOnly={!canEdit}
                  placeholder="e.g. QUO-2024-001"
                  value={po.quotationRef} onChange={e => set('quotationRef', e.target.value)} />
              </Field>
              <Field label="Quotation Date">
                <input type="date" className="input-field w-full" readOnly={!canEdit}
                  value={po.quotationDate} onChange={e => set('quotationDate', e.target.value)} />
              </Field>
              <Field label="Completion Date">
                <input type="date" className="input-field w-full" readOnly={!canEdit}
                  value={po.completionDate} onChange={e => set('completionDate', e.target.value)} />
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
            <h3 className="border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Terms &amp; Conditions</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Grand Total in Words">
                <input type="text" className="input-field w-full sm:col-span-2" readOnly={!canEdit}
                  placeholder="e.g. One Thousand Five Hundred only"
                  value={po.grandTotalWords} onChange={e => set('grandTotalWords', e.target.value)} />
              </Field>
              <Field label="Payment Terms">
                <textarea rows={2} readOnly={!canEdit} className="input-field w-full resize-none text-sm"
                  placeholder="e.g. 60% advance, 30% at delivery, 10% at installation"
                  value={po.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} />
              </Field>
              <Field label="Delivery Terms">
                <input type="text" readOnly={!canEdit} className="input-field w-full text-sm"
                  placeholder="e.g. CIF" value={po.deliveryTerms} onChange={e => set('deliveryTerms', e.target.value)} />
              </Field>
              <Field label="Warranty Terms">
                <input type="text" readOnly={!canEdit} className="input-field w-full text-sm"
                  placeholder="e.g. 1 year on-site warranty" value={po.warrantyTerms} onChange={e => set('warrantyTerms', e.target.value)} />
              </Field>
              <Field label="Billing &amp; Shipping Address">
                <textarea rows={2} readOnly={!canEdit} className="input-field w-full resize-none text-sm"
                  placeholder="Full billing and shipping address"
                  value={po.billingAddress} onChange={e => set('billingAddress', e.target.value)} />
              </Field>
              <Field label="Special Conditions">
                <textarea rows={2} readOnly={!canEdit} className="input-field w-full resize-none text-sm sm:col-span-2"
                  placeholder="Any additional conditions or notes..."
                  value={po.specialConditions} onChange={e => set('specialConditions', e.target.value)} />
              </Field>
            </div>
          </div>
        </>
      )}

      {/* Action bar */}
      {canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div>
            <p className="text-sm font-semibold text-slate-800">Save, Preview &amp; Submit to Dept Manager</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in the form → Save → Preview the formatted PO → Print PDF → Submit to DM.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />}
              💾 Save
            </button>
            <button onClick={() => setShowPreview(v => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100">
              👁 {showPreview ? 'Hide Preview' : 'Preview PO'}
            </button>
            <button onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-300 bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-700 hover:bg-navy-100">
              🖨️ Print / PDF
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
