// Script to re-encrypt passwords with the correct encryption key
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Encryption functions
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
  return crypto.createHash('sha256').update(key).digest();
};

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

async function fixPasswordEncryption() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db('FACTOHR');
    const usersCollection = db.collection('users');
    
    // Get the user
    const user = await usersCollection.findOne({ username: '105928' });
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log(`Found user: ${user.username}`);
    console.log(`FactoHR Username: ${user.factohrUsername}`);
    console.log(`Current encrypted password length: ${user.factohrPassword?.length}`);
    
    // Since we can't decrypt the old password, we need to ask for it
    console.log('\nThe password cannot be decrypted with the current key.');
    console.log('Please enter the FactoHR password for user 105928:');
    
    rl.question('FactoHR Password: ', async (password) => {
      if (!password) {
        console.log('No password entered. Exiting.');
        rl.close();
        await client.close();
        return;
      }
      
      // Encrypt with the correct key
      const encryptedPassword = encrypt(password);
      
      // Update the user
      const result = await usersCollection.updateOne(
        { _id: user._id },
        { $set: { factohrPassword: encryptedPassword } }
      );
      
      if (result.modifiedCount > 0) {
        console.log('\n✅ Password re-encrypted successfully!');
        console.log('New encrypted password length:', encryptedPassword.length);
        
        // Test decryption
        const decrypt = (text) => {
          try {
            const parts = text.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedText = Buffer.from(parts[1], 'hex');
            const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            return decrypted.toString();
          } catch (error) {
            return null;
          }
        };
        
        const testDecrypt = decrypt(encryptedPassword);
        if (testDecrypt === password) {
          console.log('✅ Decryption test passed!');
        } else {
          console.log('❌ Decryption test failed!');
        }
      } else {
        console.log('❌ Failed to update password');
      }
      
      rl.close();
      await client.close();
    });
    
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    await client.close();
  }
}

fixPasswordEncryption();