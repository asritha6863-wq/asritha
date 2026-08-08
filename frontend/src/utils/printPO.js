/**
 * printPO.js
 * NiSHKA-branded Purchase Order generator.
 * Uses inline styles for reliable rendering in print windows / PDF.
 */

const fmtAED = (n) => `AED ${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── NiSHKA brand colours ──────────────────────────────────────────────────────
const PINK_DARK   = '#8B1A4A';   // deep rose — header bg, table header
const PINK_MID    = '#C13B7A';   // medium pink — accents
const PINK_LIGHT  = '#F9E8F0';   // blush — alternate row, label bg
const PINK_PALE   = '#FDF2F7';   // near-white pink — page bg tint
const TEXT_DARK   = '#2D0A1A';   // near-black with pink hue
const TEXT_MID    = '#6B2347';   // dark pink for labels
const GREY_LINE   = '#E8C8D8';   // pink-tinted border

// ── Peacock-fan SVG logo (inline, no external deps) ───────────────────────────
const LOGO_SVG = `<svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="28" cy="34" r="6" fill="${PINK_MID}"/>
  <circle cx="28" cy="34" r="3" fill="${PINK_LIGHT}"/>
  ${[[-8,-14],[0,-16],[8,-14],[14,-8],[16,0],[14,8],[-14,-8],[-16,0],[-14,8]].map(([dx,dy])=>`
    <line x1="28" y1="34" x2="${28+dx}" y2="${34+dy}" stroke="${PINK_MID}" stroke-width="2" stroke-linecap="round"/>
    <circle cx="${28+dx}" cy="${34+dy}" r="2.5" fill="${PINK_MID}"/>
  `).join('')}
