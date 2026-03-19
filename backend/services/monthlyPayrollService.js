// Service layer for Monthly Payroll operations
const MonthlyPayroll = require('../models/MonthlyPayroll');

class MonthlyPayrollService {
    async getAllMonthlyPayrolls() {
        try {
            const payrolls = await MonthlyPayroll.find({}).sort({ month: -1, year: -1 }).lean();
            return { success: true, data: payrolls, count: payrolls.length };
        } catch (error) {
            console.error('MonthlyPayrollService.getAllMonthlyPayrolls Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getMonthlyPayrollByMonth(month, year) {
        try {
            const payroll = await MonthlyPayroll.findOne({ month, year }).lean();
            if (payroll) {
                return { success: true, data: payroll, found: true };
            }
            return { success: true, data: null, found: false };
        } catch (error) {
            console.error('MonthlyPayrollService.getMonthlyPayrollByMonth Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new MonthlyPayrollService();
