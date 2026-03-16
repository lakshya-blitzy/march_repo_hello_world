# march_repo_hello_world

A security-hardened Node.js HTTP server built on [Express.js](https://expressjs.com/) v5 with a comprehensive middleware-based security architecture. This project transforms a minimal "Hello, World!" server into a production-ready scaffold featuring HTTP security headers, input validation, rate limiting, HTTPS/TLS support, CORS policies, and structured error handling — aligned with [OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/) best practices.

## Table of Contents

- [Security Features](#security-features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)
- [HTTPS Setup](#https-setup)
- [Security Verification](#security-verification)
- [Project Structure](#project-structure)
- [License and Credits](#license-and-credits)

## Security Features

This application addresses seven key security areas:

### 1. HTTP Security Headers

[Helmet.js](https://helmetjs.github.io/) v8.1.0 sets **13 HTTP security response headers** by default, including:

- `Content-Security-Policy` — Mitigates cross-site scripting (XSS) and data injection attacks
- `Strict-Transport-Security` — Enforces HTTPS connections via HSTS
- `X-Content-Type-Options: nosniff` — Prevents MIME-type sniffing
- `X-Frame-Options: SAMEORIGIN` — Protects against clickjacking
- `X-Powered-By` — **Removed** to prevent technology fingerprinting
- `X-XSS-Protection: 0` — Disables legacy XSS filter (which can introduce vulnerabilities)
- `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Origin-Agent-Cluster`, `Referrer-Policy`, `X-DNS-Prefetch-Control`, `X-Download-Options`, `X-Permitted-Cross-Domain-Policies`

### 2. Input Validation

[express-validator](https://express-validator.github.io/) v7.3.1 provides request data sanitization and validation middleware. All incoming request data is validated and sanitized before reaching route handlers, preventing injection attacks (OWASP A03:2021).

### 3. Rate Limiting

[express-rate-limit](https://www.npmjs.com/package/express-rate-limit) v8.3.1 provides IP-based request throttling to prevent denial-of-service (DoS) and brute-force attacks (OWASP A04:2021):

- **Default window:** 15 minutes (900,000 ms)
- **Default limit:** 100 requests per IP per window
- **Headers:** Includes draft-8 `RateLimit` standard headers in responses

### 4. HTTPS/TLS Support

Native Node.js `https` module provides encrypted transport-layer communication (OWASP A02:2021):

- Self-signed certificate generation script for development
- Configurable TLS certificate and key paths via environment variables
- Runs alongside the HTTP server on a separate port

### 5. CORS Policies

[cors](https://www.npmjs.com/package/cors) v2.8.6 middleware enforces Cross-Origin Resource Sharing policies (OWASP A01:2021):

- Restrictive default configuration (specific allowed origins, not wildcard)
- Configurable origins via the `CORS_ORIGIN` environment variable
- Proper handling of preflight `OPTIONS` requests

### 6. Error Handling

Structured error-handling middleware prevents information leakage (OWASP A09:2021):

- Generic error messages returned to clients (no stack traces in production)
- Unregistered routes return `404 Not Found` instead of crashing
- Internal errors return `500 Internal Server Error` with a safe, structured response body
- Detailed error information logged server-side for debugging

### 7. Dependency Management

All dependencies are managed via `package.json` and `package-lock.json`, enabling:

- Reproducible builds with `npm ci`
- Automated vulnerability scanning with `npm audit`
- Transparent dependency tree for security auditing

## Prerequisites

- **Node.js** >= v18.0.0 (required by Express 5.x)
- **npm** (included with Node.js)
- **OpenSSL** (optional, required only for generating self-signed TLS certificates)

> **Note:** This project was developed and tested with Node.js v20.20.1 (Maintenance LTS).

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd march_repo_hello_world
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and customize the values for your environment. See the [Environment Variables](#environment-variables) section for details.

4. **Generate development TLS certificates** (optional, for HTTPS):

   ```bash
   bash certs/generate-cert.sh
   ```

5. **Start the server:**

   ```bash
   npm start
   ```

6. **Access the server:**

   - HTTP: [http://localhost:3000/](http://localhost:3000/)
   - HTTPS: [https://localhost:3443/](https://localhost:3443/) (if TLS certificates are configured)

## Environment Variables

All configuration is managed through environment variables defined in `.env.example`. Copy this file to `.env` and adjust values as needed.

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP server port | `3000` |
| `HOST` | Server bind address (`0.0.0.0` for all interfaces, `127.0.0.1` for localhost only) | `0.0.0.0` |
| `NODE_ENV` | Application environment (`development` or `production`). Production mode hides stack traces and enforces stricter security. | `development` |
| `HTTPS_PORT` | HTTPS server port | `3443` |
| `TLS_CERT_PATH` | Path to TLS certificate file (PEM format). Leave empty to disable HTTPS. | *(empty)* |
| `TLS_KEY_PATH` | Path to TLS private key file (PEM format). Leave empty to disable HTTPS. | *(empty)* |
| `CORS_ORIGIN` | Comma-separated list of allowed origins for CORS. When unset, no origins are allowed (CORS disabled). See `.env.example` for a suggested development value of `http://localhost:3000`. | *(empty — CORS disabled)* |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window duration in milliseconds | `900000` (15 min) |
| `RATE_LIMIT_MAX` | Maximum requests per IP per rate limit window | `100` |

## API Documentation

### Endpoints

| Method | Path | Description | Response |
|---|---|---|---|
| `GET` | `/` | Primary endpoint | `200 OK` — `Hello, World!\n` (`text/plain`) |
| `GET` | `/health` | Health check endpoint | `200 OK` — Health status |

### Error Responses

| Status Code | Condition | Description |
|---|---|---|
| `400 Bad Request` | Invalid input on validated routes | Returned when request data fails validation. Response body contains structured error details. |
| `404 Not Found` | Unregistered route | Returned for any path not defined in the router. |
| `429 Too Many Requests` | Rate limit exceeded | Returned when an IP address exceeds the configured request limit within the rate limit window. |
| `500 Internal Server Error` | Unhandled server error | Returned for unexpected errors. Stack traces are hidden in production mode. |

### Response Headers

All responses include security headers set by Helmet.js. Example:

```
Content-Security-Policy: default-src 'self';...
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Origin-Agent-Cluster: ?1
Referrer-Policy: no-referrer
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-DNS-Prefetch-Control: off
X-Download-Options: noopen
X-Frame-Options: SAMEORIGIN
X-Permitted-Cross-Domain-Policies: none
X-XSS-Protection: 0
```

## HTTPS Setup

### Development

Generate self-signed certificates using the included script:

```bash
bash certs/generate-cert.sh
```

This creates `certs/cert.pem` and `certs/key.pem` with a 365-day validity period. Then set the environment variables:

```bash
export TLS_CERT_PATH=./certs/cert.pem
export TLS_KEY_PATH=./certs/key.pem
```

Or add them to your `.env` file:

```
TLS_CERT_PATH=./certs/cert.pem
TLS_KEY_PATH=./certs/key.pem
```

> **Note:** Self-signed certificates will trigger browser warnings — this is expected for development. The server will start HTTPS alongside HTTP automatically when valid certificate paths are configured.

### Production

For production deployments, use CA-issued certificates (e.g., from [Let's Encrypt](https://letsencrypt.org/)):

1. Obtain a certificate and private key from a trusted Certificate Authority
2. Set the `TLS_CERT_PATH` and `TLS_KEY_PATH` environment variables to point to the CA-issued files
3. Set `NODE_ENV=production` for strict security defaults

## Security Verification

After starting the server, use these commands to verify security features are active:

### Inspect Security Headers

```bash
curl -sI http://localhost:3000/ | grep -iE "(content-security|strict-transport|x-content-type|x-frame|x-powered|x-xss)"
```

Expected output should include `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, and `X-XSS-Protection` headers. The `X-Powered-By` header should be absent.

### Verify HTTPS Connectivity

```bash
curl -sk https://localhost:3443/
```

Expected output: `Hello, World!`

### Test Rate Limiting

```bash
for i in $(seq 1 105); do curl -so /dev/null -w "%{http_code}\n" http://localhost:3000/; done | sort | uniq -c
```

Expected: the first 100 requests return `200`, subsequent requests return `429`.

### Test CORS Policy

```bash
curl -sI -H "Origin: http://unauthorized.com" http://localhost:3000/ | grep -i "access-control"
```

Expected: no `Access-Control-Allow-Origin` header for unauthorized origins.

### Audit Dependencies

```bash
npm audit
```

Expected output: `0 vulnerabilities`.

## Project Structure

```
├── server.js                          # Application entry point — Express app with security middleware pipeline
├── package.json                       # Project manifest with security dependencies
├── package-lock.json                  # Lockfile for reproducible dependency installs
├── .env.example                       # Environment variables template (safe defaults, no secrets)
├── .gitignore                         # Git ignore rules (node_modules, .env, certs/*.pem, certs/*.key)
├── README.md                          # This file
├── src/
│   ├── config/
│   │   └── index.js                   # Centralized configuration — reads env vars with secure defaults
│   ├── middleware/
│   │   ├── security.js                # Helmet, CORS, and rate limiter middleware configuration
│   │   ├── validator.js               # Input validation middleware (express-validator)
│   │   └── errorHandler.js            # Global error handling middleware
│   └── routes/
│       └── index.js                   # Express Router — GET / (Hello World), GET /health
├── certs/
│   └── generate-cert.sh              # Self-signed TLS certificate generation script
└── tests/
    ├── helpers/
    │   └── request.js                 # Shared HTTP request helper for test suites
    ├── security/
    │   └── security.test.js           # Security header, rate limiting, CORS, validation tests
    └── integration/
        └── routes.test.js             # Route handler integration tests
```

## License and Credits

### OWASP Alignment

This project's security architecture is aligned with the [OWASP Top 10 (2021)](https://owasp.org/www-project-top-ten/) vulnerability categories:

| OWASP Category | Mitigation |
|---|---|
| A01:2021 — Broken Access Control | CORS middleware with restrictive origin configuration |
| A02:2021 — Cryptographic Failures | HTTPS/TLS support with configurable certificates |
| A03:2021 — Injection | Input validation and sanitization via express-validator |
| A04:2021 — Insecure Design | Rate limiting to prevent DoS and brute-force attacks |
| A05:2021 — Security Misconfiguration | Helmet.js setting 13 security headers by default |
| A09:2021 — Security Logging and Monitoring Failures | Structured error handling preventing information leakage |

### Dependencies

All packages used in this project are [MIT licensed](https://opensource.org/licenses/MIT):

| Package | Version | Purpose |
|---|---|---|
| [express](https://expressjs.com/) | ^5.2.1 | Web application framework with middleware pipeline |
| [helmet](https://helmetjs.github.io/) | ^8.1.0 | HTTP security response headers |
| [cors](https://www.npmjs.com/package/cors) | ^2.8.6 | Cross-Origin Resource Sharing middleware |
| [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) | ^8.3.1 | IP-based request rate limiting |
| [express-validator](https://express-validator.github.io/) | ^7.3.1 | Request input validation and sanitization |

### Standards Referenced

- [RFC 6797](https://www.rfc-editor.org/rfc/rfc6797) — HTTP Strict Transport Security (HSTS)
- [W3C Content Security Policy](https://www.w3.org/TR/CSP3/) — Content Security Policy Level 3
- [W3C CORS Specification](https://www.w3.org/TR/cors/) — Cross-Origin Resource Sharing
- [IETF RateLimit Header Fields](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/) — draft-8 RateLimit standard
