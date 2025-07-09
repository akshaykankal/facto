import jwt from 'jsonwebtoken'
import { IUser } from '@/models/User'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export interface TokenPayload {
  userId: string
  username: string
}

export function generateToken(user: IUser): string {
  const payload: TokenPayload = {
    userId: (user._id as any).toString(),
    username: user.username,
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}

export function getTokenFromHeaders(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}