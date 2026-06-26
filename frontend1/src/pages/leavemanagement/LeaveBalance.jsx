import React, { useEffect, useState } from 'react';
import { Search, Eye, Edit, Save, X, History, Download } from 'lucide-react';
import { leaveAPI, employeeAPI } from '../../services/api';
import * as XLSX from 'xlsx';

const LeaveBalance = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingMap, setPendingMap] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editBalances, setEditBalances] = useState({ casual: 0, sick: 0, privilege: 0 });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyLeaves, setHistoryLeaves] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [ledgerTransactions, setLedgerTransactions] = useState([]);
   const [showRunHistoryModal, setShowRunHistoryModal] = useState(false);
  const [allocationRuns, setAllocationRuns] = useState([]);
  const [runHistoryLoading, setRunHistoryLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [showRunDetailsModal, setShowRunDetailsModal] = useState(false);
  const [runDetailsSearch, setRunDetailsSearch] = useState('');
  const [allocationRunThisMonth, setAllocationRunThisMonth] = useState(false);
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const monthsBetween = (dateString) => {
    if (!dateString) return 0;
    const start = new Date(dateString);
    if (isNaN(start.getTime())) return 0;
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    const total = years * 12 + months;

    
    return Math.max(0, total);  
  };

  useEffect(() => {
    loadBalances();
    if (isAdmin) {
      checkAllocationStatus();
    }
  }, []);

  const checkAllocationStatus = async () => {
    try {
      const res = await leaveAPI.getAllocationHistory();
      const history = Array.isArray(res.data) ? res.data : [];
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      const hasRun = history.some(run => 
        run.targetMonth === currentMonth && 
        run.targetYear === currentYear && 
        run.status === 'Success'
      );
      setAllocationRunThisMonth(hasRun);
    } catch (err) {
      console.error("Failed to check allocation status", err);
    }
  };

  const loadBalances = async () => {
    setLoading(true);
    try {
      const res = await leaveAPI.getBalance();
      const list = Array.isArray(res.data) ? res.data : [];
      const mapped = list.map((e, idx) => ({
        id: e.employeeId || idx,
        name: e.name || '',
        empId: e.employeeId || '',
        department: e.division || '',
        position: e.position || '',
        designation: e.designation || e.position || '',
        hireDate: e.hireDate || '',
        monthsOfService: e.monthsOfService || 0,
        email: e.email || '',
        phone: e.mobileNo || '',
        location: e.location || '',
        basicSalary: e.basicSalary || 0,
        balances: e.balances
      }));
      setEmployees(mapped);
      try {
        const pend = await leaveAPI.list({ status: 'Pending' });
        const rows = Array.isArray(pend.data) ? pend.data : [];
        const agg = {};
        rows.forEach(r => {
          const id = String(r.employeeId || '').toLowerCase();
          if (!id) return;
          if (!agg[id]) agg[id] = { CL: 0, SL: 0, PL: 0 };
          const type = r.leaveType;
          const days = Number(r.totalDays || 0);
          
          // Use pre-calculated split if available, otherwise fallback to leaveType mapping
          if (r.clUsed !== undefined || r.slUsed !== undefined || r.plUsed !== undefined) {
            agg[id].CL += Number(r.clUsed || 0);
            agg[id].SL += Number(r.slUsed || 0);
            agg[id].PL += Number(r.plUsed || 0) + Number(r.negativePL || 0);
          } else {
            if (type === 'CL') agg[id].CL += days;
            else if (type === 'SL') agg[id].SL += days;
            else if (type === 'PL') agg[id].PL += days;
          }
        });
        setPendingMap(agg);
      } catch {
        setPendingMap({});
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch balances from API, falling back to local calculation", err);
      try {
        const res2 = await employeeAPI.getAllEmployees();
        const list2 = Array.isArray(res2.data) ? res2.data : [];
        const mapped2 = list2.map((e, idx) => {
          const doj = e.dateOfJoining || e.dateofjoin || e.hireDate || e.createdAt || '';
          const m = monthsBetween(doj);
          const item = {
            id: e._id || idx,
            name: e.name || e.employeename || '',
            empId: e.employeeId || e.empId || '',
            department: e.division || e.department || '',
            position: e.position || e.designation || e.role || '',
            designation: e.designation || e.position || e.role || '',
            hireDate: doj,
            monthsOfService: m,
            email: e.email || '',
            phone: e.mobileNo || e.contactNumber || '',
            location: e.location || e.branch || '',
            basicSalary: e.basicSalary || 0
          };
          return { ...item, balances: calculateLeaveBalances(item) };
        });
        setEmployees(mapped2);
        setPendingMap({});
        setLoading(false);
      } catch {
        setEmployees([]);
        setPendingMap({});
        setLoading(false);
      }
    }
  };


  // Calculate PL settlement amount
  const calculatePLSettlement = (employee, balance) => {
    const { basicSalary } = employee;
    const daysInMonth = 30; // Assuming 30 days in a month for calculation
    return ((basicSalary / daysInMonth) * balance).toFixed(2);
  };

  const filteredEmployees = employees.filter(emp => {
    if (!emp.balances) return false;
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         String(emp.empId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         String(emp.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter ? emp.location === locationFilter : true;
    return matchesSearch && matchesLocation;
  }).sort((a, b) => {
    // Sort by Employee ID ascending
    const idA = (a.empId || '').toString().toLowerCase();
    const idB = (b.empId || '').toString().toLowerCase();
    if (idA < idB) return -1;
    if (idA > idB) return 1;
    return 0;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle refresh
  const handleRefresh = () => {
    setSearchTerm('');
    setLocationFilter('');
    loadBalances();
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setEditBalances({
      casual: employee.balances?.casual?.balance || 0,
      sick: employee.balances?.sick?.balance || 0,
      privilege: employee.balances?.privilege?.balance || 0
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    try {
      await leaveAPI.saveBalance({
        employeeId: editingEmployee.empId || editingEmployee.id,
        balances: editBalances
      });
      alert('Leave balance updated successfully');
      setShowEditModal(false);
      handleRefresh();
    } catch (err) {
      console.error(err);
      alert('Failed to update leave balance');
    }
  };
  
  const handleSave = async (employee) => {
    try {
      const employeeId = employee.empId || employee.id;
      await leaveAPI.saveBalance({ employeeId });
      alert('Leave balance saved to database');
      handleRefresh();
    } catch (err) {
      alert('Failed to save leave balance');
    }
  };

  const handleSyncAll = async () => {
    if (!window.confirm('Are you sure you want to save all employee balances to the database?')) return;
    setLoading(true);
    try {
      const res = await leaveAPI.syncAllBalances();
      alert(res.data.message || 'Saved all balances successfully');
      loadBalances();
    } catch (err) {
      console.error(err);
      alert('Failed to save balances');
      setLoading(false);
    }
  };

  const handleRunMonthlyAllocation = async () => {
    const monthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    if (!window.confirm(`Are you sure you want to run the automatic leave allocation for ${monthYear}? This will expire unused leaves for trainees/probationers and credit new leaves according to policy.`)) return;
    
    setLoading(true);
    try {
      const res = await leaveAPI.runAllocation({});
      alert(`Success! Processed ${res.data.processedCount} employees.`);
      loadBalances();
      checkAllocationStatus();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to run allocation');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRunHistory = async () => {
    setShowRunHistoryModal(true);
    setRunHistoryLoading(true);
    try {
      const res = await leaveAPI.getAllocationHistory();
      setAllocationRuns(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setAllocationRuns([]);
    } finally {
      setRunHistoryLoading(false);
    }
  };

  const handleViewRunDetails = (run) => {
    setSelectedRun(run);
    setShowRunDetailsModal(true);
    setRunDetailsSearch('');
  };

  const handleDownloadExcel = () => {
    const data = filteredEmployees.map(emp => ({
      'Employee ID': emp.empId || emp.id,
      'Employee Name': emp.name,
      'Location': emp.location || 'N/A',
      'Casual Leave': getAvailableBalance(emp, 'CL'),
      'Sick Leave': getAvailableBalance(emp, 'SL'),
      'Privilege Leave': getAvailableBalance(emp, 'PL')
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leave Balances");
    
    // Adjust column widths
    const wscols = [
      {wch: 15}, // Employee ID
      {wch: 25}, // Employee Name
      {wch: 15}, // Location
      {wch: 15}, // Casual Leave
      {wch: 15}, // Sick Leave
      {wch: 15}  // Privilege Leave
    ];
    ws['!cols'] = wscols;

    XLSX.writeFile(wb, `Leave_Balance_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleViewHistory = async (employee) => {
    setSelectedEmployee(employee);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const leavesRes = await leaveAPI.list({ employeeId: employee.empId || employee.id });
      setHistoryLeaves(Array.isArray(leavesRes.data) ? leavesRes.data : []);
      setLedgerTransactions([]); // No longer using ledger
    } catch (err) {
      console.error(err);
      setHistoryLeaves([]);
      setLedgerTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  };
  
  const getAvailableBalance = (emp, type) => {
    const id = String(emp.empId || emp.id || '').toLowerCase();
    const pending = pendingMap[id] || { CL: 0, SL: 0, PL: 0 };
    const base =
      type === 'CL' ? (emp.balances.casual.balance || 0) :
      type === 'SL' ? (emp.balances.sick.balance || 0) :
      (emp.balances.privilege.balance || 0);
    const cut = type === 'CL' ? pending.CL : type === 'SL' ? pending.SL : pending.PL;
    const val = Number(base) - Number(cut);
    if (type === 'CL' || type === 'SL') return Math.max(0, val);
    return val;
  };

  return (
    <div className="space-y-4 p-6 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      {/* <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Leave Balance Management</h1>
          <p className="text-gray-600">View employee leave balances</p>
        </div>
      </div> */}

      {/* Search Box and Refresh Button */}
      <div className="flex items-center justify-between">
        {/* Search Box */}
        <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-white w-full max-w-md">
          <Search size={20} className="text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by employee name or ID..."
            className="outline-none w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white outline-none text-sm min-w-[150px]"
          >
            <option value="">All Locations</option>
            {[...new Set(employees.map(emp => emp.location).filter(Boolean))].map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <button
            onClick={handleDownloadExcel}
            className="flex items-center gap-2 px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors text-sm"
          >
            <Download size={16} /> Download Report
          </button>

         
          {/* Run Allocation Button (Admin Only) */}
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={handleRunMonthlyAllocation}
                disabled={allocationRunThisMonth}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors text-sm ${
                  allocationRunThisMonth ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                }`}
                title={allocationRunThisMonth ? "Already run for this month" : "Run Monthly Leave Allocation"}
              >
                <span>⚙</span> Run Allocation
              </button>
              <button
                onClick={handleViewRunHistory}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                title="View Allocation History"
              >
                <History size={16} /> Run History
              </button>
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors text-sm"
          >
            <span className="rotate-45">↻</span> Refresh
          </button>

        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-white flex-1 overflow-auto min-h-0">
        <table className="w-full relative">
          <thead className="bg-[#262760] sticky top-0 z-20">

            <tr>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-[#262760] z-20">Employee ID</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-[#262760] z-20">Employee Name</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-[#262760] z-20">Location</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-[#262760] z-20">Casual Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-[#262760] z-20">Sick Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-[#262760] z-20">Privilege Leave</th>
              <th className="p-4 text-left text-sm font-semibold text-white sticky top-0 bg-[#262760] z-20">Actions</th>

            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="p-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#262760]"></div>
                  </div>

                  <p className="mt-2 text-gray-600">Loading employee data...</p>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500">
                  No employees found. {searchTerm && 'Try a different search term.'}
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.id || employee.empId} className="border-t hover:bg-gray-50">
                  {/* Employee ID Column */}
                  <td className="p-4">
                    <div className="font-medium text-gray-800">{employee.empId}</div>
                    
                  </td>
                  
                  {/* Employee Name Column */}
                  <td className="p-4">
                    <div className="font-medium text-gray-800">{employee.name}</div>
                    {/* <div className="text-xs text-gray-500 mt-1">
                      {employee.monthsOfService} months service
                    </div> */}
                  </td>
                  
                  {/* Location Column */}
                  <td className="p-4">
                    <div className="text-gray-600">{employee.location || '-'}</div>
                  </td>
                  
                  {/* Casual Leave Column */}
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-800">{getAvailableBalance(employee, 'CL')}</span>
                        <span className="text-sm text-gray-500"></span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Sick Leave Column */}
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-800">{getAvailableBalance(employee, 'SL')}</span>
                        <span className="text-sm text-gray-500"></span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Privilege Leave Column */}
                  <td className="p-4">
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-gray-800">{getAvailableBalance(employee, 'PL')}</span>
                        <span className="text-sm text-gray-500"></span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Actions Column */}
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleViewHistory(employee)}
                        className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                        title="View Leave History"
                      >
                        <History size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(employee)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit Balance"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleSave(employee)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Save Balance"
                      >
                        <Save size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="text-sm text-gray-600 mt-4">
        <div className="flex flex-wrap gap-4">
          <span>Total Employees: {filteredEmployees.length}</span>
          <span>Active Trainees: {filteredEmployees.filter(emp => String(emp.designation || emp.position || '').toLowerCase() === 'trainee').length}</span>
          <span>Others: {filteredEmployees.filter(emp => String(emp.designation || emp.position || '').toLowerCase() !== 'trainee').length}</span>
        </div>
      </div>

      {/* Employee Details Modal - Simplified View */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedEmployee.name}</h2>
                  <p className="text-gray-600">{selectedEmployee.empId}</p>
                </div>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {/* Leave Balance Details */}
              <div className="mb-8">
                <h3 className="font-semibold text-gray-700 mb-4 text-lg">Leave Balance Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Casual Leave Card */}
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="font-semibold text-blue-700 mb-3">Casual Leave</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Allocated</span>
                        <span className="font-bold">{selectedEmployee.balances.casual.allocated} </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="font-bold text-red-600">{selectedEmployee.balances.casual.used} </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Balance</span>
                        <span className="font-bold text-xl text-green-600">{selectedEmployee.balances.casual.balance} </span>
                      </div>
                      <div className="flex justify-between text-xs text-orange-600">
                        <span>Expired (Current Period)</span>
                        <span>{selectedEmployee.balances.casual.expired || 0} </span>
                      </div>
                      <div className="flex justify-between text-xs text-blue-600">
                        <span>Carry Forward Balance</span>
                        <span>{selectedEmployee.balances.casual.carryForwardBalance || 0} </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sick Leave Card */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <h4 className="font-semibold text-green-700 mb-3">Sick Leave</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Allocated</span>
                        <span className="font-bold">{selectedEmployee.balances.sick.allocated} </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="font-bold text-red-600">{selectedEmployee.balances.sick.used} </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Balance</span>
                        <span className="font-bold text-xl text-green-600">{selectedEmployee.balances.sick.balance} </span>
                      </div>
                      <div className="flex justify-between text-xs text-orange-600">
                        <span>Expired (Current Period)</span>
                        <span>{selectedEmployee.balances.sick.expired || 0} </span>
                      </div>
                      <div className="flex justify-between text-xs text-blue-600">
                        <span>Carry Forward Balance</span>
                        <span>{selectedEmployee.balances.sick.carryForwardBalance || 0} </span>
                      </div>
                    </div>
                  </div>
                  {/* Privilege Leave Card */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="font-semibold text-purple-700 mb-3">Privilege Leave (PL)</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Allocated (Total)</span>
                        <span className="font-bold">{selectedEmployee.balances.privilege.allocated} </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Used</span>
                        <span className="font-bold text-red-600">{selectedEmployee.balances.privilege.used} </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">Remaining Balance</span>
                        <span className="font-bold text-xl text-green-600">{selectedEmployee.balances.privilege.balance} </span>
                      </div>
                      <div className="flex justify-between text-xs text-orange-600">
                        <span>Expired (Current Period)</span>
                        <span>{selectedEmployee.balances.privilege.expired || 0} </span>
                      </div>
                      <div className="flex justify-between text-xs text-blue-600">
                        <span>Carry Forward Balance</span>
                        <span>{selectedEmployee.balances.privilege.carryForwardBalance || 0} </span>
                      </div>
                      {selectedEmployee.balances.privilege.balance >= 7 && (
                        <div className="mt-3 p-2 bg-purple-100 rounded">
                          <div className="text-sm font-medium text-purple-800">PL Encashment Value</div>
                          <div className="text-lg font-bold text-purple-900">
                            ₹{calculatePLSettlement(selectedEmployee, selectedEmployee.balances.privilege.balance)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-700">Total Leave Summary</h4>
                    <p className="text-sm text-gray-600">Allocated: {(selectedEmployee.balances.casual.allocated + selectedEmployee.balances.sick.allocated + selectedEmployee.balances.privilege.allocated).toFixed(1)} </p>
                    <p className="text-sm text-gray-600">Used: {(selectedEmployee.balances.casual.used + selectedEmployee.balances.sick.used + selectedEmployee.balances.privilege.used)} </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedEmployee.balances.totalBalance} 
                    </div>
                    <div className="text-sm text-gray-600">Total Available Balance</div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* History Modal */}
      {showHistoryModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Leave History: {selectedEmployee.name}</h3>
              <button onClick={() => setShowHistoryModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {historyLoading ? (
                <div className="flex justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                historyLeaves.length === 0 ? (
                  <p className="text-center text-gray-500 p-8">No leave applications found.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-3 text-left font-medium text-gray-600">Type</th>
                        <th className="p-3 text-left font-medium text-gray-600">Start Date</th>
                        <th className="p-3 text-left font-medium text-gray-600">End Date</th>
                        <th className="p-3 text-left font-medium text-gray-600">Days</th>
                        <th className="p-3 text-left font-medium text-gray-600">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {historyLeaves.map((leave, idx) => (
                        <tr key={leave._id || idx} className="hover:bg-gray-50">
                          <td className="p-3 font-medium">
                            <span className={`px-2 py-1 rounded text-xs ${
                              leave.leaveType === 'CL' ? 'bg-blue-100 text-blue-800' :
                              leave.leaveType === 'SL' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {leave.leaveType}
                            </span>
                          </td>
                          <td className="p-3">{formatDate(leave.startDate)}</td>
                          <td className="p-3">{formatDate(leave.endDate)}</td>
                          <td className="p-3">{leave.totalDays}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              leave.status === 'Approved' ? 'bg-green-100 text-green-800' :
                              leave.status === 'Pending' ? 'bg-orange-100 text-orange-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {leave.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div> 
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Edit Leave Balance</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Employee: <span className="font-semibold">{editingEmployee.name}</span></p>
              <p className="text-xs text-gray-500">Note: Editing balance will adjust the allocation.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Casual Leave Balance</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full border rounded p-2"
                  value={editBalances.casual}
                  onChange={(e) => setEditBalances({ ...editBalances, casual: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sick Leave Balance</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full border rounded p-2"
                  value={editBalances.sick}
                  onChange={(e) => setEditBalances({ ...editBalances, sick: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Privilege Leave Balance</label>
                <input
                  type="number"
                  step="0.5"
                  className="w-full border rounded p-2"
                  value={editBalances.privilege}
                  onChange={(e) => setEditBalances({ ...editBalances, privilege: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-[#262760] text-white rounded hover:bg-[#1e2050] transition-colors"
              >
                Save Changes
              </button>

            </div>
          </div>
        </div>
      )}
      {/* Run History Modal */}
      {showRunHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Allocation Run History</h2>
              <button onClick={() => setShowRunHistoryModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {runHistoryLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#262760]"></div>
                </div>
              ) : allocationRuns.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No allocation run history found.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-medium text-gray-600">Run Date</th>
                      <th className="p-3 text-left font-medium text-gray-600">Target Month</th>
                      <th className="p-3 text-left font-medium text-gray-600">Processed</th>
                      <th className="p-3 text-left font-medium text-gray-600">Status</th>
                      <th className="p-3 text-left font-medium text-gray-600">Performed By</th>
                      <th className="p-3 text-left font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allocationRuns.map((run, idx) => (
                      <tr key={run._id || idx} className="hover:bg-gray-50">
                        <td className="p-3 text-gray-600">{formatDate(run.runDate)}</td>
                        <td className="p-3 font-medium">
                          {new Date(run.targetYear, run.targetMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="p-3 text-center">{run.processedCount || 0}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            run.status === 'Success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {run.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 text-xs">
                          {run.performedByName || run.performedBy}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleViewRunDetails(run)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-1"
                            title="View Details"
                          >
                            <Eye size={16} /> <span className="text-xs font-medium">View</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="p-6 border-t flex justify-end">
              <button
                onClick={() => setShowRunHistoryModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
       {/* Run Details Modal */}
      {showRunDetailsModal && selectedRun && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Allocation Details</h2>
                <p className="text-sm text-gray-600">
                  Run on {formatDate(selectedRun.runDate)} for {new Date(selectedRun.targetYear, selectedRun.targetMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setShowRunDetailsModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>

            <div className="p-4 border-b bg-white flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employee by name or ID..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  value={runDetailsSearch}
                  onChange={(e) => setRunDetailsSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 sticky top-0 z-10">
                  <tr>
                    <th className="p-3 text-left font-semibold text-gray-700">Employee</th>
                    <th className="p-3 text-center font-semibold text-gray-700">CL Credit</th>
                    <th className="p-3 text-center font-semibold text-gray-700">SL Credit</th>
                    <th className="p-3 text-center font-semibold text-gray-700">PL Credit</th>
                    <th className="p-3 text-center font-semibold text-gray-700">Type</th>
                    <th className="p-3 text-center font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(selectedRun.details || [])
                    .filter(d => 
                      d.employeeName.toLowerCase().includes(runDetailsSearch.toLowerCase()) ||
                      d.employeeId.toLowerCase().includes(runDetailsSearch.toLowerCase())
                    )
                    .map((detail, idx) => (
                    <tr key={idx} className="hover:bg-blue-50 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-gray-900">{detail.employeeName}</div>
                        <div className="text-xs text-gray-500">{detail.employeeId}</div>
                      </td>
                      <td className="p-3 text-center font-medium text-blue-600">
                        {detail.cl > 0 ? `+${detail.cl}` : '-'}
                      </td>
                      <td className="p-3 text-center font-medium text-red-600">
                        {detail.sl > 0 ? `+${detail.sl}` : '-'}
                      </td>
                      <td className="p-3 text-center font-medium text-purple-600">
                        {detail.pl > 0 ? `+${detail.pl}` : '-'}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${detail.isConfirmed ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>
                          {detail.isConfirmed ? 'CONFIRMED' : 'TRAINEE/PROB'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${detail.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                          {detail.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!selectedRun.details || selectedRun.details.length === 0) && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500 italic">
                        No individual details were recorded for this run.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowRunDetailsModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalance;