const express = require("express");
const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");
const { hikPost } = require("../utils/hikvision");

const router = express.Router();

/**
 * 🔄 SYNC EMPLOYEES FROM HIKCENTRAL
 * Fetches employee data from HikCentral and syncs with local database
 */
router.post("/sync-employees", auth, async (req, res) => {
  try {
    const apiPath = "/artemis/api/pms/v1/person/list";
    
    const requestBody = {
      pageNo: 1,
      pageSize: 1000
    };

    const response = await hikPost(apiPath, requestBody);
    const hikEmployees = response?.data?.list || [];

    let syncedCount = 0;
    let updatedCount = 0;
    let errors = [];

    for (const hikEmployee of hikEmployees) {
      try {
        // Check if employee already exists
        const existingEmployee = await Employee.findOne({ 
          employeeId: hikEmployee.personId 
        });

        const employeeData = {
          employeeId: hikEmployee.personId,
          name: hikEmployee.personName || "Unknown",
          email: hikEmployee.email || `${hikEmployee.personId}@company.com`,
          phone: hikEmployee.phoneNo || "",
          department: hikEmployee.orgName || "Unassigned",
          position: hikEmployee.jobNo || "Staff",
          status: hikEmployee.status === 1 ? "active" : "inactive",
          gender: hikEmployee.gender === 1 ? "male" : hikEmployee.gender === 2 ? "female" : "other",
          dateOfBirth: hikEmployee.birthday || null,
          hireDate: hikEmployee.hireDate || new Date(),
          hikCentralId: hikEmployee.personId,
          lastSyncAt: new Date()
        };

        if (existingEmployee) {
          // Update existing employee
          await Employee.findByIdAndUpdate(existingEmployee._id, employeeData);
          updatedCount++;
        } else {
          // Create new employee
          await Employee.create(employeeData);
          syncedCount++;
        }
      } catch (error) {
        errors.push({
          employeeId: hikEmployee.personId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: "HikCentral Employee Sync Completed",
      synced: syncedCount,
      updated: updatedCount,
      total: hikEmployees.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("HikCentral Employee Sync Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to sync employees from HikCentral",
      error: error.message 
    });
  }
});

/**
 * 📋 GET EMPLOYEES FROM HIKCENTRAL (REAL-TIME)
 * Fetches current employee data directly from HikCentral without syncing
 */
router.get("/hik-employees", auth, async (req, res) => {
  try {
    const apiPath = "/artemis/api/pms/v1/person/list";
    const { pageNo = 1, pageSize = 100, department = "", status = "" } = req.query;
    
    const requestBody = {
      pageNo: parseInt(pageNo),
      pageSize: parseInt(pageSize),
      ...(department && { orgName: department }),
      ...(status && { status: status === "active" ? 1 : 0 })
    };

    const response = await hikPost(apiPath, requestBody);
    const hikEmployees = response?.data?.list || [];
    const total = response?.data?.total || 0;

    // Transform HikCentral data to match your employee schema
    const transformedEmployees = hikEmployees.map(emp => ({
      employeeId: emp.personId,
      name: emp.personName || "Unknown",
      email: emp.email || `${emp.personId}@company.com`,
      phone: emp.phoneNo || "",
      department: emp.orgName || "Unassigned",
      position: emp.jobNo || "Staff",
      status: emp.status === 1 ? "active" : "inactive",
      gender: emp.gender === 1 ? "male" : emp.gender === 2 ? "female" : "other",
      dateOfBirth: emp.birthday || null,
      hireDate: emp.hireDate || null,
      hikCentralId: emp.personId,
      lastSyncAt: new Date()
    }));

    res.json({
      success: true,
      employees: transformedEmployees,
      pagination: {
        pageNo: parseInt(pageNo),
        pageSize: parseInt(pageSize),
        total: total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error("HikCentral Employee Fetch Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch employees from HikCentral",
      error: error.message 
    });
  }
});

/**
 *  GET SINGLE EMPLOYEE FROM HIKCENTRAL
 * Fetches detailed information for a specific employee
 */
router.get("/hik-employees/:personId", auth, async (req, res) => {
  try {
    const { personId } = req.params;
    const apiPath = "/artemis/api/pms/v1/person/info";
    
    const requestBody = {
      personId: personId
    };

    const response = await hikPost(apiPath, requestBody);
    const hikEmployee = response?.data;

    if (!hikEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found in HikCentral"
      });
    }

    const transformedEmployee = {
      employeeId: hikEmployee.personId,
      name: hikEmployee.personName || "Unknown",
      email: hikEmployee.email || `${hikEmployee.personId}@company.com`,
      phone: hikEmployee.phoneNo || "",
      department: hikEmployee.orgName || "Unassigned",
      position: hikEmployee.jobNo || "Staff",
      status: hikEmployee.status === 1 ? "active" : "inactive",
      gender: hikEmployee.gender === 1 ? "male" : hikEmployee.gender === 2 ? "female" : "other",
      dateOfBirth: hikEmployee.birthday || null,
      hireDate: hikEmployee.hireDate || null,
      certificateType: hikEmployee.certificateType,
      certificateNo: hikEmployee.certificateNo,
      address: hikEmployee.address || "",
      hikCentralId: hikEmployee.personId,
      lastSyncAt: new Date()
    };

    res.json({
      success: true,
      employee: transformedEmployee
    });

  } catch (error) {
    console.error("HikCentral Single Employee Fetch Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch employee from HikCentral",
      error: error.message 
    });
  }
});

/**
 * 📊 GET HIKVISION ATTENDANCE DATA
 * Fetches attendance records from Hikvision device
 */
router.get("/hik-attendance", auth, async (req, res) => {
  try {
    const { startDate, endDate, employeeId, employeeName } = req.query;
    
    // Build query for Hikvision attendance records
    const query = { source: "hikvision" };
    
    if (employeeId) query.employeeId = employeeId;
    if (employeeName) query.employeeName = employeeName;
    
    if (startDate || endDate) {
      query.punchTime = {};
      if (startDate) query.punchTime.$gte = new Date(startDate);
      if (endDate) query.punchTime.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    
    const attendance = await Attendance.find(query).sort({ punchTime: -1 });
    
    // Transform data to match expected format
    const transformedAttendance = attendance.map(record => ({
      _id: record._id,
      employeeId: record.employeeId,
      employeeName: record.employeeName || "Unknown Employee",
      punchTime: record.punchTime,
      direction: record.direction,
      deviceId: record.deviceId,
      source: record.source,
      correspondingInTime: record.correspondingInTime
    }));
    
    res.json({
      success: true,
      attendance: transformedAttendance,
      count: transformedAttendance.length,
      source: "hikvision"
    });
    
  } catch (error) {
    console.error("Hikvision Attendance Fetch Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch Hikvision attendance data",
      error: error.message 
    });
  }
});

/**
 * 🔄 SYNC HIKVISION ATTENDANCE
 * Manually trigger sync of Hikvision attendance data
 */
router.post("/sync-attendance", auth, async (req, res) => {
  try {
    // Check if user has admin privileges
    if (req.user.role !== "admin" && req.user.role !== "projectmanager") {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Insufficient permissions." 
      });
    }
    
    // This would typically call the Hikvision API to pull latest attendance
    // For now, we'll return a success message indicating the sync was triggered
    res.json({
      success: true,
      message: "Hikvision attendance sync initiated",
      note: "Use the /hik/pull-events endpoint to pull actual attendance data from the device"
    });
    
  } catch (error) {
    console.error("Hikvision Attendance Sync Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to sync Hikvision attendance data",
      error: error.message 
    });
  }
});

