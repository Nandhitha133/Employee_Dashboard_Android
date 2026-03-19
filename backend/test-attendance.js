const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');

async function testAttendance() {
  try {
    await mongoose.connect('mongodb://localhost:27017/employees');
    
    // Check total attendance records
    const totalRecords = await Attendance.countDocuments();
    console.log('Total attendance records:', totalRecords);
    
    // Check recent records
    const recentRecords = await Attendance.find()
      .sort({ punchTime: -1 })
      .limit(10)
      .lean();
    
    console.log('\nRecent attendance records:');
    recentRecords.forEach((record, index) => {
      console.log(`${index + 1}. Employee: ${record.employeeId} - ${record.employeeName}`);
      console.log(`   Time: ${record.punchTime}`);
      console.log(`   Direction: ${record.direction}`);
      console.log(`   Source: ${record.source}`);
      console.log('   ---');
    });
    
    // Check records by source
    const sources = await Attendance.aggregate([
      {
        $group: {
          _id: '$source',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\nRecords by source:');
    sources.forEach(source => {
      console.log(`${source._id}: ${source.count} records`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testAttendance();