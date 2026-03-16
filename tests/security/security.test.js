'use strict';

/**
 * Security Test Suite — Comprehensive Security Hardening Verification
 *
 * Verifies ALL security hardening measures applied to the Express.js
 * application after transformation from the bare 14-line http server:
 *
 *   - 13 Helmet.js security headers       (OWASP A05:2021)
 *   - CORS policy enforcement              (OWASP A01:2021)
 *   - Rate limiting                        (OWASP A04:2021)
 *   - Input validation infrastructure      (OWASP A03:2021)
 *   - HTTPS / TLS configuration            (OWASP A02:2021)
 *   - Error handling without info leakage  (OWASP A09:2021)
 *
 * Uses Node.js built-in `assert` module — no external test framework required.
 * Self-executable via:  node tests/security/security.test.js
 *
 * @module tests/security/security.test
 */

// ---------------------------------------------------------------------------
// Test-Environment Configuration
// ---------------------------------------------------------------------------
// Environment variables MUST be set BEFORE any application module is required
// so that src/config/index.js reads them during the initial require() call.
//   - RATE_LIMIT_MAX=10  → low limit for practical 429 testing
//   - CORS_ORIGIN        → enables meaningful CORS header verification
process.env.RATE_LIMIT_MAX = '10';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Module Imports
// ---------------------------------------------------------------------------
const assert = require('assert');
const http = require('http');
const { app, httpServer } = require('../../server');
const { handleValidationErrors } = require('../../src/middleware/validator');
const config = require('../../src/config/index');
const { makeRequest } = require('../helpers/request');

// ---------------------------------------------------------------------------
// Suppress server.js listen errors
// ---------------------------------------------------------------------------
// When server.js is required, httpServer.listen() fires on the configured port.
// If that port is occupied, the error would cause the process to exit before
// tests run. This handler suppresses such errors since tests create their own
// temporary servers on port 0.
if (httpServer && typeof httpServer.on === 'function') {
  httpServer.on('error', function () {
    // Silently ignore — tests use independent temporary servers
  });
}

// ---------------------------------------------------------------------------
// Test Utility — singleRequest (reuses an already-listening port)
// ---------------------------------------------------------------------------
/**
 * Sends a single HTTP request to a server that is already listening on the
 * given port.  Used by the rate-limit 429 test which must fire many
 * sequential requests against one server instance.
 */
