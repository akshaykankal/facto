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

const decrypt = (text) => {
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      return null;
    }
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

async function fixAllPasswords() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    // Handle database name with newline
    const adminDb = client.db('admin');
    const databases = await adminDb.admin().listDatabases();
    const dbName = (process.env.DB_NAME || 'FACTOHR').trim();
    let db = client.db(dbName);
    
    const dbList = databases.databases.map(d => d.name);
    if (!dbList.includes(dbName) && dbList.includes(dbName + '\n')) {
      console.log('Using database name with newline');
      db = client.db(dbName + '\n');
    }
    
    const usersCollection = db.collection('users');
    const users = await usersCollection.find({}).toArray();
    
    console.log(`Found ${users.length} users\n`);
    
    const usersNeedingFix = [];
    
    // Check each user's password
    for (const user of users) {
      if (!user.factohrPassword) {
        console.log(`❌ User ${user.username}: No password set`);
        continue;
      }
      
      const decrypted = decrypt(user.factohrPassword);
      if (!decrypted) {
        console.log(`❌ User ${user.username}: Cannot decrypt password`);
        usersNeedingFix.push(user);
      } else {
        console.log(`✅ User ${user.username}: Password OK`);
      }
    }
    
    if (usersNeedingFix.length === 0) {
      console.log('\nAll passwords are properly encrypted!');
      rl.close();
      await client.close();
      return;
    }
    
    console.log(`\n${usersNeedingFix.length} users need password fixes.`);
    console.log('Please enter the passwords for these users:\n');
    
    const passwords = {};
    
    // Function to ask for password
    const askPassword = (index) => {
      if (index >= usersNeedingFix.length) {
        // All passwords collected, now update
        updatePasswords();
        return;
      }
      
      const user = usersNeedingFix[index];
      rl.question(`Password for ${user.username} (${user.factohrUsername}): `, (password) => {
        if (password) {
          passwords[user.username] = password;
        }
        askPassword(index + 1);
      });
    };
    
    const updatePasswords = async () => {
      console.log('\nUpdating passwords...\n');
      
      for (const user of usersNeedingFix) {
        if (passwords[user.username]) {
          const encryptedPassword = encrypt(passwords[user.username]);
          const result = await usersCollection.updateOne(
            { _id: user._id },
            { 
              $set: { 
                factohrPassword: encryptedPassword 
              },
              $unset: {
                factohrPasswordBackup: "",
                factohrPasswordPlain: ""
              }
            }
          );
          
          if (result.modifiedCount > 0) {
            console.log(`✅ Updated password for ${user.username}`);
            
            // Test decryption
            const testDecrypt = decrypt(encryptedPassword);
            if (testDecrypt === passwords[user.username]) {
              console.log(`   ✅ Decryption test passed`);
            } else {
              console.log(`   ❌ Decryption test failed!`);
            }
          } else {
            console.log(`❌ Failed to update ${user.username}`);
          }
        } else {
          console.log(`⏭️  Skipped ${user.username} (no password provided)`);
        }
      }
      
      console.log('\nDone!');
      rl.close();
      await client.close();
    };
    
    askPassword(0);
    
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    await client.close();
  }
}

// Run with environment variables
console.log('Password Fix Script');
console.log('==================\n');
console.log('This script will check all users and fix any password encryption issues.\n');

fixAllPasswords();