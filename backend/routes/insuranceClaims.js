const express = require('express');
const router = express.Router();
const InsuranceClaim = require('../models/InsuranceClaim');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/insurance';
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: fieldname-timestamp-random.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDF files are allowed!'), false);
    }
  }
});

const uploadFields = upload.fields([
  { name: 'employeePhoto', maxCount: 1 },
  { name: 'dischargeBill', maxCount: 1 },
  { name: 'pharmacyBill', maxCount: 1 },
  { name: 'paymentReceipt', maxCount: 1 }
]);

// Get all insurance claims
router.get('/', auth, async (req, res) => {
  try {
    const claims = await InsuranceClaim.find().sort({ createdAt: -1 });
    res.json(claims);
  } catch (error) {
    console.error('Error fetching insurance claims:', error);
    res.status(500).json({ message: 'Server error fetching insurance claims' });
  }
});

// Create a new insurance claim
router.post('/', auth, (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      const claimData = req.body;
      
      // Parse children if it's sent as a string (FormData stringifies objects)
      if (typeof claimData.children === 'string') {
        try {
          claimData.children = JSON.parse(claimData.children);
        } catch (e) {
          claimData.children = [];
        }
      }

      // Handle file paths
      const documents = {};
      if (req.files) {
        if (req.files.employeePhoto) documents.employeePhoto = req.files.employeePhoto[0].path;
        if (req.files.dischargeBill) documents.dischargeBill = req.files.dischargeBill[0].path;
        if (req.files.pharmacyBill) documents.pharmacyBill = req.files.pharmacyBill[0].path;
        if (req.files.paymentReceipt) documents.paymentReceipt = req.files.paymentReceipt[0].path;
      }
      
      claimData.documents = documents;

      // Generate claim number if not provided (though frontend seems to generate it?)
      // Frontend generates it: `CLM-${Date.now()}` or user input.
      // We'll trust the body for now, but ensure uniqueness via model.

      const newClaim = new InsuranceClaim(claimData);
      const savedClaim = await newClaim.save();
      res.status(201).json(savedClaim);
    } catch (error) {
      console.error('Error creating insurance claim:', error);
      res.status(500).json({ message: 'Server error creating insurance claim', error: error.message });
    }
  });
});

// Update an insurance claim
router.put('/:id', auth, (req, res) => {
  uploadFields(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    try {
      const updates = req.body;
      
      // Parse children if needed
      if (typeof updates.children === 'string') {
        try {
          updates.children = JSON.parse(updates.children);
        } catch (e) {
          updates.children = [];
        }
      }

      // Handle file paths - merge with existing documents if not provided in new upload
      // We first need to fetch the existing claim to preserve old file paths if new ones aren't uploaded
      const existingClaim = await InsuranceClaim.findById(req.params.id);
      if (!existingClaim) {
        return res.status(404).json({ message: 'Insurance claim not found' });
      }

      const documents = existingClaim.documents || {};
      
      if (req.files) {
        if (req.files.employeePhoto) documents.employeePhoto = req.files.employeePhoto[0].path;
        if (req.files.dischargeBill) documents.dischargeBill = req.files.dischargeBill[0].path;
        if (req.files.pharmacyBill) documents.pharmacyBill = req.files.pharmacyBill[0].path;
        if (req.files.paymentReceipt) documents.paymentReceipt = req.files.paymentReceipt[0].path;
      }
      
      updates.documents = documents;
      updates.updatedAt = Date.now();

      const updatedClaim = await InsuranceClaim.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true }
      );
      
      res.json(updatedClaim);
    } catch (error) {
      console.error('Error updating insurance claim:', error);
      res.status(500).json({ message: 'Server error updating insurance claim' });
    }
  });
});

// Delete an insurance claim
router.delete('/:id', auth, async (req, res) => {
  try {
    const deletedClaim = await InsuranceClaim.findByIdAndDelete(req.params.id);
    
    if (!deletedClaim) {
      return res.status(404).json({ message: 'Insurance claim not found' });
    }
    
    // Optional: Delete associated files
    // ...

    res.json({ message: 'Insurance claim deleted successfully' });
  } catch (error) {
    console.error('Error deleting insurance claim:', error);
    res.status(500).json({ message: 'Server error deleting insurance claim' });
  }
});

module.exports = router;
