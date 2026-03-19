const axios = require('axios');

async function findInOutData() {
  const auth = Buffer.from('admin:cdhrhsd12345').toString('base64');
  const deviceUrl = 'https://192.168.1.144';
  
  // Specific endpoints for IN/OUT punching data
  const inOutEndpoints = [
    '/ISAPI/AccessControl/AcsEvent?format=json',
    '/ISAPI/AccessControl/AcsEvent?format=xml',
    '/doc/page/accessControl/acsEvent.asp',
    '/doc/page/accessControl/transactionRecord.asp',
    '/cgi-bin/acsEvent.cgi',
    '/cgi-bin/accessControl.cgi',
    '/API/AccessControl/Events',
    '/api/acs/events',
    '/rest/acs/events'
  ];
  
  console.log('Searching for IN/OUT punching data endpoints...\n');
  
  for (const endpoint of inOutEndpoints) {
    try {
      console.log(`Testing: ${deviceUrl}${endpoint}`);
      
      const response = await axios.get(`${deviceUrl}${endpoint}`, {
        headers: {
          'Authorization': 'Basic ' + auth,
          'Accept': 'application/json,application/xml,text/html',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 8000,
        httpsAgent: new require('https').Agent({ rejectUnauthorized: false })
      });
      
      console.log(`✅ SUCCESS! Status: ${response.status}`);
      console.log(`Content-Type: ${response.headers['content-type']}`);
      
      // Check if this contains IN/OUT data
      const data = response.data;
      const dataStr = JSON.stringify(data).toLowerCase();
      
      const inOutKeywords = ['in', 'out', 'entry', 'exit', 'direction', 'access', 'event'];
      const foundKeywords = inOutKeywords.filter(keyword => dataStr.includes(keyword));
      
      if (foundKeywords.length > 0) {
        console.log(`🎯 Found IN/OUT keywords: ${foundKeywords.join(', ')}`);
        console.log('Data preview:', JSON.stringify(data).substring(0, 300) + '...');
        
        // Save this endpoint for further analysis
        require('fs').writeFileSync(`inout-data-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}.json`, JSON.stringify(data, null, 2));
        console.log(`💾 Saved data to inout-data-${endpoint.replace(/[^a-zA-Z0-9]/g, '-')}.json`);
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('---\n');
    }
  }
  
  console.log('IN/OUT data search complete!');
}

findInOutData();