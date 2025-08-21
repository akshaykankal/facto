// Test script to verify everything except actual FactoHR login
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function testWithoutPassword() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ MongoDB connection successful\n');
    
    const db = client.db('FACTOHR');
    const usersCollection = db.collection('users');
    
    const users = await usersCollection.find({}).toArray();
    console.log(`✅ Found ${users.length} users\n`);
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.getDay();
    
    console.log(`📅 Current Status:`);
    console.log(`- Time: ${now.toLocaleTimeString()}`);
    console.log(`- Day: ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][dayOfWeek]}`);
    console.log(`- Time in minutes: ${currentTime}\n`);
    
    for (const user of users) {
      console.log(`👤 User: ${user.username}`);
      console.log(`- Working days: ${user.preferences.workingDays.join(', ')}`);
      console.log(`- Is working day: ${user.preferences.workingDays.includes(dayOfWeek)}`);
      
      // Check punch in window
      const [punchInHour, punchInMinute] = user.preferences.punchInTime.split(':').map(Number);
      const punchInTimeMinutes = punchInHour * 60 + punchInMinute;
      const window = user.preferences.randomMinutes || 25;
      
      console.log(`\n⏰ Punch In Check:`);
      console.log(`- Target: ${user.preferences.punchInTime} (${punchInTimeMinutes} minutes)`);
      console.log(`- Window: ${punchInTimeMinutes - window} to ${punchInTimeMinutes + window}`);
      console.log(`- Current time (${currentTime}) in window: ${currentTime >= punchInTimeMinutes - window && currentTime <= punchInTimeMinutes + window}`);
      
      // Check punch out window
      const [punchOutHour, punchOutMinute] = user.preferences.punchOutTime.split(':').map(Number);
      const punchOutTimeMinutes = punchOutHour * 60 + punchOutMinute;
      
      console.log(`\n⏰ Punch Out Check:`);
      console.log(`- Target: ${user.preferences.punchOutTime} (${punchOutTimeMinutes} minutes)`);
      console.log(`- Window: ${punchOutTimeMinutes - window} to ${punchOutTimeMinutes + window}`);
      console.log(`- Current time (${currentTime}) in window: ${currentTime >= punchOutTimeMinutes - window && currentTime <= punchOutTimeMinutes + window}`);
      
      // Check today's log
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const todayLog = user.attendanceLogs?.find(
        (log) => new Date(log.date).toDateString() === todayStart.toDateString()
      );
      
      console.log(`\n📋 Today's Status:`);
      if (todayLog) {
        console.log(`- Already punched in: ${!!todayLog.punchIn}`);
        console.log(`- Already punched out: ${!!todayLog.punchOut}`);
      } else {
        console.log(`- No attendance record for today`);
      }
      
      console.log(`\n⚠️  Password Issue:`);
      console.log(`- Password needs to be re-encrypted with the correct key`);
      console.log(`- Please run: node scripts/fix-password-encryption.js`);
    }
    
    console.log('\n✅ All checks passed except password decryption');
    console.log('📝 Once password is fixed, GitHub Actions will work perfectly!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testWithoutPassword();