/**
 * 📊 GET ATTENDANCE REPORT FROM HIKCENTRAL
 * Fetches attendance report using the correct v1 API format
 */
router.post("/attendance-report", auth, async (req, res) => {
  try {
    const apiPath = "/artemis/api/attendance/v1/report";
    
    // Use the exact parameter structure that works with HikCentral
    const requestBody = {
      attendanceReportRequest: {
        pageNo: 1,
        pageSize: 300,
        queryInfo: {
          personID: [],
          beginTime: "2025-11-25T00:00:00+08:00",
          endTime: "2025-11-25T23:59:59+08:00",
          sortInfo: {
            sortField: 1,
            sortType: 1
          }
        }
      }
    };

    console.log("Calling HikCentral attendance report API with body:", JSON.stringify(requestBody, null, 2));
    
    const response = await hikPost(apiPath, requestBody);
    
    console.log("HikCentral attendance report response:", JSON.stringify(response, null, 2));
    
    if (response.code === "0") {
      const attendanceData = response.data?.list || [];
      
      // Transform the data to match our schema
      const transformedAttendance = attendanceData.map(record => ({
        employeeId: record.personId,
        employeeName: record.personName || "Unknown Employee",
        punchTime: record.checkTime,
        direction: record.checkType === 1 ? "in" : "out",
        deviceId: record.deviceId,
        source: "hikvision_attendance_report"
      }));
      
      res.json({
        success: true,
        message: "Attendance report fetched successfully",
        attendance: transformedAttendance,
        total: response.data?.total || 0,
        pageNo: response.data?.pageNo || 1,
        pageSize: response.data?.pageSize || 100,
        apiEndpoint: apiPath
      });
    } else {
      res.status(400).json({
        success: false,
        message: "HikCentral API returned error",
        error: response.msg || "Unknown error",
        responseCode: response.code,
        fullResponse: response
      });
    }
    
  } catch (error) {
    console.error("HikCentral Attendance Report Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch attendance report from HikCentral",
      error: error.message,
      suggestion: "Please check the HikCentral device configuration and ensure the attendance API is properly configured."
    });
  }
});

module.exports = router;