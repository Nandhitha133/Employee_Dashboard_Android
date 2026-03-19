const axios = require('axios');

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Create admin user (this endpoint doesn't require authentication for initial setup)
    const createResponse = await axios.post('http://localhost:5005/api/auth/users', {
      name: 'Admin User',
      email: 'admin@company.com',
      password: 'admin123',
      role: 'admin',
      permissions: ['dashboard', 'user_access', 'employee_access']
    });
    
    console.log('Admin user created:', createResponse.data);
    
    // Now login to get token
    console.log('Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5005/api/auth/login', {
      email: 'admin@company.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('Login successful, token received');
    
    // Now trigger the attendance sync with the token
    console.log('Triggering Hikvision attendance sync...');
    const syncResponse = await axios.get('http://localhost:5005/api/hik-sync/sync', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Attendance sync result:', syncResponse.data);
    
    // Also sync employees from Hikvision
    console.log('Triggering Hikvision employee sync...');
    const employeeSyncResponse = await axios.post('http://localhost:5005/api/hik-employees/sync-employees', {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Employee sync result:', employeeSyncResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

createAdminUser();