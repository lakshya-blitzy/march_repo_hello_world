#!/usr/bin/env bash
# =============================================================================
# generate-cert.sh — Self-Signed TLS Certificate Generator
# =============================================================================
#
# Generates a self-signed TLS certificate and private key for local HTTPS
# development. This script is part of the security infrastructure that resolves
# the "Missing HTTPS/TLS" vulnerability (OWASP A02:2021 — Cryptographic
# Failures).
#
# Generated files:
#   cert.pem  — Self-signed X.509 certificate (PEM-encoded)
#   key.pem   — RSA private key (PEM-encoded, unencrypted)
#
# The generated certificate includes Subject Alternative Names (SANs) for:
#   - DNS:localhost       (hostname access)
#   - IP:127.0.0.1        (IPv4 loopback)
#   - IP:::1              (IPv6 loopback)
#
# WARNING: Self-signed certificates are for DEVELOPMENT ONLY.
# For production, use CA-issued certificates provided via the
# TLS_CERT_PATH and TLS_KEY_PATH environment variables.
#
# Usage:
#   chmod +x certs/generate-cert.sh
#   ./certs/generate-cert.sh
#
# After generation, configure the server:
#   export TLS_CERT_PATH=certs/cert.pem
#   export TLS_KEY_PATH=certs/key.pem
#
# Or add them to your .env file (see .env.example for reference).
# =============================================================================

# Enable strict error handling:
#   -e        Exit immediately if any command returns a non-zero status
#   -u        Treat references to unset variables as errors
#   -o pipefail  Propagate failure exit codes through pipelines
set -euo pipefail

# =============================================================================
# Configuration Variables
# =============================================================================

# Resolve the absolute path to the directory containing this script.
# This ensures output files are always written to the certs/ directory
# regardless of where the script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Output file paths — certificates are written alongside this script
CERT_FILE="${SCRIPT_DIR}/cert.pem"
KEY_FILE="${SCRIPT_DIR}/key.pem"

# Certificate parameters
DAYS=365                        # Certificate validity period (1 year for dev)
KEY_SIZE=2048                   # RSA key size in bits (2048 = minimum secure)
SUBJECT="/C=US/ST=Development/L=Local/O=Development/CN=localhost"

# =============================================================================
# Pre-flight Checks
# =============================================================================

# Verify that OpenSSL is installed and accessible on the system PATH.
# OpenSSL is required for certificate generation — there is no fallback.
if ! command -v openssl &> /dev/null; then
    echo "Error: OpenSSL is required but not installed." >&2
    echo "" >&2
    echo "Install it with one of the following commands:" >&2
    echo "  Debian/Ubuntu:  sudo apt-get install -y openssl" >&2
    echo "  RHEL/CentOS:    sudo yum install -y openssl" >&2
    echo "  Alpine:         sudo apk add openssl" >&2
    echo "  macOS:          brew install openssl" >&2
    exit 1
fi

# Display the OpenSSL version for diagnostic purposes
echo "Using $(openssl version)"

# Check if certificate files already exist. If they do, prompt the user
# before overwriting to prevent accidental loss of existing certificates.
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo ""
    echo "Warning: Certificate files already exist in ${SCRIPT_DIR}/"
    echo "  - ${CERT_FILE}"
    echo "  - ${KEY_FILE}"
    echo ""

    # Support non-interactive mode: if stdin is not a terminal (e.g., CI/CD
    # pipeline, Docker build), skip the prompt and overwrite automatically.
    if [ -t 0 ]; then
        read -p "Overwrite existing certificates? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted. Existing certificates preserved."
            exit 0
        fi
    else
        echo "Non-interactive mode detected. Overwriting existing certificates."
    fi
fi

# Ensure the output directory exists (handles the case where the script
# is run before the certs/ directory has been created)
mkdir -p "${SCRIPT_DIR}"

