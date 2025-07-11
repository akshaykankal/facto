# Setting Up Free 15-Minute Cron with cron-job.org

Since your Vercel deployment has organization authentication, we'll use cron-job.org for free cron scheduling.

## Steps:

1. **Go to [cron-job.org](https://cron-job.org)**
2. **Sign up for a free account**
3. **Create a new cron job**:
   - Title: "FactoHR Attendance Check"
   - URL: `https://factohr-automation-lrif5x7i8-akshaykankals-projects.vercel.app/api/attendance/check`
   - Schedule: Every 15 minutes (or custom)
   - Request Method: GET
   - Request Headers:
     ```
     x-cron-secret: your-cron-secret-change-in-production
     Content-Type: application/json
     ```

4. **Enable the cron job**

## Alternative: Create a public endpoint

If cron-job.org doesn't work due to authentication, create a separate public deployment:

1. Deploy to a personal Vercel account (not organization)
2. Or use Netlify/Railway/Render for the cron endpoint only

## Testing from your app

You can still test manually from your dashboard using the "Check Scheduler" button since you're authenticated.