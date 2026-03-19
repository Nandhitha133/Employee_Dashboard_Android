const axios = require('axios');
const https = require('https');
const generateHikToken = require('./utils/hikToken');

// Test different Hikvision API endpoints
const HIK_HOST = process.env.HIK_HOST || 'https://192.168.1.144';
const HIK_KEY = process.env.HIK_KEY || '27202606';
const HIK_SECRET = process.env.HIK_SECRET || 'wNxzEQhAlCx01UrIFasx';

const testEndpoints = [
  '/artemis/api/acs/v1/events',
  '/artemis/api/acs/v1/deviceStatus',
  '/artemis/api/attendance/v2/report',
  '/artemis/api/pms/v1/person/list',
  '/ISAPI/AccessControl/AttendanceRecord',
  '/ISAPI/AccessControl/CardInfo',
  '/ISAPI/System/status',
  '/ISAPI/AccessControl/AcsEvent'
];

async function testHikvisionEndpoints() {
  console.log('Testing Hikvision API endpoints...');
  console.log('Host:', HIK_HOST);
  console.log('Key:', HIK_KEY);
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`\n--- Testing: ${endpoint} ---`);
      
      const token = generateHikToken();
      const url = `${HIK_HOST}${endpoint}`;
      
      console.log('URL:', url);
      
      const response = await axios.post(url, {}, {
        headers: {
          'Content-Type': 'application/json',
          'X-Ca-Key': HIK_KEY,
          'X-Ca-Signature': token,
          'X-Ca-Timestamp': Date.now().toString()
        },
        timeout: 10000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        validateStatus: (status) => true // Accept all status codes
      });
      
      console.log(`Status: ${response.status}`);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
    } catch (error) {
      console.log(`Error: ${error.message}`);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        console.log('Error data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

testHikvisionEndpoints();