</svg>`;

export const buildPOHtml = (po, req) => {
  const poDate   = po.poDate ? new Date(po.poDate).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) : '—';
  const dueDate  = po.completionDate ? new Date(po.completionDate).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) : '—';
  const quotDate = po.quotationDate ? new Date(po.quotationDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—';
  const grandTotalWords = po.grandTotalWords || '';
  const items = po.items || [];
  const hasVAT = Number(po.vatPercent) > 0;

  // ── Line items rows ─────────────────────────────────────────────────────────
  const itemRows = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : PINK_PALE}">
      <td style="padding:8px 10px;border-bottom:1px solid ${GREY_LINE};text-align:center;font-size:11px">${i+1}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${GREY_LINE};font-size:11px">${item.description || '—'}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${GREY_LINE};text-align:center;font-size:11px">${item.quantity} ${item.unit||''}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${GREY_LINE};text-align:right;font-size:11px">${fmtAED(item.unitPrice)}</td>
      <td style="padding:8px 10px;border-bottom:1px solid ${GREY_LINE};text-align:right;font-weight:600;font-size:11px">${fmtAED((Number(item.quantity)||0)*(Number(item.unitPrice)||0))}</td>
    </tr>`).join('');

  // ── Terms rows ──────────────────────────────────────────────────────────────
  const termRows = [
    ['Price',            `The total price is ${po.currency||'AED'} ${fmtAED(po.grandTotal)}${grandTotalWords ? ` / ${grandTotalWords} Only` : ''}. The price is inclusive of all taxes.`],
    ['Payment Terms',    po.paymentTerms    || '—'],
    ['Delivery Terms',   `${po.deliveryTerms||'CIF'} — ${po.deliveryLocation||'—'}`],
    ['Completion Date',  dueDate],
    po.billingAddress   ? ['Billing &amp; Shipping', po.billingAddress]   : null,
    po.warrantyTerms    ? ['Warranty',                po.warrantyTerms]    : null,
    po.specialConditions? ['Special Conditions',      po.specialConditions]: null,
  ].filter(Boolean).map(([k,v]) => `
    <div style="display:flex;gap:0;margin-bottom:5px;font-size:11px;line-height:1.5">
      <span style="font-weight:700;min-width:155px;color:${TEXT_MID}">${k}</span>
      <span style="flex:1;color:${TEXT_DARK}">: ${v}</span>
    </div>`).join('');

  return `
  <div style="font-family:'Arial',Helvetica,sans-serif;font-size:12px;color:${TEXT_DARK};background:#fff;max-width:780px;margin:0 auto;line-height:1.5">

    <!-- ══ HEADER ══ -->
    <div style="background:${PINK_DARK};padding:24px 32px;display:flex;align-items:center;justify-content:space-between">
      <!-- Logo + Company -->
      <div style="display:flex;align-items:center;gap:14px">
        <div style="background:rgba(255,255,255,0.12);border-radius:50%;padding:6px;display:flex">
          ${LOGO_SVG}
        </div>
        <div>
          <div style="font-size:24px;font-weight:800;color:#fff;letter-spacing:3px;line-height:1">NiSHKA</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.75);letter-spacing:4px;text-transform:uppercase;margin-top:2px">MOMENTOUS JEWELLERY</div>
        </div>
      </div>
      <!-- PO Title -->
      <div style="text-align:right">
        <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:2px">PURCHASE ORDER</div>
        <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.85);margin-top:4px">PO No: ${po.poNumber||'—'}</div>
        <div style="font-size:11px;color:rgba(255,255,255,0.65);margin-top:2px">Date: ${poDate}</div>
      </div>
    </div>

    <!-- ══ PINK ACCENT BAR ══ -->
    <div style="height:4px;background:linear-gradient(90deg,${PINK_MID},${PINK_LIGHT})"></div>

    <!-- ══ FROM / TO / REF ══ -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0;border-bottom:1px solid ${GREY_LINE}">
      <!-- From -->
      <div style="padding:16px 20px;border-right:1px solid ${GREY_LINE}">
        <div style="font-size:9px;font-weight:700;color:${PINK_MID};letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">From</div>
        <div style="font-weight:700;font-size:12px;color:${TEXT_DARK}">${po.fromName||req?.departmentName||'—'}</div>
        ${po.fromAddress ? `<div style="font-size:10px;color:#666;margin-top:2px;white-space:pre-line">${po.fromAddress}</div>` : ''}
      </div>
      <!-- To -->
      <div style="padding:16px 20px;border-right:1px solid ${GREY_LINE};background:${PINK_PALE}">
        <div style="font-size:9px;font-weight:700;color:${PINK_MID};letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">To (Vendor)</div>
        <div style="font-weight:700;font-size:12px;color:${TEXT_DARK}">${po.toName||'—'}</div>
        ${po.toAddress ? `<div style="font-size:10px;color:#666;margin-top:2px;white-space:pre-line">${po.toAddress}</div>` : ''}
        ${po.toContact ? `<div style="font-size:10px;color:#666;margin-top:1px">Tel: ${po.toContact}</div>` : ''}
        ${po.toEmail   ? `<div style="font-size:10px;color:#666;margin-top:1px">Email: ${po.toEmail}</div>` : ''}
      </div>
      <!-- Reference -->
      <div style="padding:16px 20px">
        <div style="font-size:9px;font-weight:700;color:${PINK_MID};letter-spacing:2px;text-transform:uppercase;margin-bottom:6px">Reference</div>
        <div style="font-size:11px;color:${TEXT_DARK};font-weight:600">${po.subjectRef||req?.itemName||'—'}</div>
        <div style="font-size:10px;color:#666;margin-top:3px">Req #: ${req?.requirementNumber||'—'}</div>
        ${po.quotationRef ? `<div style="font-size:10px;color:#666;margin-top:1px">Quot. Ref: ${po.quotationRef} dt. ${quotDate}</div>` : ''}
        ${po.siteProject  ? `<div style="font-size:10px;color:#666;margin-top:1px">Project: ${po.siteProject}</div>` : ''}
        ${po.deliveryLocation ? `<div style="font-size:10px;color:#666;margin-top:1px">Deliver to: ${po.deliveryLocation}</div>` : ''}
      </div>
    </div>

    <!-- ══ BODY TEXT ══ -->
    <div style="padding:14px 20px;font-size:11px;color:${TEXT_DARK};border-bottom:1px solid ${GREY_LINE}">
      With reference to your quotation referred above${po.siteProject ? ` to <strong>${po.siteProject}</strong>` : ''} and subsequent discussions, we are pleased to place our order with the following mutually agreed terms and conditions.
    </div>

    <!-- ══ ITEMS TABLE ══ -->
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:${PINK_DARK};color:#fff">
          <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:700;width:40px">#</th>
          <th style="padding:9px 10px;text-align:left;font-size:11px;font-weight:700">Description</th>
          <th style="padding:9px 10px;text-align:center;font-size:11px;font-weight:700;width:80px">Qty &amp; Unit</th>
          <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;width:110px">Unit Price</th>
          <th style="padding:9px 10px;text-align:right;font-size:11px;font-weight:700;width:110px">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        ${items.length < 2 ? `<tr style="background:${PINK_PALE}"><td colspan="5" style="padding:8px 10px;border-bottom:1px solid ${GREY_LINE}">&nbsp;</td></tr>` : ''}
        ${hasVAT ? `
        <tr style="background:${PINK_LIGHT}">
          <td colspan="4" style="padding:7px 10px;text-align:right;font-size:11px;color:${TEXT_MID}">VAT (${po.vatPercent}%)</td>
          <td style="padding:7px 10px;text-align:right;font-size:11px;font-weight:600">${fmtAED(po.vat)}</td>
        </tr>` : ''}
        <tr style="background:${PINK_DARK}">
          <td colspan="4" style="padding:10px;text-align:right;font-size:12px;font-weight:800;color:#fff;letter-spacing:0.5px">TOTAL (INCL. GST)</td>
          <td style="padding:10px;text-align:right;font-size:14px;font-weight:800;color:#fff">${fmtAED(po.grandTotal)}</td>
        </tr>
      </tbody>
    </table>

    <!-- ══ TERMS & CONDITIONS ══ -->
    <div style="padding:18px 20px;border-top:3px solid ${PINK_MID};border-bottom:1px solid ${GREY_LINE}">
      <div style="font-size:11px;font-weight:800;color:${PINK_DARK};letter-spacing:1px;text-transform:uppercase;margin-bottom:10px;border-bottom:1px solid ${GREY_LINE};padding-bottom:6px">
        Terms &amp; Conditions
      </div>
      ${termRows}
    </div>

    <!-- ══ CLOSING ══ -->
    <div style="padding:14px 20px 6px;font-size:11px;color:${TEXT_DARK};border-bottom:1px solid ${GREY_LINE}">
      If the above terms and conditions are acceptable, please sign with stamp and return the duplicate copy of this Purchase Order as your acceptance.
    </div>
    <div style="padding:10px 20px 16px;font-size:11px;color:${TEXT_DARK}">
      Thanking you,<br/>Yours sincerely,<br/>
      <strong>For ${po.fromName||req?.departmentName||'NiSHKA'}</strong>
    </div>

    <!-- ══ SIGNATORIES ══ -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-top:1px solid ${GREY_LINE};page-break-inside:avoid">
      ${[
        [po.authorizedBy||'[Name]',   po.authorizedTitle||'[Designation]',  'Authorized Signatory'],
        [po.authorizedBy2||'[Name]',  po.authorizedTitle2||'[Designation]', 'Authorized Signatory'],
      ].map(([name, title, label], i) => `
      <div style="padding:16px 20px;${i===0?`border-right:1px solid ${GREY_LINE}`:''}">
        <div style="font-size:9px;font-weight:700;color:${PINK_MID};letter-spacing:2px;text-transform:uppercase;margin-bottom:36px">${label}</div>
        <div style="border-bottom:1px solid ${PINK_MID};width:180px;margin-bottom:4px"></div>
        <div style="font-size:11px;font-weight:700;color:${TEXT_DARK}">${name}</div>
        <div style="font-size:10px;color:#666">${title}</div>
      </div>`).join('')}
    </div>

    <!-- ══ VENDOR ACCEPTANCE ══ -->
    <div style="margin:0;border:2px solid ${PINK_DARK};background:${PINK_PALE};page-break-inside:avoid">
      <div style="background:${PINK_DARK};padding:8px 20px;font-size:11px;font-weight:800;color:#fff;text-align:center;letter-spacing:2px;text-transform:uppercase">
        Accepted the Purchase Order
      </div>
      <div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:11px">
        <div>
          <div style="margin-bottom:10px">Signature: <span style="border-bottom:1px solid ${PINK_DARK};display:inline-block;width:160px;margin-left:6px"></span></div>
          <div style="margin-bottom:10px">Name: <span style="border-bottom:1px solid ${PINK_DARK};display:inline-block;width:186px;margin-left:6px"></span></div>
          <div>Designation: <span style="border-bottom:1px solid ${PINK_DARK};display:inline-block;width:166px;margin-left:6px"></span></div>
        </div>
        <div>
          <div style="margin-bottom:10px">Date: <span style="border-bottom:1px solid ${PINK_DARK};display:inline-block;width:193px;margin-left:6px"></span></div>
          <div style="margin-top:24px;font-weight:600;color:${TEXT_MID}">(Company Seal / Stamp)</div>
        </div>
      </div>
    </div>

    <!-- ══ FOOTER ══ -->
    <div style="background:${PINK_LIGHT};padding:8px 20px;display:flex;justify-content:space-between;align-items:center;border-top:2px solid ${PINK_MID};page-break-inside:avoid">
      <div style="font-size:9px;color:${TEXT_MID};font-weight:700;letter-spacing:1px">NiSHKA · MOMENTOUS JEWELLERY</div>
      <div style="font-size:9px;color:#999">PO# ${po.poNumber||'—'} · ${poDate} · Computer Generated</div>
    </div>

  </div>`;
};

