const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Loan = require("../models/Loan");

/**
 * ✅ CREATE LOAN
 * POST /api/loans
 */
router.post("/", async (req, res) => {
  try {
    const loan = await Loan.create(req.body);
    res.status(201).json({ success: true, loan });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
});

/**
 * ✅ GET ALL LOANS (with filters)
 * GET /api/loans
 */
router.get("/", async (req, res) => {
  try {
    const { employeeId, location, division, status } = req.query;

    const filter = {};

    if (employeeId) filter.employeeId = new RegExp(employeeId, "i");
    if (location && location !== "all") filter.location = location;
    if (division && division !== "all") filter.division = division;
    if (status && status !== "all") filter.status = status;

    const loans = await Loan.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, loans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ GET SINGLE LOAN
 * GET /api/loans/:id
 */
router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Loan ID" });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    res.json({ success: true, loan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ✅ UPDATE LOAN
 * PUT /api/loans/:id
 */
router.put("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Loan ID" });
    }

    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!loan) return res.status(404).json({ message: "Loan not found" });

    res.json({ success: true, loan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * ✅ TOGGLE PAYMENT ENABLE / DISABLE
 * PATCH /api/loans/:id/payment
 */
router.patch("/:id/payment", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Loan ID" });
    }

    const loan = await Loan.findById(req.params.id);
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    loan.paymentEnabled = !loan.paymentEnabled;

    if (!loan.paymentEnabled && loan.status === "active") {
      loan.status = "on-hold";
    } else if (loan.paymentEnabled && loan.status === "on-hold") {
      loan.status = "active";
    }

    await loan.save();
    res.json({ success: true, loan });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

/**
 * ✅ DELETE LOAN
 * DELETE /api/loans/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Loan ID" });
    }

    const loan = await Loan.findByIdAndDelete(req.params.id);
    
    if (!loan) {
      return res.status(404).json({ success: false, message: "Loan not found" });
    }

    res.json({ success: true, message: "Loan deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
