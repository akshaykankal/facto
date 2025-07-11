// Test script to verify MongoDB connection and data
// Run this locally to test: node scripts/test-direct-connection.js

require('dotenv').config();
const { MongoClient } = require('mongodb');

async function testConnection() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || 'FACTOHR';
  
  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment variables');
    console.log('Please create a .env file with:');
    console.log('MONGODB_URI=your_mongodb_connection_string');
    console.log('DB_NAME=FACTOHR');
    console.log('ENCRYPTION_KEY=your_encryption_key');
    return;
  }
  
  const client = new MongoClient(uri);
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // Count users
    const userCount = await usersCollection.countDocuments();
    console.log(`\n📊 Found ${userCount} users in database`);
    
    // Get sample user (without sensitive data)
    const sampleUser = await usersCollection.findOne({}, {
      projection: {
        username: 1,
        preferences: 1,
        'attendanceLogs.date': 1,
        'attendanceLogs.status': 1
      }
    });
    
    if (sampleUser) {
      console.log('\n👤 Sample user structure:');
      console.log('Username:', sampleUser.username);
      console.log('Preferences:', JSON.stringify(sampleUser.preferences, null, 2));
      console.log('Recent logs:', sampleUser.attendanceLogs?.length || 0);
    }
    
    // Test time calculations
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    console.log(`\n🕐 Current time: ${now.toLocaleTimeString()}`);
    console.log(`Time in minutes: ${currentTime}`);
    console.log(`Day of week: ${now.getDay()} (0=Sunday, 6=Saturday)`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n👋 Connection closed');
  }
}

testConnection();