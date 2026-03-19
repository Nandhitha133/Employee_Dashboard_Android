const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// Hikvision configuration
const HIK_BASE_URL = process.env.HIK_BASE_URL;
const HIK_APP_KEY = process.env.HIK_APP_KEY;
const HIK_APP_SECRET = process.env.HIK_APP_SECRET;

// Generate authentication headers
function generateAuthHeaders(method, path) {
  const now = Date.now().toString();
  
  const cleanPath = path.split('?')[0];
  const signString = `POST\n*/*\napplication/json\nx-ca-key:${HIK_APP_KEY}\nx-ca-timestamp:${now}\n${cleanPath}`;
  
  const signature = crypto.createHmac('sha256', HIK_APP_SECRET)
    .update(signString)
    .digest('base64');
  
  return {
    'Accept': '*/*',
    'Content-Type': 'application/json',
    'x-ca-key': HIK_APP_KEY,
    'x-ca-timestamp': now,
    'x-ca-signature': signature,
    'x-ca-signature-headers': 'x-ca-key,x-ca-timestamp'
  };
}

// Main proxy function
async function hikArtemisProxy(requestBody, uri, method = 'POST') {
  try {
    const fullUrl = `${HIK_BASE_URL}${uri}`;
    const headers = generateAuthHeaders(method, uri);
    
    console.log('=== HIKVISION API REQUEST ===');
    console.log(`URL: ${fullUrl}`);
    console.log('Headers:', headers);
    console.log('Request Body:', JSON.stringify(requestBody, null, 2));
    
    const config = {
      method: method,
      url: fullUrl,
      headers: headers,
      data: requestBody,
      timeout: 30000,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    };
    
    const response = await axios(config);
    
    console.log('=== HIKVISION API RESPONSE ===');
    console.log(`Status: ${response.status}`);
    console.log('Response Data Structure:', Object.keys(response.data));
    console.log('=== END HIKVISION API CALL ===');
    
    return response.data;
  } catch (error) {
    console.log('=== HIKVISION API ERROR ===');
    if (error.response) {
      console.log('Response Error:', error.response.status);
      console.log('Response Data:', error.response.data);
    } else if (error.request) {
      console.log('No Response Received:', error.request);
    } else {
      console.log('Request Setup Error:', error.message);
    }
    
    if (error.response) {
      throw new Error(`Hikvision API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('No response received from Hikvision API');
    } else {
      throw new Error(`Request setup error: ${error.message}`);
    }
  }
}

// ============ HIKVISION ENDPOINTS ============

// Get Hikvision attendance data - FIXED VERSION
router.get('/attendance-data', async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    
    console.log('📥 Received request with params:', { startDate, endDate, employeeId });
    
    // Use current date instead of future date
    const dateToUse = startDate || new Date().toISOString().split('T')[0];
    
    const requestBody = {
      attendanceReportRequest: {
        pageNo: 1,
        pageSize: 300,
        queryInfo: {
          personID: employeeId ? [employeeId] : [],
          beginTime: `${dateToUse}T00:00:00+08:00`,
          endTime: `${dateToUse}T23:59:59+08:00`,
          sortInfo: {
            sortField: 1,
            sortType: 1
          }
        }
      }
    };
    
    console.log('📤 Sending request to Hikvision...');
    const response = await hikArtemisProxy(requestBody, "/artemis/api/attendance/v1/report");
    
    // FIX: Check the correct response structure
    if (response.code === "0" || response.code === 0) {
      // Extract records from the correct location in response
      const records = response.data?.record || response.record || [];
      console.log('✅ Hikvision response successful, records found:', records.length);
      console.log('📊 Records structure:', records.length > 0 ? Object.keys(records[0]) : 'No records');
      
      // Transform data for frontend
      const attendanceData = records.map((record, index) => {
        const personInfo = record.personInfo || {};
        const attendanceInfo = record.attendanceBaseInfo || {};
        
        console.log(`👤 Processing record ${index + 1}:`, {
          employeeId: personInfo.personCode,
          name: personInfo.fullName,
          checkIn: attendanceInfo.beginTime,
          checkOut: attendanceInfo.endTime
        });
        
        return {
          _id: `hik_${personInfo.personID}_${record.date}_${index}`,
          employeeId: personInfo.personCode || personInfo.personID || 'N/A',
          employeeName: personInfo.fullName || 'Unknown',
          date: record.date,
          punchTime: attendanceInfo.beginTime || record.date,
          endTime: attendanceInfo.endTime,
          direction: 'in',
          source: 'hikvision',
          workDuration: calculateHikvisionWorkDuration(record),
          attendanceStatus: getAttendanceStatusText(attendanceInfo.attendanceStatus),
          lateDuration: formatDuration(record.lateInfo?.durationTime),
          earlyDuration: formatDuration(record.earlyInfo?.durationTime),
          normalDuration: formatDuration(record.normalInfo?.durationTime),
          planBeginTime: record.planInfo?.planBeginTime,
          planEndTime: record.planInfo?.planEndTime,
          actualBeginTime: attendanceInfo.beginTime,
          actualEndTime: attendanceInfo.endTime,
          // Include raw data for debugging
          rawRecord: record
        };
      });
      
      console.log(`🎯 Sending ${attendanceData.length} transformed records to frontend`);
      
      res.json({
        success: true,
        attendance: attendanceData,
        total: attendanceData.length,
        rawCount: records.length,
        debug: {
          responseKeys: Object.keys(response),
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : [],
          recordCount: records.length
        }
      });
    } else {
      console.log('❌ Hikvision API error:', response.msg);
      res.status(400).json({
        success: false,
        message: response.msg,
        code: response.code
      });
    }
    
  } catch (error) {
    console.error('💥 Error in attendance-data endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to see raw response structure
router.get('/debug-response', async (req, res) => {
  try {
    const { date = "2025-11-26" } = req.query;
    
    const requestBody = {
      attendanceReportRequest: {
        pageNo: 1,
        pageSize: 300,
        queryInfo: {
          beginTime: `${date}T00:00:00+08:00`,
          endTime: `${date}T23:59:59+08:00`
        }
      }
    };
    
    const response = await hikArtemisProxy(requestBody, "/artemis/api/attendance/v1/report");
    
    // Analyze response structure
    const analysis = {
      responseKeys: Object.keys(response),
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      recordCount: response.data?.record?.length || 0,
      recordStructure: response.data?.record?.[0] ? Object.keys(response.data.record[0]) : [],
      fullResponse: response
    };
    
    res.json({
      success: true,
      analysis: analysis
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test Hikvision connection
router.get('/status', async (req, res) => {
  try {
    const testBody = {
      attendanceReportRequest: {
        pageNo: 1, 
        pageSize: 300
      }
    };
    
    const response = await hikArtemisProxy(testBody, "/artemis/api/attendance/v1/report");
    
    res.json({
      success: true,
      connected: true,
      deviceInfo: {
        status: 'connected',
        lastChecked: new Date().toISOString()
      }
    });
  } catch (error) {
    res.json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

// POST /api/hik/pull-events - Pull events from Hikvision
router.post('/pull-events', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const dateToUse = startDate || new Date().toISOString().split('T')[0];
    
    const requestBody = {
      attendanceReportRequest: {
        pageNo: 1,
        pageSize: 300,
        queryInfo: {
          personID: [],
          beginTime: `${dateToUse}T00:00:00+08:00`,
          endTime: `${dateToUse}T23:59:59+08:00`,
          sortInfo: {
            sortField: 1,
            sortType: 1
          }
        }
      }
    };
    
    console.log('Pulling Hikvision events...');
    const response = await hikArtemisProxy(requestBody, "/artemis/api/attendance/v1/report");
    
    if (response.code === "0" || response.code === 0) {
      const records = response.data?.record || response.record || [];
      const savedCount = records.length;
      
      res.json({
        success: true,
        message: 'Hikvision data pulled successfully',
        savedCount: savedCount,
        count: savedCount,
        data: response
      });
    } else {
      res.status(400).json({
        success: false,
        message: response.msg,
        code: response.code
      });
    }
    
  } catch (error) {
    console.error('Hikvision pull events error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to pull Hikvision events',
      error: error.message
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hikvision API is working',
    baseUrl: HIK_BASE_URL,
    timestamp: new Date().toISOString()
  });
});

// ============ HELPER FUNCTIONS ============

// Calculate work duration from Hikvision data
function calculateHikvisionWorkDuration(record) {
  if (record.normalInfo?.durationTime) {
    const totalSeconds = parseInt(record.normalInfo.durationTime);
    if (!isNaN(totalSeconds) && totalSeconds > 0) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }

  const collections = [
    record.detailInfoList,
    record.attendanceDetailInfo,
    record.attendanceDetailList,
    record.attendanceDetails,
    record.segmentList,
    record.segments,
    record.attendanceRecordList
  ].filter(Array.isArray);

  if (collections.length > 0) {
    let totalMs = 0;
    for (const list of collections) {
      for (const item of list) {
        const start = new Date(item.beginTime || item.startTime || item.inTime || item.checkInTime || item.begin || item.start);
        const end = new Date(item.endTime || item.finishTime || item.outTime || item.checkOutTime || item.end || item.finish);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start) {
          totalMs += end.getTime() - start.getTime();
        }
      }
    }
    if (totalMs > 0) {
      const hours = Math.floor(totalMs / 3600000);
      const minutes = Math.floor((totalMs % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    }
  }

  if (record.attendanceBaseInfo?.beginTime && record.attendanceBaseInfo?.endTime) {
    const beginTime = new Date(record.attendanceBaseInfo.beginTime);
    const endTime = new Date(record.attendanceBaseInfo.endTime);
    const diffMs = endTime - beginTime;
    if (diffMs > 0) {
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    }
  }

  return "-";
}

// Format duration from seconds to readable format
function formatDuration(seconds) {
  if (!seconds) return "-";
  const totalSeconds = parseInt(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// Get attendance status text
function getAttendanceStatusText(statusCode) {
  const statusMap = {
    '3': 'Normal',
    '5': 'Late & Early',
    '1': 'Absent',
    '2': 'Leave'
  };
  return statusMap[statusCode] || `Status ${statusCode}`;
}

module.exports = router;
