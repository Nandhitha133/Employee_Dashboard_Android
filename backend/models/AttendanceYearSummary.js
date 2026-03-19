const mongoose = require("mongoose");

const AttendanceYearSummarySchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    financialYear: {
      type: String,
      required: true,
      index: true,
    },
    yearlyPresent: {
      type: Number,
      default: 0,
    },
    yearlyAbsent: {
      type: Number,
      default: 0,
    },
    updatedBy: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

AttendanceYearSummarySchema.index(
  { employeeId: 1, financialYear: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "AttendanceYearSummary",
  AttendanceYearSummarySchema
);

