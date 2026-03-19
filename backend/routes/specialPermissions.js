const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const SpecialPermission = require('../models/SpecialPermission');
const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Team = require('../models/Team');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'special-permissions');
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

const getWeekMonday = (date) => {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff));
  return monday;
};

const dayIndexInWeek = (monday, target) => {
  const t = new Date(target);
  const targetUTC = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  const ms = 24 * 3600 * 1000;
  const idx = Math.floor((targetUTC - monday) / ms);
  return Math.max(0, Math.min(6, idx));
};

async function getTeamManagementAssignmentSets(userEmployeeId) {
  const teams = await Team.find({ teamCode: { $regex: /^TEAM-/i } })
    .select('leaderEmployeeId members')
    .lean();

  const allAssigned = new Set();
  const mine = new Set();

  for (const t of teams) {
    const members = Array.isArray(t.members) ? t.members : [];
    for (const m of members) {
      if (!m) continue;
      allAssigned.add(m);
      if (userEmployeeId && t.leaderEmployeeId === userEmployeeId) {
        mine.add(m);
      }
    }
  }

  return {
    allAssignedMemberIds: Array.from(allAssigned),
    myAssignedMemberIds: Array.from(mine)
  };
}

router.post('/', auth, upload.single('attachment'), async (req, res) => {
  try {
    const { date, fromTime, toTime, reason, shift, totalHours } = req.body;
    if (!date || !reason) {
      return res.status(400).json({ success: false, message: 'Missing required fields (date, reason)' });
    }

    let calculatedHours = 0;
    if (totalHours) {
        calculatedHours = parseFloat(totalHours);
    } else if (fromTime && toTime) {
        const parseHHMM = (s) => {
          const [h, m] = String(s).split(':').map((n) => parseInt(n, 10) || 0);
          return h * 60 + m;
        };
        const minutes = Math.max(0, parseHHMM(toTime) - parseHHMM(fromTime));
        calculatedHours = Math.round((minutes / 60) * 100) / 100;
    } else {
        return res.status(400).json({ success: false, message: 'Missing hours information (totalHours or fromTime/toTime)' });
    }

    const attachmentPath = req.file ? `/uploads/special-permissions/${req.file.filename}` : '';

    const user = req.user;
    const doc = await SpecialPermission.create({
      userId: user._id,
      employeeId: user.employeeId || '',
      employeeName: user.name || '',
      date: new Date(date),
      shift: shift || '',
      fromTime: fromTime || '',
      toTime: toTime || '',
      totalHours: calculatedHours,
      reason,
      attachmentPath,
      status: 'PENDING'
    });

    try {
      const admins = await User.find({ role: 'admin' }).select('_id');
      for (const admin of admins) {
        await Notification.create({
          recipient: admin._id,
          title: 'Special Permission Submitted',
          message: `${user.name} submitted a special permission request for ${new Date(date).toLocaleDateString()}.`,
          type: 'SPECIAL_PERMISSION_SUBMIT'
        });
      }
    } catch (err) {
      console.error('Error creating special permission submission notifications:', err);
    }

    res.status(201).json({ success: true, data: doc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const { weekStart, weekEnd } = req.query;
    const q = { userId: req.user._id };
    if (weekStart && weekEnd) {
      q.date = { $gte: new Date(weekStart), $lte: new Date(weekEnd) };
    }
    const list = await SpecialPermission.find(q).sort({ createdAt: -1 });
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

router.get('/list', auth, async (req, res) => {
  try {
    const userRole = req.user.role || '';
    const allowedRoles = ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { status, employeeId, start, end } = req.query;
    const q = {};

    const role = String(userRole || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isPM = role === 'projectmanager' || role === 'project_manager';
    if (!isAdmin) {
      const { allAssignedMemberIds, myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
      if (isPM) {
        if (employeeId) {
          if (!myAssignedMemberIds.includes(employeeId)) {
            return res.json({ success: true, data: [] });
          }
          q.employeeId = employeeId;
        } else {
          if (myAssignedMemberIds.length === 0) {
            return res.json({ success: true, data: [] });
          }
          q.employeeId = { $in: myAssignedMemberIds };
        }
      } else {
        if (employeeId) {
          if (allAssignedMemberIds.includes(employeeId)) {
            return res.json({ success: true, data: [] });
          }
          q.employeeId = employeeId;
        } else if (allAssignedMemberIds.length > 0) {
          q.employeeId = { $nin: allAssignedMemberIds };
        }
      }
    }

    if (status && status !== 'All') q.status = status.toUpperCase();
    if (start || end) {
      q.date = {};
      if (start) q.date.$gte = new Date(start);
      if (end) q.date.$lte = new Date(end);
    }
    const list = await SpecialPermission.find(q).sort({ createdAt: -1 }).lean();

    // Enrich with employee details
    const employeeIds = [...new Set(list.map(item => item.employeeId).filter(Boolean))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId location division');
    
    const empMap = {};
    employees.forEach(emp => {
      empMap[emp.employeeId] = { location: emp.location, division: emp.division };
    });

    const enrichedList = await Promise.all(list.map(async (item) => {
      const empDetails = empMap[item.employeeId] || {};
      
      // Calculate On-Premises Time for the PREVIOUS DAY relative to the permission date
      const permissionDate = new Date(item.date);
      const prevDate = new Date(permissionDate);
      prevDate.setDate(permissionDate.getDate() - 1);

      const startOfDay = new Date(prevDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(prevDate);
      endOfDay.setHours(23, 59, 59, 999);

      const attendanceRecords = await Attendance.find({
        employeeId: item.employeeId,
        punchTime: { $gte: startOfDay, $lte: endOfDay }
      }).sort({ punchTime: 1 });

      let totalSeconds = 0;

      // Try to find workDurationSeconds first (Hikvision)
      const workDurationRec = attendanceRecords.find(r => typeof r.workDurationSeconds === 'number' && r.workDurationSeconds > 0);
      if (workDurationRec) {
        totalSeconds = workDurationRec.workDurationSeconds;
      } else {
        // Calculate from In/Out pairs
        let currentIn = null;
        for (const record of attendanceRecords) {
          if (record.direction === 'in') {
            if (!currentIn) currentIn = record;
          } else if (record.direction === 'out') {
            if (currentIn) {
              const diff = (new Date(record.punchTime) - new Date(currentIn.punchTime)) / 1000;
              if (diff > 0) totalSeconds += diff;
              currentIn = null;
            }
          }
        }
      }

      const onPremisesHours = totalSeconds > 0 ? totalSeconds / 3600 : 0;

      return {
        ...item,
        location: empDetails.location || '-',
        division: empDetails.division || '-',
        onPremisesHours: onPremisesHours
      };
    }));

    res.json({ success: true, data: enrichedList });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

const ensureTimesheetUpdatedWithSpecialPermission = async (spDoc) => {
  const userId = spDoc.userId;
  const d = new Date(spDoc.date);
  const monday = getWeekMonday(d);
  
  // Calculate Sunday correctly
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);

  console.log(`[SpecialPermission] Updating timesheet for User: ${userId}, Date: ${spDoc.date}, WeekStart: ${monday.toISOString()}`);

  let sheet = await Timesheet.findOne({ 
    userId, 
    weekStartDate: monday
  });

  if (!sheet) {
    console.log(`[SpecialPermission] No existing timesheet found. Creating new one.`);
    sheet = new Timesheet({
      userId,
      employeeId: spDoc.employeeId || '',
      employeeName: spDoc.employeeName || '',
      weekStartDate: monday,
      weekEndDate: sunday,
      entries: [],
      status: 'Draft'
    });
  } else {
    console.log(`[SpecialPermission] Found existing timesheet: ${sheet._id}`);
  }

  const idx = dayIndexInWeek(monday, d);
  console.log(`[SpecialPermission] Day Index: ${idx}`);
  
  // Find or create the Special Permission entry
  const taskName = (spDoc.fromTime && spDoc.toTime) 
    ? `Permission (${spDoc.fromTime} - ${spDoc.toTime})` 
    : 'Permission';

  let entry = sheet.entries.find(e => e.type === 'special' && e.task === taskName);
  
  if (!entry) {
    console.log(`[SpecialPermission] Creating new entry for task: ${taskName}`);
    entry = {
      project: 'Special Permission',
      projectCode: 'SP',
      task: taskName,
      type: 'special',
      hours: [0, 0, 0, 0, 0, 0, 0],
      locked: true,
      lockedDays: [false, false, false, false, false, false, false]
    };
    sheet.entries.push(entry);
  } else {
    console.log(`[SpecialPermission] Updating existing entry for task: ${taskName}`);
    // Ensure it's marked as special if it wasn't before
    entry.type = 'special';
    entry.locked = true;
  }

  // Update hours for the specific day
  const hours = Math.max(0, Number(spDoc.totalHours) || 0);
  console.log(`[SpecialPermission] Setting hours: ${hours} at index ${idx}`);
  entry.hours[idx] = hours;
  
  // Lock this specific day
  if (!entry.lockedDays) entry.lockedDays = [false, false, false, false, false, false, false];
  entry.lockedDays[idx] = true;

  // Update total hours
  sheet.markModified('entries');
  
  // Recalculate totals
  let total = 0;
  sheet.entries.forEach(e => {
    e.hours.forEach(h => total += (Number(h) || 0));
  });
  sheet.totalHours = total;
  
  console.log(`[SpecialPermission] Saving timesheet. Total Hours: ${total}`);
  await sheet.save();
  return sheet;
};

router.put('/approve/:id', auth, async (req, res) => {
  try {
    const userRole = req.user.role || '';
    const allowedRoles = ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    const sp = await SpecialPermission.findById(req.params.id);
    if (!sp) return res.status(404).json({ success: false, message: 'Request not found' });

    const role = String(userRole || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isPM = role === 'projectmanager' || role === 'project_manager';
    const targetEmployeeId = String(sp.employeeId || '');
    if (!isAdmin && targetEmployeeId) {
      const { allAssignedMemberIds, myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
      if (isPM) {
        if (!myAssignedMemberIds.includes(targetEmployeeId)) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else {
        if (allAssignedMemberIds.includes(targetEmployeeId)) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }
    }
    
    if (sp.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Request already processed' });
    }

    sp.status = 'APPROVED';
    sp.approvedBy = req.user._id;
    sp.approvedAt = new Date();
    await sp.save();

    await ensureTimesheetUpdatedWithSpecialPermission(sp);

    try {
      if (sp.userId) {
        await Notification.create({
          recipient: sp.userId,
          title: 'Special Permission Approved',
          message: `Your special permission on ${new Date(sp.date).toLocaleDateString()} has been approved.`,
          type: 'SPECIAL_PERMISSION_APPROVED'
        });
      }
    } catch (err) {
      console.error('Error creating special permission approval notification:', err);
    }

    res.json({ success: true, message: 'Approved and timesheet updated', data: sp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

router.put('/reject/:id', auth, async (req, res) => {
  try {
    const userRole = req.user.role || '';
    const allowedRoles = ['admin', 'hr', 'manager', 'projectmanager', 'project_manager'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const { reason } = req.body || {};
    const sp = await SpecialPermission.findById(req.params.id);
    if (!sp) return res.status(404).json({ success: false, message: 'Request not found' });

    const role = String(userRole || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isPM = role === 'projectmanager' || role === 'project_manager';
    const targetEmployeeId = String(sp.employeeId || '');
    if (!isAdmin && targetEmployeeId) {
      const { allAssignedMemberIds, myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
      if (isPM) {
        if (!myAssignedMemberIds.includes(targetEmployeeId)) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else {
        if (allAssignedMemberIds.includes(targetEmployeeId)) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }
    }

    if (sp.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Request already processed' });
    sp.status = 'REJECTED';
    sp.rejectedReason = reason || '';
    sp.approvedBy = null;
    sp.approvedAt = null;
    await sp.save();
    try {
      if (sp.userId) {
        await Notification.create({
          recipient: sp.userId,
          title: 'Special Permission Rejected',
          message: `Your special permission on ${new Date(sp.date).toLocaleDateString()} has been rejected.${reason ? ` Reason: ${reason}` : ''}`,
          type: 'SPECIAL_PERMISSION_REJECTED'
        });
      }
    } catch (err) {
      console.error('Error creating special permission rejection notification:', err);
    }
    res.json({ success: true, message: 'Rejected', data: sp });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
