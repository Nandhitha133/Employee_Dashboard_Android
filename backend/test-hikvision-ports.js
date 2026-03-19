const https = require('https');
const axios = require('axios');
const http = require('http');

const agent = new https.Agent({ 
  rejectUnauthorized: false // Accept self-signed certificates
});

const deviceIP = '192.168.1.144';
const username = '27202606';
const password = 'wNxzEQhAlCx01UrIFasx';

console.log('Testing Hikvision device on different ports...');
console.log('Device IP:', deviceIP);
console.log('Username:', username);

const ports = [80, 8000, 8080, 443];
const endpoints = [
  '/ISAPI/System/status',
  '/ISAPI/System/deviceInfo',
  '/doc/page/login.asp',
  '/System/status',
  '/deviceStatus'
];

async function testPortAndEndpoints() {
  for (const port of ports) {
    console.log(`\n=== Testing Port ${port} ===`);
    
    for (const endpoint of endpoints) {
      try {
        const protocol = port === 443 ? 'https' : 'http';
        const url = `${protocol}://${deviceIP}:${port}${endpoint}`;
        
        console.log(`Testing: ${url}`);
        
        const config = {
          timeout: 10000,
          auth: { username, password }
        };
        
        if (protocol === 'https') {
          config.httpsAgent = agent;
        }
        
        const response = await axios.get(url, config);
        console.log(`✅ Connected! Status: ${response.status}`);
        console.log('Response type:', response.headers['content-type']);
        
        if (response.headers['content-type']?.includes('json')) {
          console.log('Response data:', JSON.stringify(response.data, null, 2).substring(0, 300));
        } else {
          console.log('Response length:', response.data.length);
        }
        
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.log(`❌ Connection refused - port ${port} not open`);
          break;
        } else {
          console.log(`❌ Failed: ${error.response?.status || error.message}`);
        }
      }
    }
  }
}

testPortAndEndpoints();