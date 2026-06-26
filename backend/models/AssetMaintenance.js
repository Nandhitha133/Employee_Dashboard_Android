const mongoose = require("mongoose");

const AssetMaintenanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Format: MNT-XXXX
  assetId: { type: String, required: true },
  assetName: { type: String },
  maintenanceType: { type: String, required: true }, // Warranty, AMC, Preventive, Repair
  cost: { type: Number, default: 0 },
  startDate: { type: String },
  endDate: { type: String },
  vendorName: { type: String },
  status: { 
    type: String, 
    enum: ["Scheduled", "In Progress", "Completed"], 
    default: "Scheduled" 
  },
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("AssetMaintenance", AssetMaintenanceSchema);
