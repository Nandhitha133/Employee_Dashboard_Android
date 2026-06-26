import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  TrashIcon,
  UserCircleIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  PaperClipIcon,
  BuildingOfficeIcon,
  CheckIcon,
  XMarkIcon,
  DocumentTextIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { exitFormalityAPI, employeeAPI, monthlyPayrollAPI } from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Modal, message, Input } from 'antd';

import { getAbsoluteSignatureUrl } from '../utils/signatureUtils';


const ExitApproval = () => {
  const [loading, setLoading] = useState(true);
  const [exitForms, setExitForms] = useState([]);
  const [filteredForms, setFilteredForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showRelievingLetter, setShowRelievingLetter] = useState(false);
  const [letterData, setLetterData] = useState(null);
  const [showExperienceLetter, setShowExperienceLetter] = useState(false);
  const [experienceLetterData, setExperienceLetterData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [filters, setFilters] = useState({ 
    employeeName: '',
    employeeId: '',
    division: '',
    status: 'all',
    location: ''
  });
  const [employees, setEmployees] = useState([]);
  const [rejectModal, setRejectModal] = useState({ visible: false, formId: null, reason: '' });
  const [clearanceModal, setClearanceModal] = useState({ visible: false, formId: null, department: '', status: '', remarks: '' });
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEmployee, setHistoryEmployee] = useState(null);
  const [salaryHistory, setSalaryHistory] = useState([]);

  // Get current user role
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const userRole = user.role || '';
  const companyName = sessionStorage.getItem('companyName') || 'Caldim Engineering Private.Ltd';
  const companyAddress = sessionStorage.getItem('companyAddress') || 'Your Company Address';
  const hrManager = sessionStorage.getItem('hrManager') || "DIRECTOR";

  // Divisions list
  const divisions = ['Engineering', 'HR', 'Sales', 'Marketing', 'Finance', 'Operations'];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'clearance_in_progress', label: 'Clearance In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' }
  ];

  // Derive unique filter options from exitForms
  const uniqueEmployeeNames = React.useMemo(() => 
    [...new Set(exitForms.map(form => form.employeeName).filter(Boolean))].sort(),
  [exitForms]);

  const uniqueEmployeeIds = React.useMemo(() => 
    [...new Set(exitForms.map(form => form.employeeId?.employeeId).filter(Boolean))].sort(),
  [exitForms]);

  const uniqueDivisions = React.useMemo(() => 
    [...new Set(exitForms.map(form => form.department || form.division).filter(Boolean))].sort(),
  [exitForms]);

  const uniqueLocations = React.useMemo(() => {
    const locs = exitForms.map(form => {
      if (form.location) return form.location;
      const emp = employees.find(e => e.employeeId === form.employeeId?.employeeId);
      return emp?.location;
    }).filter(Boolean);
    
    // Normalize and unique
    const uniqueMap = new Map();
    locs.forEach(l => {
      if(l) uniqueMap.set(l.toLowerCase(), l);
    });
    return Array.from(uniqueMap.values()).sort();
  }, [exitForms, employees]);

  useEffect(() => {
    fetchExitForms();
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterForms();
  }, [exitForms, filters]);

  const fetchExitForms = async () => {
    setLoading(true);
    try {
      const res = await exitFormalityAPI.getAll();
      setExitForms(res.data.data || []);
    } catch (error) {
      console.error('Error fetching exit forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      setEmployees(res.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const formatLongDateWithSuffix = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return '-';
    const day = date.getDate();
    const j = day % 10;
    const k = day % 100;
    let suffix = 'th';
    if (j === 1 && k !== 11) suffix = 'st';
    else if (j === 2 && k !== 12) suffix = 'nd';
    else if (j === 3 && k !== 13) suffix = 'rd';
    const month = date.toLocaleString('en-GB', { month: 'long' });
    const year = date.getFullYear();
    return `${day}${suffix} ${month} ${year}`;
  };

  const formatSalaryMonth = (salaryMonth) => {
    if (!salaryMonth) return '-';
    const parts = String(salaryMonth).split('-');
    if (parts.length < 2) return salaryMonth;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    if (isNaN(year) || isNaN(month)) return salaryMonth;
    const date = new Date(year, month, 1);
    return date.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
  };

  const salarySummary = React.useMemo(() => {
    if (!salaryHistory || salaryHistory.length === 0) {
      return { totalMonths: 0, totalNet: 0, totalCtc: 0 };
    }
    const totalNet = salaryHistory.reduce((sum, r) => sum + (Number(r.netSalary) || 0), 0);
    const totalCtc = salaryHistory.reduce((sum, r) => sum + (Number(r.ctc) || 0), 0);
    return {
      totalMonths: salaryHistory.length,
      totalNet,
      totalCtc
    };
  }, [salaryHistory]);

  const filterForms = () => {
    let result = [...exitForms];
    
    if (filters.status !== 'all') {
      result = result.filter(form => form.status === filters.status);
    }

    if (filters.employeeName) {
      result = result.filter(form => form.employeeName === filters.employeeName);
    }

    if (filters.employeeId) {
      result = result.filter(form => (form.employeeId?.employeeId || '') === filters.employeeId);
    }

    if (filters.division) {
      result = result.filter(form => form.department === filters.division || form.division === filters.division);
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      result = result.filter(form => {
        const formLoc = (form.location || '').toLowerCase();
        if (formLoc) return formLoc === loc;
        const empCode = form.employeeId?.employeeId;
        const emp = employees.find(e => e.employeeId === empCode);
        const empLoc = (emp?.location || '').toLowerCase();
        return empLoc === loc;
      });
    }

    setFilteredForms(result);
  };

  const handleGenerateRelievingLetter = (form) => {
    if (form.status !== 'completed') {
      message.warning("Relieving letter can only be generated for completed exit requests.");
      return;
    }

    // Calculate years of service
    const joinDate = new Date(form.employeeDetails?.dateOfJoining || form.joinDate);
    const lwd = new Date(form.proposedLastWorkingDay);
    const years = Math.floor((lwd - joinDate) / (365 * 24 * 60 * 60 * 1000));
    const months = Math.floor(((lwd - joinDate) % (365 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000));

    const empId = form.employeeId?.employeeId;
    const emp = employees.find(e => e.employeeId === empId);
    const location = (form.location || emp?.location || '').toLowerCase().trim();
    
    let signatory = hrManager;
    const signatureImage = getAbsoluteSignatureUrl(location);
    
    if (location.includes('hosur')) {
      signatory = 'BALA';
    } else if (location.includes('chennai')) {
      signatory = 'UVARAJ';
    }



    const letterData = {
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      employeeName: form.employeeName,
      employeeAddress: form.employeeDetails?.address || 'Not specified',
      employeePhone: form.employeeDetails?.phone || 'Not specified',
      employeeId: form.employeeId?.employeeId || form.employeeDetails?.employeeId,
      designation: form.employeeDetails?.position || form.position,
      department: form.employeeDetails?.department || form.department,
      joinDate: joinDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      lastWorkingDate: lwd.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      yearsOfService: years,
      monthsOfService: months,
      companyName: companyName,
      companyAddress: companyAddress,
      hrManager: signatory,
      signatureImage: signatureImage,
      resignationDate: new Date(form.createdAt || form.resignationDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      finalSettlement: 'Full and final settlement has been processed.',
      assetsReturned: 'All company assets have been returned.',
      formalityCompleted: 'All exit formalities have been completed.'
    };

    setLetterData(letterData);
    setShowRelievingLetter(true);
  };

  const handleGenerateExperienceLetter = (form) => {
    if (form.status !== 'completed') {
      message.warning("Experience letter can only be generated for completed exit requests.");
      return;
    }

    const employeeId = form.employeeId?.employeeId;
    const empRecord = form.employeeDetails || employees.find(e => e.employeeId === employeeId);

    const joinDateRaw =
      empRecord?.dateOfJoining ||
      form.employeeDetails?.dateOfJoining ||
      form.joinDate;
    const lastWorkingRaw =
      form.proposedLastWorkingDay ||
      form.lastWorkingDay ||
      form.relievingDate;

    const joinDateObj = joinDateRaw ? new Date(joinDateRaw) : null;
    const lastWorkingObj = lastWorkingRaw ? new Date(lastWorkingRaw) : null;

    let experienceText = '';
    if (joinDateObj && lastWorkingObj && !isNaN(joinDateObj.getTime()) && !isNaN(lastWorkingObj.getTime())) {
      let years = lastWorkingObj.getFullYear() - joinDateObj.getFullYear();
      let months = lastWorkingObj.getMonth() - joinDateObj.getMonth();
      let days = lastWorkingObj.getDate() - joinDateObj.getDate();

      if (days < 0) {
        months -= 1;
      }
      if (months < 0) {
        years -= 1;
        months += 12;
      }

      const parts = [];
      if (years > 0) {
        parts.push(`${years} year${years > 1 ? 's' : ''}`);
      }
      if (months > 0) {
        parts.push(`${months} month${months > 1 ? 's' : ''}`);
      }
      if (parts.length === 0) {
        parts.push('less than one year');
      }
      experienceText = parts.join(' ');
    }

    const gender = (empRecord?.gender || '').toLowerCase();

    let prefix = '';
    let pronounSubject = 'their';
    let pronounPossessive = 'their';

    if (gender === 'male' || gender === 'm') {
      prefix = 'Mr. ';
      pronounSubject = 'his';
      pronounPossessive = 'his';
    } else if (gender === 'female' || gender === 'f') {
      prefix = 'Ms. ';
      pronounSubject = 'her';
      pronounPossessive = 'her';
    }

    const location = (form.location || empRecord?.location || '').toLowerCase().trim();
    
    let signatory = hrManager;
    const signatureImage = getAbsoluteSignatureUrl(location);

    if (location.includes('hosur')) {
      signatory = 'BALA';
    } else if (location.includes('chennai')) {
      signatory = 'UVARAJ';
    }

    const data = {
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      employeeName: form.employeeName,
      designation: form.employeeDetails?.position || form.position || '',
      joinDate: formatLongDateWithSuffix(joinDateRaw),
      lastWorkingDate: formatLongDateWithSuffix(lastWorkingRaw),
      prefix,
      pronounSubject,
      pronounPossessive,
      experienceText,
      companyName,
      hrManager: signatory,
      signatureImage: signatureImage
    };

    setExperienceLetterData(data);
    setShowExperienceLetter(true);
  };

  const downloadRelievingLetter = async () => {
    try {
      const element = document.getElementById('relieving-letter-template');
      if (!element) {
        message.error("Error generating letter. Please try again.");
        return;
      }
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let renderWidth = imgWidth;
      let renderHeight = imgHeight;

      if (imgHeight > pageHeight) {
        const ratio = pageHeight / imgHeight;
        renderWidth = imgWidth * ratio;
        renderHeight = imgHeight * ratio;
      }

      const x = (pageWidth - renderWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, 0, renderWidth, renderHeight);
      const filename = `Relieving_Letter_${letterData.employeeId}_${letterData.employeeName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF. Please try again.');
    }
  };

  const downloadExperienceLetter = async () => {
    try {
      const element = document.getElementById('experience-letter-template');
      if (!element) {
        message.error("Error generating letter. Please try again.");
        return;
      }
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let renderWidth = imgWidth;
      let renderHeight = imgHeight;

      if (imgHeight > pageHeight) {
        const ratio = pageHeight / imgHeight;
        renderWidth = imgWidth * ratio;
        renderHeight = imgHeight * ratio;
      }

      const x = (pageWidth - renderWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, 0, renderWidth, renderHeight);
      const filename = `Experience_Letter_${experienceLetterData.employeeName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Error generating PDF:', error);
      message.error('Failed to generate PDF. Please try again.');
    }
  };

  const handleManagerApprove = (formId) => {
    Modal.confirm({
      title: 'Manager Approval',
      content: 'Are you sure you want to approve this exit request?',
      okText: 'Approve',
      cancelText: 'Cancel',
      onOk: async () => {
        setActionLoading(true);
        try {
          await exitFormalityAPI.managerApprove(formId);
          message.success("Manager approval recorded.");
          fetchExitForms();
          setSelectedForm(null);
        } catch (error) {
          console.error("Manager approval failed:", error);
          message.error("Failed to approve: " + (error.response?.data?.error || error.message));
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleHRApprove = (formId) => {
    Modal.confirm({
      title: 'Final Approval',
      content: 'Confirm FINAL approval and completion of exit?',
      okText: 'Approve & Complete',
      okType: 'primary',
      cancelText: 'Cancel',
      onOk: async () => {
        setActionLoading(true);
        try {
          await exitFormalityAPI.approve(formId);
          message.success("Exit process completed successfully.");
          fetchExitForms();
          setSelectedForm(null);
        } catch (error) {
          console.error("HR approval failed:", error);
          message.error("Failed to complete: " + (error.response?.data?.error || error.message));
        } finally {
          setActionLoading(false);
        }
      }
    });
  };

  const handleDelete = (formId) => {
    Modal.confirm({
      title: 'Delete Exit Request',
      content: 'Are you sure you want to delete this exit request? This cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        setActionLoading(true);
        try {
          await exitFormalityAPI.remove(formId);
          message.success("Exit request deleted.");
          fetchExitForms();
          if (selectedForm?._id === formId) setSelectedForm(null);
        } catch (error) {
          console.error("Delete failed:", error);
          message.error("Failed to delete: " + (error.response?.data?.error || error.message));
        } finally {
          setActionLoading(false);
        }
      }
    });
  };
  const handleReject = (formId) => {
    setRejectModal({ visible: true, formId, reason: '' });
  };

  const submitRejection = async () => {
    if (!rejectModal.reason) {
      message.error("Please enter a reason for rejection");
      return;
    }
    
    setActionLoading(true);
    try {
      await exitFormalityAPI.reject(rejectModal.formId, rejectModal.reason);
      message.success("Exit request rejected/cancelled.");
      fetchExitForms();
      setSelectedForm(null);
      setRejectModal({ visible: false, formId: null, reason: '' });
    } catch (error) {
      console.error("Rejection failed:", error);
      message.error("Failed to reject: " + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearanceUpdate = (formId, department, status) => {
    setClearanceModal({ visible: true, formId, department, status, remarks: '' });
  };

  const submitClearanceUpdate = async () => {
    setActionLoading(true);
    try {
      await exitFormalityAPI.updateClearance(clearanceModal.formId, clearanceModal.department, clearanceModal.status, clearanceModal.remarks);
      const updatedForm = await exitFormalityAPI.getExitById(clearanceModal.formId);
      setSelectedForm(updatedForm.data.data);
      fetchExitForms();
      setClearanceModal({ visible: false, formId: null, department: '', status: '', remarks: '' });
      message.success(`Clearance updated for ${clearanceModal.department}`);
    } catch (error) {
      console.error("Clearance update failed:", error);
      message.error("Failed to update clearance");
    } finally {
      setActionLoading(false);
    }
  };

  const getClearanceStatusClass = (status) => {
    const value = (status || '').toLowerCase();
    if (value === 'pending') return 'bg-red-100 text-red-700';
    if (value === 'completed' || value === 'cleared' || value === 'approved') return 'bg-green-100 text-green-700';
    if (value === 'in_progress' || value === 'in progress') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  const handleViewHistory = async (form) => {
    const empId = form.employeeId?.employeeId || form.employeeDetails?.employeeId || '';
    if (!empId) {
      message.error('Employee ID not available for history.');
      return;
    }
    const employeeName = form.employeeName || form.employeeDetails?.name || '';
    const division = form.department || form.division || form.employeeDetails?.department || '';
    const position = form.position || form.employeeDetails?.position || '';
    const location = (() => {
      if (form.location) return form.location;
      const emp = employees.find(e => e.employeeId === empId);
      return emp?.location || emp?.address || '';
    })();
    setHistoryEmployee({
      employeeId: empId,
      employeeName,
      division,
      position,
      location
    });
    setSalaryHistory([]);
    setHistoryVisible(true);
    setHistoryLoading(true);
    try {
      let salaryRecords = [];
      try {
        const response = await monthlyPayrollAPI.getEmployeeHistory(empId);
        salaryRecords = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];
      } catch (err) {
        if (err.response && (err.response.status === 404 || err.response.status === 500)) {
          const response = await monthlyPayrollAPI.list({});
          const allRecords = Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
            ? response
            : [];
          salaryRecords = allRecords.filter(r => String(r.employeeId) === String(empId));
        } else {
          throw err;
        }
      }
      salaryRecords.sort((a, b) => {
        const am = a.salaryMonth || '';
        const bm = b.salaryMonth || '';
        return String(am).localeCompare(String(bm));
      });
      setSalaryHistory(salaryRecords);
    } catch (error) {
      console.error('Error fetching salary history:', error);
      message.error('Failed to load salary history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': 
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'under_review': return 'bg-yellow-100 text-yellow-800';
      case 'clearance_in_progress': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-end">
          <div className="w-full">
             <label className="block text-sm font-medium text-gray-600 mb-2">Employee Name</label>
             <select
               value={filters.employeeName}
               onChange={(e) => setFilters(prev => ({ ...prev, employeeName: e.target.value }))}
               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
             >
               <option value="">All</option>
               {uniqueEmployeeNames.map(name => (
                 <option key={name} value={name}>{name}</option>
               ))}
             </select>
          </div>
          <div className="w-full">
             <label className="block text-sm font-medium text-gray-600 mb-2">Employee ID</label>
             <select
               value={filters.employeeId}
               onChange={(e) => setFilters(prev => ({ ...prev, employeeId: e.target.value }))}
               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
             >
               <option value="">All</option>
               {uniqueEmployeeIds.map(id => (
                 <option key={id} value={id}>{id}</option>
               ))}
             </select>
          </div>
          <div className="w-full">
             <label className="block text-sm font-medium text-gray-600 mb-2">Division</label>
             <select
               value={filters.division}
               onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
               className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
             >
               <option value="">All Divisions</option>
               {uniqueDivisions.map(div => (
                 <option key={div} value={div}>{div}</option>
               ))}
             </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 mb-2">Location</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
            >
              <option value="">All Locations</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc.toLowerCase()}>{loc}</option>
              ))}
            </select>
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base py-3 px-4"
            >
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#1e2050]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Division</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">LWD</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="8" className="px-6 py-4 text-center">Loading...</td></tr>
              ) : filteredForms.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-4 text-center text-gray-500">No requests found</td></tr>
              ) : (
                filteredForms.map((form, index) => (
                  <tr key={form._id} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-4 py-4 text-sm text-gray-700">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {form.employeeId?.employeeId || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {form.employeeName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {form.department || form.division || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {form.proposedLastWorkingDay ? new Date(form.proposedLastWorkingDay).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs" title={form.reasonForLeaving}>
                      {form.reasonForLeaving?.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(form.status)}`}>
                        {form.status?.toUpperCase().replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedForm(form)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                          title="View Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleViewHistory(form)}
                          className="text-amber-600 hover:text-amber-900 p-1 rounded-full hover:bg-amber-50"
                          title="View History"
                        >
                          <ClockIcon className="h-5 w-5" />
                        </button>
                        
                        {/* Inline Approve Action */}
                        {(['projectmanager', 'teamlead', 'admin'].includes(userRole) && !form.approvedByManager && form.status !== 'completed' && form.status !== 'rejected') && (
                          <button
                            onClick={() => handleManagerApprove(form._id)}
                            className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                            title="Manager Approve"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                        )}
                        {(['hr', 'admin'].includes(userRole) && form.status !== 'completed' && form.status !== 'rejected') && (
                           <button
                             onClick={() => handleHRApprove(form._id)}
                             className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                             title="HR Approve / Complete"
                           >
                             <CheckIcon className="h-5 w-5" />
                           </button>
                        )}

                        {/* Inline Reject Action */}
                        {(form.status !== 'completed' && form.status !== 'rejected' && form.status !== 'cancelled') && (
                          <button
                            onClick={() => handleReject(form._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            title="Reject"
                          >
                            <XMarkIcon className="h-5 w-5" />
                          </button>
                        )}

                        {/* Delete */}
                        {(['admin','hr'].includes(userRole)) && (
                          <button
                            onClick={() => handleDelete(form._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}

                        {form.status === 'completed' && (
                          <>
                            <button
                              onClick={() => handleGenerateRelievingLetter(form)}
                              className="text-purple-600 hover:text-purple-900 p-1 rounded-full hover:bg-purple-50"
                              title="Generate Relieving Letter"
                            >
                              <DocumentTextIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleGenerateExperienceLetter(form)}
                              className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                              title="Generate Experience Letter"
                            >
                              <DocumentArrowDownIcon className="h-5 w-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relieving Letter Modal */}
      {showRelievingLetter && letterData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Relieving Letter</h2>
                <p className="text-sm text-gray-500">Preview and download</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadRelievingLetter}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Download PDF
                </button>
                <button 
                  onClick={() => setShowRelievingLetter(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>
            </div>
            
            <div id="relieving-letter-template" className="bg-white relative h-[1123px] w-[794px] mx-auto shadow-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                <img 
                  src="/images/steel-logo.png" 
                  alt="" 
                  className="w-[500px] opacity-[0.05] grayscale"
                />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="w-full h-32 relative overflow-hidden flex bg-white" style={{ width: '100%', height: '128px', position: 'relative', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                    <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
                      <path d="M0,0 L526,0 L456,128 L0,128 Z" fill="#1e2b58" />
                      <path d="M526,0 L556,0 L486,128 L456,128 Z" fill="#f37021" />
                    </svg>
                  </div>
                  <div className="relative z-10 w-full h-full" style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
                    {/* Left: Logo and Title */}
                    <div style={{ position: 'absolute', left: '24px', top: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ height: '64px', width: 'auto', display: 'block' }} />
                      <div className="font-bitsumishi" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'white' }}>
                        <h1 className="text-white font-bold text-6xl tracking-[0.05em]" style={{ margin: 0, padding: 0, textAlign: 'left', lineHeight: 1 }}>CALDIM</h1>
                        <p className="text-[15px] font-bold tracking-[0.18em] text-[#ff8c00] uppercase" style={{ margin: 0, padding: 0, marginTop: '6px', textAlign: 'left', whiteSpace: 'nowrap' }}>ENGINEERING PRIVATE LIMITED</p>
                      </div>
                    </div>

                    {/* Right: Contact Info */}
                    <div style={{ position: 'absolute', right: '16px', top: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div className="flex items-center mb-2" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="font-bold text-gray-800 mr-3 text-lg" style={{ fontWeight: 'bold', marginRight: '12px', fontSize: '18px' }}>044-47860455</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md" style={{ backgroundColor: '#1e2b58', borderRadius: '9999px', padding: '6px', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" style={{ width: '16px', height: '16px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-start justify-end text-right" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', textAlign: 'right' }}>
                        <span className="text-sm font-semibold text-gray-700 leading-tight" style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.25, whiteSpace: 'nowrap' }}>
                          No.118, Minimac Center,<br />
                          Arcot Road, Valasaravakkam,<br />
                          Chennai - 600 087.
                        </span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md" style={{ backgroundColor: '#1e2b58', borderRadius: '9999px', padding: '6px', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '12px', marginTop: '4px', flexShrink: 0 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" style={{ width: '16px', height: '16px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-12 py-6 flex-grow">
                  <div className="flex justify-between mb-6">
                    <div />
                    <div className="text-gray-700">Date: <span className="font-bold">{letterData.date}</span></div>
                  </div>
                  <div className="mb-8">
                    <div className="font-bold">To:</div>
                    <div className="mt-3 font-bold text-lg">{letterData.employeeName}</div>
                    <div className="text-gray-800">{letterData.designation}</div>
                  </div>
                  <div className="mb-8">
                    <div className="font-bold">SUBJECT: <span className="font-normal">Relieving Order</span></div>
                  </div>
                  <div className="mb-6">
                    <div className="mb-2">Dear <span className="font-semibold">{letterData.employeeName}</span>,</div>
                  </div>
                  <div className="space-y-6 mb-10 text-justify text-[14px] leading-7">
                    <p>This is acknowledge the receipt of your resignation letter dated <span className="font-semibold">{letterData.resignationDate}</span>.</p>
                    <p>While accepting the Same, we thank you very much for close association you had with us during the tenure from <span className="font-semibold">{letterData.joinDate}</span> to <span className="font-semibold">{letterData.lastWorkingDate}</span> as a <span className="font-semibold">{letterData.designation}</span>. You have been relieved from your service with effect from the closing working hours of <span className="font-semibold">{letterData.lastWorkingDate}</span> and your work with us is found to be satisfactory.</p>
                    <p>We wish you all the best in your future career.</p>
                  </div>
                  <div className="mt-10 flex justify-end">
                    <div className="text-right">
                      <div className="mb-2 text-sm text-gray-700 font-bold font-bitsumishi">For {companyName}</div>
                      <div className="mt-8 relative inline-block text-center">
                        {letterData.signatureImage && (
                          <img 
                            src={letterData.signatureImage} 
                            alt="Signature" 
                            className="h-20 w-auto mb-2 relative z-10 mx-auto"
                            crossOrigin="anonymous"
                          />
                        )}
                        <div className="text-gray-600">Authorized Signatory</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full flex items-end mt-auto relative h-20" style={{ width: '100%', display: 'flex', alignItems: 'flex-end', marginTop: 'auto', position: 'relative', height: '80px' }}>
                  <div className="bg-[#f37021] flex-1 mb-0 h-8" style={{ backgroundColor: '#f37021', flex: 1, marginBottom: 0, height: '32px' }}></div>
                  <div className="bg-[#1e2b58] text-white flex flex-col items-end justify-center relative min-w-[400px] h-16 px-10" style={{ backgroundColor: '#1e2b58', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', minWidth: '400px', height: '64px', paddingLeft: '40px', paddingRight: '40px' }}>
                    <div 
                      className="absolute inset-y-0 left-0 w-16 bg-[#1e2b58]" 
                      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '64px', backgroundColor: '#1e2b58', transform: 'skew(-20deg)', transformOrigin: 'top left', marginLeft: '-32px' }}
                    ></div>
                    <div className="text-sm font-medium tracking-wide" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.025em' }}>Website : www.caldimengg.com</div>
                    <div className="text-sm font-medium tracking-wide mt-1" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.025em', marginTop: '4px' }}>CIN U74999TN2016PTC110683</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Experience Letter Modal */}
      {showExperienceLetter && experienceLetterData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Experience Letter</h2>
                <p className="text-sm text-gray-500">Preview and download</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={downloadExperienceLetter}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  Download PDF
                </button>
                <button 
                  onClick={() => setShowExperienceLetter(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>
            </div>
            
            <div id="experience-letter-template" className="bg-white relative h-[1123px] w-[794px] mx-auto shadow-lg overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                <img 
                  src="/images/steel-logo.png" 
                  alt="" 
                  className="w-[500px] opacity-[0.05] grayscale"
                />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="w-full h-32 relative overflow-hidden flex bg-white" style={{ width: '100%', height: '128px', position: 'relative', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
                    <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
                      <path d="M0,0 L526,0 L456,128 L0,128 Z" fill="#1e2b58" />
                      <path d="M526,0 L556,0 L486,128 L456,128 Z" fill="#f37021" />
                    </svg>
                  </div>
                  <div className="relative z-10 w-full h-full" style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%' }}>
                    {/* Left: Logo and Title */}
                    <div style={{ position: 'absolute', left: '24px', top: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ height: '64px', width: 'auto', display: 'block' }} />
                      <div className="font-bitsumishi" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', color: 'white' }}>
                        <h1 className="text-white font-bold text-6xl tracking-[0.05em]" style={{ margin: 0, padding: 0, textAlign: 'left', lineHeight: 1 }}>CALDIM</h1>
                        <p className="text-[15px] font-bold tracking-[0.18em] text-[#ff8c00] uppercase" style={{ margin: 0, padding: 0, marginTop: '6px', textAlign: 'left', whiteSpace: 'nowrap' }}>ENGINEERING PRIVATE LIMITED</p>
                      </div>
                    </div>

                    {/* Right: Contact Info */}
                    <div style={{ position: 'absolute', right: '16px', top: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <div className="flex items-center mb-2" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <span className="font-bold text-gray-800 mr-3 text-lg" style={{ fontWeight: 'bold', marginRight: '12px', fontSize: '18px' }}>044-47860455</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md" style={{ backgroundColor: '#1e2b58', borderRadius: '9999px', padding: '6px', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" style={{ width: '16px', height: '16px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-start justify-end text-right" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', textAlign: 'right' }}>
                        <span className="text-sm font-semibold text-gray-700 leading-tight" style={{ fontSize: '14px', fontWeight: 600, lineHeight: 1.25, whiteSpace: 'nowrap' }}>
                          No.118, Minimac Center,<br />
                          Arcot Road, Valasaravakkam,<br />
                          Chennai - 600 087.
                        </span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md" style={{ backgroundColor: '#1e2b58', borderRadius: '9999px', padding: '6px', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '12px', marginTop: '4px', flexShrink: 0 }}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" style={{ width: '16px', height: '16px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-12 py-6 flex-grow">
                  <div className="flex justify-between mb-10">
                    <div />
                    <div className="text-gray-700">Date: <span className="font-bold">{experienceLetterData.date}</span></div>
                  </div>
                  <div className="mb-8 text-center">
                    <div className="text-lg font-bold tracking-wide">WHOMSOEVER IT MAY CONCERN</div>
                  </div>
                  <div className="space-y-6 mb-10 text-justify text-[14px] leading-7">
                    <p>
                      This is to certify that <span className="font-semibold">{experienceLetterData.prefix}{experienceLetterData.employeeName}</span> has worked as a <span className="font-semibold">{experienceLetterData.designation}</span> in our organization from <span className="font-semibold">{experienceLetterData.joinDate}</span> to <span className="font-semibold">{experienceLetterData.lastWorkingDate}</span>. During {experienceLetterData.pronounPossessive} tenure, {experienceLetterData.pronounSubject} performance and conduct were found to be satisfactory.
                    </p>
                    {experienceLetterData.experienceText && (
                      <p>
                        The total period of employment with our organization is{' '}
                        <span className="font-semibold">{experienceLetterData.experienceText}</span>.
                      </p>
                    )}
                    <p>We wish you all success in your future endeavors.</p>
                    <p>Thanking you,</p>
                  </div>
                  <div className="mt-10 flex justify-end">
                    <div className="text-right">
                      <p className="font-bold mb-2 font-bitsumishi">For {experienceLetterData.companyName}</p>
                      <div className="text-center relative inline-block">
                      {experienceLetterData.signatureImage && (
                        <img 
                          src={experienceLetterData.signatureImage} 
                          alt="Signature" 
                          className="h-20 w-auto mb-2 relative z-10 mx-auto"
                          crossOrigin="anonymous"
                        />
                      )}
                      <div className="text-gray-700">Authorized Signatory</div>
                    </div>
                  </div>
                </div>
              </div>
                <div className="w-full flex items-end mt-auto relative h-20" style={{ width: '100%', display: 'flex', alignItems: 'flex-end', marginTop: 'auto', position: 'relative', height: '80px' }}>
                  <div className="bg-[#f37021] flex-1 mb-0 h-8" style={{ backgroundColor: '#f37021', flex: 1, marginBottom: 0, height: '32px' }}></div>
                  <div className="bg-[#1e2b58] text-white flex flex-col items-end justify-center relative min-w-[400px] h-16 px-10" style={{ backgroundColor: '#1e2b58', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', position: 'relative', minWidth: '400px', height: '64px', paddingLeft: '40px', paddingRight: '40px' }}>
                    <div 
                      className="absolute inset-y-0 left-0 w-16 bg-[#1e2b58]" 
                      style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '64px', backgroundColor: '#1e2b58', transform: 'skew(-20deg)', transformOrigin: 'top left', marginLeft: '-32px' }}
                    ></div>
                    <div className="text-sm font-medium tracking-wide" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.025em' }}>Website : www.caldimengg.com</div>
                    <div className="text-sm font-medium tracking-wide mt-1" style={{ fontSize: '14px', fontWeight: 500, letterSpacing: '0.025em', marginTop: '4px' }}>CIN U74999TN2016PTC110683</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedForm && !showRelievingLetter && !showExperienceLetter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-indigo-100">
            <div className="p-6 border-b border-indigo-200 flex justify-between items-center sticky top-0 bg-gradient-to-r from-[#262760] via-indigo-600 to-[#f37021] text-white z-10">
              <div>
                <h2 className="text-xl font-bold">Exit Request</h2>
                <p className="text-sm opacity-90">{selectedForm.employeeName} • {selectedForm.employeeId?.employeeId || '-'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedForm(null)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                >
                  <XCircleIcon className="h-8 w-8" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6 bg-gradient-to-b from-indigo-50/60 via-white to-orange-50/60">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Division</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{selectedForm.division || selectedForm.department || '-'}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Position</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{selectedForm.position || '-'}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Proposed LWD</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">
                    {selectedForm.proposedLastWorkingDay ? new Date(selectedForm.proposedLastWorkingDay).toLocaleDateString() : '-'}
                  </p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">Status</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedForm.status)}`}>
                      {selectedForm.status?.toUpperCase().replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="border border-indigo-100 rounded-xl p-4 bg-white/90 shadow-sm">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Reason for Exit</p>
                <p className="font-semibold text-sm text-gray-900">{selectedForm.reasonForLeaving?.replace(/_/g,' ') || '-'}</p>
                <p className="text-sm mt-2 text-gray-700">{selectedForm.reasonDetails || '-'}</p>
              </div>
              <div className="border border-indigo-100 rounded-xl p-4 bg-white/90 shadow-sm">
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-3">Clearance Status</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(selectedForm.clearanceDepartments || []).map((c, i) => (
                    <div key={i} className="flex items-center justify-between border border-gray-100 rounded-lg px-3 py-2 bg-gray-50">
                      <span className="text-sm font-medium text-gray-800 capitalize">{c.department}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getClearanceStatusClass(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                {(['projectmanager','teamlead','admin'].includes(userRole) && !selectedForm.approvedByManager && selectedForm.status !== 'completed' && selectedForm.status !== 'rejected') && (
                  <button
                    onClick={() => handleManagerApprove(selectedForm._id)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    disabled={actionLoading}
                  >
                    Manager Approve
                  </button>
                )}
                {(['hr','admin'].includes(userRole) && selectedForm.status !== 'completed' && selectedForm.status !== 'rejected') && (
                  <button
                    onClick={() => handleHRApprove(selectedForm._id)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    disabled={actionLoading}
                  >
                    HR Approve
                  </button>
                )}
                {(selectedForm.status !== 'completed' && selectedForm.status !== 'rejected' && selectedForm.status !== 'cancelled') && (
                  <button
                    onClick={() => handleReject(selectedForm._id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    disabled={actionLoading}
                  >
                    Reject
                  </button>
                )}
                {(['admin','hr'].includes(userRole)) && (
                  <button
                    onClick={() => handleDelete(selectedForm._id)}
                    className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
                    disabled={actionLoading}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {historyVisible && historyEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-indigo-100">
            <div className="p-6 border-b border-indigo-200 flex justify-between items-center sticky top-0 bg-gradient-to-r from-[#262760] via-indigo-600 to-[#f37021] text-white z-10">
              <div>
                <h2 className="text-xl font-bold">Employee Departure Records</h2>
                <p className="text-sm opacity-90">
                  {historyEmployee.employeeName} • {historyEmployee.employeeId}
                </p>
              </div>
              <button
                onClick={() => {
                  setHistoryVisible(false);
                  setHistoryEmployee(null);
                  setSalaryHistory([]);
                }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
              >
                <XCircleIcon className="h-7 w-7" />
              </button>
            </div>
            <div className="p-6 space-y-6 bg-gradient-to-b from-indigo-50/60 via-white to-orange-50/60">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Employee ID</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{historyEmployee.employeeId}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Name</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{historyEmployee.employeeName}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Division</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{historyEmployee.division || '-'}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Position</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{historyEmployee.position || '-'}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-white/80 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wide">Location</p>
                  <p className="font-semibold text-sm mt-1 text-gray-900">{historyEmployee.location || '-'}</p>
                </div>
                <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50 shadow-sm">
                  <p className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wide">Salary Months</p>
                  <p className="font-bold text-lg mt-1 text-indigo-900">{salarySummary.totalMonths}</p>
                </div>
                <div className="border border-green-100 rounded-xl p-4 bg-green-50 shadow-sm">
                  <p className="text-[11px] font-semibold text-green-700 uppercase tracking-wide">Total Net Salary</p>
                  <p className="font-bold text-lg mt-1 text-green-700">
                    ₹{salarySummary.totalNet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="border border-orange-100 rounded-xl p-4 bg-orange-50 shadow-sm">
                  <p className="text-[11px] font-semibold text-orange-700 uppercase tracking-wide">Total CTC</p>
                  <p className="font-bold text-lg mt-1 text-orange-700">
                    ₹{salarySummary.totalCtc.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </div>

              {historyLoading ? (
                <div className="py-10 flex items-center justify-center text-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#262760]"></div>
                    <span className="text-sm font-medium">Loading salary history...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#262760]">Salary History</h3>
                    {salaryHistory.length > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Latest Month:&nbsp;
                        {formatSalaryMonth(salaryHistory[salaryHistory.length - 1].salaryMonth)}
                      </span>
                    )}
                  </div>
                  <div className="border border-indigo-100 rounded-xl overflow-hidden shadow-sm bg-white/90">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-[#262760]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">Month</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Basic+DA</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Total Earnings</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Total Deductions</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">Net Salary</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-white uppercase tracking-wider">CTC</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {salaryHistory.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="px-4 py-6 text-center text-gray-500 text-sm">
                              No salary history found.
                            </td>
                          </tr>
                        ) : (
                          <>
                            {salaryHistory.map((record, index) => (
                              <tr
                                key={record.id || record._id || record.salaryMonth}
                                className={index % 2 === 0 ? 'bg-white' : 'bg-indigo-50/40'}
                              >
                                <td className="px-4 py-2 text-sm text-gray-800">
                                  {formatSalaryMonth(record.salaryMonth)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-700">
                                  {Number(record.basicDA || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-700">
                                  {Number(record.totalEarnings || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-gray-700">
                                  {Number(record.totalDeductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-green-700">
                                  {Number(record.netSalary || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="px-4 py-2 text-sm text-right font-semibold text-orange-700">
                                  {Number(record.ctc || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-indigo-50/80 font-semibold">
                              <td className="px-4 py-3 text-sm text-[#262760]">Total</td>
                              <td className="px-4 py-3 text-sm text-right text-gray-800"></td>
                              <td className="px-4 py-3 text-sm text-right text-gray-800"></td>
                              <td className="px-4 py-3 text-sm text-right text-gray-800"></td>
                              <td className="px-4 py-3 text-sm text-right text-green-700">
                                ₹{salarySummary.totalNet.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-orange-700">
                                ₹{salarySummary.totalCtc.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Rejection Modal */}
      <Modal
        title="Reject Exit Request"
        open={rejectModal.visible}
        onOk={submitRejection}
        onCancel={() => setRejectModal({ visible: false, formId: null, reason: '' })}
        okText="Reject"
        okType="danger"
        confirmLoading={actionLoading}
      >
        <p className="mb-2 text-gray-600">Please provide a reason for rejection:</p>
        <Input.TextArea
          rows={4}
          value={rejectModal.reason}
          onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
          placeholder="Enter rejection reason..."
        />
      </Modal>

      {/* Clearance Modal */}
      <Modal
        title={`Update ${clearanceModal.department?.toUpperCase()} Clearance`}
        open={clearanceModal.visible}
        onOk={submitClearanceUpdate}
        onCancel={() => setClearanceModal({ visible: false, formId: null, department: '', status: '', remarks: '' })}
        okText="Update"
        confirmLoading={actionLoading}
      >
        <p className="mb-2 text-gray-600">Status: <span className="font-semibold capitalize">{clearanceModal.status}</span></p>
        <p className="mb-2 text-gray-600">Remarks:</p>
        <Input.TextArea
          rows={3}
          value={clearanceModal.remarks}
          onChange={(e) => setClearanceModal({ ...clearanceModal, remarks: e.target.value })}
          placeholder="Enter remarks (optional)..."
        />
      </Modal>
    </div>
  );
};

export default ExitApproval;
