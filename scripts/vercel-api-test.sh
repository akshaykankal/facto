#!/bin/bash

# Test Vercel API access with token
VERCEL_TOKEN="${1:-lSO2vSlm3p0DmoOvcfvzfgWZ}"

echo "Testing Vercel API access..."
echo ""

# Get user info
echo "1. Getting user info..."
curl -s -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  https://api.vercel.com/v2/user | jq '.'

echo ""
echo "---"
echo ""

# List projects
echo "2. Listing projects..."
curl -s -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  https://api.vercel.com/v9/projects | jq '.projects[] | {name: .name, id: .id}'

echo ""
echo "---"
echo ""

# Get project deployments
echo "3. Getting deployments for factohr-automation..."
curl -s -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v6/deployments?projectId=factohr-automation" | jq '.deployments[0:3] | .[] | {url: .url, created: .created}'

echo ""
echo "Done!"