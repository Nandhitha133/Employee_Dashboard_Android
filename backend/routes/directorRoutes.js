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

    // Strict Visibility Rule: Only assigned Director can view
    // Sequential Flow: Include all post-review stages including final Reviewed state
    const statusFilter = { $in: ['REVIEWER_COMPLETED', 'DIRECTOR_APPROVED', 'RELEASED', 'Reviewed'] };

    const role = (req.user.role || '').toLowerCase();
    const isDirector = role === 'director';
    const isAdmin = role === 'admin';

    if (!isDirector && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view director appraisals' });
    }

    const query = {
      $and: [
        { status: statusFilter },
        {
          $or: [
            { directorId: req.user.employeeId },
            { director: req.user.name }
          ]
        }
      ]
    };

    // Populate employee details
    const appraisals = await SelfAppraisal.find(query)
      .populate('employeeId', 'name employeeId designation department division avatar ctc location branch');

    // Transform to frontend format
    const formattedAppraisals = appraisals.map(app => {
      const emp = app.employeeId || {};

      return {
        id: app._id,
        financialYr: app.year,
        employeeMongoId: emp._id,
        empId: emp.employeeId || 'N/A',
        name: emp.name || 'Unknown',
        avatar: emp.avatar || (emp.name ? emp.name[0] : '?'),
        designation: emp.designation || 'N/A',
        department: emp.department || 'N/A',
        division: app.division || emp.division || 'N/A',
        location: emp.location || emp.branch || 'Chennai',
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
// @access  Private (Director/Admin)
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

    const role = (req.user.role || '').toLowerCase();
    const isDirectorRole = role === 'director';
    const isAdmin = role === 'admin';

    if (!isDirectorRole && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this appraisal' });
    }

    const userEmployeeId = req.user.employeeId;
    const userName = req.user.name;

    const isDirectorAssigned =
      (appraisal.directorId && appraisal.directorId === userEmployeeId) ||
      (appraisal.director && appraisal.director === userName);

    if (!isDirectorAssigned) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to update this appraisal' });
    }

    if (status) {
      appraisal.status = status;
      if (status === 'DIRECTOR_APPROVED') {
        appraisal.employeeAcceptanceStatus = 'PENDING';
        appraisal.finalStatus = undefined;
      }
    }
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
// @access  Private (Director/Admin)
router.post('/release', auth, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No records selected' });
    }

    const role = (req.user.role || '').toLowerCase();
    const isDirectorRole = role === 'director';
    const isAdmin = role === 'admin';

    if (!isDirectorRole && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to release appraisals' });
    }

    const userEmployeeId = req.user.employeeId;
    const userName = req.user.name;

    const findQuery = {
      _id: { $in: ids },
      $or: [
        { directorId: userEmployeeId },
        { director: userName }
      ]
    };

    const appraisals = await SelfAppraisal.find(findQuery);

    if (!appraisals.length) {
      return res.status(403).json({ success: false, message: 'No authorized appraisals to release' });
    }

    let modifiedCount = 0;

    for (const appraisal of appraisals) {
      appraisal.status = 'DIRECTOR_APPROVED';
      appraisal.employeeAcceptanceStatus = 'PENDING';
      appraisal.finalStatus = undefined;
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
