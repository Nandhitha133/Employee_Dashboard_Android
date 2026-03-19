const axios = require('axios');

async function testNewEndpoints() {
  const baseURL = 'http://localhost:5003/api/hik-sync';
  
  try {
    console.log('Testing new attendance API test endpoint...');
    
    // Test the new test-attendance-api endpoint
    const testResponse = await axios.get(`${baseURL}/test-attendance-api`);
    console.log('Test API Response:', JSON.stringify(testResponse.data, null, 2));
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test the updated sync endpoint
    console.log('Testing updated sync endpoint...');
    const syncResponse = await axios.get(`${baseURL}/sync`);
    console.log('Sync Response:', JSON.stringify(syncResponse.data, null, 2));
    
  } catch (error) {
    console.error('Error testing endpoints:', error.message);
    if (error.response?.data) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testNewEndpoints();