const https = require('https');
const axios = require('axios');

const agent = new https.Agent({ 
  rejectUnauthorized: false
});

const deviceIP = '192.168.1.144';
const username = '27202606';
const password = 'wNxzEQhAlCx01UrIFasx';

console.log(' Analyzing Hikvision device capabilities...');

async function analyzeDevice() {
  try {
    // Get the main web page to understand device type
    console.log('Getting device web interface...');
    const response = await axios.get(`https://${deviceIP}`, {
      httpsAgent: agent,
      auth: { username, password },
      timeout: 10000
    });
    
    console.log('✅ Device web interface accessible');
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers['content-type']);
    console.log('Content-Length:', response.data.length);
    
    // Look for device information in the HTML
    const html = response.data.toString();
    
    // Extract device model/info from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      console.log('Device Title:', titleMatch[1].trim());
    }
    
    // Look for common Hikvision patterns
    if (html.includes('Hikvision')) {
      console.log('✅ Confirmed: Hikvision device');
    }
    
    if (html.includes('DS-')) {
      const modelMatch = html.match(/DS-[A-Z0-9-]+/);
      if (modelMatch) {
        console.log('🎯 Device Model:', modelMatch[0]);
      }
    }
    
    // Check for available menu options or links
    const links = html.match(/href="([^"]+)"/g);
    if (links) {
      console.log('\n📋 Available pages:');
      const uniqueLinks = [...new Set(links.map(link => link.replace('href="', '').replace('"', '')))];
      uniqueLinks.slice(0, 10).forEach(link => {
        if (!link.startsWith('http') && !link.startsWith('#')) {
          console.log('  -', link);
        }
      });
    }
    
    // Look for attendance-related terms
    const attendanceTerms = ['attendance', 'record', 'log', 'event', 'access', 'card', 'user'];
    console.log('\n🔍 Searching for attendance-related content:');
    attendanceTerms.forEach(term => {
      if (html.toLowerCase().includes(term)) {
        console.log(`  ✅ Found "${term}" in interface`);
      }
    });
    
    console.log('\n💡 Recommendations:');
    console.log('1. Access the device web interface at: https://192.168.1.144');
    console.log('2. Look for "Configuration" or "System" menus');
    console.log('3. Check for "Access Control" or "Event" sections');
    console.log('4. Look for data export options (CSV, Excel, etc.)');
    console.log('5. Check if there are API settings to enable');
    
    console.log('\n🔄 Alternative approaches:');
    console.log('1. Check if device supports ONVIF protocol');
    console.log('2. Look for RTSP stream with embedded metadata');
    console.log('3. Check for FTP/SMTP export settings');
    console.log('4. Verify firmware version and update if needed');
    
  } catch (error) {
    console.log('❌ Failed to analyze device:', error.message);
  }
}

async function checkONVIFSupport() {
  console.log('\n=== Testing ONVIF Support ===');
  
  const onvifEndpoints = [
    '/onvif/device_service',
    '/onvif/device.wsdl',
    '/onvif/Events',
    '/onvif/Media',
    '/onvif/PTZ'
  ];
  
  for (const endpoint of onvifEndpoints) {
    try {
      const response = await axios.get(`https://${deviceIP}${endpoint}`, {
        httpsAgent: agent,
        auth: { username, password },
        timeout: 5000
      });
      
      console.log(`✅ ONVIF endpoint found: ${endpoint}`);
      console.log('Status:', response.status);
      
      if (response.data) {
        const hasEvents = response.data.toString().toLowerCase().includes('event');
        if (hasEvents) {
          console.log('🎯 Contains event handling capabilities');
        }
      }
      
    } catch (error) {
      if (error.response?.status !== 404) {
        console.log(`⚠️  ONVIF ${endpoint}: ${error.response?.status || 'No response'}`);
      }
    }
  }
}

async function main() {
  await analyzeDevice();
  await checkONVIFSupport();
  
  console.log('\n📝 Next steps to get your attendance data:');
  console.log('1. Log into your device web interface');
  console.log('2. Navigate to Access Control → Event or Reports section');
  console.log('3. Look for attendance/event logs');
  console.log('4. Check for export options (manual export to CSV/Excel)');
  console.log('5. If no export option, check firmware update availability');
  console.log('6. Contact Hikvision support with your exact model number');
}

main().catch(console.error);