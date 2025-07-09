#!/usr/bin/env node

/**
 * Migration script to re-encrypt FactoHR passwords
 * This script should be run if there are existing users with hashed FactoHR passwords
 * that need to be converted to encrypted passwords.
 * 
 * Usage: npm run migrate-passwords
 */

const mongoose = require('mongoose')
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

// Import the crypto functions
const crypto = require('crypto')

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
const IV_LENGTH = 16

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPTION_KEY, 'utf8'),
    iv
  )
  
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

async function migratePasswords() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables')
    }

    await mongoose.connect(mongoUri)
    console.log('Connected to MongoDB')

    // Get the User model
    const User = mongoose.model('User')

    // Find all users
    const users = await User.find({})
    console.log(`Found ${users.length} users to check`)

    let migratedCount = 0

    for (const user of users) {
      // Check if the password looks like a bcrypt hash (starts with $2a$ or $2b$)
      if (user.factohrPassword && user.factohrPassword.startsWith('$2')) {
        console.log(`User ${user.username} has a hashed FactoHR password - needs manual update`)
        console.log('Please have the user re-enter their FactoHR password')
        // Note: We cannot decrypt bcrypt hashes, so users will need to re-enter their passwords
      } else if (user.factohrPassword && !user.factohrPassword.includes(':')) {
        // If it doesn't contain a colon, it might be plain text that needs encryption
        console.log(`Encrypting password for user ${user.username}`)
        user.factohrPassword = encrypt(user.factohrPassword)
        await user.save()
        migratedCount++
      } else {
        console.log(`User ${user.username} already has encrypted password`)
      }
    }

    console.log(`\nMigration complete. Encrypted ${migratedCount} passwords.`)
    
    if (users.some(u => u.factohrPassword && u.factohrPassword.startsWith('$2'))) {
      console.log('\nWARNING: Some users have bcrypt-hashed FactoHR passwords.')
      console.log('These users will need to update their FactoHR password through the application.')
    }

    await mongoose.disconnect()
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
migratePasswords()