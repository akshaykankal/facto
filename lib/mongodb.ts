import mongoose from 'mongoose'

let cached = global as any

if (!cached.mongoose) {
  cached.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  // Check environment variables at runtime, not at module import time
  // This prevents build failures when env vars aren't available during Next.js build
  const MONGODB_URI = process.env.MONGODB_URI
  const DB_NAME = process.env.DB_NAME

  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable')
  }

  if (!DB_NAME) {
    throw new Error('Please define the DB_NAME environment variable')
  }

  if (cached.mongoose.conn) {
    return cached.mongoose.conn
  }

  if (!cached.mongoose.promise) {
    const opts = {
      dbName: DB_NAME,
      bufferCommands: false,
    }

    cached.mongoose.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }

  try {
    cached.mongoose.conn = await cached.mongoose.promise
  } catch (e) {
    cached.mongoose.promise = null
    throw e
  }

  return cached.mongoose.conn
}

export default dbConnect