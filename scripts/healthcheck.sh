#!/bin/sh
# Health check script for Docker HEALTHCHECK directive.
# Exits 0 if the /api/health endpoint returns HTTP 200, exits 1 otherwise.
# Uses --max-time to prevent hanging if the server is unresponsive.

curl -sf --max-time 5 http://localhost:${API_PORT:-5000}/api/health > /dev/null || exit 1
