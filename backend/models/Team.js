const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  teamCode: { type: String, required: true, unique: true },
  leaderEmployeeId: { type: String, required: true },
  leaderName: { type: String },
  division: { type: String },
  members: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
