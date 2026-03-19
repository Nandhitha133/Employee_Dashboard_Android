const mongoose = require("mongoose");

const PayrollSchema = new mongoose.Schema(
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
    department: String,
    location: {
      type: String,
      default: "Chennai",
    },
    dateOfJoining: Date,
    employmentType: {
      type: String,
      enum: ["Permanent", "Contract", "Intern"],
      default: "Permanent",
    },

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
    gratuity: Number,

    // Calculated
    totalEarnings: Number,
    totalDeductions: Number,
    netSalary: Number,
    ctc: Number,

    status: {
      type: String,
      enum: ["Pending", "Paid"],
      default: "Pending",
    },

    // Bank
    bankName: String,
    accountNumber: String,
    ifscCode: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payroll", PayrollSchema);
