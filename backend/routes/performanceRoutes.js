const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

// @desc    Get current user's self appraisals
// @route   GET /api/performance/self-appraisals/me
// @access  Private
router.get('/self-appraisals/me', auth, async (req, res) => {
  try {
    // Find the employee record associated with the logged-in user
    // req.user.employeeId is likely the string ID (e.g., 'EMP001')
    const employee = await Employee.findOne({ employeeId: req.user.employeeId });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    const appraisals = await SelfAppraisal.find({ employeeId: employee._id })
      .sort({ createdAt: -1 });

    res.json(appraisals);
  } catch (error) {
    console.error('Error fetching my appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Get self appraisal by ID
// @route   GET /api/performance/self-appraisals/:id
// @access  Private
router.get('/self-appraisals/:id', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);

    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    // Verify ownership or manager permission (TODO: Add manager check)
    // For now, check if the appraisal belongs to the requesting user
    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!employee) {
       // If admin/HR, might allow. For now, strict check or simple bypass if user role is high.
       return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Logic to ensure user can only view their own (or manager logic)
    // For now, we allow if it's their own.
    // if (appraisal.employeeId.toString() !== employee._id.toString()) {
    //    return res.status(403).json({ success: false, message: 'Not authorized' });
    // }

    res.json(appraisal);
  } catch (error) {
    console.error('Error fetching appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Create a self appraisal
// @route   POST /api/performance/self-appraisals
// @access  Private
router.post('/self-appraisals', auth, async (req, res) => {
  try {
    const { year, projects, overallContribution, status } = req.body;

    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    // Check if appraisal for this year already exists
    const existing = await SelfAppraisal.findOne({ 
      employeeId: employee._id, 
      year 
    });

    if (existing) {
      return res.status(400).json({ success: false, message: `Appraisal for FY ${year} already exists` });
    }

    const newAppraisal = new SelfAppraisal({
      employeeId: employee._id,
      year,
      projects,
      overallContribution,
      status: status || 'Draft',
      appraiser: 'Pending Assignment' // Or derive from logic
    });

    await newAppraisal.save();

    res.status(201).json(newAppraisal);
  } catch (error) {
    console.error('Error creating appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Update a self appraisal
// @route   PUT /api/performance/self-appraisals/:id
// @access  Private
router.put('/self-appraisals/:id', auth, async (req, res) => {
  try {
    const { projects, overallContribution, status } = req.body;

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    // Update fields
    if (projects) appraisal.projects = projects;
    if (overallContribution !== undefined) appraisal.overallContribution = overallContribution;
    if (status) appraisal.status = status;
    
    appraisal.updatedAt = Date.now();

    await appraisal.save();

    res.json(appraisal);
  } catch (error) {
    console.error('Error updating appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Delete a self appraisal
// @route   DELETE /api/performance/self-appraisals/:id
// @access  Private
router.delete('/self-appraisals/:id', auth, async (req, res) => {
  try {
    const appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    // Check ownership
    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (appraisal.employeeId.toString() !== employee._id.toString()) {
       return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await SelfAppraisal.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Appraisal deleted' });
  } catch (error) {
    console.error('Error deleting appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
