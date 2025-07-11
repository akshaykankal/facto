// Proxy endpoint to bypass organization authentication
// Deploy this to a personal Vercel account or other platform

const CRON_SECRET = process.env.CRON_SECRET || 'your-cron-secret-change-in-production';
const TARGET_URL = process.env.TARGET_URL || 'https://factohr-automation-cbondvr6j-akshaykankals-projects.vercel.app/api/attendance/check';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;

export default async function handler(req, res) {
  // Verify cron secret
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Try multiple authentication methods
    const headers = {
      'Content-Type': 'application/json',
      'x-cron-secret': CRON_SECRET,
    };

    // Add Vercel token if available
    if (VERCEL_TOKEN) {
      headers['Authorization'] = `Bearer ${VERCEL_TOKEN}`;
      headers['Cookie'] = `__vdlsync=${VERCEL_TOKEN}`;
    }

    const response = await fetch(TARGET_URL, {
      method: 'GET',
      headers,
      redirect: 'manual', // Don't follow redirects
    });

    // If we get a redirect, it means authentication is required
    if (response.status === 302 || response.status === 307) {
      return res.status(503).json({ 
        error: 'Target endpoint requires authentication',
        suggestion: 'Deploy to personal Vercel account or use alternative hosting'
      });
    }

    const data = await response.text();
    
    // Check if response is HTML (authentication page)
    if (data.includes('<!doctype html>') || data.includes('Authentication Required')) {
      return res.status(503).json({ 
        error: 'Received authentication page instead of API response',
        suggestion: 'Organization authentication cannot be bypassed with token'
      });
    }

    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(data);
      return res.status(response.status).json(jsonData);
    } catch {
      return res.status(response.status).send(data);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to proxy request',
      details: error.message 
    });
  }
}