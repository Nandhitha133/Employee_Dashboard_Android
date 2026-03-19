const mongoose = require('mongoose');

const RatingSchema = new mongoose.Schema({
  grade: { type: String, required: true },
  belowTarget: { type: String, default: '' },
  metTarget: { type: String, default: '' },
  target1_1: { type: String, default: '' },
  target1_25: { type: String, default: '' },
  target1_5: { type: String, default: '' }
}, { _id: false });

const IncrementMatrixSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true }, // Keeping ID for frontend compatibility
  category: { type: String, required: true },
  ratings: [RatingSchema]
}, { timestamps: true });

module.exports = mongoose.model('IncrementMatrix', IncrementMatrixSchema);
