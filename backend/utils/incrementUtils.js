const IncrementMatrix = require('../models/IncrementMatrix');
const IncrementConfig = require('../models/IncrementConfig');

/**
 * Calculates increment percentage based on matrix rules
 * @param {string} financialYear - e.g. "2025-2026"
 * @param {string} designation - e.g. "System Engineer"
 * @param {string} rating - e.g. "ES" or "Exceeds Expectations (ES)"
 * @returns {Promise<number>} - Calculated percentage (0 if not found)
 */
const calculateIncrement = async (financialYear, designation, rating) => {
  if (!financialYear || !designation || !rating) return 0;

  try {
    // 1. Normalize Financial Year
    // Try exact match first
    let matrixList = await IncrementMatrix.find({ financialYear }).sort({ id: 1 });

    // If no results, try normalizing YYYY-YY to YYYY-YYYY
    if (matrixList.length === 0 && financialYear.length === 7) { // e.g., 2025-26
        const parts = financialYear.split(/[-/]/);
        if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 2) {
             const normalizedYear = `${parts[0]}-20${parts[1]}`; // 2025-2026
             matrixList = await IncrementMatrix.find({ financialYear: normalizedYear }).sort({ id: 1 });
        }
    }
    
    // If still no results, try normalizing YYYY-YYYY to YYYY-YY (unlikely but safe)
    if (matrixList.length === 0 && financialYear.length === 9) { // e.g., 2025-2026
        const parts = financialYear.split(/[-/]/);
        if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
             const shortYear = `${parts[0]}-${parts[1].slice(2)}`; // 2025-26
             matrixList = await IncrementMatrix.find({ financialYear: shortYear }).sort({ id: 1 });
        }
    }

    let matchedCategory = null;
    
    // console.log(`[DEBUG] Matrix List Length: ${matrixList.length}`);
    
    // Find the category that contains the employee's designation
    for (const item of matrixList) {
       if (item.category) {
         const designations = item.category.split(',').map(d => d.trim().toLowerCase());
         // console.log(`[DEBUG] Checking category: "${item.category}" against "${designation}"`);
         if (designations.includes(designation.toLowerCase())) {
            matchedCategory = item;
            break;
         }
       }
    }
    
    if (!matchedCategory) return 0;
    
    // Find the matching rating entry
    const ratingEntry = matchedCategory.ratings.find(r => {
      // Exact match
      if (r.grade === rating) return true;
      
      // If DB has "Exceeds Expectations (ES)" and input is "ES"
      if (r.grade.includes(`(${rating})`)) return true;
      
      // If DB has "ES" and input is "Exceeds Expectations (ES)"
      if (rating.includes(`(${r.grade})`)) return true;
      
      return false;
    });
    
    if (!ratingEntry) return 0;
    
    // Determine active column from IncrementConfig
    let activeColumn = 'metTarget'; // Default
    try {
        const config = await IncrementConfig.findOne({ financialYear: matchedCategory.financialYear }); // Use the matched year
        // console.log(`[DEBUG] Config for ${matchedCategory.financialYear}:`, config ? config.enabledColumns : 'Not Found');
        
        if (config && config.enabledColumns) {
             // Priority: 1.5 > 1.25 > 1.1 > Met > Below
             // This priority is just for tie-breaking if multiple are enabled, 
             // but UI should enforce single selection ideally.
             if (config.enabledColumns.target1_5) activeColumn = 'target1_5';
             else if (config.enabledColumns.target1_25) activeColumn = 'target1_25';
             else if (config.enabledColumns.target1_1) activeColumn = 'target1_1';
             else if (config.enabledColumns.metTarget) activeColumn = 'metTarget';
             else if (config.enabledColumns.belowTarget) activeColumn = 'belowTarget';
             
             // console.log(`[DEBUG] Selected Active Column: ${activeColumn}`);
        }
    } catch (configErr) {
        console.warn('Could not fetch increment config, defaulting to metTarget:', configErr);
    }
    
    // Extract Percentage from active column
    const percentageStr = ratingEntry[activeColumn] || ratingEntry.metTarget || '0';
    const percentage = parseFloat(percentageStr.replace('%', '')) || 0;
    
    return percentage;
  } catch (error) {
    console.error('Error in calculateIncrement helper:', error);
    return 0;
  }
};

module.exports = { calculateIncrement };
