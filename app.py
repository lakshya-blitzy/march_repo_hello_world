"""
Minimal Flask HTTP server that responds with "Hello, World!" to all requests.

This is a complete rewrite of the original Node.js server.js into a Python 3
Flask application. The server listens on localhost:3000 and responds to every
HTTP request — regardless of method, path, headers, or body — with a plain
text "Hello, World!" message.

Author: hxu
License: MIT

Usage:
    python app.py

Test with curl:
    curl http://localhost:3000
"""

# Import Flask framework and make_response for explicit HTTP response construction
from flask import Flask, make_response

# Create the Flask WSGI application instance
app = Flask(__name__)

# Server hostname — binds to localhost only (127.0.0.1), preventing external connections.
# Exact equivalent of: const hostname = '127.0.0.1' (server.js line 27)
HOSTNAME = '127.0.0.1'

# Server port number — listens on port 3000.
# Exact equivalent of: const port = 3000 (server.js line 36)
PORT = 3000


# Catch-all route handler replicating the Node.js http.createServer() universal handler.
# The dual-decorator pattern ensures both the root path '/' and all sub-paths are matched.
# All standard HTTP methods are accepted, mirroring Node.js http module's method-agnostic behavior.
@app.route('/', defaults={'path': ''}, methods=[
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
])
@app.route('/<path:path>', methods=[
    'GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'
])
def hello_world(path):
    """
    Universal request handler that returns a static "Hello, World!" response.

    This function mirrors the Node.js request handler callback from server.js
    lines 44-61. The path parameter captures the URL path but is intentionally
    ignored — the response is completely static and unconditional, exactly as
    in the original Node.js implementation.

    Args:
        path: The URL path captured by the route. Intentionally unused.

    Returns:
        A Flask Response object with status 200, Content-Type text/plain,
        and body "Hello, World!\\n" (14 bytes including trailing newline).
    """
    # Construct the response with explicit status code and body
    # Equivalent to: res.statusCode = 200; res.end('Hello, World!\n')
    response = make_response('Hello, World!\n', 200)

    # Set Content-Type header to plain text
    # Equivalent to: res.setHeader('Content-Type', 'text/plain')
    response.headers['Content-Type'] = 'text/plain'

    return response


@app.errorhandler(405)
def handle_method_not_allowed(error):
    """
    Error handler for 405 Method Not Allowed responses.

    The original Node.js http.createServer() handler is completely method-agnostic —
    it accepts ANY HTTP method (standard or non-standard) and responds identically.
    Flask's route decorators only match methods explicitly listed in the 'methods'
    parameter, returning 405 for unlisted methods such as TRACE, CONNECT, PROPFIND,
    MKCOL, or any custom method name.

    This error handler intercepts those 405 responses and returns the same "Hello, World!"
    response with 200 OK status, ensuring universal method acceptance that mirrors the
    original Node.js behavior.

    Args:
        error: The Werkzeug MethodNotAllowed exception instance.

    Returns:
        A Flask Response object with status 200, Content-Type text/plain,
        and body "Hello, World!\\n" (14 bytes including trailing newline).
    """
    response = make_response('Hello, World!\n', 200)
    response.headers['Content-Type'] = 'text/plain'
    return response


# Entry point guard — ensures app.run() only executes when the file is run directly.
# This allows the module to be imported by WSGI servers (e.g., Gunicorn) without
# automatically starting the development server.
if __name__ == '__main__':
    # Print startup confirmation message to stdout before starting the server.
    # Exact equivalent of: console.log(`Server running at http://${hostname}:${port}/`)
    print(f'Server running at http://{HOSTNAME}:{PORT}/')

    # Start the Flask development server, binding to the configured host and port.
    # Equivalent to: server.listen(port, hostname, callback)
    app.run(host=HOSTNAME, port=PORT)
