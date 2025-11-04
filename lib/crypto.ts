import crypto from 'crypto'

// Ensure the key is exactly 32 bytes for AES-256
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
  // Create a 32-byte key using SHA-256 hash
  return crypto.createHash('sha256').update(key).digest()
}

const IV_LENGTH = 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = getEncryptionKey()
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  
  let encrypted = cipher.update(text)
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  try {
    // Validate input
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid encrypted text: must be a non-empty string')
    }

    // Split and validate format (should be iv:encryptedText)
    const parts = text.split(':')
    if (parts.length !== 2) {
      throw new Error(`Invalid encrypted format: expected 'iv:encryptedText', got ${parts.length} parts`)
    }

    // Extract IV and encrypted text
    const [ivHex, encryptedTextHex] = parts

    // Validate hex strings
    if (!ivHex || !encryptedTextHex) {
      throw new Error('Invalid encrypted format: IV or encrypted text is empty')
    }

    // Validate hex format (should only contain hex characters)
    const hexRegex = /^[0-9a-fA-F]+$/
    if (!hexRegex.test(ivHex)) {
      throw new Error('Invalid IV format: not a valid hex string')
    }
    if (!hexRegex.test(encryptedTextHex)) {
      throw new Error('Invalid encrypted text format: not a valid hex string')
    }

    // Convert hex strings to buffers
    const iv = Buffer.from(ivHex, 'hex')
    const encryptedText = Buffer.from(encryptedTextHex, 'hex')

    // Validate IV length
    if (iv.length !== IV_LENGTH) {
      throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes, got ${iv.length} bytes`)
    }

    // Decrypt
    const key = getEncryptionKey()
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

    let decrypted = decipher.update(encryptedText)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString()
  } catch (error: any) {
    // Enhanced error logging
    console.error('Decryption error:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      library: error.library,
      inputLength: text?.length,
      inputPreview: text?.substring(0, 50) + '...'
    })

    // Re-throw with more context
    if (error.code === 'ERR_OSSL_BAD_DECRYPT') {
      throw new Error(`Decryption failed: The encryption key may be incorrect or the data may be corrupted. Original error: ${error.message}`)
    }

    throw error
  }
}