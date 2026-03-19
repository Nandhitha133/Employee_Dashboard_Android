const mongoose = require('mongoose');

const SelfAppraisalSchema = new mongoose.Schema({
  employeeId: {
    type: String, // Storing Employee ID string (e.g. EMP001) or ObjectId. Based on Employee model, employeeId is a String field. 
    // However, usually we reference by ObjectId. But the system seems to use `employeeId` string often. 
    // Let's store the ObjectId ref for populate, but also keep employeeId string if needed.
    // Looking at other models (e.g. Timesheet), let's see how they reference.
    // For now I will use ObjectId ref to 'Employee'.
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  year: {
    type: String,
    required: true
  },
  projects: [{
    id: String,
    name: String,
    contribution: String
  }],
  overallContribution: {
    type: String
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'AppraiserReview', 'ReviewerReview', 'DirectorApproval', 'Released', 'Reviewed'],
    default: 'Draft'
  },
  appraiser: {
    type: String
  },
  // Manager/Appraiser Fields
  managerComments: { type: String, default: '' },
  keyPerformance: { type: String, default: '' },
  appraiseeComments: { type: String, default: '' },
  appraiserRating: { type: String, default: '' },
  leadership: { type: String, default: '' },
  attitude: { type: String, default: '' },
  communication: { type: String, default: '' },

  // Reviewer Fields
  reviewerComments: { type: String, default: '' },
  directorComments: { type: String, default: '' },
  incrementPercentage: { type: Number, default: 0 },
  incrementCorrectionPercentage: { type: Number, default: 0 },
  incrementAmount: { type: Number, default: 0 },
  revisedSalary: { type: Number, default: 0 },
  
  releaseLetter: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SelfAppraisal', SelfAppraisalSchema);
