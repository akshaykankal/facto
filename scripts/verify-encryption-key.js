#!/usr/bin/env node

/**
 * Encryption Key Verification Script
 *
 * This script helps verify if the ENCRYPTION_KEY can decrypt existing passwords.
 * Use this to diagnose encryption key mismatches between environments.
 */

const crypto = require('crypto')
const { MongoClient } = require('mongodb')

// Get encryption key from command line or environment
const keyArg = process.argv[2]
const encryptionKey = keyArg || process.env.ENCRYPTION_KEY

if (!encryptionKey) {
  console.error('❌ ERROR: No encryption key provided')
  console.error('')
  console.error('Usage:')
  console.error('  node scripts/verify-encryption-key.js <your-encryption-key>')
  console.error('  OR')
  console.error('  ENCRYPTION_KEY=<key> node scripts/verify-encryption-key.js')
  console.error('')
  console.error('Example:')
  console.error('  node scripts/verify-encryption-key.js "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"')
  process.exit(1)
}

// Encryption functions
const getEncryptionKey = (key) => {
  return crypto.createHash('sha256').update(key).digest()
}

const decrypt = (text, key) => {
  try {
    const parts = text.split(':')
    if (parts.length !== 2) {
      throw new Error(`Invalid encrypted format: expected 'iv:encryptedText', got ${parts.length} parts`)
    }

    const [ivHex, encryptedTextHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const encryptedText = Buffer.from(encryptedTextHex, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(key), iv)
    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString()
  } catch (error) {
    return null // Return null instead of throwing
  }
}

async function verifyKey() {
  console.log('🔐 Encryption Key Verification Tool\n')
  console.log('=' .repeat(70))

  // Show key hash (for comparison without revealing the actual key)
  const keyHash = crypto.createHash('sha256').update(encryptionKey).digest('hex')
  console.log('\n📊 Encryption Key Information:')
  console.log(`   Key length: ${encryptionKey.length} characters`)
  console.log(`   Key SHA-256 hash: ${keyHash.substring(0, 16)}...${keyHash.substring(keyHash.length - 16)}`)

  // If MongoDB connection details are available, test with real data
  const mongoUri = process.env.MONGODB_URI
  const dbName = process.env.DB_NAME

  if (!mongoUri) {
    console.log('\n⚠️  MONGODB_URI not set - cannot test with database')
    console.log('   Set MONGODB_URI to test decryption with real data')
    console.log('')
    console.log('Usage:')
    console.log('  MONGODB_URI=<uri> DB_NAME=<db> node scripts/verify-encryption-key.js <key>')
    return
  }

  console.log('\n🔌 Connecting to MongoDB...')
  const client = new MongoClient(mongoUri)

  try {
    await client.connect()
    console.log('   ✅ Connected successfully')

    const db = client.db(dbName || 'FACTOHR')
    const users = await db.collection('users').find({}).toArray()

    console.log(`\n👤 Found ${users.length} user(s)\n`)
    console.log('=' .repeat(70))

    let successCount = 0
    let failCount = 0

    for (const user of users) {
      console.log(`\n📧 User: ${user.username || user._id}`)
      console.log(`   FactoHR Username: ${user.factohrUsername}`)

      if (!user.factohrPassword) {
        console.log('   ⚠️  No encrypted password found')
        continue
      }

      console.log(`   Encrypted password: ${user.factohrPassword.substring(0, 40)}...`)

      // Try to decrypt
      const decrypted = decrypt(user.factohrPassword, encryptionKey)

      if (decrypted) {
        console.log('   ✅ Decryption SUCCESSFUL')
        console.log(`   Decrypted password length: ${decrypted.length} characters`)
        successCount++
      } else {
        console.log('   ❌ Decryption FAILED')
        console.log('   This encryption key cannot decrypt this password')
        failCount++
      }
    }

    console.log('\n' + '=' .repeat(70))
    console.log('\n📊 Summary:')
    console.log(`   Total users: ${users.length}`)
    console.log(`   ✅ Successful decryptions: ${successCount}`)
    console.log(`   ❌ Failed decryptions: ${failCount}`)

    if (failCount > 0) {
      console.log('\n⚠️  ENCRYPTION KEY MISMATCH DETECTED!')
      console.log('')
      console.log('The encryption key you provided cannot decrypt the passwords in the database.')
      console.log('This means:')
      console.log('  1. The passwords were encrypted with a DIFFERENT key')
      console.log('  2. You need to use the ORIGINAL encryption key')
      console.log('  3. OR update all user passwords through the application UI')
      console.log('')
      console.log('Solutions:')
      console.log('  A. Find the correct ENCRYPTION_KEY and update GitHub Actions secret')
      console.log('  B. Have users update their passwords in Settings → FactoHR Credentials')
    } else if (successCount > 0) {
      console.log('\n✅ ENCRYPTION KEY IS CORRECT!')
      console.log('')
      console.log('This encryption key successfully decrypts all passwords.')
      console.log('Update your GitHub Actions secret with this key:')
      console.log('')
      console.log('Steps:')
      console.log('  1. Go to: GitHub Repository → Settings → Secrets and variables → Actions')
      console.log('  2. Find or create secret: ENCRYPTION_KEY')
      console.log('  3. Set value to: (the key you just tested)')
      console.log('  4. Save the secret')
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    await client.close()
    console.log('\n🔌 MongoDB connection closed\n')
  }
}

// Handle environment loading
if (process.argv.includes('--env')) {
  require('dotenv').config({ path: '.env.local' })
}

verifyKey().catch(console.error)
