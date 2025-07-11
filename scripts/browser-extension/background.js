// Background service worker for FactoHR Auto Attendance

const APP_URL = 'https://factohr-automation-cbondvr6j-akshaykankals-projects.vercel.app';
const CRON_SECRET = 'your-cron-secret-change-in-production';

// Create alarm for every 15 minutes
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('checkAttendance', { periodInMinutes: 15 });
  console.log('FactoHR Auto Attendance extension installed');
});

// Listen for alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkAttendance') {
    await checkAttendance();
  }
});

// Check attendance function
async function checkAttendance() {
  try {
    // Get stored auth token
    const { authToken, enabled } = await chrome.storage.local.get(['authToken', 'enabled']);
    
    if (!enabled) {
      console.log('Extension is disabled');
      return;
    }
    
    if (!authToken) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-48.png',
        title: 'FactoHR Auto Attendance',
        message: 'Please login first by visiting the dashboard'
      });
      return;
    }
    
    console.log('Checking attendance...');
    
    const response = await fetch(`${APP_URL}/api/attendance/check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'x-cron-secret': CRON_SECRET
      }
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Save last check time
      await chrome.storage.local.set({ 
        lastCheck: new Date().toISOString(),
        lastResult: data.message 
      });
      
      // Show notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon-48.png',
        title: 'Attendance Checked',
        message: data.message || 'Attendance check completed successfully'
      });
    } else {
      throw new Error(data.error || 'Failed to check attendance');
    }
  } catch (error) {
    console.error('Error checking attendance:', error);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon-48.png',
      title: 'Attendance Check Failed',
      message: error.message
    });
  }
}

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkNow') {
    checkAttendance().then(() => sendResponse({ success: true }));
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'setToken') {
    chrome.storage.local.set({ authToken: request.token }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});