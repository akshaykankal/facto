import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { verifyToken, getTokenFromHeaders } from '@/lib/auth'
import { processAttendance } from '@/lib/factohr'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    const body = await request.json()
    const { action } = body // 'punchIn' or 'punchOut'

    if (!action || !['punchIn', 'punchOut'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be punchIn or punchOut' },
        { status: 400 }
      )
    }

    await dbConnect()

    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Process attendance
    const result = await processAttendance(
      user.factohrUsername,
      user.getDecryptedFactohrPassword(), // Decrypt the password
      action
    )

    // Log the attendance
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existingLog = user.attendanceLogs.find(
      (log: any) => log.date.toDateString() === today.toDateString()
    )

    if (existingLog) {
      if (action === 'punchIn') {
        existingLog.punchIn = result.timestamp || new Date()
      } else {
        existingLog.punchOut = result.timestamp || new Date()
      }
      existingLog.status = result.success ? 'success' : 'failed'
      existingLog.message = result.message
    } else {
      user.attendanceLogs.push({
        date: today,
        punchIn: action === 'punchIn' ? (result.timestamp || new Date()) : null,
        punchOut: action === 'punchOut' ? (result.timestamp || new Date()) : null,
        status: result.success ? 'success' : 'failed',
        message: result.message,
      })
    }

    await user.save()

    return NextResponse.json({
      success: result.success,
      message: result.message,
      action,
      timestamp: result.timestamp,
    })
  } catch (error: any) {
    console.error('Mark attendance error:', error)
    return NextResponse.json(
      { error: 'Failed to mark attendance' },
      { status: 500 }
    )
  }
}