// Test the attendance logic with actual user data
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// Decryption function
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
  return crypto.createHash('sha256').update(key).digest();
};

const decrypt = (text) => {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    return text;
  }
};

async function testAttendanceLogic() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB\n');
    
    // Connect to the database with newline issue
    const db = client.db('FACTOHR\n');
    const usersCollection = db.collection('users');
    
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users\n`);
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const dayOfWeek = now.getDay();
    
    console.log(`Current time: ${now.toLocaleTimeString()}`);
    console.log(`Current time in minutes: ${currentTime}`);
    console.log(`Day of week: ${dayOfWeek} (0=Sunday, 6=Saturday)\n`);
    
    for (const user of users) {
      console.log(`\n👤 User: ${user.username}`);
      console.log(`FactoHR Username: ${user.factohrUsername}`);
      console.log(`Has encrypted password: ${!!user.factohrPassword}`);
      
      if (user.factohrPassword) {
        const decrypted = decrypt(user.factohrPassword);
        console.log(`Password decryption successful: ${decrypted !== user.factohrPassword}`);
      }
      
      console.log(`\nPreferences:`);
      console.log(`- Punch In: ${user.preferences.punchInTime}`);
      console.log(`- Punch Out: ${user.preferences.punchOutTime}`);
      console.log(`- Random Minutes: ${user.preferences.randomMinutes}`);
      console.log(`- Working Days: ${user.preferences.workingDays}`);
      console.log(`- Leave Dates: ${user.preferences.leaveDates?.length || 0}`);
      
      // Check punch in window
      const [punchInHour, punchInMinute] = user.preferences.punchInTime.split(':').map(Number);
      const punchInTimeMinutes = punchInHour * 60 + punchInMinute;
      const punchInWindow = user.preferences.randomMinutes || 25;
      
      console.log(`\nPunch In Window:`);
      console.log(`- Target time: ${user.preferences.punchInTime} (${punchInTimeMinutes} minutes)`);
      console.log(`- Window: ${punchInTimeMinutes - punchInWindow} to ${punchInTimeMinutes + punchInWindow}`);
      console.log(`- Current time in window: ${currentTime >= punchInTimeMinutes - punchInWindow && currentTime <= punchInTimeMinutes + punchInWindow}`);
      
      // Check punch out window
      const [punchOutHour, punchOutMinute] = user.preferences.punchOutTime.split(':').map(Number);
      const punchOutTimeMinutes = punchOutHour * 60 + punchOutMinute;
      
      console.log(`\nPunch Out Window:`);
      console.log(`- Target time: ${user.preferences.punchOutTime} (${punchOutTimeMinutes} minutes)`);
      console.log(`- Window: ${punchOutTimeMinutes - punchInWindow} to ${punchOutTimeMinutes + punchInWindow}`);
      console.log(`- Current time in window: ${currentTime >= punchOutTimeMinutes - punchInWindow && currentTime <= punchOutTimeMinutes + punchInWindow}`);
      
      // Check today's log
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const todayLog = user.attendanceLogs?.find(
        (log) => {
          const logDate = new Date(log.date);
          return logDate.toDateString() === todayStart.toDateString();
        }
      );
      
      console.log(`\nToday's attendance:`);
      if (todayLog) {
        console.log(`- Punched In: ${todayLog.punchIn ? new Date(todayLog.punchIn).toLocaleTimeString() : 'No'}`);
        console.log(`- Punched Out: ${todayLog.punchOut ? new Date(todayLog.punchOut).toLocaleTimeString() : 'No'}`);
        console.log(`- Status: ${todayLog.status}`);
      } else {
        console.log(`- No attendance record for today`);
      }
      
      console.log(`\nTotal attendance logs: ${user.attendanceLogs?.length || 0}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testAttendanceLogic();