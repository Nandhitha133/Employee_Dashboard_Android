const https = require('https');
const axios = require('axios');

const agent = new https.Agent({ 
  rejectUnauthorized: false
});

const deviceIP = '192.168.1.144';
const username = '27202606';
const password = 'wNxzEQhAlCx01UrIFasx';

console.log('Testing alternative Hikvision integration methods...');

async function testAlternativeEndpoints() {
  const alternatives = [
    '/SDK/WebService',
    '/onvif/device_service',
    '/ISAPI/Security/userCheck',
    '/ISAPI/System/Network/interfaces',
    '/ISAPI/System/capabilities',
    '/doc/page/config.asp',
    '/web/api/capabilities'
  ];
  
  for (const endpoint of alternatives) {
    try {
      console.log(`\nTesting: ${endpoint}`);
      const response = await axios.get(`https://${deviceIP}${endpoint}`, {
        httpsAgent: agent,
        auth: { username, password },
        timeout: 10000
      });
      console.log(`✅ Connected! Status: ${response.status}`);
      console.log('Content-Type:', response.headers['content-type']);
    } catch (error) {
      console.log(`❌ Failed: ${error.response?.status || error.message}`);
    }
  }
}

testAlternativeEndpoints();