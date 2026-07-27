const { body } = require('express-validator');

exports.createDesignationValidator = [
  body('designationName').trim().notEmpty().withMessage('Designation name is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('level').isInt({ min: 1 }).withMessage('Level must be a positive integer'),
];

exports.updateDesignationValidator = [
  body('designationName').optional().trim().notEmpty().withMessage('Designation name cannot be empty'),
  body('level').optional().isInt({ min: 1 }).withMessage('Level must be a positive integer'),
];
