import { NextRequest, NextResponse } from 'next/server'
import { scheduler } from '@/lib/scheduler'

// Initialize scheduler on first API call
let isInitialized = false

export async function GET(request: NextRequest) {
  try {
    if (!isInitialized) {
      await scheduler.initializeAllSchedules()
      isInitialized = true
    }

    return NextResponse.json({
      message: 'Scheduler is running',
      initialized: isInitialized,
    })
  } catch (error: any) {
    console.error('Scheduler error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize scheduler' },
      { status: 500 }
    )
  }
}