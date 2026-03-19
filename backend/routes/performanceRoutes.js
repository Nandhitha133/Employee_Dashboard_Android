const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Appraisal ID' });
    }

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

    const isOwner =
      appraisal.employeeId &&
      appraisal.employeeId.toString() === employee._id.toString();

    const userEmployeeId = req.user.employeeId;
    const userName = req.user.name;

    const isAppraiser =
      (appraisal.appraiserId && appraisal.appraiserId === userEmployeeId) ||
      (appraisal.appraiser && appraisal.appraiser === userName);

    const isReviewer =
      (appraisal.reviewerId && appraisal.reviewerId === userEmployeeId) ||
      (appraisal.reviewer && appraisal.reviewer === userName);

    const isDirector =
      (appraisal.directorId && appraisal.directorId === userEmployeeId) ||
      (appraisal.director && appraisal.director === userName);

    if (!isOwner && !isAppraiser && !isReviewer && !isDirector) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to view this appraisal' });
    }

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
    const { 
      year, 
      division,
      projects, 
      overallContribution, 
      status,
      behaviourBased,
      processAdherence,
      technicalBased,
      growthBased
    } = req.body;

    if (!division || !division.trim()) {
      return res.status(400).json({ success: false, message: 'Division is required for self appraisal' });
    }

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

    // Resolve Workflow IDs based on Employee profile
    let appraiserId = null, reviewerId = null, directorId = null;
    
    if (employee.appraiser) {
        const appraiserUser = await Employee.findOne({ name: employee.appraiser });
        if (appraiserUser) appraiserId = appraiserUser.employeeId;
    }
    if (employee.reviewer) {
        const reviewerUser = await Employee.findOne({ name: employee.reviewer });
        if (reviewerUser) reviewerId = reviewerUser.employeeId;
    }
    if (employee.director) {
        const directorUser = await Employee.findOne({ name: employee.director });
        if (directorUser) directorId = directorUser.employeeId;
    }

    const newAppraisal = new SelfAppraisal({
      employeeId: employee._id,
      year,
      division,
      projects,
      overallContribution,
      status: status || 'Draft',
      behaviourBased,
      processAdherence,
      technicalBased,
      growthBased,
      appraiser: employee.appraiser || 'Pending Assignment',
      appraiserId,
      reviewer: employee.reviewer,
      reviewerId,
      director: employee.director,
      directorId
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Appraisal ID' });
    }

    const { 
      projects, 
      overallContribution, 
      status,
      division,
      behaviourBased,
      processAdherence,
      technicalBased,
      growthBased,
      employeeAcceptanceStatus,
      finalStatus
    } = req.body;

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    const employee = await Employee.findOne({ employeeId: req.user.employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee profile not found' });
    }

    if (!appraisal.employeeId || appraisal.employeeId.toString() !== employee._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to update this appraisal' });
    }

    if (division !== undefined && (!division || !division.trim())) {
      return res.status(400).json({ success: false, message: 'Division is required for self appraisal' });
    }

    if (projects) appraisal.projects = projects;
    if (overallContribution !== undefined) appraisal.overallContribution = overallContribution;
    if (division !== undefined) appraisal.division = division;
    if (behaviourBased !== undefined) appraisal.behaviourBased = behaviourBased;
    if (processAdherence !== undefined) appraisal.processAdherence = processAdherence;
    if (technicalBased !== undefined) appraisal.technicalBased = technicalBased;
    if (growthBased !== undefined) appraisal.growthBased = growthBased;
    if (status) appraisal.status = status;
    if (employeeAcceptanceStatus !== undefined) appraisal.employeeAcceptanceStatus = employeeAcceptanceStatus;
    if (finalStatus !== undefined) appraisal.finalStatus = finalStatus;
    
    // If submitting, refresh workflow routing from Employee profile
    if (status === 'Submitted' || status === 'SUBMITTED') {
        // Ensure status is normalized to SUBMITTED if that's the convention
        appraisal.status = 'SUBMITTED'; 
        
        const employee = await Employee.findById(appraisal.employeeId);
        if (employee) {
             if (employee.appraiser) {
                 const appraiserUser = await Employee.findOne({ name: employee.appraiser });
                 if (appraiserUser) appraisal.appraiserId = appraiserUser.employeeId;
                 appraisal.appraiser = employee.appraiser;
             }
             if (employee.reviewer) {
                 const reviewerUser = await Employee.findOne({ name: employee.reviewer });
                 if (reviewerUser) appraisal.reviewerId = reviewerUser.employeeId;
                 appraisal.reviewer = employee.reviewer;
             }
             if (employee.director) {
                 const directorUser = await Employee.findOne({ name: employee.director });
                 if (directorUser) appraisal.directorId = directorUser.employeeId;
                 appraisal.director = employee.director;
             }
        }
    }

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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Appraisal ID' });
    }

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
