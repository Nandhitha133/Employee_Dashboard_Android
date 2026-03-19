require('dotenv').config();
const { hikPost } = require("./utils/hikvision");

async function testV1Parameters() {
  console.log("Testing different parameter formats for v1 attendance report...\n");
  
  // Test different parameter formats that might work with v1
  const testCases = [
    {
      name: "Current format (pageNo, pageSize)",
      body: { pageNo: 1, pageSize: 10 }
    },
    {
      name: "Zero-based page (pageNo: 0)",
      body: { pageNo: 0, pageSize: 10 }
    },
    {
      name: "Different parameter names (page, limit)",
      body: { page: 1, limit: 10 }
    },
    {
      name: "Camel case (pageNumber, pageSize)",
      body: { pageNumber: 1, pageSize: 10 }
    },
    {
      name: "Without pagination",
      body: {}
    },
    {
      name: "With date range",
      body: {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
        endTime: new Date().toISOString(),
        pageNo: 1,
        pageSize: 10
      }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}`);
      console.log("Request body:", JSON.stringify(testCase.body, null, 2));
      
      const response = await hikPost("/artemis/api/attendance/v1/report", testCase.body);
      
      console.log(`✅ Success!`);
      console.log("Response code:", response?.code);
      console.log("Response message:", response?.msg);
      
      if (response?.data) {
        console.log("Data available:", !!response.data);
        console.log("Data structure:", Object.keys(response.data));
        if (response.data.list) {
          console.log("List length:", response.data.list.length);
        }
      }
      
    } catch (error) {
      console.log(`❌ Failed:`, error.message);
      if (error.response?.data) {
        console.log("Error response:", JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log("\n" + "-".repeat(50) + "\n");
  }
}

// Run the test
testV1Parameters().catch(console.error);