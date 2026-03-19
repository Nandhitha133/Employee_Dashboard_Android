const axios = require('axios');

async function testSync() {
  try {
    console.log('Testing Hikvision attendance sync...');
    
    // First, let's test the connection
    console.log('Testing Hikvision connection...');
    const connectionTest = await axios.get('http://localhost:5005/api/access/test-connection');
    console.log('Connection test result:', connectionTest.data);
    
    // Now let's trigger the attendance sync
    console.log('Triggering attendance sync...');
    const syncResponse = await axios.get('http://localhost:5005/api/hik-sync/sync');
    console.log('Sync result:', syncResponse.data);
    
  } catch (error) {
    console.error('Error during sync test:', error.response?.data || error.message);
  }
}

testSync();