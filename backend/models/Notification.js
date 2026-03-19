const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'LOGIN',
      'TIMESHEET_SUBMIT',
      'TIMESHEET_APPROVED',
      'TIMESHEET_REJECTED',
      'LEAVE_APPLY',
      'LEAVE_APPROVED',
      'LEAVE_REJECTED',
      'EXIT_SUBMIT',
      'EXIT_APPROVED',
      'EXIT_REJECTED',
      'SPECIAL_PERMISSION_SUBMIT',
      'SPECIAL_PERMISSION_APPROVED',
      'SPECIAL_PERMISSION_REJECTED',
      'OTHER'
    ],
    default: 'OTHER'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
