const axios = require('axios');
const fs = require('fs');

async function debugLogin() {
  try {
    // Get the login page
    const loginPageResponse = await axios.get('https://app.factohr.com/broseindia/Security/Login');
    const loginPageHtml = loginPageResponse.data;
    
    // Save HTML for inspection
    fs.writeFileSync('login-page.html', loginPageHtml);
    console.log('Saved login page HTML to login-page.html');
    
    // Find all occurrences of __RequestVerificationToken
    const tokenRegex = /__RequestVerificationToken[\s\S]{0,100}/g;
    const matches = loginPageHtml.match(tokenRegex);
    
    if (matches) {
      console.log('\nFound __RequestVerificationToken occurrences:');
      matches.forEach((match, index) => {
        console.log(`\n--- Match ${index + 1} ---`);
        console.log(match);
      });
    }
    
    // Try to find input fields
    const inputRegex = /<input[^>]*name=["']__RequestVerificationToken["'][^>]*>/g;
    const inputMatches = loginPageHtml.match(inputRegex);
    
    if (inputMatches) {
      console.log('\n\nFound input fields:');
      inputMatches.forEach((match, index) => {
        console.log(`\n--- Input ${index + 1} ---`);
        console.log(match);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugLogin();