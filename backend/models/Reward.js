const mongoose = require('mongoose');

const RewardSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    default: ''
  },
  division: {
    type: String,
    default: ''
  },
  nominatedBy: {
    type: String,
    required: true
  },
  achievement: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reward', RewardSchema);