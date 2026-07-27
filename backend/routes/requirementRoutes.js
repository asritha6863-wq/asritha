const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const handleUpload = require('../middleware/upload');
const { ROLES } = require('../constants/roles');
const {
  createRequirementValidator,
  updateRequirementValidator,
  addCommentValidator,
  listQueryValidator,
  idParamValidator,
} = require('../validators/requirementValidators');
const {
  getRequirements,
  getRequirement,
  createRequirement,
  updateRequirement,
  deleteRequirement,
  submitRequirement,
  addComment,
  uploadAttachments,
  removeAttachment,
  getStats,
} = require('../controllers/requirementController');

// All routes require auth + Requesting Employee role
router.use(protect, authorize(ROLES.REQUESTING_EMPLOYEE));

router.get('/stats', getStats);

router.route('/')
  .get(listQueryValidator, validate, getRequirements)
  .post(createRequirementValidator, validate, createRequirement);

router.route('/:id')
  .get(idParamValidator, validate, getRequirement)
  .put(idParamValidator, validate, updateRequirementValidator, validate, updateRequirement)
  .delete(idParamValidator, validate, deleteRequirement);

router.post('/:id/submit', idParamValidator, validate, submitRequirement);
router.post('/:id/comments', idParamValidator, validate, addCommentValidator, validate, addComment);
router.post('/:id/upload', idParamValidator, validate, handleUpload, uploadAttachments);
router.delete('/:id/attachments/:attId', idParamValidator, validate, removeAttachment);

module.exports = router;
