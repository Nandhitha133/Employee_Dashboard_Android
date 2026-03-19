const express = require('express');
const router = express.Router();
const Reward = require('../models/Reward');
const auth = require('../middleware/auth');

// @route   GET api/rewards
// @desc    Get all rewards
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const rewards = await Reward.find().sort({ date: -1 });
    res.json(rewards);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/rewards
// @desc    Add new reward
// @access  Private
router.post('/', auth, async (req, res) => {
  const {
    month,
    year,
    employeeName,
    employeeId,
    designation,
    division,
    nominatedBy,
    achievement
  } = req.body;

  try {
    const newReward = new Reward({
      month,
      year,
      employeeName,
      employeeId,
      designation,
      division,
      nominatedBy,
      achievement
    });

    const reward = await newReward.save();
    res.json(reward);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/rewards/:id
// @desc    Update reward
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const {
    month,
    year,
    employeeName,
    employeeId,
    designation,
    division,
    nominatedBy,
    achievement
  } = req.body;

  // Build reward object
  const rewardFields = {};
  if (month) rewardFields.month = month;
  if (year) rewardFields.year = year;
  if (employeeName) rewardFields.employeeName = employeeName;
  if (employeeId) rewardFields.employeeId = employeeId;
  if (designation) rewardFields.designation = designation;
  if (division) rewardFields.division = division;
  if (nominatedBy) rewardFields.nominatedBy = nominatedBy;
  if (achievement) rewardFields.achievement = achievement;

  try {
    let reward = await Reward.findById(req.params.id);

    if (!reward) return res.status(404).json({ msg: 'Reward not found' });

    reward = await Reward.findByIdAndUpdate(
      req.params.id,
      { $set: rewardFields },
      { new: true }
    );

    res.json(reward);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/rewards/:id
// @desc    Delete reward
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    let reward = await Reward.findById(req.params.id);

    if (!reward) return res.status(404).json({ msg: 'Reward not found' });

    await Reward.findByIdAndDelete(req.params.id);

    res.json({ msg: 'Reward removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
