const Designation = require('../models/Designation');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

// @desc    Get all designations
// @route   GET /api/admin/designations
// @access  Private/Admin
exports.getDesignations = asyncHandler(async (req, res) => {
  const designations = await Designation.find().populate('department', 'departmentName departmentCode');
  res.status(200).json({ success: true, count: designations.length, designations });
});

// @desc    Get single designation
// @route   GET /api/admin/designations/:id
// @access  Private/Admin
exports.getDesignation = asyncHandler(async (req, res, next) => {
  const designation = await Designation.findById(req.params.id).populate(
    'department',
    'departmentName departmentCode'
  );

  if (!designation) {
    return next(new ErrorResponse(`Designation not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, designation });
});

// @desc    Create a designation
// @route   POST /api/admin/designations
// @access  Private/Admin
exports.createDesignation = asyncHandler(async (req, res) => {
  const designation = await Designation.create(req.body);
  res.status(201).json({ success: true, message: 'Designation created successfully.', designation });
});

// @desc    Update a designation
// @route   PUT /api/admin/designations/:id
// @access  Private/Admin
exports.updateDesignation = asyncHandler(async (req, res, next) => {
  const designation = await Designation.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!designation) {
    return next(new ErrorResponse(`Designation not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, message: 'Designation updated successfully.', designation });
});

// @desc    Delete a designation
// @route   DELETE /api/admin/designations/:id
// @access  Private/Admin
exports.deleteDesignation = asyncHandler(async (req, res, next) => {
  const designation = await Designation.findByIdAndDelete(req.params.id);

  if (!designation) {
    return next(new ErrorResponse(`Designation not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, message: 'Designation deleted successfully.' });
});
