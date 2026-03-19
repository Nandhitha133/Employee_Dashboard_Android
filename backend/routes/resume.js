const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const Resume = require('../models/Resume');
const auth = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'resumes');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safeName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeName}-${unique}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExt = ['.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExt.includes(ext)) {
    return cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const ensureResumeAccess = (req, res) => {
  const role = req.user.role;
  const permissions = req.user.permissions || [];

  if (role === 'admin' || role === 'hr') {
    return true;
  }

  if (permissions.includes('resume_access')) {
    return true;
  }

  res.status(403).json({ success: false, message: 'Access denied' });
  return false;
};

router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!ensureResumeAccess(req, res)) return;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Resume file is required' });
    }

    const { candidateName, email, phone, division, experience, resumeType, remarks } = req.body;

    if (!candidateName || !email || !phone || !division || !experience || !resumeType) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const filePath = `/uploads/resumes/${req.file.filename}`;

    const resume = await Resume.create({
      candidateName,
      email,
      phone,
      division,
      experience: Number(experience),
      resumeType,
      filePath,
      remarks: remarks || '',
    });

    res.status(201).json({ success: true, data: resume });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    if (!ensureResumeAccess(req, res)) return;

    const { division, resumeType, search } = req.query;
    const filter = {};

    if (division && division !== 'All') {
      filter.division = division;
    }
    if (resumeType && resumeType !== 'All') {
      filter.resumeType = resumeType;
    }
    if (search) {
      filter.candidateName = { $regex: search, $options: 'i' };
    }

    const resumes = await Resume.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, data: resumes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    if (!ensureResumeAccess(req, res)) return;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Resume ID' });
    }

    const resume = await Resume.findById(req.params.id);
    if (!resume) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    res.json({ success: true, data: resume });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id', auth, upload.single('file'), async (req, res) => {
  try {
    if (!ensureResumeAccess(req, res)) return;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Resume ID' });
    }

    const existing = await Resume.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    const update = {
      candidateName: req.body.candidateName ?? existing.candidateName,
      email: req.body.email ?? existing.email,
      phone: req.body.phone ?? existing.phone,
      division: req.body.division ?? existing.division,
      experience: req.body.experience !== undefined ? Number(req.body.experience) : existing.experience,
      resumeType: req.body.resumeType ?? existing.resumeType,
      remarks: req.body.remarks !== undefined ? req.body.remarks : existing.remarks,
    };

    if (req.file) {
      const newPath = `/uploads/resumes/${req.file.filename}`;
      const oldPath = existing.filePath ? path.join(__dirname, '..', existing.filePath.replace(/^\//, '')) : null;
      update.filePath = newPath;

      if (oldPath) {
        fs.unlink(oldPath, () => {});
      }
    }

    const updated = await Resume.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!ensureResumeAccess(req, res)) return;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid Resume ID' });
    }

    const existing = await Resume.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Resume not found' });
    }

    const filePath = existing.filePath ? path.join(__dirname, '..', existing.filePath.replace(/^\//, '')) : null;

    await Resume.findByIdAndDelete(req.params.id);

    if (filePath) {
      fs.unlink(filePath, () => {});
    }

    res.json({ success: true, message: 'Resume deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

