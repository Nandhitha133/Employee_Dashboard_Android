const mongoose = require('mongoose');

const insuranceClaimSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  claimNumber: {
    type: String,
    required: true,
    unique: true
  },
  memberName: {
    type: String,
    required: true
  },
  relationship: {
    type: String,
    required: true
  },
  spouseName: {
    type: String
  },
  children: [{
    name: String,
    age: String
  }],
  mobile: {
    type: String,
    required: true
  },
  treatment: {
    type: String,
    required: true
  },
  typeOfIllness: {
    type: String,
    required: true
  },
  otherIllness: {
    type: String
  },
  hospitalAddress: {
    type: String,
    required: true
  },
  dateOfAdmission: {
    type: Date,
    required: true
  },
  dateOfDischarge: {
    type: Date,
    required: true
  },
  sumInsured: {
    type: Number,
    required: true
  },
  requestedAmount: {
    type: Number,
    required: true
  },
  bankName: {
    type: String,
    required: true
  },
  accountNumber: {
    type: String,
    required: true
  },
  claimDate: {
    type: Date,
    default: Date.now
  },
  closeDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  },
  documents: {
    employeePhoto: String,
    dischargeBill: String,
    pharmacyBill: String,
    paymentReceipt: String
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

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);
