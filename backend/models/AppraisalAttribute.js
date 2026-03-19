const mongoose = require('mongoose');

const AppraisalAttributeSchema = new mongoose.Schema({
  designation: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  sections: {
    selfAppraisal: {
      type: Boolean,
      default: true
    },
    knowledgeSharing: {
      type: Boolean,
      default: true
    },
    // Nested sub-items under Knowledge Sharing Assessment (dynamic keys)
    knowledgeSubItems: {
      type: Map,
      of: Boolean,
      default: {
        knowledgeSharing: true,
        leadership: true
      }
    },
    processAdherence: {
      type: Boolean,
      default: true
    },
    processSubItems: {
      type: Map,
      of: Boolean,
      default: {
        timesheet: true,
        reportStatus: true,
        meeting: true
      }
    },
    technicalAssessment: {
      type: Boolean,
      default: true
    },
    technicalSubItems: {
      type: Map,
      of: Boolean,
      default: {}
    },
    growthAssessment: {
      type: Boolean,
      default: true
    }
    ,
    growthSubItems: {
      type: Map,
      of: Boolean,
      default: {
        learningNewTech: true,
        certifications: true
      }
    }
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
AppraisalAttributeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('AppraisalAttribute', AppraisalAttributeSchema);
