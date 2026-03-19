const mongoose = require("mongoose");

const MonthlyPayrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    designation: String,
    location: String,

    salaryMonth: {
      type: String, // YYYY-MM
      required: true,
      index: true,
    },

    paymentDate: String,

    // Earnings
    basicDA: Number,
    hra: Number,
    specialAllowance: Number,

    // Deductions
    pf: Number,
    esi: Number,
    tax: Number,
    professionalTax: Number,
    loanDeduction: Number,
    lop: Number,
    lopDays: Number,
    gratuity: Number,

    // Calculated
    totalEarnings: Number,
    totalDeductions: Number,
    netSalary: Number,
    ctc: Number,

    // Bank
    accountNumber: String,
    ifscCode: String,
    bankName: String,

    status: {
      type: String,
      enum: ["Pending", "Payment Email Sent", "Paid"],
      default: "Pending",
    },
  },
  { timestamps: true }
);

// Prevent duplicate payroll for same employee & month
MonthlyPayrollSchema.index(
  { employeeId: 1, salaryMonth: 1 },
  { unique: true }
);

module.exports = mongoose.model("MonthlyPayroll", MonthlyPayrollSchema);