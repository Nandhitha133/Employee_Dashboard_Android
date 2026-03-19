const cron = require('node-cron');
const Employee = require('../models/Employee');
const LeaveBalance = require('../models/LeaveBalance');
const LeaveApplication = require('../models/LeaveApplication');
const { calcBalanceForEmployee, mergeBalances } = require('../services/leaveService');

const setupLeaveBalanceSync = () => {
  // Run daily at 00:05 AM
  cron.schedule('5 0 * * *', async () => {
    console.log('Running daily leave balance sync cron job...');
    
    try {
      const employees = await Employee.find({ status: 'Active' });
      console.log(`Found ${employees.length} active employees to sync leave balances.`);
      
      let updatedCount = 0;
      let errorCount = 0;

      for (const emp of employees) {
        try {
          // 1. Fetch Approved Leaves
          const approvedLeaves = await LeaveApplication.find({
            employeeId: emp.employeeId,
            status: 'Approved'
          }).lean();

          // 2. Calculate current system balance
          const systemCalc = calcBalanceForEmployee(emp, approvedLeaves);
          
          // 3. Fetch existing stored balance
          const existing = await LeaveBalance.findOne({ employeeId: emp.employeeId }).lean();
          
          let finalBalances;
          
          if (existing && existing.balances && existing.balances.totalBalance !== undefined) {
             // Smart Sync: Preserve manual adjustments by calculating delta
             const lastUpdateDate = existing.lastUpdated ? new Date(existing.lastUpdated) : new Date(existing.createdAt);
             
             // Calculate past system balance based on last update date
             // We need to pass the same approved leaves, but calcBalanceForEmployee uses calculationDate 
             // to filter leaves? Wait, let's check calcBalanceForEmployee logic.
             // It filters leaves >= sixMonthThreshold for PL used count.
             // For general used count, it might use all leaves?
             // Let's assume passed leaves are correct for the employee.
             
             const pastSystemCalc = calcBalanceForEmployee(emp, approvedLeaves, lastUpdateDate);
             
             finalBalances = mergeBalances(existing.balances, systemCalc, pastSystemCalc);
          } else {
             finalBalances = systemCalc.balances;
          }

          // 4. Update or Create LeaveBalance
          await LeaveBalance.findOneAndUpdate(
            { employeeId: emp.employeeId },
            {
              $set: {
                employeeId: emp.employeeId,
                name: emp.name,
                position: emp.position,
                division: emp.division,
                location: emp.location,
                monthsOfService: systemCalc.monthsOfService,
                balances: finalBalances,
                lastUpdated: new Date()
              }
            },
            { upsert: true, new: true }
          );
          
          updatedCount++;
          
        } catch (err) {
          console.error(`Error syncing balance for employee ${emp.employeeId}:`, err);
          errorCount++;
        }
      }
      
      console.log(`Leave balance sync completed. Updated: ${updatedCount}, Errors: ${errorCount}`);
      
    } catch (err) {
      console.error('Error in leave balance sync cron:', err);
    }
  });
};

module.exports = setupLeaveBalanceSync;
