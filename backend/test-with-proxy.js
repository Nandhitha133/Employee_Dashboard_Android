require('dotenv').config();

const { hikArtemisProxy, formatHikvisionDate } = require("./routes/hikEvents");

async function testWithCorrectFormat() {
  console.log("Testing with CORRECT date format...\n");
  
  const now = new Date();
  const beginTime = formatHikvisionDate(new Date(now.setHours(0, 0, 0, 0)));
  const endTime = formatHikvisionDate(new Date(now.setHours(23, 59, 59, 999)));
  
  console.log('Using date format:');
  console.log('Begin Time:', beginTime);
  console.log('End Time:', endTime);
  console.log('');
  
  const testBody = {
    attendanceReportRequest: {
      pageNo: 1,
      pageSize: 10,
      queryInfo: {
        personID: [],
        beginTime: beginTime,
        endTime: endTime,
        sortInfo: {
          sortField: 1,
          sortType: 1
        }
      }
    }
  };
  
  try {
    console.log("🧪 Testing with correct date format");
    console.log("📦 Request body:", JSON.stringify(testBody, null, 2));
    
    const response = await hikArtemisProxy(testBody, "/artemis/api/attendance/v1/report");
    
    if (response.code === "0" || response.code === 0) {
      console.log("✅ SUCCESS! Correct format works!");
      console.log("📊 Response data:", JSON.stringify(response.data, null, 2));
    } else {
      console.log("❌ Failed with code:", response.code);
      console.log("📄 Message:", response.msg);
    }
    
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

// Test different timezones if needed
async function testTimezones() {
  console.log("\nTesting different timezones...\n");
  
  const timezones = ['08:00', '+08:00', '00:00', '+00:00'];
  
  for (const tz of timezones) {
    const now = new Date();
    const beginTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T00:00:00 ${tz}`;
    const endTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T23:59:59 ${tz}`;
    
    const testBody = {
      attendanceReportRequest: {
        pageNo: 1,
        pageSize: 5,
        queryInfo: {
          personID: [],
          beginTime: beginTime,
          endTime: endTime
        }
      }
    };
    
    try {
      console.log(`🧪 Testing timezone: ${tz}`);
      const response = await hikArtemisProxy(testBody, "/artemis/api/attendance/v1/report");
      
      if (response.code === "0" || response.code === 0) {
        console.log(`✅ SUCCESS with timezone: ${tz}`);
        break;
      } else {
        console.log(`❌ Failed with timezone: ${tz} - ${response.msg}`);
      }
    } catch (error) {
      console.log(`❌ Error with timezone ${tz}:`, error.message);
    }
    
    console.log('');
  }
}

// Run tests
testWithCorrectFormat()
  .then(() => testTimezones())
  .catch(console.error);