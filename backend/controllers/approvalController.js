/**
 * approvalController.js
 *
 * Complete end-to-end procurement workflow (Phase 1) — AED thresholds:
 *
 *  Step 1 — Purchase Request
 *    RE  → Submitted
 *    SE  → approve → Under Review            (→ DM)
 *
 *  Step 2-3 — Verification & Budget Check
 *    DM  → approve → budget routing:
 *           ≤ AED 500  → Quotation Pending   (→ SE, skip BC/MD)
 *           > AED 500  → Budget Check        (→ BC)
 *    BC  → approve → budget routing:
 *           ≤ AED 3000 → Director Review     (→ Dept Head)
 *           > AED 3000 → MD Review           (→ MD)
 *    MD  → approve → Director Review         (→ Dept Head)
 *
 *  Step 4 — Quotation Process
 *    Dept Head → approve → Quotation Pending (→ SE uploads quotations)
 *    SE  → submit quotations → Quotation Review (→ DM)
 *    DM  → approve quotations → Director Review2 (→ Dept Head approves quotations)
 *    Dept Head → approve quotations → PO Pending (→ SE uploads PO document)
 *
 *  Step 5 — Purchase Order
 *    SE  → submit PO doc → PO Review (→ DM)
 *    DM  → approve PO → PO Sign (→ Dept Head)
 *    Dept Head → sign PO → PO Signed (→ SE emails supplier)
 *    SE  → confirm sent → GRN Pending        (→ SE creates GRN after delivery)
 *
 *  Step 6 — Goods Receipt (GRN)
 *    SE  → submit GRN → GRN Review           (→ DM)
 *    DM  → approve GRN → GRN Review2         (→ Dept Head)
 *    Dept Head → approve GRN → Payment Pending (→ SE submits docs to Accountant)
 *
 *  Step 7 — Accounts / 3-Way Matching
 *    SE  → submit PO+GRN+Invoice → Payment Verification (→ Accountant)
 *    Accountant → 3-way match → Completed
 *
 *  THRESHOLDS (AED):
 *    DM_THRESHOLD  = 500   — DM approves directly below this (skips BC/MD/DD)
 *    BC_THRESHOLD  = 3000  — BC approves directly below this (skips MD)
 */

const path        = require('path');
const fs          = require('fs');
const Requirement = require('../models/Requirement');
const User        = require('../models/User');
const Department  = require('../models/Department');
const asyncHandler    = require('../utils/asyncHandler');
const ErrorResponse   = require('../utils/ErrorResponse');
const sendNotification = require('../utils/sendNotification');
const { ROLES }   = require('../constants/roles');

const DM_THRESHOLD = 500;
const BC_THRESHOLD = 3000;

// ── Workflow map: which statuses each role can act on ─────────────────────────
const WORKFLOW = {
  [ROLES.SENIOR_EMPLOYEE]:     { actOn: ['Submitted', 'Quotation Pending', 'PO Pending', 'PO Signed', 'GRN Pending', 'Payment Pending'] },
  [ROLES.DEPARTMENT_MANAGER]:  { actOn: ['Under Review', 'Quotation Review', 'PO Review', 'GRN Review'] },
  [ROLES.BUDGET_CONTROLLER]:   { actOn: ['Budget Check'] },
  [ROLES.MANAGING_DIRECTOR]:   { actOn: ['MD Review'] },
  [ROLES.DEPARTMENT_DIRECTOR]: { actOn: ['Director Review', 'Director Review2', 'PO Sign', 'GRN Review2'] },
  // Payment workflow
  [ROLES.ACCOUNTANT]:          { actOn: ['Payment Verification', 'Journal Review', 'Payment Entry'] },
  [ROLES.FINANCE_MANAGER]:     { actOn: ['FM Verification'] },
  [ROLES.JUNIOR_ACCOUNTANT]:   { actOn: ['Journal Entry', 'Filing'] },
};

const getStep  = (role)         => WORKFLOW[role];
const canAct   = (role, status) => { const s = getStep(role); return s && s.actOn.includes(status); };

// ── Timeline helper ───────────────────────────────────────────────────────────
const makeTimeline = (req, action, fromStatus, toStatus, note = '') => ({
  action,
  actor:     req.user._id,
  actorName: `${req.user.firstName} ${req.user.lastName}`,
  role:      req.user.role,
  note,
  fromStatus,
  toStatus,
});

// ── User finders ──────────────────────────────────────────────────────────────
const findInDept  = (role, deptId) => User.findOne({ role, department: deptId, isActive: true });
const findAnyRole = (role)         => User.findOne({ role, isActive: true });
const findDeptHead = async (deptId) => {
  if (!deptId) return findAnyRole(ROLES.DEPARTMENT_DIRECTOR);
  const dept = await Department.findById(deptId).populate('departmentHead');
  if (dept && dept.departmentHead && dept.departmentHead.isActive) {
    return dept.departmentHead;
  }
  return (await findInDept(ROLES.DEPARTMENT_DIRECTOR, deptId)) || (await findAnyRole(ROLES.DEPARTMENT_DIRECTOR));
};

