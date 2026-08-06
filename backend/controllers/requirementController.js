const path = require('path');
const fs = require('fs');
const Requirement = require('../models/Requirement');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

const EDIT_STATUSES = ['Draft', 'Returned'];

const pushTimeline = (req, action, fromStatus, toStatus, note = '') => ({
  action,
  actor: req.user._id,
  actorName: `${req.user.firstName} ${req.user.lastName}`,
  role: req.user.role,
  note,
  fromStatus,
  toStatus,
});

// @desc  Get all requirements for logged-in employee
// @route GET /api/requirements
exports.getRequirements = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, priority, category, search, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const filter = { employee: req.user._id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (search) {
    filter.$or = [
      { requirementNumber: { $regex: search, $options: 'i' } },
      { itemName: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }
  if (dateFrom || dateTo) {
    filter.createdAt = {};
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
    if (dateTo) filter.createdAt.$lte = new Date(dateTo);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  const [requirements, total] = await Promise.all([
    Requirement.find(filter).sort(sort).skip(skip).limit(parseInt(limit))
      .populate('department', 'departmentName departmentCode')
      .populate('currentApprover', 'firstName lastName role')
      .select('-comments -timeline'),
    Requirement.countDocuments(filter),
  ]);

  res.status(200).json({ success: true, count: requirements.length, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), requirements });
});

// @desc  Get single requirement
// @route GET /api/requirements/:id
exports.getRequirement = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id)
    .populate('department', 'departmentName departmentCode')
    .populate('designation', 'designationName level')
    .populate('currentApprover', 'firstName lastName role')
    .populate('timeline.actor', 'firstName lastName')
    .populate('comments.author', 'firstName lastName role');

  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.employee.toString() !== req.user._id.toString()) {
    return next(new ErrorResponse('Not authorized to view this requirement', 403));
  }

  res.status(200).json({ success: true, requirement });
});

// @desc  Create requirement (Draft)
// @route POST /api/requirements
exports.createRequirement = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (!user.department) return next(new ErrorResponse('No department assigned to your profile. Contact an administrator.', 400));

  const populatedUser = await require('../models/User').findById(user._id)
    .populate('department', 'departmentName')
    .populate('designation', 'designationName');

  const data = {
    ...req.body,
    employee: user._id,
    employeeId: user.employeeId,
    employeeName: `${user.firstName} ${user.lastName}`,
    department: user.department,
    departmentName: populatedUser?.department?.departmentName || '',
    designation: user.designation || null,
    designationName: populatedUser?.designation?.designationName || '',
    status: 'Draft',
    createdBy: user._id,
    updatedBy: user._id,
  };

  const requirement = await Requirement.create(data);
  requirement.timeline.push(pushTimeline(req, 'Created', null, 'Draft', 'Requirement created as draft'));
  await requirement.save();

  res.status(201).json({ success: true, message: 'Requirement saved as draft.', requirement });
});

// @desc  Update requirement (Draft/Returned only)
// @route PUT /api/requirements/:id
exports.updateRequirement = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.employee.toString() !== req.user._id.toString()) return next(new ErrorResponse('Not authorized', 403));
  if (!EDIT_STATUSES.includes(requirement.status)) return next(new ErrorResponse(`Cannot edit a ${requirement.status} requirement`, 400));

  const allowed = ['category','itemName','brand','model','specification','quantity','unit','estimatedUnitPrice','priority','purpose','requiredDate','deliveryLocation'];
  allowed.forEach(f => { if (req.body[f] !== undefined) requirement[f] = req.body[f]; });
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(pushTimeline(req, 'Updated', requirement.status, requirement.status, 'Details updated'));
  await requirement.save();

  res.status(200).json({ success: true, message: 'Requirement updated.', requirement });
});

// @desc  Delete requirement (Draft only)
// @route DELETE /api/requirements/:id
exports.deleteRequirement = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.employee.toString() !== req.user._id.toString()) return next(new ErrorResponse('Not authorized', 403));
  if (requirement.status !== 'Draft') return next(new ErrorResponse('Only Draft requirements can be deleted', 400));

  for (const att of requirement.attachments) {
    const fp = path.join(__dirname, '..', att.path);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }
  await requirement.deleteOne();
  res.status(200).json({ success: true, message: 'Requirement deleted.' });
});

