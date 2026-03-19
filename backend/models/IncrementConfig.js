const mongoose = require('mongoose');

const IncrementConfigSchema = new mongoose.Schema({
  financialYear: { type: String, required: true, unique: true, default: '2024-2025' },
  enabledColumns: {
    belowTarget: { type: Boolean, default: false },
    metTarget: { type: Boolean, default: true },
    target1_1: { type: Boolean, default: false },
    target1_25: { type: Boolean, default: false },
    target1_5: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Modify getSingleton to getConfigByYear
IncrementConfigSchema.statics.getConfigByYear = async function(year) {
  const config = await this.findOne({ financialYear: year });
  if (config) return config;
  return this.create({ financialYear: year });
};

module.exports = mongoose.model('IncrementConfig', IncrementConfigSchema);
