// Service layer for Leave Application operations
const LeaveApplication = require('../models/LeaveApplication');

class LeaveApplicationService {
    async getAllLeaveApplications() {
        try {
            const leaves = await LeaveApplication.find({}).sort({ createdAt: -1 }).lean();
            return { success: true, data: leaves, count: leaves.length };
        } catch (error) {
            console.error('LeaveApplicationService.getAllLeaveApplications Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getLeaveApplicationById(id) {
        try {
            const leave = await LeaveApplication.findById(id).lean();
            if (leave) {
                return { success: true, data: leave, found: true };
            }
            return { success: true, data: null, found: false };
        } catch (error) {
            console.error('LeaveApplicationService.getLeaveApplicationById Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getLeavesByEmployee(employeeId) {
        try {
            const leaves = await LeaveApplication.find({ employeeId }).sort({ createdAt: -1 }).lean();
            return { success: true, data: leaves, count: leaves.length };
        } catch (error) {
            console.error('LeaveApplicationService.getLeavesByEmployee Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getPendingLeaves() {
        try {
            const leaves = await LeaveApplication.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
            return { success: true, data: leaves, count: leaves.length };
        } catch (error) {
            console.error('LeaveApplicationService.getPendingLeaves Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new LeaveApplicationService();
