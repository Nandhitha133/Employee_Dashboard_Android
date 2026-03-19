const mongoose = require("mongoose");

const CompensationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    employeeId: { type: String },
    department: { type: String, required: true },
    designation: { type: String, required: true },
    grade: { type: String },
    location: { type: String },
    effectiveDate: { type: Date, default: Date.now },
    
    // Earnings
    basicDA: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    specialAllowance: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    variablePay: { type: Number, default: 0 },

    // Deductions / Others
    gratuity: { type: Number, default: 0 },
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },

    // Modes (amount | percent)
    modeBasicDA: { type: String, enum: ["amount", "percent"], default: "amount" },
    modeHra: { type: String, enum: ["amount", "percent"], default: "amount" },
    modeSpecialAllowance: { type: String, enum: ["amount", "percent"], default: "amount" },
    modeGratuity: { type: String, enum: ["amount", "percent"], default: "amount" },
    modePf: { type: String, enum: ["amount", "percent"], default: "amount" },
    modeEsi: { type: String, enum: ["amount", "percent"], default: "amount" },
    modeTax: { type: String, enum: ["amount", "percent"], default: "amount" },
    modeProfessionalTax: { type: String, enum: ["amount", "percent"], default: "amount" },
    modeBonus: { type: String, enum: ["amount", "percent"], default: "amount" },
    modeVariablePay: { type: String, enum: ["amount", "percent"], default: "amount" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Compensation", CompensationSchema);
