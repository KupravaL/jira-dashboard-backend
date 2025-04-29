require('dotenv').config();
const axios = require('axios');

// Log environment variables (without sensitive data)
console.log('Environment check:');
console.log('JIRA_API_URL:', process.env.JIRA_API_URL ? '✓ Set' : '✗ Missing');
console.log('JIRA_EMAIL:', process.env.JIRA_EMAIL ? '✓ Set' : '✗ Missing');
console.log('JIRA_API_TOKEN:', process.env.JIRA_API_TOKEN ? '✓ Set' : '✗ Missing');

// Create Axios instance with detailed error logging
const jiraApi = axios.create({
  baseURL: process.env.JIRA_API_URL?.trim(),
  auth: {
    username: process.env.JIRA_EMAIL,
    password: process.env.JIRA_API_TOKEN
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Test connection
async function testConnection() {
  try {
    console.log('\nTesting Jira API connection...');
    console.log('URL:', process.env.JIRA_API_URL);
    
    const response = await jiraApi.get('/rest/api/3/myself');
    console.log('\n✅ Connection successful!');
    console.log('Connected as:', response.data.displayName);
    console.log('Email:', response.data.emailAddress);
  } catch (error) {
    console.log('\n❌ Connection failed!');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
      
      // Additional authentication debugging
      if (error.response.status === 401) {
        console.log('\nAuthentication Debug Info:');
        console.log('- Check if your API token is valid and not expired');
        console.log('- Verify that your email address is correct');
        console.log('- Make sure there are no extra spaces in your credentials');
        console.log('\nDebug Information:');
        console.log('API URL:', process.env.JIRA_API_URL);
        console.log('Email Length:', process.env.JIRA_EMAIL?.length);
        console.log('Token Length:', process.env.JIRA_API_TOKEN?.length);
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.log('No response received. This might indicate:');
      console.log('1. Incorrect API URL');
      console.log('2. Network connectivity issues');
      console.log('3. CORS issues');
      console.log('\nError details:', error.message);
    } else {
      // Something happened in setting up the request
      console.log('Error:', error.message);
    }

    // Additional debugging information
    if (error.config) {
      console.log('\nRequest details:');
      console.log('URL:', error.config.url);
      console.log('Method:', error.config.method);
    }
  }
}

testConnection(); 