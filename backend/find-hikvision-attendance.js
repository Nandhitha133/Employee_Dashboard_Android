const https = require('https');
const axios = require('axios');

const agent = new https.Agent({ 
  rejectUnauthorized: false
});

const deviceIP = '192.168.1.144';
const username = '27202606';
const password = 'wNxzEQhAlCx01UrIFasx';

console.log('Searching for Hikvision attendance data endpoints...');
console.log('Device IP:', deviceIP);
console.log('Username:', username);

// Common Hikvision attendance endpoints (varies by model/firmware)
const attendanceEndpoints = [
  '/ISAPI/AccessControl/AcsEvent?format=json',
  '/ISAPI/AccessControl/AcsEvent?major=0&minor=0',
  '/ISAPI/AccessControl/AcsEvent?major=5&minor=75', // Card swiping
  '/ISAPI/AccessControl/AcsEvent?major=5&minor=38', // Door opening
  '/ISAPI/AccessControl/AcsEvent?startTime=2024-01-01T00:00:00Z&endTime=2024-12-31T23:59:59Z',
  '/ISAPI/AccessControl/RecordFingerprint',
  '/ISAPI/AccessControl/CardInfo',
  '/ISAPI/AccessControl/UserInfo',
  '/ISAPI/AccessControl/CardInfo?format=json',
  '/ISAPI/AccessControl/UserInfo?format=json',
  '/ISAPI/System/Log',
  '/ISAPI/System/Log?format=json',
  '/ISAPI/System/Log?startTime=2024-01-01T00:00:00Z&endTime=2024-12-31T23:59:59Z',
  '/logExport.php',
  '/data/record.php',
  '/api/record',
  '/record/query',
  '/attendance/data',
  '/access/event',
  '/event/log'
];

// Alternative authentication methods
const authHeaders = [
  { name: 'Basic Auth', headers: { 'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64') } },
  { name: 'Direct Auth', headers: {}, auth: { username, password } },
  { name: 'ISAPI Token', headers: { 'X-ISAPI-Token': 'admin' } },
  { name: 'Custom Header', headers: { 'X-Custom-Auth': username + ':' + password } }
];

async function testAllCombinations() {
  for (const auth of authHeaders) {
    console.log(`\n=== Testing with ${auth.name} ===`);
    
    for (const endpoint of attendanceEndpoints) {
      try {
        console.log(`Testing: ${endpoint}`);
        
        const config = {
          method: 'GET',
          url: `https://${deviceIP}${endpoint}`,
          httpsAgent: agent,
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...auth.headers
          }
        };
        
        if (auth.auth) {
          config.auth = auth.auth;
        }
        
        const response = await axios(config);
        console.log(`✅ SUCCESS! Status: ${response.status}`);
        console.log('Content-Type:', response.headers['content-type']);
        
        if (response.data) {
          if (typeof response.data === 'object') {
            console.log('Data keys:', Object.keys(response.data));
            console.log('Sample data:', JSON.stringify(response.data, null, 2).substring(0, 500));
          } else {
            console.log('Response length:', response.data.length);
            console.log('Sample:', response.data.toString().substring(0, 200));
          }
        }
        
        // If we found attendance data, try to get more
        if (endpoint.includes('Event') || endpoint.includes('record')) {
          console.log('🎉 Found potential attendance endpoint!');
          await getMoreAttendanceData(endpoint, auth);
        }
        
      } catch (error) {
        const status = error.response?.status;
        const message = error.message;
        
        if (status === 401) {
          console.log(`❌ Authentication failed`);
        } else if (status === 404) {
          console.log(`❌ Endpoint not found`);
        } else if (message.includes('timeout')) {
          console.log(`⏰ Timeout - endpoint might be slow`);
        } else {
          console.log(`❌ Failed: ${status || message}`);
        }
      }
    }
  }
}

async function getMoreAttendanceData(endpoint, auth) {
  // Try to get recent attendance data
  const dateRangeEndpoints = [
    `${endpoint}?startTime=2024-11-01T00:00:00Z&endTime=2024-11-30T23:59:59Z`,
    `${endpoint}?recent=100`,
    `${endpoint}?limit=50&offset=0`,
    `${endpoint}?format=json&start=0&limit=100`
  ];
  
  for (const rangeEndpoint of dateRangeEndpoints) {
    try {
      console.log(`  Trying: ${rangeEndpoint}`);
      
      const config = {
        method: 'GET',
        url: `https://${deviceIP}${rangeEndpoint}`,
        httpsAgent: agent,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...auth.headers
        }
      };
      
      if (auth.auth) {
        config.auth = auth.auth;
      }
      
      const response = await axios(config);
      console.log(`  ✅ Got data! Records: ${Array.isArray(response.data) ? response.data.length : 'N/A'}`);
      
      if (Array.isArray(response.data) && response.data.length > 0) {
        console.log('  Sample record:', JSON.stringify(response.data[0], null, 2));
        
        // Save the successful endpoint
        console.log('\n📝 SUCCESSFUL ENDPOINT FOUND:');
        console.log('URL:', rangeEndpoint);
        console.log('Auth:', auth.name);
        console.log('Records:', response.data.length);
      }
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.response?.status || error.message}`);
    }
  }
}

// Also test POST requests for some endpoints
async function testPostEndpoints() {
  console.log('\n=== Testing POST endpoints ===');
  
  const postEndpoints = [
    '/ISAPI/AccessControl/AcsEvent',
    '/api/record/query',
    '/attendance/search'
  ];
  
  const postData = {
    searchID: '1',
    searchResultPosition: 0,
    maxResults: 100,
    major: 5,
    minor: 75,
    startTime: '2024-11-01T00:00:00Z',
    endTime: '2024-11-30T23:59:59Z'
  };
  
  for (const endpoint of postEndpoints) {
    try {
      console.log(`Testing POST: ${endpoint}`);
      
      const response = await axios.post(
        `https://${deviceIP}${endpoint}`,
        postData,
        {
          httpsAgent: agent,
          auth: { username, password },
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log(`✅ POST Success! Status: ${response.status}`);
      console.log('Response:', JSON.stringify(response.data, null, 2).substring(0, 300));
      
    } catch (error) {
      console.log(`❌ POST Failed: ${error.response?.status || error.message}`);
    }
  }
}

async function main() {
  await testAllCombinations();
  await testPostEndpoints();
  
  console.log('\n🔍 Search completed!');
  console.log('If no attendance data was found, your device may:');
  console.log('1. Use a different API protocol (ONVIF, custom)');
  console.log('2. Store data locally without API access');
  console.log('3. Require firmware update to enable APIs');
  console.log('4. Need configuration changes to enable data export');
}

main().catch(console.error);