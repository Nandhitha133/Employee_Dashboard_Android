const express = require("express");
const router = express.Router();
const Payroll = require("../models/Payroll");


// ➕ CREATE payroll
router.post("/", async (req, res) => {
  try {
    const payroll = new Payroll(req.body);
    await payroll.save();
    res.status(201).json(payroll);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// 📥 GET all payroll records
router.get("/", async (req, res) => {
  try {
    const payrolls = await Payroll.find().sort({ createdAt: -1 });
    res.json(payrolls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// 👁️ GET single payroll by ID
router.get("/:id", async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: "Not found" });
    res.json(payroll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// ✏️ UPDATE payroll
router.put("/:id", async (req, res) => {
  try {
    const updated = await Payroll.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// ❌ DELETE payroll
router.delete("/:id", async (req, res) => {
  try {
    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: "Payroll deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
