// components/EmployeeManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  CakeIcon,
  BriefcaseIcon,
  BanknotesIcon,
  AcademicCapIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import EmployeeForm from '../components/Forms/EmployeeForm';
import Modal from '../components/Modals/Modal';
import Notification from '../components/Notifications/Notification';
import useNotification from '../hooks/useNotification';
import { employeeAPI } from '../services/api';

const DIVISION_DESIGNATION_MAP = {
  TEKLA: [
    'Detailer',
    'Modeler',
    'Jr.Engineer',
    'Sr.Engineer',
    'Team Lead',
    'Project Co-Ordinator'
  ],
  SDS: [
    'Project Manager',
    'Asst Project Manager',
    'Sr Project Manager',
    'System Engineer',
    'Trainee'
  ],
  'HR/Admin': [
    'Office Assistant',
    'Admin Manager',
    'IT Admin'
  ],
  'DAS(Software)': [
    'Software Developer',
    'System Engineer',
    'Trainee'
  ],
  Electrical: ['Sr.Engineer', 'Trainee'],
  Management: [
    'Managing Director (MD)',
    'General Manager (GM)',
    'Branch Manager'
  ]
};


const EmployeeManagement = () => {
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    designation: '',
    division: '',
    location: '',
    status: 'Active'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const { notification, showSuccess, showError, hideNotification } = useNotification();



  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, filters]);

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAllEmployees('all');
      // Sort employees by employeeId
      const sortedEmployees = response.data.sort((a, b) => {
        const idA = a.employeeId || '';
        const idB = b.employeeId || '';
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setEmployees(sortedEmployees);
      setFilteredEmployees(sortedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);

      setEmployees(mockEmployees);
      setFilteredEmployees(mockEmployees);
    } finally {
      setLoading(false);
    }
  };

  const filterEmployees = () => {
    let filtered = employees;

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.employeeId.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.designation) {
      filtered = filtered.filter(emp =>
        String(emp.designation || emp.role || emp.position || '') === filters.designation
      );
    }

    if (filters.division) {
      filtered = filtered.filter(emp =>
        emp.division === filters.division
      );
    }

    if (filters.location) {
      filtered = filtered.filter(emp =>
        String(emp.location || emp.branch || '') === filters.location
      );
    }
    if (filters.status) {
      filtered = filtered.filter(emp =>
        emp.status === filters.status
      );
    }

    setFilteredEmployees(filtered);
  };

  // const handleFilterChange = (key, value) => {
  //   setFilters(prev => ({
  //     ...prev,
  //     [key]: value
  //   }));
  // };
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'division' ? { designation: '' } : {})
    }));
  };


  const clearFilters = () => {
    setFilters({
      search: '',
      designation: '',
      division: '',
      location: '',
      status: ''
    });
  };

  // Check if any filter is applied
  const isFilterApplied = useMemo(() => {
    return Object.values(filters).some(value => value !== '');
  }, [filters]);

  const exportToCSV = () => {
    const headers = [
      'S.No', 'Employee ID', 'Full Name', 'Division', 'Designation',
      'Highest Qualification', 'Date of Birth', 'Original Date of Birth', 'Date of Joining', 'Experience', 'Contact', 'Status'
    ];

    const csvData = filteredEmployees.map((emp, index) => [
      index + 1,
      emp.employeeId,
      `"${emp.name}"`,
      emp.division,
      emp.designation || emp.role || emp.position || '',
      emp.highestQualification || emp.qualification || '',
      emp.dateOfBirth || emp.dob || '',
      emp.originalDateOfBirth || '',
      emp.dateOfJoining || emp.dateofjoin || '',
      emp.currentExperience || emp.experience || '',
      emp.mobileNo,
      emp.status
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Format date to DD/MM/YYYY for table
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  // Calculate years of service
  const calculateServiceYears = (dateOfJoining) => {
    if (!dateOfJoining) return '';
    const joinDate = new Date(dateOfJoining);
    if (isNaN(joinDate.getTime())) return '';

    const today = new Date();
    let months = (today.getFullYear() - joinDate.getFullYear()) * 12;
    months -= joinDate.getMonth();
    months += today.getMonth();

    if (months < 0) months = 0;

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    let result = '';
    if (years > 0) result += `${years} year${years > 1 ? 's' : ''}`;
    if (remainingMonths > 0) {
      if (result) result += ' ';
      result += `${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    }
    if (!result) result = 'Less than a month';

    return result;
  };



  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleView = (employee) => {
    setViewingEmployee(employee);
  };

  const handleDelete = (id) => {
    setEmployeeToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await employeeAPI.deleteEmployee(employeeToDelete);
      fetchEmployees();
      showSuccess('Employee deleted successfully');
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      showError('Error deleting employee. Please try again.');
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingEmployee) {
        await employeeAPI.updateEmployee(editingEmployee._id, formData);
        showSuccess('Employee updated successfully');
      } else {
        await employeeAPI.createEmployee(formData);
        showSuccess('Employee added successfully');
      }
      setShowModal(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      alert('Error saving employee. Please try again.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'Exited':
        return 'bg-red-100 text-red-800 border border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  // Dynamic filter options from employees
  const divisionOptions = useMemo(() => (
    Array.from(new Set(employees.map(e => e.division).filter(Boolean)))
  ), [employees]);


  // Designation options including MD and GM
  // const designationOptions = useMemo(() => {
  //   const designationsFromEmployees = Array.from(new Set(
  //     employees.map(e => (e.designation || e.role || e.position)).filter(Boolean)
  //   ));

  //   // Add MD and GM if not already present
  //   const allDesignations = [...designationsFromEmployees];
  //   console.log("allDesignations", allDesignations);
  //   if (!allDesignations.includes('Managing Director (MD)')) {
  //     allDesignations.push('Managing Director (MD)');
  //   }
  //   if (!allDesignations.includes('General Manager (GM)')) {
  //     allDesignations.push('General Manager (GM)');
  //   }

  //   // Sort alphabetically
  //   return allDesignations.sort((a, b) => a.localeCompare(b));
  // }, [employees]);

  const designationOptions = useMemo(() => {
    // If no division selected → show all designations
    if (!filters.division) {
      return Array.from(
        new Set(
          employees
            .map(e => e.designation || e.role || e.position)
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
    }

    // If division selected → show mapped designations only
    return (DIVISION_DESIGNATION_MAP[filters.division] || []).slice().sort(
      (a, b) => a.localeCompare(b)
    );
  }, [employees, filters.division]);


  const locationOptions = useMemo(() => (
    Array.from(new Set(employees.map(e => (e.location || e.branch)).filter(Boolean)))
  ), [employees]);

  // View Employee Modal Component (integrated) - Showing only Add Employee fields
  const renderViewEmployeeModal = () => {
    if (!viewingEmployee) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center rounded-t-2xl">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#262760] rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {viewingEmployee.name ? viewingEmployee.name.charAt(0).toUpperCase() : 'E'}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{viewingEmployee.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-lg font-medium text-gray-700">
                    {viewingEmployee.designation || viewingEmployee.role || viewingEmployee.position}
                  </span>
                  <span className="text-base font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                    {viewingEmployee.displayId}
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(viewingEmployee.status)}`}>
                    {viewingEmployee.status}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setViewingEmployee(null)}
              className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content - Showing only Add Employee fields */}
          <div className="p-6">
            {/* Personal Information Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <UserIcon className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">Personal Information</h3>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Employee ID</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.employeeId || '-'}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Employee Name</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.name || '-'}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Gender</div>
                      <div className="text-lg font-bold text-gray-900 capitalize">{viewingEmployee.gender || '-'}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Date of Birth</div>
                      <div className="text-lg font-bold text-gray-900">{formatDate(viewingEmployee.dateOfBirth || viewingEmployee.dob)}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Original Date of Birth</div>
                      <div className="text-lg font-bold text-gray-900">{formatDate(viewingEmployee.originalDateOfBirth)}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Qualification</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.qualification || viewingEmployee.highestQualification || '-'}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Blood Group</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.bloodGroup || '-'}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Marital Status</div>
                      <div className="text-lg font-bold text-gray-900 capitalize">{viewingEmployee.maritalStatus || '-'}</div>
                    </div>

                    {viewingEmployee.maritalStatus === 'married' && (
                      <>
                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Spouse Name</div>
                          <div className="text-lg font-bold text-gray-900">{viewingEmployee.spouseName || '-'}</div>
                        </div>

                        <div className="space-y-1">
                          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Spouse Contact</div>
                          <div className="text-lg font-bold text-gray-900">{viewingEmployee.spouseContact || '-'}</div>
                        </div>
                      </>
                    )}

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Nationality</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.nationality || '-'}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Guardian Name</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.guardianName || '-'}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Location</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.location || '-'}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">PAN Number</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.pan || '-'}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Aadhaar Number</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.aadhaar || '-'}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Passport Number</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.passportNumber || '-'}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">UAN Number</div>
                      <div className="text-lg font-bold text-gray-900">{viewingEmployee.uan || '-'}</div>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center gap-2 mb-4">
                    <HomeIcon className="h-5 w-5 text-blue-600" />
                    <h4 className="text-lg font-semibold text-gray-900">Address Information</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Permanent Address</div>
                      <div className="text-base font-medium text-gray-900 whitespace-pre-line">
                        {viewingEmployee.permanentAddress || '-'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Current Address</div>
                      <div className="text-base font-medium text-gray-900 whitespace-pre-line">
                        {viewingEmployee.currentAddress || '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <PhoneIcon className="h-6 w-6 text-green-600" />
                <h3 className="text-xl font-bold text-gray-900">Contact Information</h3>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Mobile Number</div>
                    <div className="text-lg font-bold text-gray-900">{viewingEmployee.contactNumber || viewingEmployee.mobileNo || '-'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Email Address</div>
                    <div className="text-lg font-bold text-gray-900 break-words">{viewingEmployee.email || '-'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Emergency Contact</div>
                    <div className="text-lg font-bold text-gray-900">{viewingEmployee.emergencyContact || viewingEmployee.emergencyMobile || '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <BriefcaseIcon className="h-6 w-6 text-indigo-600" />
                <h3 className="text-xl font-bold text-gray-900">Professional Information</h3>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Designation</div>
                    <div className="text-lg font-bold text-gray-900">{viewingEmployee.designation || viewingEmployee.role || viewingEmployee.position || '-'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Division</div>
                    <div className="text-lg font-bold text-gray-900">{viewingEmployee.division || '-'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Date of Joining</div>
                    <div className="text-lg font-bold text-gray-900">{formatDate(viewingEmployee.dateOfJoining || viewingEmployee.dateofjoin)}</div>
                  </div>



                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Previous Experience</div>
                    <div className="text-lg font-bold text-gray-900">{viewingEmployee.previousExperience || '-'}</div>
                  </div>
                </div>

                {viewingEmployee.status === 'Exited' && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <XMarkIcon className="h-5 w-5 text-red-600" />
                      <h4 className="text-lg font-semibold text-gray-900">Exit Information</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Exit Date</div>
                        <div className="text-lg font-bold text-gray-900">{formatDate(viewingEmployee.exitDate)}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Last Working Day</div>
                        <div className="text-lg font-bold text-gray-900">{formatDate(viewingEmployee.lastWorkingDay)}</div>
                      </div>
                      <div className="lg:col-span-3 space-y-1">
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Exit Reason</div>
                        <div className="text-base font-medium text-gray-900">{viewingEmployee.exitReason || '-'}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Previous Organizations */}
                {viewingEmployee.previousOrganizations && viewingEmployee.previousOrganizations.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <AcademicCapIcon className="h-5 w-5 text-indigo-600" />
                      <h4 className="text-lg font-semibold text-gray-900">Previous Organizations</h4>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr className="bg-indigo-100">
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Organization</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Designation</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Start Date</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">End Date</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {viewingEmployee.previousOrganizations.map((org, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm text-gray-900">{org.organization || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{org.designation || org.position || org.role || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(org.startDate)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(org.endDate) || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Information Section */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <BanknotesIcon className="h-6 w-6 text-amber-600" />
                <h3 className="text-xl font-bold text-gray-900">Bank Information</h3>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Bank Name</div>
                    <div className="text-lg font-bold text-gray-900">{viewingEmployee.bankName || '-'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Account Number</div>
                    <div className="text-lg font-bold text-gray-900">{viewingEmployee.bankAccount || '-'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Branch</div>
                    <div className="text-lg font-bold text-gray-900">{viewingEmployee.branch || '-'}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider">IFSC Code</div>
                    <div className="text-lg font-bold text-gray-900">{viewingEmployee.ifsc || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setViewingEmployee(null)}
                className="px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200 shadow-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewingEmployee(null);
                  handleEdit(viewingEmployee);
                }}
                className="px-6 py-3 text-sm font-medium text-white bg-[#262760] rounded-xl hover:bg-[#202150] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg"
              >
                Edit Employee
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="w-full mx-auto px-0">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Status Tabs */}
          <div className="px-4 border-b border-gray-200 bg-gray-50/50">
            <div className="flex space-x-8 overflow-x-auto no-scrollbar">
              {[
                { id: '', label: 'All Employees' },
                { id: 'Active', label: 'Active' },
                { id: 'Inactive', label: 'Inactive' },
                { id: 'Exited', label: 'Exited' }
              ].map((tab) => {
                const isActive = filters.status === tab.id;
                const count = employees.filter(e => tab.id === '' || e.status === tab.id).length;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleFilterChange('status', tab.id)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all duration-200 flex items-center gap-2
                      ${isActive 
                        ? 'border-[#262760] text-[#262760]' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    {tab.label}
                    <span className={`
                      px-2 py-0.5 rounded-full text-[11px] font-bold
                      ${isActive ? 'bg-[#262760] text-white' : 'bg-gray-200 text-gray-600'}
                    `}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Header with Actions - All buttons on right side */}
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200 bg-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {filters.status || 'All'} Employees
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage and monitor employee records and their status.
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Filter Button */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-3 py-2.5 border rounded-lg shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 ${showFilters || isFilterApplied
                    ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2" />
                  Filters
                  {isFilterApplied && (
                    <span className="ml-2 inline-flex items-center justify-center h-5 w-5 text-xs font-semibold rounded-full bg-blue-600 text-white">
                      !
                    </span>
                  )}
                </button>

                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                  Export
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-[#262760] hover:bg-[#202150] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Employee
                </button>
              </div>
            </div>
          </div>

          {/* Filters Panel (Collapsible) */}
          {showFilters && (
            <div className="px-4 py-4 border-b border-gray-200 bg-blue-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Filter Employees</h3>
                {isFilterApplied && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                  >
                    <XMarkIcon className="h-4 w-4 mr-1" />
                    Clear All Filters
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                    placeholder="Filter by employee id"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Division</label>
                  <select
                    value={filters.division}
                    onChange={(e) => handleFilterChange('division', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                  >
                    <option value="">All Divisions</option>
                    {divisionOptions.map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                  <select
                    value={filters.designation}
                    onChange={(e) => handleFilterChange('designation', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                  >
                    <option value="">All Designations</option>
                    {designationOptions.map(desig => (
                      <option key={desig} value={desig}>{desig}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                  >
                    <option value="">All Locations</option>
                    {locationOptions.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 px-3"
                  >
                    <option value="">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Exited">Exited</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-700">
              Showing <span className="font-semibold">{filteredEmployees.length}</span> employees
            </p>
          </div>

          {/* Desktop Table View with BLUE HEADER */}
          <div className="hidden lg:block border-t border-gray-200">
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="sticky top-0 z-10 bg-[#262760]">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        S.No
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Employee ID
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Employee Name
                      </th>

                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Division
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Designation
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Qualification
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Experience
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Contact
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider border-r border-blue-500/30">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEmployees.map((employee, index) => (
                      <tr
                        key={employee._id}
                        className="hover:bg-gray-50 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-100">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                          <span className="font-semibold text-blue-600">{employee.employeeId}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                          <div className="text-sm font-semibold text-gray-900">{employee.name}</div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            {employee.division}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                          {employee.designation || employee.role || employee.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                          {employee.highestQualification || employee.qualification || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                          {calculateServiceYears(employee.dateOfJoining || employee.dateofjoin) || employee.currentExperience || employee.experience || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-r border-gray-100">
                          <div className="font-medium">{employee.mobileNo}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(employee.status)}`}>
                            {employee.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleView(employee)}
                              className="inline-flex items-center p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(employee)}
                              className="inline-flex items-center p-2 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
                              title="Edit"
                            >
                              <PencilSquareIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(employee._id)}
                              className="inline-flex items-center p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden">
            {filteredEmployees.map((employee, index) => (
              <div key={employee._id} className="border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{employee.name}</h3>
                    <p className="text-sm text-blue-600 font-medium">{employee.employeeId}</p>
                    <p className="text-xs text-gray-500 mt-1">{employee.email}</p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleView(employee)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                      title="View"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(employee)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                      title="Edit"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(employee._id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-gray-500">Division</span>
                    <p className="font-medium text-gray-900">{employee.division}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Designation</span>
                    <p className="font-medium text-gray-900">{employee.designation || employee.role || employee.position}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Qualification</span>
                    <p className="font-medium text-gray-900">{employee.highestQualification || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Experience</span>
                    <p className="font-medium text-gray-900">{calculateServiceYears(employee.dateOfJoining || employee.dateofjoin) || employee.currentExperience || employee.experience || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Date of Joining</span>
                    <p className="font-medium text-gray-900">
                      {formatDate(employee.dateOfJoining || employee.dateofjoin)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Contact</span>
                    <p className="font-medium text-gray-900">{employee.mobileNo}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(employee.status)}`}>
                      {employee.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">S.No</span>
                    <p className="font-medium text-gray-900">{index + 1}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add/Edit Employee Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEmployee(null);
        }}
        title={editingEmployee ? 'Edit Employee' : 'Add New Employee'}
        size="xl"
      >
        <EmployeeForm
          employee={editingEmployee}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setShowModal(false);
            setEditingEmployee(null);
          }}
        />
      </Modal>

      {/* View Employee Modal - Showing only Add Employee fields */}
      {renderViewEmployeeModal()}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setEmployeeToDelete(null);
        }}
        title="Delete Employee"
        size="md"
      >
        <div className="p-6">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <TrashIcon className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <p className="text-center text-gray-700 text-lg mb-8">
            Are you sure you want to delete this employee? This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setEmployeeToDelete(null);
              }}
              className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-6 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors duration-200 shadow-lg shadow-red-200"
            >
              Delete Employee
            </button>
          </div>
        </div>
      </Modal>

      {/* Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
};

export default EmployeeManagement;
