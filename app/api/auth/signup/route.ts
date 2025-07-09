import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const { username, password, factohrUsername, factohrPassword } = body

    if (!username || !password || !factohrUsername || !factohrPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    const existingUser = await User.findOne({ username })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 400 }
      )
    }

    const user = await User.create({
      username,
      password,
      factohrUsername,
      factohrPassword,
    })

    const token = generateToken(user)

    return NextResponse.json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
      },
    })
  } catch (error: any) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}