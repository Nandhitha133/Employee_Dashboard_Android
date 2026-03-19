// Add this to your existing exitRoutes.js file

const PDFDocument = require('pdfkit');
const fs = require('fs');

// @route   POST api/exit/:id/relieving-letter
// @desc    Generate relieving letter PDF
// @access  Private (Admin/HR only)
router.post('/:id/relieving-letter', auth, async (req, res) => {
  try {
    // Check if user has admin/HR role
    if (!req.user.isHR && !req.user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const exitForm = await ExitForm.findById(req.params.id)
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
  const companyName = process.env.COMPANY_NAME || 'Caldim Engineering Pvt Ltd';
  const companyAddress = process.env.COMPANY_ADDRESS || '';
  const hrManager = process.env.HR_MANAGER || 'Managing Director';

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