import React, { useEffect, useState, useMemo } from 'react';
import { Calendar, Search, Edit, Trash2, Filter, Save, X } from 'lucide-react';
import { attendanceAPI, employeeAPI } from '../../services/api';
import useNotification from '../../hooks/useNotification';
import Notification from '../../components/Notifications/Notification';

const EditInAndOutTime = () => {
    const { notification, showSuccess, showError, hideNotification } = useNotification();
    const [records, setRecords] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Filters
    const [filters, setFilters] = useState({
        employeeId: '',
        date: new Date().toISOString().split('T')[0],
        search: ''
    });

    // Modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [formData, setFormData] = useState({
        punchTime: '',
        direction: 'in'
    });

    useEffect(() => {
        loadEmployees();
        loadAttendance();
    }, []);

    const loadEmployees = async () => {
        try {
            const res = await employeeAPI.getAllEmployees();
            setEmployees(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to load employees", error);
        }
    };

    const loadAttendance = async () => {
        setLoading(true);
        try {
            const params = {
                employeeId: filters.employeeId || undefined,
                startDate: filters.date,
                endDate: filters.date
            };
            const res = await attendanceAPI.getAll(params);
            setRecords(Array.isArray(res.data?.attendance) ? res.data.attendance : []);
            if (res.data?.attendance?.length === 0) {
                showError("No records found for the selected criteria");
            }
        } catch (error) {
            showError("Failed to load attendance records");
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = useMemo(() => {
        return records.filter(rec => {
            const searchStr = filters.search.toLowerCase();
            return (
                String(rec.employeeId || '').toLowerCase().includes(searchStr) ||
                String(rec.employeeName || '').toLowerCase().includes(searchStr) ||
                String(rec.name || '').toLowerCase().includes(searchStr)
            );
        });
    }, [records, filters.search]);

    const handleEditClick = (record) => {
        setEditingRecord(record);
        // Format date for datetime-local input
        const date = new Date(record.punchTime);
        const formattedDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .slice(0, 16);
            
        setFormData({
            punchTime: formattedDate,
            direction: record.direction
        });
        setShowEditModal(true);
    };

    const handleDeleteClick = async (id) => {
        if (!window.confirm("Are you sure you want to delete this attendance record?")) return;
        
        setActionLoading(true);
        try {
            await attendanceAPI.remove(id);
            showSuccess("Record deleted successfully");
            loadAttendance();
        } catch (error) {
            showError("Failed to delete record");
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!editingRecord) return;
        
        setActionLoading(true);
        try {
            await attendanceAPI.update(editingRecord._id, {
                punchTime: formData.punchTime,
                direction: formData.direction
            });
            showSuccess("Record updated successfully");
            setShowEditModal(false);
            loadAttendance();
        } catch (error) {
            showError("Failed to update record");
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Edit In and Out Time</h1>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-lg shadow-sm mb-6 border border-gray-100 flex flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                    <select 
                        value={filters.employeeId} 
                        onChange={(e) => setFilters(prev => ({ ...prev, employeeId: e.target.value }))}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-[#262760] outline-none"
                    >
                        <option value="">All Employees</option>
                        {employees.map(emp => (
                            <option key={emp.employeeId} value={emp.employeeId}>
                                {emp.employeeId} - {emp.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
                    <input 
                        type="date" 
                        value={filters.date}
                        onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                        className="border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-[#262760] outline-none"
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Search Records</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Filter by Name or ID..." 
                            value={filters.search}
                            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            className="pl-9 w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-1 focus:ring-[#262760] outline-none"
                        />
                    </div>
                </div>
                <button 
                    onClick={loadAttendance}
                    disabled={loading}
                    className="bg-[#262760] text-white px-5 py-2.5 rounded-md hover:bg-[#1a1b41] transition-colors flex items-center gap-2 text-sm font-medium"
                >
                    <Filter className="h-4 w-4" />
                    {loading ? 'Fetching...' : 'Fetch Records'}
                </button>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#262760] text-white">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Employee ID</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Name</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Punch Time</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Direction</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Source</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-6 h-6 border-2 border-[#262760] border-t-transparent rounded-full animate-spin"></div>
                                        <span>Loading data...</span>
                                    </div>
                                </td></tr>
                            ) : filteredRecords.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-10 text-center text-gray-500">
                                    {records.length > 0 ? 'No results match your search.' : 'No attendance records. Select filters and click "Fetch Records".'}
                                </td></tr>
                            ) : (
                                filteredRecords.map((rec) => (
                                    <tr key={rec._id} className="hover:bg-gray-50/80 transition-colors">
                                        <td className="px-6 py-4 font-medium text-[#262760]">{rec.employeeId}</td>
                                        <td className="px-6 py-4 font-medium text-gray-700">{rec.employeeName || rec.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{formatDate(rec.punchTime)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                rec.direction === 'in' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                            }`}>
                                                {rec.direction}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-xs">
                                            <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200 capitalize">
                                                {rec.source || 'local'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleEditClick(rec)}
                                                    className="text-blue-500 hover:text-blue-700 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Record"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(rec._id)}
                                                    className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Record"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-[#262760] p-4 text-white flex justify-between items-center">
                            <h2 className="text-lg font-bold">Edit Punch Record</h2>
                            <button onClick={() => setShowEditModal(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Employee Info</label>
                                <div className="p-2.5 bg-blue-50/50 rounded-lg text-sm text-[#262760] font-medium border border-blue-100">
                                    {editingRecord?.employeeId} - {editingRecord?.employeeName || editingRecord?.name}
                                </div>
                            </div>
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Punch Date & Time</label>
                                <input 
                                    type="datetime-local" 
                                    value={formData.punchTime}
                                    onChange={(e) => setFormData(prev => ({ ...prev, punchTime: e.target.value }))}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-[#262760]/20 focus:border-[#262760] outline-none transition-all"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Direction</label>
                                <div className="flex gap-4">
                                    {['in', 'out'].map(dir => (
                                        <label key={dir} className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                            formData.direction === dir 
                                            ? 'bg-[#262760] text-white border-[#262760]' 
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-[#262760]/30 hover:bg-gray-50'
                                        }`}>
                                            <input 
                                                type="radio" 
                                                value={dir} 
                                                checked={formData.direction === dir}
                                                onChange={(e) => setFormData(prev => ({ ...prev, direction: e.target.value }))}
                                                className="hidden"
                                            />
                                            <span className="text-sm font-bold capitalize">{dir}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button 
                                    onClick={() => setShowEditModal(false)}
                                    className="px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleUpdate}
                                    disabled={actionLoading}
                                    className="bg-[#262760] text-white px-6 py-2 text-sm font-bold rounded-lg hover:bg-[#1a1b41] transition-colors flex items-center gap-2 shadow-lg shadow-[#262760]/20 disabled:opacity-70"
                                >
                                    <Save className="h-4 w-4" />
                                    {actionLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Notification 
                message={notification.message} 
                type={notification.type} 
                isVisible={notification.isVisible} 
                onClose={hideNotification} 
            />
        </div>
    );
};

export default EditInAndOutTime;
