const express = require('express');
const router = express.Router();
const ExitFormality = require('../models/ExitFormality');
const Employee = require('../models/Employee');
const auth = require('../middleware/auth');
const PDFDocument = require('pdfkit');
const fs = require('fs');

router.get('/', auth, async (req, res) => {
  try {
    const { status, division, page = 1, limit = 20 } = req.query;
    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    } else {
      query.status = { $ne: 'draft' };
    }
    if (division && division !== 'all') query.division = division;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      ExitFormality.find(query)
        .populate('employeeId', 'employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExitFormality.countDocuments(query)
    ]);
    res.json({ success: true, data: items, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List pending exit requests
router.get('/pending', auth, async (req, res) => {
  try {
    const statuses = ['submitted', 'under_review', 'clearance_in_progress'];
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      ExitFormality.find({ status: { $in: statuses } })
        .populate('employeeId', 'employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExitFormality.countDocuments({ status: { $in: statuses } })
    ]);
    res.json({ success: true, data: items, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List completed exit requests
router.get('/completed', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      ExitFormality.find({ status: 'completed' })
        .populate('employeeId', 'employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExitFormality.countDocuments({ status: 'completed' })
    ]);
    res.json({ success: true, data: items, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// List drafts
router.get('/drafts', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [items, total] = await Promise.all([
      ExitFormality.find({ status: 'draft' })
        .populate('employeeId', 'employeeId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ExitFormality.countDocuments({ status: 'draft' })
    ]);
    res.json({ success: true, data: items, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router.get('/me', auth, async (req, res) => {
  try {
    const employeeData = await Employee.findOne({ employeeId: req.user.employeeId }) || await Employee.findOne({ email: req.user.email });
    if (!employeeData) return res.json({ success: true, data: [] });
    const items = await ExitFormality.find({ employeeId: employeeData._id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await ExitFormality.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    const query = {};
    if (req.user.employeeId) query.employeeId = req.user.employeeId;
    else if (req.user.email) query.email = req.user.email;
    else return res.status(400).json({ success: false, error: 'User does not have employeeId or email' });

    const employeeData = await Employee.findOne(query);
    if (!employeeData) {
      console.error(`Exit Form Create: Employee not found for user ${req.user.id} (empId: ${req.user.employeeId}, email: ${req.user.email})`);
      return res.status(404).json({ success: false, error: 'Employee profile not found. Please contact HR.' });
    }

    if (req.body.status !== 'draft') {
      if (!req.body.proposedLastWorkingDay) {
        return res.status(400).json({ success: false, error: 'Proposed Last Working Day is required' });
      }
      if (!req.body.reasonForLeaving) {
        return res.status(400).json({ success: false, error: 'Reason for Leaving is required' });
      }
    }

    const payload = {
      employeeId: employeeData._id,
      employeeName: employeeData.name,
      employeeEmail: employeeData.email,
      division: employeeData.division,
      position: employeeData.position,
      dateOfJoining: employeeData.dateOfJoining,
      proposedLastWorkingDay: req.body.proposedLastWorkingDay || undefined,
      reasonForLeaving: req.body.reasonForLeaving || undefined,
      reasonDetails: req.body.reasonDetails || '',
      feedback: req.body.feedback || '',
      suggestions: req.body.suggestions || '',
      assetsToReturn: req.body.assetsToReturn || [],
      clearanceDepartments: req.body.clearanceDepartments || [
        { department: 'it', status: 'pending', required: true },
        { department: 'hr', status: 'pending', required: true },
        { department: 'finance', status: 'pending', required: true },
        { department: 'admin', status: 'pending', required: false }
      ],
      status: 'draft',
      currentStage: 'initiation',
      initiatedBy: req.user.id
    };
    const item = await ExitFormality.create(payload);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error("Exit Form Create Error:", error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const item = await ExitFormality.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    
    // Merge updates
    Object.assign(item, req.body);

    // Validate if submitting (not draft)
    if (item.status !== 'draft') {
      if (!item.proposedLastWorkingDay) {
        return res.status(400).json({ success: false, error: 'Proposed Last Working Day is required' });
      }
      if (!item.reasonForLeaving) {
        return res.status(400).json({ success: false, error: 'Reason for Leaving is required' });
      }
    }

    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:id/submit', auth, async (req, res) => {
  try {
    const item = await ExitFormality.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    item.status = 'submitted';
    item.submittedDate = new Date();
    item.currentStage = 'hr_review';
    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get clearance status for an exit form
router.get('/:id/clearance', auth, async (req, res) => {
  try {
    const item = await ExitFormality.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: item.clearanceDepartments || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id/clearance/:department', auth, async (req, res) => {
  try {
    const { id, department } = req.params;
    const { status, remarks } = req.body;
    const item = await ExitFormality.findById(id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    const idx = item.clearanceDepartments.findIndex(c => c.department === department);
    if (idx === -1) return res.status(404).json({ success: false, error: 'Department clearance not found' });
    item.clearanceDepartments[idx].status = status;
    item.clearanceDepartments[idx].remarks = remarks;
    item.clearanceDepartments[idx].approvedBy = req.user.name;
    item.clearanceDepartments[idx].approvedDate = new Date();
    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Reject exit form
router.post('/:id/reject', auth, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized. Only HR or Admin can reject.' });
    }
    const item = await ExitFormality.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    item.status = 'rejected';
    item.currentStage = 'rejected';
    if (req.body.reason) item.rejectionReason = req.body.reason;
    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
router.post('/:id/manager-approve', auth, async (req, res) => {
  try {
    const item = await ExitFormality.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });

    // Check permissions
    if (!['projectmanager', 'teamlead', 'admin'].includes(req.user.role)) {
       return res.status(403).json({ success: false, error: 'Not authorized. Only Managers or Team Leads can perform this approval.' });
    }
    
    item.approvedByManager = req.user.id;
    
    // Move to next stage (e.g., clearance or hr_review)
    if (item.currentStage === 'hr_review' || item.currentStage === 'initiation') {
       item.currentStage = 'clearance_in_progress';
    }
    
    // Update status if it was submitted
    if (item.status === 'submitted') {
      item.status = 'under_review'; // or clearance_in_progress
    }

    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:id/approve', auth, async (req, res) => {
  try {
    // This is the FINAL approval by HR/Admin
    if (!['admin', 'hr'].includes(req.user.role)) {
       return res.status(403).json({ success: false, error: 'Not authorized. Only HR or Admin can perform final approval.' });
    }

    const item = await ExitFormality.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });

    // Check if clearances are done (optional enforcement)
    const pendingClearance = item.clearanceDepartments.find(c => c.required && c.status !== 'approved');
    if (pendingClearance) {
       // You might want to allow forcing completion, but usually warn
       // return res.status(400).json({ success: false, error: `Pending clearance from ${pendingClearance.department}` });
    }

    item.status = 'completed';
    item.currentStage = 'completed';
    item.completedDate = new Date();
    item.approvedByHR = req.user.id;
    
    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// HR Approve endpoint (alias to approve, explicit implementation)
router.post('/:id/hr-approve', auth, async (req, res) => {
  try {
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Not authorized. Only HR or Admin can perform final approval.' });
    }
    const item = await ExitFormality.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    const pendingClearance = item.clearanceDepartments.find(c => c.required && c.status !== 'approved');
    if (pendingClearance) {
      // Optional enforcement can be added here
    }
    item.status = 'completed';
    item.currentStage = 'completed';
    item.completedDate = new Date();
    item.approvedByHR = req.user.id;
    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});


router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const item = await ExitFormality.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    item.status = 'cancelled';
    item.currentStage = 'cancelled';
    await item.save();
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const item = await ExitFormality.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, error: 'Not found' });
    const isAdminOrHR = ['admin', 'hr'].includes(req.user.role);
    const isOwnerDraft = String(item.initiatedBy) === String(req.user._id) && item.status === 'draft';
    if (!isAdminOrHR && !isOwnerDraft) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this exit form' });
    }
    await ExitFormality.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Moved to top to avoid conflict with /:id
// router.get('/stats', ...) is now above.


// @route   POST api/exit/:id/relieving-letter
// @desc    Generate relieving letter PDF
// @access  Private (Admin/HR only)
router.post('/:id/relieving-letter', auth, async (req, res) => {
  try {
    // Check if user has admin/HR role
    if (!['admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const exitForm = await ExitFormality.findById(req.params.id)
      .populate('employeeId');
    
    if (!exitForm) {
      return res.status(404).json({ success: false, message: 'Exit form not found' });
    }

    // Check if exit is completed
    if (exitForm.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Exit must be completed to generate relieving letter' });
    }

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Relieving Letter - ${exitForm.employeeId.name}`,
        Author: 'HR System',
        Subject: 'Relieving Letter'
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Relieving_Letter_${exitForm.employeeId.employeeId}_${exitForm.employeeId.name.replace(/\s+/g, '_')}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content
    addRelievingLetterContent(doc, exitForm);

    doc.end();

  } catch (error) {
    console.error('Error generating relieving letter:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

function addRelievingLetterContent(doc, exitForm) {
  const { employeeId, employeeDetails } = exitForm;
  const employee = employeeId || employeeDetails;
  
  // Calculate years of service
  const joinDate = new Date(employee.dateOfJoining);
  const lwd = new Date(exitForm.proposedLastWorkingDay);
  const years = Math.floor((lwd - joinDate) / (365 * 24 * 60 * 60 * 1000));
  const months = Math.floor(((lwd - joinDate) % (365 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000));

  // Company details (should be from your config)
  const companyName = process.env.COMPANY_NAME || 'Your Company Name';
  const companyAddress = process.env.COMPANY_ADDRESS || 'Your Company Address';
  const hrManager = process.env.HR_MANAGER || 'HR Manager';

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text(companyName, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').text(companyAddress, { align: 'center' });
  doc.moveDown(1);
  doc.rect(50, doc.y, 500, 2).fill('#1e2050');
  doc.moveDown(2);

  // Date
  doc.fontSize(10).text(`Date: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, { align: 'right' });
  doc.moveDown(2);

  // Employee address
  doc.fontSize(12).text('To,');
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').text(employee.name);
  doc.fontSize(10).font('Helvetica').text(employee.address || 'Address not specified');
  doc.text(`Phone: ${employee.phone || 'Not specified'}`);
  doc.moveDown(2);

  // Subject
  doc.fontSize(12).font('Helvetica-Bold').text('Subject: Relieving from your employment', { underline: true });
  doc.moveDown(2);

  // Salutation
  doc.fontSize(12).text(`Dear ${employee.name},`);
  doc.moveDown(1);

  // Body
  const bodyText = `You worked at ${companyName} ("Company") from ${joinDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} to ${lwd.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} for ${years} years and ${months} months ("Term"). Pursuant to your cessation of employment with the Company from ${lwd.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}, your Employment Agreement stands terminated.

We would also like to take this opportunity to remind you that, notwithstanding the termination of your employment with the Company, certain of your obligations under your Employment Agreement will continue. These obligations include, but may not be limited to the following obligations --

1. All developments made and works created by you during the Term of your employment with the Company is the exclusive proprietary property of the Company, that any and all copyright(s) and other proprietary interest(s) therein shall belong to Company.

2. You shall not divulge the Confidential Information of the Company to any third party.

3. You shall not give any statement or send write-ups or post anything regarding the Company in any form of media.

We confirm that:
• Full and final settlement has been processed.
• All company assets have been returned.
• All exit formalities have been completed.

If you have any questions concerning the information contained in this letter, please contact the HR department.

We wish you all the best for your future endeavours!`;

  doc.fontSize(11).text(bodyText, {
    align: 'justify',
    lineGap: 5,
    paragraphGap: 8
  });

  doc.moveDown(4);

  // Signatures
  doc.fontSize(11).font('Helvetica-Bold').text('SIGNED AND DELIVERED BY:');
  doc.moveDown(1);
  doc.fontSize(11).text('Signed for and on behalf of the Company by:');
  doc.moveDown(3);

  // Company signature
  doc.rect(50, doc.y, 200, 1).fill('#000');
  doc.moveDown(1);
  doc.fontSize(11).font('Helvetica-Bold').text(hrManager);
  doc.fontSize(10).text('HR Manager');
  doc.text(companyName);

  doc.moveDown(4);

  // Employee signature
  doc.fontSize(11).text('Signed by the Employee while accepting the relieving letter:');
  doc.moveDown(3);
  doc.rect(50, doc.y, 200, 1).fill('#000');
  doc.moveDown(1);
  doc.fontSize(11).font('Helvetica-Bold').text(employee.name);
  doc.fontSize(10).text(`Employee ID: ${employee.employeeId}`);

  // Footer note
  doc.moveDown(6);
  doc.fontSize(9).fillColor('#666').text(`Reference: Exit/${employee.employeeId}/${new Date().getFullYear()}/${Math.random().toString(36).substr(2, 9).toUpperCase()}`, { align: 'center' });
  doc.text('This is a system-generated document and is valid without signature.', { align: 'center' });
}


module.exports = router;