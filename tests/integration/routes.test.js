'use strict';

/**
 * Integration Tests — Route Handler Verification
 *
 * Verifies that Express.js route handlers function correctly after the
 * security hardening transformation. This test suite ensures:
 *
 *   1. Backward compatibility — GET / still returns "Hello, World!\n"
 *   2. Health check endpoint  — GET /health returns JSON status
 *   3. Error handling         — Unknown routes return structured 404
 *   4. Error response format  — { error: { status, message } } structure
 *   5. Validation middleware  — handleValidationErrors is correctly exported
 *
 * Uses Node.js built-in `assert` module — no external test framework required.
 * Structured for easy adoption of Jest or Mocha test runners.
 *
 * @module tests/integration/routes.test
 */

// ---------------------------------------------------------------------------
// External Imports — Node.js built-in modules
// ---------------------------------------------------------------------------
const assert = require('assert');

// ---------------------------------------------------------------------------
// Test Environment Configuration
// ---------------------------------------------------------------------------
// Set environment variables BEFORE loading application modules to control
// server behavior during testing and prevent resource conflicts.
//
// HOST:           Bind to loopback only for test isolation
// RATE_LIMIT_MAX: High limit prevents rate-limiting interference during tests
// NODE_ENV:       Set to production to verify no stack trace leakage in errors
process.env.HOST = '127.0.0.1';
process.env.RATE_LIMIT_MAX = '10000';
process.env.NODE_ENV = 'production';

// ---------------------------------------------------------------------------
// Internal Imports — Application modules
// ---------------------------------------------------------------------------
// server.js exports { app, httpServer } — we use both:
//   - app:        Express application instance for creating temporary test servers
//   - httpServer: The main server started by server.js (must be closed for cleanup)
const { app, httpServer } = require('../../server');

// Validator module — imported directly to verify handleValidationErrors exists
// and is a callable middleware function with the correct arity.
const { handleValidationErrors } = require('../../src/middleware/validator');

// Shared test helper for making HTTP requests against the Express app
const { makeRequest } = require('../helpers/request');

