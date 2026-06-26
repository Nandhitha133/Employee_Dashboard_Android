import React, { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';

const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [form, setForm] = useState({ title: '', message: '', isActive: true, startDate: '', endDate: '' });
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const data = await authAPI.announcement.getAll();
      setAnnouncements(data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (editingId) {
        await authAPI.announcement.update(editingId, form);
      } else {
        await authAPI.announcement.create(form);
      }
      
      setForm({ title: '', message: '', isActive: true, startDate: '', endDate: '' });
      setEditingId(null);
      fetchAnnouncements();
      alert(editingId ? 'Announcement updated!' : 'Announcement published!');
    } catch (error) {
      alert('Error saving announcement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (announcement) => {
    setForm({
      title: announcement.title,
      message: announcement.message,
      isActive: announcement.isActive,
      startDate: announcement.startDate ? new Date(announcement.startDate).toISOString().slice(0, 10) : '',
      endDate: announcement.endDate ? new Date(announcement.endDate).toISOString().slice(0, 10) : ''
    });
    setEditingId(announcement._id);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await authAPI.announcement.delete(id);
        fetchAnnouncements();
        alert('Announcement deleted!');
      } catch (error) {
        alert('Error deleting announcement');
      }
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      await authAPI.announcement.update(id, { isActive: !currentStatus });
      fetchAnnouncements();
    } catch (error) {
      alert('Error updating status');
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg w-full">

      

      {/* Form */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          {editingId ? 'Edit Announcement' : 'Create New Announcement'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                placeholder="Enter announcement title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                placeholder="Enter announcement message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                className="w-4 h-4 text-[#262760] rounded focus:ring-[#262760]"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                Active (visible on login page)
              </label>
            </div>
          </div>
          
          <div className="flex space-x-3 mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-[#262760] text-white px-6 py-2.5 rounded-lg font-medium hover:bg-[#1e2050] transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : editingId ? 'Update Announcement' : 'Publish Announcement'}
            </button>
            
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setForm({ title: '', message: '', isActive: true, startDate: '', endDate: '' });
                  setEditingId(null);
                }}
                className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-all duration-300"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Announcements */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Existing Announcements ({announcements.length})</h3>
        
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No announcements yet. Create your first one!
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div 
                key={announcement._id} 
                className={`p-4 rounded-lg border ${
                  announcement.isActive 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-medium text-gray-800">{announcement.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{announcement.message}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {announcement.startDate ? `From: ${new Date(announcement.startDate).toLocaleDateString()}` : 'From: —'}
                      {'  •  '}
                      {announcement.endDate ? `To: ${new Date(announcement.endDate).toLocaleDateString()}` : 'To: —'}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      announcement.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {(() => {
                        const now = new Date();
                        const expired = announcement.endDate ? new Date(announcement.endDate) < now : false;
                        if (expired) return 'Expired';
                        return announcement.isActive ? 'Active' : 'Inactive';
                      })()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(announcement.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    ID: {announcement._id.substring(0, 8)}...
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => toggleActive(announcement._id, announcement.isActive)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
                        announcement.isActive
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-[#262760] text-white hover:bg-[#1e2050]'
                      }`}
                    >
                      {announcement.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="px-3 py-1.5 text-xs bg-[#262760] text-white rounded-lg font-medium hover:bg-[#1e2050]"
                    >
                      Edit
                    </button>
                    
                    <button
                      onClick={() => handleDelete(announcement._id)}
                      className="px-3 py-1.5 text-xs bg-red-100 text-red-800 rounded-lg font-medium hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementManagement;