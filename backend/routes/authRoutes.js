const express = require('express');
const router = express.Router();
const {
  login,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateProfile,
  uploadMyAvatar,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const handleAvatarUpload = require('../middleware/uploadAvatar');
const {
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  changePasswordValidator,
  updateProfileValidator,
} = require('../validators/authValidators');

router.post('/login', loginValidator, validate, login);
router.post('/logout', protect, logout);
router.post('/forgot-password', forgotPasswordValidator, validate, forgotPassword);
router.put('/reset-password/:token', resetPasswordValidator, validate, resetPassword);
router.put('/change-password', protect, changePasswordValidator, validate, changePassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfileValidator, validate, updateProfile);
router.post('/profile/avatar', protect, handleAvatarUpload, uploadMyAvatar);

module.exports = router;
