const express = require("express");
const router = express.Router();
const Compensation = require("../models/Compensation");
const Payroll = require("../models/Payroll");
const Employee = require("../models/Employee");

// ➕ CREATE Compensation
router.post("/", async (req, res) => {
  try {
    const compensation = new Compensation(req.body);
    await compensation.save();

    // Create Payroll record
    let employeeId = req.body.employeeId;
    let employeeName = req.body.name;

    // If employeeId is not provided, try to find by name
    if (!employeeId && employeeName) {
      const employee = await Employee.findOne({ 
        $or: [
          { name: { $regex: new RegExp(`^${employeeName}$`, "i") } },
          { employeename: { $regex: new RegExp(`^${employeeName}$`, "i") } }
        ]
      });
      if (employee) {
        employeeId = employee.employeeId;
      }
    }

    if (employeeId) {
       // Check if payroll already exists for this employee? 
       // The user said "add the new payroll", implying a new record or updating existing?
       // Usually there is only one active payroll structure per employee.
       // Let's check if one exists and update it, or create new.
       // But PayrollDetails.jsx shows a list. Maybe history?
       // The request says "add the new payroll". I'll create a new one.
       
       const employee = await Employee.findOne({ employeeId });
       
       if (employee) {
         const payrollData = {
            employeeId: employee.employeeId,
            employeeName: employee.name || employee.employeename,
            designation: compensation.designation,
            department: compensation.department,
            location: compensation.location,
            dateOfJoining: employee.dateOfJoining,
            employmentType: "Permanent", // Default or fetch from employee if available
            
            // Earnings
            basicDA: compensation.modeBasicDA === 'amount' ? compensation.basicDA : 0,
            hra: compensation.modeHra === 'amount' ? compensation.hra : 0,
            specialAllowance: compensation.modeSpecialAllowance === 'amount' ? compensation.specialAllowance : 0,
            
            // Deductions
            pf: compensation.modePf === 'amount' ? compensation.pf : 0,
            esi: compensation.modeEsi === 'amount' ? compensation.esi : 0,
            tax: compensation.modeTax === 'amount' ? compensation.tax : 0,
            professionalTax: compensation.modeProfessionalTax === 'amount' ? compensation.professionalTax : 0,
            gratuity: compensation.modeGratuity === 'amount' ? compensation.gratuity : 0,
            
            status: "Pending"
         };

         // Calculate totals
         payrollData.totalEarnings = (payrollData.basicDA || 0) + (payrollData.hra || 0) + (payrollData.specialAllowance || 0);
         payrollData.totalDeductions = (payrollData.pf || 0) + (payrollData.esi || 0) + (payrollData.tax || 0) + (payrollData.professionalTax || 0);
         payrollData.netSalary = payrollData.totalEarnings - payrollData.totalDeductions;
         payrollData.ctc = payrollData.totalEarnings + (payrollData.gratuity || 0);

         const payroll = new Payroll(payrollData);
         await payroll.save();
       }
    }

    res.status(201).json(compensation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 📥 GET all Compensations
router.get("/", async (req, res) => {
  try {
    const compensations = await Compensation.find().sort({ createdAt: -1 });
    res.json(compensations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 👁️ GET single Compensation by ID
router.get("/:id", async (req, res) => {
  try {
    const compensation = await Compensation.findById(req.params.id);
    if (!compensation) return res.status(404).json({ message: "Not found" });
    res.json(compensation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ✏️ UPDATE Compensation
router.put("/:id", async (req, res) => {
  try {
    const updated = await Compensation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// ❌ DELETE Compensation
router.delete("/:id", async (req, res) => {
  try {
    await Compensation.findByIdAndDelete(req.params.id);
    res.json({ message: "Compensation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
