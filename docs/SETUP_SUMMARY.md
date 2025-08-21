# GitHub Actions Setup Summary

## The Solution
GitHub Actions will connect directly to your MongoDB database every 10 minutes, check which users need to punch in/out, login to FactoHR, and mark their attendance.

## Issues Found & Fixed
1. ✅ Your MongoDB database name has a newline character: `FACTOHR\n` 
2. ✅ The script now handles this automatically
3. ✅ Found 1 user (105928) with preferences set
4. ✅ Working days are Monday-Friday (no attendance on weekends)

## Setup Steps

### 1. Add GitHub Secrets
Go to: GitHub Repo → Settings → Secrets and variables → Actions → New repository secret

Add these three secrets:
```
MONGODB_URI = <your-mongodb-connection-string>
DB_NAME = FACTOHR
ENCRYPTION_KEY = <generate-a-secure-32-character-key>
```

### 2. Commit and Push
```bash
git add .
git commit -m "Add GitHub Actions for direct MongoDB attendance"
git push
```

### 3. Test the Connection First
1. Go to Actions tab
2. Find "Test Attendance Connection" workflow
3. Click "Run workflow" → "Run workflow"
4. Check if it connects successfully

### 4. Enable Main Workflow
1. Go to Actions tab
2. Find "Direct Attendance Check" workflow
3. It will run automatically every 10 minutes
4. Or click "Run workflow" to test manually

## How It Works

- **Every 10 minutes**, GitHub Actions runs
- Connects to MongoDB and gets all users
- For each user, checks:
  - Is today a working day? (Mon-Fri)
  - Is user on leave today?
  - Is it time to punch in? (9 AM ± 24 minutes)
  - Is it time to punch out? (6 PM ± 24 minutes)
- If yes, logs into FactoHR and marks attendance
- Updates MongoDB with the result

## Current User Settings
- Username: 105928
- Punch In: 9:00 AM ± 24 minutes
- Punch Out: 6:00 PM ± 24 minutes
- Working Days: Monday to Friday
- Today (Saturday): No attendance needed

## Monitoring
- Check Actions tab for run history
- Green checkmark = success
- Red X = failed (check logs)
- Each run shows what it did

## Next Steps
1. Add the GitHub secrets
2. Push the code
3. Test with "Test Attendance Connection"
4. Wait for Monday or manually trigger to see it work

The attendance will be marked automatically without any Vercel authentication issues!