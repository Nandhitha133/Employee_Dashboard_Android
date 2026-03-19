// Service layer for Project operations
const Project = require('../models/Project');

class ProjectService {
    async getAllProjects() {
        try {
            const projects = await Project.find({}).lean();
            return { success: true, data: projects, count: projects.length };
        } catch (error) {
            console.error('ProjectService.getAllProjects Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getProjectById(id) {
        try {
            const project = await Project.findById(id).lean();
            if (project) {
                return { success: true, data: project, found: true };
            }
            return { success: true, data: null, found: false };
        } catch (error) {
            console.error('ProjectService.getProjectById Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getActiveProjects() {
        try {
            const projects = await Project.find({ status: 'active' }).lean();
            return { success: true, data: projects, count: projects.length };
        } catch (error) {
            console.error('ProjectService.getActiveProjects Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new ProjectService();
