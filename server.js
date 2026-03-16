/**
 * Security-Hardened Express.js Application Entry Point
 *
 * Transforms the original bare Node.js HTTP server into a production-ready
 * Express application with a layered security middleware pipeline addressing
 * OWASP Top 10 (2021) vulnerabilities:
 *
 *   - A01 Broken Access Control  → CORS policy (cors middleware)
 *   - A02 Cryptographic Failures → HTTPS/TLS support
 *   - A03 Injection              → Input validation (express-validator via routes)
 *   - A04 Insecure Design        → Rate limiting (express-rate-limit)
 *   - A05 Security Misconfiguration → Security headers (helmet)
 *   - A09 Monitoring Failures    → Structured error handling
 *
 * Middleware mounting order (per AAP §0.5.1):
 *   1. helmet        — security response headers
 *   2. cors          — cross-origin policy enforcement
 *   3. rate limiter  — IP-based request throttling
 *   4. body parsers  — JSON and URL-encoded parsing
 *   5. routes        — application route handlers
 *   6. 404 handler   — catch-all for unmatched routes
 *   7. error handler — centralized error responses (LAST)
 *
 * @module server
 */

'use strict';

// ---------------------------------------------------------------------------
// External Imports — Node.js built-in modules and npm packages
// ---------------------------------------------------------------------------
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');

// ---------------------------------------------------------------------------
// Internal Imports — Application modules
// ---------------------------------------------------------------------------
const config = require('./src/config/index');
const { helmetMiddleware, corsMiddleware, rateLimiter } = require('./src/middleware/security');
const errorHandler = require('./src/middleware/errorHandler');
const routes = require('./src/routes/index');

// ---------------------------------------------------------------------------
// Express Application Initialization
// ---------------------------------------------------------------------------
const app = express();

// ---------------------------------------------------------------------------
// Security Middleware Pipeline (mounted in strict order per AAP §0.5.1)
// ---------------------------------------------------------------------------

// 1. Helmet — Sets 13 HTTP security response headers (Content-Security-Policy,
//    Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, etc.)
//    and removes the X-Powered-By header to reduce fingerprinting surface.
app.use(helmetMiddleware);

// 2. CORS — Enforces Cross-Origin Resource Sharing policy using restrictive
//    defaults. Only origins listed in the CORS_ORIGIN env var are permitted.
app.use(corsMiddleware);

// 3. Rate Limiter — Throttles requests per IP address to configured limits
//    (default: 100 requests per 15-minute window). Returns 429 when exceeded.
app.use(rateLimiter);

// 4. Body Parsers — Parse incoming request bodies for validated routes.
//    express.json() handles application/json payloads.
//    express.urlencoded() handles form submissions.
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---------------------------------------------------------------------------
// Application Routes
// ---------------------------------------------------------------------------

// Mount the router which defines GET / (Hello World) and GET /health endpoints.
// The GET / route preserves the original server behaviour: 200 OK "Hello, World!\n"
app.use('/', routes);

// ---------------------------------------------------------------------------
// Error Handling (mounted LAST — Express requires error middleware after routes)
// ---------------------------------------------------------------------------

// 404 Not Found catch-all — converts unmatched requests to a structured error
app.use(errorHandler.notFoundHandler);

// Global error handler — prevents stack trace leakage in production;
// provides structured JSON error responses for all error types.
app.use(errorHandler);

// ---------------------------------------------------------------------------
// HTTP Server Creation
// ---------------------------------------------------------------------------
const httpServer = http.createServer(app);

httpServer.listen(config.port, config.host, () => {
  console.log(`Server running at http://${config.host}:${config.port}/`);
});

// ---------------------------------------------------------------------------
// HTTPS Server Creation (Conditional — requires TLS certificate files)
// ---------------------------------------------------------------------------
let httpsServer = null;

if (config.tls.keyPath && config.tls.certPath &&
    fs.existsSync(config.tls.keyPath) && fs.existsSync(config.tls.certPath)) {
  // TLS certificate and key files found — start HTTPS server
  const httpsOptions = {
    key: fs.readFileSync(config.tls.keyPath),
    cert: fs.readFileSync(config.tls.certPath),
  };

  httpsServer = https.createServer(httpsOptions, app);

  httpsServer.listen(config.httpsPort, config.host, () => {
    console.log(`HTTPS Server running at https://${config.host}:${config.httpsPort}/`);
  });
} else {
  // No TLS files configured — HTTPS disabled; log informational message
  console.log('HTTPS not configured - set TLS_CERT_PATH and TLS_KEY_PATH');
}

// ---------------------------------------------------------------------------
// Graceful Shutdown Handling
// ---------------------------------------------------------------------------
// Listens for SIGTERM (container orchestrators) and SIGINT (Ctrl+C) signals
// to close active connections before exiting, preventing abrupt termination.

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  httpServer.close(() => {
    console.log('HTTP server closed.');
    if (httpsServer) {
      httpsServer.close(() => {
        console.log('HTTPS server closed.');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ---------------------------------------------------------------------------
// Module Exports — Exposed for testing and programmatic access
// ---------------------------------------------------------------------------
module.exports = { app, httpServer };
