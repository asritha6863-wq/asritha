const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const path = require('path');
const fs   = require('fs');

// @desc    Log in a user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(new ErrorResponse('Your account has been deactivated. Contact an administrator.', 403));
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new ErrorResponse('Invalid email or password.', 401));
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    token,
    user: user.toSafeObject(),
  });
});

// @desc    Log out a user (stateless JWT - client discards token; endpoint kept for symmetry/future blacklisting)
// @route   POST /api/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

// @desc    Request a password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  // Respond with the same message whether or not the user exists, to avoid leaking
  // which emails are registered.
  const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

  if (!user) {
    return res.status(200).json({ success: true, message: genericMessage });
  }

  const resetToken = user.generatePasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  try {
    await sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      html: `<p>You requested a password reset.</p>
             <p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 30 minutes.</p>
             <p>If you did not request this, please ignore this email.</p>`,
      text: `Reset your password: ${resetUrl} (expires in 30 minutes)`,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new ErrorResponse('Email could not be sent. Please try again later.', 500));
  }

  res.status(200).json({ success: true, message: genericMessage });
});

// @desc    Reset password using a valid reset token
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpiry');

  if (!user) {
    return next(new ErrorResponse('Password reset token is invalid or has expired.', 400));
  }

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Password reset successful.',
    token,
    user: user.toSafeObject(),
  });
});

// @desc    Change password while logged in
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect.', 401));
  }

  user.password = newPassword;
  await user.save();

  const token = generateToken(user);

  res.status(200).json({
    success: true,
    message: 'Password changed successfully.',
    token,
  });
});

// @desc    Get the currently authenticated user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'department',
      select: 'departmentName departmentCode departmentHead status',
      populate: {
        path: 'departmentHead',
        select: 'firstName lastName email profileImage role',
      },
    })
    .populate('designation', 'designationName level');

  res.status(200).json({
    success: true,
    user,
  });
});

// @desc    Update own profile (limited, self-service fields only)
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const allowedFields = ['firstName', 'lastName', 'phone', 'profileImage'];
  const updates = {};

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  updates.updatedBy = req.user.id;

  const user = await User.findByIdAndUpdate(req.user.id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    user,
  });
});

// @desc    Upload own profile photo
// @route   POST /api/auth/profile/avatar
// @access  Private
exports.uploadMyAvatar = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('No file uploaded', 400));

  const user = await User.findById(req.user.id);
  if (!user) return next(new ErrorResponse('User not found', 404));

  // Delete old avatar if it was a locally stored file
  if (user.profileImage && user.profileImage.startsWith('uploads/avatars/')) {
    const oldPath = path.join(__dirname, '..', user.profileImage);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  user.profileImage = `uploads/avatars/${req.file.filename}`;
  user.updatedBy = req.user.id;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Profile photo updated successfully.',
    profileImage: user.profileImage,
  });
});
