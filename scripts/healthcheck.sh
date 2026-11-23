#!/usr/bin/env bash

BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

echo "===================================================="
echo " Checking PACT Services Health"
echo "===================================================="

# Check Backend API
echo -n "Checking Backend Health ($BACKEND_URL/api/v1/health)... "
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/v1/health" || echo "FAILED")

if [ "$BACKEND_STATUS" = "200" ]; then
    echo "✅ ONLINE (200 OK)"
else
    echo "❌ OFFLINE (Status: $BACKEND_STATUS)"
fi

# Check Frontend Web
echo -n "Checking Frontend Health ($FRONTEND_URL/health)... "
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/health" || echo "FAILED")

if [ "$FRONTEND_STATUS" = "200" ]; then
    echo "✅ ONLINE (200 OK)"
else
    echo "❌ OFFLINE (Status: $FRONTEND_STATUS)"
fi

echo "===================================================="
