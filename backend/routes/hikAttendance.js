const express = require('express');
const router = express.Router();
const axios = require('axios');

// Use your working Hikvision API
const WORKING_HIKVISION_API = 'https://192.168.1.131/artemis-web/api/attendance/v1/report';

// Get Hikvision attendance data - Using your working API
router.get('/attendance-data', async (req, res) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    
    console.log('🎯 Fetching from working Hikvision API...');
    console.log('📅 Date:', startDate);
    
    // Use the date that works
    const dateToUse = startDate || "2025-11-26";
    
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
    
    console.log('📤 Sending to working API:', WORKING_HIKVISION_API);
    
    // Call your working API
    const response = await axios.post(WORKING_HIKVISION_API, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ Working API response received');
    
    // Extract records from the response structure
    const records = response.data.data?.data?.record || response.data.data?.record || [];
    console.log(`📊 Raw records received: ${records.length}`);
    
    if (records.length > 0) {
      console.log('First raw record:', {
        employeeId: records[0].personInfo?.personCode,
        name: records[0].personInfo?.fullName,
        date: records[0].date
      });
    }
    
    // Transform the data to match your frontend format
    const attendanceData = records.map((record, index) => {
      const personInfo = record.personInfo || {};
      const attendanceInfo = record.attendanceBaseInfo || {};
      
      const transformedRecord = {
        _id: `hik_${personInfo.personID}_${record.date}_${index}`,
        employeeId: personInfo.personCode || personInfo.personID || `EMP_${index}`,
        employeeName: personInfo.fullName || 'Unknown Employee',
        date: record.date || dateToUse,
        punchTime: attendanceInfo.beginTime || record.punchTime || new Date().toISOString(),
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
        actualEndTime: attendanceInfo.endTime
      };
      
      console.log(`✅ Transformed record ${index + 1}:`, {
        employeeId: transformedRecord.employeeId,
        employeeName: transformedRecord.employeeName,
        checkIn: transformedRecord.actualBeginTime,
        checkOut: transformedRecord.actualEndTime
      });
      
      return transformedRecord;
    });
    
    console.log(`🎉 Successfully transformed ${attendanceData.length} records`);
    
    res.json({
      success: true,
      attendance: attendanceData,
      total: attendanceData.length,
      rawCount: records.length,
      message: `Found ${attendanceData.length} attendance records`
    });
    
  } catch (error) {
    console.error('💥 Error calling working Hikvision API:', error.message);
    console.error('Error details:', error.response?.data || error.message);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch attendance data from Hikvision'
    });
  }
});

// Test connection to working API
router.get('/status', async (req, res) => {
  try {
    const testBody = {
      attendanceReportRequest: {
        pageNo: 1, 
        pageSize: 300
      }
    };
    
    const response = await axios.post(WORKING_HIKVISION_API, testBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    res.json({
      success: true,
      connected: true,
      deviceInfo: {
        status: 'connected',
        lastChecked: new Date().toISOString(),
        source: 'Working Hikvision API'
      }
    });
  } catch (error) {
    console.error('Status check failed:', error.message);
    res.json({
      success: false,
      connected: false,
      error: error.message
    });
  }
});

// Sync data from working API
router.post('/pull-events', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const dateToUse = startDate || "2025-11-26";
    
    const requestBody = {
      attendanceReportRequest: {
        pageNo: 1,
        pageSize: 300,
        queryInfo: {
          personID: [],
          beginTime: `${dateToUse}T00:00:00+08:00`,
          endTime: `${dateToUse}T23:59:59+08:00`
        }
      }
    };
    
    console.log('🔄 Pulling events from working API...');
    const response = await axios.post(WORKING_HIKVISION_API, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const records = response.data.data?.data?.record || response.data.data?.record || [];
    
    res.json({
      success: true,
      message: 'Hikvision data pulled successfully',
      savedCount: records.length,
      count: records.length,
      data: records
    });
    
  } catch (error) {
    console.error('Pull events error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to pull Hikvision events',
      error: error.message
    });
  }
});

// Direct proxy to working API (for testing)
router.post('/proxy', async (req, res) => {
  try {
    console.log('🔀 Proxying request to working API...');
    
    const response = await axios.post(WORKING_HIKVISION_API, req.body, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    res.json({
      success: true,
      data: response.data
    });
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoint with your working API
router.get('/test-working-api', async (req, res) => {
  try {
    const { date = "2025-11-26" } = req.query;
    
    console.log('🧪 Testing working API with date:', date);
    
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
    
    const response = await axios.post(WORKING_HIKVISION_API, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const records = response.data.data?.data?.record || response.data.data?.record || [];
    
    res.json({
      success: true,
      workingApi: WORKING_HIKVISION_API,
      recordCount: records.length,
      rawResponse: response.data,
      message: `Working API test successful - found ${records.length} records`
    });
    
  } catch (error) {
    console.error('Working API test failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Hikvision API is working',
    workingApi: WORKING_HIKVISION_API,
    timestamp: new Date().toISOString()
  });
});

// ============ HELPER FUNCTIONS ============

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

function formatDuration(seconds) {
  if (!seconds) return "-";
  const totalSeconds = parseInt(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

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
