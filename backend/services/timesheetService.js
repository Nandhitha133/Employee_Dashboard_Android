// Service layer for Timesheet operations
const Timesheet = require('../models/Timesheet');

class TimesheetService {
    async getAllTimesheets() {
        try {
            const timesheets = await Timesheet.find({}).lean();
            return { success: true, data: timesheets, count: timesheets.length };
        } catch (error) {
            console.error('TimesheetService.getAllTimesheets Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getTimesheetById(id) {
        try {
            const timesheet = await Timesheet.findById(id).lean();
            if (timesheet) {
                return { success: true, data: timesheet, found: true };
            }
            return { success: true, data: null, found: false };
        } catch (error) {
            console.error('TimesheetService.getTimesheetById Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getTimesheetsByEmployee(employeeId) {
        try {
            const timesheets = await Timesheet.find({ employeeId }).lean();
            return { success: true, data: timesheets, count: timesheets.length };
        } catch (error) {
            console.error('TimesheetService.getTimesheetsByEmployee Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new TimesheetService();
