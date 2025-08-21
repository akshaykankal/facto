#!/bin/bash

# Deploy to Vercel with environment variables

echo "Setting up environment variables..."

# IMPORTANT: Set these environment variables before running this script
# export MONGODB_URI="your-mongodb-uri"
# export DB_NAME="your-database-name"
# export JWT_SECRET="your-jwt-secret"
# export NEXTAUTH_URL="your-app-url"
# export NEXTAUTH_SECRET="your-nextauth-secret"
# export ENCRYPTION_KEY="your-encryption-key"

if [ -z "$MONGODB_URI" ]; then
    echo "Error: MONGODB_URI environment variable is not set"
    exit 1
fi

# Add environment variables from environment
echo "$MONGODB_URI" | vercel env add MONGODB_URI production
echo "${DB_NAME:-FACTOHR}" | vercel env add DB_NAME production
echo "${JWT_SECRET:-change-in-production}" | vercel env add JWT_SECRET production
echo "${NEXTAUTH_URL:-https://factohr-automation.vercel.app}" | vercel env add NEXTAUTH_URL production
echo "${NEXTAUTH_SECRET:-change-in-production}" | vercel env add NEXTAUTH_SECRET production
echo "${ENCRYPTION_KEY:-change-in-production}" | vercel env add ENCRYPTION_KEY production

echo "Deploying to production..."
vercel --prod --yes

echo "Deployment complete!"