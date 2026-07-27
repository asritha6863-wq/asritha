const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createDepartmentValidator,
  updateDepartmentValidator,
} = require('../validators/departmentValidators');
const { ROLES } = require('../constants/roles');

router.use(protect, authorize(ROLES.ADMIN));

router.route('/').get(getDepartments).post(createDepartmentValidator, validate, createDepartment);
router
  .route('/:id')
  .get(getDepartment)
  .put(updateDepartmentValidator, validate, updateDepartment)
  .delete(deleteDepartment);

module.exports = router;
