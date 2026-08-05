const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  uploadUserAvatar,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserValidator, updateUserValidator } = require('../validators/userValidators');
const { ROLES } = require('../constants/roles');
const handleAvatarUpload = require('../middleware/uploadAvatar');

router.use(protect, authorize(ROLES.ADMIN));

router.route('/').get(getUsers).post(handleAvatarUpload, createUser);
router.route('/:id').get(getUser).put(updateUserValidator, validate, updateUser).delete(deleteUser);
router.post('/:id/avatar', handleAvatarUpload, uploadUserAvatar);

module.exports = router;
