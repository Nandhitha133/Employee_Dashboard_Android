require('dotenv').config();
const { hikPost } = require("./utils/hikvision");

async function testAttendanceAPIVersions() {
  console.log("Testing Hikvision Attendance API versions...\n");
  
  // Test both v1 and v2 endpoints
  const endpoints = [
    "/artemis/api/attendance/v1/report",
    "/artemis/api/attendance/v2/report"
  ];
  
  const requestBody = {
    pageNo: 1,
    pageSize: 10
  };
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      console.log("Request body:", JSON.stringify(requestBody, null, 2));
      
      const response = await hikPost(endpoint, requestBody);
      
      console.log(`✅ Success for ${endpoint}`);
      console.log("Response structure:");
      console.log("- Status:", response?.code || "N/A");
      console.log("- Message:", response?.msg || "N/A");
      console.log("- Data available:", !!response?.data);
      
      if (response?.data) {
        console.log("- Data structure:");
        console.log("  - Total:", response.data.total);
        console.log("  - PageNo:", response.data.pageNo);
        console.log("  - PageSize:", response.data.pageSize);
        console.log("  - List length:", response.data.list?.length || 0);
        
        if (response.data.list && response.data.list.length > 0) {
          console.log("  - Sample record structure:");
          const sample = response.data.list[0];
          console.log("    Sample keys:", Object.keys(sample));
          console.log("    Sample data:", JSON.stringify(sample, null, 2));
        }
      }
      
      console.log("\n" + "=".repeat(60) + "\n");
      
    } catch (error) {
      console.log(`❌ Failed for ${endpoint}:`, error.message);
      if (error.response?.data) {
        console.log("Error response:", JSON.stringify(error.response.data, null, 2));
      }
      console.log("\n" + "=".repeat(60) + "\n");
    }
  }
}

// Run the test
testAttendanceAPIVersions().catch(console.error);