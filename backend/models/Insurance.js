const mongoose = require('mongoose');

const insuranceSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  designation: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    required: true
  },
  dateOfJoining: {
    type: String,
    required: true
  },
  dateOfBirth: {
    type: String,
    required: true
  },
  mobileNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  nomineeName: {
    type: String,
    required: true
  },
  nomineeRelationship: {
    type: String,
    required: true
  },
  nomineeMobileNumber: {
    type: String,
    required: true
  },
  insuredAmount: {
    type: String,
    default: '₹2,00,000'
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

module.exports = mongoose.model('Insurance', insuranceSchema);
