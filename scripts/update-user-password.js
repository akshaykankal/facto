const { MongoClient } = require('mongodb');
const crypto = require('crypto');

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

async function updateUserPassword(username, password) {
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
    
    // Find user
    const user = await usersCollection.findOne({ username });
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log(`Found user: ${user.username}`);
    console.log(`Current encrypted password: ${user.factohrPassword}`);
    
    // Encrypt the password
    const encryptedPassword = encrypt(password);
    console.log(`New encrypted password: ${encryptedPassword}`);
    
    // Update in database
    const result = await usersCollection.updateOne(
      { username },
      { $set: { factohrPassword: encryptedPassword } }
    );
    
    console.log('Password updated successfully!');
    console.log('Modified count:', result.modifiedCount);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: node update-user-password.js <username> <password>');
  console.log('Example: node update-user-password.js 105928 mypassword');
  process.exit(1);
}

const [username, password] = args;
updateUserPassword(username, password);