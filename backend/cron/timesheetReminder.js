const cron = require('node-cron');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Timesheet = require('../models/Timesheet');
const { sendZohoMail } = require('../zohoMail.service');

const setupTimesheetReminder = () => {
  // Run every Monday at 12:01 PM
  // Cron expression: Minute Hour DayMonth Month DayWeek
  // 1 12 * * 1 = 12:01 on Monday
  cron.schedule('1 12 * * 1', async () => {
    console.log('Running timesheet reminder cron job...');
    
    try {
      // 1. Calculate dates for the previous week
      const today = new Date();
      // Ensure we are operating on "today" being Monday. 
      
      const lastMonday = new Date(today);
      lastMonday.setDate(today.getDate() - 7);
      lastMonday.setHours(0, 0, 0, 0); // Start of last week

      const lastSunday = new Date(today);
      lastSunday.setDate(today.getDate() - 1);
      lastSunday.setHours(23, 59, 59, 999); // End of last week
      
      // Formatting for email
      const formatDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const startDateStr = formatDate(lastMonday);
      const endDateStr = formatDate(lastSunday);

      // 2. Find active employees who are required to submit timesheets
      // Get all active employees first
      const activeEmployees = await Employee.find({ 
        status: 'Active' 
      }).select('employeeId name email');

      const activeEmployeeIds = activeEmployees.map(e => e.employeeId).filter(Boolean);

      // Find corresponding users
      // We assume users with roles 'employees', 'teamlead', 'manager', 'projectmanager' need to submit.
      // And they must be linked to an active employee.
      const targetUsers = await User.find({
        role: { $in: ['employees', 'teamlead', 'manager', 'projectmanager'] },
        employeeId: { $in: activeEmployeeIds }
      });

      console.log(`Found ${targetUsers.length} potential users to check for timesheet reminder.`);

      for (const user of targetUsers) {
        // 3. Check if timesheet exists and is submitted
        // We look for a timesheet that starts on lastMonday
        
        // We'll search for weekStartDate >= lastMonday (start of day) and weekStartDate < lastMonday (end of day)
        // Or simply weekStartDate roughly equals lastMonday.
        // Actually, let's use a range for the whole week to be sure we find *the* timesheet for that week.
        
        const timesheet = await Timesheet.findOne({
          userId: user._id,
          weekStartDate: {
            $gte: lastMonday,
            $lte: lastSunday
          }
        });

        const isSubmitted = timesheet && ['Submitted', 'Approved', 'Rejected'].includes(timesheet.status);

        if (!isSubmitted) {
          // 4. Send email
          const employeeName = user.name;
          const email = user.email;

          if (email) {
            console.log(`Sending reminder to ${email} (${employeeName})`);
            
            const subject = 'Timesheet Submission Reminder';
            
            const textContent = `Dear ${employeeName},

Our records show that you have not submitted your timesheet for the week of ${startDateStr} to ${endDateStr}.

Kindly log in to the portal and submit it as soon as possible.

Regards,
Admin Team`;

            const htmlContent = `
              <p>Dear ${employeeName},</p>
              <p>Our records show that you have not submitted your timesheet for the week of <strong>${startDateStr}</strong> to <strong>${endDateStr}</strong>.</p>
              <p>Kindly log in to the portal and submit it as soon as possible.</p>
              <br/>
              <p>Regards,<br/>Admin Team</p>
            `;

            try {
              await sendZohoMail({
                to: email,
                subject: subject,
                content: textContent,
                html: htmlContent 
              });
            } catch (err) {
              console.error(`Failed to send email to ${email}:`, err.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in timesheet reminder cron:', error);
    }
  });
};

module.exports = setupTimesheetReminder;
