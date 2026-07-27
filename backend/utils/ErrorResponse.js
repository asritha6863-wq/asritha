// Custom error class that carries an HTTP status code alongside the message,
// so the global error handler can respond with the correct status.
class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ErrorResponse;
