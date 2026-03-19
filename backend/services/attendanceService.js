// Service layer for Attendance operations
const Attendance = require('../models/Attendance');

class AttendanceService {
    async getAllAttendance() {
        try {
            const attendance = await Attendance.find({}).sort({ date: -1 }).lean();
            return { success: true, data: attendance, count: attendance.length };
        } catch (error) {
            console.error('AttendanceService.getAllAttendance Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getAttendanceByEmployee(employeeId) {
        try {
            const attendance = await Attendance.find({ employeeId }).sort({ date: -1 }).lean();
            return { success: true, data: attendance, count: attendance.length };
        } catch (error) {
            console.error('AttendanceService.getAttendanceByEmployee Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getAttendanceByDate(date) {
        try {
            const attendance = await Attendance.find({ date }).lean();
            return { success: true, data: attendance, count: attendance.length };
        } catch (error) {
            console.error('AttendanceService.getAttendanceByDate Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AttendanceService();
