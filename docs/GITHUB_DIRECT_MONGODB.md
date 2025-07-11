# GitHub Actions Direct MongoDB Connection

This solution completely bypasses Vercel and connects GitHub Actions directly to your MongoDB database to check and mark attendance.

## How It Works

1. **GitHub Actions** runs every 10 minutes
2. **Connects directly to MongoDB** to get user data
3. **Logs into FactoHR** for each user
4. **Marks attendance** based on preferences
5. **Updates MongoDB** with results

## Setup Instructions

### 1. Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `MONGODB_URI`: Your MongoDB connection string (same as in Vercel)
- `DB_NAME`: Set to `FACTOHR` (Note: there's a database naming issue, the script handles it)
- `ENCRYPTION_KEY`: Your encryption key for passwords (use: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6)

### 2. Push the Code

The workflow file (`.github/workflows/direct-attendance.yml`) and script (`scripts/direct-attendance-check.js`) are ready to use.

```bash
git add .
git commit -m "Add direct MongoDB attendance check"
git push
```

### 3. Enable GitHub Actions

1. Go to your repository's Actions tab
2. Enable workflows if prompted
3. Find "Direct Attendance Check" workflow
4. Click "Run workflow" to test manually

## Advantages

- **No Vercel authentication issues** - completely bypasses Vercel
- **Runs every 10 minutes** - more frequent than Vercel's daily limit
- **Direct database access** - faster and more reliable
- **Free with GitHub Actions** - 2000 minutes/month for private repos
- **No browser needed** - runs completely in the cloud

## How the Script Works

1. **Connects to MongoDB** using your connection string
2. **Gets all users** from the database
3. **For each user**, checks if it's time to punch in/out:
   - Checks working days
   - Checks leave dates
   - Checks time windows with random minutes
4. **Decrypts FactoHR password** using the same encryption as your app
5. **Logs into FactoHR** and marks attendance
6. **Updates MongoDB** with the results

## Monitoring

- Check GitHub Actions tab for run history
- Each run shows detailed logs
- Failed runs will be marked in red
- You can set up email notifications for failures

## Testing

To test immediately:
1. Go to Actions tab
2. Click "Direct Attendance Check"
3. Click "Run workflow"
4. Watch the logs in real-time

## Troubleshooting

If it fails:
1. Check that all secrets are set correctly
2. Verify MongoDB connection string works
3. Check encryption key matches your Vercel deployment
4. Look at the GitHub Actions logs for specific errors

## Security Notes

- GitHub Secrets are encrypted and safe
- Only accessible to repository collaborators
- Logs don't show sensitive information
- Same security as your Vercel deployment

This solution is completely independent of Vercel and its authentication!