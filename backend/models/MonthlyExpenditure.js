const mongoose = require('mongoose');

const expenditureSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true
  },
  paymentMode: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  documentType: {
    type: String,
    default: 'Not Applicable'
  },
  fileName: {
    type: String,
    default: ''
  },
  filePath: {
    type: String,
    default: ''
  },
  fileData: {
    type: String, // Base64 string
    default: ''
  },
  remarks: {
    type: String,
    default: ''
  }
});

const monthlyExpenditureSchema = new mongoose.Schema({
  month: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  budgetAllocated: {
    type: Number,
    required: true,
    default: 0
  },
  expenditures: [expenditureSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Compound index to ensure uniqueness of Month + Year + Location
monthlyExpenditureSchema.index({ month: 1, year: 1, location: 1 }, { unique: true });

monthlyExpenditureSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MonthlyExpenditure', monthlyExpenditureSchema);