/**
 * Opens a new window with the formatted NiSHKA PO and triggers the print dialog.
 * The print window also has a Download PDF button.
 */
export const printPO = (po, req) => {
  const html = buildPOHtml(po, req);
  const w = window.open('', '_blank');
  if (!w) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Purchase Order — ${po.poNumber||req?.requirementNumber||'PO'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; background: #f5f5f5; }
    #actions { padding: 12px 20px; background: #fff; border-bottom: 1px solid #ddd; display: flex; gap: 10px; }
    #actions button { padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; }
    #btn-print { background: #8B1A4A; color: #fff; }
    #btn-print:hover { background: #6d1239; }
    #btn-close { background: #f1f1f1; color: #333; }
    #po-wrapper { max-width: 780px; margin: 20px auto; background: #fff; box-shadow: 0 2px 16px rgba(0,0,0,0.1); }
    @media print {
      #actions { display: none !important; }
      body { background: #fff; }
      #po-wrapper { margin: 0; box-shadow: none; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      @page { margin: 0.5cm; size: A4; }
    }
  </style>
</head>
<body>
  <div id="actions">
    <button id="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <button id="btn-close" onclick="window.close()">✕ Close</button>
    <span style="font-size:12px;color:#666;align-self:center;margin-left:8px">
      Tip: In the print dialog, choose "Save as PDF" to download.
    </span>
  </div>
  <div id="po-wrapper">${html}</div>
</body>
</html>`);
  w.document.close();
  w.focus();
};
