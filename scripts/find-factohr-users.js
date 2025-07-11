// Find FactoHR users across all databases and collections
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function findFactoHRUsers() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔍 Searching for FactoHR users...\n');
    
    // Get all databases
    const databases = await client.db().admin().listDatabases();
    
    for (const dbInfo of databases.databases) {
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();
      
      for (const collInfo of collections) {
        const collection = db.collection(collInfo.name);
        
        // Look for documents that have factohrUsername or preferences fields
        const factohrUsers = await collection.find({
          $or: [
            { factohrUsername: { $exists: true } },
            { 'preferences.punchInTime': { $exists: true } },
            { attendanceLogs: { $exists: true } }
          ]
        }).toArray();
        
        if (factohrUsers.length > 0) {
          console.log(`✅ Found ${factohrUsers.length} FactoHR users in ${dbInfo.name}.${collInfo.name}`);
          
          // Show sample user
          const user = factohrUsers[0];
          console.log('\nSample user:');
          console.log({
            database: dbInfo.name,
            collection: collInfo.name,
            username: user.username,
            factohrUsername: user.factohrUsername,
            hasPreferences: !!user.preferences,
            hasPunchInTime: !!user.preferences?.punchInTime,
            attendanceLogsCount: user.attendanceLogs?.length || 0
          });
        }
      }
    }
    
    // Also check if FACTOHR database is properly initialized
    console.log('\n📂 Checking FACTOHR database specifically:');
    const factohrDb = client.db('FACTOHR');
    const collections = await factohrDb.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('❌ FACTOHR database exists but has no collections');
      console.log('💡 Users will be created when you sign up through the app');
      
      // Try to create users collection
      console.log('\n🔧 Creating users collection in FACTOHR database...');
      await factohrDb.createCollection('users');
      console.log('✅ Created users collection');
    } else {
      console.log('Collections in FACTOHR:', collections.map(c => c.name));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

findFactoHRUsers();