const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

// @desc    Get team appraisals (for managers)
// @route   GET /api/team-appraisals
// @access  Private (Manager)
router.get('/', auth, async (req, res) => {
  try {
    // Populate employee details
    // Note: employeeId in SelfAppraisal is a ref to Employee model
    const appraisals = await SelfAppraisal.find()
      .populate('employeeId', 'name employeeId designation department avatar');

    // Transform to frontend format
    const formattedAppraisals = appraisals.map(app => {
      const emp = app.employeeId || {};
      
      return {
        id: app._id,
        financialYr: app.year,
        empId: emp.employeeId || 'N/A',
        name: emp.name || 'Unknown',
        avatar: emp.avatar || (emp.name ? emp.name[0] : '?'),
        designation: emp.designation || 'N/A',
        department: emp.department || 'N/A',
        status: app.status,
        selfAppraiseeComments: app.overallContribution || '',
        managerComments: app.managerComments || '',
        keyPerformance: app.keyPerformance || '',
        appraiseeComments: app.appraiseeComments || '',
        appraiserRating: app.appraiserRating || '',
        leadership: app.leadership || '',
        attitude: app.attitude || '',
        communication: app.communication || ''
      };
    });

    res.json(formattedAppraisals);
  } catch (error) {
    console.error('Error fetching team appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Update team appraisal (for managers)
// @route   PUT /api/team-appraisals/:id
// @access  Private (Manager)
router.put('/:id', auth, async (req, res) => {
  try {
    const { 
      managerComments, 
      keyPerformance, 
      appraiseeComments, 
      appraiserRating, 
      leadership, 
      attitude, 
      communication,
      status 
    } = req.body;

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    // Update fields
    if (managerComments !== undefined) appraisal.managerComments = managerComments;
    if (keyPerformance !== undefined) appraisal.keyPerformance = keyPerformance;
    if (appraiseeComments !== undefined) appraisal.appraiseeComments = appraiseeComments;
    if (appraiserRating !== undefined) appraisal.appraiserRating = appraiserRating;
    if (leadership !== undefined) appraisal.leadership = leadership;
    if (attitude !== undefined) appraisal.attitude = attitude;
    if (communication !== undefined) appraisal.communication = communication;
    if (status !== undefined) appraisal.status = status;

    appraisal.updatedAt = Date.now();
    
    // Optionally record who updated it if needed
    // appraisal.appraiser = req.user.name; 

    await appraisal.save();

    res.json(appraisal);
  } catch (error) {
    console.error('Error updating team appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
