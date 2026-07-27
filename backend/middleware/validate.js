const { validationResult } = require('express-validator');
const ErrorResponse = require('../utils/ErrorResponse');

// Runs after express-validator check(...) chains; short-circuits with a 400
// and a readable message list if any validation rule failed.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(', ');
    return next(new ErrorResponse(message, 400));
  }
  next();
};

module.exports = validate;
