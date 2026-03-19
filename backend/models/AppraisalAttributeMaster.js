const mongoose = require('mongoose');

const AppraisalAttributeMasterSchema = new mongoose.Schema({
  knowledgeSubItems: [{
    key: String,
    label: String
  }],
  processSubItems: [{
    key: String,
    label: String
  }],
  technicalSubItems: [{
    key: String,
    label: String
  }],
  growthSubItems: [{
    key: String,
    label: String
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
AppraisalAttributeMasterSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AppraisalAttributeMaster', AppraisalAttributeMasterSchema);
