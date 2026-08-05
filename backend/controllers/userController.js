const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const path = require('path');
const fs   = require('fs');

// @desc    Get all users (supports ?role=&department=&search=&page=&limit=)
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res) => {
  const { role, department, search, page = 1, limit = 20 } = req.query;

  const query = {};
  if (role) query.role = role;
  if (department) query.department = department;
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [users, total] = await Promise.all([
    User.find(query)
      .populate('department', 'departmentName departmentCode')
      .populate('designation', 'designationName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    User.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    users,
  });
});

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id)
    .populate('department', 'departmentName departmentCode')
    .populate('designation', 'designationName level');

  if (!user) {
    return next(new ErrorResponse(`User not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, user });
});

// @desc    Create a user (supports multipart/form-data with optional avatar)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res) => {
  const payload = { ...req.body, createdBy: req.user.id };

  // If an avatar was uploaded via multer, set the profileImage path
  if (req.file) {
    payload.profileImage = `uploads/avatars/${req.file.filename}`;
  }

  const user = await User.create(payload);

  res.status(201).json({
    success: true,
    message: 'User created successfully.',
    user: user.toSafeObject(),
  });
});

// @desc    Upload / replace a user's avatar
// @route   POST /api/admin/users/:id/avatar
// @access  Private/Admin
exports.uploadUserAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('No file uploaded', 400));

  const user = await User.findById(req.params.id);
  if (!user) return next(new ErrorResponse('User not found', 404));

  // Delete old avatar file if it exists
  if (user.profileImage && user.profileImage.startsWith('uploads/avatars/')) {
    const oldPath = path.join(__dirname, '..', user.profileImage);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  user.profileImage = `uploads/avatars/${req.file.filename}`;
  user.updatedBy = req.user.id;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Avatar updated.',
    profileImage: user.profileImage,
  });
});

// @desc    Update a user
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = asyncHandler(async (req, res, next) => {
  const updates = { ...req.body, updatedBy: req.user.id };
  // Password changes for other users should go through a dedicated flow, not this endpoint
  delete updates.password;

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new ErrorResponse(`User not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, message: 'User updated successfully.', user });
});

// @desc    Deactivate/delete a user (soft delete via isActive)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false, updatedBy: req.user.id },
    { new: true }
  );

  if (!user) {
    return next(new ErrorResponse(`User not found with id ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, message: 'User deactivated successfully.' });
});
