const express = require('express');
const router = express.Router();
const {
  getDesignations,
  getDesignation,
  createDesignation,
  updateDesignation,
  deleteDesignation,
} = require('../controllers/designationController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createDesignationValidator,
  updateDesignationValidator,
} = require('../validators/designationValidators');
const { ROLES } = require('../constants/roles');

router.use(protect, authorize(ROLES.ADMIN));

router.route('/').get(getDesignations).post(createDesignationValidator, validate, createDesignation);
router
  .route('/:id')
  .get(getDesignation)
  .put(updateDesignationValidator, validate, updateDesignation)
  .delete(deleteDesignation);

module.exports = router;
