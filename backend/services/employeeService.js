// Service layer for Employee operations
const Employee = require('../models/Employee');

class EmployeeService {
    async getAllEmployees() {
        try {
            const employees = await Employee.find({}).lean();
            return { success: true, data: employees };
        } catch (error) {
            console.error('EmployeeService.getAllEmployees Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getEmployeeById(employeeId) {
        try {
            const employee = await Employee.findOne({
                employeeId: new RegExp(`^${employeeId}$`, 'i')
            }).lean();

            if (employee) {
                return { success: true, data: employee, found: true };
            } else {
                return { success: true, data: null, found: false };
            }
        } catch (error) {
            console.error('EmployeeService.getEmployeeById Error:', error);
            return { success: false, error: error.message };
        }
    }

    async searchEmployees(keyword) {
        try {
            const employees = await Employee.find({
                $or: [
                    { name: new RegExp(keyword, 'i') },
                    { department: new RegExp(keyword, 'i') },
                    { designation: new RegExp(keyword, 'i') }
                ]
            }).limit(10).lean();

            return { success: true, data: employees };
        } catch (error) {
            console.error('EmployeeService.searchEmployees Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmployeeService();
