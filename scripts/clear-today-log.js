const { MongoClient } = require('mongodb');

async function clearTodayLog() {
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
    
    // Get Indian time for today
    const now = new Date();
    const istOffset = 5.5 * 60; // 5.5 hours in minutes
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const indianTime = new Date(utcTime + (istOffset * 60000));
    
    const todayStart = new Date(indianTime);
    todayStart.setHours(0, 0, 0, 0);
    
    console.log('Clearing attendance log for date:', todayStart.toISOString());
    
    // Remove today's attendance log from all users
    // Also check for the UTC date that might have been stored
    const utcTodayStart = new Date();
    utcTodayStart.setUTCHours(0, 0, 0, 0);
    
    console.log('Also checking for UTC date:', utcTodayStart.toISOString());
    
    // Just remove the specific log entry we saw
    const result = await usersCollection.updateMany(
      {},
      {
        $pull: {
          attendanceLogs: {
            date: new Date('2025-07-23T00:00:00.000Z')
          }
        }
      }
    );
    
    console.log('Modified users:', result.modifiedCount);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

clearTodayLog();