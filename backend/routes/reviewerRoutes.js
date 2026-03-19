const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

const { calculateIncrement } = require('../utils/incrementUtils');

// @desc    Get reviewer appraisals (for reviewers/HR)
// @route   GET /api/performance/reviewer
// @access  Private (Reviewer/Admin)
router.get('/', auth, async (req, res) => {
  try {
    // Check permissions if needed (e.g. req.user.role === 'Admin' or 'Reviewer')

    const statusFilter = {
      $in: ['Submitted', 'SUBMITTED', 'APPRAISER_COMPLETED', 'REVIEWER_COMPLETED', 'DIRECTOR_APPROVED', 'RELEASED', 'Reviewed']
    };

    const query = {
      $and: [
        { status: statusFilter },
        {
          $or: [
            { reviewerId: req.user.employeeId },
            { reviewer: req.user.name }
          ]
        }
      ]
    };

    // Populate employee details
    const appraisals = await SelfAppraisal.find(query)
      .populate('employeeId', 'name employeeId designation department division location avatar ctc');

    // Transform to frontend format
    // Use Promise.all to handle async calculation
    const formattedAppraisals = await Promise.all(
      appraisals.map(async (app) => {
        const emp = app.employeeId || {};
        const baseSalary = Number(emp.ctc || 0);

        // AUTO-FIX: If incrementPercentage is 0 or missing, try to calculate it
        // This ensures old records or records where Manager didn't trigger calculation are fixed
        let finalIncrementPercentage = app.incrementPercentage || 0;

        if (
          finalIncrementPercentage === 0 &&
          app.appraiserRating &&
          app.year &&
          emp.designation
        ) {
          try {
            const calculated = await calculateIncrement(
              app.year,
              emp.designation,
              app.appraiserRating
            );
            if (calculated > 0) {
              finalIncrementPercentage = calculated;
              await SelfAppraisal.updateOne(
                { _id: app._id },
                { $set: { incrementPercentage: calculated } }
              );
            }
          } catch (err) {
            console.error(`Auto-calc failed for appraisal ${app._id}:`, err);
          }
        }

        let incrementCorrectionPercentage = app.incrementCorrectionPercentage || 0;
        let incrementAmount = app.incrementAmount || 0;
        let revisedSalary = app.revisedSalary || 0;

        // AUTO-CALC: Derive increment amount and revised salary if missing but we have salary and %
        if (baseSalary > 0) {
          const totalPct = finalIncrementPercentage + incrementCorrectionPercentage;
          const updateDoc = {};

          if (incrementAmount === 0 && totalPct !== 0) {
            incrementAmount = Math.round((baseSalary * totalPct) / 100);
            updateDoc.incrementAmount = incrementAmount;
          }

          if (revisedSalary === 0 && (incrementAmount !== 0 || totalPct !== 0)) {
            revisedSalary = Math.round(baseSalary + incrementAmount);
            updateDoc.revisedSalary = revisedSalary;
          }

          if (Object.keys(updateDoc).length > 0) {
            try {
              await SelfAppraisal.updateOne(
                { _id: app._id },
                { $set: updateDoc }
              );
            } catch (err) {
              console.error(
                `Auto-calc amount/revised failed for appraisal ${app._id}:`,
                err
              );
            }
          }
        }

        // Helper to convert Map to Object
        const mapToObj = (map) => {
          if (!map) return {};
          try {
            if (typeof map.toJSON === 'function') return map.toJSON();
            if (map instanceof Map) return Object.fromEntries(map);
            return map;
          } catch (e) {
            return map || {};
          }
        };

        return {
          id: app._id,
          financialYr: app.year,
          empId: emp.employeeId || 'N/A',
          name: emp.name || 'Unknown',
          avatar: emp.avatar || (emp.name ? emp.name[0] : '?'),
          designation: emp.designation || 'N/A',
          department: emp.department || 'N/A',
          division: app.division || emp.division || 'N/A',
          location: emp.location || 'N/A',
          status: app.status,

          // Appraisal content
          selfAppraiseeComments: app.overallContribution || '',
          managerComments: app.managerComments || '',
          projects: app.projects || [],

          // Full Sectional Objects - Self (Fixed Map access)
          behaviourSelf: mapToObj(app.behaviourBased),
          processSelf: mapToObj(app.processAdherence),
          technicalSelf: mapToObj(app.technicalBased),
          growthSelf: mapToObj(app.growthBased),

          // Sectional Comments - Manager
          behaviourManagerComments: app.behaviourManagerComments || '',
          processManagerComments: app.processManagerComments || '',
          technicalManagerComments: app.technicalManagerComments || '',
          growthManagerComments: app.growthManagerComments || '',

          // Manager Ratings (Detailed)
          behaviourManagerRatings: mapToObj(app.behaviourManagerRatings),
          processManagerRatings: mapToObj(app.processManagerRatings),
          technicalManagerRatings: mapToObj(app.technicalManagerRatings),
          growthManagerRatings: mapToObj(app.growthManagerRatings),

          // Extra Manager Fields
          keyPerformance: app.keyPerformance || '',
          appraiseeComments: app.appraiseeComments || '',
          appraiserRating: app.appraiserRating || '',
          leadership: app.leadership || '',
          attitude: app.attitude || '',
          communication: app.communication || '',

          // Reviewer content
          reviewerComments: app.reviewerComments || '',
          currentSalary: baseSalary,
          incrementPercentage: finalIncrementPercentage,
          incrementCorrectionPercentage,
          incrementAmount,
          revisedSalary
        };
      })
    );

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

    const userEmployeeId = req.user.employeeId;
    const userName = req.user.name;

    const isReviewer =
      (appraisal.reviewerId && appraisal.reviewerId === userEmployeeId) ||
      (appraisal.reviewer && appraisal.reviewer === userName);

    if (!isReviewer) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to update this appraisal' });
    }

    // Update fields - Prevent Reviewer from changing incrementPercentage directly
    if (reviewerComments !== undefined) appraisal.reviewerComments = reviewerComments;
    // incrementPercentage is READ-ONLY for Reviewer - it comes from Manager/System
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

    const userEmployeeId = req.user.employeeId;
    const userName = req.user.name;

    const allowedAppraisals = await SelfAppraisal.find({
      _id: { $in: ids },
      $or: [
        { reviewerId: userEmployeeId },
        { reviewer: userName }
      ]
    }).select('_id');

    const allowedIds = allowedAppraisals.map(a => a._id);

    if (!allowedIds.length) {
      return res.status(403).json({ success: false, message: 'No authorized appraisals to submit' });
    }

    const result = await SelfAppraisal.updateMany(
      { _id: { $in: allowedIds } },
      {
        $set: {
          status: 'REVIEWER_COMPLETED',
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
