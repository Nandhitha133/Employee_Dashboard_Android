const axios = require('axios');
const https = require('https');

const HIK_HOST = process.env.HIK_HOST || 'https://192.168.1.144';

async function discoverAPIs() {
  console.log('Discovering available APIs on Hikvision device...');
  console.log('Host:', HIK_HOST);
  
  // Try to access the root URL first
  try {
    console.log('\n--- Testing root URL ---');
    const rootResponse = await axios.get(HIK_HOST, {
      timeout: 10000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      validateStatus: (status) => true
    });
    
    console.log(`Root URL Status: ${rootResponse.status}`);
    console.log('Root response headers:', rootResponse.headers);
    
  } catch (error) {
    console.log('Root URL Error:', error.message);
  }
  
  // Try common Hikvision API base paths
  const apiBases = [
    '/ISAPI',
    '/SDK',
    '/api',
    '/cgi-bin',
    '/web',
    '/doc',
    '/rest',
    '/hikvision'
  ];
  
  for (const base of apiBases) {
    try {
      console.log(`\n--- Testing base: ${base} ---`);
      const url = `${HIK_HOST}${base}`;
      
      const response = await axios.get(url, {
        timeout: 5000,
        httpsAgent: new https.Agent({
          rejectUnauthorized: false
        }),
        validateStatus: (status) => true
      });
      
      console.log(`Status: ${response.status}`);
      if (response.headers['content-type']) {
        console.log('Content-Type:', response.headers['content-type']);
      }
      
      // If we get a 401, it means the endpoint exists but needs auth
      if (response.status === 401) {
        console.log('✅ Endpoint exists - requires authentication');
      } else if (response.status === 200) {
        console.log('✅ Endpoint accessible');
        if (response.data && typeof response.data === 'object') {
          console.log('Response preview:', JSON.stringify(response.data, null, 2).substring(0, 200));
        }
      }
      
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Endpoint exists - requires authentication');
      } else if (error.response && error.response.status === 404) {
        console.log('❌ Endpoint not found');
      } else {
        console.log('Error:', error.message);
      }
    }
  }
}

discoverAPIs();