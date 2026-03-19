// Service layer for Internship operations
const Internship = require('../models/Internship');

class InternshipService {
    async getAllInternships() {
        try {
            const internships = await Internship.find({}).sort({ createdAt: -1 }).lean();
            return { success: true, data: internships, count: internships.length };
        } catch (error) {
            console.error('InternshipService.getAllInternships Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getInternshipById(id) {
        try {
            const internship = await Internship.findById(id).lean();
            if (internship) {
                return { success: true, data: internship, found: true };
            }
            return { success: true, data: null, found: false };
        } catch (error) {
            console.error('InternshipService.getInternshipById Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getActiveInternships() {
        try {
            const internships = await Internship.find({ status: 'active' }).lean();
            return { success: true, data: internships, count: internships.length };
        } catch (error) {
            console.error('InternshipService.getActiveInternships Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new InternshipService();
