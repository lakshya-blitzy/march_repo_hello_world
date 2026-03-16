/**
 * @module march_repo_hello_world
 * @description A minimal Node.js HTTP server that listens on a specified hostname
 * and port, responding to every incoming request with a plain-text 'Hello, World!'
 * message. This module serves as the application entry point and does not export any values.
 * @requires http
 * @example
 * // Start the server:
 * // $ node server.js
 * // Server running at http://127.0.0.1:3000/
 */

// Import the built-in Node.js HTTP module
const http = require('http');

// Server configuration constants

/**
 * @const {string} hostname
 * @description The hostname on which the HTTP server will listen. Set to the
 * loopback interface address, restricting access to the local machine only.
 * @default '127.0.0.1'
 */
const hostname = '127.0.0.1';

/**
 * @const {number} port
 * @description The port number on which the HTTP server will listen. Must be available
 * (not in use by another process) when the server starts.
 * @default 3000
 */
const port = 3000;

/**
 * @description Creates an HTTP server instance with an inline request handler callback.
 * The request handler responds to every incoming HTTP request with a 200 OK status,
 * a Content-Type of text/plain, and the body 'Hello, World!\n', without differentiating
 * between HTTP methods, URL paths, or request headers.
 * @type {http.Server}
 * @param {http.IncomingMessage} req - The incoming HTTP request object.
 * @param {http.ServerResponse} res - The HTTP server response object used to send data back to the client.
 */
const server = http.createServer((req, res) => {
  // Set the HTTP response status code to 200 (OK)
  res.statusCode = 200;
  // Set the response Content-Type header to plain text
  res.setHeader('Content-Type', 'text/plain');
  // Send the response body and signal that the response is complete
  res.end('Hello, World!\n');
});

/**
 * @description Starts the HTTP server, binding it to the specified hostname and port.
 * Once the server is successfully bound and ready to accept connections, the startup
 * logger callback logs the server URL to standard output.
 */
server.listen(port, hostname, () => {
  // Log the server URL to standard output once the server is ready
  console.log(`Server running at http://${hostname}:${port}/`);
});
