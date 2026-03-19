const mongoose = require('mongoose');

const LeaveApplicationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    employeeId: { type: String },
    employeeName: { type: String }, // Snapshot of employee name
    location: { type: String }, // Snapshot of location
    leaveType: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    dayType: { type: String, enum: ['Full Day', 'Half Day'], default: 'Full Day' },
    totalDays: { type: Number, required: true },
    reason: { type: String, default: '' },
    bereavementRelation: { type: String, default: '' },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    appliedDate: { type: Date, default: Date.now },
    documentUrl: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveApplication', LeaveApplicationSchema);

