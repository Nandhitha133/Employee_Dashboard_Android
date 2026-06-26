const mongoose = require("mongoose");

const TimelineSchema = new mongoose.Schema({
  date: { type: String, required: true },
  status: { type: String, required: true },
  note: { type: String }
}, { _id: false });

const AssetTicketSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // Format: TCK-XXXX
  assetId: { type: String, required: true },
  assetName: { type: String },
  employeeId: { type: String, required: true },
  employeeName: { type: String },
  issueType: { type: String, required: true },
  description: { type: String },
  priority: { 
    type: String, 
    enum: ["Low", "Medium", "High"], 
    default: "Medium" 
  },
  status: { 
    type: String, 
    enum: ["Pending", "Resolved"], 
    default: "Pending" 
  },
  createdAtDate: { type: String }, // Format YYYY-MM-DD
  resolutionNotes: { type: String, default: "" },
  adminComments: { type: String, default: "" },
  timeline: [TimelineSchema]
}, { timestamps: true });

module.exports = mongoose.model("AssetTicket", AssetTicketSchema);
