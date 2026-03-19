const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Employee = require('../models/Employee');
const User = require('../models/User');
const CelebrationWish = require('../models/CelebrationWish');
const CelebrationPost = require('../models/CelebrationPost');
const Notification = require('../models/Notification');

/**
 * @route   GET /api/celebrations/today
 * @desc    Get employees having birthday or work anniversary today
 * @access  Private
 */
router.get('/today', auth, async (req, res) => {
  try {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    const birthdays = await Employee.find({
      $expr: {
        $and: [
          { $eq: [{ $month: '$dateOfBirth' }, currentMonth] },
          { $eq: [{ $dayOfMonth: '$dateOfBirth' }, currentDay] }
        ]
      },
      status: 'Active'
    }).select('name employeeId department division designation dateOfBirth');

    const anniversaries = await Employee.find({
      $expr: {
        $and: [
          { $eq: [{ $month: '$dateOfJoining' }, currentMonth] },
          { $eq: [{ $dayOfMonth: '$dateOfJoining' }, currentDay] }
        ]
      },
      status: 'Active'
    }).select('name employeeId department division designation dateOfJoining');

    // For each employee, get total wishes received today
    const birthdayWithWishes = await Promise.all(birthdays.map(async (emp) => {
      const wishCount = await CelebrationWish.countDocuments({
        receiverEmployeeId: emp.employeeId,
        wishDate: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999))
        }
      });
      return { ...emp.toObject(), totalWishes: wishCount };
    }));

    const anniversaryWithWishes = await Promise.all(anniversaries.map(async (emp) => {
      const wishCount = await CelebrationWish.countDocuments({
        receiverEmployeeId: emp.employeeId,
        wishDate: {
          $gte: new Date(today.setHours(0, 0, 0, 0)),
          $lt: new Date(today.setHours(23, 59, 59, 999))
        }
      });
      
      const joiningDate = new Date(emp.dateOfJoining);
      const yearsCompleted = today.getFullYear() - joiningDate.getFullYear();
      
      return { ...emp.toObject(), totalWishes: wishCount, yearsCompleted };
    }));

    res.json({ birthdays: birthdayWithWishes, anniversaries: anniversaryWithWishes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/celebrations/birthdays
 * @desc    Get all active employees with birthday info
 */
router.get('/birthdays', auth, async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'Active' })
      .select('name employeeId department division designation dateOfBirth')
      .sort({ name: 1 });

    const today = new Date();
    const result = await Promise.all(employees.map(async (emp) => {
      if (!emp.dateOfBirth) return null;
      
      const dob = new Date(emp.dateOfBirth);
      const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      
      const totalWishes = await CelebrationWish.countDocuments({ receiverEmployeeId: emp.employeeId });

      return {
        ...emp.toObject(),
        birthdayThisYear,
        totalWishes
      };
    }));

    res.json(result.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/celebrations/anniversaries
 * @desc    Get all active employees with work anniversary info
 */
router.get('/anniversaries', auth, async (req, res) => {
  try {
    const employees = await Employee.find({ status: 'Active' })
      .select('name employeeId department division designation dateOfJoining')
      .sort({ name: 1 });

    const today = new Date();
    const result = await Promise.all(employees.map(async (emp) => {
      if (!emp.dateOfJoining) return null;
      
      const doj = new Date(emp.dateOfJoining);
      const anniversaryThisYear = new Date(today.getFullYear(), doj.getMonth(), doj.getDate());
      const yearsCompleted = today.getFullYear() - doj.getFullYear();
      
      const totalWishes = await CelebrationWish.countDocuments({ receiverEmployeeId: emp.employeeId });

      return {
        ...emp.toObject(),
        anniversaryThisYear,
        yearsCompleted,
        totalWishes
      };
    }));

    res.json(result.filter(Boolean));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/celebrations/wish
 * @desc    Send a celebration wish
 */
router.post('/wish', auth, async (req, res) => {
  try {
    const { receiverEmployeeId, receiverName, message, media, visibility } = req.body;
    
    const newWish = new CelebrationWish({
      senderEmployeeId: req.user.employeeId,
      senderName: req.user.name,
      receiverEmployeeId,
      receiverName,
      message,
      media,
      visibility,
      wishTime: new Date().toLocaleTimeString()
    });

    const savedWish = await newWish.save();
    
    // Create a notification for the receiver
    try {
      const recipientUser = await User.findOne({ employeeId: receiverEmployeeId });
      if (recipientUser) {
        const notification = new Notification({
          recipient: recipientUser._id,
          type: 'CELEBRATION',
          title: 'New Celebration Wish!',
          message: `${req.user.name} sent you a wish: "${message.substring(0, 30)}${message.length > 30 ? '...' : ''}"`,
          isRead: false
        });
        await notification.save();
      }
    } catch (notifError) {
      console.error("Error creating notification for wish:", notifError);
    }

    res.status(201).json(savedWish);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route   GET /api/celebrations/wishes/:employeeId
 * @desc    Get wishes received by an employee
 */
router.get('/wishes/:employeeId', auth, async (req, res) => {
  try {
    const wishes = await CelebrationWish.find({ receiverEmployeeId: req.params.employeeId })
      .sort({ createdAt: -1 });
    res.json(wishes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/celebrations/leaderboard
 * @desc    Get top celebrated employees
 */
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const leaderboard = await CelebrationWish.aggregate([
      {
        $group: {
          _id: "$receiverEmployeeId",
          totalWishes: { $sum: 1 },
          receiverName: { $first: "$receiverName" }
        }
      },
      { $sort: { totalWishes: -1 } },
      { $limit: 10 }
    ]);

    // Populate with more employee details
    const result = await Promise.all(leaderboard.map(async (item, index) => {
      const emp = await Employee.findOne({ employeeId: item._id }).select('department designation');
      return {
        rank: index + 1,
        employeeId: item._id,
        employeeName: item.receiverName,
        totalWishes: item.totalWishes,
        department: emp?.department || 'N/A'
      };
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   GET /api/celebrations/calendar
 * @desc    Get events for a specific month
 */
router.get('/calendar', auth, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month);
    
    const employees = await Employee.find({ status: 'Active' })
      .select('name employeeId department division designation location dateOfBirth dateOfJoining');

    // Get wishes sent by this user in this year to check "already wished" status
    const myWishesThisYear = await CelebrationWish.find({
      senderEmployeeId: req.user.employeeId,
      wishDate: {
        $gte: new Date(parseInt(year), 0, 1),
        $lte: new Date(parseInt(year), 11, 31)
      }
    }).select('receiverEmployeeId');
    
    const wishedEmployeeIds = new Set(myWishesThisYear.map(w => w.receiverEmployeeId));

    const calendarEvents = [];

    employees.forEach(emp => {
      // Check Birthday
      if (emp.dateOfBirth) {
        const dob = new Date(emp.dateOfBirth);
        if (dob.getMonth() + 1 === m) {
          calendarEvents.push({
            employeeId: emp.employeeId,
            employeeName: emp.name,
            eventType: 'Birthday',
            eventDate: new Date(year, dob.getMonth(), dob.getDate()),
            department: emp.department,
            division: emp.division,
            location: emp.location,
            isWished: wishedEmployeeIds.has(emp.employeeId)
          });
        }
      }

      // Check Anniversary
      if (emp.dateOfJoining) {
        const doj = new Date(emp.dateOfJoining);
        if (doj.getMonth() + 1 === m) {
          calendarEvents.push({
            employeeId: emp.employeeId,
            employeeName: emp.name,
            eventType: 'Work Anniversary',
            eventDate: new Date(year, doj.getMonth(), doj.getDate()),
            department: emp.department,
            division: emp.division,
            location: emp.location,
            isWished: wishedEmployeeIds.has(emp.employeeId)
          });
        }
      }
    });

    res.json(calendarEvents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/celebrations/posts
 * @desc    Create a celebration post
 */
router.post('/posts', auth, async (req, res) => {
  try {
    const { eventTitle, eventType, description, eventDate, mediaUrl, mediaType } = req.body;
    
    // Find department of uploader
    const uploader = await Employee.findOne({ employeeId: req.user.employeeId });

    const newPost = new CelebrationPost({
      eventTitle,
      eventType,
      description,
      eventDate,
      uploadedBy: {
        employeeId: req.user.employeeId,
        name: req.user.name
      },
      department: uploader?.department || '',
      mediaUrl,
      mediaType
    });

    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route   GET /api/celebrations/posts
 * @desc    Get all celebration posts
 */
router.get('/posts', auth, async (req, res) => {
  try {
    const posts = await CelebrationPost.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/celebrations/posts/:id/like
 * @desc    Like/Unlike a post
 */
router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const post = await CelebrationPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const index = post.likes.indexOf(req.user.employeeId);
    if (index === -1) {
      post.likes.push(req.user.employeeId);
    } else {
      post.likes.splice(index, 1);
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route   POST /api/celebrations/posts/:id/comment
 * @desc    Comment on a post
 */
router.post('/posts/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await CelebrationPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({
      user: req.user.employeeId,
      userName: req.user.name,
      text
    });

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
