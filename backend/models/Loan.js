const mongoose = require("mongoose");

const LoanSchema = new mongoose.Schema(
  {
    // loanId field removed as per user request
    employeeId: {
      type: String,
      required: true,
      index: true,
    },

    employeeName: {
      type: String,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    tenureMonths: {
      type: Number,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    paidMonths: {
      type: Number,
      default: 0,
    },

    location: {
      type: String,
      required: true,
    },

    division: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "completed", "on-hold"],
      default: "active",
    },

    lastPaymentDate: {
      type: Date,
    },

    nextDueDate: {
      type: Date,
    },

    paymentEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Loan", LoanSchema);
