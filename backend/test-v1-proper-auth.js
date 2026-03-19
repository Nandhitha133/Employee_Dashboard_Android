require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const { v4: uuidv4 } = require('uuid');

// Replicate the hikArtemisProxy function from hikEvents.js
async function hikArtemisProxy(bodyObj = {}, uri = "/artemis/api/acs/v1/events") {
  const bodyString = JSON.stringify(bodyObj);
  const timestamp = `${Date.now()}`;
  const nonce = uuidv4();
  const method = "POST";
  const accept = "application/json";
  const contentType = "application/json";
  
  // Create MD5 hash of body
  const contentMD5 = crypto.createHash('md5').update(bodyString).digest('base64');

  const canonicalHeaders = 
    `x-ca-key:${process.env.HIK_KEY}\n` + 
    `x-ca-nonce:${nonce}\n` + 
    `x-ca-timestamp:${timestamp}`;

  const stringToSign = 
    `${method}\n${accept}\n${contentMD5}\n${contentType}\n${canonicalHeaders}\n${uri}`;

  const signature = crypto
    .createHmac('sha256', process.env.HIK_SECRET)
    .update(stringToSign)
    .digest('base64');

  const headers = {
    Accept: accept,
    "Content-Type": contentType,
    "Content-MD5": contentMD5,
    "x-ca-key": process.env.HIK_KEY,
    "x-ca-timestamp": timestamp,
    "x-ca-nonce": nonce,
    "x-ca-signature-headers": "x-ca-key,x-ca-nonce,x-ca-timestamp",
    "x-ca-signature": signature
  };

  const url = `${process.env.HIK_HOST}${uri}`;
  const agent = new https.Agent({ rejectUnauthorized: false });

  const response = await axios.post(url, bodyString, {
    headers,
    timeout: 30000,
    httpsAgent: agent
  });

  return response.data;
}

async function testV1WithProperAuth() {
  console.log("Testing v1 attendance report with proper Artemis authentication...\n");
  
  // Test different parameter formats
  const testCases = [
    {
      name: "Standard pagination",
      body: { pageNo: 1, pageSize: 10 }
    },
    {
      name: "Empty request",
      body: {}
    },
    {
      name: "Date range with pagination",
      body: {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
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
      
      const response = await hikArtemisProxy(testCase.body, "/artemis/api/attendance/v1/report");
      
      console.log(`✅ Success!`);
      console.log("Response:", JSON.stringify(response, null, 2));
      
    } catch (error) {
      console.log(`❌ Failed:`, error.message);
      if (error.response?.data) {
        console.log("Error response:", JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log("\n" + "=".repeat(60) + "\n");
  }
}

// Run the test
testV1WithProperAuth().catch(console.error);