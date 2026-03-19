const mongoose = require("mongoose");

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  division: { type: String, required: true },
  branch: { type: String, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  status: { type: String, default: "Planning" },
  description: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("Project", ProjectSchema);
