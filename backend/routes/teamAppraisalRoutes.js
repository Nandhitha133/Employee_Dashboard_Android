const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

const { calculateIncrement } = require('../utils/incrementUtils');

// @desc    Get team appraisals (for managers)
// @route   GET /api/team-appraisals
// @access  Private (Manager)
router.get('/', auth, async (req, res) => {
  try {
    // Strict Visibility Rule: Only assigned Appraiser can view (for manager roles)
    // Sequential Flow: Include all post-submission stages including final Reviewed state
    const statusFilter = {
      $in: ['Submitted', 'SUBMITTED', 'APPRAISER_COMPLETED', 'REVIEWER_COMPLETED', 'DIRECTOR_APPROVED', 'Released', 'Reviewed']
    };

    const role = (req.user.role || '').toLowerCase();
    const hasManagerLikeRole = [
      'manager',
      'lead',
      'appraiser',
      'projectmanager',
      'project_manager',
      'admin'
    ].includes(role);

    const hasManagerPermission =
      Array.isArray(req.user.permissions) &&
      (req.user.permissions.includes('project_access') ||
        req.user.permissions.includes('employee_access'));

    if (!hasManagerLikeRole && !hasManagerPermission) {
      return res.status(403).json({ success: false, message: 'Not authorized to view team appraisals' });
    }

    const query = {
      $and: [
        { status: statusFilter },
        {
          $or: [
            { appraiserId: req.user.employeeId },
            { appraiser: req.user.name }
          ]
        }
      ]
    };

    // Populate employee details
    // Note: employeeId in SelfAppraisal is a ref to Employee model
    const appraisals = await SelfAppraisal.find(query)
      .populate('employeeId', 'name employeeId designation department avatar location');

    // Transform to frontend format
    // Use Promise.all to handle async calculation
    const formattedAppraisals = await Promise.all(appraisals.map(async (app) => {
      const emp = app.employeeId || {};

      // AUTO-FIX: If incrementPercentage is 0 or missing, try to calculate it
      // This ensures Managers see the correct value even if they haven't opened it before
      let finalIncrementPercentage = app.incrementPercentage || 0;

      if (finalIncrementPercentage === 0 && app.appraiserRating && app.year && emp.designation) {
        try {
          const calculated = await calculateIncrement(app.year, emp.designation, app.appraiserRating);
          if (calculated > 0) {
            finalIncrementPercentage = calculated;
            // Update the DB record silently so it is fixed for good
            await SelfAppraisal.updateOne({ _id: app._id }, { $set: { incrementPercentage: calculated } });
          }
        } catch (err) {
          console.error(`Auto-calc failed for appraisal ${app._id}:`, err);
        }
      }

      return {
        id: app._id,
        financialYr: app.year,
        empId: emp.employeeId || 'N/A',
        name: emp.name || 'Unknown',
        avatar: emp.avatar || (emp.name ? emp.name[0] : '?'),
        designation: emp.designation || 'N/A',
        department: emp.department || 'N/A',
        division: app.division || '',
        location: emp.location || 'N/A',
        status: app.status,
        overallContribution: app.overallContribution || '',
        projects: app.projects || [],
        selfAppraiseeComments: app.overallContribution || '',
        managerComments: app.managerComments || '',
        keyPerformance: app.keyPerformance || '',
        appraiseeComments: app.appraiseeComments || '',
        appraiserRating: app.appraiserRating || '',
        leadership: app.leadership || '',
        attitude: app.attitude || '',
        communication: app.communication || '',
        incrementPercentage: finalIncrementPercentage,

        behaviourBased: app.behaviourBased ? (app.behaviourBased.toJSON ? app.behaviourBased.toJSON() : app.behaviourBased) : {},
        processAdherence: app.processAdherence ? (app.processAdherence.toJSON ? app.processAdherence.toJSON() : app.processAdherence) : {},
        technicalBased: app.technicalBased ? (app.technicalBased.toJSON ? app.technicalBased.toJSON() : app.technicalBased) : {},
        growthBased: app.growthBased ? (app.growthBased.toJSON ? app.growthBased.toJSON() : app.growthBased) : {},

        behaviourManagerComments: app.behaviourManagerComments || '',
        processManagerComments: app.processManagerComments || '',
        technicalManagerComments: app.technicalManagerComments || '',
        growthManagerComments: app.growthManagerComments || '',

        behaviourCommunicationManager: app.behaviourCommunicationManager || 0,
        behaviourTeamworkManager: app.behaviourTeamworkManager || 0,
        behaviourLeadershipManager: app.behaviourLeadershipManager || 0,
        behaviourAdaptabilityManager: app.behaviourAdaptabilityManager || 0,
        behaviourInitiativesManager: app.behaviourInitiativesManager || 0,

        processTimesheetManager: app.processTimesheetManager || 0,
        processReportStatusManager: app.processReportStatusManager || 0,
        processMeetingManager: app.processMeetingManager || 0,

        technicalCodingSkillsManager: app.technicalCodingSkillsManager || 0,
        technicalTestingManager: app.technicalTestingManager || 0,
        technicalDebuggingManager: app.technicalDebuggingManager || 0,
        technicalSdsManager: app.technicalSdsManager || 0,
        technicalTeklaManager: app.technicalTeklaManager || 0,

        growthLearningNewTechManager: app.growthLearningNewTechManager || 0,
        growthCertificationsManager: app.growthCertificationsManager || 0,

        behaviourManagerRatings: app.behaviourManagerRatings ? (app.behaviourManagerRatings.toJSON ? app.behaviourManagerRatings.toJSON() : app.behaviourManagerRatings) : {},
        processManagerRatings: app.processManagerRatings ? (app.processManagerRatings.toJSON ? app.processManagerRatings.toJSON() : app.processManagerRatings) : {},
        technicalManagerRatings: app.technicalManagerRatings ? (app.technicalManagerRatings.toJSON ? app.technicalManagerRatings.toJSON() : app.technicalManagerRatings) : {},
        growthManagerRatings: app.growthManagerRatings ? (app.growthManagerRatings.toJSON ? app.growthManagerRatings.toJSON() : app.growthManagerRatings) : {},
      };
    }));

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
      status,
      incrementPercentage,

      behaviourManagerComments,
      processManagerComments,
      technicalManagerComments,
      growthManagerComments,

      behaviourCommunicationManager,
      behaviourTeamworkManager,
      behaviourLeadershipManager,
      behaviourAdaptabilityManager,
      behaviourInitiativesManager,

      processTimesheetManager,
      processReportStatusManager,
      processMeetingManager,

      technicalCodingSkillsManager,
      technicalTestingManager,
      technicalDebuggingManager,
      technicalSdsManager,
      technicalTeklaManager,

      growthLearningNewTechManager,
      growthCertificationsManager,

      behaviourManagerRatings,
      processManagerRatings,
      technicalManagerRatings,
      growthManagerRatings
    } = req.body;

    let appraisal = await SelfAppraisal.findById(req.params.id);
    if (!appraisal) {
      return res.status(404).json({ success: false, message: 'Appraisal not found' });
    }

    const userEmployeeId = req.user.employeeId;
    const userName = req.user.name;

    const isAppraiser =
      (appraisal.appraiserId && appraisal.appraiserId === userEmployeeId) ||
      (appraisal.appraiser && appraisal.appraiser === userName);

    if (!isAppraiser) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authorized to update this appraisal' });
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
    if (incrementPercentage !== undefined) appraisal.incrementPercentage = incrementPercentage;

    if (behaviourManagerComments !== undefined) appraisal.behaviourManagerComments = behaviourManagerComments;
    if (processManagerComments !== undefined) appraisal.processManagerComments = processManagerComments;
    if (technicalManagerComments !== undefined) appraisal.technicalManagerComments = technicalManagerComments;
    if (growthManagerComments !== undefined) appraisal.growthManagerComments = growthManagerComments;

    if (behaviourCommunicationManager !== undefined) appraisal.behaviourCommunicationManager = behaviourCommunicationManager;
    if (behaviourTeamworkManager !== undefined) appraisal.behaviourTeamworkManager = behaviourTeamworkManager;
    if (behaviourLeadershipManager !== undefined) appraisal.behaviourLeadershipManager = behaviourLeadershipManager;
    if (behaviourAdaptabilityManager !== undefined) appraisal.behaviourAdaptabilityManager = behaviourAdaptabilityManager;
    if (behaviourInitiativesManager !== undefined) appraisal.behaviourInitiativesManager = behaviourInitiativesManager;

    if (processTimesheetManager !== undefined) appraisal.processTimesheetManager = processTimesheetManager;
    if (processReportStatusManager !== undefined) appraisal.processReportStatusManager = processReportStatusManager;
    if (processMeetingManager !== undefined) appraisal.processMeetingManager = processMeetingManager;

    if (technicalCodingSkillsManager !== undefined) appraisal.technicalCodingSkillsManager = technicalCodingSkillsManager;
    if (technicalTestingManager !== undefined) appraisal.technicalTestingManager = technicalTestingManager;
    if (technicalDebuggingManager !== undefined) appraisal.technicalDebuggingManager = technicalDebuggingManager;
    if (technicalSdsManager !== undefined) appraisal.technicalSdsManager = technicalSdsManager;
    if (technicalTeklaManager !== undefined) appraisal.technicalTeklaManager = technicalTeklaManager;

    if (growthLearningNewTechManager !== undefined) appraisal.growthLearningNewTechManager = growthLearningNewTechManager;
    if (growthCertificationsManager !== undefined) appraisal.growthCertificationsManager = growthCertificationsManager;

    if (behaviourManagerRatings !== undefined) appraisal.behaviourManagerRatings = behaviourManagerRatings;
    if (processManagerRatings !== undefined) appraisal.processManagerRatings = processManagerRatings;
    if (technicalManagerRatings !== undefined) appraisal.technicalManagerRatings = technicalManagerRatings;
    if (growthManagerRatings !== undefined) appraisal.growthManagerRatings = growthManagerRatings;

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
