// Script to copy users from FACTOHR\n to FACTOHR database
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function fixDatabaseName() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    // Source database (with newline)
    const sourceDb = client.db('FACTOHR\n');
    const sourceUsers = sourceDb.collection('users');
    
    // Target database (clean name)
    const targetDb = client.db('FACTOHR');
    const targetUsers = targetDb.collection('users');
    
    // Count users in both
    const sourceCount = await sourceUsers.countDocuments();
    const targetCount = await targetUsers.countDocuments();
    
    console.log(`Users in 'FACTOHR\\n': ${sourceCount}`);
    console.log(`Users in 'FACTOHR': ${targetCount}`);
    
    if (sourceCount > 0 && targetCount === 0) {
      console.log('\nCopying users to clean database name...');
      
      // Get all users from source
      const users = await sourceUsers.find({}).toArray();
      
      // Insert into target
      const result = await targetUsers.insertMany(users);
      console.log(`✅ Copied ${result.insertedCount} users to FACTOHR database`);
      
      // Verify
      const newCount = await targetUsers.countDocuments();
      console.log(`Verification: ${newCount} users now in FACTOHR`);
    } else if (targetCount > 0) {
      console.log('\n✅ Users already exist in clean database');
    } else {
      console.log('\n⚠️  No users found in source database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Only run if called directly
if (require.main === module) {
  fixDatabaseName();
}

module.exports = fixDatabaseName;