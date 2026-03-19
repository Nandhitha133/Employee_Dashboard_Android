const express = require("express");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const auth = require("../middleware/auth");

const router = express.Router();

/**
 * 📋 GET ALL ATTENDANCE RECORDS
 */
router.get("/", async (req, res) => {
  try {
    const { employeeId, startDate, endDate, source } = req.query;
    
    const query = {};
    if (employeeId) query.employeeId = employeeId;
    if (source) query.source = source;
    
    if (startDate || endDate) {
      query.punchTime = {};
      if (startDate) query.punchTime.$gte = new Date(startDate);
      if (endDate) query.punchTime.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    
    const attendance = await Attendance.find(query)
      .sort({ punchTime: -1 })
      .limit(1000);
    
    const employeeIds = [...new Set(attendance.map(record => record.employeeId))];
    const employees = await Employee.find({ 
      employeeId: { $in: employeeIds } 
    }).select('employeeId name');
    
    const employeeMap = employees.reduce((map, emp) => {
      map[emp.employeeId] = emp.name;
      return map;
    }, {});
    
    const enrichedAttendance = attendance.map(record => ({
      ...record.toObject(),
      employeeName: record.employeeName || employeeMap[record.employeeId] || "Unknown Employee"
    }));
    
    res.json({
      success: true,
      attendance: enrichedAttendance,
      count: enrichedAttendance.length
    });
    
  } catch (error) {
    console.error("Get Attendance Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch attendance records",
      error: error.message 
    });
  }
});

/**
 * ➕ MANUAL ATTENDANCE ENTRY
 */
router.post("/", async (req, res) => {
  try {
    const { employeeId, direction, punchTime, deviceId, source, correspondingInTime, workDurationSeconds } = req.body;
    
    if (!employeeId || !direction) {
      return res.status(400).json({
        success: false,
        message: "Employee ID and direction are required"
      });
    }
    
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }
    
    const attendanceRecord = await Attendance.create({
      employeeId,
      name: employee.name,
      direction: direction.toLowerCase(),
      punchTime: punchTime ? new Date(punchTime) : new Date(),
      deviceId: deviceId || "manual",
      source: source || "manual",
      correspondingInTime: correspondingInTime ? new Date(correspondingInTime) : undefined,
      workDurationSeconds: typeof workDurationSeconds === "number" ? workDurationSeconds : undefined
    });
    
    res.json({
      success: true,
      message: "Attendance record created successfully",
      attendance: attendanceRecord
    });
    
  } catch (error) {
    console.error("Manual Attendance Entry Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create attendance record",
      error: error.message 
    });
  }
});

/**
 * 📥 SAVE HIKVISION ATTENDANCE
 */
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
        const durationSec =
          Number(r.normalInfo?.durationTime) ||
          Number(r.allDurationTime) ||
          (begin && end ? Math.max(0, (new Date(end) - new Date(begin)) / 1000) : 0);
        if (begin) items.push({ employeeId: empId, employeeName: empName, punchTime: begin, direction: "in" });
        if (end) items.push({ employeeId: empId, employeeName: empName, punchTime: end, direction: "out", workDurationSeconds: durationSec });
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
        source: "hikvision",
        workDurationSeconds: item.workDurationSeconds
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

/**
 * 📊 ATTENDANCE SUMMARY
 */
router.get("/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.punchTime = {};
      if (startDate) matchStage.punchTime.$gte = new Date(startDate);
      if (endDate) matchStage.punchTime.$lte = new Date(endDate + "T23:59:59.999Z");
    }
    
    const summary = await Attendance.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            employeeId: "$employeeId",
            direction: "$direction"
          },
          count: { $sum: 1 },
          lastPunch: { $max: "$punchTime" }
        }
      },
      {
        $group: {
          _id: "$_id.employeeId",
          totalPunches: { $sum: "$count" },
          inCount: {
            $sum: { $cond: [{ $eq: ["$_id.direction", "in"] }, "$count", 0] }
          },
          outCount: {
            $sum: { $cond: [{ $eq: ["$_id.direction", "out"] }, "$count", 0] }
          },
          lastPunch: { $max: "$lastPunch" }
        }
      },
      { $sort: { lastPunch: -1 } }
    ]);
    
    const employeeIds = summary.map(item => item._id);
    const employees = await Employee.find({ 
      employeeId: { $in: employeeIds } 
    }).select('employeeId name');
    
    const employeeMap = employees.reduce((map, emp) => {
      map[emp.employeeId] = emp.name;
      return map;
    }, {});
    
    const enrichedSummary = summary.map(item => ({
      employeeId: item._id,
      employeeName: employeeMap[item._id] || "Unknown Employee",
      totalPunches: item.totalPunches,
      inCount: item.inCount,
      outCount: item.outCount,
      lastPunch: item.lastPunch
    }));
    
    res.json({
      success: true,
      summary: enrichedSummary,
      totalEmployees: enrichedSummary.length
    });
    
  } catch (error) {
    console.error("Attendance Summary Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate attendance summary",
      error: error.message 
    });
  }
});

