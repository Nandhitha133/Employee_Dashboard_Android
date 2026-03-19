const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

// @desc    Get reviewer appraisals (for reviewers/HR)
// @route   GET /api/performance/reviewer
// @access  Private (Reviewer/Admin)
router.get('/', auth, async (req, res) => {
  try {
    // Check permissions if needed (e.g. req.user.role === 'Admin' or 'Reviewer')
    
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
        currentSalary: emp.ctc || 0, // Using CTC as current salary
        incrementPercentage: app.incrementPercentage || 0,
        incrementCorrectionPercentage: app.incrementCorrectionPercentage || 0,
        incrementAmount: app.incrementAmount || 0,
        revisedSalary: app.revisedSalary || 0
      };
    });

    res.json(formattedAppraisals);
  } catch (error) {
    console.error('Error fetching reviewer appraisals:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Update reviewer appraisal
// @route   PUT /api/performance/reviewer/:id
// @access  Private (Reviewer)
router.put('/:id', auth, async (req, res) => {
  try {
    const { 
      reviewerComments, 
      incrementPercentage, 
      incrementCorrectionPercentage, 
      incrementAmount, 
      revisedSalary 
    } = req.body;

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    // Update fields
    if (reviewerComments !== undefined) appraisal.reviewerComments = reviewerComments;
    if (incrementPercentage !== undefined) appraisal.incrementPercentage = incrementPercentage;
    if (incrementCorrectionPercentage !== undefined) appraisal.incrementCorrectionPercentage = incrementCorrectionPercentage;
    if (incrementAmount !== undefined) appraisal.incrementAmount = incrementAmount;
    if (revisedSalary !== undefined) appraisal.revisedSalary = revisedSalary;
    
    appraisal.updatedAt = Date.now();
    
    await appraisal.save();

    res.json(appraisal);
  } catch (error) {
    console.error('Error updating reviewer appraisal:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Submit appraisals to Director (Batch update status)
// @route   POST /api/performance/reviewer/submit-director
// @access  Private (Reviewer)
router.post('/submit-director', auth, async (req, res) => {
  try {
    const { ids } = req.body; // Array of appraisal IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No records selected' });
    }

    const result = await SelfAppraisal.updateMany(
      { _id: { $in: ids } },
      { 
        $set: { 
          status: 'DirectorApproval',
          updatedAt: Date.now()
        } 
      }
    );

    res.json({ 
      success: true, 
      message: `${result.modifiedCount} records submitted to Director`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error submitting to Director:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
