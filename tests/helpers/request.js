'use strict';

/**
 * Shared HTTP Request Helper for Test Suites
 *
 * Creates a temporary HTTP server from an Express app, sends a single
 * request to the specified path, then closes the server. Port 0 lets
 * the OS assign an available port so tests never collide.
 *
 * Used by both security and integration test suites to eliminate code
 * duplication of the makeRequest helper function.
 *
 * @module tests/helpers/request
 */

const http = require('http');

/**
 * Creates a temporary HTTP server from the Express app, sends a single
 * request to the specified path, then closes the server.  Port 0 lets
 * the OS assign an available port so tests never collide.
 *
 * @param {Function} app       Express application instance
 * @param {string}   path      URL path (e.g. '/', '/health')
 * @param {object}   [opts]    Request options
 * @param {string}   [opts.method='GET']  HTTP method
 * @param {object}   [opts.headers={}]    Request headers
 * @param {string}   [opts.body]          Request body
 * @returns {Promise<{statusCode:number, headers:object, body:string}>}
 */
function makeRequest(app, path, opts) {
  const options = opts || {};
  return new Promise(function (resolve, reject) {
    const server = http.createServer(app);

    server.listen(0, function () {
      const port = server.address().port;
      const reqOptions = {
        hostname: 'localhost',
        port: port,
        path: path,
        method: options.method || 'GET',
        headers: options.headers || {},
      };

      const req = http.request(reqOptions, function (res) {
        let body = '';
        res.on('data', function (chunk) { body += chunk; });
        res.on('end', function () {
          server.close();
          resolve({ statusCode: res.statusCode, headers: res.headers, body: body });
        });
      });

      req.on('error', function (err) { server.close(); reject(err); });
      if (options.body) { req.write(options.body); }
      req.end();
    });

    server.on('error', function (err) {
      reject(err);
    });
  });
}

module.exports = { makeRequest };
