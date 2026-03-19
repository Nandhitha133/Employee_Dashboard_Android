const axios = require('axios');

async function testSync() {
  try {
    console.log('Testing Hikvision attendance sync...');
    
    // Let's trigger the attendance sync directly
    console.log('Triggering attendance sync...');
    const syncResponse = await axios.get('http://localhost:5005/api/hik-sync/sync');
    console.log('Sync result:', syncResponse.data);
    
  } catch (error) {
    console.error('Error during sync test:', error.response?.data || error.message);
  }
}

testSync();