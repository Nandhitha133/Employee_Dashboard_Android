const mongoose = require("mongoose");

const AssetRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Format: REQ-XXXX
  employeeId: { type: String, required: true },
  employeeName: { type: String },
  category: { type: String, required: true }, // Laptop, Mobile, etc.
  requestType: { type: String, default: "New Asset" }, // New Asset, Replacement, Return, Upgrade
  reason: { type: String },
  status: { 
    type: String, 
    enum: ["Pending", "Approved", "Rejected"], 
    default: "Pending" 
  },
  requestDate: { type: String, required: true } // Format YYYY-MM-DD
}, { timestamps: true });

module.exports = mongoose.model("AssetRequest", AssetRequestSchema);
