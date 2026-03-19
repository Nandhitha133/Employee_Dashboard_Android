const express = require('express');
const Announcement = require('../models/Announcement');
const auth = require('../middleware/auth');

const router = express.Router();

// Public: get active announcements (for login page)
router.get('/active', async (req, res) => {
  try {
    const now = new Date();
    const items = await Announcement.find({
      isActive: true,
      $and: [
        { $or: [{ startDate: { $lte: now } }, { startDate: { $exists: false } }] },
        { $or: [{ endDate: { $gte: now } }, { endDate: { $exists: false } }] }
      ]
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Auth: list all announcements
router.get('/', auth, async (req, res) => {
  try {
    const items = await Announcement.find().sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Auth + permission: create
router.post('/', auth, async (req, res) => {
  try {
    if (
      req.user.role !== 'admin' &&
      !req.user.permissions?.includes('announcement_manage')
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, message, isActive = true } = req.body;
    if (!title || !message) {
      return res.status(400).json({ message: 'Title and message are required' });
    }

    const item = await Announcement.create({
      title,
      message,
      isActive,
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      createdBy: { id: req.user._id, name: req.user.name }
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Auth + permission: update
router.put('/:id', auth, async (req, res) => {
  try {
    if (
      req.user.role !== 'admin' &&
      !req.user.permissions?.includes('announcement_manage')
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const update = {};
    ['title', 'message', 'isActive', 'startDate', 'endDate'].forEach((key) => {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    });
    if (update.startDate) update.startDate = new Date(update.startDate);
    if (update.endDate) update.endDate = new Date(update.endDate);

    const item = await Announcement.findByIdAndUpdate(id, update, {
      new: true
    });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Auth + permission: delete
router.delete('/:id', auth, async (req, res) => {
  try {
    if (
      req.user.role !== 'admin' &&
      !req.user.permissions?.includes('announcement_manage')
    ) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { id } = req.params;
    const item = await Announcement.findByIdAndDelete(id);
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
