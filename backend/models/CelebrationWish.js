const mongoose = require('mongoose');

const celebrationWishSchema = new mongoose.Schema({
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
    required: true,
    index: true
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
    type: String // URL for emoji or GIF
  },
  wishDate: {
    type: Date,
    default: Date.now
  },
  wishTime: {
    type: String
  },
  visibility: {
    type: String,
    enum: ['Public', 'Private'],
    default: 'Public'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('CelebrationWish', celebrationWishSchema);
