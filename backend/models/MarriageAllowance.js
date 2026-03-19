const mongoose = require("mongoose");

const MarriageAllowanceSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, index: true, unique: true },
    employeeName: { type: String },
    division: { type: String },
    designation: { type: String },
    location: { type: String },
    dateOfJoining: { type: Date },
    marriageDate: { type: Date, required: true },
    spouseName: { type: String },
    certificatePath: { type: String },
    invitationPath: { type: String },
    allowanceType: { type: String, default: "Marriage Allowance" },
    allowanceAmount: { type: Number, default: 5000 },
    requestDate: { type: Date, default: Date.now },
    requestedBy: { type: String },
    managerStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    hrStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    remarks: { type: String },
    paymentStatus: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
    paymentDate: { type: Date },
    paymentMode: { type: String, enum: ["Salary Credit", "Bank Transfer", "Cash"] },
    createdBy: { type: String },
    updatedBy: { type: String }
  },
  { timestamps: true }
);

module.exports = mongoose.model("MarriageAllowance", MarriageAllowanceSchema);

