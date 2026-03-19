const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");

router.post("/hik/callback", async (req, res) => {
  try {
    const event = req.body;

    // Convert Hik event → your format
    const record = {
      employeeId: event.employeeNo || event.personId,
      direction: event.eventType === "access_granted" ? "in" : "out",
      punchTime: event.time,
      deviceId: event.readerName
    };

    await Attendance.create(record);

    res.status(200).send("OK");
  } catch (err) {
    console.log("Callback error:", err.message);
    res.status(500).send("Failed");
  }
});

module.exports = router;
