const mongoose = require("mongoose");

const AttendanceRegularizationRequestSchema = new mongoose.Schema({
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  inTime: { type: Date, required: true },
  outTime: { type: Date, required: true },
  workDurationSeconds: { type: Number, required: true },
  status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  submittedAt: { type: Date, default: Date.now },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  reviewedAt: { type: Date, default: null },
  rejectionReason: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("AttendanceRegularizationRequest", AttendanceRegularizationRequestSchema);
