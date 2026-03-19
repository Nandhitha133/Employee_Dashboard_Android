const mongoose = require("mongoose");

const AccessLogSchema = new mongoose.Schema({
  empId: { type: String, required: true },
  name: { type: String },
  punchTime: { type: Date, required: true },
  direction: { type: String, enum: ["IN", "OUT"], required: true },
  deviceId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("AccessLog", AccessLogSchema);
