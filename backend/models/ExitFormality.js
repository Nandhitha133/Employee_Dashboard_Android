const mongoose = require('mongoose');

const ExitFormalitySchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    employeeName: {
      type: String,
      required: true
    },
    employeeEmail: {
      type: String,
      required: true
    },
    division: {
      type: String
    },
    position: {
      type: String
    },
    dateOfJoining: {
      type: Date
    },
    proposedLastWorkingDay: {
      type: Date
    },
    reasonForLeaving: {
      type: String,
      enum: [
        'better_opportunity',
        'career_change',
        'career_growth',
        'personal_reasons',
        'health_issues',
        'relocation',
        'dissatisfaction',
        'retirement',
        'termination',
        'work_culture',
        'team_lead',
        'compensation',
        'other'
      ]
    },
    reasonDetails: {
      type: String
    },
    feedback: {
      type: String
    },
    suggestions: {
      type: String
    },
    rejectionReason: {
      type: String
    },
    assetsToReturn: [{
      assetType: {
        type: String,
        enum: ['laptop', 'mobile', 'access_card', 'id_card', 'keys', 'documents', 'other'],
        required: true
      },
      assetDetails: String,
      returned: {
        type: Boolean,
        default: false
      },
      returnDate: Date
    }],
    clearanceDepartments: [{
      department: {
        type: String,
        enum: ['it', 'hr', 'finance', 'admin', 'manager', 'team_lead'],
        required: true
      },
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'not_applicable'],
        default: 'pending'
      },
      approvedBy: {
        type: String
      },
      approvedDate: Date,
      remarks: String,
      required: {
        type: Boolean,
        default: true
      }
    }],
    documents: [{
      documentType: {
        type: String,
        enum: ['resignation_letter', 'experience_letter', 'relieving_letter', 'salary_slip', 'form_16', 'noc', 'other'],
        required: true
      },
      documentName: String,
      documentUrl: String,
      uploaded: {
        type: Boolean,
        default: false
      },
      uploadedDate: Date
    }],
    status: {
      type: String,
      enum: ['draft', 'submitted', 'under_review', 'clearance_in_progress', 'completed', 'cancelled', 'rejected'],
      default: 'draft'
    },
    currentStage: {
      type: String,
      default: 'initiation'
    },
    submittedDate: Date,
    completedDate: Date,
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedByHR: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedByManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    finalSettlementAmount: Number,
    noticePeriodServed: {
      type: Boolean,
      default: false
    },
    noticePeriodDays: Number,
    lastWorkingDayConfirmed: Date,
    exitInterviewDate: Date,
    exitInterviewBy: {
      type: String
    },
    exitInterviewNotes: String,
    handoverNotes: String,
    knowledgeTransfer: {
      completed: Boolean,
      details: String,
      handoverTo: String
    }
  },
  { timestamps: true }
);

ExitFormalitySchema.index({ employeeId: 1, status: 1 });

module.exports = mongoose.model('ExitFormality', ExitFormalitySchema);