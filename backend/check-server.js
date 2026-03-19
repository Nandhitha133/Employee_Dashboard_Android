const axios = require('axios');

async function checkServerStatus() {
  try {
    console.log('Checking server status...');
    
    // Test base URL
    const baseResponse = await axios.get('http://localhost:5003/');
    console.log('Server Status:', baseResponse.data);
    
    // Test if hik-sync routes are available
    try {
      const syncResponse = await axios.get('http://localhost:5003/api/hik-sync/sync');
      console.log('Sync endpoint response:', syncResponse.data);
    } catch (syncError) {
      console.log('Sync endpoint error:', syncError.response?.status, syncError.response?.statusText);
    }
    
    // Test the new test endpoint
    try {
      const testResponse = await axios.get('http://localhost:5003/api/hik-sync/test-attendance-api');
      console.log('Test endpoint response:', testResponse.data);
    } catch (testError) {
      console.log('Test endpoint error:', testError.response?.status, testError.response?.statusText);
    }
    
  } catch (error) {
    console.error('Server connection error:', error.message);
    console.log('Make sure the server is running on port 5003');
  }
}

checkServerStatus();