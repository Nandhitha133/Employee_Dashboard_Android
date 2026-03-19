const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema(
  {
    candidateName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    division: {
      type: String,
      required: true,
      enum: ['SDS', 'TEKLA', 'DAS (Software)', 'Mechanical', 'Electrical'],
    },
    experience: { type: Number, required: true, min: 0 },
    resumeType: {
      type: String,
      required: true,
      enum: ['Employee Resume', 'Hiring Resume'],
    },
    filePath: { type: String, required: true },
    remarks: { type: String, default: '' },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

module.exports = mongoose.model('Resume', resumeSchema);

