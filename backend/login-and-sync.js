const axios = require('axios');

async function loginAndSync() {
  try {
    console.log('Logging in to get token...');
    
    // Login to get token
    const loginResponse = await axios.post('http://localhost:5005/api/auth/login', {
      email: 'admin@example.com', // Default admin email
      password: 'admin123' // Default admin password
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Now trigger the attendance sync with the token
    console.log('Triggering attendance sync...');
    const syncResponse = await axios.get('http://localhost:5005/api/hik-sync/sync', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Sync result:', syncResponse.data);
    
  } catch (error) {
    console.error('Error during login/sync:', error.response?.data || error.message);
  }
}

loginAndSync();