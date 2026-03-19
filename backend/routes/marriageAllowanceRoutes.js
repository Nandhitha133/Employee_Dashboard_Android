const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const MarriageAllowance = require('../models/MarriageAllowance');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'marriage-allowances');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Get all claims
router.get('/', auth, async (req, res) => {
  try {
    const q = {};
    const list = await MarriageAllowance.find(q).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Get by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const doc = await MarriageAllowance.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Create
router.post('/', auth, upload.fields([{ name: 'certificate', maxCount: 1 }, { name: 'invitation', maxCount: 1 }]), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.files) {
      if (req.files.certificate) {
        data.certificatePath = `/uploads/marriage-allowances/${req.files.certificate[0].filename}`;
      }
      if (req.files.invitation) {
        data.invitationPath = `/uploads/marriage-allowances/${req.files.invitation[0].filename}`;
      }
    }
    data.createdBy = req.user.name;
    const doc = await MarriageAllowance.create(data);
    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Update
router.put('/:id', auth, upload.fields([{ name: 'certificate', maxCount: 1 }, { name: 'invitation', maxCount: 1 }]), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.files) {
      if (req.files.certificate) {
        data.certificatePath = `/uploads/marriage-allowances/${req.files.certificate[0].filename}`;
      }
      if (req.files.invitation) {
        data.invitationPath = `/uploads/marriage-allowances/${req.files.invitation[0].filename}`;
      }
    }
    data.updatedBy = req.user.name;
    const doc = await MarriageAllowance.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  try {
    const doc = await MarriageAllowance.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
