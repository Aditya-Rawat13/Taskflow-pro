/**
 * Custom application error class for expected, handled errors.
 * Controllers throw AppError instances for known failure cases.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * Global Express error handler middleware.
 * Must be registered last, after all routes.
 */
function errorHandler(err, req, res, next) {
  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Prisma unique constraint violation → 409
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  // Prisma record not found → 404
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // Never leak internals in production
  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  return res.status(500).json({ error: message });
}

module.exports = { AppError, errorHandler };
