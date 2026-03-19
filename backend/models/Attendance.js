const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  name: { type: String, required: true },
  punchTime: { type: Date, required: true },
  direction: { type: String, enum: ["in", "out"], required: true },
  deviceId: { type: String },
  correspondingInTime: { type: Date },
  workDurationSeconds: { type: Number },
  source: { type: String, enum: ["local", "hikvision", "manual"], default: "local" },
});

module.exports = mongoose.model("Attendance", attendanceSchema);
