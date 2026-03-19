const express = require("express");
const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");
const AttendanceRegularizationRequest = require("../models/AttendanceRegularizationRequest");
const auth = require("../middleware/auth");

const router = express.Router();

router.post("/request", auth, async (req, res) => {
  try {
    const { employeeId, email, inTime, outTime, workDurationSeconds } = req.body;
    console.log("Attendance Approval Request:", { employeeId, email, inTime, outTime });

    if ((!employeeId && !email) || !inTime || !outTime) {
      return res.status(400).json({ success: false, message: "Missing fields" });
    }
    const inDt = new Date(inTime);
    const outDt = new Date(outTime);
    if (!(outDt > inDt)) {
      return res.status(400).json({ success: false, message: "Invalid time range" });
    }
    
    let employee = null;
    if (employeeId) {
      employee = await Employee.findOne({ employeeId });
    }
    
    if (!employee && email) {
      console.log("Employee not found by ID (or no ID), trying email:", email);
      employee = await Employee.findOne({ email });
    }

    if (!employee) {
      console.log("Employee not found for ID:", employeeId, "Email:", email);
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    const durationSecs = typeof workDurationSeconds === "number" ? workDurationSeconds : Math.round((outDt - inDt) / 1000);
    const startWindow = new Date(inDt.getFullYear(), inDt.getMonth(), inDt.getDate(), 0, 0, 0, 0);
    const endWindow = new Date(inDt.getFullYear(), inDt.getMonth(), inDt.getDate(), 23, 59, 59, 999);
    const existing = await AttendanceRegularizationRequest.findOne({
      employeeId: employee.employeeId,
      status: "Pending",
      inTime: { $gte: startWindow, $lte: endWindow }
    }).sort({ updatedAt: -1 });
    if (existing) {
      existing.inTime = inDt;
      existing.outTime = outDt;
      existing.workDurationSeconds = durationSecs;
      existing.employeeName = employee.name;
      existing.submittedBy = req.user._id;
      existing.submittedAt = new Date();
      await existing.save();
      res.json({ success: true, request: existing });
    } else {
      const created = await AttendanceRegularizationRequest.create({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        inTime: inDt,
        outTime: outDt,
        workDurationSeconds: durationSecs,
        submittedBy: req.user._id
      });
      res.json({ success: true, request: created });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create request", error: error.message });
  }
});

router.get("/list", auth, async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;
    
    // PROJECT MANAGER FILTERING
    if (req.user.role === 'projectmanager') {
      const pmEmp = await Employee.findOne({ employeeId: req.user.employeeId });
      if (!pmEmp) {
        return res.json({ success: true, requests: [] });
      }

      const division = pmEmp.division;
      const location = pmEmp.location;
      
      const empFilter = {};
      if (division) empFilter.division = division;
      if (location) empFilter.location = location;
      
      const authorizedEmployees = await Employee.find(empFilter).select('employeeId');
      const authorizedEmpIds = authorizedEmployees.map(e => e.employeeId).filter(Boolean);
      
      query.employeeId = { $in: authorizedEmpIds };
    }

    // Find requests
    const items = await AttendanceRegularizationRequest.find(query).sort({ createdAt: -1 }).limit(500);
    
    // Get unique employee names to bulk lookup
    const names = [...new Set(items.map(i => i.employeeName))];
    const employees = await Employee.find({ name: { $in: names } }).select("name employeeId location");
    
    // Map name -> employee details
    const nameToDetails = {};
    employees.forEach(e => { 
      nameToDetails[e.name] = {
        employeeId: e.employeeId,
        location: e.location
      }; 
    });
    
    // Enrich items with correct employeeId and location if available
    const enriched = items.map(item => {
      const details = nameToDetails[item.employeeName];
      if (details) {
        // Return a plain object with the correct ID overrides and location
        return {
          ...item.toObject(),
          employeeId: details.employeeId, // Use the looked-up ID
          location: details.location // Add location
        };
      }
      return item;
    });

    res.json({ success: true, requests: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch requests", error: error.message });
  }
});

router.put("/approve/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    console.log("Approve request called for ID:", id);
    const item = await AttendanceRegularizationRequest.findById(id);
    if (!item) {
      console.log("Request not found:", id);
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    let employee = await Employee.findOne({ employeeId: item.employeeId });
    if (!employee) {
      console.log("Employee not found for ID:", item.employeeId, "Trying fallback by name:", item.employeeName);
      employee = await Employee.findOne({ name: item.employeeName });
    }
    if (!employee) {
      console.log("Employee not found by ID or Name:", item.employeeId, item.employeeName);
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    const inDt = new Date(item.inTime);
    const outDt = new Date(item.outTime);
    const startWindow = new Date(inDt.getFullYear(), inDt.getMonth(), inDt.getDate(), 0, 0, 0, 0);
    const endWindow = new Date(outDt.getFullYear(), outDt.getMonth(), outDt.getDate(), 23, 59, 59, 999);
    const windowRecords = await Attendance.find({
      employeeId: item.employeeId,
      punchTime: { $gte: startWindow, $lte: endWindow }
    }).sort({ punchTime: 1 });
    const existingIn = windowRecords.find(r => r.direction === "in");
    const existingOut = [...windowRecords].reverse().find(r => r.direction === "out");
    let inRecordId = null;
    let outRecordId = null;
    if (existingIn) {
      existingIn.punchTime = inDt;
      existingIn.deviceId = "manual";
      existingIn.source = "manual";
      await existingIn.save();
      inRecordId = existingIn._id;
    } else {
      const createdIn = await Attendance.create({
        employeeId: item.employeeId,
        name: employee.name,
        direction: "in",
        punchTime: inDt,
        deviceId: "manual",
        source: "manual"
      });
      inRecordId = createdIn._id;
    }
    const durationSecs = typeof item.workDurationSeconds === "number" ? item.workDurationSeconds : Math.round((outDt - inDt) / 1000);
    if (existingOut) {
      existingOut.punchTime = outDt;
      existingOut.deviceId = "manual";
      existingOut.source = "manual";
      existingOut.correspondingInTime = inDt;
      existingOut.workDurationSeconds = durationSecs;
      await existingOut.save();
      outRecordId = existingOut._id;
    } else {
      const createdOut = await Attendance.create({
        employeeId: item.employeeId,
        name: employee.name,
        direction: "out",
        punchTime: outDt,
        deviceId: "manual",
        source: "manual",
        correspondingInTime: inDt,
        workDurationSeconds: durationSecs
      });
      outRecordId = createdOut._id;
    }
    const keepIds = [inRecordId, outRecordId].filter(Boolean);
    if (keepIds.length > 0) {
      await Attendance.deleteMany({
        employeeId: item.employeeId,
        punchTime: { $gte: startWindow, $lte: endWindow },
        source: "manual",
        _id: { $nin: keepIds }
      });
    }
    item.status = "Approved";
    item.reviewedBy = req.user._id;
    item.reviewedAt = new Date();
    item.rejectionReason = "";
    await item.save();
    res.json({ success: true, approved: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to approve request", error: error.message });
  }
});

router.put("/reject/:id", auth, async (req, res) => {
  try {
    const id = req.params.id;
    const { reason } = req.body;
    const item = await AttendanceRegularizationRequest.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    item.status = "Rejected";
    item.reviewedBy = req.user._id;
    item.reviewedAt = new Date();
    item.rejectionReason = reason || "";
    await item.save();
    res.json({ success: true, rejected: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reject request", error: error.message });
  }
});

module.exports = router;
