const Department = require('../models/Department');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');

// @desc    Get all departments
// @route   GET /api/admin/departments
// @access  Private/Admin
exports.getDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find().populate('departmentHead', 'firstName lastName email');
  res.status(200).json({ success: true, count: departments.length, departments });
});

// @desc    Get single department
// @route   GET /api/admin/departments/:id
// @access  Private/Admin
exports.getDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findById(req.params.id).populate(
    'departmentHead',
    'firstName lastName email'
  );

  if (!department) {
    return next(new ErrorResponse(`Department not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, department });
});

// @desc    Create a department
// @route   POST /api/admin/departments
// @access  Private/Admin
exports.createDepartment = asyncHandler(async (req, res) => {
  const department = await Department.create(req.body);
  res.status(201).json({ success: true, message: 'Department created successfully.', department });
});

// @desc    Update a department
// @route   PUT /api/admin/departments/:id
// @access  Private/Admin
exports.updateDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!department) {
    return next(new ErrorResponse(`Department not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, message: 'Department updated successfully.', department });
});

// @desc    Delete a department
// @route   DELETE /api/admin/departments/:id
// @access  Private/Admin
exports.deleteDepartment = asyncHandler(async (req, res, next) => {
  const department = await Department.findByIdAndDelete(req.params.id);

  if (!department) {
    return next(new ErrorResponse(`Department not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, message: 'Department deleted successfully.' });
});
