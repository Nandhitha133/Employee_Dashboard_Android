// Service layer for Announcement operations
const Announcement = require('../models/Announcement');

class AnnouncementService {
    async getAllAnnouncements(limit = null) {
        try {
            let query = Announcement.find({}).sort({ createdAt: -1 });
            if (limit) {
                query = query.limit(limit);
            }
            const announcements = await query.lean();
            return { success: true, data: announcements };
        } catch (error) {
            console.error('AnnouncementService.getAllAnnouncements Error:', error);
            return { success: false, error: error.message };
        }
    }

    async getRecentAnnouncements(count = 5) {
        return this.getAllAnnouncements(count);
    }
}

module.exports = new AnnouncementService();
