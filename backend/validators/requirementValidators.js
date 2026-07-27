const { body, query, param } = require('express-validator');
const { PRIORITIES, CATEGORIES } = require('../models/Requirement');

// ── Create / Update (draft or full submit) ────────────────────────────────────
exports.createRequirementValidator = [
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),

  body('itemName')
    .trim()
    .notEmpty().withMessage('Item name is required')
    .isLength({ max: 200 }).withMessage('Item name cannot exceed 200 characters'),

  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Brand cannot exceed 100 characters'),

  body('model')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Model cannot exceed 100 characters'),

  body('specification')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Specification cannot exceed 2000 characters'),

  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isFloat({ min: 1 }).withMessage('Quantity must be greater than 0'),

  body('unit')
    .trim()
    .notEmpty().withMessage('Unit is required'),

  body('estimatedUnitPrice')
    .notEmpty().withMessage('Estimated unit price is required')
    .isFloat({ min: 0 }).withMessage('Estimated unit price must be 0 or greater'),

  body('priority')
    .notEmpty().withMessage('Priority is required')
    .isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),

  body('purpose')
    .trim()
    .notEmpty().withMessage('Purpose / Justification is required')
    .isLength({ max: 2000 }).withMessage('Purpose cannot exceed 2000 characters'),

  body('requiredDate')
    .notEmpty().withMessage('Required delivery date is required')
    .isISO8601().withMessage('Required delivery date must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) throw new Error('Required delivery date cannot be in the past');
      return true;
    }),

  body('deliveryLocation')
    .trim()
    .notEmpty().withMessage('Delivery location is required')
    .isLength({ max: 300 }).withMessage('Delivery location cannot exceed 300 characters'),
];

// ── Partial update (draft save — only provided fields validated) ──────────────
exports.updateRequirementValidator = [
  body('category')
    .optional()
    .trim()
    .isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),

  body('itemName')
    .optional()
    .trim()
    .notEmpty().withMessage('Item name cannot be empty')
    .isLength({ max: 200 }).withMessage('Item name cannot exceed 200 characters'),

  body('quantity')
    .optional()
    .isFloat({ min: 1 }).withMessage('Quantity must be greater than 0'),

  body('estimatedUnitPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Estimated unit price must be 0 or greater'),

  body('priority')
    .optional()
    .isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),

  body('requiredDate')
    .optional()
    .isISO8601().withMessage('Required delivery date must be a valid date')
    .custom((value) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (date < today) throw new Error('Required delivery date cannot be in the past');
      return true;
    }),

  body('purpose')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Purpose cannot exceed 2000 characters'),

  body('deliveryLocation')
    .optional()
    .trim()
    .isLength({ max: 300 }).withMessage('Delivery location cannot exceed 300 characters'),
];

// ── Comment validator ─────────────────────────────────────────────────────────
exports.addCommentValidator = [
  body('text')
    .trim()
    .notEmpty().withMessage('Comment text is required')
    .isLength({ max: 2000 }).withMessage('Comment cannot exceed 2000 characters'),
];

// ── List / filter query params ────────────────────────────────────────────────
exports.listQueryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .custom((value) => {
      const { STATUSES } = require('../models/Requirement');
      if (!STATUSES.includes(value)) throw new Error(`Invalid status filter`);
      return true;
    }),

  query('priority')
    .optional()
    .isIn(PRIORITIES).withMessage('Invalid priority filter'),

  query('category')
    .optional()
    .isIn(CATEGORIES).withMessage('Invalid category filter'),

  query('dateFrom')
    .optional()
    .isISO8601().withMessage('dateFrom must be a valid date'),

  query('dateTo')
    .optional()
    .isISO8601().withMessage('dateTo must be a valid date'),
];

// ── MongoDB ObjectId param ────────────────────────────────────────────────────
exports.idParamValidator = [
  param('id')
    .isMongoId().withMessage('Invalid requirement ID'),
];
