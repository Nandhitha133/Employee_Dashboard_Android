// Service layer for Monthly Expenditure operations
const MonthlyExpenditure = require('../models/MonthlyExpenditure');

class MonthlyExpenditureService {
    async getAllExpenditures() {
        try {
            const expenditures = await MonthlyExpenditure.find({}).sort({ month: -1, year: -1 }).lean();
            return { success: true, data: expenditures, count: expenditures.length };
        } catch (error) {
            console.error('MonthlyExpenditureService.getAllExpenditures Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getExpenditureByMonth(month, year) {
        try {
            const expenditure = await MonthlyExpenditure.findOne({ month, year }).lean();
            if (expenditure) {
                return { success: true, data: expenditure, found: true };
            }
            return { success: true, data: null, found: false };
        } catch (error) {
            console.error('MonthlyExpenditureService.getExpenditureByMonth Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new MonthlyExpenditureService();
