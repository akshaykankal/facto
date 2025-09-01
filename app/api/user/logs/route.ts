import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    await dbConnect()

    const user = await User.findById(payload.userId).select('attendanceLogs')
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get logs sorted by date (most recent first)
    const sortedLogs = user.attendanceLogs.sort((a: any, b: any) => 
      b.date.getTime() - a.date.getTime()
    ).slice(0, 30) // Last 30 days

    return NextResponse.json({ logs: sortedLogs })
  } catch (error: any) {
    console.error('Get logs error:', error)
    return NextResponse.json(
      { error: 'Failed to get attendance logs' },
      { status: 500 }
    )
  }
}