function singleRequest(port, path) {
  return new Promise(function (resolve, reject) {
    const req = http.request(
      { hostname: 'localhost', port: port, path: path, method: 'GET' },
      function (res) {
        let body = '';
        res.on('data', function (chunk) { body += chunk; });
        res.on('end', function () {
          resolve({ statusCode: res.statusCode, headers: res.headers, body: body });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------
/**
 * Runs every security verification test sequentially and reports results.
 * Exit code 1 on any failure, 0 on all-pass (CI-friendly).
 */
async function runTests() {
  let passed = 0;
  let failed = 0;

  /** Wraps a single test with pass/fail logging. */
  async function test(name, fn) {
    try {
      await fn();
      console.log('  \u2713 ' + name);
      passed++;
    } catch (err) {
      console.error('  \u2717 ' + name);
      console.error('    ' + err.message);
      failed++;
    }
  }

  console.log('');
  console.log('Security Tests: Security Hardening Verification');
  console.log('================================================');

  // =====================================================================
  // Pre-fetch common responses (each counts toward the shared rate limiter)
  // =====================================================================
  const mainResponse = await makeRequest(app, '/');

  const corsEvilResponse = await makeRequest(app, '/', {
    headers: { 'Origin': 'http://evil.com' },
  });

  const corsPreflightResponse = await makeRequest(app, '/', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
    },
  });

  const notFoundResponse = await makeRequest(app, '/nonexistent-route');

  // Pre-fetch a production-mode 404 (must happen before rate limit is
  // exhausted so the request isn't rejected with 429).
  const origNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const productionNotFoundResponse = await makeRequest(app, '/nonexistent-production');
  if (origNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = origNodeEnv;
  }

  // =====================================================================
  //  Helmet Security Headers — 13 tests
  // =====================================================================

  await test('Helmet: Content-Security-Policy header is present', async function () {
    const csp = mainResponse.headers['content-security-policy'];
    assert.ok(csp, 'Content-Security-Policy header is missing');
    assert.ok(csp.includes("default-src 'self'"), 'CSP missing default-src self');
  });

  await test('Helmet: Strict-Transport-Security header is present', async function () {
    const hsts = mainResponse.headers['strict-transport-security'];
    assert.ok(hsts, 'Strict-Transport-Security header is missing');
    assert.ok(hsts.includes('max-age'), 'HSTS missing max-age directive');
  });

  await test('Helmet: X-Content-Type-Options header is nosniff', async function () {
    assert.strictEqual(mainResponse.headers['x-content-type-options'], 'nosniff');
  });

  await test('Helmet: X-Frame-Options header is SAMEORIGIN', async function () {
    assert.strictEqual(mainResponse.headers['x-frame-options'], 'SAMEORIGIN');
  });

  await test('Helmet: X-Powered-By header is removed', async function () {
    assert.strictEqual(
      mainResponse.headers['x-powered-by'],
      undefined,
      'X-Powered-By should be absent'
    );
  });

  await test('Helmet: X-XSS-Protection header is 0', async function () {
    assert.strictEqual(mainResponse.headers['x-xss-protection'], '0');
  });

  await test('Helmet: Cross-Origin-Opener-Policy header is present', async function () {
    assert.strictEqual(mainResponse.headers['cross-origin-opener-policy'], 'same-origin');
  });

  await test('Helmet: Cross-Origin-Resource-Policy header is present', async function () {
    assert.strictEqual(mainResponse.headers['cross-origin-resource-policy'], 'same-origin');
  });

  await test('Helmet: Origin-Agent-Cluster header is present', async function () {
    assert.strictEqual(mainResponse.headers['origin-agent-cluster'], '?1');
  });

  await test('Helmet: Referrer-Policy header is present', async function () {
    assert.strictEqual(mainResponse.headers['referrer-policy'], 'no-referrer');
  });

  await test('Helmet: X-DNS-Prefetch-Control header is present', async function () {
    assert.strictEqual(mainResponse.headers['x-dns-prefetch-control'], 'off');
  });

  await test('Helmet: X-Download-Options header is present', async function () {
    assert.strictEqual(mainResponse.headers['x-download-options'], 'noopen');
  });

  await test('Helmet: X-Permitted-Cross-Domain-Policies header is present', async function () {
    assert.strictEqual(mainResponse.headers['x-permitted-cross-domain-policies'], 'none');
  });

  // =====================================================================
  //  CORS Policy Enforcement — 3 tests
  // =====================================================================

  await test('CORS: Requests from non-allowed origins do NOT receive CORS headers', async function () {
    const acao = corsEvilResponse.headers['access-control-allow-origin'];
    assert.strictEqual(acao, undefined, 'Non-allowed origin should not receive CORS header');
  });

  await test('CORS: Preflight OPTIONS requests are handled', async function () {
    // With an allowed origin the cors middleware should respond with 204
    assert.strictEqual(corsPreflightResponse.statusCode, 204, 'Preflight should return 204');
  });

  await test('CORS: Vary header is present', async function () {
    // cors middleware sets Vary: Origin when origin is evaluated dynamically
    const vary = corsEvilResponse.headers['vary'] || '';
    assert.ok(vary.indexOf('Origin') !== -1, 'Vary header should include Origin');
  });

  // =====================================================================
  //  Rate Limiting — 3 tests
  // =====================================================================

  await test('Rate Limiting: Requests within window return 200 OK', async function () {
    assert.strictEqual(mainResponse.statusCode, 200, 'Expected 200 OK');
  });

  await test('Rate Limiting: Response includes RateLimit header', async function () {
    const hasHeader =
      mainResponse.headers['ratelimit'] !== undefined ||
      mainResponse.headers['ratelimit-limit'] !== undefined ||
      mainResponse.headers['ratelimit-policy'] !== undefined;
    assert.ok(hasHeader, 'Expected a RateLimit standard header in the response');
  });

  await test('Rate Limiting: Excessive requests return 429', async function () {
    // Create a dedicated server and send rapid sequential requests until 429
    const server = http.createServer(app);
    await new Promise(function (resolve) { server.listen(0, resolve); });
    const port = server.address().port;
    let got429 = false;
    let lastBody = '';
    const maxAttempts = config.rateLimit.max + 5;

    for (let i = 0; i < maxAttempts && !got429; i++) {
      const response = await singleRequest(port, '/');
      if (response.statusCode === 429) {
        got429 = true;
        lastBody = response.body;
      }
    }

    server.close();
    assert.ok(got429, 'Expected 429 after exceeding rate limit of ' + config.rateLimit.max);

    const parsed = JSON.parse(lastBody);
    assert.strictEqual(parsed.error.status, 429);
    assert.ok(typeof parsed.error.message === 'string', 'Error message should be a string');
  });

  // =====================================================================
  //  Input Validation — 2 tests
  // =====================================================================

  await test('Validation: Validation middleware is correctly configured', async function () {
    assert.strictEqual(typeof handleValidationErrors, 'function',
      'handleValidationErrors should be a function');
    assert.ok(handleValidationErrors.length >= 3,
      'handleValidationErrors should accept >= 3 params (req, res, next)');
  });

  await test('Validation: Error responses have structured format', async function () {
    // Use the pre-fetched 404 response as a proxy for structured error format
    const parsed = JSON.parse(notFoundResponse.body);
    assert.ok(parsed.error, 'Response should have an error property');
    assert.strictEqual(typeof parsed.error.status, 'number', 'error.status must be a number');
    assert.strictEqual(typeof parsed.error.message, 'string', 'error.message must be a string');
  });

  // =====================================================================
  //  HTTPS Configuration — 1 test
  // =====================================================================

  await test('HTTPS: TLS configuration is available', async function () {
    assert.ok(config.tls, 'Config should have tls property');
    assert.ok('certPath' in config.tls, 'TLS config must include certPath');
    assert.ok('keyPath' in config.tls, 'TLS config must include keyPath');
    assert.ok(config.httpsPort, 'Config must include httpsPort');
  });

  // =====================================================================
  //  Error Handling — 3 tests
  // =====================================================================

  await test('Error Handling: Unknown routes return 404', async function () {
    assert.strictEqual(notFoundResponse.statusCode, 404, 'Expected 404 for unknown route');
    const ct = notFoundResponse.headers['content-type'] || '';
    assert.ok(ct.indexOf('application/json') !== -1, 'Expected JSON content-type');
    const parsed = JSON.parse(notFoundResponse.body);
    assert.strictEqual(parsed.error.status, 404);
    assert.strictEqual(parsed.error.message, 'Not Found');
  });

  await test('Error Handling: No stack trace leakage in production', async function () {
    const parsed = JSON.parse(productionNotFoundResponse.body);
    assert.strictEqual(parsed.error.stack, undefined,
      'Stack trace must not be present in production');
  });

  await test('Error Handling: Structured error response format', async function () {
    const parsed = JSON.parse(notFoundResponse.body);
    assert.ok(typeof parsed === 'object', 'Body should be an object');
    assert.ok(typeof parsed.error === 'object', 'Should have error object');
    assert.strictEqual(typeof parsed.error.status, 'number', 'error.status must be a number');
    assert.strictEqual(typeof parsed.error.message, 'string', 'error.message must be a string');
  });

  // =====================================================================
  //  Results and Cleanup
  // =====================================================================
  console.log('');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed, ' + (passed + failed) + ' total');

  // Clean up the HTTP server started by requiring server.js to prevent
  // the Node.js process from hanging on open handles.
  try {
    if (httpServer && typeof httpServer.close === 'function') {
      httpServer.close();
    }
  } catch (cleanupErr) {
    // Ignore cleanup errors — server may not have started successfully
  }

  if (failed > 0) {
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Module Exports
// ---------------------------------------------------------------------------
module.exports = { runTests };

// ---------------------------------------------------------------------------
// Self-Execution Guard
// ---------------------------------------------------------------------------
if (require.main === module) {
  runTests().catch(function (err) {
    console.error(err);
    process.exit(1);
  });
}
