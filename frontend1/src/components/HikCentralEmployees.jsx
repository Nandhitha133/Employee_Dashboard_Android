import React, { useState, useEffect } from 'react';
import { hikCentralAPI, employeeAPI } from '../services/api';
import useNotification from '../hooks/useNotification';

const HikCentralEmployees = () => {
  const [hikEmployees, setHikEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    pageNo: 1,
    pageSize: 300,
    total: 0,
    totalPages: 1
  });

  const { showNotification } = useNotification();

  // Fetch HikCentral employees
  const fetchHikEmployees = async (pageNo = 1) => {
    setLoading(true);
    try {
      const params = {
        pageNo,
        pageSize: pagination.pageSize,
        ...(filters.department && { department: filters.department }),
        ...(filters.status && { status: filters.status })
      };

      const response = await hikCentralAPI.getHikEmployees(params);
      if (response.data.success) {
        setHikEmployees(response.data.employees);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      showNotification('Error fetching HikCentral employees: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Sync employees to local database
  const syncEmployees = async () => {
    setSyncing(true);
    try {
      const response = await hikCentralAPI.syncEmployees();
      if (response.data.success) {
        showNotification(
          `Sync completed: ${response.data.synced} new, ${response.data.updated} updated`,
          'success'
        );
        fetchHikEmployees();
      }
    } catch (error) {
      showNotification('Error syncing employees: ' + error.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  // View employee details
  const viewEmployeeDetails = async (employeeId) => {
    try {
      const response = await hikCentralAPI.getHikEmployeeById(employeeId);
      if (response.data.success) {
        setSelectedEmployee(response.data.employee);
        setShowModal(true);
      }
    } catch (error) {
      showNotification('Error fetching employee details: ' + error.message, 'error');
    }
  };

  // Add employee to local database
  const addToLocalDatabase = async (hikEmployee) => {
    try {
      const employeeData = {
        employeeId: hikEmployee.employeeId,
        name: hikEmployee.name,
        email: hikEmployee.email,
        phone: hikEmployee.phone,
        department: hikEmployee.department,
        position: hikEmployee.position,
        status: hikEmployee.status,
        gender: hikEmployee.gender,
        dateOfBirth: hikEmployee.dateOfBirth,
        hireDate: hikEmployee.hireDate
      };

      await employeeAPI.createEmployee(employeeData);
      showNotification('Employee added to local database successfully', 'success');
    } catch (error) {
      if (error.response?.status === 400) {
        showNotification('Employee already exists in local database', 'warning');
      } else {
        showNotification('Error adding employee: ' + error.message, 'error');
      }
    }
  };

  // Filter employees
  const filteredEmployees = hikEmployees.filter(emp => {
    const matchesSearch = emp.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         emp.employeeId.toLowerCase().includes(filters.search.toLowerCase());
    const matchesDepartment = !filters.department || emp.department === filters.department;
    const matchesStatus = !filters.status || emp.status === filters.status;
    
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  useEffect(() => {
    fetchHikEmployees();
  }, []);

  const departments = [...new Set(hikEmployees.map(emp => emp.department))].filter(Boolean);

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">HikCentral Employees</h2>
        <div className="flex gap-3">
          <button
            onClick={syncEmployees}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            {syncing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync All to Local
              </>
            )}
          </button>
          <button
            onClick={() => fetchHikEmployees()}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <input
          type="text"
          placeholder="Search employees..."
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={filters.department}
          onChange={(e) => setFilters({...filters, department: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Departments</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button
          onClick={() => fetchHikEmployees(1)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
        >
          Apply Filters
        </button>
      </div>

      {/* Employee Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading employees...</span>
                  </div>
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                  No employees found
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee) => (
                <tr key={employee.employeeId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {employee.employeeId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.department}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.position}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      employee.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => viewEmployeeDetails(employee.employeeId)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => addToLocalDatabase(employee)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Add to Local
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Employee Details Modal */}
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Employee Details</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee ID</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.employeeId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.phone || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Department</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.department}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Position</label>
                  <p className="text-sm text-gray-900">{selectedEmployee.position}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    selectedEmployee.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedEmployee.status}
                  </span>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    addToLocalDatabase(selectedEmployee);
                    setShowModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add to Local Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HikCentralEmployees;
