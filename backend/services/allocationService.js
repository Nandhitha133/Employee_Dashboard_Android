// Service layer for Allocation operations
const Allocation = require('../models/Allocation');

class AllocationService {
    async getAllAllocations() {
        try {
            const allocations = await Allocation.find({}).lean();
            return { success: true, data: allocations, count: allocations.length };
        } catch (error) {
            console.error('AllocationService.getAllAllocations Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getAllocationsByEmployee(employeeId) {
        try {
            const allocations = await Allocation.find({ employeeId }).lean();
            return { success: true, data: allocations, count: allocations.length };
        } catch (error) {
            console.error('AllocationService.getAllocationsByEmployee Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getAllocationsByProject(projectId) {
        try {
            const allocations = await Allocation.find({ projectId }).lean();
            return { success: true, data: allocations, count: allocations.length };
        } catch (error) {
            console.error('AllocationService.getAllocationsByProject Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new AllocationService();
