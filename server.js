/**
 * @file server.js
 * @module server
 * @description
 * Minimal HTTP server built on the Node.js built-in `http` module (no third-party
 * dependencies). It binds the loopback interface 127.0.0.1 on port 3000 and replies
 * to every request the handler receives — regardless of path, headers, or body, and
 * for every standard HTTP method — with the same static plain-text response (a
 * "catch-all" response).
 *
 * Response contract: `200 OK`, `Content-Type: text/plain`, `Content-Length: 14`,
 * body `Hello, World!\n`. `Content-Length` is set explicitly so it is also reported
 * on `HEAD` responses, which carry the same status and headers but no body (per HTTP
 * semantics).
 *
 * Method boundary: a request reaches the handler only after Node's built-in HTTP
 * parser accepts the request line. A request that uses an unrecognized method token
 * (for example `FOO`) is rejected by the parser with `400 Bad Request` before the
 * handler runs.
 *
 * Run with: `node server.js`  (no dependency install and no build step required).
 * On startup it logs: `Server running at http://127.0.0.1:3000/`.
 */

// Node.js built-in HTTP module — the only dependency (ships with Node.js).
const http = require('http');

/**
 * The loopback network interface the server binds to.
 * Using 127.0.0.1 restricts connections to the local machine only; to accept
 * remote connections, bind 0.0.0.0 or place the process behind a reverse proxy.
 * @constant {string}
 */
const hostname = '127.0.0.1';

/**
 * The TCP port the server listens on.
 * @constant {number}
 */
const port = 3000;

/**
 * HTTP request handler (the `http.createServer` request listener).
 *
 * Responds identically to every request it receives: the method, URL/path, headers,
 * and body are all ignored, and the handler returns the same catch-all response —
 * HTTP 200 with `Content-Type: text/plain`, an explicit `Content-Length: 14`, and a
 * body of `Hello, World!\n`. Setting `Content-Length` explicitly ensures it is also
 * present on `HEAD` responses (which send the headers only, no body).
 *
 * Only requests that Node's HTTP parser accepts reach this handler; an unrecognized
 * method token is rejected upstream with `400 Bad Request` (see the module header).
 *
 * @param {http.IncomingMessage} req - The incoming request. Accepted to satisfy the
 *   callback signature but intentionally unused (no inspection or branching).
 * @param {http.ServerResponse} res - The response object used to send the reply.
 * @returns {void}
 */
const server = http.createServer((req, res) => {
  res.statusCode = 200;                               // Always 200 OK
  res.setHeader('Content-Type', 'text/plain');        // Plain-text response
  // Set Content-Length explicitly (the byte length of the body) so it is reported on
  // HEAD responses too — not only on body-bearing methods such as GET and POST.
  res.setHeader('Content-Length', Buffer.byteLength('Hello, World!\n'));
  res.end('Hello, World!\n');                         // Fixed response body
});

/**
 * Binds the server to `hostname:port` and starts listening.
 *
 * The startup callback runs once, when the server is ready, and logs the
 * running URL to stdout: `Server running at http://127.0.0.1:3000/`.
 */
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
