const mongoose = require('mongoose');

const wishSchema = new mongoose.Schema({
  senderEmployeeId: {
    type: String,
    required: true
  },
  senderName: {
    type: String,
    required: true
  },
  receiverEmployeeId: {
    type: String,
    required: true
  },
  receiverName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  media: {
    type: String
  },
  visibility: {
    type: String,
    enum: ['Public', 'Private'],
    default: 'Public'
  },
  eventDate: {
    type: Date,
    required: true
  },
  eventType: {
    type: String,
    enum: ['Birthday', 'Work Anniversary'],
    required: true
  },
  wishYear: {
    type: Number,
    required: true
  },
  replyMessage: {
    type: String
  },
  replyDate: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Wish', wishSchema);
