const mongoose = require("mongoose");

const AllocationSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
  projectName: { type: String, required: true },
  projectCode: { type: String, required: true },
  projectDivision: { type: String, required: true },

  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  employeeName: { type: String, required: true },
  employeeCode: { type: String, required: true },

  branch: { type: String, required: true },
  allocationPercentage: { type: Number, default: 100 },
  allocatedHours: { type: Number, default: 40 },

  startDate: { type: String, required: true },
  endDate: { type: String, required: true },

  role: { type: String, required: false },
  assignedBy: { type: String },
  assignedDate: { type: String },
  status: { type: String, default: "Active" }
}, { timestamps: true });

module.exports = mongoose.model("Allocation", AllocationSchema);
