const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const MonthlyExpenditure = require('../models/MonthlyExpenditure');
const auth = require('../middleware/auth');

async function processExpenditures(expenditures) {
  if (!Array.isArray(expenditures)) {
    return [];
  }

  const uploadDir = path.join(__dirname, '..', 'uploads', 'expenditures');
  await fs.promises.mkdir(uploadDir, { recursive: true });

  const processed = [];

  for (const exp of expenditures) {
    if (!exp) continue;

    let filePath = exp.filePath || '';
    let fileName = exp.fileName || '';
    let fileData = exp.fileData || '';

    if (!filePath && fileData && typeof fileData === 'string') {
      try {
        let base64String = fileData;
        if (base64String.startsWith('data:')) {
          const commaIndex = base64String.indexOf(',');
          if (commaIndex !== -1) {
            base64String = base64String.slice(commaIndex + 1);
          }
        }

        const buffer = Buffer.from(base64String, 'base64');
        const originalExt = fileName ? path.extname(fileName) : '';
        const ext = originalExt || '.bin';
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const fullPath = path.join(uploadDir, uniqueName);

        await fs.promises.writeFile(fullPath, buffer);
        filePath = `/uploads/expenditures/${uniqueName}`;
      } catch (err) {
        filePath = '';
      }
    }

    processed.push({
      type: exp.type,
      paymentMode: exp.paymentMode,
      amount: exp.amount,
      date: exp.date,
      documentType: exp.documentType || 'Not Applicable',
      fileName,
      filePath,
      fileData: '',
      remarks: exp.remarks || ''
    });
  }

  return processed;
}

// Health Check
router.get('/health-check', (req, res) => {
  res.json({ success: true, message: 'Expenditure API is running' });
});

// Save Monthly Record (Create new)
router.post('/save-monthly', auth, async (req, res) => {
  try {
    const { month, year, location, budgetAllocated, expenditures } = req.body;
    
    // Check if record already exists
    const existingRecord = await MonthlyExpenditure.findOne({ month, year, location });
    if (existingRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Record for this Month, Year and Location already exists. Please edit the existing record.' 
      });
    }

    const processedExpenditures = await processExpenditures(expenditures);

    const newRecord = new MonthlyExpenditure({
      month,
      year,
      location,
      budgetAllocated,
      expenditures: processedExpenditures,
      createdBy: req.user.id
    });

    await newRecord.save();
    res.status(201).json({ success: true, data: newRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Record
router.put('/update/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const processedExpenditures = await processExpenditures(updateData.expenditures);
    const finalUpdate = {
      ...updateData,
      expenditures: processedExpenditures
    };
    
    const updatedRecord = await MonthlyExpenditure.findByIdAndUpdate(
      id,
      finalUpdate,
      { new: true, runValidators: true }
    );

    if (!updatedRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.json({ success: true, data: updatedRecord });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Summary
router.get('/summary', auth, async (req, res) => {
  try {
    const { year, location } = req.query;
    const query = {};
    if (year) query.year = parseInt(year);
    if (location && location !== 'Select All') query.location = location;

    const records = await MonthlyExpenditure.find(query);
    
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Record By ID
router.get('/record/:id', auth, async (req, res) => {
  
  try {
    const record = await MonthlyExpenditure.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete Record
router.delete('/record/:id', auth, async (req, res) => {
  try {
    const deletedRecord = await MonthlyExpenditure.findByIdAndDelete(req.params.id);
    if (!deletedRecord) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
