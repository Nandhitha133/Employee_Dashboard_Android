const https = require('https');
const axios = require('axios');

const agent = new https.Agent({ 
  rejectUnauthorized: false // Accept self-signed certificates
});

const deviceIP = '192.168.1.144';
const username = '27202606';
const password = 'wNxzEQhAlCx01UrIFasx';

console.log('Testing Hikvision device connection...');
console.log('Device IP:', deviceIP);
console.log('Username:', username);

const endpoints = [
  '/ISAPI/System/status',
  '/ISAPI/System/deviceInfo', 
  '/ISAPI/AccessControl/UserInfo/capabilities',
  '/ISAPI/AccessControl/AcsEvent',
  '/'
];

async function testEndpoints() {
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting: ${endpoint}`);
      const response = await axios.get(`https://${deviceIP}${endpoint}`, {
        httpsAgent: agent,
        auth: { username, password },
        timeout: 10000
      });
      console.log(`✅ Connected! Status: ${response.status}`);
      console.log('Response data:', JSON.stringify(response.data, null, 2).substring(0, 200));
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.status || error.message}`);
      if (error.response?.status === 401) {
        console.log('   Authentication failed - check username/password');
      }
    }
  }
}

testEndpoints();