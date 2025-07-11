# Using Vercel Access Token for API Authentication

## Overview
Your Vercel access token can potentially bypass organization authentication for API access. Here's how to set it up.

## Setup Instructions

### 1. Add Token to GitHub Secrets
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Add a new secret:
   - Name: `VERCEL_TOKEN`
   - Value: Your Vercel access token

### 2. Update GitHub Actions Workflow
Use the `attendance-cron-auth.yml` workflow which includes authentication headers.

### 3. Test Authentication Methods
Run the test script to see which method works:
```bash
./scripts/test-vercel-auth.sh YOUR_VERCEL_TOKEN
```

## Alternative: Vercel Deploy Hook
If direct API access doesn't work, you can use Vercel's deploy hooks to trigger a serverless function:

1. **Create a Deploy Hook** in Vercel dashboard:
   - Go to your project settings
   - Navigate to "Git" → "Deploy Hooks"
   - Create a new hook named "attendance-check"
   - Copy the hook URL

2. **Create a serverless function** that runs on deploy:
   ```typescript
   // api/deploy-hook-handler.ts
   export default async function handler() {
     // This runs when deploy hook is triggered
     await checkAttendance();
   }
   ```

3. **Call the deploy hook** from GitHub Actions:
   ```yaml
   - name: Trigger Vercel Deploy Hook
     run: |
       curl -X POST "${{ secrets.VERCEL_DEPLOY_HOOK }}"
   ```

## Using Vercel API Directly
You can also use Vercel's API to trigger functions:

```bash
# Get project info
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.vercel.com/v9/projects/YOUR_PROJECT_ID

# Trigger a function
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.vercel.com/v1/functions/YOUR_FUNCTION_ID/invoke
```

## Security Notes
- Never commit your token to the repository
- Rotate tokens regularly
- Use GitHub Secrets for secure storage
- Consider token scopes and permissions

## Troubleshooting
If authentication still fails:
1. Check token permissions in Vercel dashboard
2. Ensure token has access to the specific project
3. Try regenerating the token with full access
4. Consider using a team token instead of personal token