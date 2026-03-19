const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

// @desc    Get appraisals for Director (DirectorApproval status or all)
// @route   GET /api/performance/director
// @access  Private (Director/Admin)
router.get('/', auth, async (req, res) => {
  try {
    // In a real app, you might check req.user.role === 'Director'
    
    // Populate employee details
    const appraisals = await SelfAppraisal.find()
      .populate('employeeId', 'name employeeId designation department avatar ctc');

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
        
        // Appraisal content
        selfAppraiseeComments: app.overallContribution || '',
        managerComments: app.managerComments || '',
        
        // Reviewer content
        reviewerComments: app.reviewerComments || '',
        directorComments: app.directorComments || '',
        currentSalary: emp.ctc || 0,
        incrementPercentage: app.incrementPercentage || 0,
        incrementCorrectionPercentage: app.incrementCorrectionPercentage || 0,
        incrementAmount: app.incrementAmount || 0,
        revisedSalary: app.revisedSalary || 0,

        // Timestamps
        updatedAt: app.updatedAt
      };
    });

    res.json(formattedAppraisals);
  } catch (error) {
    console.error('Error fetching director appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Update appraisal status (Approve/Reject)
// @route   PUT /api/performance/director/:id
// @access  Private (Director)
router.put('/:id', auth, async (req, res) => {
  try {
    const { 
      status, 
      directorComments,
      incrementPercentage,
      incrementCorrectionPercentage,
      incrementAmount,
      revisedSalary
    } = req.body;

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    if (status) appraisal.status = status;
    if (directorComments !== undefined) appraisal.directorComments = directorComments;
    if (incrementPercentage !== undefined) appraisal.incrementPercentage = incrementPercentage;
    if (incrementCorrectionPercentage !== undefined) appraisal.incrementCorrectionPercentage = incrementCorrectionPercentage;
    if (incrementAmount !== undefined) appraisal.incrementAmount = incrementAmount;
    if (revisedSalary !== undefined) appraisal.revisedSalary = revisedSalary;

    appraisal.updatedAt = Date.now();
    await appraisal.save();

    // If released, update Employee CTC
    if (status === 'Released' && appraisal.revisedSalary > 0) {
      await Employee.findByIdAndUpdate(appraisal.employeeId, {
        $set: { ctc: appraisal.revisedSalary }
      });
    }

    res.json(appraisal);
  } catch (error) {
    console.error('Error updating director appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Batch Release Appraisals
// @route   POST /api/performance/director/release
// @access  Private (Director)
router.post('/release', auth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No records selected' });
    }

    const appraisals = await SelfAppraisal.find({ _id: { $in: ids } });
    
    let modifiedCount = 0;
    
    for (const appraisal of appraisals) {
      appraisal.status = 'Released';
      appraisal.updatedAt = Date.now();
      await appraisal.save();

      // Update Employee CTC if revised salary is present
      if (appraisal.revisedSalary > 0) {
        await Employee.findByIdAndUpdate(appraisal.employeeId, {
          $set: { ctc: appraisal.revisedSalary }
        });
      }
      modifiedCount++;
    }

    res.json({ success: true, message: `Successfully released ${modifiedCount} appraisals and updated salaries` });
  } catch (error) {
    console.error('Error releasing appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
