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

    const user = await User.findById(payload.userId).select('preferences factohrUsername')
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      preferences: user.preferences,
      factohrUsername: user.factohrUsername
    })
  } catch (error: any) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: 'Failed to get preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromHeaders(request.headers.get('authorization'))
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = verifyToken(token)
    const body = await request.json()

    await dbConnect()

    // Find the user
    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update preferences (excluding factohrUsername and factohrPassword)
    const { factohrUsername, factohrPassword, ...preferences } = body
    user.preferences = preferences

    // Update FactoHR credentials if provided
    if (factohrUsername && factohrUsername.trim() !== '') {
      user.factohrUsername = factohrUsername.trim()
    }

    // Only update password if a new one is provided
    if (factohrPassword && factohrPassword.trim() !== '') {
      user.factohrPassword = factohrPassword.trim()
      // The pre-save hook will automatically encrypt this
    }

    // Save the user (this triggers pre-save hooks for encryption)
    await user.save()

    return NextResponse.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences,
      factohrUsername: user.factohrUsername
    })
  } catch (error: any) {
    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}