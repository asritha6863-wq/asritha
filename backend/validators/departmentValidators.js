const { body } = require('express-validator');

exports.createDepartmentValidator = [
  body('departmentName').trim().notEmpty().withMessage('Department name is required'),
  body('departmentCode').trim().notEmpty().withMessage('Department code is required'),
];

exports.updateDepartmentValidator = [
  body('departmentName').optional().trim().notEmpty().withMessage('Department name cannot be empty'),
  body('departmentCode').optional().trim().notEmpty().withMessage('Department code cannot be empty'),
];
