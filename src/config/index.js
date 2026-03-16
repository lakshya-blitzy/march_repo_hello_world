/**
 * Centralized Configuration Module
 *
 * Externalizes all server configuration into environment-variable-driven
 * settings with secure defaults. Follows 12-factor app methodology.
 * No external package imports — uses only Node.js built-in process.env.
 *
 * Consumed by:
 *   - server.js (main application entry)
 *   - src/middleware/security.js (CORS origins, rate limit settings)
 */

'use strict';

module.exports = {
  /** HTTP server port — parsed from PORT env var, default 3000 */
  port: parseInt(process.env.PORT, 10) || 3000,

  /** Server bind address — default 0.0.0.0 for network access (CORS/HTTPS require it) */
  host: process.env.HOST || '0.0.0.0',

  /** HTTPS server port — parsed from HTTPS_PORT env var, default 3443 */
  httpsPort: parseInt(process.env.HTTPS_PORT, 10) || 3443,

  /** TLS certificate paths for HTTPS — empty strings when HTTPS is not configured */
  tls: {
    certPath: process.env.TLS_CERT_PATH || '',
    keyPath: process.env.TLS_KEY_PATH || '',
  },

  /** CORS allowed origins — parsed from comma-separated CORS_ORIGIN env var */
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(function (s) { return s.trim(); })
      : [],
  },

  /** Rate limiting settings — requests per time window */
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  },

  /** Environment mode — controls security strictness (development/production) */
  nodeEnv: process.env.NODE_ENV || 'development',
};
