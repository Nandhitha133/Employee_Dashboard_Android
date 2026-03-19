// Service layer for Team operations
const Team = require('../models/Team');

class TeamService {
    async getAllTeams() {
        try {
            const teams = await Team.find({}).lean();
            return { success: true, data: teams, count: teams.length };
        } catch (error) {
            console.error('TeamService.getAllTeams Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getTeamById(id) {
        try {
            const team = await Team.findById(id).lean();
            if (team) {
                return { success: true, data: team, found: true };
            }
            return { success: true, data: null, found: false };
        } catch (error) {
            console.error('TeamService.getTeamById Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getTeamByName(name) {
        try {
            const team = await Team.findOne({ name: new RegExp(name, 'i') }).lean();
            if (team) {
                return { success: true, data: team, found: true };
            }
            return { success: true, data: null, found: false };
        } catch (error) {
            console.error('TeamService.getTeamByName Error:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new TeamService();
