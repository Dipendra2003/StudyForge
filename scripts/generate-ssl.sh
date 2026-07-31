#!/bin/bash
# =============================================================================
# Generate Self-Signed SSL Certificates for Local Development / Testing
# =============================================================================

# Ensure the certs directory exists
mkdir -p nginx/certs

echo "🔐 Generating self-signed SSL certificate for localhost..."

# Generate a self-signed certificate valid for 365 days
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/privkey.pem \
  -out nginx/certs/fullchain.pem \
  -subj "/C=US/ST=State/L=City/O=StudyForge/CN=localhost"

echo "✅ Certificates generated in nginx/certs/"
echo "   - fullchain.pem"
echo "   - privkey.pem"
echo ""
echo "Note: Your browser will show a security warning because this is a self-signed"
echo "certificate. You can safely bypass it for local testing."
echo "For production, use Let's Encrypt (Certbot) to generate valid certificates."
