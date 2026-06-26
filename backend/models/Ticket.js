const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium',
  },
  subject: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Open', 'Resolved', 'Closed', 'Reopened'],
    default: 'Open',
  },
  attachments: [{
    type: String,
  }],
  comments: [{
    commenterId: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  }],
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
