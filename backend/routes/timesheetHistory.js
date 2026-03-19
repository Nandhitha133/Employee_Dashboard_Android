const express = require("express");
const router = express.Router();
const Timesheet = require("../models/Timesheet");
const auth = require("../middleware/auth");

/**
 * GET ALL TIMESHEETS (History Page)
 * Used in TimesheetHistory.jsx
 */
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const sheets = await Timesheet.find({ userId })
      .sort({ weekStartDate: -1 })
      .select("-__v");

    return res.json({
      success: true,
      count: sheets.length,
      timesheets: sheets,
    });
  } catch (error) {
    console.error("❌ Timesheet History Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching history",
    });
  }
});

module.exports = router;
