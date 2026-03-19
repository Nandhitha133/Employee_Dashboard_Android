const express = require("express");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");
const { hikPost } = require("../utils/hikvision");

const router = express.Router();

/**
 * 🔥 SYNC HIKCENTRAL ATTENDANCE
 * Supports both v1 and v2 attendance report endpoints
 */
router.get("/sync", auth, async (req, res) => {
  try {
    // Determine which API version to use (default to v1 as specified by user)
    const apiVersion = process.env.HIK_ATTENDANCE_API_VERSION || 'v1';
    const apiPath = `/artemis/api/attendance/${apiVersion}/report`;
    
    console.log(`Using Hikvision attendance API: ${apiPath}`);

    // Prepare request body based on API version
    let requestBody = {};
    
    if (apiVersion === 'v1') {
      // For v1, try different parameter formats
      requestBody = {
        // Try without pagination first
      };
    } else {
      // For v2, use standard pagination
      requestBody = {
        pageNo: 1,
        pageSize: 300
      };
    }

    let response;
    let list = [];
    
    try {
      response = await hikPost(apiPath, requestBody);
      list = response?.data?.list || [];
    } catch (error) {
      console.error(`Failed with initial parameters for ${apiVersion}:`, error.message);
      
      if (apiVersion === 'v1') {
        // Try alternative parameter formats for v1
        const alternativeBodies = [
          { pageNo: 0, pageSize: 500 },
          { page: 1, limit: 500 },
          { startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), endTime: new Date().toISOString() },
          {}
        ];
        
        for (const altBody of alternativeBodies) {
          try {
            console.log(`Trying v1 with alternative parameters:`, JSON.stringify(altBody));
            response = await hikPost(apiPath, altBody);
            list = response?.data?.list || [];
            console.log(`✅ Success with alternative parameters!`);
            break;
          } catch (altError) {
            console.log(`Alternative parameters failed:`, altError.message);
            continue;
          }
        }
        
        if (list.length === 0) {
          throw new Error(`All v1 parameter formats failed. The v1 endpoint may require specific parameters.`);
        }
      } else {
        throw error; // Re-throw for v2
      }
    }

    let insertCount = 0;

    for (const item of list) {
      const punchDate = new Date(item.checkTime);
      const direction = item.checkType === 1 ? "in" : "out";

      // Rewrite existing record if it exists (based on exact time), otherwise create new
      // This allows multiple punches per day but prevents duplicates
      await Attendance.findOneAndUpdate(
        {
          employeeId: item.personId,
          punchTime: punchDate
        },
        {
          $set: {
            name: item.personName,
            direction: direction,
            deviceId: item.deviceId,
            source: `hikvision_${apiVersion}`,
            correspondingInTime: null
          }
        },
        { upsert: true, new: true }
      );

      insertCount++;
    }

    res.json({
      success: true,
      message: `HikCentral Sync Completed (API ${apiVersion.toUpperCase()})`,
      inserted: insertCount,
      total: list.length,
      apiVersion: apiVersion,
      endpoint: apiPath
    });

  } catch (err) {
    console.error("Hik Sync Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to sync HikCentral data",
      error: err.message,
      suggestion: "Please check the HIK_ATTENDANCE_API_VERSION environment variable and ensure the correct API version is specified."
    });
  }
});

/**
 * TEST ATTENDANCE API CONNECTION
 * Tests the attendance API connection and returns available endpoints
 */
router.get("/test-attendance-api", auth, async (req, res) => {
  try {
    const apiVersion = process.env.HIK_ATTENDANCE_API_VERSION || 'v1';
    const apiPath = `/artemis/api/attendance/${apiVersion}/report`;
    
    console.log(`Testing Hikvision attendance API: ${apiPath}`);
    
    // Test different parameter formats
    const testBodies = [
      {},
      { pageNo: 1, pageSize: 10 },
      { pageNo: 0, pageSize: 10 },
      { startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), endTime: new Date().toISOString() }
    ];
    
    const results = [];
    
    for (const testBody of testBodies) {
      try {
        const response = await hikPost(apiPath, testBody);
        results.push({
          parameters: testBody,
          success: true,
          responseCode: response?.code,
          responseMessage: response?.msg,
          hasData: !!response?.data,
          dataPreview: response?.data ? {
            total: response.data.total,
            pageNo: response.data.pageNo,
            pageSize: response.data.pageSize,
            listLength: response.data.list?.length
          } : null
        });
      } catch (error) {
        results.push({
          parameters: testBody,
          success: false,
          error: error.message,
          errorResponse: error.response?.data
        });
      }
    }
    
    res.json({
      success: true,
      apiVersion,
      endpoint: apiPath,
      testResults: results,
      recommendation: results.find(r => r.success && r.hasData) ? 
        "Working parameters found!" : 
        "No working parameters found. Try adjusting the API version or check device configuration."
    });
    
  } catch (err) {
    console.error("Test Attendance API Error:", err);
    res.status(500).json({ 
      success: false,
      message: "Failed to test attendance API",
      error: err.message
    });
  }
});

module.exports = router;
