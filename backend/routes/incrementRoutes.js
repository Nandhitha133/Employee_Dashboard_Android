const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const IncrementMatrix = require('../models/IncrementMatrix');

// @desc    Get Increment Matrix
// @route   GET /api/performance/increment-master
// @access  Private (Admin/HR)
router.get('/', auth, async (req, res) => {
  try {
    const matrix = await IncrementMatrix.find().sort({ id: 1 });
    
    // If no matrix exists, we can return empty array or seed default data
    // For now, return what is found
    res.json(matrix);
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
    const { matrixData } = req.body;

    if (!matrixData || !Array.isArray(matrixData)) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    // Bulk write to update or insert
    const operations = matrixData.map(item => ({
      updateOne: {
        filter: { id: item.id },
        update: { 
          $set: {
            category: item.category,
            ratings: item.ratings
          }
        },
        upsert: true
      }
    }));

    await IncrementMatrix.bulkWrite(operations);

    const updatedMatrix = await IncrementMatrix.find().sort({ id: 1 });
    res.json({ success: true, message: 'Increment Matrix saved successfully', data: updatedMatrix });
  } catch (error) {
    console.error('Error saving increment matrix:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;
