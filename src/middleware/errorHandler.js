'use strict';

/**
 * Global error-handling middleware for Express.js.
 * Provides a 404 not-found handler and a centralized error handler that
 * prevents information leakage (stack traces) in production while aiding
 * debugging in development.  Addresses OWASP A09:2021.
 */

// 404 Not Found handler — mounted AFTER all route definitions, BEFORE error handler.
const notFoundHandler = (req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
};

// Global error handler — Express requires the 4-parameter arity to recognise this.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const isProduction = process.env.NODE_ENV === 'production';

  // Server-side logging (always)
  console.error(`Error ${status}: ${message}`);
  if (!isProduction) {
    console.error(err.stack);
  }

  // Client response — hide sensitive details in production for 500-level errors
  res.status(status).json({
    error: {
      status,
      message: isProduction && status === 500 ? 'Internal Server Error' : message,
      ...(!isProduction && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
module.exports.notFoundHandler = notFoundHandler;
