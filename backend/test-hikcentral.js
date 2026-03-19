const axios = require('axios');
const crypto = require('crypto');

// Your HikCentral credentials from .env
const HIK_HOST = 'http://127.0.0.1:9016';
const APP_KEY = '21461563';
const APP_SECRET = 'kQWMjaukDcSqQgo9yAlM';

function createSignature(method, accept, timestamp, apiPath) {
  const stringToSign = `${method}\n${accept}\n${timestamp}\n${apiPath}`;
  return crypto.createHmac('sha256', APP_SECRET).update(stringToSign).digest('base64');
}

async function testHikCentral() {
  const method = 'POST';
  const accept = '*/*';
  const timestamp = Date.now().toString();
  
  // Try different API endpoints that might work with HikCentral Professional
  const apiPaths = [
    '/artemis/api/attendance/v2/report',
    '/artemis/api/acs/v1/events',
    '/artemis/api/acs/v1/record/card',
    '/artemis/api/resource/v1/person/condition',
    '/artemis/api/resource/v1/org/condition'
  ];
  
  const requestBody = {
    pageNo: 1,
    pageSize: 50  // Get more records to show you have data
  };
  
  let response = null;
  let successfulPath = null;
  
  console.log('🔄 Testing HikCentral connection...');
  console.log('📡 Host:', HIK_HOST);
  console.log('🔑 Using App Key:', APP_KEY);
  
  for (const apiPath of apiPaths) {
    try {
      console.log(`\n🔄 Trying API endpoint: ${apiPath}`);
      const signature = createSignature(method, accept, timestamp, apiPath);
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': accept,
        'x-ca-key': APP_KEY,
        'x-ca-timestamp': timestamp,
        'x-ca-signature': signature,
      };
      
      const testResponse = await axios.post(`${HIK_HOST}${apiPath}`, requestBody, { 
        headers,
        timeout: 5000 // 5 second timeout per attempt
      });
      
      if (testResponse.status === 200) {
        response = testResponse;
        successfulPath = apiPath;
        console.log(`✅ Success with endpoint: ${apiPath}`);
        break;
      }
    } catch (err) {
      if (err.response?.status === 404) {
        console.log(`❌ Endpoint not found: ${apiPath}`);
      } else if (err.response?.status === 401) {
        console.log(`❌ Authentication failed for: ${apiPath}`);
      } else if (err.code === 'ETIMEDOUT') {
        console.log(`⏰ Timeout for: ${apiPath}`);
      } else {
        console.log(`❌ Error with ${apiPath}: ${err.message}`);
      }
    }
  }
  
  if (!response) {
    console.error('❌ All API endpoints failed');
    console.log('\n💡 Troubleshooting suggestions:');
    console.log('1. Verify HikCentral Professional is running on', HIK_HOST);
    console.log('2. Check if the API credentials are correct');
    console.log('3. Ensure the device supports the Artemis API');
    console.log('4. Check network connectivity and firewall settings');
    return;
  }
  
  console.log(`\n📡 Using successful endpoint: ${successfulPath}`);
  console.log('📊 Response Status:', response.status);
  
  if (response.data?.data?.list) {
    const records = response.data.data.list;
    console.log(`\n📋 Found ${records.length} attendance records in HikCentral`);
    console.log('🕐 Latest Records:');
    
    // Sort by checkTime to show latest first
    const sortedRecords = records.sort((a, b) => new Date(b.checkTime) - new Date(a.checkTime));
    
    sortedRecords.slice(0, 5).forEach((record, index) => {
      const checkTime = new Date(record.checkTime);
      const formattedTime = checkTime.toLocaleString();
      console.log(`${index + 1}. 👤 ${record.personName || 'Unknown'} (ID: ${record.personId})`);
      console.log(`   ⏰ Time: ${formattedTime}`);
      console.log(`   🚪 Type: ${record.checkType === 1 ? '🔵 Check-in' : '🔴 Check-out'}`);
      console.log(`   📱 Device: ${record.deviceId || 'Unknown'}`);
      console.log('');
    });
    
    // Summary statistics
    const checkins = records.filter(r => r.checkType === 1).length;
    const checkouts = records.filter(r => r.checkType === 2).length;
    
    console.log('📈 Summary:');
    console.log(`   🔵 Total Check-ins: ${checkins}`);
    console.log(`   🔴 Total Check-outs: ${checkouts}`);
    console.log(`   📱 Unique Devices: ${new Set(records.map(r => r.deviceId)).size}`);
    console.log(`   👥 Unique Employees: ${new Set(records.map(r => r.personId)).size}`);
    
  } else {
    console.log('📭 No attendance records found in HikCentral');
    console.log('📄 Response data:', JSON.stringify(response.data, null, 2));
  }
}

// Run the test
testHikCentral().catch(console.error);