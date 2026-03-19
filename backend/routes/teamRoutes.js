const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Team = require('../models/Team');
const Employee = require('../models/Employee');

router.get('/leaders', auth, async (req, res) => {
  try {
    if (!req.user.permissions?.includes('employee_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const type = String(req.query.type || 'team').toLowerCase();
    const pattern = type === 'project' ? /sr\.?\s*project\s*manager/i : /sr\.?\s*team/i;
    const leaders = await Employee.find({ 
      $or: [
        { designation: { $regex: pattern } },
        { position: { $regex: pattern } }
      ]
    }, {
      name: 1,
      employeeId: 1,
      division: 1,
      designation: 1,
      position: 1,
      _id: 1
    }).sort({ name: 1 });
    res.json(leaders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    if (!req.user.permissions?.includes('employee_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const teams = await Team.find().sort({ teamCode: 1 });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:teamCode', auth, async (req, res) => {
  try {
    if (!req.user.permissions?.includes('employee_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const team = await Team.findOne({ teamCode: req.params.teamCode });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (!req.user.permissions?.includes('user_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { teamCode, leaderEmployeeId, leaderName, division } = req.body;
    let team = await Team.findOne({ teamCode });
    if (team) {
      team.leaderEmployeeId = leaderEmployeeId;
      team.leaderName = leaderName || team.leaderName;
      team.division = division || team.division;
      await team.save();
      return res.json(team);
    }
    team = await Team.create({ teamCode, leaderEmployeeId, leaderName, division, members: [] });
    res.status(201).json(team);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post('/:teamCode/members', auth, async (req, res) => {
  try {
    if (!req.user.permissions?.includes('user_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { employeeId } = req.body;
    const team = await Team.findOne({ teamCode: req.params.teamCode });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const emp = await Employee.findOne({ employeeId });
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    if (!team.members.includes(employeeId)) {
      team.members.push(employeeId);
      await team.save();
    }
    res.json(team);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:teamCode/members/:employeeId', auth, async (req, res) => {
  try {
    if (!req.user.permissions?.includes('user_access')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const team = await Team.findOne({ teamCode: req.params.teamCode });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    team.members = team.members.filter(m => m !== req.params.employeeId);
    await team.save();
    res.json(team);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
