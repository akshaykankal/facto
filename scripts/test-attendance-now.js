// Test attendance marking right now (override time checks for testing)
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function testAttendanceNow() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    const db = client.db('FACTOHR\n');
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ username: '105928' });
    
    if (!user) {
      console.log('User not found!');
      return;
    }
    
    console.log(`Found user: ${user.username}`);
    console.log(`FactoHR Username: ${user.factohrUsername}`);
    console.log(`Preferences:`, user.preferences);
    
    // Check if password needs to be re-encrypted
    console.log('\nPassword status:');
    console.log('- Has password:', !!user.factohrPassword);
    console.log('- Password length:', user.factohrPassword?.length);
    console.log('- Looks encrypted:', user.factohrPassword?.includes(':'));
    
    // Show attendance logs
    console.log('\nAttendance History:');
    if (user.attendanceLogs && user.attendanceLogs.length > 0) {
      user.attendanceLogs.forEach((log, index) => {
        console.log(`\nLog ${index + 1}:`);
        console.log(`- Date: ${new Date(log.date).toLocaleDateString()}`);
        console.log(`- Punch In: ${log.punchIn ? new Date(log.punchIn).toLocaleTimeString() : 'Not punched'}`);
        console.log(`- Punch Out: ${log.punchOut ? new Date(log.punchOut).toLocaleTimeString() : 'Not punched'}`);
        console.log(`- Status: ${log.status}`);
        console.log(`- Message: ${log.message}`);
      });
    } else {
      console.log('No attendance logs found');
    }
    
    // For GitHub Actions to work on Monday-Friday
    console.log('\n✅ Database connection successful!');
    console.log('📍 Database name with newline issue: "FACTOHR\\n"');
    console.log('🔧 Update your GitHub secrets:');
    console.log('   DB_NAME should be: FACTOHR\\n');
    console.log('   Or fix in the script to handle this automatically');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testAttendanceNow();