// @desc  Submit requirement for approval
// @route POST /api/requirements/:id/submit
exports.submitRequirement = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.employee.toString() !== req.user._id.toString()) return next(new ErrorResponse('Not authorized', 403));
  if (!['Draft', 'Returned'].includes(requirement.status)) return next(new ErrorResponse(`Cannot submit a ${requirement.status} requirement`, 400));

  const prev = requirement.status;
  requirement.status = 'Submitted';
  requirement.submittedAt = new Date();
  requirement.updatedBy = req.user._id;
  requirement.timeline.push(pushTimeline(req, 'Submitted', prev, 'Submitted', req.body.note || ''));
  await requirement.save();

  res.status(200).json({ success: true, message: 'Requirement submitted for approval.', requirement });
});

// @desc  Add comment
// @route POST /api/requirements/:id/comments
exports.addComment = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.employee.toString() !== req.user._id.toString()) return next(new ErrorResponse('Not authorized', 403));

  requirement.comments.push({ author: req.user._id, authorName: `${req.user.firstName} ${req.user.lastName}`, role: req.user.role, text: req.body.text });
  await requirement.save();
  res.status(201).json({ success: true, message: 'Comment added.', comments: requirement.comments });
});

// @desc  Upload attachments
// @route POST /api/requirements/:id/upload
exports.uploadAttachments = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.employee.toString() !== req.user._id.toString()) return next(new ErrorResponse('Not authorized', 403));
  if (!EDIT_STATUSES.includes(requirement.status)) return next(new ErrorResponse(`Cannot upload files to a ${requirement.status} requirement`, 400));
  if (!req.files || req.files.length === 0) return next(new ErrorResponse('No files uploaded', 400));

  const added = req.files.map(f => ({
    fileName: f.filename,
    originalName: f.originalname,
    mimeType: f.mimetype,
    size: f.size,
    path: f.path,
    uploadedBy: req.user._id,
  }));
  requirement.attachments.push(...added);
  requirement.updatedBy = req.user._id;
  await requirement.save();
  res.status(200).json({ success: true, message: `${added.length} file(s) uploaded.`, attachments: requirement.attachments });
});

// @desc  Remove attachment
// @route DELETE /api/requirements/:id/attachments/:attId
exports.removeAttachment = asyncHandler(async (req, res, next) => {
  const requirement = await Requirement.findById(req.params.id);
  if (!requirement) return next(new ErrorResponse('Requirement not found', 404));
  if (requirement.employee.toString() !== req.user._id.toString()) return next(new ErrorResponse('Not authorized', 403));
  if (!EDIT_STATUSES.includes(requirement.status)) return next(new ErrorResponse(`Cannot remove files from a ${requirement.status} requirement`, 400));

  const att = requirement.attachments.id(req.params.attId);
  if (!att) return next(new ErrorResponse('Attachment not found', 404));

  const fp = path.join(__dirname, '..', att.path);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
  att.deleteOne();
  requirement.updatedBy = req.user._id;
  await requirement.save();
  res.status(200).json({ success: true, message: 'Attachment removed.', attachments: requirement.attachments });
});

// @desc  Dashboard stats
// @route GET /api/requirements/stats
exports.getStats = asyncHandler(async (req, res) => {
  const empId = req.user._id;

  const [statusAgg, monthlyAgg, categoryAgg, recent] = await Promise.all([
    Requirement.aggregate([{ $match: { employee: empId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Requirement.aggregate([
      { $match: { employee: empId, createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 5)) } } },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]),
    Requirement.aggregate([{ $match: { employee: empId } }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Requirement.find({ employee: empId }).sort({ createdAt: -1 }).limit(5).select('requirementNumber itemName status priority estimatedTotalPrice createdAt'),
  ]);

  const stats = { total: 0, Draft: 0, Submitted: 0, 'Under Review': 0, Approved: 0, Rejected: 0, Returned: 0, Completed: 0 };
  statusAgg.forEach(({ _id, count }) => { stats[_id] = count; stats.total += count; });

  res.status(200).json({ success: true, stats, monthly: monthlyAgg, byCategory: categoryAgg, recentRequirements: recent });
});