// Returns active DM in dept, or null if none exists (dept has no DM role)
const findDeptManager = (deptId) => User.findOne({ role: ROLES.DEPARTMENT_MANAGER, department: deptId, isActive: true });

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/approval/queue
// ─────────────────────────────────────────────────────────────────────────────
exports.getQueue = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, priority, category, search, status } = req.query;
  const step = getStep(req.user.role);

  if (!step) return res.status(200).json({ success: true, count: 0, total: 0, pages: 1, requirements: [] });

  // MD, BC, Accountant, FM, JA, Chairman, Admin see across all departments
  // Department Directors/Managers filter by own dept only
  const wideRoles = [
    ROLES.MANAGING_DIRECTOR, ROLES.BUDGET_CONTROLLER,
    ROLES.ACCOUNTANT, ROLES.FINANCE_MANAGER, ROLES.JUNIOR_ACCOUNTANT,
    ROLES.CHAIRMAN, ROLES.ADMIN,
  ];
  const deptFilter = (!wideRoles.includes(req.user.role) && req.user.department)
    ? { department: req.user.department }
    : {};

  // Allow filtering by specific status (must be within the role's actOn list)
  const allowedStatuses = status
    ? step.actOn.filter(s => s === status)
    : step.actOn;

  if (allowedStatuses.length === 0) {
    return res.status(200).json({ success: true, count: 0, total: 0, pages: 1, requirements: [] });
  }

  const filter = { status: { $in: allowedStatuses }, ...deptFilter };
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { requirementNumber: { $regex: search, $options: 'i' } },
      { itemName:          { $regex: search, $options: 'i' } },
      { employeeName:      { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [requirements, total] = await Promise.all([
    Requirement.find(filter)
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('employee',        'firstName lastName employeeId')
      .populate('department',      'departmentName')
      .populate('currentApprover', 'firstName lastName role')
      .select('-comments -timeline'),
    Requirement.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true, count: requirements.length, total,
    page: parseInt(page), pages: Math.ceil(total / parseInt(limit)),
    requirements,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/approval/stats
// ─────────────────────────────────────────────────────────────────────────────
exports.getApprovalStats = asyncHandler(async (req, res) => {
  const step = getStep(req.user.role);
  const wideRoles = [
    ROLES.MANAGING_DIRECTOR, ROLES.BUDGET_CONTROLLER,
    ROLES.ACCOUNTANT, ROLES.FINANCE_MANAGER, ROLES.JUNIOR_ACCOUNTANT,
    ROLES.CHAIRMAN, ROLES.ADMIN,
  ];
  const deptFilter = (!wideRoles.includes(req.user.role) && req.user.department)
    ? { department: req.user.department }
    : {};

  const [pending, completed, rejected, returned] = await Promise.all([
    step ? Requirement.countDocuments({ status: { $in: step.actOn }, ...deptFilter }) : 0,
    Requirement.countDocuments({ status: 'Completed', ...deptFilter }),
    Requirement.countDocuments({ status: 'Rejected',  ...deptFilter }),
    Requirement.countDocuments({ status: 'Returned',  ...deptFilter }),
  ]);

  // Per-status counts for detailed dashboard widgets
  const statusList = [
    'Budget Check', 'MD Review', 'Director Review', 'Director Review2',
    'Quotation Pending', 'Quotation Review',
    'PO Pending', 'PO Review', 'PO Sign', 'PO Signed',
    'GRN Pending', 'GRN Review', 'GRN Review2',
    'Payment Pending', 'Payment Verification',
    'Payment Approved', 'Payment Processing', 'Paid',
  ];
  const counts = {};
  await Promise.all(statusList.map(async (s) => {
    counts[s] = await Requirement.countDocuments({ status: s, ...deptFilter });
  }));

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);

  const [monthly, byStatus, recentPending] = await Promise.all([
    Requirement.aggregate([
      { $match: { ...deptFilter, createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Requirement.aggregate([
      { $match: { ...deptFilter } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    step
      ? Requirement.find({ status: { $in: step.actOn }, ...deptFilter })
          .sort({ createdAt: 1 }).limit(5)
          .select('requirementNumber itemName status priority estimatedTotalPrice employeeName departmentName createdAt')
      : [],
  ]);

  res.status(200).json({
    success: true,
    stats: { pending, completed, rejected, returned, ...counts },
    monthly, byStatus, recentPending,
    thresholds: { dm: DM_THRESHOLD, bc: BC_THRESHOLD },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/approval/requirements/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.getRequirementForReview = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id)
    .populate('employee',                 'firstName lastName employeeId email')
    .populate('department',               'departmentName departmentCode')
    .populate('designation',              'designationName level')
    .populate('currentApprover',          'firstName lastName role')
    .populate('timeline.actor',           'firstName lastName')
    .populate('comments.author',          'firstName lastName role')
    .populate('purchaseOrder.signedBy',   'firstName lastName role')
    .populate('threeWayMatch.verifiedBy', 'firstName lastName role');

  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));

  res.status(200).json({
    success: true,
    requirement,
    thresholds: { dm: DM_THRESHOLD, bc: BC_THRESHOLD },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/approve
// ─────────────────────────────────────────────────────────────────────────────
exports.approveRequirement = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));

  if (!canAct(req.user.role, requirement.status)) {
    return next(new ErrorResponse(
      `Your role (${req.user.role}) cannot approve a requirement in "${requirement.status}" status`, 403
    ));
  }

  const prev  = requirement.status;
  const total = requirement.estimatedTotalPrice || 0;
  let nextStatus = '', nextApprover = null, nextApproverRole = '', successMsg = '', note = req.body.note || '';

  // ── SE: initial review → DM (or Dept Head if no DM in dept) ─────────────
  if (req.user.role === ROLES.SENIOR_EMPLOYEE && prev === 'Submitted') {
    const dm = await findDeptManager(requirement.department);
    if (dm) {
      // Dept has an active DM → normal flow
      nextStatus       = 'Under Review';
      nextApprover     = dm;
      nextApproverRole = ROLES.DEPARTMENT_MANAGER;
      successMsg       = 'Forwarded to Department Manager.';
    } else {
      // No DM in this dept → skip straight to budget check path via Dept Head
      // Budget amount determines routing
      if (total <= DM_THRESHOLD) {
        nextStatus       = 'Quotation Pending';
        nextApprover     = await findInDept(ROLES.SENIOR_EMPLOYEE, requirement.department);
        nextApproverRole = ROLES.SENIOR_EMPLOYEE;
        successMsg       = `No Dept Manager — budget ≤ AED ${DM_THRESHOLD}. Forwarded directly for quotations.`;
        note             = `No DM in dept — budget ≤ AED ${DM_THRESHOLD}, skipped to quotations. ${note}`.trim();
      } else {
        nextStatus       = 'Budget Check';
        nextApprover     = await findAnyRole(ROLES.BUDGET_CONTROLLER);
        nextApproverRole = ROLES.BUDGET_CONTROLLER;
        successMsg       = 'No Dept Manager — forwarded to Budget Controller.';
        note             = `No DM in dept — escalated to BC. Amount: AED ${total.toLocaleString()}. ${note}`.trim();
      }
    }
  }

  // ── DM: verify → budget routing ───────────────────────────────────────────
  else if (req.user.role === ROLES.DEPARTMENT_MANAGER && prev === 'Under Review') {
    if (total <= DM_THRESHOLD) {
      // Budget ≤ AED 500 — skip BC/MD/DD, go straight to quotation stage
      nextStatus       = 'Quotation Pending';
      nextApprover     = await findInDept(ROLES.SENIOR_EMPLOYEE, requirement.department);
      nextApproverRole = ROLES.SENIOR_EMPLOYEE;
      successMsg       = `Budget ≤ AED ${DM_THRESHOLD} — forwarded directly to SE for quotations.`;
      note             = `Budget ≤ AED ${DM_THRESHOLD} — DM skipped BC/MD/DD. ${note}`.trim();
    } else {
      nextStatus       = 'Budget Check';
      nextApprover     = await findInDept(ROLES.BUDGET_CONTROLLER, requirement.department);
      nextApproverRole = ROLES.BUDGET_CONTROLLER;
      successMsg       = `Budget > AED ${DM_THRESHOLD} — forwarded to Budget Controller.`;
      note             = `Budget > AED ${DM_THRESHOLD} (AED ${total.toLocaleString()}) — escalated to BC. ${note}`.trim();
    }
  }

  // ── BC: budget check → routing ────────────────────────────────────────────
  else if (req.user.role === ROLES.BUDGET_CONTROLLER && prev === 'Budget Check') {
    if (total <= BC_THRESHOLD) {
      nextStatus       = 'Director Review';
      nextApprover     = await findDeptHead(requirement.department);
      nextApproverRole = ROLES.DEPARTMENT_DIRECTOR;
      successMsg       = `Budget ≤ AED ${BC_THRESHOLD} — forwarded to Department Head.`;
      note             = `Budget ≤ AED ${BC_THRESHOLD} — approved by BC. ${note}`.trim();
    } else {
      nextStatus       = 'MD Review';
      nextApprover     = await findAnyRole(ROLES.MANAGING_DIRECTOR);
      nextApproverRole = ROLES.MANAGING_DIRECTOR;
      successMsg       = `Budget > AED ${BC_THRESHOLD} — escalated to Managing Director.`;
      note             = `Budget > AED ${BC_THRESHOLD} (AED ${total.toLocaleString()}) — escalated to MD. ${note}`.trim();
    }
  }

  // ── MD: executive approval → Dept Head ───────────────────────────────────
  else if (req.user.role === ROLES.MANAGING_DIRECTOR && prev === 'MD Review') {
    nextStatus       = 'Director Review';
    nextApprover     = await findDeptHead(requirement.department);
    nextApproverRole = ROLES.DEPARTMENT_DIRECTOR;
    successMsg       = 'MD approved. Forwarded to Department Head.';
    note             = `Approved by MD — forwarded to Dept Head. ${note}`.trim();
  }

  // ── Dept Head: first pass → SE for quotations ────────────────────────────
  else if (req.user.role === ROLES.DEPARTMENT_DIRECTOR && prev === 'Director Review') {
    nextStatus       = 'Quotation Pending';
    nextApprover     = await findInDept(ROLES.SENIOR_EMPLOYEE, requirement.department);
    nextApproverRole = ROLES.SENIOR_EMPLOYEE;
    successMsg       = 'Approved. SE must now upload quotations.';
    note             = `Approved by Dept Head — SE to upload quotations. ${note}`.trim();
  }

  // ── SE: quotations submitted → DM review (or Dept Head if no DM) ──────────
  else if (req.user.role === ROLES.SENIOR_EMPLOYEE && prev === 'Quotation Pending') {
    // Accept either old-style quotations[] OR new quotationComparison with at least one vendor filled
    const hasOldQuotations = requirement.quotations && requirement.quotations.length > 0;
    const qc = requirement.quotationComparison;
    const hasComparisonData = qc && (qc.q1?.vendorName || qc.q2?.vendorName || qc.q3?.vendorName);
    if (!hasOldQuotations && !hasComparisonData) {
      return next(new ErrorResponse('Please fill in at least one quotation (Q1/Q2/Q3) before submitting.', 400));
    }
    const dm = await findDeptManager(requirement.department);
    if (dm) {
      nextStatus       = 'Quotation Review';
      nextApprover     = dm;
      nextApproverRole = ROLES.DEPARTMENT_MANAGER;
      successMsg       = 'Quotations submitted to Department Manager for review.';
      note             = `Quotations submitted by SE. ${note}`.trim();
    } else {
      // No DM — go straight to Dept Head for quotation approval
      nextStatus       = 'Director Review2';
      nextApprover     = await findDeptHead(requirement.department);
      nextApproverRole = ROLES.DEPARTMENT_DIRECTOR;
      successMsg       = 'No Dept Manager — quotations submitted directly to Dept Head for approval.';
      note             = `No DM in dept — quotations submitted by SE directly to Dept Head. ${note}`.trim();
    }
  }

  // ── DM: quotation review → Dept Head (Director Review2) ──────────────────
  else if (req.user.role === ROLES.DEPARTMENT_MANAGER && prev === 'Quotation Review') {
    nextStatus       = 'Director Review2';
    nextApprover     = await findDeptHead(requirement.department);
    nextApproverRole = ROLES.DEPARTMENT_DIRECTOR;
    successMsg       = 'Quotations reviewed. Forwarded to Department Head for approval.';
    note             = `Quotations reviewed by DM — forwarded to Dept Head. ${note}`.trim();
  }

  // ── Dept Head: approve quotations → SE uploads PO ────────────────────────
  else if (req.user.role === ROLES.DEPARTMENT_DIRECTOR && prev === 'Director Review2') {
    nextStatus       = 'PO Pending';
    nextApprover     = await findInDept(ROLES.SENIOR_EMPLOYEE, requirement.department);
    nextApproverRole = ROLES.SENIOR_EMPLOYEE;
    successMsg       = 'Quotations approved. SE to prepare and upload the Purchase Order.';
    note             = `Quotations approved by Dept Head — SE to upload PO. ${note}`.trim();
  }

  // ── SE: PO doc uploaded OR poDetails saved → DM reviews PO (or Dept Head if no DM) ─
  else if (req.user.role === ROLES.SENIOR_EMPLOYEE && prev === 'PO Pending') {
    // Allow either a file upload OR structured poDetails (form-based PO builder)
    const hasFile    = requirement.purchaseOrder && requirement.purchaseOrder.document;
    const hasDetails = requirement.poDetails && requirement.poDetails.poNumber;
    if (!hasFile && !hasDetails) {
      return next(new ErrorResponse('Please prepare the Purchase Order (fill in PO details or upload a document) before submitting.', 400));
    }
    const dm = await findDeptManager(requirement.department);
    if (dm) {
      nextStatus       = 'PO Review';
      nextApprover     = dm;
      nextApproverRole = ROLES.DEPARTMENT_MANAGER;
      successMsg       = 'Purchase Order submitted to Department Manager for review.';
      note             = `PO submitted by SE to DM. ${note}`.trim();
    } else {
      // No DM → skip straight to Dept Head for PO sign
      nextStatus       = 'PO Sign';
      nextApprover     = await findDeptHead(requirement.department);
      nextApproverRole = ROLES.DEPARTMENT_DIRECTOR;
      successMsg       = 'No Dept Manager — PO submitted directly to Dept Head for signature.';
      note             = `No DM in dept — PO submitted by SE directly to Dept Head. ${note}`.trim();
    }
  }

  // ── DM: PO review → Dept Head to sign ────────────────────────────────────
  else if (req.user.role === ROLES.DEPARTMENT_MANAGER && prev === 'PO Review') {
    nextStatus       = 'PO Sign';
    nextApprover     = await findDeptHead(requirement.department);
    nextApproverRole = ROLES.DEPARTMENT_DIRECTOR;
    successMsg       = 'PO reviewed. Forwarded to Department Head for digital signature.';
    note             = `PO reviewed by DM — Dept Head to sign. ${note}`.trim();
  }

  // ── Dept Head: confirm signed PO uploaded → SE emails supplier ───────────
  else if (req.user.role === ROLES.DEPARTMENT_DIRECTOR && prev === 'PO Sign') {
    // Accept either: uploaded signed document OR just approving after reviewing auto-generated PO
    const hasSignedDoc = requirement.purchaseOrder?.signedDocument;
    const hasPoDetails = requirement.poDetails?.poNumber;
    if (!hasSignedDoc && !hasPoDetails) {
      return next(new ErrorResponse('Please review the PO before confirming.', 400));
    }
    nextStatus       = 'PO Signed';
    nextApprover     = await findInDept(ROLES.SENIOR_EMPLOYEE, requirement.department);
    nextApproverRole = ROLES.SENIOR_EMPLOYEE;
    successMsg       = 'Signed PO confirmed. SE to email PO to supplier.';
    note             = `Signed PO confirmed by Dept Head. ${note}`.trim();
  }

  // ── SE: confirms PO emailed to supplier → GRN stage ──────────────────────
  else if (req.user.role === ROLES.SENIOR_EMPLOYEE && prev === 'PO Signed') {
    requirement.purchaseOrder.sentAt = new Date();
    nextStatus       = 'GRN Pending';
    nextApprover     = await findInDept(ROLES.SENIOR_EMPLOYEE, requirement.department);
    nextApproverRole = ROLES.SENIOR_EMPLOYEE;
    successMsg       = 'PO sent to supplier. Awaiting goods delivery — prepare GRN after receipt.';
    note             = `PO emailed to supplier by SE. Awaiting delivery. ${note}`.trim();
  }

  // ── SE: GRN submitted → DM review (or Dept Head if no DM) ────────────────
  else if (req.user.role === ROLES.SENIOR_EMPLOYEE && prev === 'GRN Pending') {
    if (!requirement.grn || !requirement.grn.document) {
      return next(new ErrorResponse('Upload the Goods Receipt Note document before submitting.', 400));
    }
    const dm = await findDeptManager(requirement.department);
    if (dm) {
      nextStatus       = 'GRN Review';
      nextApprover     = dm;
      nextApproverRole = ROLES.DEPARTMENT_MANAGER;
      successMsg       = 'GRN submitted to Department Manager for review.';
      note             = `GRN submitted by SE. ${note}`.trim();
    } else {
      // No DM → go straight to Dept Head for GRN approval
      nextStatus       = 'GRN Review2';
      nextApprover     = await findDeptHead(requirement.department);
      nextApproverRole = ROLES.DEPARTMENT_DIRECTOR;
      successMsg       = 'No Dept Manager — GRN submitted directly to Dept Head for approval.';
      note             = `No DM in dept — GRN submitted by SE directly to Dept Head. ${note}`.trim();
    }
  }

  // ── DM: GRN review → Dept Head ────────────────────────────────────────────
  else if (req.user.role === ROLES.DEPARTMENT_MANAGER && prev === 'GRN Review') {
    nextStatus       = 'GRN Review2';
    nextApprover     = await findDeptHead(requirement.department);
    nextApproverRole = ROLES.DEPARTMENT_DIRECTOR;
    successMsg       = 'GRN reviewed. Forwarded to Department Head for final GRN approval.';
    note             = `GRN reviewed by DM — forwarded to Dept Head. ${note}`.trim();
  }

  // ── Dept Head: GRN approved → SE submits to Accountant ───────────────────
  else if (req.user.role === ROLES.DEPARTMENT_DIRECTOR && prev === 'GRN Review2') {
    nextStatus       = 'Payment Pending';
    nextApprover     = await findInDept(ROLES.SENIOR_EMPLOYEE, requirement.department);
    nextApproverRole = ROLES.SENIOR_EMPLOYEE;
    successMsg       = 'GRN approved. SE to submit PO + GRN + Invoice to Senior Accountant.';
    note             = `GRN approved by Dept Head — SE to compile payment docs. ${note}`.trim();
  }

  // ── SE: submits PO+GRN+Invoice to Accountant ─────────────────────────────
  else if (req.user.role === ROLES.SENIOR_EMPLOYEE && prev === 'Payment Pending') {
    if (!requirement.supplierInvoice || !requirement.supplierInvoice.path) {
      return next(new ErrorResponse('Upload the supplier invoice before submitting for payment.', 400));
    }
    nextStatus       = 'Payment Verification';
    nextApprover     = await findAnyRole(ROLES.ACCOUNTANT);
    nextApproverRole = ROLES.ACCOUNTANT;
    successMsg       = 'PO, GRN and Invoice submitted to Senior Accountant for three-way matching.';
    note             = `Payment docs submitted by SE to Accountant. ${note}`.trim();
  }

  // ── Step 1: Senior Accountant — 3-way match → Journal Entry (JA) ──────────
  else if (req.user.role === ROLES.ACCOUNTANT && prev === 'Payment Verification') {
    requirement.threeWayMatch = {
      poMatched: true, grnMatched: true, invoiceMatched: true,
      notes: note || 'Three-way match passed.',
      verifiedAt: new Date(), verifiedBy: req.user._id,
      verifiedByName: `${req.user.firstName} ${req.user.lastName}`,
    };
    nextStatus       = 'Journal Entry';
    nextApprover     = await findAnyRole(ROLES.JUNIOR_ACCOUNTANT);
    nextApproverRole = ROLES.JUNIOR_ACCOUNTANT;
    successMsg       = '✅ 3-way match passed. Sent to Junior Accountant for journal entry.';
    note             = `3-way match verified by SA. JA to make journal entry. ${note}`.trim();
  }

  // ── Step 2: Junior Accountant — journal entry done → SA verifies ────────
  else if (req.user.role === ROLES.JUNIOR_ACCOUNTANT && prev === 'Journal Entry') {
    if (!requirement.journalEntry?.entryNumber) {
      return next(new ErrorResponse('Please save journal entry details before submitting.', 400));
    }
    requirement.journalEntry.enteredBy     = req.user._id;
    requirement.journalEntry.enteredByName = `${req.user.firstName} ${req.user.lastName}`;
    requirement.journalEntry.enteredAt     = new Date();
    requirement.markModified('journalEntry');
    nextStatus       = 'Journal Review';
    nextApprover     = await findAnyRole(ROLES.ACCOUNTANT);
    nextApproverRole = ROLES.ACCOUNTANT;
    successMsg       = 'Journal entry submitted. Sent to Senior Accountant for review.';
    note             = `Journal entry completed by JA. Entry#: ${requirement.journalEntry.entryNumber}. ${note}`.trim();
  }

  // ── Step 3: Senior Accountant — verifies journal entry → FM ─────────────
  else if (req.user.role === ROLES.ACCOUNTANT && prev === 'Journal Review') {
    nextStatus       = 'FM Verification';
    nextApprover     = await findAnyRole(ROLES.FINANCE_MANAGER);
    nextApproverRole = ROLES.FINANCE_MANAGER;
    successMsg       = 'Journal entry verified. Sent to Finance Manager for payment approval.';
    note             = `Journal entry verified by SA. Forwarded to FM. ${note}`.trim();
  }

  // ── Step 4: Finance Manager — verifies & approves → SA makes payment ────
  else if (req.user.role === ROLES.FINANCE_MANAGER && prev === 'FM Verification') {
    requirement.paymentRecord = {
      ...requirement.paymentRecord,
      confirmedBy:     req.user._id,
      confirmedByName: `${req.user.firstName} ${req.user.lastName}`,
      confirmedAt:     new Date(),
    };
    requirement.markModified('paymentRecord');
    nextStatus       = 'Payment Entry';
    nextApprover     = await findAnyRole(ROLES.ACCOUNTANT);
    nextApproverRole = ROLES.ACCOUNTANT;
    successMsg       = 'Payment approved by Finance Manager. Senior Accountant to enter payment details.';
    note             = `Payment approved by FM. SA to make payment. ${note}`.trim();
  }

  // ── Step 5: Senior Accountant — enters payment & makes it → JA for filing
  else if (req.user.role === ROLES.ACCOUNTANT && prev === 'Payment Entry') {
    if (!requirement.paymentRecord?.paymentRef) {
      return next(new ErrorResponse('Please save payment details (reference number) before submitting.', 400));
    }
    requirement.paymentRecord.recordedBy     = req.user._id;
    requirement.paymentRecord.recordedByName = `${req.user.firstName} ${req.user.lastName}`;
    requirement.paymentRecord.recordedAt     = new Date();
    requirement.markModified('paymentRecord');
    nextStatus       = 'Filing';
    nextApprover     = await findAnyRole(ROLES.JUNIOR_ACCOUNTANT);
    nextApproverRole = ROLES.JUNIOR_ACCOUNTANT;
    successMsg       = 'Payment made. Sent to Junior Accountant for filing.';
    note             = `Payment made by SA. Ref: ${requirement.paymentRecord.paymentRef}. JA to file. ${note}`.trim();
  }

  // ── Step 6: Junior Accountant — files documents → Paid ──────────────────
  else if (req.user.role === ROLES.JUNIOR_ACCOUNTANT && prev === 'Filing') {
    nextStatus            = 'Paid';
    requirement.completedAt = new Date();
    successMsg            = '✅ Documents filed. Procurement cycle fully complete!';
    note                  = `Documents filed by JA. Procurement closed. ${note}`.trim();
  }

  else {
    return next(new ErrorResponse(`No workflow action defined for ${req.user.role} at status "${prev}"`, 400));
  }

  requirement.status              = nextStatus;
  requirement.currentApprover     = nextApprover?._id || null;
  requirement.currentApproverRole = nextApproverRole;
  requirement.updatedBy           = req.user._id;
  requirement.timeline.push(makeTimeline(req, `Approved by ${req.user.role}`, prev, nextStatus, note));

  await requirement.save();

  // ── Send in-app notification to the next actor ────────────────────────────
  if (nextApprover) {
    const reqNum = requirement.requirementNumber;
    const item   = requirement.itemName;

    const NOTIF_MAP = {
      'Under Review':          { type:'requirement_submitted',    title:`New Request to Review`,           message:`${reqNum} — "${item}" submitted by ${requirement.employeeName}. Awaiting your review.`,          actionUrl:`/review/${requirement._id}` },
      'Budget Check':          { type:'requirement_approved',     title:`Budget Check Required`,           message:`${reqNum} — "${item}" needs budget verification. Amount: AED ${(requirement.estimatedTotalPrice||0).toLocaleString()}.`, actionUrl:`/review/${requirement._id}` },
      'MD Review':             { type:'requirement_approved',     title:`Executive Approval Required`,     message:`${reqNum} — "${item}" requires your MD approval. Amount: AED ${(requirement.estimatedTotalPrice||0).toLocaleString()}.`, actionUrl:`/review/${requirement._id}` },
      'Director Review':       { type:'requirement_approved',     title:`Director Sign-Off Required`,      message:`${reqNum} — "${item}" needs your approval to proceed to the quotation stage.`,                      actionUrl:`/review/${requirement._id}` },
      'Quotation Pending':     { type:'quotation_pending',        title:`Upload Quotations`,               message:`${reqNum} — "${item}" approved. Please collect and upload vendor quotations.`,                       actionUrl:`/review/${requirement._id}/quotations` },
      'Quotation Review':      { type:'quotation_submitted',      title:`Quotations Ready for Review`,     message:`${reqNum} — "${item}" — SE has uploaded quotations. Please review.`,                                actionUrl:`/review/${requirement._id}` },
      'Director Review2':      { type:'quotation_approved',       title:`Quotations Approved — Review Required`, message:`${reqNum} — "${item}" — DM has reviewed quotations. Your final approval needed.`,            actionUrl:`/review/${requirement._id}` },
      'PO Pending':            { type:'po_pending',               title:`Prepare Purchase Order`,          message:`${reqNum} — "${item}" — Quotations approved by Dept Head. Please prepare and upload the PO.`,       actionUrl:`/review/${requirement._id}/po` },
      'PO Review':             { type:'po_submitted',             title:`Purchase Order Ready for Review`, message:`${reqNum} — "${item}" — SE uploaded the PO. Please review before forwarding for signature.`,         actionUrl:`/review/${requirement._id}` },
      'PO Sign':               { type:'po_review',                title:`Sign Purchase Order`,             message:`${reqNum} — "${item}" — DM approved the PO. Download, sign, and upload the signed version.`,        actionUrl:`/review/${requirement._id}/po-sign` },
      'PO Signed':             { type:'po_signed',                title:`Email Signed PO to Supplier`,    message:`${reqNum} — "${item}" — Dept Head signed the PO. Please email it to the supplier and confirm.`,       actionUrl:`/review/${requirement._id}` },
      'GRN Pending':           { type:'grn_pending',              title:`Create Goods Receipt Note`,       message:`${reqNum} — "${item}" — PO sent to supplier. Prepare GRN once goods are received.`,                  actionUrl:`/review/${requirement._id}/grn` },
      'GRN Review':            { type:'grn_submitted',            title:`GRN Ready for Review`,            message:`${reqNum} — "${item}" — SE submitted the GRN. Please review.`,                                       actionUrl:`/review/${requirement._id}` },
      'GRN Review2':           { type:'grn_submitted',            title:`GRN Awaiting Final Approval`,     message:`${reqNum} — "${item}" — DM reviewed the GRN. Your final approval needed.`,                           actionUrl:`/review/${requirement._id}` },
      'Payment Pending':       { type:'grn_approved',             title:`Submit Payment Documents`,        message:`${reqNum} — "${item}" — GRN approved. Upload supplier invoice and submit for 3-way matching.`,        actionUrl:`/review/${requirement._id}/invoice` },
      'Payment Verification':  { type:'payment_verification',     title:`3-Way Matching Required`,         message:`${reqNum} — "${item}" — SE submitted PO + GRN + Invoice. Please verify for payment approval.`,        actionUrl:`/review/${requirement._id}` },
      'Payment Approved':      { type:'payment_verification',     title:`Payment Confirmation Required`,   message:`${reqNum} — "${item}" — 3-way match passed. Please confirm payment to proceed.`,                    actionUrl:`/review/${requirement._id}` },
      'Payment Processing':    { type:'payment_verification',     title:`Record Payment Details`,          message:`${reqNum} — "${item}" — Finance Manager confirmed. Please record payment reference and details.`,     actionUrl:`/review/${requirement._id}` },
      'Paid':                  { type:'process_completed',        title:`Payment Recorded ✅`,             message:`${reqNum} — "${item}" — Payment recorded. Procurement cycle complete!`,                               actionUrl:`/review/${requirement._id}` },
      'Completed':             { type:'process_completed',        title:`Procurement Complete ✅`,         message:`${reqNum} — "${item}" — 3-way match passed. Invoice approved for payment. Process complete!`,          actionUrl:`/review/${requirement._id}` },
    };

    const notif = NOTIF_MAP[nextStatus];
    if (notif) {
      await sendNotification({
        recipient:         nextApprover._id,
        type:              notif.type,
        title:             notif.title,
        message:           notif.message,
        requirement:       requirement._id,
        requirementNumber: reqNum,
        actionUrl:         notif.actionUrl,
      });
    }
  }

  // Also notify the requesting employee on final completion
  if (nextStatus === 'Paid' || nextStatus === 'Completed') {
    await sendNotification({
      recipient:         requirement.employee,
      type:              'process_completed',
      title:             'Your Purchase Request is Complete ✅',
      message:           `${requirement.requirementNumber} — "${requirement.itemName}" — payment processed. Procurement cycle closed.`,
      requirement:       requirement._id,
      requirementNumber: requirement.requirementNumber,
      actionUrl:         `/requirements/${requirement._id}`,
    });
  }

  res.status(200).json({ success: true, message: successMsg, requirement });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/reject
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectRequirement = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));

  if (!canAct(req.user.role, requirement.status))
    return next(new ErrorResponse(`Your role cannot reject a requirement in "${requirement.status}" status`, 403));
  if (!req.body.note?.trim())
    return next(new ErrorResponse('A reason is required when rejecting', 400));

  const prev = requirement.status;
  requirement.status              = 'Rejected';
  requirement.currentApprover     = null;
  requirement.currentApproverRole = '';
  requirement.updatedBy           = req.user._id;
  requirement.timeline.push(makeTimeline(req, `Rejected by ${req.user.role}`, prev, 'Rejected', req.body.note));

  await requirement.save();
  // Notify requesting employee on rejection
  await sendNotification({
    recipient: requirement.employee, type: 'requirement_rejected',
    title: 'Your Request was Rejected',
    message: `${requirement.requirementNumber} — "${requirement.itemName}" was rejected by ${req.user.role}. Reason: ${req.body.note}`,
    requirement: requirement._id, requirementNumber: requirement.requirementNumber,
    actionUrl: `/requirements/${requirement._id}`,
  });
  res.status(200).json({ success: true, message: 'Requirement rejected.', requirement });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/return
// ─────────────────────────────────────────────────────────────────────────────
exports.returnRequirement = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));

  if (!canAct(req.user.role, requirement.status))
    return next(new ErrorResponse(`Your role cannot return a requirement in "${requirement.status}" status`, 403));
  if (!req.body.note?.trim())
    return next(new ErrorResponse('A reason is required when returning', 400));

  const prev = requirement.status;
  requirement.status              = 'Returned';
  requirement.currentApprover     = null;
  requirement.currentApproverRole = '';
  requirement.updatedBy           = req.user._id;
  requirement.timeline.push(makeTimeline(req, `Returned by ${req.user.role}`, prev, 'Returned', req.body.note));

  await requirement.save();
  // Notify requesting employee on return
  await sendNotification({
    recipient: requirement.employee, type: 'requirement_returned',
    title: 'Your Request was Returned for Correction',
    message: `${requirement.requirementNumber} — "${requirement.itemName}" was returned by ${req.user.role}. Reason: ${req.body.note}`,
    requirement: requirement._id, requirementNumber: requirement.requirementNumber,
    actionUrl: `/requirements/${requirement._id}`,
  });
  res.status(200).json({ success: true, message: 'Requirement returned for correction.', requirement });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/comments
// ─────────────────────────────────────────────────────────────────────────────
exports.addApproverComment = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (!req.body.text?.trim()) return next(new ErrorResponse('Comment text is required', 400));

  requirement.comments.push({
    author:     req.user._id,
    authorName: `${req.user.firstName} ${req.user.lastName}`,
    role:       req.user.role,
    text:       req.body.text,
  });
  await requirement.save();
  res.status(201).json({ success: true, message: 'Comment added.', comments: requirement.comments });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/upload-quotations  (SE only)
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadQuotations = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'Quotation Pending')
    return next(new ErrorResponse(`Quotations can only be uploaded when status is "Quotation Pending". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.SENIOR_EMPLOYEE)
    return next(new ErrorResponse('Only Senior Employee can upload quotations', 403));
  if (!req.files || req.files.length === 0)
    return next(new ErrorResponse('No files uploaded', 400));

  const added = req.files.map(f => ({
    fileName: f.filename, originalName: f.originalname, mimeType: f.mimetype,
    size: f.size, path: f.path, uploadedBy: req.user._id,
  }));
  requirement.quotations.push(...added);
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'Quotations Uploaded', requirement.status, requirement.status,
    `${added.length} quotation file(s) uploaded by SE.`));
  await requirement.save();
  res.status(200).json({ success: true, message: `${added.length} quotation(s) uploaded.`, quotations: requirement.quotations });});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/approval/requirements/:id/quotations/:qId  (SE only)
// ─────────────────────────────────────────────────────────────────────────────
exports.removeQuotation = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'Quotation Pending')
    return next(new ErrorResponse('Quotations can only be removed when status is "Quotation Pending"', 400));
  if (req.user.role !== ROLES.SENIOR_EMPLOYEE)
    return next(new ErrorResponse('Only Senior Employee can remove quotations', 403));

  const q = requirement.quotations.id(req.params.qId);
  if (!q) return next(new ErrorResponse('Quotation not found', 404));

  const fp = path.join(__dirname, '..', q.path);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  q.deleteOne();
  requirement.updatedBy = req.user._id;
  await requirement.save();
  res.status(200).json({ success: true, message: 'Quotation removed.', quotations: requirement.quotations });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/upload-po  (SE uploads PO document)
// Status must be "Quotation Review" or "PO Pending" for SE to upload draft
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadPurchaseOrder = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (!['PO Pending'].includes(requirement.status))
    return next(new ErrorResponse(`PO can only be uploaded when status is "PO Pending". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.SENIOR_EMPLOYEE)
    return next(new ErrorResponse('Only Senior Employee can upload the Purchase Order', 403));
  if (!req.files || req.files.length === 0)
    return next(new ErrorResponse('No file uploaded', 400));

  const f = req.files[0];
  requirement.purchaseOrder = {
    ...requirement.purchaseOrder,
    document: {
      fileName: f.filename, originalName: f.originalname, mimeType: f.mimetype,
      size: f.size, path: f.path, uploadedBy: req.user._id,
    },
  };
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'PO Document Uploaded', requirement.status, requirement.status,
    `Purchase Order document uploaded by SE: ${f.originalname}`));
  await requirement.save();
  res.status(200).json({ success: true, message: 'Purchase Order uploaded.', purchaseOrder: requirement.purchaseOrder });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/upload-signed-po  (Dept Head only)
// Status must be "PO Sign" — DD downloads original, signs offline, uploads back
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadSignedPO = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'PO Sign')
    return next(new ErrorResponse(`Signed PO can only be uploaded when status is "PO Sign". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.DEPARTMENT_DIRECTOR)
    return next(new ErrorResponse('Only Department Head can upload the signed Purchase Order', 403));
  if (!req.files || req.files.length === 0)
    return next(new ErrorResponse('No file uploaded', 400));

  const f = req.files[0];
  // Store signed PO as a separate field so original is preserved
  requirement.purchaseOrder = {
    ...requirement.purchaseOrder,
    signedDocument: {
      fileName:     f.filename,
      originalName: f.originalname,
      mimeType:     f.mimetype,
      size:         f.size,
      path:         f.path,
      uploadedBy:   req.user._id,
    },
    signedAt:     new Date(),
    signedBy:     req.user._id,
    signedByName: `${req.user.firstName} ${req.user.lastName}`,
  };
  requirement.markModified('purchaseOrder');
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'Signed PO Uploaded', requirement.status, requirement.status,
    `Signed PO uploaded by Dept Head: ${f.originalname}`));
  await requirement.save();
  res.status(200).json({
    success: true,
    message: 'Signed Purchase Order uploaded. Click "Confirm & Send to SE" to complete.',
    purchaseOrder: requirement.purchaseOrder,
  });
});
// Status must be "GRN Pending"
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadGRN = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'GRN Pending')
    return next(new ErrorResponse(`GRN can only be uploaded when status is "GRN Pending". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.SENIOR_EMPLOYEE)
    return next(new ErrorResponse('Only Senior Employee can upload the GRN', 403));
  if (!req.files || req.files.length === 0)
    return next(new ErrorResponse('No file uploaded', 400));

  const f = req.files[0];
  const { receivedAt, deliveryNote, quantityReceived, condition } = req.body;
  requirement.grn = {
    document: {
      fileName: f.filename, originalName: f.originalname, mimeType: f.mimetype,
      size: f.size, path: f.path, uploadedBy: req.user._id,
    },
    receivedAt:       receivedAt ? new Date(receivedAt) : new Date(),
    deliveryNote:     deliveryNote || '',
    quantityReceived: quantityReceived ? Number(quantityReceived) : requirement.quantity,
    condition:        condition || '',
  };
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'GRN Document Uploaded', requirement.status, requirement.status,
    `GRN uploaded by SE: ${f.originalname}`));
  await requirement.save();
  res.status(200).json({ success: true, message: 'GRN uploaded.', grn: requirement.grn });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/upload-invoice  (SE uploads supplier invoice)
// Status must be "Payment Pending"
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadInvoice = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'Payment Pending')
    return next(new ErrorResponse(`Invoice can only be uploaded when status is "Payment Pending". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.SENIOR_EMPLOYEE)
    return next(new ErrorResponse('Only Senior Employee can upload the supplier invoice', 403));
  if (!req.files || req.files.length === 0)
    return next(new ErrorResponse('No file uploaded', 400));

  const f = req.files[0];
  const { invoiceNumber, invoiceDate, invoiceAmount } = req.body;
  requirement.supplierInvoice = {
    fileName: f.filename, originalName: f.originalname, mimeType: f.mimetype,
    size: f.size, path: f.path, uploadedBy: req.user._id,
  };
  if (invoiceNumber) requirement.invoiceNumber = invoiceNumber;
  if (invoiceDate)   requirement.invoiceDate   = new Date(invoiceDate);
  if (invoiceAmount) requirement.invoiceAmount  = Number(invoiceAmount);
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'Supplier Invoice Uploaded', requirement.status, requirement.status,
    `Invoice uploaded by SE: ${f.originalname}${invoiceNumber ? ` (Inv# ${invoiceNumber})` : ''}`));
  await requirement.save();
  res.status(200).json({
    success: true, message: 'Supplier invoice uploaded.',
    supplierInvoice: requirement.supplierInvoice,
    invoiceNumber: requirement.invoiceNumber,
    invoiceDate: requirement.invoiceDate,
    invoiceAmount: requirement.invoiceAmount,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/record-supplier-email  (SE records supplier email)
// Status must be "PO Signed"
// ─────────────────────────────────────────────────────────────────────────────
exports.recordSupplierEmail = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'PO Signed')
    return next(new ErrorResponse(`Supplier email can only be recorded when status is "PO Signed". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.SENIOR_EMPLOYEE)
    return next(new ErrorResponse('Only Senior Employee can record supplier email', 403));

  const { supplierEmail } = req.body;
  if (supplierEmail) {
    if (!requirement.purchaseOrder) requirement.purchaseOrder = {};
    requirement.purchaseOrder.supplierEmail = supplierEmail;
    requirement.markModified('purchaseOrder');
  }
  await requirement.save();
  res.status(200).json({ success: true, message: 'Supplier email recorded.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/three-way-reject  (Accountant only)
// Fails 3-way matching — returns to SE
// ─────────────────────────────────────────────────────────────────────────────
exports.threeWayReject = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'Payment Verification')
    return next(new ErrorResponse('Three-way reject only allowed in "Payment Verification" status', 403));
  if (req.user.role !== ROLES.ACCOUNTANT)
    return next(new ErrorResponse('Only Accountant can perform three-way matching', 403));
  if (!req.body.note?.trim())
    return next(new ErrorResponse('A reason is required when failing 3-way match', 400));

  requirement.threeWayMatch = {
    poMatched:      req.body.poMatched      ?? false,
    grnMatched:     req.body.grnMatched     ?? false,
    invoiceMatched: req.body.invoiceMatched ?? false,
    notes:          req.body.note,
    verifiedAt:     new Date(),
    verifiedBy:     req.user._id,
    verifiedByName: `${req.user.firstName} ${req.user.lastName}`,
  };
  const prev = requirement.status;
  requirement.status              = 'Returned';
  requirement.currentApprover     = null;
  requirement.currentApproverRole = '';
  requirement.updatedBy           = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'Three-Way Match Failed', prev, 'Returned',
    `3-way match failed by Accountant: ${req.body.note}`));
  await requirement.save();
  res.status(200).json({ success: true, message: 'Three-way match failed. Requirement returned.', requirement });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/save-quotation-comparison  (SE only)
// Saves Q1/Q2/Q3 comparison data + optional PDF file per quote
// Status must be "Quotation Pending"
// ─────────────────────────────────────────────────────────────────────────────
exports.saveQuotationComparison = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'Quotation Pending')
    return next(new ErrorResponse(`Quotation comparison can only be saved when status is "Quotation Pending". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.SENIOR_EMPLOYEE)
    return next(new ErrorResponse('Only Senior Employee can save quotation comparison', 403));

  // Parse JSON body fields (sent as FormData strings)
  let comparison = {};
  try {
    comparison = typeof req.body.comparison === 'string'
      ? JSON.parse(req.body.comparison)
      : req.body.comparison || {};
  } catch {
    return next(new ErrorResponse('Invalid comparison data format', 400));
  }

  // Map uploaded files: field names q1File, q2File, q3File
  const fileMap = {};
  if (req.files && Array.isArray(req.files)) {
    req.files.forEach(f => { fileMap[f.fieldname] = f; });
  }

  const buildQuote = (key, data) => {
    const q = {
      vendorName:    data.vendorName    || '',
      vendorContact: data.vendorContact || '',
      unitPrice:     Number(data.unitPrice)    || 0,
      totalPrice:    Number(data.totalPrice)   || 0,
      deliveryDays:  Number(data.deliveryDays) || 0,
      paymentTerms:  data.paymentTerms  || '',
      warranty:      data.warranty      || '',
      remarks:       data.remarks       || '',
    };
    const fileField = `${key}File`;
    if (fileMap[fileField]) {
      const f = fileMap[fileField];
      q.quotationFile = {
        fileName: f.filename, originalName: f.originalname,
        mimeType: f.mimetype, size: f.size,
        path: f.path,
        uploadedBy: req.user._id,
      };
    } else if (requirement.quotationComparison?.[key]?.quotationFile) {
      // Keep existing file if not replaced
      q.quotationFile = requirement.quotationComparison[key].quotationFile;
    }
    return q;
  };

  requirement.quotationComparison = {
    preparedBy:           `${req.user.firstName} ${req.user.lastName}`,
    preparedDate:         new Date(),
    q1:                   buildQuote('q1', comparison.q1 || {}),
    q2:                   buildQuote('q2', comparison.q2 || {}),
    q3:                   buildQuote('q3', comparison.q3 || {}),
    recommendedVendor:    comparison.recommendedVendor    || '',
    recommendationReason: comparison.recommendationReason || '',
  };
  requirement.markModified('quotationComparison');
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'Quotation Comparison Saved', requirement.status, requirement.status,
    `Quotation comparison table saved by SE. Recommended: ${comparison.recommendedVendor || 'Not set'}`));
  await requirement.save();
  res.status(200).json({ success: true, message: 'Quotation comparison saved.', quotationComparison: requirement.quotationComparison });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/save-po-details  (SE only)
// Saves structured PO form data — no file upload, generates formatted PO on frontend
// Status must be "PO Pending"
// ─────────────────────────────────────────────────────────────────────────────
exports.savePoDetails = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'PO Pending')
    return next(new ErrorResponse(`PO details can only be saved when status is "PO Pending". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.SENIOR_EMPLOYEE)
    return next(new ErrorResponse('Only Senior Employee can save PO details', 403));

  const d = req.body;

  // Calculate line item totals
  const items = (d.items || []).map(item => ({
    description: item.description || '',
    quantity:    Number(item.quantity)  || 0,
    unit:        item.unit || '',
    unitPrice:   Number(item.unitPrice) || 0,
    totalPrice:  +(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toFixed(2),
  }));

  const subtotal    = +items.reduce((s, i) => s + i.totalPrice, 0).toFixed(2);
  const vatPercent  = Number(d.vatPercent) || 0;
  const vat         = +(subtotal * vatPercent / 100).toFixed(2);
  const grandTotal  = +(subtotal + vat).toFixed(2);

  requirement.poDetails = {
    poNumber:          d.poNumber          || `PO-${requirement.requirementNumber}`,
    poDate:            d.poDate ? new Date(d.poDate) : new Date(),
    toName:            d.toName            || '',
    toAddress:         d.toAddress         || '',
    toContact:         d.toContact         || '',
    toEmail:           d.toEmail           || '',
    fromName:          d.fromName          || requirement.departmentName,
    fromAddress:       d.fromAddress       || '',
    subjectRef:        d.subjectRef        || requirement.itemName,
    // New fields matching the PO template
    siteProject:       d.siteProject       || '',
    quotationRef:      d.quotationRef      || '',
    quotationDate:     d.quotationDate ? new Date(d.quotationDate) : null,
    completionDate:    d.completionDate ? new Date(d.completionDate) : null,
    grandTotalWords:   d.grandTotalWords   || '',
    billingAddress:    d.billingAddress    || '',
    authorizedBy2:     d.authorizedBy2     || '',
    authorizedTitle2:  d.authorizedTitle2  || '',
    items,
    subtotal,
    vat,
    vatPercent,
    grandTotal,
    currency:          d.currency          || 'AED',
    paymentTerms:      d.paymentTerms      || '',
    deliveryTerms:     d.deliveryTerms     || '',
    deliveryLocation:  d.deliveryLocation  || requirement.deliveryLocation,
    warrantyTerms:     d.warrantyTerms     || '',
    specialConditions: d.specialConditions || '',
    authorizedBy:      d.authorizedBy      || `${req.user.firstName} ${req.user.lastName}`,
    authorizedTitle:   d.authorizedTitle   || req.user.role,
  };
  requirement.markModified('poDetails');
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'PO Details Saved', requirement.status, requirement.status,
    `PO details saved by SE. PO#: ${requirement.poDetails.poNumber}, Total: ${d.currency || 'AED'} ${grandTotal.toLocaleString()}`));
  await requirement.save();
  res.status(200).json({ success: true, message: 'PO details saved.', poDetails: requirement.poDetails });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/save-journal-entry  (Junior Accountant)
// ─────────────────────────────────────────────────────────────────────────────
exports.saveJournalEntry = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'Journal Entry')
    return next(new ErrorResponse(`Journal entry can only be saved when status is "Journal Entry". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.JUNIOR_ACCOUNTANT)
    return next(new ErrorResponse('Only Junior Accountant can save journal entry', 403));

  const d = req.body;
  requirement.journalEntry = {
    entryNumber:   d.entryNumber   || '',
    debitAccount:  d.debitAccount  || '',
    creditAccount: d.creditAccount || '',
    amount:        Number(d.amount) || requirement.invoiceAmount || requirement.estimatedTotalPrice,
    narration:     d.narration     || '',
    entryDate:     d.entryDate ? new Date(d.entryDate) : new Date(),
  };
  requirement.markModified('journalEntry');
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'Journal Entry Saved', requirement.status, requirement.status,
    `Journal entry saved by JA. Entry#: ${d.entryNumber || '—'}`));
  await requirement.save();
  res.status(200).json({ success: true, message: 'Journal entry saved.', journalEntry: requirement.journalEntry });
});
// Saves payment details before marking as Paid
// ─────────────────────────────────────────────────────────────────────────────
exports.savePaymentRecord = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'Payment Processing')
    return next(new ErrorResponse(`Payment record can only be saved when status is "Payment Processing". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.JUNIOR_ACCOUNTANT)
    return next(new ErrorResponse('Only Junior Accountant can record payment details', 403));

  const d = req.body;
  requirement.paymentRecord = {
    ...requirement.paymentRecord,
    paymentDate:   d.paymentDate   ? new Date(d.paymentDate) : new Date(),
    paymentRef:    d.paymentRef    || '',
    paymentMethod: d.paymentMethod || '',
    bankName:      d.bankName      || '',
    amountPaid:    Number(d.amountPaid) || requirement.invoiceAmount || requirement.estimatedTotalPrice,
    currency:      d.currency      || 'AED',
    notes:         d.notes         || '',
  };
  requirement.markModified('paymentRecord');
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'Payment Record Saved', requirement.status, requirement.status,
    `Payment details saved by Junior Accountant. Ref: ${d.paymentRef || '—'}`));
  await requirement.save();
  res.status(200).json({ success: true, message: 'Payment record saved.', paymentRecord: requirement.paymentRecord });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/save-journal-entry  (Junior Accountant)
// Status must be "Journal Entry"
// ─────────────────────────────────────────────────────────────────────────────
exports.saveJournalEntry = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'Journal Entry')
    return next(new ErrorResponse(`Journal entry can only be saved when status is "Journal Entry". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.JUNIOR_ACCOUNTANT)
    return next(new ErrorResponse('Only Junior Accountant can save journal entry', 403));

  const d = req.body;
  requirement.journalEntry = {
    entryNumber:   d.entryNumber   || '',
    debitAccount:  d.debitAccount  || '',
    creditAccount: d.creditAccount || '',
    amount:        Number(d.amount) || requirement.invoiceAmount || requirement.estimatedTotalPrice || 0,
    narration:     d.narration     || '',
    entryDate:     d.entryDate ? new Date(d.entryDate) : new Date(),
    voucherType:   d.voucherType   || '',
    referenceNo:   d.referenceNo   || '',
  };
  // Attach uploaded journal voucher document if provided
  if (req.files && req.files.length > 0) {
    const f = req.files[0];
    requirement.journalEntry.document = {
      originalName: f.originalname,
      filename:     f.filename,
      path:         f.path,
      mimeType:     f.mimetype,
      size:         f.size,
      uploadedAt:   new Date(),
    };
  } else if (req.file) {
    const f = req.file;
    requirement.journalEntry.document = {
      originalName: f.originalname,
      filename:     f.filename,
      path:         f.path,
      mimeType:     f.mimetype,
      size:         f.size,
      uploadedAt:   new Date(),
    };
  }
  requirement.markModified('journalEntry');
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'Journal Entry Saved', requirement.status, requirement.status,
    `Journal entry saved by JA. Entry#: ${d.entryNumber || '—'}`));
  await requirement.save();
  res.status(200).json({ success: true, message: 'Journal entry saved.', journalEntry: requirement.journalEntry });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/approval/requirements/:id/save-payment-record  (Senior Accountant)
