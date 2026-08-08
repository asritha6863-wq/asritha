const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { param, body }  = require('express-validator');
const validate     = require('../middleware/validate');
const handleUpload = require('../middleware/upload');
const { ROLES }    = require('../constants/roles');
const {
  getQueue,
  getApprovalStats,
  getRequirementForReview,
  approveRequirement,
  rejectRequirement,
  returnRequirement,
  uploadQuotations,
  removeQuotation,
  addApproverComment,
  uploadPurchaseOrder,
  uploadSignedPO,
  uploadGRN,
  uploadInvoice,
  recordSupplierEmail,
  threeWayReject,
  saveQuotationComparison,
  savePoDetails,
  saveJournalEntry,
  savePaymentRecord,
} = require('../controllers/approvalController');

const APPROVER_ROLES = [
  ROLES.SENIOR_EMPLOYEE,
  ROLES.DEPARTMENT_MANAGER,
  ROLES.BUDGET_CONTROLLER,
  ROLES.DEPARTMENT_DIRECTOR,
  ROLES.MANAGING_DIRECTOR,
  ROLES.CHAIRMAN,
  ROLES.ACCOUNTANT,
  ROLES.FINANCE_MANAGER,
  ROLES.JUNIOR_ACCOUNTANT,
  ROLES.ADMIN,
];

const idVal    = [param('id').isMongoId().withMessage('Invalid requirement ID')];
const subIdVal = [param('qId').isMongoId().withMessage('Invalid quotation ID')];
const noteOpt  = [body('note').optional().trim()];
const noteReq  = [body('note').trim().notEmpty().withMessage('Reason/note is required')];

router.use(protect, authorize(...APPROVER_ROLES));

// ── Queue & stats ─────────────────────────────────────────────────────────────
router.get('/stats',                                    getApprovalStats);
router.get('/queue',                                    getQueue);
router.get('/requirements/:id',  idVal, validate,       getRequirementForReview);

// ── Core workflow actions ─────────────────────────────────────────────────────
router.post('/requirements/:id/approve',  idVal, noteOpt, validate, approveRequirement);
router.post('/requirements/:id/reject',   idVal, noteReq, validate, rejectRequirement);
router.post('/requirements/:id/return',   idVal, noteReq, validate, returnRequirement);
router.post('/requirements/:id/comments', idVal, validate,           addApproverComment);

// ── File uploads ──────────────────────────────────────────────────────────────
// Quotation upload & remove (SE only, enforced in controller)
router.post(  '/requirements/:id/upload-quotations', idVal, validate, handleUpload, uploadQuotations);
router.delete('/requirements/:id/quotations/:qId',   idVal, validate, subIdVal, validate, removeQuotation);

// Purchase Order upload (SE) + supplier email record
router.post('/requirements/:id/upload-po',             idVal, validate, handleUpload, uploadPurchaseOrder);
router.post('/requirements/:id/record-supplier-email', idVal, validate, recordSupplierEmail);

// Signed PO upload (Dept Head)
router.post('/requirements/:id/upload-signed-po',      idVal, validate, handleUpload, uploadSignedPO);

// Goods Receipt Note upload (SE)
router.post('/requirements/:id/upload-grn',            idVal, validate, handleUpload, uploadGRN);

// Supplier Invoice upload (SE)
router.post('/requirements/:id/upload-invoice',        idVal, validate, handleUpload, uploadInvoice);

// Quotation comparison (SE saves Q1/Q2/Q3 metadata + optional PDF per quote)
router.post('/requirements/:id/save-quotation-comparison', idVal, validate, handleUpload, saveQuotationComparison);

// Structured PO details (SE enters form fields — no file upload)
router.post('/requirements/:id/save-po-details',           idVal, validate, savePoDetails);

// Journal entry (Junior Accountant) — supports optional file upload
router.post('/requirements/:id/save-journal-entry', idVal, validate, handleUpload, saveJournalEntry);

// Payment record (Senior Accountant) — supports optional file upload
router.post('/requirements/:id/save-payment-record', idVal, validate, handleUpload, savePaymentRecord);

// Three-way match rejection (Accountant)
router.post('/requirements/:id/three-way-reject',          idVal, noteReq, validate, threeWayReject);

module.exports = router;