// Suppress EADDRINUSE or other listen errors from the main httpServer
// started by server.js. Tests create their own temporary servers on port 0
// and do not depend on the main httpServer being active.
if (httpServer && typeof httpServer.on === 'function') {
  httpServer.on('error', function () {
    // Silently ignore — tests use independent temporary servers
  });
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------

/**
 * Executes all integration tests sequentially with structured pass/fail
 * reporting. Returns exit code 1 on any failure for CI integration.
 *
 * Test execution order:
 *   1. GET /             — backward compatibility (Hello World)
 *   2. GET /health       — health check endpoint
 *   3. GET /nonexistent  — 404 error handling
 *   4. Error response structure validation
 *   5. Validation middleware integration check
 *
 * @returns {Promise<void>}
 */
async function runTests() {
  let passed = 0;
  let failed = 0;

  /**
   * Wraps an async test function with try/catch for clean reporting.
   *
   * @param {string}   name - Human-readable test description
   * @param {Function} fn   - Async function containing assertions
   */
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
  console.log('Integration Tests: Route Handlers');
  console.log('=================================');

  // -----------------------------------------------------------------------
  // Test 1: GET / — Hello World (BACKWARD COMPATIBILITY)
  //
  // The most critical test. Verifies the original "Hello, World!" behavior
  // is preserved after the Express.js security hardening transformation.
  //
  // AAP §0.1.2: "The server must continue to respond with 200 OK and
  //              'Hello, World!\n' on its primary route"
  // AAP §0.8.3: "The GET / endpoint continues to return 200 OK
  //              'Hello, World!\n' — core functionality preserved"
  // -----------------------------------------------------------------------
  await test('GET / should return 200 with Hello, World!', async function () {
    const res = await makeRequest(app, '/');
    assert.strictEqual(res.statusCode, 200, 'Expected status code 200');
    assert.strictEqual(
      res.body,
      'Hello, World!\n',
      'Expected body to be exactly "Hello, World!\\n"'
    );
    assert.ok(
      res.headers['content-type'] &&
        res.headers['content-type'].indexOf('text/plain') !== -1,
      'Expected Content-Type to include text/plain'
    );
  });

  // -----------------------------------------------------------------------
  // Test 2: GET /health — Health Check Endpoint
  //
  // Verifies the JSON health-check endpoint returns the expected structure
  // with status "ok" and a valid ISO 8601 timestamp.
  // -----------------------------------------------------------------------
  await test('GET /health should return 200 with JSON health status', async function () {
    const res = await makeRequest(app, '/health');
    assert.strictEqual(res.statusCode, 200, 'Expected status code 200');
    assert.ok(
      res.headers['content-type'] &&
        res.headers['content-type'].indexOf('application/json') !== -1,
      'Expected Content-Type to include application/json'
    );

    const body = JSON.parse(res.body);
    assert.strictEqual(body.status, 'ok', 'Expected body.status to be "ok"');
    assert.ok(body.timestamp, 'Expected body.timestamp to exist');

    // Validate ISO 8601 timestamp format
    const parsedDate = new Date(body.timestamp);
    assert.ok(
      !isNaN(parsedDate.getTime()),
      'Expected timestamp to be a valid date'
    );
    assert.strictEqual(
      parsedDate.toISOString(),
      body.timestamp,
      'Expected timestamp to be a valid ISO 8601 string'
    );
  });

  // -----------------------------------------------------------------------
  // Test 3: GET /nonexistent — 404 Not Found
  //
  // Verifies that unregistered routes return a structured 404 response
  // instead of the original behavior (returning "Hello, World!" for all
  // paths regardless of the URL).
  //
  // AAP §0.8.3: "New 404 Not Found response for unregistered routes
  //              (previously returned 'Hello, World!' for all paths)"
  // -----------------------------------------------------------------------
  await test('GET /nonexistent should return 404 Not Found', async function () {
    const res = await makeRequest(app, '/nonexistent');
    assert.strictEqual(res.statusCode, 404, 'Expected status code 404');
    assert.ok(
      res.headers['content-type'] &&
        res.headers['content-type'].indexOf('application/json') !== -1,
      'Expected Content-Type to include application/json'
    );

    const body = JSON.parse(res.body);
    assert.ok(body.error, 'Expected response to have error property');
    assert.strictEqual(
      body.error.status,
      404,
      'Expected error.status to be 404'
    );
    assert.strictEqual(
      body.error.message,
      'Not Found',
      'Expected error.message to be "Not Found"'
    );
  });

  // -----------------------------------------------------------------------
  // Test 4: Error Response Structure — { error: { status, message } }
  //
  // Validates that error responses conform to the structured format and
  // do NOT include stack traces when NODE_ENV=production, preventing
  // information leakage per OWASP A09:2021.
  //
  // AAP §0.6.2: "production mode hides stack traces"
  //
  // NOTE: In non-production mode a 'stack' property may be present in
  //       the error object for debugging convenience. The primary
  //       assertion here is that the structure is correct and that
  //       stack traces are absent in production.
  // -----------------------------------------------------------------------
  await test('Error responses should follow { error: { status, message } } format', async function () {
    const res = await makeRequest(app, '/does-not-exist');
    assert.strictEqual(res.statusCode, 404, 'Expected status code 404');

    const body = JSON.parse(res.body);

    // Validate top-level structure
    assert.ok(body.error, 'Response must have an "error" property');
    assert.strictEqual(
      typeof body.error.status,
      'number',
      'error.status must be a number'
    );
    assert.strictEqual(
      typeof body.error.message,
      'string',
      'error.message must be a string'
    );

    // Validate specific values
    assert.strictEqual(body.error.status, 404, 'error.status should be 404');
    assert.strictEqual(
      body.error.message,
      'Not Found',
      'error.message should be "Not Found"'
    );

    // In production mode (NODE_ENV=production), stack traces must NOT
    // be present to prevent information leakage per OWASP A09:2021.
    assert.strictEqual(
      body.error.stack,
      undefined,
      'Stack trace must not be present in production mode'
    );
  });

  // -----------------------------------------------------------------------
  // Test 5: Validation Middleware Integration
  //
  // Confirms the validation infrastructure is correctly configured by
  // verifying the handleValidationErrors middleware function is properly
  // exported from the validator module. This ensures the middleware is
  // available for route-level input validation.
  //
  // Since current routes (GET /, GET /health) do not accept user input,
  // this test validates the middleware's existence and signature rather
  // than its runtime behavior. Extend this test when input-accepting
  // routes are added.
  // -----------------------------------------------------------------------
  await test('Validation middleware should be correctly configured', async function () {
    // Verify handleValidationErrors is a function
    assert.strictEqual(
      typeof handleValidationErrors,
      'function',
      'handleValidationErrors should be a function'
    );

    // Verify the middleware has Express middleware signature (req, res, next)
    assert.strictEqual(
      handleValidationErrors.length,
      3,
      'handleValidationErrors should accept 3 arguments (req, res, next)'
    );
  });

  // -----------------------------------------------------------------------
  // Results Summary
  // -----------------------------------------------------------------------
  console.log('');
  console.log(
    'Results: ' + passed + ' passed, ' + failed + ' failed, ' +
    (passed + failed) + ' total'
  );

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
// Module Exports — For external test runners (Jest, Mocha)
// ---------------------------------------------------------------------------
module.exports = { runTests };

// ---------------------------------------------------------------------------
// Self-Execution Guard — Run tests when invoked directly via node
// ---------------------------------------------------------------------------
if (require.main === module) {
  runTests().catch(function (err) {
    console.error('Test runner failed:', err);
    process.exit(1);
  });
}
