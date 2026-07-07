/**
 * @file server.js
 * @module server
 * @description
 * Minimal HTTP server built on the Node.js built-in `http` module (no third-party
 * dependencies). It binds the loopback interface 127.0.0.1 on port 3000 and replies
 * to every request the handler receives — regardless of method, path, headers, or
 * body — with the same static plain-text response (a "catch-all" response).
 *
 * Response contract: `200 OK`, `Content-Type: text/plain`, body `Hello, World!\n`.
 * Node derives `Content-Length` (14 bytes) automatically from the response body for
 * body-bearing methods (GET, POST, …).
 *
 * Run with: `node server.js`  (no dependency install and no build step required).
 * On startup it logs: `Server running at http://127.0.0.1:3000/`.
 */

// Node.js built-in HTTP module — the only dependency (ships with Node.js).
const hostname = '127.0.0.1';

/**
 * The TCP port the server listens on.
 * @constant {number}
 */
const port = 3000;

/**
 * HTTP request handler (the `http.createServer` request listener).
 *
 * Responds identically to every request: the method, URL/path, headers, and body
 * are all ignored (catch-all behavior). Always returns HTTP 200 with a
 * `text/plain` body of `Hello, World!\n`.
 *
 * @param {http.IncomingMessage} req - The incoming request. Accepted to satisfy the
 *   callback signature but intentionally unused (no inspection or branching).
 * @param {http.ServerResponse} res - The response object us

const hostname = '127.0.0.1';
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello, World!\n');
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
