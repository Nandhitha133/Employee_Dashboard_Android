const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Employee = require('./models/Employee');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/employees');
    console.log('MongoDB Connected for seeding...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// Seed data
const seedData = async () => {
  try {
    // Connect to database
    await connectDB();

    // Check if admin already exists
    let existingAdmin = await User.findOne({ email: 'admin@steel.com' });
    if (!existingAdmin) {
      existingAdmin = await User.findOne({ email: 'admin@caldim.com' });
    }
    if (existingAdmin) {
      console.log('Admin user already exists. Updating permissions...');

      // Update existing admin with full permissions
      existingAdmin.permissions = [
        'dashboard', 'user_access', 'employee_access', 'timesheet_access', 'project_access', 
        'attendance_access', 'leave_access', 'leave_view', 'leave_approval', 'leave_manage'
      ];
      existingAdmin.role = 'admin';

      await existingAdmin.save();
      console.log('Admin permissions updated successfully!');

      // Ensure corresponding Employee exists for employeeId login
      const adminEmployeeId = 'EMP001';
      let adminEmp = await Employee.findOne({ employeeId: adminEmployeeId });
      if (!adminEmp) {
        await Employee.create({
          employeeId: adminEmployeeId,
          name: existingAdmin.name || 'Admin User',
          email: existingAdmin.email,
          status: 'Active'
        });
        console.log('Created admin Employee mapping with employeeId:', adminEmployeeId);
      }
    } else {
      // Create new admin user
      const adminUser = new User({
        name: 'caldimAdmin',
        email: 'admin@caldim.com',
        password: 'admin123', // Will be hashed by the pre-save hook
        role: 'admin',
        permissions: [
          'dashboard', 'user_access', 'employee_access', 'timesheet_access', 'project_access', 
          'attendance_access', 'leave_access', 'leave_approval'
        ]
      });

      await adminUser.save();
      console.log('Admin user created successfully!');

      // Create corresponding Employee for employeeId login
      const adminEmployeeId = 'EMP001';
      await Employee.create({
        employeeId: adminEmployeeId,
        name: adminUser.name,
        email: adminUser.email,
        status: 'Active'
      });
      console.log('Created admin Employee mapping with employeeId:', adminEmployeeId);
    }

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

// Run the seed function
seedData();
