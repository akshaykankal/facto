// Direct attendance check script that runs in GitHub Actions
// Connects directly to MongoDB and FactoHR, bypassing Vercel

const { MongoClient } = require('mongodb');
const axios = require('axios');
const crypto = require('crypto');

// Encryption/Decryption functions (same as in your app)
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
  return crypto.createHash('sha256').update(key).digest();
};

const decrypt = (text) => {
  try {
    const parts = text.split(':');
    if (parts.length !== 2) {
      console.error('Invalid encrypted format - expected format: iv:encryptedText');
      return text;
    }
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error);
    throw error; // Re-throw to handle at call site
  }
};

// FactoHR login and attendance functions
async function loginToFactoHR(username, password) {
  try {
    // First, get the login page to extract verification token
    const loginPageResponse = await axios.get('https://app.factohr.com/broseindia/Security/Login');
    const loginPageHtml = loginPageResponse.data;
    
    // Extract verification token
    const tokenMatch = loginPageHtml.match(/name="__RequestVerificationToken".*?value="([^"]+)"/);
    if (!tokenMatch) {
      throw new Error('Could not find verification token');
    }
    const verificationToken = tokenMatch[1];
    
    // Login to FactoHR
    const params = new URLSearchParams({
      __RequestVerificationToken: verificationToken,
      UserName: username,
      Password: password,
      RememberMe: 'false',
    });
    
    const loginResponse = await axios.post(
      'https://app.factohr.com/API/ACL/ValidateLoginCreadentials',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
          'Cookie': loginPageResponse.headers['set-cookie']?.join('; ') || '',
        },
        maxRedirects: 0,
        validateStatus: (status) => status < 400,
      }
    );
    
    if (loginResponse.data.Status === 'Success' || loginResponse.data.RedirectUrl) {
      console.log(`Successfully logged in for user: ${username}`);
      return {
        success: true,
        cookies: loginResponse.headers['set-cookie'] || [],
      };
    } else {
      throw new Error(loginResponse.data.Message || 'Login failed');
    }
  } catch (error) {
    console.error(`Login failed for ${username}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function markAttendance(cookies, action) {
  try {
    const endpoint = action === 'punchIn' 
      ? 'https://app.factohr.com/broseindia/Attendance/PunchIn'
      : 'https://app.factohr.com/broseindia/Attendance/PunchOut';
    
    const response = await axios.post(
      endpoint,
      {},
      {
        headers: {
          'Cookie': cookies.join('; '),
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://app.factohr.com/broseindia/',
        },
      }
    );
    
    console.log(`${action} successful:`, response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`${action} failed:`, error.message);
    return { success: false, error: error.message };
  }
}

// Main function
async function checkAndMarkAttendance() {
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    // List all databases
    const adminDb = client.db('admin');
    const databases = await adminDb.admin().listDatabases();
    console.log('Available databases:', databases.databases.map(d => d.name));
    
    // Use clean database name - handle newline in database name
    const dbName = (process.env.DB_NAME || 'FACTOHR').trim();
    // If the database doesn't exist as-is, try with newline
    let db = client.db(dbName);
    
    // Check if we need to use the database with newline
    const dbList = databases.databases.map(d => d.name);
    if (!dbList.includes(dbName) && dbList.includes(dbName + '\n')) {
      console.log('Using database name with newline');
      db = client.db(dbName + '\n');
    }
    const usersCollection = db.collection('users');
    
    // Use Indian timezone
    const now = new Date();
    // Get the timezone offset for Asia/Kolkata (IST is UTC+5:30)
    const istOffset = 5.5 * 60; // 5.5 hours in minutes
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const indianTime = new Date(utcTime + (istOffset * 60000));
    
    const currentTime = indianTime.getHours() * 60 + indianTime.getMinutes();
    const dayOfWeek = indianTime.getDay();
    
    console.log(`Checking attendance at ${now.toISOString()} (UTC)`);
    console.log(`Indian time: ${indianTime.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata'})} (Day: ${dayOfWeek})`);
    console.log(`Current time in minutes: ${currentTime} (${Math.floor(currentTime/60)}:${currentTime%60})`);
    
    // Get all users
    console.log('Database name:', db.databaseName);
    console.log('Collection name:', usersCollection.collectionName);
    const users = await usersCollection.find({}).toArray();
    console.log(`Found ${users.length} users`);
    if (users.length === 0) {
      // Try to list all collections
      const collections = await db.listCollections().toArray();
      console.log('Available collections:', collections.map(c => c.name));
    }
    
    let processed = 0;
    
    for (const user of users) {
      const { preferences, factohrUsername, factohrPassword } = user;
      
      // Skip if not a working day
      if (!preferences.workingDays.includes(dayOfWeek)) {
        console.log(`Skipping ${user.username} - not a working day`);
        continue;
      }
      
      // Check if today is a leave day (using Indian date)
      const todayString = indianTime.toISOString().split('T')[0];
      const isLeaveDay = preferences.leaveDates.some(
        (leaveDate) => new Date(leaveDate).toISOString().split('T')[0] === todayString
      );
      
      if (isLeaveDay) {
        console.log(`Skipping ${user.username} - on leave today`);
        continue;
      }
      
      // Check if user has already punched in/out today (using Indian date)
      const todayStart = new Date(indianTime);
      todayStart.setHours(0, 0, 0, 0);
      
      const todayLog = user.attendanceLogs?.find(
        (log) => {
          const logDate = new Date(log.date);
          // Compare dates in IST
          const logDateIST = new Date(logDate.getTime() + (5.5 * 60 * 60000));
          return logDateIST.toDateString() === todayStart.toDateString();
        }
      );
      
      // Decrypt FactoHR password
      console.log(`Processing user: ${user.username}`);
      if (!factohrPassword) {
        console.log(`Skipping ${user.username} - no FactoHR password set`);
        continue;
      }
      
      let decryptedPassword;
      try {
        decryptedPassword = decrypt(factohrPassword);
        if (decryptedPassword === factohrPassword) {
          console.log(`Warning: Password for ${user.username} might not be encrypted or decryption failed`);
        }
      } catch (error) {
        console.error(`Failed to decrypt password for ${user.username}:`, error.message);
        continue;
      }
      
      // Process punch in
      const [punchInHour, punchInMinute] = preferences.punchInTime.split(':').map(Number);
      const punchInTimeMinutes = punchInHour * 60 + punchInMinute;
      const punchInWindow = preferences.randomMinutes || 25;
      
      console.log(`User ${user.username} - Punch in time: ${preferences.punchInTime}, Current Indian time: ${Math.floor(currentTime/60)}:${String(currentTime%60).padStart(2, '0')}`);
      console.log(`Today's log:`, todayLog);
      console.log(`Punch in window: ${Math.floor((punchInTimeMinutes - punchInWindow)/60)}:${String((punchInTimeMinutes - punchInWindow)%60).padStart(2, '0')} - ${Math.floor((punchInTimeMinutes + punchInWindow)/60)}:${String((punchInTimeMinutes + punchInWindow)%60).padStart(2, '0')}`);
      
      // Force punch in if FORCE_PUNCH_IN env var is set (for testing)
      const forcePunchIn = process.env.FORCE_PUNCH_IN === 'true';
      
      if (!todayLog?.punchIn && 
          (forcePunchIn || (currentTime >= punchInTimeMinutes - punchInWindow && 
          currentTime <= punchInTimeMinutes + punchInWindow))) {
        
        console.log(`Processing punch in for ${user.username}`);
        
        // Login to FactoHR
        const loginResult = await loginToFactoHR(factohrUsername, decryptedPassword);
        
        if (loginResult.success) {
          // Mark attendance
          const attendanceResult = await markAttendance(loginResult.cookies, 'punchIn');
          
          // Update database
          if (todayLog) {
            await usersCollection.updateOne(
              { _id: user._id, 'attendanceLogs.date': todayStart },
              {
                $set: {
                  'attendanceLogs.$.punchIn': new Date(),
                  'attendanceLogs.$.status': attendanceResult.success ? 'success' : 'failed',
                  'attendanceLogs.$.message': attendanceResult.success ? 'Punched in successfully' : attendanceResult.error,
                }
              }
            );
          } else {
            await usersCollection.updateOne(
              { _id: user._id },
              {
                $push: {
                  attendanceLogs: {
                    date: todayStart,
                    punchIn: new Date(),
                    punchOut: null,
                    status: attendanceResult.success ? 'success' : 'failed',
                    message: attendanceResult.success ? 'Punched in successfully' : attendanceResult.error,
                  }
                }
              }
            );
          }
          
          processed++;
        }
      }
      
      // Process punch out
      const [punchOutHour, punchOutMinute] = preferences.punchOutTime.split(':').map(Number);
      const punchOutTimeMinutes = punchOutHour * 60 + punchOutMinute;
      const punchOutWindow = preferences.randomMinutes || 25;
      
      console.log(`Punch out window: ${Math.floor((punchOutTimeMinutes - punchOutWindow)/60)}:${String((punchOutTimeMinutes - punchOutWindow)%60).padStart(2, '0')} - ${Math.floor((punchOutTimeMinutes + punchOutWindow)/60)}:${String((punchOutTimeMinutes + punchOutWindow)%60).padStart(2, '0')}`);
      
      // Force punch out if FORCE_PUNCH_OUT env var is set (for testing)
      const forcePunchOut = process.env.FORCE_PUNCH_OUT === 'true';
      
      if (todayLog?.punchIn && !todayLog?.punchOut &&
          (forcePunchOut || (currentTime >= punchOutTimeMinutes - punchOutWindow && 
          currentTime <= punchOutTimeMinutes + punchOutWindow))) {
        
        console.log(`Processing punch out for ${user.username}`);
        
        // Login to FactoHR
        const loginResult = await loginToFactoHR(factohrUsername, decryptedPassword);
        
        if (loginResult.success) {
          // Mark attendance
          const attendanceResult = await markAttendance(loginResult.cookies, 'punchOut');
          
          // Update database
          await usersCollection.updateOne(
            { _id: user._id, 'attendanceLogs.date': todayStart },
            {
              $set: {
                'attendanceLogs.$.punchOut': new Date(),
                'attendanceLogs.$.status': attendanceResult.success ? 'success' : 'failed',
                'attendanceLogs.$.message': attendanceResult.success ? 'Punched out successfully' : attendanceResult.error,
              }
            }
          );
          
          processed++;
        }
      }
    }
    
    console.log(`Checked ${users.length} users, processed ${processed} attendance actions`);
    
  } catch (error) {
    console.error('Error in attendance check:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

// Run the check
checkAndMarkAttendance();