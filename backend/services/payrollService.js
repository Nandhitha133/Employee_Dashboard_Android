// Service layer for Payroll operations  
const Payroll = require('../models/Payroll');

class PayrollService {
    async getAllPayrolls() {
        try {
            const payrolls = await Payroll.find({}).sort({ month: -1 }).lean();
            return { success: true, data: payrolls, count: payrolls.length };
        } catch (error) {
            console.error('PayrollService.getAllPayrolls Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getPayrollByEmployee(employeeId) {
        try {
            const payrolls = await Payroll.find({ employeeId }).sort({ month: -1 }).lean();
            return { success: true, data: payrolls, count: payrolls.length };
        } catch (error) {
            console.error('PayrollService.getPayrollByEmployee Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getPayrollByMonth(month, year) {
        try {
            const payrolls = await Payroll.find({ month, year }).lean();
            return { success: true, data: payrolls, count: payrolls.length };
        } catch (error) {
            console.error('PayrollService.getPayrollByMonth Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new PayrollService();
