const axios = require('axios');

async function testSyncWithLiveServer() {
  try {
    console.log('Testing sync endpoint with live server...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5003/api/auth/login', {
      email: 'admin@caldim.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Got token:', token.substring(0, 20) + '...');
    
    // Test sync endpoint
    console.log('\nTesting sync endpoint...');
    const syncResponse = await axios.get('http://localhost:5003/api/hik-sync/sync', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Sync Response:', JSON.stringify(syncResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSyncWithLiveServer();