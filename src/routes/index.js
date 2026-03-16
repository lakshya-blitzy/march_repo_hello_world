/**
 * Express Router — Route Definitions
 *
 * Defines all HTTP route handlers for the application. Extracts route logic
 * from the original inline http.createServer() callback into an Express Router
 * with proper route isolation and per-route middleware support.
 */

const { Router } = require('express');
const { handleValidationErrors, sanitizeInput } = require('../middleware/validator');

const router = Router();

/* GET / — Hello World (preserves original server.js behavior exactly) */
router.get('/', (req, res) => {
  res.status(200).type('text/plain').send('Hello, World!\n');
});

/* GET /health — JSON health-check endpoint */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
