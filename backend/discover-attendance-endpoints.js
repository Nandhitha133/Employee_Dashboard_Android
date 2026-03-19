require('dotenv').config();
const { hikPost } = require("./utils/hikvision");

async function discoverAttendanceEndpoints() {
  console.log("Discovering available attendance endpoints...\n");
  
  // List of potential attendance-related endpoints
  const endpoints = [
    "/artemis/api/attendance/v1/report",
    "/artemis/api/attendance/v1/records",
    "/artemis/api/attendance/v1/record",
    "/artemis/api/attendance/v1/list",
    "/artemis/api/attendance/v1/search",
    "/artemis/api/attendance/v1/query",
    "/artemis/api/acs/v1/attendance",
    "/artemis/api/acs/v1/attendance/record",
    "/artemis/api/acs/v1/attendance/report",
    "/artemis/api/acs/v1/events/attendance",
    "/artemis/api/resource/v1/attendance",
    "/artemis/api/attendance/v2/report",
    "/artemis/api/attendance/v2/records",
    "/artemis/api/attendance/v2/record"
  ];
  
  const testBody = {
    pageNo: 1,
    pageSize: 10
  };
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      
      const response = await hikPost(endpoint, testBody);
      
      console.log(`✅ Endpoint exists!`);
      console.log("Response code:", response?.code);
      console.log("Response message:", response?.msg);
      
      if (response?.data) {
        console.log("Data available:", !!response.data);
        if (response.data.list) {
          console.log("List length:", response.data.list.length);
        }
      }
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`❌ Endpoint not found (404)`);
      } else if (error.response?.data?.code === "0x0240104b") {
        console.log(`❌ API URL error - endpoint doesn't exist`);
      } else if (error.response?.data?.code === 2) {
        console.log(`⚠️  Endpoint exists but parameter error:`, error.response.data.msg);
      } else {
        console.log(`❌ Other error:`, error.message);
      }
    }
    
    console.log("\n" + "-".repeat(60) + "\n");
  }
}

// Run the discovery
discoverAttendanceEndpoints().catch(console.error);