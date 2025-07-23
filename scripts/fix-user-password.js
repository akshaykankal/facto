const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const readline = require('readline');

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

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function updateUserPassword() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // List all databases to handle the newline issue
    const adminDb = client.db('admin');
    const databases = await adminDb.admin().listDatabases();
    
    // Use clean database name - handle newline in database name
    const dbName = (process.env.DB_NAME || 'FACTOHR').trim();
    let db = client.db(dbName);
    
    // Check if we need to use the database with newline
    const dbList = databases.databases.map(d => d.name);
    if (!dbList.includes(dbName) && dbList.includes(dbName + '\n')) {
      console.log('Using database name with newline');
      db = client.db(dbName + '\n');
    }
    
    const usersCollection = db.collection('users');
    
    // Get username
    const username = await new Promise((resolve) => {
      rl.question('Enter username (105928): ', (answer) => {
        resolve(answer || '105928');
      });
    });
    
    // Find user
    const user = await usersCollection.findOne({ username });
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log(`Found user: ${user.username}`);
    console.log(`Current encrypted password: ${user.factohrPassword}`);
    
    // Get new password
    const password = await new Promise((resolve) => {
      rl.question('Enter new FactoHR password: ', (answer) => {
        resolve(answer);
      });
    });
    
    if (!password) {
      console.log('Password cannot be empty!');
      return;
    }
    
    // Encrypt the password
    const encryptedPassword = encrypt(password);
    console.log(`New encrypted password: ${encryptedPassword}`);
    
    // Update in database
    const result = await usersCollection.updateOne(
      { username },
      { $set: { factohrPassword: encryptedPassword } }
    );
    
    console.log('Password updated successfully!');
    console.log('Update result:', result);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    rl.close();
    await client.close();
  }
}

// Run the update
updateUserPassword();