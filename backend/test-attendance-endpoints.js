const axios = require('axios');
const cheerio = require('cheerio');

async function testAttendanceEndpoints() {
  const auth = Buffer.from('admin:cdhrhsd12345').toString('base64');
  const deviceUrl = 'https://192.168.1.144';
  
  // Common Hikvision endpoints that might contain attendance data
  const endpoints = [
    '/ISAPI/AccessControl/AcsEvent',
    '/ISAPI/AccessControl/AttendanceRecord',
    '/ISAPI/AccessControl/CardInfo',
    '/doc/page/accessControl/acsEvent.asp',
    '/doc/page/accessControl/attendanceRecord.asp',
    '/doc/page/accessControl/cardInfo.asp',
    '/doc/page/personnel/attendance.asp',
    '/doc/page/reports/attendanceReport.asp',
    '/cgi-bin/record.cgi',
    '/cgi-bin/event.cgi',
    '/main.asp',
    '/login.asp'
  ];
  
  console.log('Testing various Hikvision endpoints for attendance data...\n');
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${deviceUrl}${endpoint}`);
      
      const response = await axios.get(`${deviceUrl}${endpoint}`, {
        headers: {
          'Authorization': 'Basic ' + auth,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000,
        httpsAgent: new require('https').Agent({ rejectUnauthorized: false })
      });
      
      console.log(`✅ Success! Status: ${response.status}`);
      
      // Check if this might contain attendance data
      const contentType = response.headers['content-type'];
      console.log(`Content-Type: ${contentType}`);
      
      if (contentType && contentType.includes('json')) {
        console.log('JSON response - potential API endpoint');
        console.log('Response preview:', JSON.stringify(response.data).substring(0, 200) + '...');
      } else if (contentType && contentType.includes('html')) {
        console.log('HTML response - checking for attendance data...');
        const $ = cheerio.load(response.data);
        
        // Look for attendance-related keywords
        const htmlText = response.data.toLowerCase();
        const attendanceKeywords = ['attendance', 'event', 'employee', 'card', 'time', 'record'];
        const foundKeywords = attendanceKeywords.filter(keyword => htmlText.includes(keyword));
        
        if (foundKeywords.length > 0) {
          console.log(`Found attendance keywords: ${foundKeywords.join(', ')}`);
          
          // Look for tables
          const tables = $('table').length;
          console.log(`Found ${tables} tables`);
          
          // Look for form elements
          const forms = $('form').length;
          console.log(`Found ${forms} forms`);
          
          // Save promising HTML for inspection
          if (tables > 0 || forms > 0 || foundKeywords.length >= 3) {
            require('fs').writeFileSync(`hikvision-${endpoint.replace(/\//g, '-')}.html`, response.data);
            console.log(`💾 Saved HTML to hikvision-${endpoint.replace(/\//g, '-')}.html for inspection`);
          }
        }
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
      console.log('---\n');
    }
  }
  
  console.log('Endpoint testing complete!');
}

testAttendanceEndpoints();