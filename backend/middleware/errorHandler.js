// Global error-handling middleware. Catches everything forwarded via next(err),
// including asyncHandler rejections, and returns a consistent JSON error shape.
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log full error server-side for debugging
  console.error(`[Error] ${req.method} ${req.originalUrl} -> ${err.message}`);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error.message = `Resource not found with id of ${err.value}`;
    error.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    error.message = field
      ? `Duplicate value for field '${field}'. Please use a different value.`
      : 'Duplicate field value entered.';
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    error.message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
    error.statusCode = 400;
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message || 'Server Error',
  });
};

module.exports = errorHandler;
