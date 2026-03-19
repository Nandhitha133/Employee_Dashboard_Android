const express = require('express');
const Policy = require('../models/Policy');
const auth = require('../middleware/auth');

const router = express.Router();

// List all policies
router.get('/', auth, async (req, res) => {
  try {
    const items = await Policy.find({}).sort({ updatedAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new policy
router.post('/', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const created = await Policy.create({ title: title || 'New Policy', content: content || '' });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a policy
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, content } = req.body;
    const updated = await Policy.findByIdAndUpdate(
      req.params.id,
      { title, content },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ error: 'Policy not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a policy
router.delete('/:id', auth, async (req, res) => {
  try {
    const removed = await Policy.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Policy not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;

