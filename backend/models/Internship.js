const mongoose = require('mongoose');

const internshipSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },
  collegeName: {
    type: String,
    required: [true, 'College name is required'],
    trim: true
  },
  degree: {
    type: String,
    required: [true, 'Degree is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  internshipType: {
    type: String,
    enum: ['Internship', 'Inplant Training', 'Project Internship', 'Summer Internship', 'Winter Internship'],
    default: 'Internship'
  },
  mentor: {
    type: String,
    required: [true, 'Mentor name is required'],
    trim: true
  },
  referenceNote: {
    type: String,
    trim: true,
    default: ''
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['Completed', 'Ongoing', 'Terminated'],
    default: 'Completed'
  },
  contactEmail: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  contactPhone: {
    type: String,
    trim: true,
    match: [/^[0-9]{10}$/, 'Phone number must be 10 digits']
  },
  // Bank Details
  bankName: {
    type: String,
    required: [true, 'Bank Name is required'],
    trim: true
  },
  accountNumber: {
    type: String,
    required: [true, 'Account Number is required'],
    trim: true
  },
  ifscCode: {
    type: String,
    required: [true, 'IFSC Code is required'],
    trim: true
  },
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
internshipSchema.index({ fullName: 1 });
internshipSchema.index({ collegeName: 1 });
internshipSchema.index({ internshipType: 1 });
internshipSchema.index({ status: 1 });
internshipSchema.index({ mentor: 1 });
internshipSchema.index({ createdAt: -1 });

// Virtual for duration in months
internshipSchema.virtual('durationMonths').get(function() {
  if (!this.startDate || !this.endDate) return null;
  
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end - start);
  const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
  
  return diffMonths;
});

// Virtual for duration display
internshipSchema.virtual('durationDisplay').get(function() {
  if (!this.startDate || !this.endDate) return 'N/A';
  
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
  }
});

// Pre-save middleware to update updatedAt
internshipSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Pre-find middleware to filter active records
internshipSchema.pre(/^find/, function(next) {
  if (this.options._recursed) {
    return next();
  }
  
  this.where({ isActive: true });
  next();
});

// Static method to get statistics
internshipSchema.statics.getStatistics = async function() {
  try {
    const stats = await this.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } },
          ongoing: { $sum: { $cond: [{ $eq: ['$status', 'Ongoing'] }, 1, 0] } },
          terminated: { $sum: { $cond: [{ $eq: ['$status', 'Terminated'] }, 1, 0] } },
          avgDuration: { $avg: { $ifNull: ['$durationMonths', 0] } },
          uniqueColleges: { $addToSet: '$collegeName' },
          uniqueDepartments: { $addToSet: '$department' }
        }
      },
      {
        $project: {
          total: 1,
          completed: 1,
          ongoing: 1,
          terminated: 1,
          avgDuration: { $round: ['$avgDuration', 1] },
          uniqueCollegesCount: { $size: '$uniqueColleges' },
          uniqueDepartmentsCount: { $size: '$uniqueDepartments' }
        }
      }
    ]);
    
    return stats[0] || {
      total: 0,
      completed: 0,
      ongoing: 0,
      terminated: 0,
      avgDuration: 0,
      uniqueCollegesCount: 0,
      uniqueDepartmentsCount: 0
    };
  } catch (error) {
    console.error('Error getting internship statistics:', error);
    throw error;
  }
};

// Static method to get type-wise distribution
internshipSchema.statics.getTypeDistribution = async function() {
  try {
    const distribution = await this.aggregate([
      {
        $group: {
          _id: '$internshipType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    return distribution;
  } catch (error) {
    console.error('Error getting type distribution:', error);
    throw error;
  }
};

// Static method to search interns
internshipSchema.statics.searchInterns = async function(searchTerm, filters = {}) {
  try {
    const query = { isActive: true };
    
    // Build search query
    if (searchTerm) {
      query.$or = [
        { fullName: { $regex: searchTerm, $options: 'i' } },
        { collegeName: { $regex: searchTerm, $options: 'i' } },
        { department: { $regex: searchTerm, $options: 'i' } },
        { mentor: { $regex: searchTerm, $options: 'i' } },
        { degree: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    // Apply filters
    if (filters.internshipType && filters.internshipType !== 'all') {
      query.internshipType = filters.internshipType;
    }
    
    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }
    
    if (filters.collegeName && filters.collegeName !== 'all') {
      query.collegeName = filters.collegeName;
    }
    
    if (filters.startDate && filters.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate)
      };
    }
    
    const interns = await this.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    return interns;
  } catch (error) {
    console.error('Error searching interns:', error);
    throw error;
  }
};

const Internship = mongoose.model('Internship', internshipSchema);

module.exports = Internship;