// backend/routes/holidayAllowance.js
const express = require('express');
const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ success: true, message: 'Holiday Allowance API is running' });
});

// Get summary
router.get('/summary', async (req, res) => {
  try {
    const { year, location, month } = req.query;
    // Your database query logic here
    const records = await HolidayAllowanceModel.find({ year, ...(location && { location }), ...(month && { month }) });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get by ID
router.get('/:id', async (req, res) => {
  try {
    const record = await HolidayAllowanceModel.findById(req.params.id);
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new record
router.post('/', async (req, res) => {
  try {
    const newRecord = new HolidayAllowanceModel(req.body);
    await newRecord.save();
    res.json({ success: true, data: newRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update record
router.put('/:id', async (req, res) => {
  try {
    const updatedRecord = await HolidayAllowanceModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, data: updatedRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete record
router.delete('/:id', async (req, res) => {
  try {
    await HolidayAllowanceModel.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;