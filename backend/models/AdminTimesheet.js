const mongoose = require("mongoose");

const TimeEntrySchema = new mongoose.Schema({
  project: { type: String, required: true },
  task: { type: String, required: true },
  monday: { type: Number, default: 0 },
  tuesday: { type: Number, default: 0 },
  wednesday: { type: Number, default: 0 },
  thursday: { type: Number, default: 0 },
  friday: { type: Number, default: 0 },
  saturday: { type: Number, default: 0 },
  sunday: { type: Number, default: 0 },
  total: { type: Number, default: 0 }
});

const AdminTimesheetSchema = new mongoose.Schema({
  // Reference to original timesheet
  timesheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Timesheet"
  },
  
  employeeId: { type: String, required: true },
  employeeName: { type: String, required: true },
  division: { type: String, required: true },
  location: { type: String, required: true },

  week: { type: String, required: true }, // Example: 2025-W03

  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending"
  },

  submittedDate: { type: String, required: true },

  timeEntries: [TimeEntrySchema],

  weeklyTotal: { type: Number, required: true },

  rejectionReason: { type: String, default: "" },

  // Track who reviewed
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    default: null 
  },
  reviewedAt: { type: Date, default: null }
});

module.exports = mongoose.model("AdminTimesheet", AdminTimesheetSchema);