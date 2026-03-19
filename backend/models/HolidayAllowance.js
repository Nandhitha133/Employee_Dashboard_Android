const mongoose = require("mongoose");

const HolidayAllowanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    employeeName: String,
    location: String,
    accountNumber: String,
    grossSalary: {
      type: Number,
      default: 0,
    },
    month: {
      type: Number,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    holidayDays: {
      type: Number,
      default: 0,
    },
    perDayAmount: {
      type: Number,
      default: 0,
    },
    holidayTotal: {
      type: Number,
      default: 0,
    },
    shiftAllottedAmount: {
      type: Number,
      default: 0,
    },
    shiftDays: {
      type: Number,
      default: 0,
    },
    shiftTotal: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

HolidayAllowanceSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("HolidayAllowance", HolidayAllowanceSchema);