/**
 * 👤 MY WEEKLY ATTENDANCE
 */
router.get("/my-week", auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: "startDate and endDate are required" 
      });
    }

    let employeeIdToUse = null;
    if (req.user.employeeId) {
      employeeIdToUse = req.user.employeeId;
    } else {
      const employee = await Employee.findOne({ email: req.user.email }).select("employeeId");
      if (employee && employee.employeeId) {
        employeeIdToUse = employee.employeeId;
      } else {
        employeeIdToUse = String(req.user._id);
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const startOfDay = new Date(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endOfDay = new Date(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999);

    const records = await Attendance.find({
      employeeId: employeeIdToUse,
      punchTime: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ punchTime: 1 });

    const events = records.sort((a, b) => new Date(a.punchTime) - new Date(b.punchTime));
    const pairs = [];
    let currentIn = null;
    let currentOut = null;

    for (const e of events) {
      if (e.direction === "in") {
        // If we have a pending pair, push it
        if (currentIn && currentOut) {
          pairs.push({ start: new Date(currentIn.punchTime), end: new Date(currentOut.punchTime) });
          currentIn = null;
          currentOut = null;
        }

        if (!currentIn) {
          currentIn = e;
        } else {
          // Resolution: Prefer Manual > Earliest
          if (e.source === "manual" && currentIn.source !== "manual") {
            currentIn = e;
          }
          // If both are manual or both are not manual, keep the first one (Earliest)
        }
      } else if (e.direction === "out") {
        if (currentIn) {
          const t = new Date(e.punchTime);
          const inT = new Date(currentIn.punchTime);
          
          if (t > inT) {
            if (!currentOut) {
              currentOut = e;
            } else {
              // Resolution: Prefer Manual > Latest
              if (e.source === "manual" && currentOut.source !== "manual") {
                currentOut = e;
              } else if (e.source === "manual" && currentOut.source === "manual") {
                // Both manual: take latest
                if (t > new Date(currentOut.punchTime)) currentOut = e;
              } else if (e.source !== "manual" && currentOut.source !== "manual") {
                // Both auto: take latest
                if (t > new Date(currentOut.punchTime)) currentOut = e;
              }
            }
          }
        }
      }
    }
    
    // Push the last pair if exists
    if (currentIn && currentOut) {
      pairs.push({ start: new Date(currentIn.punchTime), end: new Date(currentOut.punchTime) });
    }

    const weeklyTotal = Number(
      pairs
        .map(p => (p.end - p.start) / (1000 * 60 * 60))
        .reduce((a, b) => a + b, 0)
        .toFixed(2)
    );

    const result = [];
    const dayCursor = new Date(startOfDay);
    while (dayCursor <= endOfDay) {
      const dateKey = new Date(Date.UTC(dayCursor.getFullYear(), dayCursor.getMonth(), dayCursor.getDate()))
        .toISOString()
        .split("T")[0];
      
      const dayPairs = pairs.filter(p => {
        const k = new Date(p.start).toISOString().split("T")[0];
        return k === dateKey;
      });
      
      if (dayPairs.length > 0) {
        const firstIn = dayPairs[0].start;
        const lastOut = dayPairs[dayPairs.length - 1].end;
        const sumHours = Number(
          dayPairs
            .map(p => (p.end - p.start) / (1000 * 60 * 60))
            .reduce((a, b) => a + b, 0)
            .toFixed(2)
        );
        result.push({
          date: dateKey,
          punchIn: firstIn,
          punchOut: lastOut,
          punchTime: firstIn,
          hours: sumHours
        });
      }

      dayCursor.setDate(dayCursor.getDate() + 1);
    }

    res.json({ 
      success: true, 
      employeeId: employeeIdToUse, 
      records: result, 
      weeklyHours: Number(weeklyTotal.toFixed(2)) 
    });
  } catch (error) {
    console.error("My Weekly Attendance Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch weekly attendance", 
      error: error.message 
    });
  }
});

