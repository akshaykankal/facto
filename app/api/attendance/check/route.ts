import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { processAttendance } from '@/lib/factohr'

export async function GET(request: NextRequest) {
  try {
    // Allow cron secret or authenticated users
    const cronSecret = request.headers.get('x-cron-secret')
    const authHeader = request.headers.get('authorization')
    
    const validCronSecret = process.env.CRON_SECRET || 'your-cron-secret-here'
    
    if (cronSecret !== validCronSecret && !authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    await dbConnect()
    
    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes() // Current time in minutes
    const dayOfWeek = now.getDay()
    
    console.log(`Checking attendance at ${now.toISOString()} (Day: ${dayOfWeek})`)
    
    // Get all users
    const users = await User.find({})
    
    let processed = 0
    
    for (const user of users) {
      const { preferences } = user
      
      // Skip if not a working day
      if (!preferences.workingDays.includes(dayOfWeek)) {
        continue
      }
      
      // Check if today is a leave day
      const todayString = now.toISOString().split('T')[0]
      const isLeaveDay = preferences.leaveDates.some(
        (leaveDate: Date) => new Date(leaveDate).toISOString().split('T')[0] === todayString
      )
      
      if (isLeaveDay) {
        continue
      }
      
      // Check if user has already punched in/out today
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)
      
      const todayLog = user.attendanceLogs.find(
        (log: any) => {
          const logDate = new Date(log.date)
          return logDate.toDateString() === todayStart.toDateString()
        }
      )
      
      // Process punch in
      const [punchInHour, punchInMinute] = preferences.punchInTime.split(':').map(Number)
      const punchInTimeMinutes = punchInHour * 60 + punchInMinute
      const punchInWindow = preferences.randomMinutes
      
      if (!todayLog?.punchIn && 
          currentTime >= punchInTimeMinutes - punchInWindow && 
          currentTime <= punchInTimeMinutes + punchInWindow) {
        
        console.log(`Processing punch in for ${user.username}`)
        const result = await processAttendance(
          user.factohrUsername,
          user.getDecryptedFactohrPassword(),
          'punchIn'
        )
        
        if (todayLog) {
          todayLog.punchIn = new Date()
          todayLog.status = result.success ? 'success' : 'failed'
          todayLog.message = result.message
        } else {
          user.attendanceLogs.push({
            date: todayStart,
            punchIn: new Date(),
            punchOut: null,
            status: result.success ? 'success' : 'failed',
            message: result.message,
          })
        }
        
        await user.save()
        processed++
      }
      
      // Process punch out
      const [punchOutHour, punchOutMinute] = preferences.punchOutTime.split(':').map(Number)
      const punchOutTimeMinutes = punchOutHour * 60 + punchOutMinute
      const punchOutWindow = preferences.randomMinutes
      
      if (todayLog?.punchIn && !todayLog?.punchOut &&
          currentTime >= punchOutTimeMinutes - punchOutWindow && 
          currentTime <= punchOutTimeMinutes + punchOutWindow) {
        
        console.log(`Processing punch out for ${user.username}`)
        const result = await processAttendance(
          user.factohrUsername,
          user.getDecryptedFactohrPassword(),
          'punchOut'
        )
        
        todayLog.punchOut = new Date()
        todayLog.status = result.success ? 'success' : 'failed'
        todayLog.message = result.message
        
        await user.save()
        processed++
      }
    }
    
    return NextResponse.json({
      message: `Checked ${users.length} users, processed ${processed} attendance actions`,
      currentTime: now.toISOString(),
      dayOfWeek,
    })
  } catch (error: any) {
    console.error('Check attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to check attendance' },
      { status: 500 }
    )
  }
}