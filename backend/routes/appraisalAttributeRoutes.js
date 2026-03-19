const express = require('express');
const router = express.Router();
const AppraisalAttribute = require('../models/AppraisalAttribute');
const AppraisalAttributeMaster = require('../models/AppraisalAttributeMaster');
const auth = require('../middleware/auth');

// @desc    Get master attributes list
// @route   GET /api/performance/attributes/master
// @access  Private
router.get('/master', auth, async (req, res) => {
  try {
    let master = await AppraisalAttributeMaster.findOne();
    
    if (!master) {
      // Seed initial data if empty
      
      await master.save();
    }
    
    res.json(master);
  } catch (error) {
    console.error('Error fetching master attributes:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Add attribute to master list and all designations
// @route   POST /api/performance/attributes/master/add
// @access  Private (Admin/Manager)
router.post('/master/add', auth, async (req, res) => {
  const { section, key, label } = req.body;

  if (!section || !key || !label) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // 1. Add to Master List
    let master = await AppraisalAttributeMaster.findOne();
    if (!master) {
      master = new AppraisalAttributeMaster(); // Should use seed logic ideally, but empty is fine
    }

    // Check if exists
    const exists = master[section]?.some(item => item.key === key);
    if (!exists) {
      if (!master[section]) master[section] = [];
      master[section].push({ key, label });
      await master.save();
    }

    // 2. Add to all existing AppraisalAttribute documents (default false)
    // We set it to false so it appears unchecked but available
    const updateQuery = {};
    updateQuery[`sections.${section}.${key}`] = false;
    
    await AppraisalAttribute.updateMany({}, { $set: updateQuery });

    res.json({ success: true, message: 'Attribute added to master and designations', master });
  } catch (error) {
    console.error('Error adding master attribute:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Delete attribute from master list and all designations
// @route   DELETE /api/performance/attributes/master/:section/:key
// @access  Private (Admin/Manager)
router.delete('/master/:section/:key', auth, async (req, res) => {
  const { section, key } = req.params;

  if (!section || !key) {
    return res.status(400).json({ message: 'Missing required parameters' });
  }

  try {
    // 1. Remove from Master List
    const updateQueryMaster = {};
    updateQueryMaster[section] = { key: key };
    
    await AppraisalAttributeMaster.updateOne(
      {}, 
      { $pull: updateQueryMaster }
    );

    // 2. Remove from all existing AppraisalAttribute documents
    // The structure in AppraisalAttribute is sections.<section>.<key>
    const updateQueryAttribute = {};
    updateQueryAttribute[`sections.${section}.${key}`] = "";
    
    await AppraisalAttribute.updateMany({}, { $unset: updateQueryAttribute });

    res.json({ success: true, message: 'Attribute deleted from master and designations' });
  } catch (error) {
    console.error('Error deleting master attribute:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get all appraisal attributes
// @route   GET /api/performance/attributes
// @access  Private (Admin/Manager)
router.get('/', auth, async (req, res) => {
  try {
    const attributes = await AppraisalAttribute.find({});
    res.json(attributes);
  } catch (error) {
    console.error('Error fetching appraisal attributes:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Get appraisal attributes for a specific designation
// @route   GET /api/performance/attributes/:designation
// @access  Private
router.get('/:designation', auth, async (req, res) => {
  try {
    const designation = req.params.designation;
    // Case insensitive search might be needed, but exact match is safer for now if normalized
    const attribute = await AppraisalAttribute.findOne({ designation: designation });
    
    if (!attribute) {
      // Return default if not found
      return res.json({
        designation: designation,
        sections: {
          selfAppraisal: true,
          knowledgeSharing: true,
          knowledgeSubItems: {
            knowledgeSharing: true,
            leadership: true
          },
          processAdherence: true,
          processSubItems: {
            timesheet: true,
            reportStatus: true,
            meeting: true
          },
          technicalAssessment: true,
          technicalSubItems: {},
          growthAssessment: true
          ,
          growthSubItems: {
            learningNewTech: true,
            certifications: true
          }
        }
      });
    }
    
    res.json(attribute);
  } catch (error) {
    console.error('Error fetching appraisal attribute:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Create or update appraisal attributes
// @route   POST /api/performance/attributes
// @access  Private (Admin/Manager)
router.post('/', auth, async (req, res) => {
  const { designation, sections } = req.body;

  if (!designation) {
    return res.status(400).json({ message: 'Designation is required' });
  }

  try {
    let attribute = await AppraisalAttribute.findOne({ designation });

    if (attribute) {
      // Update existing
      attribute.sections = sections;
      await attribute.save();
    } else {
      // Create new
      attribute = new AppraisalAttribute({
        designation,
        sections
      });
      await attribute.save();
    }

    res.json(attribute);
  } catch (error) {
    console.error('Error saving appraisal attribute:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @desc    Bulk add/remove sub-items for all designations
// @route   POST /api/performance/attributes/bulk-subitem
// @access  Private (Admin/Manager)
router.post('/bulk-subitem', auth, async (req, res) => {
  const { action, section, key, value } = req.body;
  
  if (!action || !section || !key) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    if (action === 'add') {
      const updateQuery = {};
      // Ensure we set nested field correctly for Map type or Object
      // sections.knowledgeSubItems.key
      updateQuery[`sections.${section}.${key}`] = value !== undefined ? value : true;
      
      // Update all documents
      await AppraisalAttribute.updateMany({}, { $set: updateQuery });
    } else if (action === 'remove') {
      const updateQuery = {};
      updateQuery[`sections.${section}.${key}`] = "";
      
      await AppraisalAttribute.updateMany({}, { $unset: updateQuery });
    }
    
    res.json({ success: true, message: `Sub-item ${action}ed successfully for all designations` });
  } catch (error) {
    console.error('Error bulk updating attributes:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
