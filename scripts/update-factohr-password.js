// Alternative: Update password through the API
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

async function updatePassword() {
  console.log(`
  ⚠️  IMPORTANT: Password Encryption Issue
  
  The FactoHR password was encrypted with a different key and cannot be decrypted.
  
  To fix this, you need to:
  
  1. Login to your FactoHR dashboard at:
     https://factohr-automation-cbondvr6j-akshaykankals-projects.vercel.app/dashboard
  
  2. Go to Preferences/Settings
  
  3. Re-enter your FactoHR password
  
  4. Save the preferences
  
  This will re-encrypt the password with the correct key.
  
  Alternatively, run: node scripts/fix-password-encryption.js
  and enter the password manually.
  `);
  
  // Show current status
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  
  const db = client.db('FACTOHR');
  const user = await db.collection('users').findOne({ username: '105928' });
  
  console.log('\nCurrent user status:');
  console.log('- Username:', user.username);
  console.log('- FactoHR Username:', user.factohrUsername);
  console.log('- Has encrypted password:', !!user.factohrPassword);
  console.log('- Punch in time:', user.preferences.punchInTime);
  console.log('- Punch out time:', user.preferences.punchOutTime);
  
  await client.close();
}

updatePassword();