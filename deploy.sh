#!/bin/bash

# Deploy to Vercel with environment variables

echo "Setting up environment variables..."

# Add environment variables
echo "mongodb+srv://akshaykankal:KcYopRgVXHA00782@cluster0.hfaf2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0" | vercel env add MONGODB_URI production
echo "FACTOHR" | vercel env add DB_NAME production
echo "your-jwt-secret-key-change-in-production" | vercel env add JWT_SECRET production
echo "https://factohr-automation.vercel.app" | vercel env add NEXTAUTH_URL production
echo "your-nextauth-secret-change-in-production" | vercel env add NEXTAUTH_SECRET production

echo "Deploying to production..."
vercel --prod --yes

echo "Deployment complete!"