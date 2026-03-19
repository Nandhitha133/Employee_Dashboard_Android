const mongoose = require('mongoose');

const SpecialPermissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeId: { type: String, default: '' },
  employeeName: { type: String, default: '' },
  date: { type: Date, required: true },
  shift: { type: String, default: '' },
  fromTime: { type: String, default: '' },
  toTime: { type: String, default: '' },
  totalHours: { type: Number, required: true },
  reason: { type: String, required: true },
  attachmentPath: { type: String, default: '' },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  approvedAt: { type: Date, default: null },
  rejectedReason: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('SpecialPermission', SpecialPermissionSchema);

