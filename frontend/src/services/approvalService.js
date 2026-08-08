import api from './api';

const approvalService = {
  // ── Queue & stats ────────────────────────────────────────────────────────
  getStats:    ()            => api.get('/approval/stats'),
  getQueue:    (params = {}) => api.get('/approval/queue', { params }),
  getOne:      (id)          => api.get(`/approval/requirements/${id}`),

  // ── Core workflow actions ────────────────────────────────────────────────
  approve:     (id, note)    => api.post(`/approval/requirements/${id}/approve`,  { note }),
  reject:      (id, note)    => api.post(`/approval/requirements/${id}/reject`,   { note }),
  returnReq:   (id, note)    => api.post(`/approval/requirements/${id}/return`,   { note }),
  addComment:  (id, text)    => api.post(`/approval/requirements/${id}/comments`, { text }),
  // ── Quotations (SE) ──────────────────────────────────────────────────────
  uploadQuotations: (id, files) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return api.post(`/approval/requirements/${id}/upload-quotations`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeQuotation: (id, qId) => api.delete(`/approval/requirements/${id}/quotations/${qId}`),

  // ── Purchase Order (SE uploads draft, Dept Head uploads signed version) ─────
  uploadPurchaseOrder: (id, file) => {
    const fd = new FormData();
    fd.append('files', file);
    return api.post(`/approval/requirements/${id}/upload-po`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadSignedPO: (id, file) => {
    const fd = new FormData();
    fd.append('files', file);
    return api.post(`/approval/requirements/${id}/upload-signed-po`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  recordSupplierEmail: (id, supplierEmail) =>
    api.post(`/approval/requirements/${id}/record-supplier-email`, { supplierEmail }),

  // ── GRN (SE uploads after goods receipt) ─────────────────────────────────
  uploadGRN: (id, file, grnData = {}) => {
    const fd = new FormData();
    fd.append('files', file);
    if (grnData.receivedAt)       fd.append('receivedAt',       grnData.receivedAt);
    if (grnData.deliveryNote)     fd.append('deliveryNote',     grnData.deliveryNote);
    if (grnData.quantityReceived) fd.append('quantityReceived', grnData.quantityReceived);
    if (grnData.condition)        fd.append('condition',        grnData.condition);
    return api.post(`/approval/requirements/${id}/upload-grn`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Supplier Invoice (SE uploads for 3-way matching) ─────────────────────
  uploadInvoice: (id, file, invoiceData = {}) => {
    const fd = new FormData();
    fd.append('files', file);
    if (invoiceData.invoiceNumber) fd.append('invoiceNumber', invoiceData.invoiceNumber);
    if (invoiceData.invoiceDate)   fd.append('invoiceDate',   invoiceData.invoiceDate);
    if (invoiceData.invoiceAmount) fd.append('invoiceAmount', invoiceData.invoiceAmount);
    return api.post(`/approval/requirements/${id}/upload-invoice`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Quotation comparison (SE saves Q1/Q2/Q3 metadata + optional PDF per quote)
  saveQuotationComparison: (id, comparison, q1File, q2File, q3File) => {
    const fd = new FormData();
    fd.append('comparison', JSON.stringify(comparison));
    if (q1File) fd.append('q1File', q1File);
    if (q2File) fd.append('q2File', q2File);
    if (q3File) fd.append('q3File', q3File);
    return api.post(`/approval/requirements/${id}/save-quotation-comparison`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // ── Structured PO details (SE enters form fields — no file upload) ────────
  savePoDetails: (id, poData) =>
    api.post(`/approval/requirements/${id}/save-po-details`, poData),

  // ── Accountant: 3-way match failure ──────────────────────────────────────
  threeWayReject: (id, payload) =>
    api.post(`/approval/requirements/${id}/three-way-reject`, payload),

  // ── Junior Accountant: save payment record ────────────────────────────────
  savePaymentRecord: (id, data) => {
    // data can be plain object or FormData (when file is attached)
    if (data instanceof FormData) {
      return api.post(`/approval/requirements/${id}/save-payment-record`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.post(`/approval/requirements/${id}/save-payment-record`, data);
  },

  saveJournalEntry: (id, data, file) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => form.append(k, v ?? ''));
    if (file) form.append('file', file);
    return api.post(`/approval/requirements/${id}/save-journal-entry`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default approvalService;
