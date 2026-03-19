// Service layer for Loan operations
const Loan = require('../models/Loan');

class LoanService {
    async getAllLoans() {
        try {
            const loans = await Loan.find({}).sort({ createdAt: -1 }).lean();
            return { success: true, data: loans, count: loans.length };
        } catch (error) {
            console.error('LoanService.getAllLoans Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getLoansByEmployee(employeeId) {
        try {
            const loans = await Loan.find({ employeeId }).sort({ createdAt: -1 }).lean();
            return { success: true, data: loans, count: loans.length };
        } catch (error) {
            console.error('LoanService.getLoansByEmployee Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getPendingLoans() {
        try {
            const loans = await Loan.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
            return { success: true, data: loans, count: loans.length };
        } catch (error) {
            console.error('LoanService.getPendingLoans Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new LoanService();
