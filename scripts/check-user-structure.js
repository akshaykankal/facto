// Check the structure of users in the test database
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function checkUserStructure() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    // Connect to test database where users are
    const db = client.db('test');
    const usersCollection = db.collection('users');
    
    // Get all users and show their structure
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users in test.users\n`);
    
    // Show full structure of first user (excluding sensitive data)
    if (users.length > 0) {
      const user = users[0];
      console.log('User structure:');
      console.log('Fields:', Object.keys(user));
      console.log('\nSample user (sensitive data hidden):');
      console.log({
        _id: user._id,
        username: user.username,
        factohrUsername: user.factohrUsername,
        hasFactohrPassword: !!user.factohrPassword,
        preferences: user.preferences,
        attendanceLogsCount: user.attendanceLogs?.length || 0,
        createdAt: user.createdAt,
      });
      
      // Check if preferences have the expected structure
      if (user.preferences) {
        console.log('\nPreferences structure:');
        console.log(JSON.stringify(user.preferences, null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkUserStructure();