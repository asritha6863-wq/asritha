const jwt = require('jsonwebtoken');
const asyncHandler = require('../utils/asyncHandler');
const ErrorResponse = require('../utils/ErrorResponse');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');

// protect: verifies the JWT and attaches the authenticated user to req.user.
// Rejects requests with a missing, invalid, or expired token, or a deactivated user.
const protect = asyncHandler(async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorResponse('Not authorized. No token provided.', 401));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ErrorResponse('Session expired. Please log in again.', 401));
    }
    return next(new ErrorResponse('Not authorized. Invalid token.', 401));
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    return next(new ErrorResponse('Not authorized. User no longer exists.', 401));
  }

  if (!user.isActive) {
    return next(new ErrorResponse('Your account has been deactivated. Contact an administrator.', 403));
  }

  req.user = user;
  next();
});

// authorize(...roles): restricts a route to the given list of roles.
// Must be used after `protect` so req.user is available.
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ErrorResponse('Not authorized. No authenticated user.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorResponse(`Role '${req.user.role}' is not permitted to perform this action.`, 403)
      );
    }

    next();
  };
};

module.exports = { protect, authorize };
