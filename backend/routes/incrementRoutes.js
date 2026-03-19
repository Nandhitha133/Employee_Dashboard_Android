const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const IncrementMatrix = require('../models/IncrementMatrix');
const IncrementConfig = require('../models/IncrementConfig');

// @desc    Get Increment Matrix
// @route   GET /api/performance/increment-master
// @access  Private (Admin/HR)
router.get('/', auth, async (req, res) => {
  try {
    const { financialYear } = req.query;
    const year = financialYear || '2024-2025';

    let matrix = await IncrementMatrix.find({ financialYear: year }).sort({ id: 1 });
    const config = await IncrementConfig.getConfigByYear(year);
    
    // Seed default data if empty
    if (!matrix || matrix.length === 0) {
      // Fetch dynamic designations from Employee master to avoid hardcoding
      const distinctDesignations = await Employee.distinct('designation');
      const validDesignations = distinctDesignations.filter(d => d && d.trim().length > 0);
      
      // If we have designations, group them into the first category, otherwise use generic default
      const defaultCategory = validDesignations.length > 0 
        ? validDesignations.join(', ') 
        : 'System Engineer, Developer, Junior Technical';

      const defaultMatrixData = [
        {
          id: 1,
          category: defaultCategory,
          financialYear: year,
          ratings: [
            { grade: 'Exceeds Expectations (ES)', belowTarget: '5%', metTarget: '8%', target1_1: '', target1_25: '10%', target1_5: '12%' },
            { grade: 'Meets Expectations (ME)', belowTarget: '3%', metTarget: '4%', target1_1: '', target1_25: '6%', target1_5: '8%' },
            { grade: 'Below Expectations (BE)', belowTarget: '2%', metTarget: '2%', target1_1: '', target1_25: '3%', target1_5: '5%' }
          ]
        },
        {
          id: 2,
          category: 'Category 2',
          financialYear: year,
          ratings: [
            { grade: 'Exceeds Expectations (ES)', belowTarget: '8%', metTarget: '10%', target1_1: '', target1_25: '13%', target1_5: '15%' },
            { grade: 'Meets Expectations (ME)', belowTarget: '3%', metTarget: '5%', target1_1: '', target1_25: '8%', target1_5: '10%' },
            { grade: 'Below Expectations (BE)', belowTarget: '2%', metTarget: '3%', target1_1: '', target1_25: '5%', target1_5: '7%' }
          ]
        },
        {
          id: 3,
          category: 'Category 3',
          financialYear: year,
          ratings: [
            { grade: 'Exceeds Expectations (ES)', belowTarget: '10%', metTarget: '12%', target1_1: '', target1_25: '15%', target1_5: '20%' },
            { grade: 'Meets Expectations (ME)', belowTarget: '5%', metTarget: '8%', target1_1: '', target1_25: '10%', target1_5: '15%' },
            { grade: 'Below Expectations (BE)', belowTarget: '3%', metTarget: '5%', target1_1: '', target1_25: '8%', target1_5: '10%' }
          ]
        },
        {
          id: 4,
          category: 'Category 4',
          financialYear: year,
          ratings: [
            { grade: 'Exceeds Expectations (ES)', belowTarget: '10%', metTarget: '15%', target1_1: '', target1_25: '20%', target1_5: '25%' },
            { grade: 'Meets Expectations (ME)', belowTarget: '5%', metTarget: '10%', target1_1: '', target1_25: '15%', target1_5: '18%' },
            { grade: 'Below Expectations (BE)', belowTarget: '3%', metTarget: '5%', target1_1: '', target1_25: '8%', target1_5: '12%' }
          ]
        }
      ];

      await IncrementMatrix.insertMany(defaultMatrixData);
      matrix = await IncrementMatrix.find({ financialYear: year }).sort({ id: 1 });
    }
    
    res.json({
      matrix,
      enabledColumns: config.enabledColumns
    });
  } catch (error) {
    console.error('Error fetching increment matrix:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// @desc    Save/Update Increment Matrix
// @route   POST /api/performance/increment-master
// @access  Private (Admin/HR)
router.post('/', auth, async (req, res) => {
  try {
    const { matrixData, enabledColumns, financialYear } = req.body;
    const year = financialYear || '2024-2025';

    if (enabledColumns) {
       await IncrementConfig.findOneAndUpdate(
         { financialYear: year }, 
         { enabledColumns }, 
         { upsert: true, new: true }
       );
    }

    if (matrixData && Array.isArray(matrixData)) {
       // Bulk write to update or insert
       const operations = matrixData.map(item => ({
         updateOne: {
           filter: { id: item.id, financialYear: year },
           update: { 
             $set: {
               category: item.category,
               ratings: item.ratings,
               financialYear: year
             }
           },
           upsert: true
         }
       }));
 
       await IncrementMatrix.bulkWrite(operations);
    }

    const updatedMatrix = await IncrementMatrix.find({ financialYear: year }).sort({ id: 1 });
    const updatedConfig = await IncrementConfig.getConfigByYear(year);
    
    res.json({ 
      success: true, 
      message: 'Increment Matrix saved successfully', 
      data: updatedMatrix,
      enabledColumns: updatedConfig.enabledColumns
    });
  } catch (error) {
    console.error('Error saving increment matrix:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

const { calculateIncrement } = require('../utils/incrementUtils');

// @desc    Calculate Increment Percentage
// @route   POST /api/performance/increment-master/calculate
// @access  Private
router.post('/calculate', auth, async (req, res) => {
  try {
    const { financialYear, designation, rating } = req.body;

    if (!financialYear || !designation || !rating) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const percentage = await calculateIncrement(financialYear, designation, rating);
    
    // Check if 0 means "not found" or actual 0. 
    // The helper returns 0 on error/not found.
    // For now we just return it.
    
    res.json({ success: true, percentage });
    
  } catch (error) {
    console.error('Error calculating increment:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
