# Setting Up Free 15-Minute Cron with GitHub Actions

GitHub Actions provides free cron jobs that can run every 15 minutes. Here's how to set it up:

## Steps to Enable

1. **Add the CRON_SECRET to Vercel**:
   ```bash
   vercel env add CRON_SECRET production
   # Enter a secure random string (e.g., generate one at https://generate-secret.vercel.app/32)
   ```

2. **Fork or use your GitHub repository**

3. **Add GitHub Secrets**:
   - Go to your GitHub repository
   - Navigate to Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `CRON_SECRET`: Same value you added to Vercel
     - `APP_URL`: Your Vercel app URL (optional, defaults to current URL)

4. **Enable GitHub Actions**:
   - The workflow file is already in `.github/workflows/attendance-cron.yml`
   - Go to Actions tab in your repository
   - Enable workflows if prompted

5. **Test the workflow**:
   - Go to Actions tab
   - Click on "Check Attendance" workflow
   - Click "Run workflow" → "Run workflow" to test manually

## How it works

- GitHub Actions will call your `/api/attendance/check` endpoint every 15 minutes
- The endpoint checks all users and processes attendance based on:
  - Current time vs configured punch times
  - Working days
  - Leave dates
  - Random minute windows
- Only punches in/out if within the time window

## Important Notes

- GitHub Actions cron may have slight delays (1-5 minutes)
- Free tier includes 2,000 minutes/month for private repos, unlimited for public
- The cron runs 24/7, but only processes during configured hours

## Alternative Free Options

1. **Cron-job.org**: Free cron service
2. **UptimeRobot**: Free monitoring that can act as cron
3. **Pipedream**: Free workflows with cron triggers
4. **Railway.app**: Free tier with cron support
5. **Render.com**: Free cron jobs

All these services can call your `/api/attendance/check` endpoint with the `x-cron-secret` header.