const express = require('express');
const auth = require('../middleware/auth');
const LeaveApplication = require('../models/LeaveApplication');
const Employee = require('../models/Employee');
const LeaveBalance = require('../models/LeaveBalance');
const Timesheet = require('../models/Timesheet');
const User = require('../models/User');
const Team = require('../models/Team');
const Notification = require('../models/Notification');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const { monthsBetween, calcBalanceForEmployee, mergeBalances } = require('../services/leaveService');

const router = express.Router();

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

const mailer = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 465,
  secure: (Number(process.env.EMAIL_PORT) || 465) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function getProjectManagerRecipients(division, location) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const roleRegex = /project\s*manager/i;
  const empPMs = await Employee.find({
    division: division || '',
    location: location || '',
    $or: [
      { role: { $regex: roleRegex } },
      { designation: { $regex: roleRegex } },
      { position: { $regex: roleRegex } }
    ]
  }).select('email employeeId');
  const empEmails = empPMs.map(e => e?.email).filter(e => e && emailRegex.test(e));
  const empIds = empPMs.map(e => e.employeeId).filter(Boolean);
  const userPMs = await User.find({ role: 'projectmanager', employeeId: { $in: empIds } }).select('email');
  const userEmails = userPMs.map(u => u?.email).filter(e => e && emailRegex.test(e));
  return Array.from(new Set([...empEmails, ...userEmails]));
}

async function getHrRecipients(employeeProfile) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isHosur = String(employeeProfile?.location || '').trim().toLowerCase() === 'hosur';
  if (isHosur) {
    const admin = await User.findOne({ role: 'admin', employeeId: 'CDE025' }).select('email');
    const email = admin?.email;
    return email && emailRegex.test(email) ? [email] : [];
  }
  const admins = await User.find({ role: 'admin' }).select('email');
  const emails = admins.map(u => u.email).filter(e => e && emailRegex.test(e));
  return Array.from(new Set(emails));
}

async function getAdminAndPMUserIds(employeeProfile) {
  const recipientIds = new Set();
  try {
    // 1. Get Admins
    const isHosur = String(employeeProfile?.location || '').trim().toLowerCase() === 'hosur';
    if (isHosur) {
      const admin = await User.findOne({ role: 'admin', employeeId: 'CDE025' }).select('_id');
      if (admin) recipientIds.add(admin._id.toString());
    } else {
      const admins = await User.find({ role: 'admin' }).select('_id');
      admins.forEach(u => recipientIds.add(u._id.toString()));
    }

    // 2. Get Project Managers
    const division = employeeProfile?.division;
    const location = employeeProfile?.location;

    const roleRegex = /project\s*manager/i;
    const empPMs = await Employee.find({
      division: division || '',
      location: location || '',
      $or: [
        { role: { $regex: roleRegex } },
        { designation: { $regex: roleRegex } },
        { position: { $regex: roleRegex } }
      ]
    }).select('employeeId');

    const empIds = empPMs.map(e => e.employeeId).filter(Boolean);

    if (empIds.length > 0) {
      const userPMs = await User.find({
        $or: [
          { role: 'projectmanager', employeeId: { $in: empIds } },
          { role: 'project_manager', employeeId: { $in: empIds } }
        ]
      }).select('_id');
      userPMs.forEach(u => recipientIds.add(u._id.toString()));
    }
  } catch (err) {
    console.error('Error finding notification recipients:', err);
  }
  return Array.from(recipientIds);
}

async function sendLeaveSubmissionEmail(createdDoc, user, employeeProfile) {
  try {
    const pmRecipients = await getProjectManagerRecipients(employeeProfile?.division, employeeProfile?.location);
    const hrRecipients = await getHrRecipients(employeeProfile || {});
    const recipients = Array.from(new Set([...(pmRecipients || []), ...(hrRecipients || [])]));
    if (!recipients.length) return { success: false, error: 'No recipients' };
    const from = process.env.EMAIL_USER;
    const subject = `Leave Request Submitted: ${createdDoc.employeeName} (${employeeProfile?.division || '-'})`;
    const start = new Date(createdDoc.startDate).toISOString().split('T')[0];
    const end = new Date(createdDoc.endDate).toISOString().split('T')[0];
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5003}`;
    const results = [];
    for (const to of recipients) {
      const approveToken = jwt.sign({ leaveId: createdDoc._id, action: 'Approved', email: to }, process.env.JWT_SECRET, { expiresIn: '48h' });
      const rejectToken = jwt.sign({ leaveId: createdDoc._id, action: 'Rejected', email: to }, process.env.JWT_SECRET, { expiresIn: '48h' });
      const approveLink = `${baseUrl}/api/leaves/email-action?token=${approveToken}`;
      const rejectLink = `${baseUrl}/api/leaves/email-action?token=${rejectToken}`;
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;padding:20px;max-width:700px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;">
          <h2 style="color:#333;margin:0 0 16px 0;padding-bottom:8px;border-bottom:2px solid #4F46E5;">Leave Request Submitted</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#666;"><strong>Employee:</strong></td><td style="padding:8px 0;color:#333;">${createdDoc.employeeName} (${createdDoc.employeeId || '-'})</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Division:</strong></td><td style="padding:8px 0;color:#333;">${employeeProfile?.division || '-'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Location:</strong></td><td style="padding:8px 0;color:#333;">${employeeProfile?.location || createdDoc.location || '-'}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Leave Type:</strong></td><td style="padding:8px 0;color:#333;">${createdDoc.leaveType}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Day Type:</strong></td><td style="padding:8px 0;color:#333;">${createdDoc.dayType}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Period:</strong></td><td style="padding:8px 0;color:#333;">${start} to ${end}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Total Days:</strong></td><td style="padding:8px 0;color:#333;">${createdDoc.totalDays}</td></tr>
            <tr><td style="padding:8px 0;color:#666;"><strong>Reason:</strong></td><td style="padding:8px 0;color:#333;">${createdDoc.reason || '-'}</td></tr>
          </table>
          <div style="margin-top:16px;">
            <a href="${approveLink}" style="display:inline-block;margin-right:10px;background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Approve</a>
            <a href="${rejectLink}" style="display:inline-block;background:#dc2626;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Reject</a>
          </div>
          <div style="margin-top:10px;color:#6b7280;font-size:12px;">Links expire in 48 hours</div>
        </div>
      `;
      const info = await mailer.sendMail({ from: `"Leave System" <${from}>`, to, subject, html });
      results.push({ to, messageId: info.messageId });
    }
    return { success: true, sent: results };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

