const mongoose = require('mongoose');

const celebrationPostSchema = new mongoose.Schema({
  eventTitle: {
    type: String,
    required: true
  },
  eventType: {
    type: String,
    enum: ['Birthday', 'Anniversary', 'Festival', 'Achievement'],
    required: true
  },
  description: {
    type: String
  },
  eventDate: {
    type: Date,
    required: true
  },
  uploadedBy: {
    employeeId: String,
    name: String
  },
  department: {
    type: String
  },
  mediaUrl: {
    type: String // Image or Video URL
  },
  mediaType: {
    type: String,
    enum: ['image', 'video']
  },
  likes: [{
    type: String // Employee IDs who liked the post
  }],
  comments: [{
    user: String,
    userName: String,
    text: String,
    date: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('CelebrationPost', celebrationPostSchema);
