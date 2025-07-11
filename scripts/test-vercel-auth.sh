#!/bin/bash

# Test script for Vercel authenticated API access
# Usage: ./test-vercel-auth.sh YOUR_VERCEL_TOKEN

VERCEL_TOKEN="${1:-lSO2vSlm3p0DmoOvcfvzfgWZ}"
APP_URL="https://factohr-automation-cbondvr6j-akshaykankals-projects.vercel.app"
CRON_SECRET="your-cron-secret-change-in-production"

echo "Testing Vercel authenticated access..."
echo "URL: ${APP_URL}/api/attendance/check"
echo ""

# Method 1: Using Authorization header
echo "Method 1: Authorization Bearer token"
curl -X GET "${APP_URL}/api/attendance/check" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -v 2>&1 | grep -E "(< HTTP|< Location|{)"

echo ""
echo "---"
echo ""

# Method 2: Using cookie
echo "Method 2: Vercel cookie"
curl -X GET "${APP_URL}/api/attendance/check" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "Cookie: __vdlsync=${VERCEL_TOKEN}" \
  -v 2>&1 | grep -E "(< HTTP|< Location|{)"

echo ""
echo "---"
echo ""

# Method 3: Using x-vercel-token header
echo "Method 3: x-vercel-token header"
curl -X GET "${APP_URL}/api/attendance/check" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -H "x-vercel-token: ${VERCEL_TOKEN}" \
  -v 2>&1 | grep -E "(< HTTP|< Location|{)"

echo ""
echo "---"
echo ""

# Method 4: Query parameter
echo "Method 4: Token as query parameter"
curl -X GET "${APP_URL}/api/attendance/check?token=${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${CRON_SECRET}" \
  -v 2>&1 | grep -E "(< HTTP|< Location|{)"

echo ""
echo "Done testing!"