const axios = require('axios');

// Test the new save endpoint
async function testSaveEndpoint() {
  try {
    console.log('🧪 Testing save Hikvision data endpoint...');
    
    // Sample Hikvision data similar to what frontend sends
    const testData = {
      attendanceData: [
        {
          employeeId: 'EMP001',
          employeeName: 'John Doe',
          punchTime: '2025-11-26T08:30:00.000Z',
          direction: 'in',
          date: '2025-11-26',
          workDuration: '8h 30m',
          attendanceStatus: 'Normal'
        },
        {
          employeeId: 'EMP001', 
          employeeName: 'John Doe',
          punchTime: '2025-11-26T17:00:00.000Z',
          direction: 'out',
          date: '2025-11-26',
          workDuration: '8h 30m',
          attendanceStatus: 'Normal'
        }
      ],
      date: '2025-11-26'
    };

    const response = await axios.post('http://localhost:5003/api/access/save-hikvision-attendance', testData);
    
    console.log('✅ Save endpoint response:', response.data);
    
    if (response.data.success) {
      console.log(`✅ Successfully saved ${response.data.savedCount} records`);
      console.log('📋 Saved records:', response.data.savedRecords);
    }
    
  } catch (error) {
    console.error('❌ Error testing save endpoint:', error.response?.data || error.message);
  }
}

// Test the endpoint
testSaveEndpoint();