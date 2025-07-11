import { NextResponse } from 'next/server'

// Internal endpoint that can be called by Vercel cron
// This bypasses external authentication since it runs within Vercel
export async function GET() {
  try {
    // Since this runs inside Vercel, we can call our own endpoints
    const baseUrl = process.env.NEXTAUTH_URL || 'https://factohr-automation-cbondvr6j-akshaykankals-projects.vercel.app'
    const cronSecret = process.env.CRON_SECRET || 'your-cron-secret-change-in-production'
    
    console.log('Internal trigger called, forwarding to attendance check...')
    
    // Call the attendance check endpoint internally
    const response = await fetch(`${baseUrl}/api/attendance/check`, {
      method: 'GET',
      headers: {
        'x-cron-secret': cronSecret,
        'Content-Type': 'application/json',
      },
    })
    
    const data = await response.json()
    
    console.log('Attendance check result:', data)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      attendanceResult: data
    })
  } catch (error: any) {
    console.error('Internal trigger error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}