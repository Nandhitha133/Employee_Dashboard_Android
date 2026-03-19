const express = require('express');
const router = express.Router();
const Insurance = require('../models/Insurance');
const auth = require('../middleware/auth');

// Get all insurance records
router.get('/', auth, async (req, res) => {
  try {
    const records = await Insurance.find().sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    console.error('Error fetching insurance records:', error);
    res.status(500).json({ message: 'Server error fetching insurance records' });
  }
});

// Create a new insurance record
router.post('/', auth, async (req, res) => {
  try {
    const newRecord = new Insurance(req.body);
    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (error) {
    console.error('Error creating insurance record:', error);
    res.status(500).json({ message: 'Server error creating insurance record' });
  }
});

// Update an insurance record
router.put('/:id', auth, async (req, res) => {
  try {
    const updatedRecord = await Insurance.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!updatedRecord) {
      return res.status(404).json({ message: 'Insurance record not found' });
    }
    
    res.json(updatedRecord);
  } catch (error) {
    console.error('Error updating insurance record:', error);
    res.status(500).json({ message: 'Server error updating insurance record' });
  }
});

// Delete an insurance record
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedRecord = await Insurance.findByIdAndDelete(req.params.id);
    
    if (!deletedRecord) {
      return res.status(404).json({ message: 'Insurance record not found' });
    }
    
    res.json({ message: 'Insurance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting insurance record:', error);
    res.status(500).json({ message: 'Server error deleting insurance record' });
  }
});

module.exports = router;
