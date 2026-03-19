const express = require("express");
const router = express.Router();
const MonthlyPayroll = require("../models/MonthlyPayroll");


// ✅ SAVE MONTHLY PAYROLL (Simulation Result)
router.post("/run", async (req, res) => {
  try {
    const { payrolls } = req.body; // array from simulation

    if (!Array.isArray(payrolls) || payrolls.length === 0) {
      return res.status(400).json({ message: "No payroll data received" });
    }

    const saved = [];

    for (const p of payrolls) {
      const record = await MonthlyPayroll.findOneAndUpdate(
        { employeeId: p.employeeId, salaryMonth: p.salaryMonth },
        p,
        { upsert: true, new: true }
      );
      saved.push(record);
    }

    res.status(201).json({
      message: "Monthly payroll saved successfully",
      count: saved.length,
      data: saved,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 📥 GET PAYROLL BY MONTH
router.get("/", async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM

    const filter = month ? { salaryMonth: month } : {};

    const records = await MonthlyPayroll.find(filter).sort({
      employeeName: 1,
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 📜 GET EMPLOYEE PAYROLL HISTORY
router.get("/history/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const records = await MonthlyPayroll.find({ employeeId }).sort({ salaryMonth: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 📤 MARK PAYMENT EMAIL SENT
router.put("/mark-email-sent", async (req, res) => {
  try {
    const { month, employeeIds } = req.body;

    const result = await MonthlyPayroll.updateMany(
      { salaryMonth: month, employeeId: { $in: employeeIds } },
      { $set: { status: "Payment Email Sent" } }
    );

    res.json({
      message: "Payment email status updated",
      modified: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 💰 MARK AS PAID
router.put("/mark-paid", async (req, res) => {
  try {
    const { month, employeeIds } = req.body;

    const result = await MonthlyPayroll.updateMany(
      { salaryMonth: month, employeeId: { $in: employeeIds } },
      { $set: { status: "Paid" } }
    );

    res.json({
      message: "Payroll marked as paid",
      modified: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ❌ DELETE MONTH PAYROLL (Admin only)
router.delete("/:month", async (req, res) => {
  try {
    await MonthlyPayroll.deleteMany({ salaryMonth: req.params.month });
    res.json({ message: "Monthly payroll deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;