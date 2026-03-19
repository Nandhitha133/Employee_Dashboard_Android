const mongoose = require("mongoose");

const TimesheetEntrySchema = new mongoose.Schema({
  project: { type: String, required: true },
  task: { type: String, required: true },
  type: { type: String, enum: ["project", "leave"], required: true },
  hours: {
    type: [Number],
    default: [0, 0, 0, 0, 0, 0, 0], // Mon–Sun
    validate: (v) => Array.isArray(v) && v.length === 7
  }
});

const TimesheetSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    weekStartDate: { type: Date, required: true },
    weekEndDate: { type: Date, required: true },

    entries: { type: [TimesheetEntrySchema], default: [] },

    totalHours: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Draft", "Submitted", "Approved", "Rejected"],
      default: "Draft"
    },

    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto calculate total
TimesheetSchema.pre("save", function (next) {
  this.totalHours = this.entries.reduce((sum, entry) => {
    return sum + entry.hours.reduce((a, b) => a + (Number(b) || 0), 0);
  }, 0);
  next();
});

// Prevent overwrite error
module.exports =
  mongoose.models.Timesheet || mongoose.model("Timesheet", TimesheetSchema);
