// routes/employees.js
const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get all employees - restricted based on user permissions
router.get('/', auth, async (req, res) => {
  try {
    
    // Full access for users with employee_access
    if (req.user.permissions?.includes('employee_access')) {
      const employees = await Employee.find().sort({ createdAt: -1 });
      return res.json(employees);
    }

    // Access for Project Managers (project_access)
    if (req.user.permissions?.includes('project_access') || req.user.role === 'projectmanager' || req.user.role === 'project_manager') {
      const employees = await Employee.find({}, {
        'name': 1,
        'employeeId': 1,
        'email': 1,
        'department': 1,
        'designation': 1,
        'position': 1,
        'division': 1,
        'branch': 1,
        '_id': 1
      }).sort({ name: 1 });
      return res.json(employees);
    }

    // Limited access for users with timesheet_access only
    if (req.user.permissions?.includes('timesheet_access')) {
      const employees = await Employee.find({}, {
        'name': 1,
        'employeeId': 1,
        'email': 1,
        'department': 1,
        'designation': 1,
        'position': 1,
        '_id': 1
      }).sort({ name: 1 });
      return res.json(employees);
    }

    // Otherwise deny
    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user's employee profile
router.get('/me', auth, async (req, res) => {
  try {
    const empId = req.user.employeeId;
    if (!empId) return res.status(404).json({ message: 'Employee ID not linked' });
    const employee = await Employee.findOne({ employeeId: empId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employee by ID - restricted based on user permissions
router.get('/:id', auth, async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    if (req.user.permissions?.includes('employee_access')) {
      return res.json(employee);
    }

    if (req.user.permissions?.includes('timesheet_access')) {
      const limitedEmployee = {
        _id: employee._id,
        name: employee.name,
        employeeId: employee.employeeId,
        email: employee.email,
        department: employee.department,
        designation: employee.designation || employee.position || employee.role,
        position: employee.position
      };
      return res.json(limitedEmployee);
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new employee - requires admin permissions
router.post('/', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('user_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const body = req.body || {};
    const data = { ...body };
    if (!data.name && data.employeename) data.name = data.employeename;
    if (!data.employeename && data.name) data.employeename = data.name;
    if (!data.mobileNo && (data.contactNumber || data.phone)) data.mobileNo = data.contactNumber || data.phone;
    if (!data.contactNumber && data.mobileNo) data.contactNumber = data.mobileNo;
    if (!data.dateOfBirth && data.dob) data.dateOfBirth = data.dob;
    if (!data.dateOfJoining && (data.hireDate || data.dateofjoin)) data.dateOfJoining = data.hireDate || data.dateofjoin;
    if (!data.emergencyMobileNo && (data.emergencyMobile || data.emergencyContact)) data.emergencyMobileNo = data.emergencyMobile || data.emergencyContact;
    if (!data.emergencyContact && (data.emergencyMobileNo || data.emergencyMobile)) data.emergencyContact = data.emergencyMobileNo || data.emergencyMobile;
    if (!data.highestQualification && data.qualification) data.highestQualification = data.qualification;
    if (!data.qualification && data.highestQualification) data.qualification = data.highestQualification;
    if (!data.designation && (data.position || data.role)) data.designation = data.position || data.role;
    if (!data.position && data.role) data.position = data.role;
    if (!data.position && data.designation) data.position = data.designation;

    // Check if email is already in use by another user
    if (data.email && data.email !== req.user.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use by another user' });
      }
    }

    const permAddrParts = [
      data.permanentAddressLine,
      data.permanentCity,
      data.permanentState,
      data.permanentPincode
    ].filter(Boolean);
    const currAddrParts = [
      data.currentAddressLine,
      data.currentCity,
      data.currentState,
      data.currentPincode
    ].filter(Boolean);
    if (!data.permanentAddress && permAddrParts.length) {
      data.permanentAddress = permAddrParts.join(', ');
    }
    if (!data.currentAddress && currAddrParts.length) {
      data.currentAddress = currAddrParts.join(', ');
    }
    if (Array.isArray(data.previousOrganizations)) {
      data.previousOrganizations = data.previousOrganizations.map(org => {
        const o = { ...org };
        if (!o.designation && (o.position || o.role)) o.designation = o.position || o.role;
        if (!o.position && o.role) o.position = o.role;
        if (!o.position && o.designation) o.position = o.designation;
        delete o.role;
        return o;
      });
    }
    delete data.role;

    const employee = new Employee(data);
    const savedEmployee = await employee.save();
    res.status(201).json(savedEmployee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update current user's own employee profile (self-service)
router.put('/me', auth, async (req, res) => {
  try {
    const empId = req.user.employeeId;
    if (!empId) return res.status(404).json({ message: 'Employee ID not linked' });

    const body = req.body || {};
    const data = { ...body };
    if (!data.name && data.employeename) data.name = data.employeename;
    if (!data.employeename && data.name) data.employeename = data.name;
    if (!data.mobileNo && (data.contactNumber || data.phone)) data.mobileNo = data.contactNumber || data.phone;
    if (!data.contactNumber && data.mobileNo) data.contactNumber = data.mobileNo;
    if (!data.dateOfBirth && data.dob) data.dateOfBirth = data.dob;
    if (!data.dateOfJoining && (data.hireDate || data.dateofjoin)) data.dateOfJoining = data.hireDate || data.dateofjoin;
    if (!data.emergencyMobileNo && (data.emergencyMobile || data.emergencyContact)) data.emergencyMobileNo = data.emergencyMobile || data.emergencyContact;
    if (!data.emergencyContact && (data.emergencyMobileNo || data.emergencyMobile)) data.emergencyContact = data.emergencyMobileNo || data.emergencyMobile;
    if (!data.highestQualification && data.qualification) data.highestQualification = data.qualification;
    if (!data.qualification && data.highestQualification) data.qualification = data.highestQualification;
    if (!data.designation && (data.position || data.role)) data.designation = data.position || data.role;
    if (!data.position && data.role) data.position = data.role;
    if (!data.position && data.designation) data.position = data.designation;

    // Check if email is already in use by another user
    if (data.email && data.email !== req.user.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use by another user' });
      }
    }

    const permAddrParts = [
      data.permanentAddressLine,
      data.permanentCity,
      data.permanentState,
      data.permanentPincode
    ].filter(Boolean);
    const currAddrParts = [
      data.currentAddressLine,
      data.currentCity,
      data.currentState,
      data.currentPincode
    ].filter(Boolean);
    if (!data.permanentAddress && permAddrParts.length) {
      data.permanentAddress = permAddrParts.join(', ');
    }
    if (!data.currentAddress && currAddrParts.length) {
      data.currentAddress = currAddrParts.join(', ');
    }
    if (Array.isArray(data.previousOrganizations)) {
      data.previousOrganizations = data.previousOrganizations.map(org => {
        const o = { ...org };
        if (!o.designation && (o.position || o.role)) o.designation = o.position || o.role;
        if (!o.position && o.role) o.position = o.role;
        if (!o.position && o.designation) o.position = o.designation;
        delete o.role;
        return o;
      });
    }
    delete data.role;

    const employee = await Employee.findOneAndUpdate(
      { employeeId: empId },
      data,
      { new: true, runValidators: true }
    );
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    // Sync email change to User record if it exists
    if (data.email && data.email !== req.user.email) {
      await User.findByIdAndUpdate(req.user._id, { email: data.email });
    }

    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update employee - requires admin permissions
router.put('/:id', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('user_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const body = req.body || {};
    const data = { ...body };
    if (!data.name && data.employeename) data.name = data.employeename;
    if (!data.employeename && data.name) data.employeename = data.name;
    if (!data.mobileNo && (data.contactNumber || data.phone)) data.mobileNo = data.contactNumber || data.phone;
    if (!data.contactNumber && data.mobileNo) data.contactNumber = data.mobileNo;
    if (!data.dateOfBirth && data.dob) data.dateOfBirth = data.dob;
    if (!data.dateOfJoining && (data.hireDate || data.dateofjoin)) data.dateOfJoining = data.hireDate || data.dateofjoin;
    if (!data.emergencyMobileNo && (data.emergencyMobile || data.emergencyContact)) data.emergencyMobileNo = data.emergencyMobile || data.emergencyContact;
    if (!data.emergencyContact && (data.emergencyMobileNo || data.emergencyMobile)) data.emergencyContact = data.emergencyMobileNo || data.emergencyMobile;
    if (!data.highestQualification && data.qualification) data.highestQualification = data.qualification;
    if (!data.qualification && data.highestQualification) data.qualification = data.highestQualification;
    if (!data.designation && (data.position || data.role)) data.designation = data.position || data.role;
    if (!data.position && data.role) data.position = data.role;
    if (!data.position && data.designation) data.position = data.designation;
    const permAddrParts = [
      data.permanentAddressLine,
      data.permanentCity,
      data.permanentState,
      data.permanentPincode
    ].filter(Boolean);
    const currAddrParts = [
      data.currentAddressLine,
      data.currentCity,
      data.currentState,
      data.currentPincode
    ].filter(Boolean);
    if (!data.permanentAddress && permAddrParts.length) {
      data.permanentAddress = permAddrParts.join(', ');
    }
    if (!data.currentAddress && currAddrParts.length) {
      data.currentAddress = currAddrParts.join(', ');
    }
    if (Array.isArray(data.previousOrganizations)) {
      data.previousOrganizations = data.previousOrganizations.map(org => {
        const o = { ...org };
        if (!o.designation && (o.position || o.role)) o.designation = o.position || o.role;
        if (!o.position && o.role) o.position = o.role;
        if (!o.position && o.designation) o.position = o.designation;
        delete o.role;
        return o;
      });
    }
    delete data.role;

    const oldEmployee = await Employee.findById(req.params.id);
    if (!oldEmployee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if email is already in use by another user
    if (data.email && data.email !== oldEmployee.email) {
      const existingUser = await User.findOne({ email: data.email });
      if (existingUser) {
        return res.status(400).json({ message: 'Email is already in use by another user' });
      }
    }

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    // Sync email/employeeId change to User record
    const emailChanged = data.email && data.email !== oldEmployee.email;
    const empIdChanged = data.employeeId && data.employeeId !== oldEmployee.employeeId;

    if (emailChanged || empIdChanged) {
       // Try to find user by OLD employeeId first
       let user = await User.findOne({ employeeId: oldEmployee.employeeId });
       
       // If not found by employeeId, try by OLD email
       if (!user) {
         user = await User.findOne({ email: oldEmployee.email });
       }

       if (user) {
         if (emailChanged) user.email = data.email;
         if (empIdChanged) user.employeeId = data.employeeId;
         // Ensure link
         if (!user.employeeId) user.employeeId = data.employeeId || oldEmployee.employeeId;
         
         await user.save();
       }
    }

    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete employee - requires admin permissions
router.delete('/:id', auth, async (req, res) => {
  try {
    // Check if user has admin permissions
    if (!req.user.permissions?.includes('user_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get employees for timesheet purposes only (limited data)
router.get('/timesheet/employees', auth, async (req, res) => {
  try {
    // Check if user has timesheet access
    if (!req.user.permissions?.includes('timesheet_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Return only basic employee info needed for timesheets
    const employees = await Employee.find({}, {
      'name': 1,
      'employeeId': 1,
      'email': 1,
      'department': 1,
      'designation': 1,
      'position': 1,
      '_id': 1
    }).sort({ name: 1 });
    
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
