/**
 * Centralized Security Middleware Configuration
 *
 * Configures and exports three critical Express middleware functions that form
 * the primary security layer of the application:
 *   1. helmetMiddleware  — HTTP security response headers (OWASP A05:2021)
 *   2. corsMiddleware    — Cross-Origin Resource Sharing policy (OWASP A01:2021)
 *   3. rateLimiter       — IP-based request rate limiting   (OWASP A04:2021)
 *
 * Middleware mounting order in server.js:
 *   app.use(helmetMiddleware)  — FIRST
 *   app.use(corsMiddleware)    — SECOND
 *   app.use(rateLimiter)       — THIRD
 *
 * All configurable values are read from the centralized config module
 * (src/config/index.js) which sources them from environment variables.
 */

'use strict';

const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const config = require('../config/index');

// ---------------------------------------------------------------------------
// 1. Helmet — HTTP Security Headers
// ---------------------------------------------------------------------------
// Calling helmet() with no arguments enables all 13 default security headers:
//   Content-Security-Policy, Cross-Origin-Opener-Policy,
//   Cross-Origin-Resource-Policy, Origin-Agent-Cluster, Referrer-Policy,
//   Strict-Transport-Security, X-Content-Type-Options, X-DNS-Prefetch-Control,
//   X-Download-Options, X-Frame-Options, X-Permitted-Cross-Domain-Policies,
//   X-Powered-By (removed), X-XSS-Protection (set to 0).
const helmetMiddleware = helmet();

// ---------------------------------------------------------------------------
// 2. CORS — Cross-Origin Resource Sharing
// ---------------------------------------------------------------------------
// Uses restrictive defaults: origin is disabled (false) when no origins are
// configured, preventing wildcard (*) access. Allowed origins are read from
// the CORS_ORIGIN environment variable via the config module.
const corsOptions = {
  origin: config.cors.origin.length > 0 ? config.cors.origin : false,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
  credentials: true,
  maxAge: 600,
  optionsSuccessStatus: 204,
};
const corsMiddleware = cors(corsOptions);

// ---------------------------------------------------------------------------
// 3. Rate Limiter — Request Throttling
// ---------------------------------------------------------------------------
// Limits each IP to config.rateLimit.max requests per config.rateLimit.windowMs
// time window. Emits IETF draft-8 RateLimit-* standard headers. Legacy
// X-RateLimit-* headers are disabled. Uses the built-in memory store.
const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  limit: config.rateLimit.max,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: {
      status: 429,
      message: 'Too many requests, please try again later.',
    },
  },
});

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------
module.exports = {
  helmetMiddleware,
  corsMiddleware,
  rateLimiter,
};
