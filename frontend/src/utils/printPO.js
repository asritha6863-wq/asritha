/**
 * printPO.js
 * Shared utility to generate and print/download the formatted Purchase Order PDF.
 * Used in both POUpload.jsx (SE) and ReviewDetail.jsx (DM / Dept Head).
 */

const fmtAED = (n) => `AED ${(Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Builds the complete PO HTML string from poDetails data.
 * Uses only inline styles so it renders correctly in a new print window.
 */
export const buildPOHtml = (po, req) => {
  const poDate  = po.poDate  ? new Date(po.poDate).toLocaleDateString('en-GB',  { day:'2-digit', month:'2-digit', year:'numeric' }) : '___________';
  const dueDate = po.completionDate ? new Date(po.completionDate).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }) : '[DD-Month-YYYY]';
  const grandTotalWords = po.grandTotalWords || '';

  const S = {
    page:      'font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000;background:#fff;padding:40px 48px;max-width:740px;margin:0 auto;line-height:1.5',
    topMeta:   'margin-bottom:16px;font-size:12px',
    toBlock:   'margin-bottom:14px',
    sub:       'font-weight:700;margin-bottom:2px;font-size:12px',
    ref:       'margin-bottom:14px;font-size:12px',
    body:      'margin-bottom:14px;font-size:12px',
    table:     'width:100%;border-collapse:collapse;margin-bottom:20px;font-size:12px',
    th:        'border:1px solid #000;padding:6px 8px;background:#e8e8e8;font-weight:700;text-align:left',
    thC:       'border:1px solid #000;padding:6px 8px;background:#e8e8e8;font-weight:700;text-align:center',
    thR:       'border:1px solid #000;padding:6px 8px;background:#e8e8e8;font-weight:700;text-align:right',
    td:        'border:1px solid #000;padding:5px 8px;text-align:left',
    tdC:       'border:1px solid #000;padding:5px 8px;text-align:center',
    tdR:       'border:1px solid #000;padding:5px 8px;text-align:right',
    tdTotal:   'border:1px solid #000;padding:5px 8px;text-align:right;font-weight:700',
    tcHead:    'font-weight:700;text-decoration:underline;margin-bottom:6px',
    tcKey:     'font-weight:700;min-width:140px;display:inline-block',
    sigLine:   'border-bottom:1px solid #000;width:200px;margin:32px 0 4px',
    fieldLine: 'border-bottom:1px solid #000;display:inline-block;min-width:180px;margin-left:8px;vertical-align:bottom',
  };

  const items = (po.items || []);

  const itemRows = items.map((item, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8f8f8'}">
      <td style="${S.tdC}">${i + 1}</td>
      <td style="${S.td}">${item.description || ''}</td>
      <td style="${S.tdC}">${item.quantity} ${item.unit || ''}</td>
      <td style="${S.tdR}">${fmtAED(item.unitPrice)}</td>
      <td style="${S.tdTotal}">${fmtAED((Number(item.quantity)||0)*(Number(item.unitPrice)||0))}</td>
    </tr>
  `).join('');

  const emptyRow = items.length < 2 ? `
    <tr><td style="${S.tdC}">2</td><td style="${S.td}">&nbsp;</td><td style="${S.tdC}">&nbsp;</td><td style="${S.tdR}">&nbsp;</td><td style="${S.tdTotal}">&nbsp;</td></tr>
  ` : '';

  const vatRow = Number(po.vatPercent) > 0 ? `
    <tr><td colspan="4" style="${S.tdR}">VAT (${po.vatPercent}%)</td><td style="${S.tdR}">${fmtAED(po.vat)}</td></tr>
  ` : '';

  const termsRows = [
    ['Price', `The Total price is ${po.currency || 'AED'} ${fmtAED(po.grandTotal)}${grandTotalWords ? `/ - (${grandTotalWords} only)` : ''}. The price is inclusive of GST.`],
    ['Payment<br>Terms', po.paymentTerms || '[Payment terms]'],
    ['Delivery Terms', `${po.deliveryTerms || 'CIF'} ${po.deliveryLocation || ''}`],
    ['Completion Date', dueDate],
    po.billingAddress ? ['Billing &amp; Shipping Address', po.billingAddress] : null,
    po.warrantyTerms  ? ['Warranty', po.warrantyTerms] : null,
    po.specialConditions ? ['Special Conditions', po.specialConditions] : null,
  ].filter(Boolean).map(([k, v]) => `
    <div style="display:flex;gap:8px;margin-bottom:4px;font-size:12px">
      <span style="${S.tcKey}">${k}</span>
      <span style="flex:1">: ${v}</span>
    </div>
  `).join('');

  const toAddressLines = (po.toAddress || '').split('\n').map(l => `<p style="margin:0">${l}</p>`).join('');

  return `
    <div style="${S.page}">
      <div style="${S.topMeta}">
        <div>Date: <span style="border-bottom:1px solid #000;padding-right:60px">${poDate}</span></div>
        <div>No: <span style="border-bottom:1px solid #000;padding-right:60px">${po.poNumber || '___/___'}</span></div>
      </div>

      <div style="${S.toBlock}">
        <p style="margin:0 0 2px">To</p>
        <p style="font-weight:700;margin:0 0 2px">${po.toName || '[Vendor / Company Name]'}</p>
        ${toAddressLines || '<p style="margin:0">[Vendor Address]</p>'}
        ${po.toContact ? `<p style="margin:0">Contact: ${po.toContact}</p>` : ''}
      </div>

      <p style="${S.sub}">Sub: ${po.subjectRef || 'Purchase, Delivery and Supply Order'}</p>
      <p style="${S.ref}">Ref: Your Quotation No: ${po.quotationRef || '[Quotation No.]'} dated: ${po.quotationDate ? new Date(po.quotationDate).toLocaleDateString('en-GB') : '[Date]'}</p>

      <p style="${S.body}">With reference to your quotation referred above to ${po.siteProject || '[Site/Project Name]'} and subsequent discussions we had with you, we are pleased to place our order on you for the subject with following mutually agreed terms and conditions.</p>

      <table style="${S.table}">
        <thead>
          <tr>
            <th style="${S.thC};width:40px">Sl No</th>
            <th style="${S.th}">Description</th>
            <th style="${S.thC};width:80px">Qty</th>
            <th style="${S.thR};width:120px">Unit Price</th>
            <th style="${S.thR};width:120px">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          ${emptyRow}
          ${vatRow}
          <tr>
            <td colspan="4" style="${S.tdTotal};text-align:right">Total (Including GST)</td>
            <td style="${S.tdTotal}">${fmtAED(po.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-bottom:14px">
        <p style="${S.tcHead}">Terms &amp; Conditions</p>
        ${termsRows}
      </div>

      <p style="font-size:12px;margin-bottom:14px">If the above terms and conditions are acceptable, as a token of acceptance, please sign with stamp and return the duplicate copy of this Purchase Order.</p>
      <p style="font-size:12px;margin:0 0 2px">Thanking you,</p>
      <p style="font-size:12px;margin:0 0 14px">Yours sincerely,</p>
      <p style="font-size:12px;font-weight:700;margin-bottom:24px">For ${po.fromName || req?.departmentName || '[Company / Organization Name]'}</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:20px">
        <div style="font-size:12px">
          <div style="${S.sigLine}"></div>
          <p style="margin:0;font-weight:600">${po.authorizedBy || '[Name]'}</p>
          <p style="margin:0">${po.authorizedTitle || '[Designation]'}</p>
        </div>
        <div style="font-size:12px">
          <div style="${S.sigLine}"></div>
          <p style="margin:0;font-weight:600">${po.authorizedBy2 || '[Name]'}</p>
          <p style="margin:0">${po.authorizedTitle2 || '[Designation]'}</p>
        </div>
      </div>

      <div style="margin-top:32px;border:1px solid #000;padding:16px 20px;font-size:12px">
        <p style="text-align:center;font-weight:700;text-decoration:underline;margin-bottom:12px">ACCEPTED THE PURCHASE ORDER</p>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <tr>
            <td style="width:50%;vertical-align:top;padding-bottom:10px">
              <div>Signature: <span style="${S.fieldLine}"></span></div>
              <div style="margin-top:8px">Name: <span style="${S.fieldLine}"></span></div>
              <div style="margin-top:8px">Designation: <span style="${S.fieldLine}"></span></div>
            </td>
            <td style="width:50%;vertical-align:top;padding-bottom:10px;padding-left:20px">
              <div>Date: <span style="${S.fieldLine}"></span></div>
              <div style="margin-top:24px">(Seal)</div>
            </td>
          </tr>
        </table>
      </div>
    </div>
  `;
};

/**
 * Opens a new window with the formatted PO and triggers the print dialog.
 */
export const printPO = (po, req) => {
  const w = window.open('', '_blank');
  if (!w) { alert('Pop-up blocked. Please allow pop-ups for this site.'); return; }
  w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Purchase Order — ${po.poNumber || req?.requirementNumber}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; background: #fff; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>${buildPOHtml(po, req)}</body>
</html>`);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 400);
};
