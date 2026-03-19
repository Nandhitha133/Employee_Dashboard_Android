const mongoose = require("mongoose");

const TimesheetEntrySchema = new mongoose.Schema({
  project: { type: String, required: true },
  projectCode: { type: String, default: "" },
  task: { type: String, required: true },
  type: { type: String, enum: ["project", "leave"], default: "project" },
  hours: { type: [Number], default: [0, 0, 0, 0, 0, 0, 0] },
  locked: { type: Boolean, default: false },
  lockedDays: { type: [Boolean], default: [false, false, false, false, false, false, false] }
});

const TimesheetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    employeeId: { type: String, required: false },
    employeeName: { type: String, required: false },

    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },

    entries: { type: [TimesheetEntrySchema], default: [] },

    shiftType: { type: String, default: "" },
    dailyShiftTypes: { type: [String], default: [] },

    onPremisesTime: {
      daily: { type: [Number], default: [] },
      weekly: { type: Number, default: 0 }
    },

    totalHours: { type: Number, default: 0 },
    totalHoursWithBreak: { type: Number, default: 0 },

    lockedDays: { type: [Boolean], default: [false, false, false, false, false, false, false] },

    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Rejected"],
      default: "Draft",
    },

    rejectionReason: { type: String, default: "" },

    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Function to calculate total hours with break
function calculateTotalHoursWithBreak(sheet) {
  const entries = Array.isArray(sheet.entries) ? sheet.entries : [];
  
  // Calculate work hours from all entries
  const workWeeklyTotal = entries.reduce((sum, entry) => {
    const hrs = Array.isArray(entry.hours) ? entry.hours : [];
    return sum + hrs.reduce((a, b) => a + (Number(b) || 0), 0);
  }, 0);
  
  const computeBreakForDay = (dayIndex) => {
    const shifts = Array.isArray(sheet.dailyShiftTypes) ? sheet.dailyShiftTypes : [];
    const getShiftBreakHours = (shift) => {
      if (!shift) return 0;
      const s = String(shift);
      if (s.startsWith("First Shift")) return 65 / 60;
      if (s.startsWith("Second Shift")) return 60 / 60;
      if (s.startsWith("General Shift")) return 75 / 60;
      return 0;
    };

    const hasProjectWork = entries.some((entry) => {
      if (entry.type !== 'project') return false;
      const hrs = Array.isArray(entry.hours) ? entry.hours : [];
      return (Number(hrs[dayIndex] || 0) > 0);
    });
    
    const hasApprovedLeaveOrHoliday = entries.some((entry) => {
      const hrs = Array.isArray(entry.hours) ? entry.hours : [];
      const val = Number(hrs[dayIndex] || 0);
      const task = (entry.task || '').toLowerCase();
      // Check for Holiday or ANY Approved Leave (Full or Half)
      return ((task.includes('leave approved') || task.includes('holiday')) && val > 0);
    });
    
    const shiftForDay = shifts[dayIndex] || sheet.shiftType || "";
    const breakByShift = getShiftBreakHours(shiftForDay);
    return hasProjectWork && !hasApprovedLeaveOrHoliday ? breakByShift : 0;
  };
  
  const breakDaily = [0, 1, 2, 3, 4, 5, 6].map(computeBreakForDay);
  const breakWeekly = breakDaily.reduce((sum, val) => sum + val, 0);
  
  return workWeeklyTotal + breakWeekly;
}

TimesheetSchema.pre("save", function (next) {
  // Calculate work hours total
  this.totalHours = this.entries.reduce((sum, entry) => {
    return sum + entry.hours.reduce((a, b) => a + (Number(b) || 0), 0);
  }, 0);
  
  // Calculate total hours with break
  this.totalHoursWithBreak = calculateTotalHoursWithBreak(this);
  
  // Update lockedDays based on leave entries
  this.lockedDays = [false, false, false, false, false, false, false];
  
  this.entries.forEach(entry => {
    if (entry.type === 'leave' && entry.locked) {
      entry.hours.forEach((hour, index) => {
        if (hour > 0) {
          this.lockedDays[index] = true;
        }
      });
    }
  });
  
  next();
});

module.exports =
  mongoose.models.Timesheet || mongoose.model("Timesheet", TimesheetSchema);
