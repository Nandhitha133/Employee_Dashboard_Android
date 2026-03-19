const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Add a toJSON transform to format dates properly
const dateOptions = { 
  year: 'numeric', 
  month: 'short', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
};

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['projectmanager', 'admin', 'employees', 'teamlead', 'manager', 'hr']
  },
  employeeId: {
    type: String
  },
  permissions: [{
    type: String,
    enum: [
      'dashboard',
      'user_access',
      'employee_access',
      'timesheet_access',
      'attendance_access',
      'project_access',
      'leave_access',
      'leave_approval',
      'leave_manage',
      'leave_view',
      'leave_manage_trainees',
      'payroll_access',
      'expenditure_access',
      'home',
      'my_profile',
      'exit_form_access',
      'exit_approval_access',
      'payroll_view',
      'loan_view',
      'gratuity_view',
      'announcement_manage',
      'reward_access',
      'team_access'
    ]
  }],
  lastLogin: {
    type: Date,
    default: null
  },
  loginHistory: [{
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  resetOtp: String,
  resetOtpExpiry: Date
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      if (ret.lastLogin) {
        ret.lastLogin = new Date(ret.lastLogin).toLocaleString('en-US', dateOptions);
      }
      return ret;
    }
  }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.updateLoginInfo = function(ipAddress, userAgent) {
  this.lastLogin = new Date();
  this.loginHistory.push({
    timestamp: new Date(),
    ipAddress: ipAddress,
    userAgent: userAgent
  });
  
  // Keep only the last 10 login entries
  if (this.loginHistory.length > 10) {
    this.loginHistory = this.loginHistory.slice(-10);
  }
  
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
