const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createUserValidator, updateUserValidator } = require('../validators/userValidators');
const { ROLES } = require('../constants/roles');

router.use(protect, authorize(ROLES.ADMIN));

router.route('/').get(getUsers).post(createUserValidator, validate, createUser);
router
  .route('/:id')
  .get(getUser)
  .put(updateUserValidator, validate, updateUser)
  .delete(deleteUser);

module.exports = router;
