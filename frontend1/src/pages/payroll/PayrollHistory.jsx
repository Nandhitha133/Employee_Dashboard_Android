import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, TrendingUp, FileText, FileSpreadsheet, Edit, Trash2, Save, X, AlertCircle, Filter } from 'lucide-react';
import api, { employeeAPI, payrollHistoryAPI } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const PayrollHistory = () => {
    const [history, setHistory]             = useState([]);
    const [snapshotData, setSnapshotData]   = useState(null);
    const [loading, setLoading]             = useState(false);
    const [employees, setEmployees]         = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedFy, setSelectedFy]       = useState('2025-26');
    const [searchTerm, setSearchTerm]       = useState('');
    const [editingId, setEditingId]         = useState(null);
    const [editFormData, setEditFormData]   = useState({});
    const [statusPopup, setStatusPopup]     = useState({ isOpen: false, status: 'success', message: '' });

    const [showFilters, setShowFilters]     = useState(false);
    const [locationFilter, setLocationFilter]   = useState('All');

    const user   = JSON.parse(sessionStorage.getItem('user') || '{}');
    const role   = (user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'hr' || role === 'director';

    useEffect(() => {
        if (isAdmin) fetchEmployees();
        else          setSelectedEmployee(user.employeeId);
    }, [isAdmin, user.employeeId]);

    useEffect(() => {
        if (['2024-25', '2025-26'].includes(selectedFy)) fetchHistory();
        else if (selectedEmployee)                        fetchHistory();
    }, [selectedEmployee, selectedFy]);

    const fetchEmployees = async () => {
        try {
            const res = await employeeAPI.getAllEmployees();
            const sortedEmployees = (res.data || []).sort((a, b) => {
                const idA = a.employeeId || '';
                const idB = b.employeeId || '';
                return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
            });
            setEmployees(sortedEmployees);
            if (sortedEmployees.length > 0) setSelectedEmployee(sortedEmployees[0].employeeId);
        } catch (error) {
            console.error('Failed to load employees', error);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            if (['2024-25', '2025-26'].includes(selectedFy)) {
                const response = await api.get(`/payroll/history/snapshot/${selectedFy}`);
                if (response.data.success) setSnapshotData(response.data.data);
                setLoading(false);
                return;
            } else {
                setSnapshotData(null);
            }
            const params = selectedFy ? { fy: selectedFy } : {};
            const response = await api.get(`/payroll/history/${selectedEmployee}`, { params });
            if (response.data.success) setHistory(response.data.data);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
        }
    };

    // ── Derive filter options from employees list (reliable field names) ──────
    const locationOptions = useMemo(() => {
        const fromEmployees = employees.map(e => e.location || e.branch || '').filter(Boolean);
        const fromSnapshot  = (snapshotData || []).map(r =>
            r.location || r.Location || r.branch || r.Branch || ''
        ).filter(Boolean);
        return [...new Set([...fromEmployees, ...fromSnapshot])].sort();
    }, [employees, snapshotData]);

    // ── Filtered data (search + division + location) ──────────────────────────
    const filteredData = useMemo(() => {
        if (!snapshotData) return [];
        const filtered = snapshotData.filter(item => {
            const matchSearch =
                item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());

            const itemLocation = item.location || item.Location || item.branch || item.Branch || '';
            const matchLocation = locationFilter === 'All' || itemLocation === locationFilter;

            return matchSearch && matchLocation;
        });

        // Sort by Employee ID order wise (natural sort)
        return [...filtered].sort((a, b) => {
            const idA = a.employeeId || '';
            const idB = b.employeeId || '';
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });
    }, [snapshotData, searchTerm, locationFilter]);

    const clearFilters = () => {
        setLocationFilter('All');
        setSearchTerm('');
    };

    const activeFilterCount = [locationFilter].filter(f => f !== 'All').length;

    // ── Exports ───────────────────────────────────────────────────────────────
    const exportToExcel = () => {
        if (filteredData.length === 0) return;
        const exportData = filteredData.map((row, idx) => ({
            'S.No': idx + 1,
            'Employee ID': row.employeeId,
            'Employee Name': row.employeeName,
            'Designation': row.designation,
            'Location': row.location || '-',
            'Basic+DA': row.basicDA || 0,
            'Net Salary': row.netSalary || 0,
            'Account No': row.accountNumber || '',
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook  = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_${selectedFy}`);
        XLSX.writeFile(workbook, `Payroll_History_${selectedFy}.xlsx`);
    };

    const exportToPDF = () => {
        if (filteredData.length === 0) return;
        const doc = new jsPDF('l', 'mm', 'a4');
        doc.setFontSize(14);
        doc.text(`Payroll History Report - FY ${selectedFy}`, 14, 15);
        if (locationFilter !== 'All') doc.setFontSize(9).text(`Location: ${locationFilter}`, 14, 22);

        const tableColumn = ['S.No', 'Employee ID', 'Employee Name', 'Designation', 'Location', 'Basic+DA', 'Net Salary', 'Account No'];
        const tableRows   = filteredData.map((row, idx) => [
            idx + 1,
            row.employeeId,
            row.employeeName,
            row.designation,
            row.location || '-',
            `₹${Number(row.basicDA || 0).toLocaleString('en-IN')}`,
            `₹${Number(row.netSalary || 0).toLocaleString('en-IN')}`,
            row.accountNumber || '-',
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'grid',
            styles: { fontSize: 7 },
            headStyles: { fillColor: [38, 39, 96] },
        });

        doc.save(`Payroll_History_${selectedFy}.pdf`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            const res = await payrollHistoryAPI.delete(id);
            if (res.data.success) {
                setStatusPopup({ isOpen: true, status: 'success', message: 'Record deleted successfully' });
                fetchHistory();
            }
        } catch (error) {
            setStatusPopup({ isOpen: true, status: 'error', message: error.response?.data?.message || 'Failed to delete' });
        }
    };

    const startEdit = (record) => {
        setEditingId(record._id);
        setEditFormData({
            salary: record.revisedCTC || record.salary || 0,
            financialYear: record.financialYear,
            effectiveFrom: record.effectiveFrom ? new Date(record.effectiveFrom).toISOString().split('T')[0] : '',
            effectiveTo: record.effectiveTo   ? new Date(record.effectiveTo).toISOString().split('T')[0]   : '',
            notes: record.notes || '',
        });
    };

    const handleUpdate = async (id) => {
        try {
            const res = await payrollHistoryAPI.update(id, editFormData);
            if (res.data.success) {
                setEditingId(null);
                setStatusPopup({ isOpen: true, status: 'success', message: 'Record updated successfully' });
                fetchHistory();
            }
        } catch (error) {
            setStatusPopup({ isOpen: true, status: 'error', message: error.response?.data?.message || 'Failed to update' });
        }
    };

    return (
        <>
        <div className="p-8 max-w-[98%] mx-auto font-sans">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-[#262760] flex items-center">
                    <TrendingUp className="mr-2 h-6 w-6" /> Payroll History
                </h1>

                <div className="flex gap-3 items-center flex-wrap">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search Employee..."
                            className="border border-gray-300 rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#262760] focus:border-transparent w-52"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filter toggle */}
                    <button
                        onClick={() => setShowFilters(prev => !prev)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                            showFilters
                                ? 'bg-[#262760] text-white border-[#262760]'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="ml-1 bg-orange-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                                {activeFilterCount}
                            </span>
                        )}
                    </button>

                    {/* Employee selector (non-snapshot FY) */}
                    {isAdmin && !['2024-25', '2025-26'].includes(selectedFy) && (
                        <select
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.employeeId} value={emp.employeeId}>
                                    {emp.name} ({emp.employeeId})
                                </option>
                            ))}
                        </select>
                    )}

                    {/* FY selector */}
                    <select
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                        value={selectedFy}
                        onChange={(e) => setSelectedFy(e.target.value)}
                    >
                        <option value="2024-25">2024-25</option>
                        <option value="2025-26">2025-26</option>
                    </select>

                    {/* Export buttons */}
                    <button
                        onClick={exportToExcel}
                        disabled={filteredData.length === 0}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                    >
                        <FileSpreadsheet className="w-4 h-4" /> Excel
                    </button>
                    <button
                        onClick={exportToPDF}
                        disabled={filteredData.length === 0}
                        className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                    >
                        <FileText className="w-4 h-4" /> PDF
                    </button>
                </div>
            </div>

            {/* ── Filter Panel ─────────────────────────────────────────────── */}
            {showFilters && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Filter Records</h3>
                        <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 font-medium">
                            Clear All
                        </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Location */}
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
                            <select
                                value={locationFilter}
                                onChange={(e) => setLocationFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                            >
                                <option value="All">All Locations</option>
                                {locationOptions.map(loc => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Active filter pills */}
                    {activeFilterCount > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                            {locationFilter !== 'All' && (
                                <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2.5 py-1 rounded-full font-medium">
                                    Location: {locationFilter}
                                    <button onClick={() => setLocationFilter('All')} className="hover:text-indigo-900">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Record count */}
            {snapshotData && (
                <p className="text-sm text-gray-500 mb-2">
                    Showing <span className="font-semibold text-[#262760]">{filteredData.length}</span> of {snapshotData.length} records
                </p>
            )}

            {/* ── Table ────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-gray-400">
                        <div className="inline-block w-6 h-6 border-2 border-[#262760] border-t-transparent rounded-full animate-spin mb-2" />
                        <p className="text-sm">Loading history...</p>
                    </div>
                ) : ['2024-25', '2025-26'].includes(selectedFy) && snapshotData ? (
                    filteredData.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-sm">
                            No records found matching the selected filters.
                        </div>
                    ) : (
                        <div className="overflow-auto max-h-[70vh]">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-[#262760] text-white sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider w-14">S.No</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Employee ID</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Employee Name</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Designation</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Basic+DA</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">Net Salary</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Account No</th>
                                        {isAdmin && <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredData.map((record, index) => (
                                        <tr key={record._id || index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400 text-center">{index + 1}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{record.employeeId}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{record.employeeName}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.designation}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                                                ₹{Number(record.basicDA || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                                                ₹{Number(record.netSalary || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{record.accountNumber || '-'}</td>
                                            {isAdmin && (
                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => handleDelete(record._id)}
                                                        className="text-red-500 hover:text-red-700 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                ) : history.length === 0 ? (
                    <div className="p-10 text-center text-gray-400 text-sm">No payroll history found.</div>
                ) : (
                    <div className="overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#262760] text-white">
                                <tr>
                                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider w-14">S.No</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Financial Year</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Previous CTC</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Revised CTC</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Increment %</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Perf. Pay</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                                    {isAdmin && <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {history.map((record, index) => (
                                    <tr key={record._id} className={record.status === 'REVOKED' ? 'bg-red-50 opacity-75' : 'hover:bg-gray-50'}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400 text-center">{index + 1}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {editingId === record._id ? (
                                                <input
                                                    className="border rounded px-2 py-1 w-24"
                                                    value={editFormData.financialYear}
                                                    onChange={(e) => setEditFormData({ ...editFormData, financialYear: e.target.value })}
                                                />
                                            ) : record.financialYear}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">₹{Number(record.previousCTC || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-[#262760]">
                                            {editingId === record._id ? (
                                                <input
                                                    type="number"
                                                    className="border rounded px-2 py-1 w-24"
                                                    value={editFormData.salary}
                                                    onChange={(e) => setEditFormData({ ...editFormData, salary: e.target.value })}
                                                />
                                            ) : `₹${Number(record.revisedCTC || 0).toLocaleString('en-IN')}`}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{record.incrementPercentage}%</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">+₹{Number(record.incrementAmount || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600">₹{Number(record.performancePay || 0).toLocaleString('en-IN')}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                record.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                                record.status === 'BASE'   ? 'bg-blue-100 text-blue-800'  :
                                                record.status === 'PAST'   ? 'bg-gray-100 text-gray-800'  :
                                                'bg-red-100 text-red-800'
                                            }`}>
                                                {record.status}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium space-x-3 text-center">
                                                {editingId === record._id ? (
                                                    <>
                                                        <button onClick={() => handleUpdate(record._id)} className="text-green-600 hover:text-green-900" title="Save"><Save className="h-4 w-4" /></button>
                                                        <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-900" title="Cancel"><X className="h-4 w-4" /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEdit(record)} className="text-indigo-600 hover:text-indigo-900" title="Edit"><Edit className="h-4 w-4" /></button>
                                                        <button onClick={() => handleDelete(record._id)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                                    </>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>

        {/* ── Status Toast ─────────────────────────────────────────────────── */}
        {statusPopup.isOpen && (
            <div className="fixed bottom-4 right-4 z-50">
                <div className={`${statusPopup.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3`}>
                    {statusPopup.status === 'success' ? <TrendingUp className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <span className="text-sm font-medium">{statusPopup.message}</span>
                    <button onClick={() => setStatusPopup({ ...statusPopup, isOpen: false })} className="hover:opacity-75">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        )}
        </>
    );
};

export default PayrollHistory;