# =============================================================================
# Certificate Generation
# =============================================================================
# Generate a self-signed X.509 certificate with RSA key pair.
#
# Key flags:
#   -x509       Output a self-signed certificate (not a CSR)
#   -newkey     Generate a new RSA key pair with the specified bit length
#   -keyout     Write the private key to the specified file
#   -out        Write the certificate to the specified file
#   -days       Set certificate validity duration
#   -nodes      Do NOT encrypt the private key (no passphrase); required for
#               automated server startup without manual passphrase entry
#   -subj       Set the certificate subject (Distinguished Name) inline
#   -addext     Add X.509v3 extensions inline (requires OpenSSL >= 1.1.1)
#
# Subject Alternative Names (SANs) are CRITICAL for modern TLS validation.
# Without SANs, browsers and Node.js will reject the certificate even if
# the Common Name (CN) matches, because CN-based validation is deprecated.
# =============================================================================

echo ""
echo "Generating self-signed TLS certificate..."
echo "  Key size:    ${KEY_SIZE}-bit RSA"
echo "  Validity:    ${DAYS} days"
echo "  Subject:     ${SUBJECT}"
echo "  SANs:        DNS:localhost, IP:127.0.0.1, IP:::1"
echo ""

openssl req -x509 \
    -newkey "rsa:${KEY_SIZE}" \
    -keyout "${KEY_FILE}" \
    -out "${CERT_FILE}" \
    -days "${DAYS}" \
    -nodes \
    -subj "${SUBJECT}" \
    -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1" \
    2>&1

# Verify that both output files were created successfully
if [ ! -f "$CERT_FILE" ]; then
    echo "Error: Certificate file was not created at ${CERT_FILE}" >&2
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    echo "Error: Private key file was not created at ${KEY_FILE}" >&2
    exit 1
fi

# =============================================================================
# Set File Permissions
# =============================================================================
# The private key must be protected with restrictive permissions to prevent
# unauthorized access. The certificate is public information and can be
# world-readable.
#
#   600 (owner read/write only)  — private key
#   644 (owner read/write, group/others read) — certificate
# =============================================================================

chmod 600 "${KEY_FILE}"
chmod 644 "${CERT_FILE}"

# =============================================================================
# Success Output
# =============================================================================

echo ""
echo "============================================================"
echo "  Self-signed TLS certificate generated successfully!"
echo "============================================================"
echo ""
echo "  Certificate: ${CERT_FILE}"
echo "  Private Key: ${KEY_FILE}"
echo "  Valid for:   ${DAYS} days"
echo "  Key Size:    ${KEY_SIZE}-bit RSA"
echo ""
echo "To use with the server, set environment variables:"
echo "  export TLS_CERT_PATH=${CERT_FILE}"
echo "  export TLS_KEY_PATH=${KEY_FILE}"
echo ""
echo "Or add to your .env file:"
echo "  TLS_CERT_PATH=${CERT_FILE}"
echo "  TLS_KEY_PATH=${KEY_FILE}"
echo ""
echo "WARNING: These certificates are for DEVELOPMENT ONLY."
echo "For production, use CA-issued certificates (e.g., Let's Encrypt)."
echo ""

# =============================================================================
# Certificate Verification
# =============================================================================
# Display key certificate details so the user can verify the generation
# was successful and the SANs are correctly configured.
# =============================================================================

echo "--- Certificate Details ---"
echo ""

# Display the certificate subject line
openssl x509 -in "${CERT_FILE}" -noout -subject
echo ""

# Display the certificate issuer (same as subject for self-signed)
openssl x509 -in "${CERT_FILE}" -noout -issuer
echo ""

# Display certificate validity dates (Not Before / Not After)
openssl x509 -in "${CERT_FILE}" -noout -dates
echo ""

# Display Subject Alternative Names — this is the critical verification
# that DNS:localhost, IP:127.0.0.1, and IP:::1 are all present
echo "Subject Alternative Names:"
openssl x509 -in "${CERT_FILE}" -noout -text \
    | grep -A 1 "Subject Alternative Name" \
    | tail -1 \
    | sed 's/^[[:space:]]*/  /'
echo ""

echo "--- End Certificate Details ---"
echo ""
echo "Certificate generation complete. Your HTTPS server is ready for development."
