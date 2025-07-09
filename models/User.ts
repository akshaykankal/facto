import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { encrypt, decrypt } from '../lib/crypto'

export interface IUser extends mongoose.Document {
  username: string
  password: string
  factohrUsername: string
  factohrPassword: string
  preferences: {
    punchInTime: string
    punchOutTime: string
    randomMinutes: number
    workingDays: number[]
    leaveDates: Date[]
  }
  attendanceLogs: {
    date: Date
    punchIn: Date | null
    punchOut: Date | null
    status: 'success' | 'failed' | 'leave'
    message?: string
  }[]
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
  getDecryptedFactohrPassword(): string
}

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  factohrUsername: {
    type: String,
    required: true,
  },
  factohrPassword: {
    type: String,
    required: true,
  },
  preferences: {
    punchInTime: {
      type: String,
      default: '09:00',
    },
    punchOutTime: {
      type: String,
      default: '18:00',
    },
    randomMinutes: {
      type: Number,
      default: 15,
      min: 0,
      max: 25,
    },
    workingDays: {
      type: [Number],
      default: [1, 2, 3, 4, 5],
    },
    leaveDates: [{
      type: Date,
    }],
  },
  attendanceLogs: [{
    date: {
      type: Date,
      required: true,
    },
    punchIn: Date,
    punchOut: Date,
    status: {
      type: String,
      enum: ['success', 'failed', 'leave'],
      required: true,
    },
    message: String,
  }],
}, {
  timestamps: true,
})

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

UserSchema.pre('save', async function(next) {
  if (!this.isModified('factohrPassword')) return next()
  
  try {
    // Encrypt the factohrPassword instead of hashing it
    this.factohrPassword = encrypt(this.factohrPassword)
    next()
  } catch (error: any) {
    next(error)
  }
})

UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

UserSchema.methods.getDecryptedFactohrPassword = function(): string {
  return decrypt(this.factohrPassword)
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema)