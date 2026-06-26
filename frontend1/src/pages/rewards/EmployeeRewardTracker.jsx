import React, { useState, useEffect } from 'react';
import { BASE_URL } from '../../services/api';

// SVG Icons (keep your existing icon components)
const ViewIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
  </svg>
);

const ProfileIcon = () => (
  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
  </svg>
);

const EmployeeRewardTracker = () => {
  const [rewards, setRewards] = useState([]);
  const [filteredRewards, setFilteredRewards] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [filters, setFilters] = useState({
    month: '',
    year: '',
    employee: '',
    designation: '',
    division: '',
    nominatedBy: ''
  });

  const API_BASE_URL = BASE_URL || 'http://localhost:5003';

  // Predefined nominators
  const predefinedNominators = ['Arunkumar.P', 'Arunkumar.D', 'Harishankar', 'Gopinath'];

  // Helper function to get employee name
  const getEmployeeName = (employee) => {
    // Check if employee has first_name and last_name fields
    if (employee.first_name && employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    // Fallback to name field if available
    if (employee.name) return employee.name;
    // Fallback to email if nothing else
    if (employee.email) return employee.email;
    // Final fallback
    return 'Unknown Employee';
  };

  // Get token from session storage
  const getToken = () => {
    return sessionStorage.getItem('token');
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!getToken();
  };

  // Redirect to login if not authenticated
  const checkAuth = () => {
    if (!isAuthenticated()) {
      window.location.href = '/login';
      return false;
    }
    return true;
  };

  // Fetch employees and rewards data
  useEffect(() => {
    const fetchData = async () => {
      // Check authentication first
      if (!checkAuth()) return;

      try {
        setLoading(true);
        setError('');
        const token = getToken();
        
        if (!token) {
          window.location.href = '/login';
          return;
        }
        
        // Fetch employees
        const employeesResponse = await fetch(`${API_BASE_URL}/api/employees`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          // Handle different response structures
          const employeesList = employeesData.employees || employeesData;
          setEmployees(Array.isArray(employeesList) ? employeesList : []);
        } else {
          console.error('Failed to fetch employees');
          setEmployees([]);
        }
        
        // Fetch rewards
        const rewardsResponse = await fetch(`${API_BASE_URL}/api/rewards`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (rewardsResponse.ok) {
          const rewardsData = await rewardsResponse.json();
          // Handle different response structures
          const rewardsList = rewardsData.rewards || rewardsData;
          setRewards(Array.isArray(rewardsList) ? rewardsList : []);
          setFilteredRewards(Array.isArray(rewardsList) ? rewardsList : []);
        } else {
          console.error('Failed to fetch rewards');
          setRewards([]);
          setFilteredRewards([]);
          setError('Failed to load rewards data');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Network error: Please check your connection');
        setEmployees([]);
        setRewards([]);
        setFilteredRewards([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [API_BASE_URL]);

  useEffect(() => {
    filterRewards();
  }, [filters, rewards]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filterRewards = () => {
    let result = [...rewards];

    if (filters.month) {
      result = result.filter(reward => reward.month === filters.month);
    }

    if (filters.year) {
      result = result.filter(reward => reward.year === filters.year);
    }

    if (filters.employee) {
      result = result.filter(reward => reward.employeeName === filters.employee);
    }

    if (filters.designation) {
      result = result.filter(reward => reward.designation === filters.designation);
    }

    if (filters.division) {
      result = result.filter(reward => reward.division === filters.division);
    }

    if (filters.location) {
      result = result.filter(reward => {
        // Try to find location from employee details if not directly on reward
        const employee = employees.find(e => e.employeeId === reward.employeeId);
        const location = employee ? (employee.location || employee.branch) : '';
        return location === filters.location;
      });
    }

    if (filters.nominatedBy) {
      result = result.filter(reward => reward.nominatedBy === filters.nominatedBy);
    }

    setFilteredRewards(result);
  };

  const clearFilters = () => {
    setFilters({
      month: '',
      year: '',
      employee: '',
      designation: '',
      division: '',
      location: '',
      nominatedBy: ''
    });
  };

  const handleEmployeeChange = (e) => {
    const selectedEmployeeId = e.target.value;
    const selectedEmployee = employees.find(emp => emp.employeeId === selectedEmployeeId);
    
    if (selectedEmployee) {
      setEditingReward(prev => ({
        ...prev,
        employeeName: getEmployeeName(selectedEmployee),
        employeeId: selectedEmployee.employeeId,
        designation: selectedEmployee.designation,
        division: selectedEmployee.division || selectedEmployee.department
      }));
    } else {
      setEditingReward(prev => ({
        ...prev,
        employeeName: '',
        employeeId: '',
        designation: '',
        division: ''
      }));
    }

    setTouchedFields(prev => (prev.employeeId ? prev : { ...prev, employeeId: true }));
    setFormErrors(prev => {
      if (!prev.employeeId) return prev;
      const next = { ...prev };
      delete next.employeeId;
      return next;
    });
  };

  const validateReward = (reward) => {
    const nextErrors = {};
    if (!reward?.month) nextErrors.month = true;
    if (!reward?.year) nextErrors.year = true;
    if (!reward?.employeeId) nextErrors.employeeId = true;
    if (!reward?.nominatedBy) nextErrors.nominatedBy = true;
    if (!reward?.achievement || !reward.achievement.trim()) nextErrors.achievement = true;
    return nextErrors;
  };

  const isFieldInvalid = (fieldName) => {
    if (!formErrors[fieldName]) return false;
    return formSubmitted || touchedFields[fieldName];
  };

  const setRewardField = (fieldName, value) => {
    setEditingReward(prev => ({ ...prev, [fieldName]: value }));
    setFormErrors(prev => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setFormSubmitted(false);
    setFormErrors({});
    setTouchedFields({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check authentication before submitting
    if (!checkAuth()) return;

    setFormSubmitted(true);
    const nextErrors = validateReward(editingReward);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    
    try {
      const token = getToken();
      const url = editingReward._id ? 
        `${API_BASE_URL}/api/rewards/${editingReward._id}` : 
        `${API_BASE_URL}/api/rewards`;
      
      const method = editingReward._id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingReward)
      });
      
      if (response.ok) {
        const result = await response.json();
        setSuccess(editingReward._id ? 'Reward updated successfully' : 'Reward added successfully');
        
        // Refresh rewards list from server to ensure sync
        const rewardsResponse = await fetch(`${API_BASE_URL}/api/rewards`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (rewardsResponse.ok) {
          const rewardsData = await rewardsResponse.json();
          const rewardsList = rewardsData.rewards || rewardsData;
          setRewards(Array.isArray(rewardsList) ? rewardsList : []);
          setFilteredRewards(Array.isArray(rewardsList) ? rewardsList : []);
        }

        setShowAddModal(false);
        setEditingReward(null);
        setFormSubmitted(false);
        setFormErrors({});
        setTouchedFields({});
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save reward');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      setError('Network error: Please try again');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEdit = (reward) => {
    if (!checkAuth()) return;
    setEditingReward(reward);
    setFormSubmitted(false);
    setFormErrors({});
    setTouchedFields({});
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!checkAuth()) return;
    
    // Fallback to _id if id is missing (MongoDB uses _id)
    const rewardId = id || (editingReward && editingReward._id);
    
    if (window.confirm('Are you sure you want to delete this reward?')) {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}/api/rewards/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          // Refresh rewards list from server
          const rewardsResponse = await fetch(`${API_BASE_URL}/api/rewards`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (rewardsResponse.ok) {
            const rewardsData = await rewardsResponse.json();
            const rewardsList = rewardsData.rewards || rewardsData;
            setRewards(Array.isArray(rewardsList) ? rewardsList : []);
            setFilteredRewards(Array.isArray(rewardsList) ? rewardsList : []);
          }

          setSuccess('Reward deleted successfully');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          setError('Failed to delete reward');
          setTimeout(() => setError(''), 3000);
        }
      } catch (error) {
        console.error('Error deleting reward:', error);
        setError('Network error: Please try again');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleView = (reward) => {
    setEditingReward(reward);
    setShowViewModal(true);
  };

  const handleAddNew = () => {
    if (!checkAuth()) return;
    
    const currentDate = new Date();
    setEditingReward({
      month: currentDate.toLocaleString('default', { month: 'long' }),
      year: currentDate.getFullYear().toString(),
      employeeName: '',
      employeeId: '',
      designation: '',
      division: '',
      nominatedBy: '',
      achievement: ''
    });
    setFormSubmitted(false);
    setFormErrors({});
    setTouchedFields({});
    setShowAddModal(true);
  };

  // Get unique values for filters
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => (currentYear - 2 + i).toString());
  
  // Get unique values from employees and rewards
  const designations = [...new Set([
    ...employees.map(emp => emp.designation).filter(Boolean),
    ...rewards.map(reward => reward.designation).filter(Boolean)
  ])].sort();
  
  const divisions = [...new Set([
    ...employees.map(emp => emp.division || emp.department).filter(Boolean),
    ...rewards.map(reward => reward.division).filter(Boolean)
  ])].sort();
  
  const locations = ['Chennai', 'Hosur'];
  
  // Use predefined nominators instead of extracting from rewards
  const nominators = predefinedNominators;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#262760]"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
            <span className="block sm:inline">{error}</span>
            <button onClick={() => setError('')} className="absolute top-0 right-0 p-3">×</button>
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
            <span className="block sm:inline">{success}</span>
            <button onClick={() => setSuccess('')} className="absolute top-0 right-0 p-3">×</button>
          </div>
        )}

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-800">Employee Reward & Recognition Tracker</h2>
            <div className="flex space-x-3">
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-[#262760] rounded-md text-[#262760] hover:bg-[#262760]/10 focus:outline-none focus:ring-2 focus:ring-[#262760] transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={handleAddNew}
                className="px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050] focus:outline-none focus:ring-2 focus:ring-[#262760] transition-colors"
              >
                Add Reward
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Month</label>
                <select
                  name="month"
                  value={filters.month}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#262760]"
                >
                  <option value="">All Months</option>
                  {months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Year</label>
                <select
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#262760]"
                >
                  <option value="">All Years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Employee</label>
                <select
                  name="employee"
                  value={filters.employee}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#262760]"
                >
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.employeeId} value={getEmployeeName(emp)}>
                      {getEmployeeName(emp)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
                <select
                  name="designation"
                  value={filters.designation}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#262760]"
                >
                  <option value="">All Designations</option>
                  {designations.map(des => (
                    <option key={des} value={des}>{des}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Division</label>
                <select
                  name="division"
                  value={filters.division}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#262760]"
                >
                  <option value="">All Divisions</option>
                  {divisions.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <select
                  name="location"
                  value={filters.location}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#262760]"
                >
                  <option value="">All Locations</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nominated By</label>
                <select
                  name="nominatedBy"
                  value={filters.nominatedBy}
                  onChange={handleFilterChange}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#262760]"
                >
                  <option value="">All Nominators</option>
                  {nominators.map(nom => (
                    <option key={nom} value={nom}>{nom}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Rewards Table */}
          <div className="overflow-x-auto max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 relative">
              {!showAddModal && (
                <thead className="bg-[#262760] sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Month/Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Designation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Division</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Nominated By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
              )}
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRewards.length > 0 ? (
                  filteredRewards.map((reward, index) => (
                    <tr key={reward._id || reward.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{reward.month} {reward.year}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{reward.employeeName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reward.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reward.designation}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reward.division}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{reward.nominatedBy}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleView(reward)}
                            className="text-indigo-600 hover:text-[#1e2050] p-1 rounded hover:bg-[#262760]/10"
                            title="View Details"
                          >
                            <ViewIcon />
                          </button>
                          <button
                            onClick={() => handleEdit(reward)}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                            title="Edit"
                          >
                            <EditIcon />
                          </button>
                          <button
                            onClick={() => handleDelete(reward._id || reward.id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            <DeleteIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
                      {rewards.length === 0 ? 'No rewards found. Add your first reward!' : 'No rewards found matching your filters.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingReward._id ? 'Edit Reward' : 'Add New Reward'}
              </h3>
              <button
                onClick={handleCloseAddModal}
                className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isFieldInvalid('month') ? 'text-red-600' : 'text-gray-700'}`}>
                    Month <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingReward.month}
                    onChange={(e) => setRewardField('month', e.target.value)}
                    onBlur={() => setTouchedFields(prev => (prev.month ? prev : { ...prev, month: true }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${isFieldInvalid('month') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#262760]'}`}
                  >
                    {months.map(month => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isFieldInvalid('year') ? 'text-red-600' : 'text-gray-700'}`}>
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingReward.year}
                    onChange={(e) => setRewardField('year', e.target.value)}
                    onBlur={() => setTouchedFields(prev => (prev.year ? prev : { ...prev, year: true }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${isFieldInvalid('year') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#262760]'}`}
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isFieldInvalid('employeeId') ? 'text-red-600' : 'text-gray-700'}`}>
                    Employee Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingReward.employeeId}
                    onChange={handleEmployeeChange}
                    onBlur={() => setTouchedFields(prev => (prev.employeeId ? prev : { ...prev, employeeId: true }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${isFieldInvalid('employeeId') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#262760]'}`}
                  >
                    <option value="">Select Employee</option>
                    {employees.map(emp => (
                      <option key={emp.employeeId} value={emp.employeeId}>
                        {getEmployeeName(emp)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    readOnly
                    value={editingReward.employeeId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#262760]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    readOnly
                    value={editingReward.designation}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#262760]"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <input
                    type="text"
                    readOnly
                    value={editingReward.division}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#262760]"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isFieldInvalid('nominatedBy') ? 'text-red-600' : 'text-gray-700'}`}>
                    Nominated By <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={editingReward.nominatedBy}
                    onChange={(e) => setRewardField('nominatedBy', e.target.value)}
                    onBlur={() => setTouchedFields(prev => (prev.nominatedBy ? prev : { ...prev, nominatedBy: true }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${isFieldInvalid('nominatedBy') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#262760]'}`}
                  >
                    <option value="">Select Nominator</option>
                    {nominators.map(nom => (
                      <option key={nom} value={nom}>{nom}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${isFieldInvalid('achievement') ? 'text-red-600' : 'text-gray-700'}`}>
                  Key Achievement / Justification <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={editingReward.achievement}
                  onChange={(e) => setRewardField('achievement', e.target.value)}
                  onBlur={() => setTouchedFields(prev => (prev.achievement ? prev : { ...prev, achievement: true }))}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${isFieldInvalid('achievement') ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#262760]'}`}
                  placeholder="Describe the achievement or justification for this reward..."
                ></textarea>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#262760]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050] focus:outline-none focus:ring-2 focus:ring-[#262760]"
                >
                  {editingReward._id ? 'Update Reward' : 'Add Reward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Reward Modal - Professional Template */}
      {showViewModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-2xl font-semibold text-gray-900">Reward Details</h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-2 inline-flex items-center"
              >
                <CloseIcon />
              </button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center mb-6">
                <div className="flex-shrink-0">
                  <ProfileIcon />
                </div>
                <div className="ml-4">
                  <h4 className="text-xl font-bold text-gray-900">{editingReward.employeeName}</h4>
                  <p className="text-sm text-gray-500">{editingReward.designation} • {editingReward.division}</p>
                  <p className="text-sm text-gray-500">Employee ID: {editingReward.employeeId}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-blue-800 mb-1">Recognition Period</h5>
                  <p className="text-lg font-semibold text-blue-900">{editingReward.month} {editingReward.year}</p>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h5 className="text-sm font-medium text-purple-800 mb-1">Nominated By</h5>
                  <p className="text-lg font-semibold text-purple-900">{editingReward.nominatedBy}</p>
                </div>
              </div>
              
              <div className="border-t border-b border-gray-200 py-4 mb-6">
                <h5 className="text-sm font-medium text-gray-700 mb-2">Key Achievement / Justification</h5>
                <p className="text-gray-800 italic">"{editingReward.achievement}"</p>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050] focus:outline-none focus:ring-2 focus:ring-[#262760] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeRewardTracker;
