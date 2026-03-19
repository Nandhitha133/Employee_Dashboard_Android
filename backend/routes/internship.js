const express = require('express');
const router = express.Router();
const Internship = require('../models/Internship');
const auth = require('../middleware/auth');

// @desc    Get all interns
// @route   GET /api/interns
router.get('/', auth, async (req, res) => {
  try {
    const interns = await Internship.find({ isActive: true })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: interns.length,
      data: interns
    });
  } catch (error) {
    console.error('Error fetching interns:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Search interns
// @route   GET /api/interns/search
router.get('/search', auth, async (req, res) => {
  try {
    const searchTerm = req.query.q || '';
    const filters = req.query;
    
    const interns = await Internship.searchInterns(searchTerm, filters);
    
    res.status(200).json({
      success: true,
      count: interns.length,
      data: interns
    });
  } catch (error) {
    console.error('Error searching interns:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get single intern
// @route   GET /api/interns/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const intern = await Internship.findById(req.params.id);
    
    if (!intern) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: intern
    });
  } catch (error) {
    console.error('Error fetching intern:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create new intern
// @route   POST /api/interns
router.post('/', auth, async (req, res) => {
  try {
    // Set createdBy to the authenticated user's ID
    req.body.createdBy = req.user.id;
    
    // Convert date strings to Date objects
    if (req.body.startDate) {
      req.body.startDate = new Date(req.body.startDate);
    }
    if (req.body.endDate) {
      req.body.endDate = new Date(req.body.endDate);
    }
    
    const intern = await Internship.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Intern created successfully',
      data: intern
    });
  } catch (error) {
    console.error('Error creating intern:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Update intern
// @route   PUT /api/interns/:id
router.put('/:id', auth, async (req, res) => {
  try {
    // Convert date strings to Date objects
    if (req.body.startDate) {
      req.body.startDate = new Date(req.body.startDate);
    }
    if (req.body.endDate) {
      req.body.endDate = new Date(req.body.endDate);
    }
    
    const intern = await Internship.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!intern) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Intern updated successfully',
      data: intern
    });
  } catch (error) {
    console.error('Error updating intern:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Delete intern
// @route   DELETE /api/interns/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const intern = await Internship.findById(req.params.id);
    
    if (!intern) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }
    
    // Soft delete by setting isActive to false
    intern.isActive = false;
    await intern.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      message: 'Intern deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting intern:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;