/**
 * ✏️ ATTENDANCE REGULARIZATION
 */
router.post("/regularize", auth, async (req, res) => {
  try {
    const { employeeId, inTime, outTime, deviceId, source, workDurationSeconds } = req.body;
    
    if (!inTime || !outTime) {
      return res.status(400).json({ 
        success: false, 
        message: "inTime and outTime are required" 
      });
    }
    
    const inDt = new Date(inTime);
    const outDt = new Date(outTime);
    
    if (!(outDt > inDt)) {
      return res.status(400).json({ 
        success: false, 
        message: "outTime must be after inTime" 
      });
    }

    let employeeIdToUse = employeeId;
    if (!employeeIdToUse) {
      if (req.user.employeeId) {
        employeeIdToUse = req.user.employeeId;
      } else {
        const employee = await Employee.findOne({ email: req.user.email }).select("employeeId");
        employeeIdToUse = employee?.employeeId || String(req.user._id);
      }
    }

    const employee = await Employee.findOne({ employeeId: employeeIdToUse });
    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: "Employee not found" 
      });
    }

    const startWindow = new Date(inDt.getFullYear(), inDt.getMonth(), inDt.getDate(), 0, 0, 0, 0);
    const endWindow = new Date(outDt.getFullYear(), outDt.getMonth(), outDt.getDate(), 23, 59, 59, 999);

    const windowRecords = await Attendance.find({
      employeeId: employeeIdToUse,
      punchTime: { $gte: startWindow, $lte: endWindow }
    }).sort({ punchTime: 1 });

    const existingIn = windowRecords.find(r => r.direction === "in");
    const existingOut = [...windowRecords].reverse().find(r => r.direction === "out");

    let inRecordId = null;
    let outRecordId = null;

    if (existingIn) {
      existingIn.punchTime = inDt;
      existingIn.deviceId = deviceId || "manual";
      existingIn.source = source || "manual";
      await existingIn.save();
      inRecordId = existingIn._id;
    } else {
      const createdIn = await Attendance.create({
        employeeId: employeeIdToUse,
        name: employee.name,
        direction: "in",
        punchTime: inDt,
        deviceId: deviceId || "manual",
        source: source || "manual"
      });
      inRecordId = createdIn._id;
    }

    const durationSecs = typeof workDurationSeconds === "number" 
      ? workDurationSeconds 
      : Math.round((outDt - inDt) / 1000);

    if (existingOut) {
      existingOut.punchTime = outDt;
      existingOut.deviceId = deviceId || "manual";
      existingOut.source = source || "manual";
      existingOut.correspondingInTime = inDt;
      existingOut.workDurationSeconds = durationSecs;
      await existingOut.save();
      outRecordId = existingOut._id;
    } else {
      const createdOut = await Attendance.create({
        employeeId: employeeIdToUse,
        name: employee.name,
        direction: "out",
        punchTime: outDt,
        deviceId: deviceId || "manual",
        source: source || "manual",
        correspondingInTime: inDt,
        workDurationSeconds: durationSecs
      });
      outRecordId = createdOut._id;
    }

    const keepIds = [inRecordId, outRecordId].filter(Boolean);
    if (keepIds.length > 0) {
      await Attendance.deleteMany({
        employeeId: employeeIdToUse,
        punchTime: { $gte: startWindow, $lte: endWindow },
        source: "manual",
        _id: { $nin: keepIds }
      });
    }

    return res.json({ 
      success: true,
      message: "Attendance regularized successfully",
      inTime: inDt,
      outTime: outDt,
      workHours: (durationSecs / 3600).toFixed(2)
    });
  } catch (error) {
    console.error("Attendance Regularize Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to regularize attendance", 
      error: error.message 
    });
  }
});

module.exports = router;
