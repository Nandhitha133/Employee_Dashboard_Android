const axios = require('axios');
const https = require('https');

const HIK_HOST = process.env.HIK_HOST || 'https://192.168.1.144';
const HIK_KEY = process.env.HIK_KEY || '27202606';
const HIK_SECRET = process.env.HIK_SECRET || 'wNxzEQhAlCx01UrIFasx';

// Basic auth for ISAPI endpoints
const auth = Buffer.from(`${HIK_KEY}:${HIK_SECRET}`).toString('base64');

const basicEndpoints = [
  '/ISAPI/System/status',
  '/ISAPI/System/deviceInfo',
  '/ISAPI/AccessControl/CardInfo?format=json',
  '/ISAPI/AccessControl/AcsEvent?format=json',
  '/ISAPI/AccessControl/AttendanceRecord?format=json',
  '/ISAPI/AccessControl/UserInfo?format=json'
];

async function testBasicISAPI() {
  console.log('Testing Basic ISAPI endpoints...');
  console.log('Host:', HIK_HOST);
  
  for (const endpoint of basicEndpoints) {
    try {
      console.log(`\n--- Testing: ${endpoint} ---`);
      
      const url = `${HIK_HOST}${endpoint}`;
      console.log('URL:', url);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        validateStatus: (status) => true // Accept all status codes
      });
      
      console.log(`Status: ${response.status}`);
      if (response.data) {
        console.log('Response data:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('No data returned');
      }
      
    } catch (error) {
      console.log(`Error: ${error.message}`);
      if (error.response) {
        console.log(`Status: ${error.response.status}`);
        if (error.response.data) {
          console.log('Error data:', JSON.stringify(error.response.data, null, 2));
        }
      }
    }
  }
}

testBasicISAPI();