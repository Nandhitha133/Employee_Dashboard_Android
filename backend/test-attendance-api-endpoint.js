const axios = require('axios');

async function testAttendanceApiEndpoint() {
  try {
    console.log('Testing attendance API test endpoint...');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5003/api/auth/login', {
      email: 'admin@caldim.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Got token:', token.substring(0, 20) + '...');
    
    // Test the new test-attendance-api endpoint
    console.log('\nTesting test-attendance-api endpoint...');
    const testResponse = await axios.get('http://localhost:5003/api/hik-sync/test-attendance-api', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Test Response:', JSON.stringify(testResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response?.data) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAttendanceApiEndpoint();