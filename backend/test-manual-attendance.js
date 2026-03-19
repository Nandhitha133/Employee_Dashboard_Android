const mongoose = require('mongoose');
const Attendance = require('./models/Attendance');
const Employee = require('./models/Employee');

async function testManualAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employee-attendance');
    
    console.log('=== Checking Employees ===');
    const employeeCount = await Employee.countDocuments();
    console.log('Total employees:', employeeCount);
    
    let testEmployee;
    if (employeeCount === 0) {
      console.log('No employees found. Creating a test employee...');
      testEmployee = await Employee.create({
        employeeId: 'EMP001',
        name: 'Test Employee',
        email: 'test@company.com',
        position: 'Developer',
        mobileNo: '1234567890',
        status: 'Active'
      });
      console.log('Created test employee:', testEmployee.name);
    } else {
      testEmployee = await Employee.findOne({});
      console.log('Using existing employee:', testEmployee.name);
    }
    
    console.log('\n=== Testing Manual Attendance Entry ===');
    
    // Test manual attendance entry
    const attendanceData = {
      employeeId: testEmployee.employeeId,
      direction: 'in',
      deviceId: 'manual-test',
      source: 'manual'
    };
    
    console.log('Creating attendance record with data:', attendanceData);
    
    const attendanceRecord = await Attendance.create({
      employeeId: attendanceData.employeeId,
      employeeName: testEmployee.name,
      direction: attendanceData.direction,
      deviceId: attendanceData.deviceId,
      source: attendanceData.source,
      punchTime: new Date()
    });
    
    console.log('✅ Attendance record created successfully!');
    console.log('Record details:');
    console.log('- ID:', attendanceRecord._id);
    console.log('- Employee:', attendanceRecord.employeeName);
    console.log('- Direction:', attendanceRecord.direction);
    console.log('- Time:', attendanceRecord.punchTime);
    console.log('- Source:', attendanceRecord.source);
    
    console.log('\n=== Verifying Data Storage ===');
    const totalRecords = await Attendance.countDocuments();
    console.log('Total attendance records now:', totalRecords);
    
    const recentRecords = await Attendance.find()
      .sort({ punchTime: -1 })
      .limit(5)
      .lean();
    
    console.log('\nRecent attendance records:');
    recentRecords.forEach((record, index) => {
      console.log(`${index + 1}. ${record.employeeName} - ${record.direction} at ${record.punchTime}`);
    });
    
    mongoose.disconnect();
    console.log('\n✅ Test completed successfully! The attendance system is working.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    mongoose.disconnect();
    process.exit(1);
  }
}

testManualAttendance();