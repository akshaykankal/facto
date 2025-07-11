// Debug script to check MongoDB connection and data
const { MongoClient } = require('mongodb');

async function debugMongoDB() {
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('❌ MONGODB_URI not set!');
    return;
  }
  
  console.log('🔄 Connecting to MongoDB...');
  console.log('URI:', uri.replace(/:[^:]*@/, ':****@')); // Hide password
  
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected successfully!\n');
    
    // List all databases
    console.log('📂 Available databases:');
    const databases = await client.db().admin().listDatabases();
    databases.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Try different possible database names
    const possibleDbNames = ['FACTOHR', 'factohr', 'FactoHR', 'test', 'production'];
    
    for (const dbName of possibleDbNames) {
      console.log(`\n🔍 Checking database: ${dbName}`);
      const db = client.db(dbName);
      
      // List collections
      const collections = await db.listCollections().toArray();
      
      if (collections.length > 0) {
        console.log(`  Found ${collections.length} collections:`);
        
        for (const collection of collections) {
          console.log(`  - ${collection.name}`);
          
          // Count documents in each collection
          const count = await db.collection(collection.name).countDocuments();
          console.log(`    Documents: ${count}`);
          
          // If it looks like a users collection, show sample
          if (collection.name.toLowerCase().includes('user')) {
            const sample = await db.collection(collection.name).findOne({}, {
              projection: { 
                _id: 0, 
                username: 1, 
                factohrUsername: 1,
                createdAt: 1 
              }
            });
            if (sample) {
              console.log(`    Sample:`, JSON.stringify(sample, null, 2));
            }
          }
        }
      } else {
        console.log(`  No collections found`);
      }
    }
    
    // Check the specific collection
    console.log('\n🎯 Checking specific collection: users');
    const db = client.db(process.env.DB_NAME || 'FACTOHR');
    const usersCollection = db.collection('users');
    const userCount = await usersCollection.countDocuments();
    console.log(`Users in ${process.env.DB_NAME || 'FACTOHR'}.users: ${userCount}`);
    
    if (userCount === 0) {
      // Try different collection names
      const possibleCollectionNames = ['Users', 'user', 'User', 'accounts', 'Accounts'];
      for (const collName of possibleCollectionNames) {
        const count = await db.collection(collName).countDocuments();
        if (count > 0) {
          console.log(`Found ${count} documents in collection: ${collName}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await client.close();
    console.log('\n👋 Connection closed');
  }
}

// Run with environment variables
if (process.argv.includes('--github')) {
  // For GitHub Actions
  debugMongoDB();
} else {
  // For local testing
  require('dotenv').config({ path: '.env.local' });
  debugMongoDB();
}