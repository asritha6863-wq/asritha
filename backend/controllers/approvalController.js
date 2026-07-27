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
const asyncHandler  = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
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
  [ROLES.ACCOUNTANT]:          { actOn: ['Payment Verification'] },
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/approval/queue
// ─────────────────────────────────────────────────────────────────────────────
exports.getQueue = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, priority, category, search } = req.query;
  const step = getStep(req.user.role);

  if (!step) return res.status(200).json({ success: true, count: 0, total: 0, pages: 1, requirements: [] });

  // MD, DD, and Accountant see across departments; others filter by own dept
  const wideRoles = [ROLES.MANAGING_DIRECTOR, ROLES.DEPARTMENT_DIRECTOR, ROLES.ACCOUNTANT];
  const deptFilter = (!wideRoles.includes(req.user.role) && req.user.department)
    ? { department: req.user.department }
    : {};

  const filter = { status: { $in: step.actOn }, ...deptFilter };
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
  const wideRoles = [ROLES.MANAGING_DIRECTOR, ROLES.DEPARTMENT_DIRECTOR, ROLES.ACCOUNTANT];
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

  // ── SE: initial review → DM ───────────────────────────────────────────────
  if (req.user.role === ROLES.SENIOR_EMPLOYEE && prev === 'Submitted') {
    nextStatus       = 'Under Review';
    nextApprover     = await findInDept(ROLES.DEPARTMENT_MANAGER, requirement.department);
    nextApproverRole = ROLES.DEPARTMENT_MANAGER;
    successMsg       = 'Forwarded to Department Manager.';
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
      nextApprover     = await findInDept(ROLES.DEPARTMENT_DIRECTOR, requirement.department) || await findAnyRole(ROLES.DEPARTMENT_DIRECTOR);
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
    nextApprover     = await findInDept(ROLES.DEPARTMENT_DIRECTOR, requirement.department) || await findAnyRole(ROLES.DEPARTMENT_DIRECTOR);
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

  // ── SE: quotations submitted → DM review ─────────────────────────────────
  else if (req.user.role === ROLES.SENIOR_EMPLOYEE && prev === 'Quotation Pending') {
    if (!requirement.quotations || requirement.quotations.length === 0) {
      return next(new ErrorResponse('Upload at least one quotation before submitting.', 400));
    }
    nextStatus       = 'Quotation Review';
    nextApprover     = await findInDept(ROLES.DEPARTMENT_MANAGER, requirement.department);
    nextApproverRole = ROLES.DEPARTMENT_MANAGER;
    successMsg       = 'Quotations submitted to Department Manager for review.';
    note             = `Quotations submitted by SE. ${note}`.trim();
  }

  // ── DM: quotation review → Dept Head (Director Review2) ──────────────────
  else if (req.user.role === ROLES.DEPARTMENT_MANAGER && prev === 'Quotation Review') {
    nextStatus       = 'Director Review2';
    nextApprover     = await findInDept(ROLES.DEPARTMENT_DIRECTOR, requirement.department) || await findAnyRole(ROLES.DEPARTMENT_DIRECTOR);
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

  // ── SE: PO doc uploaded → DM reviews PO ──────────────────────────────────
  else if (req.user.role === ROLES.SENIOR_EMPLOYEE && prev === 'PO Pending') {
    if (!requirement.purchaseOrder || !requirement.purchaseOrder.document) {
      return next(new ErrorResponse('Upload the Purchase Order document before submitting.', 400));
    }
    nextStatus       = 'PO Review';
    nextApprover     = await findInDept(ROLES.DEPARTMENT_MANAGER, requirement.department);
    nextApproverRole = ROLES.DEPARTMENT_MANAGER;
    successMsg       = 'Purchase Order submitted to Department Manager for review.';
    note             = `PO document submitted by SE to DM. ${note}`.trim();
  }

  // ── DM: PO review → Dept Head to sign ────────────────────────────────────
  else if (req.user.role === ROLES.DEPARTMENT_MANAGER && prev === 'PO Review') {
    nextStatus       = 'PO Sign';
    nextApprover     = await findInDept(ROLES.DEPARTMENT_DIRECTOR, requirement.department) || await findAnyRole(ROLES.DEPARTMENT_DIRECTOR);
    nextApproverRole = ROLES.DEPARTMENT_DIRECTOR;
    successMsg       = 'PO reviewed. Forwarded to Department Head for digital signature.';
    note             = `PO reviewed by DM — Dept Head to sign. ${note}`.trim();
  }

  // ── Dept Head: confirm signed PO uploaded → SE emails supplier ───────────
  else if (req.user.role === ROLES.DEPARTMENT_DIRECTOR && prev === 'PO Sign') {
    if (!requirement.purchaseOrder?.signedDocument) {
      return next(new ErrorResponse('Please upload the signed Purchase Order document before confirming.', 400));
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

  // ── SE: GRN submitted → DM review ────────────────────────────────────────
  else if (req.user.role === ROLES.SENIOR_EMPLOYEE && prev === 'GRN Pending') {
    if (!requirement.grn || !requirement.grn.document) {
      return next(new ErrorResponse('Upload the Goods Receipt Note document before submitting.', 400));
    }
    nextStatus       = 'GRN Review';
    nextApprover     = await findInDept(ROLES.DEPARTMENT_MANAGER, requirement.department);
    nextApproverRole = ROLES.DEPARTMENT_MANAGER;
    successMsg       = 'GRN submitted to Department Manager for review.';
    note             = `GRN submitted by SE. ${note}`.trim();
  }

  // ── DM: GRN review → Dept Head ────────────────────────────────────────────
  else if (req.user.role === ROLES.DEPARTMENT_MANAGER && prev === 'GRN Review') {
    nextStatus       = 'GRN Review2';
    nextApprover     = await findInDept(ROLES.DEPARTMENT_DIRECTOR, requirement.department) || await findAnyRole(ROLES.DEPARTMENT_DIRECTOR);
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

  // ── Accountant: 3-way matching approved → Completed ──────────────────────
  else if (req.user.role === ROLES.ACCOUNTANT && prev === 'Payment Verification') {
    requirement.threeWayMatch = {
      poMatched:      true,
      grnMatched:     true,
      invoiceMatched: true,
      notes:          note || 'Three-way match passed. Invoice approved for payment.',
      verifiedAt:     new Date(),
      verifiedBy:     req.user._id,
      verifiedByName: `${req.user.firstName} ${req.user.lastName}`,
    };
    nextStatus            = 'Completed';
    requirement.completedAt = new Date();
    successMsg            = '✅ Three-way match passed. Invoice approved for payment. Process complete!';
    note                  = `3-way match verified by Accountant. PO + GRN + Invoice all match. ${note}`.trim();
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
    size: f.size, path: `uploads/requirements/${f.filename}`, uploadedBy: req.user._id,
  }));
  requirement.quotations.push(...added);
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(makeTimeline(req, 'Quotations Uploaded', requirement.status, requirement.status,
    `${added.length} quotation file(s) uploaded by SE.`));
  await requirement.save();
  res.status(200).json({ success: true, message: `${added.length} quotation(s) uploaded.`, quotations: requirement.quotations });
});

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
      size: f.size, path: `uploads/requirements/${f.filename}`, uploadedBy: req.user._id,
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
      path:         `uploads/requirements/${f.filename}`,
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
      size: f.size, path: `uploads/requirements/${f.filename}`, uploadedBy: req.user._id,
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
    size: f.size, path: `uploads/requirements/${f.filename}`, uploadedBy: req.user._id,
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
