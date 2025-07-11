// Popup script for extension

const APP_URL = 'https://factohr-automation-cbondvr6j-akshaykankals-projects.vercel.app';

// Load current state
async function loadState() {
  const { enabled, authToken, lastCheck, lastResult } = await chrome.storage.local.get([
    'enabled', 'authToken', 'lastCheck', 'lastResult'
  ]);
  
  updateUI(enabled, authToken, lastCheck, lastResult);
}

// Update UI based on state
function updateUI(enabled, authToken, lastCheck, lastResult) {
  const statusEl = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const toggleBtn = document.getElementById('toggleBtn');
  const lastCheckEl = document.getElementById('lastCheck');
  
  if (!authToken) {
    statusEl.className = 'status inactive';
    statusText.textContent = 'Not logged in';
    toggleBtn.textContent = 'Login Required';
    toggleBtn.disabled = true;
  } else if (enabled) {
    statusEl.className = 'status active';
    statusText.textContent = 'Running';
    toggleBtn.textContent = 'Disable Extension';
    toggleBtn.disabled = false;
  } else {
    statusEl.className = 'status inactive';
    statusText.textContent = 'Disabled';
    toggleBtn.textContent = 'Enable Extension';
    toggleBtn.disabled = false;
  }
  
  if (lastCheck) {
    const date = new Date(lastCheck);
    lastCheckEl.innerHTML = `<strong>Last check:</strong> ${date.toLocaleString()}<br>
                            <strong>Result:</strong> ${lastResult || 'N/A'}`;
  }
}

// Toggle extension
document.getElementById('toggleBtn').addEventListener('click', async () => {
  const { enabled, authToken } = await chrome.storage.local.get(['enabled', 'authToken']);
  
  if (!authToken) {
    chrome.tabs.create({ url: `${APP_URL}/login` });
    return;
  }
  
  const newEnabled = !enabled;
  await chrome.storage.local.set({ enabled: newEnabled });
  
  if (newEnabled) {
    // Create alarm
    chrome.alarms.create('checkAttendance', { periodInMinutes: 15 });
  } else {
    // Clear alarm
    chrome.alarms.clear('checkAttendance');
  }
  
  loadState();
});

// Check now
document.getElementById('checkNowBtn').addEventListener('click', async () => {
  const btn = document.getElementById('checkNowBtn');
  btn.disabled = true;
  btn.textContent = 'Checking...';
  
  chrome.runtime.sendMessage({ action: 'checkNow' }, (response) => {
    btn.disabled = false;
    btn.textContent = 'Check Attendance Now';
    setTimeout(loadState, 1000);
  });
});

// Open dashboard
document.getElementById('openDashboardBtn').addEventListener('click', () => {
  chrome.tabs.create({ url: `${APP_URL}/dashboard` });
});

// Load state on popup open
loadState();

// Refresh state every 5 seconds
setInterval(loadState, 5000);