// Status must be "Payment Entry"
// ─────────────────────────────────────────────────────────────────────────────
exports.savePaymentRecord = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.status !== 'Payment Entry')
    return next(new ErrorResponse(`Payment record can only be saved when status is "Payment Entry". Current: "${requirement.status}"`, 400));
  if (req.user.role !== ROLES.ACCOUNTANT)
    return next(new ErrorResponse('Only Senior Accountant can record payment details', 403));

  const d = req.body;
  requirement.paymentRecord = {
    ...requirement.paymentRecord,
    paymentDate:   d.paymentDate   ? new Date(d.paymentDate) : new Date(),
    paymentRef:    d.paymentRef    || `PAY-${requirement.requirementNumber}`,
    paymentMethod: d.paymentMethod || 'Bank Transfer',
    bankName:      d.bankName      || '',
    amountPaid:    Number(d.amountPaid) || requirement.invoiceAmount || requirement.estimatedTotalPrice || 0,
    currency:      d.currency      || 'AED',
    notes:         d.notes         || '',
  };
  // Optional payment receipt file
  const f = (req.files && req.files[0]) || req.file;
  if (f) {
    requirement.paymentRecord.document = {
      originalName: f.originalname,
      filename:     f.filename,
      path:         f.path,
      mimeType:     f.mimetype,
      size:         f.size,
      uploadedAt:   new Date(),
    };
  }
  requirement.markModified('paymentRecord');
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'Payment Details Saved', requirement.status, requirement.status,
    `Payment details saved by SA. Ref: ${d.paymentRef || '—'}`));
  await requirement.save();
  res.status(200).json({ success: true, message: 'Payment record saved.', paymentRecord: requirement.paymentRecord });
});
