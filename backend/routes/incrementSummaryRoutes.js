const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SelfAppraisal = require('../models/SelfAppraisal');
const Employee = require('../models/Employee');

router.get('/', auth, async (req, res) => {
  try {
    const {
      financialYear,
      division,
      designation,
      location,
      status,
      search,
    } = req.query;

    const statusFilter = [];

    if (!status || status === 'All') {
      statusFilter.push('DIRECTOR_APPROVED', 'Released', 'RELEASED');
    } else if (status === 'Approved') {
      statusFilter.push('DIRECTOR_APPROVED');
    } else if (status === 'Released') {
      statusFilter.push('Released', 'RELEASED');
    } else if (status === 'Pending') {
      // Include all statuses that are NOT Approved or Released
      statusFilter.push(
        'Draft', 'Submitted', 'SUBMITTED', 
        'APPRAISER_COMPLETED', 'REVIEWER_COMPLETED', 
        'AppraiserReview', 'ReviewerReview', 'DirectorApproval'
      );
    }

    const appraisalQuery = {
      status: { $in: statusFilter },
    };

    if (financialYear && financialYear !== 'All') {
      const parts = financialYear.split('-');
      let alternativeYear = financialYear;
      
      // Handle 2025-2026 vs 2025-26 mismatch
      if (parts.length === 2) {
        if (parts[0].length === 4 && parts[1].length === 4) {
           // Frontend sends 2025-2026, also check 2025-26
           alternativeYear = `${parts[0]}-${parts[1].substring(2)}`;
        } else if (parts[0].length === 4 && parts[1].length === 2) {
           // Frontend sends 2025-26, also check 2025-2026
           alternativeYear = `${parts[0]}-20${parts[1]}`;
        }
      }
      
      appraisalQuery.year = { $in: [financialYear, alternativeYear] };
    }

    const appraisals = await SelfAppraisal.find(appraisalQuery)
      .populate('employeeId', 'name employeeId designation department division location avatar ctc');

    let results = appraisals.map((app) => {
      const emp = app.employeeId || {};

      return {
        id: app._id,
        financialYr: app.year,
        empId: emp.employeeId || '',
        name: emp.name || 'Unknown',
        designation: emp.designation || '',
        division: emp.division || emp.department || '',
        location: emp.location || '',
        status: app.status,
        currentSalary: emp.ctc || 0,
        incrementPercentage: app.incrementPercentage || 0,
        incrementAmount: app.incrementAmount || 0,
        revisedSalary: app.revisedSalary || 0,
        updatedAt: app.updatedAt,
      };
    });

    if (division && division !== 'All') {
      results = results.filter((item) => item.division === division);
    }

    if (designation && designation !== 'All') {
      results = results.filter((item) => item.designation === designation);
    }

    if (location && location !== 'All') {
      results = results.filter((item) => item.location === location);
    }

    if (search && search.trim()) {
      const term = search.trim().toLowerCase();
      results = results.filter((item) => {
        const name = (item.name || '').toLowerCase();
        const empId = (item.empId || '').toLowerCase();
        return name.includes(term) || empId.includes(term);
      });
    }

    res.json(results);
  } catch (error) {
    console.error('Error fetching increment summary:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error',
      error: error.message,
    });
  }
});

module.exports = router;

