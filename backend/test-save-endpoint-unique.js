const axios = require('axios');

async function testSaveEndpointUnique() {
  console.log('🧪 Testing save Hikvision data endpoint with unique data...');
  
  try {
    // Create unique test data with timestamp to avoid duplicates
    const timestamp = new Date().toISOString();
    const testData = {
      attendanceData: [
        { 
          employeeId: 'TEST001', 
          employeeName: 'Test Employee 1', 
          punchTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          direction: 'in',
          deviceId: 'hikvision_device_1'
        },
        { 
          employeeId: 'TEST001', 
          employeeName: 'Test Employee 1', 
          punchTime: new Date().toISOString(), // now
          direction: 'out',
          deviceId: 'hikvision_device_1'
        },
        { 
          employeeId: 'TEST002', 
          employeeName: 'Test Employee 2', 
          punchTime: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
          direction: 'in',
          deviceId: 'hikvision_device_2'
        }
      ],
      date: new Date().toISOString().split('T')[0] // Today's date
    };
    
    const response = await axios.post('http://localhost:5003/api/access/save-hikvision-attendance', testData);
    console.log('✅ Save endpoint response:', response.data);
    
    if (response.data.success) {
      console.log(`✅ Successfully saved ${response.data.savedCount} new Hikvision records to MongoDB!`);
      console.log(`📊 Duplicate records skipped: ${response.data.duplicateCount}`);
      if (response.data.savedRecords && response.data.savedRecords.length > 0) {
        console.log('📋 Saved records:', response.data.savedRecords);
      }
    }
  } catch (error) {
    console.error('❌ Error testing save endpoint:', error.response?.data || error.message);
  }
}

testSaveEndpointUnique();