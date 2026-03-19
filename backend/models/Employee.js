// models/Employee.js
const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  employeename: String,
  location: String,
  department: String,
  dateOfBirth: Date,
  bloodGroup: String,
  gender: String,
  designation: String,
  position: String,
  role: String,
  division: String,
  dateOfJoining: Date,
  experience: String,
  currentExperience: String,
  previousExperience: String,
  previousOrganizations: [{
    organization: String,
    designation: String,
    position: String,
    startDate: Date,
    endDate: Date
  }],
  qualification: String,
  highestQualification: String,
  mobileNo: String,
  contactNumber: String,
  guardianName: String,
  emergencyMobileNo: String,
  emergencyContact: String,
  maritalStatus: String,
  spouseName: String,
  spouseContact: String,
  pan: String,
  aadhaar: String,
  passportNumber: String,
  address: String,
  permanentAddress: String,
  currentAddress: String,
  email: String,
  bankName: String,
  bankAccount: String,
  branch: String,
  ifsc: String,
  nationality: String,
  uan: String,
  basicDA: Number,
  hra: Number,
  specialAllowance: Number,
  gratuity: Number,
  lop: Number,
  pf: Number,
  esi: Number,
  tax: Number,
  professionalTax: Number,
  loanDeduction: Number,
  totalEarnings: Number,
  totalDeductions: Number,
  netSalary: Number,
  ctc: Number,
  leaveBalances: {
    casual: {
      allocated: Number,
      used: Number,
      balance: Number
    },
    sick: {
      allocated: Number,
      used: Number,
      balance: Number
    },
    privilege: {
      allocated: Number,
      used: Number,
      balance: Number,
      nonCarryAllocated: Number,
      carryAllocated: Number,
      carryForwardEligibleBalance: Number
    },
    totalBalance: Number
  },
  leaveBalanceUpdatedAt: Date,
  appraiser: String,
  reviewer: String,
  director: String,
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended'],
    default: 'Active'
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.name = ret.name || ret.employeename || '';
      ret.employeename = ret.employeename || ret.name || '';
      ret.mobileNo = ret.mobileNo || ret.contactNumber || '';
      ret.contactNumber = ret.contactNumber || ret.mobileNo || '';
      ret.emergencyMobile = ret.emergencyMobile || ret.emergencyMobileNo || ret.emergencyContact || '';
      ret.address = ret.address || ret.permanentAddress || ret.currentAddress || '';
      ret.dateofjoin = ret.dateofjoin || ret.dateOfJoining || null;
      ret.dob = ret.dob || ret.dateOfBirth || null;
      ret.highestQualification = ret.highestQualification || ret.qualification || '';
      ret.qualification = ret.qualification || ret.highestQualification || '';
      ret.designation = ret.designation || ret.position || ret.role || '';
      ret.position = ret.position || ret.designation || ret.role || '';
      if (Array.isArray(ret.previousOrganizations)) {
        ret.previousOrganizations = ret.previousOrganizations.map(org => ({
          ...org,
          designation: org.designation || org.position || org.role || '',
          position: org.position || org.designation || org.role || ''
        }));
      }
      return ret;
    }
  }
});

module.exports = mongoose.model('Employee', employeeSchema);
