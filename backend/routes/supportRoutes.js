const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const auth = require('../middleware/auth');
const Ticket = require('../models/Ticket');
const Employee = require('../models/Employee');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'support-tickets');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safe = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safe}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Create a new ticket
router.post('/tickets', auth, upload.array('attachments', 5), async (req, res) => {
  try {
    const { category, priority, subject, description } = req.body;
    
    if (!category || !subject || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const attachments = req.files ? req.files.map(f => `/uploads/support-tickets/${f.filename}`) : [];

    const employeeId = req.user.employeeId || req.user._id;

    const newTicket = await Ticket.create({
      employeeId,
      category,
      priority: priority || 'Medium',
      subject,
      description,
      attachments,
      status: 'Open',
    });

    res.status(201).json({ success: true, data: newTicket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Get my tickets
router.get('/tickets/my', auth, async (req, res) => {
  try {
    const employeeId = req.user.employeeId || req.user._id;
    const tickets = await Ticket.find({ employeeId }).sort({ createdAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Get all tickets (for admins/hr)
router.get('/tickets/all', auth, async (req, res) => {
  try {
    const userRole = req.user.role || '';
    const allowedRoles = ['admin', 'hr', 'manager'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const tickets = await Ticket.find().sort({ createdAt: -1 }).lean();
    
    // Populate employee details manually
    const employeeIds = [...new Set(tickets.map(t => t.employeeId))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId name');
    const empMap = {};
    employees.forEach(emp => { empMap[emp.employeeId] = emp; });

    const enrichedTickets = tickets.map(t => ({
      ...t,
      employeeId: empMap[t.employeeId] || { name: t.employeeId, employeeId: t.employeeId }
    }));

    res.json({ success: true, data: enrichedTickets });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Get specific ticket by ID
router.get('/tickets/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).lean();
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const employee = await Employee.findOne({ employeeId: ticket.employeeId }).select('employeeId name');
    ticket.employeeId = employee || { name: ticket.employeeId, employeeId: ticket.employeeId };

    // Get commenter names
    const commenterIds = [...new Set(ticket.comments.map(c => c.commenterId))];
    const commenters = await Employee.find({ employeeId: { $in: commenterIds } }).select('employeeId name');
    const commenterMap = {};
    commenters.forEach(c => { commenterMap[c.employeeId] = c; });

    ticket.comments = ticket.comments.map(c => ({
      ...c,
      commenterName: commenterMap[c.commenterId] ? commenterMap[c.commenterId].name : c.commenterId
    }));

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Update ticket status
router.put('/tickets/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Open', 'Resolved', 'Closed', 'Reopened'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const userRole = req.user.role || '';
    const allowedRoles = ['admin', 'hr', 'manager'];
    
    // Only admins/HR/manager OR the ticket owner can update
    const employeeId = req.user.employeeId || req.user._id;
    if (!allowedRoles.includes(userRole) && ticket.employeeId !== employeeId) {
       return res.status(403).json({ success: false, message: 'Access denied' });
    }

    ticket.status = status;
    await ticket.save();

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Add a comment to a ticket
router.post('/tickets/:id/comments', auth, async (req, res) => {
  try {
    const { comment } = req.body;
    if (!comment) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const employeeId = req.user.employeeId || req.user._id;

    ticket.comments.push({
      commenterId: employeeId,
      comment
    });

    await ticket.save();

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

// Dashboard Stats
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const userRole = req.user.role || '';
    const allowedRoles = ['admin', 'hr', 'manager'];
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const total = await Ticket.countDocuments();
    const open = await Ticket.countDocuments({ status: 'Open' });
    const resolved = await Ticket.countDocuments({ status: 'Resolved' });
    const closed = await Ticket.countDocuments({ status: 'Closed' });
    const reopened = await Ticket.countDocuments({ status: 'Reopened' });
    const highPriority = await Ticket.countDocuments({ priority: { $in: ['High', 'Critical'] } });

    const recentTickets = await Ticket.find().sort({ createdAt: -1 }).limit(10).lean();
    
    const employeeIds = [...new Set(recentTickets.map(t => t.employeeId))];
    const employees = await Employee.find({ employeeId: { $in: employeeIds } }).select('employeeId name');
    const empMap = {};
    employees.forEach(emp => { empMap[emp.employeeId] = emp; });

    const recent = recentTickets.map(t => ({
      ...t,
      employeeId: empMap[t.employeeId] || { name: t.employeeId, employeeId: t.employeeId }
    }));

    res.json({
      success: true,
      data: {
        total,
        open,
        resolved,
        closed,
        reopened,
        highPriority,
        recent
      }
    });

  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
});

module.exports = router;
