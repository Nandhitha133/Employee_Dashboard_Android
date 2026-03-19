const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const auth = require("../middleware/auth");

// Get all attendance logs for the authenticated user
router.get("/my-logs", auth, async (req, res) => {
  try {
    const { direction, startDate, endDate } = req.query;
    
    // Build query
    const query = { employeeId: req.user._id.toString() };
    
    if (direction && direction !== "all") {
      query.direction = direction;
    }
    
    if (startDate || endDate) {
      query.punchTime = {};
      if (startDate) {
        query.punchTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.punchTime.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }
    
    const logs = await Attendance.find(query).sort({ punchTime: -1 });
    
    res.json(logs);
  } catch (error) {
    console.error("Error fetching attendance logs:", error);
    res.status(500).json({ 
      message: "Error fetching attendance logs", 
      error: error.message 
    });
  }
});

// Create new attendance record
router.post("/punch", auth, async (req, res) => {
  try {
    const { direction, deviceId } = req.body;
    
    if (!direction || !["in", "out"].includes(direction)) {
      return res.status(400).json({ 
        message: "Direction is required and must be 'in' or 'out'" 
      });
    }
    
    const attendance = new Attendance({
      employeeId: req.user._id.toString(),
      name: req.user.name,
      direction,
      punchTime: new Date(),
      deviceId: deviceId || "web",
      source: "manual"
    });
    
    await attendance.save();
    
    res.status(201).json({
      message: "Attendance recorded successfully",
      attendance
    });
  } catch (error) {
    console.error("Error creating attendance record:", error);
    res.status(500).json({ 
      message: "Error recording attendance", 
      error: error.message 
    });
  }
});

// Get attendance logs by employee ID (for managers/admins)
router.get("/employee/:employeeId", auth, async (req, res) => {
  try {
    // Check if user has permission to view other employees' logs
    if (req.user.role !== "admin" && req.user.role !== "projectmanager") {
      return res.status(403).json({ 
        message: "Access denied. Insufficient permissions." 
      });
    }
    
    const { employeeId } = req.params;
    const { direction, startDate, endDate } = req.query;
    
    // Build query
    const query = { employeeId };
    
    if (direction && direction !== "all") {
      query.direction = direction;
    }
    
    if (startDate || endDate) {
      query.punchTime = {};
      if (startDate) {
        query.punchTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.punchTime.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }
    
    const logs = await Attendance.find(query).sort({ punchTime: -1 });
    
    res.json(logs);
  } catch (error) {
    console.error("Error fetching employee attendance logs:", error);
    res.status(500).json({ 
      message: "Error fetching attendance logs", 
      error: error.message 
    });
  }
});

// Get attendance statistics
router.get("/stats", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const query = { employeeId: req.user._id.toString() };
    
    if (startDate || endDate) {
      query.punchTime = {};
      if (startDate) {
        query.punchTime.$gte = new Date(startDate);
      }
      if (endDate) {
        query.punchTime.$lte = new Date(endDate + "T23:59:59.999Z");
      }
    }
    
    const stats = await Attendance.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$direction",
          count: { $sum: 1 }
        }
      }
    ]);
    
    const result = {
      total: 0,
      in: 0,
      out: 0
    };
    
    stats.forEach(stat => {
      result[stat._id] = stat.count;
      result.total += stat.count;
    });
    
    res.json(result);
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    res.status(500).json({ 
      message: "Error fetching attendance statistics", 
      error: error.message 
    });
  }
});

/**
 * -----------------------------------------
 *  GET ALL LOGS WITH FILTERS (Admin/Manager)
 * -----------------------------------------
 */
router.get("/logs", auth, async (req, res) => {
  try {
    // Check if user has permission to view all employee logs
    if (req.user.role !== "admin" && req.user.role !== "projectmanager") {
      return res.status(403).json({ 
        message: "Access denied. Insufficient permissions." 
      });
    }

    const { startDate, endDate, employeeId, employeeName } = req.query;

    const filter = {};

    if (employeeId) filter.employeeId = employeeId;
    if (employeeName) filter.employeeName = employeeName;

    if (startDate || endDate) {
      filter.punchTime = {};
      if (startDate) filter.punchTime.$gte = new Date(startDate);
      if (endDate) filter.punchTime.$lte = new Date(endDate + "T23:59:59.999Z");
    }

    const logs = await Attendance.find(filter).sort({ punchTime: -1 });
    res.json(logs);

  } catch (err) {
    console.error("Logs fetch error:", err);
    res.status(500).json({ message: "Error fetching logs" });
  }
});

/**
 * -----------------------------------------
 *  GET UNIQUE EMPLOYEES FROM ATTENDANCE
 * -----------------------------------------
 */
router.get("/employees", auth, async (req, res) => {
  try {
    // Check if user has permission to view employee data
    if (req.user.role !== "admin" && req.user.role !== "projectmanager") {
      return res.status(403).json({ 
        message: "Access denied. Insufficient permissions." 
      });
    }

    const employees = await Attendance.aggregate([
      {
        $group: {
          _id: "$employeeId",
          name: { $first: "$employeeName" },
        },
      },
    ]);

    res.json(
      employees.map((e) => ({
        id: e._id,
        name: e.name,
      }))
    );

  } catch (err) {
    console.error("Employee fetch error:", err);
    res.status(500).json({ message: "Error fetching employees" });
  }
});

router.post("/save-hikvision-attendance", async (req, res) => {
  try {
    const { attendanceData } = req.body || {};
    let items = [];

    if (Array.isArray(attendanceData)) {
      items = attendanceData;
    } else if (req.body?.data?.data?.record) {
      const records = req.body.data.data.record || [];
      for (const r of records) {
        const empId = r.personInfo?.personCode || r.personInfo?.personID;
        const empName = r.personInfo?.givenName || r.personInfo?.fullName || "";
        const begin = r.attendanceBaseInfo?.beginTime;
        const end = r.attendanceBaseInfo?.endTime;
        if (begin) {
          items.push({ employeeId: empId, employeeName: empName, punchTime: begin, direction: "in" });
        }
        if (end) {
          items.push({ employeeId: empId, employeeName: empName, punchTime: end, direction: "out" });
        }
      }
    } else {
      return res.status(400).json({ success: false, message: "No attendance data provided" });
    }

    let savedCount = 0;
    const savedRecords = [];

    for (const item of items) {
      if (!item?.employeeId || !item?.punchTime || !item?.direction) continue;
      const punchDate = new Date(item.punchTime);
      const exists = await Attendance.findOne({ employeeId: item.employeeId, punchTime: punchDate, direction: item.direction });
      if (exists) continue;
      const record = await Attendance.create({
        employeeId: item.employeeId,
        name: item.employeeName || "",
        punchTime: punchDate,
        direction: item.direction,
        deviceId: item.deviceId || "hik",
        source: "hikvision"
      });
      savedCount++;
      savedRecords.push(record);
    }

    res.json({ success: true, savedCount, savedRecords });
  } catch (error) {
    console.error("Save Hikvision Attendance Error:", error);
    res.status(500).json({ success: false, message: "Failed to save Hikvision attendance", error: error.message });
  }
});

// Temporary endpoint — update later with real logic
router.get("/", (req, res) => {
  res.json({ success: true, message: "Access Routes Working" });
});

module.exports = router;
