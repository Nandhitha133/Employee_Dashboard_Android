const mongoose = require("mongoose");

const AssetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Format: AST-XXX
  name: { type: String, required: true },
  category: { type: String, required: true }, // Laptop, Desktop, Mobile, Monitor, etc.
  type: { type: String, default: "Hardware" }, // Hardware, Software, etc.
  brandModel: { type: String },
  serialNumber: { type: String, unique: true, sparse: true },
  purchaseDate: { type: String },
  warrantyExpiry: { type: String },
  vendor: { type: String },
  cost: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ["Available", "Assigned", "Damaged"], 
    default: "Available" 
  },
  condition: { 
    type: String, 
    enum: ["Excellent", "Good", "Fair", "Poor"], 
    default: "Excellent" 
  },
  location: { type: String, default: "Chennai Office" },
  assignedToId: { type: String, default: null }, // Employee ID
  assignedToName: { type: String, default: null },
  allocatedDate: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Asset", AssetSchema);