async function getEmployeeEmailForLeave(leaveDoc) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (leaveDoc?.employeeId) {
    const emp = await Employee.findOne({ employeeId: leaveDoc.employeeId }).select('email');
    if (emp?.email && emailRegex.test(emp.email)) return emp.email;
  }
  if (leaveDoc?.userId) {
    const user = await User.findOne({ _id: leaveDoc.userId }).select('email');
    if (user?.email && emailRegex.test(user.email)) return user.email;
  }
  return '';
}

async function sendLeaveStatusEmail(updatedDoc) {
  try {
    const to = await getEmployeeEmailForLeave(updatedDoc);
    if (!to) return { success: false, error: 'No employee email' };
    const from = process.env.EMAIL_USER;
    const status = updatedDoc.status;
    const subject = `Leave ${status}: ${updatedDoc.employeeName}`;
    const start = new Date(updatedDoc.startDate).toISOString().split('T')[0];
    const end = new Date(updatedDoc.endDate).toISOString().split('T')[0];
    let empProfile = null;
    if (updatedDoc.employeeId) {
      empProfile = await Employee.findOne({ employeeId: updatedDoc.employeeId }).select('division location');
    }
    const division = empProfile?.division || '-';
    const location = updatedDoc.location || empProfile?.location || '-';
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;padding:20px;max-width:700px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;">
        <h2 style="color:#333;margin:0 0 16px 0;padding-bottom:8px;border-bottom:2px solid #4F46E5;">Leave ${status}</h2>
        ${status === 'Rejected' ? `<p style="color:#b91c1c;"><strong>Reason:</strong> ${updatedDoc.rejectionReason || '-'}</p>` : ''}
        <table style="width:100%;border-collapse:collapse;margin-top:12px;">
          <tr><td style="padding:8px 0;color:#666;"><strong>Employee:</strong></td><td style="padding:8px 0;color:#333;">${updatedDoc.employeeName} (${updatedDoc.employeeId || '-'})</td></tr>
          <tr><td style="padding:8px 0;color:#666;"><strong>Division:</strong></td><td style="padding:8px 0;color:#333;">${division}</td></tr>
          <tr><td style="padding:8px 0;color:#666;"><strong>Location:</strong></td><td style="padding:8px 0;color:#333;">${location}</td></tr>
          <tr><td style="padding:8px 0;color:#666;"><strong>Leave Type:</strong></td><td style="padding:8px 0;color:#333;">${updatedDoc.leaveType}</td></tr>
          <tr><td style="padding:8px 0;color:#666;"><strong>Day Type:</strong></td><td style="padding:8px 0;color:#333;">${updatedDoc.dayType}</td></tr>
          <tr><td style="padding:8px 0;color:#666;"><strong>Period:</strong></td><td style="padding:8px 0;color:#333;">${start} to ${end}</td></tr>
          <tr><td style="padding:8px 0;color:#666;"><strong>Total Days:</strong></td><td style="padding:8px 0;color:#333;">${updatedDoc.totalDays}</td></tr>
        </table>
      </div>
    `;
    const info = await mailer.sendMail({ from: `"Leave System" <${from}>`, to, subject, html });
    return { success: true, messageId: info.messageId };
  } catch (e) {
    return { success: false, error: e?.message || String(e) };
  }
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), diff));
}

// Helper function to get locked days for user in a week
async function getLockedDaysForUser(userId, weekStartDate, weekEndDate) {
  try {
    const weekStart = new Date(weekStartDate);
    const weekEnd = new Date(weekEndDate);

    const approvedLeaves = await LeaveApplication.find({
      userId: userId,
      status: 'Approved',
      $or: [
        { startDate: { $gte: weekStart, $lte: weekEnd } },
        { endDate: { $gte: weekStart, $lte: weekEnd } },
        { startDate: { $lte: weekStart }, endDate: { $gte: weekEnd } }
      ]
    });

    const lockedDays = [false, false, false, false, false, false, false];

    approvedLeaves.forEach(leave => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);

      // Loop through each day of the week
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(currentDate.getDate() + i);

        // Check if currentDate is within leave period
        if (currentDate >= start && currentDate <= end) {
          lockedDays[i] = true;
        }
      }
    });

    return lockedDays;
  } catch (error) {
    console.error("Error getting locked days:", error);
    return [false, false, false, false, false, false, false];
  }
}

async function syncTimesheetWithLeave(leaveApp) {
  const startDate = new Date(leaveApp.startDate);
  const endDate = new Date(leaveApp.endDate);
  const userId = leaveApp.userId;

  // Initialize loopDate to UTC midnight
  let loopDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));

  // Initialize endDateTime to UTC midnight
  const endDateTime = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));

  // Cache timesheets to avoid repeated DB calls for same week
  const timesheetCache = {};

  while (loopDate <= endDateTime) {
    const weekStart = getMonday(loopDate);
    const weekStartStr = weekStart.toISOString();

    let timesheet;

    if (timesheetCache[weekStartStr]) {
      timesheet = timesheetCache[weekStartStr];
    } else {
      // weekEnd should be Sunday midnight UTC
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekStart.getUTCDate() + 6);

      timesheet = await Timesheet.findOne({
        userId: userId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd
      });

      if (!timesheet) {
        console.log("Timesheet not found, creating new one.");
        if (leaveApp.status !== 'Approved') {
          // If not approving and timesheet doesn't exist, nothing to do for this week
          loopDate.setUTCDate(loopDate.getUTCDate() + 1);
          continue;
        }
        timesheet = new Timesheet({
          userId: userId,
          employeeId: leaveApp.employeeId,
          employeeName: leaveApp.employeeName,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          entries: [],
          status: 'Draft'
        });
      } else {
        console.log("Timesheet found:", timesheet._id);
        // Ensure employee details are present
        if (!timesheet.employeeId && leaveApp.employeeId) timesheet.employeeId = leaveApp.employeeId;
        if (!timesheet.employeeName && leaveApp.employeeName) timesheet.employeeName = leaveApp.employeeName;
      }
      timesheetCache[weekStartStr] = timesheet;
    }

    const dayIndex = Math.round((loopDate.getTime() - weekStart.getTime()) / (1000 * 3600 * 24));
    console.log(`Processing date: ${loopDate.toISOString()}, dayIndex: ${dayIndex}`);

    if (dayIndex >= 0 && dayIndex <= 6) {
      const taskName = `Leave Approved (${leaveApp.leaveType})`;
      let leaveEntry = timesheet.entries.find(e => e.project === 'Leave' && e.task === taskName);

      if (leaveApp.status === 'Approved') {
        if (!leaveEntry) {
          console.log("Adding new Leave Approved entry.");
          timesheet.entries.push({
            project: 'Leave',
            task: taskName,
            type: 'leave',
            hours: [0, 0, 0, 0, 0, 0, 0],
            locked: true
          });
          leaveEntry = timesheet.entries[timesheet.entries.length - 1];
        } else {
          console.log("Updating existing Leave Approved entry.");
          leaveEntry.locked = true;
        }

        // Set 9.5 hours (9:30) for full day leave, 4.75 for half day
        const leaveHours = leaveApp.dayType === 'Half Day' ? 4.75 : 9.5;
        console.log(`Setting ${leaveHours} hours for dayIndex ${dayIndex}`);
        leaveEntry.hours.set(dayIndex, leaveHours);

        // Mark all project entries for this day as locked if total leave hours >= 8
        // This handles "Full Day" leave (9.5h) and "Half Day" + "Half Day" (4.75h + 4.75h = 9.5h)

        // Calculate total leave hours for this day
        const totalLeaveHours = timesheet.entries.reduce((sum, e) => {
          if (e.type === 'leave' && (e.task || '').startsWith('Leave Approved')) {
            return sum + (Number(e.hours[dayIndex]) || 0);
          }
          return sum;
        }, 0);

        const shouldLock = totalLeaveHours >= 8;

        timesheet.entries.forEach(entry => {
          if (entry.type === 'project') {
            // Create a lockedDays array if it doesn't exist
            if (!entry.lockedDays) {
              entry.lockedDays = [false, false, false, false, false, false, false];
            }
            // Mark this day as locked if total leave hours cover the full day
            entry.lockedDays[dayIndex] = shouldLock;
          }
        });
      } else {
        // Rejected or Pending - revert changes
        if (leaveEntry) {
          console.log(`Removing leave for dayIndex ${dayIndex}`);
          // Reset hours to 0
          leaveEntry.hours.set(dayIndex, 0);

          // Unlock project entries for this day if no longer fully covered by leave
          const totalLeaveHours = timesheet.entries.reduce((sum, e) => {
            if (e.type === 'leave' && (e.task || '').startsWith('Leave Approved')) {
              return sum + (Number(e.hours[dayIndex]) || 0);
            }
            return sum;
          }, 0);
          const shouldLock = totalLeaveHours >= 8;

          timesheet.entries.forEach(entry => {
            if (entry.type === 'project' && entry.lockedDays) {
              entry.lockedDays[dayIndex] = shouldLock;
            }
          });

          // Check if row is now empty
          const totalHours = leaveEntry.hours.reduce((a, b) => a + (Number(b) || 0), 0);
          if (totalHours === 0) {
            // Remove the entry if no hours left
            console.log("Removing empty Leave Approved entry.");
            timesheet.entries.pull(leaveEntry._id);
          }
        }
      }
    }

    loopDate.setUTCDate(loopDate.getUTCDate() + 1);
  }

  // Save all modified timesheets
  for (const ts of Object.values(timesheetCache)) {
    await ts.save();
  }
}

function hasPermission(user, perm) {
  if (user?.role === 'admin') return true;
  return Array.isArray(user?.permissions) && user.permissions.includes(perm);
}

function countWorkingDays(startDate, endDate, dayType) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s) || isNaN(e) || s > e) return 0;
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    count++;
    cur.setDate(cur.getDate() + 1);
  }
  if (dayType === 'Half Day' && count === 1) return 0.5;
  return count;
}

// Leave balance for all employees or by employeeId
router.get('/balance', auth, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'leave_view')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { employeeId } = req.query;
    // Fetch employees
    const filter = employeeId ? { employeeId } : {};
    const employees = await Employee.find(filter).sort({ name: 1 }).lean();
    // Aggregate used leaves per employeeId
    const empIds = employees.map(e => e.employeeId).filter(Boolean);
    const usedMap = {};
    const storedBalancesMap = {};

    try {
      if (empIds.length > 0) {
        const [approvals, storedBalances] = await Promise.all([
          LeaveApplication.find({ employeeId: { $in: empIds }, status: 'Approved' }).lean(),
          LeaveBalance.find({ employeeId: { $in: empIds } }).lean()
        ]);

        for (const rec of approvals) {
          const id = rec.employeeId;
          if (!usedMap[id]) usedMap[id] = [];
          usedMap[id].push(rec);
        }

        for (const bal of storedBalances) {
          storedBalancesMap[bal.employeeId] = bal;
        }
      }
    } catch (_) {
      // If usage aggregation fails, continue
    }

    const result = employees.map(emp => {
      // If persisted leaveBalances exist in separate collection, use them
      const stored = storedBalancesMap[emp.employeeId];
      const currentYear = new Date().getFullYear();
      const storedYear = stored ? (stored.year || new Date(stored.updatedAt || stored.createdAt).getFullYear()) : 0;

      const systemCalc = calcBalanceForEmployee(emp, usedMap[emp.employeeId] || []);

      // Check if employee is in "No Carry Forward" period (Trainee or < 6 months)
      // If so, we bypass stored balances to ensure monthly reset logic is strictly followed
      const isNoCarryForward = (systemCalc.regularMonths || 0) < 6;

      if (stored && stored.balances && stored.balances.totalBalance !== undefined && storedYear === currentYear) {
        // Calculate what the system WOULD have allocated at the time of last update
        const lastUpdateDate = stored.lastUpdated ? new Date(stored.lastUpdated) : new Date(stored.createdAt);
        // We pass empty array for used leaves because we only care about allocation
        const pastSystemCalc = calcBalanceForEmployee(emp, [], lastUpdateDate);

        // Merge stored allocated with system used to ensure dynamic LOP detection
        const mergedBalances = mergeBalances(stored.balances, systemCalc, pastSystemCalc);

        return {
          employeeId: emp.employeeId || '',
          name: emp.name || emp.employeename || '',
          position: emp.position || emp.role || '',
          division: emp.division || '',
          location: emp.location || emp.branch || '',
          monthsOfService: monthsBetween(emp.dateOfJoining || emp.hireDate || emp.createdAt),
          balances: mergedBalances
        };
      }
      return systemCalc;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save leave balance snapshot to LeaveBalance collection
router.put('/balance/save', auth, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'leave_manage')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { employeeId, balances: manualBalances } = req.body || {};
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }
    const emp = await Employee.findOne({ employeeId }).lean();
    if (!emp) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const approvals = await LeaveApplication.find({ employeeId, status: 'Approved' }).lean();

    let finalBalances;

    if (manualBalances) {
      // If manual balances provided, use them but respect used counts from system
      const systemCalc = calcBalanceForEmployee(emp, approvals);

      const makeBalanceObj = (type, manualVal) => {
        const used = systemCalc.balances[type]?.used || 0;
        const bal = Number(manualVal) || 0;
        return {
          allocated: bal + used,
          used: used,
          balance: bal
        };
      };

      finalBalances = {
        casual: makeBalanceObj('casual', manualBalances.casual),
        sick: makeBalanceObj('sick', manualBalances.sick),
        privilege: {
          ...makeBalanceObj('privilege', manualBalances.privilege),
          nonCarryAllocated: systemCalc.balances.privilege.nonCarryAllocated,
          carryAllocated: systemCalc.balances.privilege.carryAllocated,
          carryForwardEligibleBalance: Number(manualBalances.privilege) || 0
        },
        totalBalance: (Number(manualBalances.casual) || 0) + (Number(manualBalances.sick) || 0) + (Number(manualBalances.privilege) || 0)
      };
    } else {
      // Default: System calculation
      finalBalances = calcBalanceForEmployee(emp, approvals).balances;
    }

    const updated = await LeaveBalance.findOneAndUpdate(
      { employeeId },
      {
        employeeId,
        employeeName: emp.name,
        balances: finalBalances,
        lastUpdated: new Date(),
        year: new Date().getFullYear()
      },
      { new: true, upsert: true }
    );
    res.json({ employeeId, balances: updated.balances, updatedAt: updated.lastUpdated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync/Save all employee balances to DB
router.post('/balance/sync-all', auth, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'leave_manage')) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const employees = await Employee.find({}).lean();
    const empIds = employees.map(e => e.employeeId).filter(Boolean);

    // Get all approvals
    const approvals = await LeaveApplication.find({
      employeeId: { $in: empIds },
      status: 'Approved'
    }).lean();

    const usedMap = {};
    for (const rec of approvals) {
      const id = rec.employeeId;
      if (!usedMap[id]) usedMap[id] = [];
      usedMap[id].push(rec);
    }

    const updates = [];
    const timestamp = new Date();

    for (const emp of employees) {
      if (!emp.employeeId) continue;

      const usedLeaves = usedMap[emp.employeeId] || [];
      const calc = calcBalanceForEmployee(emp, usedLeaves);

      // We want to preserve existing balances if they have manual adjustments, 
      // OR we just overwrite everything with the system calculation?
      // "Save all employee automatically" usually means "Calculate and Persist".
      // If we want to preserve manual edits, we should check if a record exists and maybe merge?
      // For now, let's assume "Sync" means "Update DB with latest system calculation", 
      // but if we want to respect manual overrides, it gets complicated.
      // However, the user said "leave balance data i want to save all employee automaticaly".
      // I will implement a "Smart Sync" which tries to preserve manual "Allocated" overrides if possible,
      // but simpler is just to save the current calculated state.
      // Given the previous "Save" logic which respects system used count but allows manual allocated,
      // a bulk sync usually implies "Run calculation for everyone and save it".

      // Let's just save the system calculation for now. 
      // If a user manually edited a balance, it's already in the DB.
      // If we re-run this, we might overwrite their manual edit if we don't fetch the existing one.

      // OPTION: Fetch existing balance first.
      const existing = await LeaveBalance.findOne({ employeeId: emp.employeeId }).lean();

      let finalBalances;
      if (existing && existing.balances && existing.balances.totalBalance !== undefined) {
        // Smart Sync: Preserve manual adjustments by calculating delta
        const lastUpdateDate = existing.lastUpdated ? new Date(existing.lastUpdated) : new Date(existing.createdAt);
        const pastSystemCalc = calcBalanceForEmployee(emp, [], lastUpdateDate);

        finalBalances = mergeBalances(existing.balances, calc, pastSystemCalc);
      } else {
        finalBalances = calc.balances;
      }

      updates.push({
        updateOne: {
          filter: { employeeId: emp.employeeId },
          update: {
            $set: {
              employeeId: emp.employeeId,
              employeeName: emp.name,
              balances: finalBalances,
              lastUpdated: timestamp
            }
          },
          upsert: true
        }
      });
    }

    if (updates.length > 0) {
      await LeaveBalance.bulkWrite(updates);
    }

    res.json({ message: `Synced ${updates.length} employee balances`, count: updates.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Leave balance for the current logged-in user (employees)
router.get('/my-balance', auth, async (req, res) => {
  try {
    // Resolve employee record for current user
    const user = req.user || {};
    let emp = null;
    if (user.employeeId) {
      emp = await Employee.findOne({ employeeId: user.employeeId }).lean();
    }
    // Fallback by email if available
    if (!emp && user.email) {
      emp = await Employee.findOne({ email: user.email }).lean();
    }
    // Fallback by name
    if (!emp && user.name) {
      emp = await Employee.findOne({ name: user.name }).lean();
    }
    if (!emp) {
      return res.status(404).json({ message: 'Employee profile not found' });
    }

    // Aggregate approved leaves for this user
    let approvals = [];
    if (emp.employeeId) {
      approvals = await LeaveApplication.find({
        $or: [{ userId: user._id }, { employeeId: emp.employeeId }],
        status: 'Approved'
      }).lean();
      // Deduplicate
      const seen = new Set();
      approvals = approvals.filter(a => {
        const k = a._id.toString();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    } else {
      approvals = await LeaveApplication.find({ userId: user._id, status: 'Approved' }).lean();
    }

    const systemCalc = calcBalanceForEmployee(emp, approvals);

    // Check for stored balance
    if (emp.employeeId) {
      const stored = await LeaveBalance.findOne({ employeeId: emp.employeeId }).lean();
      const currentYear = new Date().getFullYear();
      const storedYear = stored ? (stored.year || new Date(stored.updatedAt || stored.createdAt).getFullYear()) : 0;

      if (stored && stored.balances && stored.balances.totalBalance !== undefined && storedYear === currentYear) {
        // Calculate what the system WOULD have allocated at the time of last update
        const lastUpdateDate = stored.lastUpdated ? new Date(stored.lastUpdated) : new Date(stored.createdAt);
        const pastSystemCalc = calcBalanceForEmployee(emp, [], lastUpdateDate);

        // Merge stored allocated with system used
        const mergedBalances = JSON.parse(JSON.stringify(stored.balances));

        ['casual', 'sick', 'privilege'].forEach(type => {
          if (mergedBalances[type]) {
            let allocated = Number(mergedBalances[type].allocated) || 0;

            // Calculate incremental accrual
            const currentAlloc = Number(systemCalc.balances[type]?.allocated) || 0;
            const pastAlloc = Number(pastSystemCalc.balances[type]?.allocated) || 0;
            const delta = currentAlloc - pastAlloc;

            if (Math.abs(delta) > 0.001) {
              allocated += delta;
            }

            const used = Number(systemCalc.balances[type]?.used) || 0;
            mergedBalances[type].allocated = allocated;
            mergedBalances[type].used = used;
            mergedBalances[type].balance = allocated - used;
          }
        });

        const clBal = Number(mergedBalances.casual?.balance) || 0;
        const slBal = Number(mergedBalances.sick?.balance) || 0;
        const plBal = Number(mergedBalances.privilege?.balance) || 0;
        mergedBalances.totalBalance = clBal + slBal + plBal;

        return res.json({
          employeeId: emp.employeeId || '',
          name: emp.name || emp.employeename || '',
          position: emp.position || emp.role || '',
          division: emp.division || '',
          monthsOfService: monthsBetween(emp.dateOfJoining || emp.hireDate || emp.createdAt),
          balances: mergedBalances
        });
      }
    }

    return res.json(systemCalc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: list leave applications with filters
router.get('/', auth, async (req, res) => {
  try {
    if (!hasPermission(req.user, 'leave_view')) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { startDate, endDate, employeeId, status, leaveType } = req.query;
    const filter = {};
    if (employeeId) filter.employeeId = employeeId;
    if (status && status !== 'all') filter.status = status;
    if (leaveType && leaveType !== 'all') filter.leaveType = leaveType;

    const role = String(req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isPM = role === 'projectmanager' || role === 'project_manager';
    if (!isAdmin) {
      const { allAssignedMemberIds, myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
      if (isPM) {
        if (filter.employeeId) {
          if (!myAssignedMemberIds.includes(filter.employeeId)) {
            return res.json([]);
          }
        } else {
          if (myAssignedMemberIds.length === 0) {
            return res.json([]);
          }
          filter.employeeId = { $in: myAssignedMemberIds };
        }
      } else {
        if (filter.employeeId) {
          if (allAssignedMemberIds.includes(filter.employeeId)) {
            return res.json([]);
          }
        } else if (allAssignedMemberIds.length > 0) {
          filter.employeeId = { $nin: allAssignedMemberIds };
        }
      }
    }

    if (req.query.overlap === 'true' && startDate && endDate) {
      const sDate = new Date(startDate);
      const eDate = new Date(endDate);
      // Overlap: Start <= EndOfRange AND End >= StartOfRange
      filter.$and = [
        { startDate: { $lte: eDate } },
        { endDate: { $gte: sDate } }
      ];
    } else if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }
    const items = await LeaveApplication.find(filter).sort({ createdAt: -1 }).lean();

    // Get user details to fallback for missing employeeId/Name
    const userIds = Array.from(new Set(items.map(i => i.userId).filter(Boolean)));
    let userMap = {};
    if (userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds } }).select('employeeId name email').lean();
      userMap = users.reduce((acc, u) => {
        acc[u._id.toString()] = u;
        return acc;
      }, {});
    }

    // Collect all potential employee IDs and Emails
    const empIds = new Set();
    const userEmails = new Set();

    items.forEach(i => {
      if (i.employeeId) empIds.add(i.employeeId);
      const user = userMap[i.userId?.toString()];
      if (user) {
        if (user.employeeId) empIds.add(user.employeeId);
        if (user.email) userEmails.add(user.email);
      }
    });

    const empQuery = { $or: [] };
    if (empIds.size > 0) empQuery.$or.push({ employeeId: { $in: Array.from(empIds) } });
    if (userEmails.size > 0) empQuery.$or.push({ email: { $in: Array.from(userEmails) } });

    let empMap = {};
    let empEmailMap = {};

    if (empQuery.$or.length > 0) {
      const emps = await Employee.find(empQuery).lean();
      emps.forEach(e => {
        if (e.employeeId) empMap[e.employeeId] = e;
        if (e.email) empEmailMap[e.email] = e;
      });
    }

    const mapped = items.map(i => {
      const user = userMap[i.userId?.toString()] || {};

      // Try to resolve employee from multiple sources
      let emp = null;

      // 1. Direct Employee ID
      if (i.employeeId && empMap[i.employeeId]) {
        emp = empMap[i.employeeId];
      }
      // 2. User's Employee ID
      else if (user.employeeId && empMap[user.employeeId]) {
        emp = empMap[user.employeeId];
      }
      // 3. User's Email
      else if (user.email && empEmailMap[user.email]) {
        emp = empEmailMap[user.email];
      }

      // Determine final values
      const effectiveEmployeeId = emp?.employeeId || i.employeeId || user.employeeId || '';

      return {
        ...i,
        employeeId: effectiveEmployeeId,
        employeeName: i.employeeName || emp?.name || emp?.employeename || user.name || '',
        location: i.location || emp?.location || emp?.branch || ''
      };
    });
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: approve/reject leave
router.put('/:id/status', auth, async (req, res) => {
  try {
    const roleAllowed = ['admin', 'projectmanager', 'project_manager', 'hr'].includes(req.user.role);
    const permAllowed = hasPermission(req.user, 'leave_manage');
    if (!roleAllowed && !permAllowed) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { status, rejectionReason } = req.body || {};
    const allowed = ['Approved', 'Rejected', 'Pending'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const existing = await LeaveApplication.findById(req.params.id).select('employeeId userId').lean();
    if (!existing) return res.status(404).json({ error: 'Leave application not found' });

    let targetEmployeeId = String(existing.employeeId || '');
    if (!targetEmployeeId && existing.userId) {
      const u = await User.findById(existing.userId).select('employeeId').lean();
      targetEmployeeId = String(u?.employeeId || '');
    }

    const role = String(req.user.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const isPM = role === 'projectmanager' || role === 'project_manager';
    if (!isAdmin && targetEmployeeId) {
      const { allAssignedMemberIds, myAssignedMemberIds } = await getTeamManagementAssignmentSets(req.user.employeeId);
      if (isPM) {
        if (!myAssignedMemberIds.includes(targetEmployeeId)) {
          return res.status(403).json({ message: 'Access denied' });
        }
      } else {
        if (allAssignedMemberIds.includes(targetEmployeeId)) {
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    }

    const updated = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      { status, ...(status === 'Rejected' ? { rejectionReason: rejectionReason || '' } : { rejectionReason: '' }) },
      { new: true }
    );
    if (updated) {
      await syncTimesheetWithLeave(updated);
      // try { await sendLeaveStatusEmail(updated); } catch (_) {}

      // Create Notification
      try {
        const notifType = status === 'Approved' ? 'LEAVE_APPROVED' : status === 'Rejected' ? 'LEAVE_REJECTED' : 'OTHER';
        if (notifType !== 'OTHER') {
          await Notification.create({
            recipient: existing.userId,
            title: status === 'Approved' ? 'Leave Approved' : 'Leave Rejected',
            message: `Your leave request from ${new Date(updated.startDate).toLocaleDateString()} to ${new Date(updated.endDate).toLocaleDateString()} has been ${status.toLowerCase()}.`,
            type: notifType,
            isRead: false
          });
        }
      } catch (err) {
        console.error('Error creating notification:', err);
      }
    }
    if (!updated) return res.status(404).json({ error: 'Leave application not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get locked days for a specific week
router.get('/locked-days', auth, async (req, res) => {
  try {
    const { weekStart, weekEnd } = req.query;

    if (!weekStart || !weekEnd) {
      return res.status(400).json({
        error: 'weekStart and weekEnd parameters are required'
      });
    }

    const lockedDays = await getLockedDaysForUser(
      req.user._id,
      new Date(weekStart),
      new Date(weekEnd)
    );

    res.json({ lockedDays });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my', auth, async (req, res) => {
  try {
    const items = await LeaveApplication.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const { leaveType, startDate, endDate, dayType, reason, bereavementRelation, totalDays } = req.body;
    const computedDays = countWorkingDays(startDate, endDate, dayType);
    const finalDays = typeof totalDays === 'number' && totalDays > 0 ? totalDays : computedDays;

    // Fetch employee details to populate name and location
    let employeeName = req.user.name || '';
    let location = '';

    // Try to find employee record
    let emp = null;
    if (req.user.employeeId) {
      emp = await Employee.findOne({ employeeId: req.user.employeeId }).lean();
    }
    if (!emp && req.user.email) {
      emp = await Employee.findOne({ email: req.user.email }).lean();
    }

    if (emp) {
      employeeName = emp.name || emp.employeename || employeeName;
      location = emp.location || emp.branch || '';
    }

    const created = await LeaveApplication.create({
      userId: req.user._id,
      employeeId: req.user.employeeId || emp?.employeeId || '',
      employeeName,
      location,
      leaveType,
      startDate,
      endDate,
      dayType,
      totalDays: finalDays,
      reason: reason || '',
      bereavementRelation: bereavementRelation || ''
    });
    // try {
    //   await sendLeaveSubmissionEmail(created, req.user, emp || {});
    // } catch (_) {}

    // Create Notification
    try {
      // 1. Notify Applicant (Employee)
      await Notification.create({
        recipient: req.user._id,
        title: 'Leave Applied',
        message: `Your leave application for ${leaveType} from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()} has been submitted.`,
        type: 'LEAVE_APPLY',
        isRead: false
      });

      // 2. Notify Admins and Reporting Managers
      const recipients = await getAdminAndPMUserIds(emp);
      for (const recipientId of recipients) {
        // Avoid sending duplicate if admin is also the applicant
        if (recipientId === req.user._id.toString()) continue;

        await Notification.create({
          recipient: recipientId,
          title: 'New Leave Request',
          message: `${employeeName} applied for ${leaveType} (${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}).`,
          type: 'LEAVE_APPLY',
          isRead: false
        });
      }
    } catch (err) {
      console.error('Error creating notification:', err);
    }

    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/email-action', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send('<h3>Invalid request</h3>');
    let payload = null;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return res.status(400).send('<h3>Invalid or expired link</h3>');
    }
    const { leaveId, action, email } = payload || {};
    if (!leaveId || !action || !email) return res.status(400).send('<h3>Malformed link</h3>');
    const allowed = ['Approved', 'Rejected'];
    if (!allowed.includes(action)) return res.status(400).send('<h3>Invalid action</h3>');
    const leave = await LeaveApplication.findById(leaveId);
    if (!leave) return res.status(404).send('<h3>Leave application not found</h3>');
    // Authorization via email: must be admin or project manager
    const user = await User.findOne({ email }).select('role employeeId email');
    let isAuthorized = false;
    if (user && (user.role === 'admin' || user.role === 'projectmanager' || user.role === 'project_manager')) {
      isAuthorized = true;
    } else {
      const roleRegex = /project\s*manager/i;
      const emp = await Employee.findOne({ email }).select('role designation position division location');
      if (emp && (roleRegex.test(emp.role || '') || roleRegex.test(emp.designation || '') || roleRegex.test(emp.position || ''))) {
        // Optional: ensure same division
        const applicant = await Employee.findOne({ employeeId: leave.employeeId }).select('division location');
        if (!applicant || !emp.division || emp.division === applicant.division) {
          isAuthorized = true;
        }
      }
    }
    if (!isAuthorized) return res.status(403).send('<h3>Not authorized to perform this action</h3>');
    // Only allow transition from Pending
    if (leave.status !== 'Pending' && action === 'Approved') {
      return res.status(400).send('<h3>Only Pending applications can be approved</h3>');
    }
    const updated = await LeaveApplication.findByIdAndUpdate(leaveId, { status: action, rejectionReason: action === 'Rejected' ? '' : leave.rejectionReason }, { new: true });
    if (updated && action === 'Approved') {
      try { await syncTimesheetWithLeave(updated); } catch (_) { }
    }
    // try { if (updated) await sendLeaveStatusEmail(updated); } catch (_) {}

    // Create Notification
    try {
      if (updated) {
        const notifType = action === 'Approved' ? 'LEAVE_APPROVED' : action === 'Rejected' ? 'LEAVE_REJECTED' : 'OTHER';
        if (notifType !== 'OTHER') {
          await Notification.create({
            recipient: updated.userId,
            title: action === 'Approved' ? 'Leave Approved' : 'Leave Rejected',
            message: `Your leave request from ${new Date(updated.startDate).toLocaleDateString()} to ${new Date(updated.endDate).toLocaleDateString()} has been ${action.toLowerCase()}.`,
            type: notifType,
            isRead: false
          });
        }
      }
    } catch (err) {
      console.error('Error creating notification:', err);
    }

    const msg = action === 'Approved' ? 'Leave approved successfully.' : 'Leave rejected successfully.';
    return res.send(`<div style="font-family:Arial;padding:20px;"><h3>${msg}</h3><p>Employee: ${updated.employeeName}</p><p>Type: ${updated.leaveType}</p><p>Days: ${updated.totalDays}</p></div>`);
  } catch (err) {
    return res.status(500).send(`<h3>Server error</h3><p>${err?.message || err}</p>`);
  }
});

// Update own leave application (only when Pending)
router.put('/:id', auth, async (req, res) => {
  try {
    const existing = await LeaveApplication.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Leave application not found' });
    if (String(existing.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not allowed to edit this application' });
    }
    if (existing.status !== 'Pending') {
      return res.status(400).json({ error: 'Only Pending applications can be edited' });
    }
    const { leaveType, startDate, endDate, dayType, reason, bereavementRelation, totalDays } = req.body;
    const computedDays = countWorkingDays(startDate, endDate, dayType);
    const finalDays = typeof totalDays === 'number' && totalDays > 0 ? totalDays : computedDays;
    const updated = await LeaveApplication.findByIdAndUpdate(
      req.params.id,
      {
        leaveType: leaveType || existing.leaveType,
        startDate: startDate || existing.startDate,
        endDate: endDate || existing.endDate,
        dayType: dayType || existing.dayType,
        totalDays: finalDays || existing.totalDays,
        reason: typeof reason === 'string' ? reason : existing.reason,
        bereavementRelation: typeof bereavementRelation === 'string' ? bereavementRelation : existing.bereavementRelation
      },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete own leave application (only when Pending)
router.delete('/:id', auth, async (req, res) => {
  try {
    const existing = await LeaveApplication.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ error: 'Leave application not found' });
    if (String(existing.userId) !== String(req.user._id)) {
      return res.status(403).json({ error: 'Not allowed to delete this application' });
    }
    if (existing.status !== 'Pending') {
      return res.status(400).json({ error: 'Only Pending applications can be deleted' });
    }
    await LeaveApplication.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
