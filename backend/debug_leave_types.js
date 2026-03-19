const mongoose = require('mongoose');
require('dotenv').config();

const LeaveApplicationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employeeId: { type: String },
  leaveType: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  totalDays: { type: Number },
  status: { type: String },
  reason: { type: String }
}, { timestamps: true });

const LeaveApplication = mongoose.model('LeaveApplication', LeaveApplicationSchema);

async function checkLeaves() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-management'; 
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const leaves = await LeaveApplication.find().sort({ createdAt: -1 }).limit(10).lean();
    
    console.log('Latest 10 Leave Applications:');
    leaves.forEach(l => {
      console.log(`ID: ${l._id}`);
      console.log(`  Employee: ${l.employeeId}`);
      console.log(`  Type: '${l.leaveType}'`);
      console.log(`  Days: ${l.totalDays}`);
      console.log(`  Status: ${l.status}`);
      console.log(`  Created: ${l.createdAt}`);
      console.log('---');
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkLeaves();
