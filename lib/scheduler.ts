import * as cron from 'node-cron'
import dbConnect from './mongodb'
import User, { IUser } from '@/models/User'
import { processAttendance } from './factohr'

export class AttendanceScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map()

  private getRandomMinutes(baseMinutes: number, randomRange: number): number {
    const randomOffset = Math.floor(Math.random() * (randomRange * 2 + 1)) - randomRange
    return baseMinutes + randomOffset
  }

  private getCronExpression(time: string, randomMinutes: number): string {
    const [hours, minutes] = time.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    const adjustedMinutes = this.getRandomMinutes(totalMinutes, randomMinutes)
    
    const finalHours = Math.floor(adjustedMinutes / 60)
    const finalMinutes = adjustedMinutes % 60

    return `${finalMinutes} ${finalHours} * * *`
  }

  async scheduleUserAttendance(user: IUser) {
    const userId = (user._id as any).toString()
    
    // Clear existing tasks for this user
    this.clearUserTasks(userId)

    const { preferences } = user
    const { punchInTime, punchOutTime, randomMinutes, workingDays, leaveDates } = preferences

    // Schedule punch in
    const punchInCron = this.getCronExpression(punchInTime, randomMinutes)
    const punchInTask = cron.schedule(punchInCron, async () => {
      await this.processUserAttendance(userId, 'punchIn')
    })
    this.tasks.set(`${userId}-punchIn`, punchInTask)

    // Schedule punch out
    const punchOutCron = this.getCronExpression(punchOutTime, randomMinutes)
    const punchOutTask = cron.schedule(punchOutCron, async () => {
      await this.processUserAttendance(userId, 'punchOut')
    })
    this.tasks.set(`${userId}-punchOut`, punchOutTask)
  }

  private async processUserAttendance(userId: string, action: 'punchIn' | 'punchOut') {
    try {
      await dbConnect()
      const user = await User.findById(userId)
      
      if (!user) {
        console.error(`User ${userId} not found`)
        return
      }

      const today = new Date()
      const dayOfWeek = today.getDay()

      // Check if today is a working day
      if (!user.preferences.workingDays.includes(dayOfWeek)) {
        console.log(`Skipping attendance for ${user.username} - not a working day`)
        return
      }

      // Check if today is a leave day
      const todayString = today.toISOString().split('T')[0]
      const isLeaveDay = user.preferences.leaveDates.some(
        (leaveDate: any) => new Date(leaveDate).toISOString().split('T')[0] === todayString
      )

      if (isLeaveDay) {
        console.log(`Skipping attendance for ${user.username} - on leave`)
        // Log as leave
        const existingLog = user.attendanceLogs.find(
          (log: any) => log.date.toDateString() === today.toDateString()
        )

        if (!existingLog) {
          user.attendanceLogs.push({
            date: today,
            punchIn: null,
            punchOut: null,
            status: 'leave',
            message: 'User on leave',
          })
          await user.save()
        }
        return
      }

      // Process attendance
      console.log(`Processing ${action} for ${user.username}`)
      const result = await processAttendance(
        user.factohrUsername,
        user.getDecryptedFactohrPassword(),
        action
      )

      // Log the attendance
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
      console.log(`${action} completed for ${user.username}: ${result.message}`)
    } catch (error) {
      console.error(`Error processing attendance for user ${userId}:`, error)
    }
  }

  clearUserTasks(userId: string) {
    const punchInTask = this.tasks.get(`${userId}-punchIn`)
    const punchOutTask = this.tasks.get(`${userId}-punchOut`)

    if (punchInTask) {
      punchInTask.stop()
      this.tasks.delete(`${userId}-punchIn`)
    }

    if (punchOutTask) {
      punchOutTask.stop()
      this.tasks.delete(`${userId}-punchOut`)
    }
  }

  async initializeAllSchedules() {
    try {
      await dbConnect()
      const users = await User.find({})
      
      for (const user of users) {
        await this.scheduleUserAttendance(user)
      }

      console.log(`Initialized schedules for ${users.length} users`)
    } catch (error) {
      console.error('Error initializing schedules:', error)
    }
  }

  stopAll() {
    for (const [, task] of this.tasks) {
      task.stop()
    }
    this.tasks.clear()
  }
}

// Global scheduler instance
export const scheduler = new AttendanceScheduler()