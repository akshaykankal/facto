// Content script to capture auth token from the dashboard

// Check if we're on the dashboard or login page
if (window.location.pathname.includes('/dashboard') || window.location.pathname.includes('/login')) {
  // Try to capture token from localStorage
  const token = localStorage.getItem('token');
  
  if (token) {
    // Send token to background script
    chrome.runtime.sendMessage({ 
      action: 'setToken', 
      token: token 
    }, (response) => {
      console.log('Token saved to extension');
    });
  }
  
  // Listen for storage changes
  window.addEventListener('storage', (e) => {
    if (e.key === 'token' && e.newValue) {
      chrome.runtime.sendMessage({ 
        action: 'setToken', 
        token: e.newValue 
      });
    }
  });
}