/**
 * Input Validation Middleware — Addresses OWASP A03:2021 (Injection)
 *
 * Provides reusable validation chains and a centralized validation error
 * handler using express-validator v7.x. All incoming request data is
 * validated and sanitized before route handlers process it.
 */

const { body, query, param, validationResult } = require('express-validator');

/**
 * Express middleware that inspects the accumulated validation results on the
 * request object.  When validation errors are present it responds with a
 * structured 400 JSON payload containing only safe field/message pairs —
 * stack traces and internal details are never leaked to the client.
 * When no errors exist the next middleware/route handler is invoked.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

/** General input sanitization chain — trims and HTML-escapes all query params to prevent XSS via query-string injection. */
const sanitizeInput = [
  query('*').trim().escape(),
];

/** Example body-validation chain for a `name` field — demonstrates the reusable validation pattern for routes accepting input. */
const validateName = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name must be between 1 and 255 characters')
    .escape(),
];

module.exports = {
  handleValidationErrors,
  sanitizeInput,
  validateName,
  body,
  query,
  param,
  validationResult,
};
