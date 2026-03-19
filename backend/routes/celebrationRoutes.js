const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const Wish = require('../models/Wish');
const User = require('../models/User');
const Notification = require('../models/Notification');
const auth = require('../middleware/auth'); // Assuming there's an auth middleware

// Get calendar data for a specific month and year
router.get('/calendar', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = parseInt(month);
    const currentYear = parseInt(year);

    // Get all active employees
    const employees = await Employee.find({ status: 'Active' });

    const celebrations = [];

    // Process employees for birthdays and anniversaries in that month
    for (const emp of employees) {
      // Birthdays
      if (emp.dateOfBirth) {
        const dob = new Date(emp.dateOfBirth);
        if (dob.getMonth() + 1 === currentMonth) {
          const eventDate = new Date(currentYear, dob.getMonth(), dob.getDate());

          // Check if current user has already wished this employee for this year
          const existingWish = await Wish.findOne({
            senderEmployeeId: req.user.employeeId,
            receiverEmployeeId: emp.employeeId,
            eventType: 'Birthday',
            wishYear: currentYear
          });

          celebrations.push({
            employeeId: emp.employeeId,
            employeeName: emp.name,
            eventType: 'Birthday',
            eventDate,
            department: emp.department,
            designation: emp.designation,
            division: emp.division,
            location: emp.location,
            isWished: !!existingWish
          });
        }
      }

      // Work Anniversaries
      if (emp.dateOfJoining) {
        const doj = new Date(emp.dateOfJoining);
        // Only if joining year is before current year
        if (doj.getMonth() + 1 === currentMonth && doj.getFullYear() < currentYear) {
          const eventDate = new Date(currentYear, doj.getMonth(), doj.getDate());

          // Check if current user has already wished
          const existingWish = await Wish.findOne({
            senderEmployeeId: req.user.employeeId,
            receiverEmployeeId: emp.employeeId,
            eventType: 'Work Anniversary',
            wishYear: currentYear
          });

          celebrations.push({
            employeeId: emp.employeeId,
            employeeName: emp.name,
            eventType: 'Work Anniversary',
            eventDate,
            department: emp.department,
            designation: emp.designation,
            division: emp.division,
            location: emp.location,
            isWished: !!existingWish
          });
        }
      }
    }

    res.json(celebrations);
  } catch (error) {
    console.error('Error fetching celebration calendar:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Get wish statistics (distinct senders) for a month
router.get('/stats', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const currentMonth = parseInt(month);
    const currentYear = parseInt(year);

    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    const birthdaySenders = await Wish.distinct('senderEmployeeId', {
      eventType: 'Birthday',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    const anniversarySenders = await Wish.distinct('senderEmployeeId', {
      eventType: 'Work Anniversary',
      createdAt: { $gte: startDate, $lte: endDate }
    });

    // Leaderboard Aggregation
    const leaderboardData = await Wish.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$senderEmployeeId",
          senderName: { $first: "$senderName" },
          birthdayWishes: { 
            $sum: { $cond: [{ $eq: ["$eventType", "Birthday"] }, 1, 0] } 
          },
          anniversaryWishes: { 
            $sum: { $cond: [{ $eq: ["$eventType", "Work Anniversary"] }, 1, 0] } 
          },
          totalWishes: { $sum: 1 }
        }
      },
      { $sort: { totalWishes: -1 } },
      { $limit: 5 }
    ]);

    // Get department for leaderboard users
    const employeeIds = leaderboardData.map(l => l._id);
    const employeesInfo = await Employee.find({ employeeId: { $in: employeeIds } }, 'employeeId department');
    const departmentMap = employeesInfo.reduce((acc, emp) => {
      acc[emp.employeeId] = emp.department;
      return acc;
    }, {});

    const leaderboard = leaderboardData.map(item => ({
      employeeId: item._id,
      employeeName: item.senderName,
      department: departmentMap[item._id] || 'Unknown',
      birthdayWishes: item.birthdayWishes,
      anniversaryWishes: item.anniversaryWishes,
      totalWishes: item.totalWishes
    }));

    // Full Wish History for Tabs
    const wishHistoryRaw = await Wish.find({
      createdAt: { $gte: startDate, $lte: endDate }
    }).sort({ createdAt: -1 });

    const wishHistoryList = wishHistoryRaw.map(w => ({
      _id: w._id,
      senderName: w.senderName,
      receiverEmployeeId: w.receiverEmployeeId,
      receiverName: w.receiverName,
      eventType: w.eventType,
      date: w.createdAt,
      message: w.message,
      replyMessage: w.replyMessage,
      replyDate: w.replyDate
    }));

    res.json({
      currentUserEmployeeId: req.user.employeeId,
      birthdayWishesSent: birthdaySenders.length,
      anniversaryWishesSent: anniversarySenders.length,
      leaderboard,
      wishHistory: wishHistoryList
    });
  } catch (error) {
    console.error('Error fetching celebration stats:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Reply to a wish
router.post('/wish/:id/reply', auth, async (req, res) => {
  try {
    const wish = await Wish.findById(req.params.id);
    if (!wish) return res.status(404).json({ message: 'Wish not found' });

    if (wish.receiverEmployeeId !== req.user.employeeId) {
      return res.status(403).json({ message: 'Unauthorized to reply to this wish' });
    }

    wish.replyMessage = req.body.replyMessage;
    wish.replyDate = new Date();
    await wish.save();

    res.json({ message: 'Reply sent successfully', wish });
  } catch (error) {
    console.error('Error replying to wish:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Send a wish
router.post('/wish', auth, async (req, res) => {
  try {
    const { receiverEmployeeId, receiverName, message, media, visibility } = req.body;
    const currentYear = new Date().getFullYear();

    // Determine event type based on the date
    const employee = await Employee.findOne({ employeeId: receiverEmployeeId });
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const today = new Date();
    let eventType = 'Birthday';
    if (employee.dateOfJoining &&
      new Date(employee.dateOfJoining).getMonth() === today.getMonth() &&
      new Date(employee.dateOfJoining).getDate() === today.getDate()) {
      eventType = 'Work Anniversary';
    }

    const newWish = new Wish({
      senderEmployeeId: req.user.employeeId,
      senderName: req.user.name || 'Anonymous',
      receiverEmployeeId,
      receiverName,
      message,
      media,
      visibility,
      eventDate: today,
      eventType,
      wishYear: currentYear
    });

    await newWish.save();

    // Create a notification for the recipient
    const recipientUser = await User.findOne({ employeeId: receiverEmployeeId });
    if (recipientUser) {
      const notificationMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
      const notification = new Notification({
        recipient: recipientUser._id,
        title: `New ${eventType} Wish! 🎉`,
        message: `${req.user.name || 'A coworker'} sent you a wish: "${notificationMessage}"`,
        type: 'OTHER'
      });
      await notification.save();
    }

    res.status(201).json({ message: 'Wish sent successfully', wish: newWish });
  } catch (error) {
    console.error('Error sending wish:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
