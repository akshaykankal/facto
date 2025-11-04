#!/usr/bin/env node

/**
 * Decryption Diagnostic Script
 *
 * This script helps diagnose decryption issues by:
 * 1. Connecting to MongoDB
 * 2. Fetching user data with encrypted passwords
 * 3. Attempting decryption with detailed error reporting
 * 4. Identifying root causes (wrong key, corrupted data, format issues)
 */

const mongoose = require('mongoose')
const crypto = require('crypto')
require('dotenv').config({ path: '.env.local' })

// Encryption configuration (must match lib/crypto.ts)
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
  return crypto.createHash('sha256').update(key).digest()
}

const IV_LENGTH = 16

const decrypt = (text) => {
  try {
    console.log('\n🔍 Attempting decryption...')
    console.log(`   Input: ${text}`)
    console.log(`   Input length: ${text.length}`)

    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid encrypted text: must be a non-empty string')
    }

    // Split and validate format
    const parts = text.split(':')
    console.log(`   Parts found: ${parts.length}`)

    if (parts.length !== 2) {
      throw new Error(`Invalid encrypted format: expected 'iv:encryptedText', got ${parts.length} parts`)
    }

    const [ivHex, encryptedTextHex] = parts
    console.log(`   IV hex: ${ivHex} (${ivHex.length} chars)`)
    console.log(`   Encrypted hex: ${encryptedTextHex.substring(0, 32)}... (${encryptedTextHex.length} chars)`)

    // Validate hex strings
    if (!ivHex || !encryptedTextHex) {
      throw new Error('Invalid encrypted format: IV or encrypted text is empty')
    }

    const hexRegex = /^[0-9a-fA-F]+$/
    if (!hexRegex.test(ivHex)) {
      throw new Error('Invalid IV format: not a valid hex string')
    }
    if (!hexRegex.test(encryptedTextHex)) {
      throw new Error('Invalid encrypted text format: not a valid hex string')
    }

    // Convert to buffers
    const iv = Buffer.from(ivHex, 'hex')
    const encryptedText = Buffer.from(encryptedTextHex, 'hex')

    console.log(`   IV buffer length: ${iv.length} bytes`)
    console.log(`   Encrypted buffer length: ${encryptedText.length} bytes`)

    // Validate IV length
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length} bytes`)
    }

    // Attempt decryption
    const key = getEncryptionKey()
    console.log(`   Key length: ${key.length} bytes`)

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    const result = decrypted.toString()
    console.log(`   ✅ Decryption successful!`)
    console.log(`   Decrypted text length: ${result.length} chars`)

    return result
  } catch (error) {
    console.error('\n   ❌ Decryption failed:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      library: error.library
    })
    throw error
  }
}

// User schema (minimal version for testing)
const UserSchema = new mongoose.Schema({
  email: String,
  factohrUsername: String,
  factohrPassword: String,
  createdAt: Date
})

const User = mongoose.models.User || mongoose.model('User', UserSchema)

async function main() {
  try {
    console.log('🔐 FactoHR Decryption Diagnostic Tool\n')
    console.log('=' .repeat(60))

    // Check environment
    console.log('\n📋 Environment Configuration:')
    console.log(`   MONGODB_URI: ${process.env.MONGODB_URI ? '✓ Set' : '✗ Not set'}`)
    console.log(`   ENCRYPTION_KEY: ${process.env.ENCRYPTION_KEY ? '✓ Set (custom)' : '⚠ Using default'}`)

    if (!process.env.ENCRYPTION_KEY) {
      console.log('\n   ⚠️  WARNING: Using default encryption key!')
      console.log('   This should only be used for development.')
    }

    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('   ✅ Connected successfully')

    // Fetch users
    console.log('\n👤 Fetching users with encrypted passwords...')
    const users = await User.find({ factohrPassword: { $exists: true, $ne: '' } })
    console.log(`   Found ${users.length} user(s)`)

    if (users.length === 0) {
      console.log('\n   ℹ️  No users found with encrypted passwords.')
      console.log('   Please create a user first using the application.')
      return
    }

    // Test decryption for each user
    console.log('\n' + '=' .repeat(60))
    let successCount = 0
    let failCount = 0

    for (const user of users) {
      console.log(`\n📧 User: ${user.email}`)
      console.log(`   Username: ${user.factohrUsername}`)
      console.log(`   Encrypted password stored: ${user.factohrPassword.substring(0, 50)}...`)

      try {
        const decrypted = decrypt(user.factohrPassword)
        console.log(`   ✅ Password decrypted successfully (length: ${decrypted.length})`)
        successCount++
      } catch (error) {
        console.log(`   ❌ Decryption failed for this user`)
        failCount++

        // Provide diagnostic guidance
        console.log('\n   🔧 Diagnostic Suggestions:')
        if (error.code === 'ERR_OSSL_BAD_DECRYPT') {
          console.log('   1. The ENCRYPTION_KEY may have changed since this password was encrypted')
          console.log('   2. The encrypted data may be corrupted')
          console.log('   3. The password may have been encrypted with a different algorithm')
          console.log('\n   💡 Solution: Ask the user to update their FactoHR password in preferences')
        } else if (error.message.includes('Invalid encrypted format')) {
          console.log('   1. The password was not properly encrypted during storage')
          console.log('   2. The data format in the database is incorrect')
          console.log('\n   💡 Solution: Re-save the password through the preferences API')
        }
      }
    }

    // Summary
    console.log('\n' + '=' .repeat(60))
    console.log('\n📊 Summary:')
    console.log(`   Total users tested: ${users.length}`)
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ❌ Failed: ${failCount}`)

    if (failCount > 0) {
      console.log('\n⚠️  Action Required:')
      console.log('   Users with failed decryption need to update their passwords.')
      console.log('   They can do this through: Settings → FactoHR Credentials')
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error)
  } finally {
    await mongoose.connection.close()
    console.log('\n🔌 MongoDB connection closed')
  }
}

// Run the script
main().catch(console.error)
