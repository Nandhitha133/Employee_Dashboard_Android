// src/pages/InsuranceManagement.jsx
import React, { useState, useEffect } from 'react';
import {
  PlusIcon,
  DocumentTextIcon,
  ArrowLeftIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  UserCircleIcon,
  DocumentArrowUpIcon,
  CloudArrowDownIcon,
  PaperAirplaneIcon,
  MinusIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
  UserIcon,
  BuildingLibraryIcon,
  BuildingOfficeIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserGroupIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { message, Modal } from 'antd';
import { employeeAPI, insuranceAPI, insuranceClaimAPI } from '../../services/api';

const InsuranceManagement = () => {
  const [currentView, setCurrentView] = useState('main'); // 'main', 'newClaim', 'claimHistory'
  const [currentStep, setCurrentStep] = useState(1);
  const [viewingClaim, setViewingClaim] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);

  // Extract unique departments and branches for filters
  const uniqueDepartments = ['SDS', 'TEKLA', 'DAS(Software)', 'HR/Admin', 'Electrical']; // Hardcoded as per user request for Division
  const uniqueBranches = ['Hosur', 'Chennai']; // Hardcoded as per user request for Location

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await employeeAPI.getAllEmployees();
        // Sort employees by ID in ascending order (CDE001 -> CDE002 -> etc)
        const sortedEmployees = response.data.sort((a, b) => {
          const idA = a.employeeId || '';
          const idB = b.employeeId || '';
          return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setEmployees(sortedEmployees);
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();
  }, []);

  // Fetch Insurance Records
  useEffect(() => {
    const fetchInsuranceRecords = async () => {
      try {
        const response = await insuranceAPI.getAll();
        setInsuranceRecords(response.data);
      } catch (error) {
        console.error("Error fetching insurance records:", error);
      }
    };
    fetchInsuranceRecords();
  }, []);

  // Clear errors when changing steps to prevent initial validation errors (Issue 1)
  useEffect(() => {
    setErrors({});
  }, [currentStep]);

  const [editFormData, setEditFormData] = useState({
    employeeName: '',
    employeeId: '',
    mobile: '',
    bankName: '',
    accountNumber: '',
    relationship: 'Single',
    spouseName: '',
    children: [{ name: '', age: '' }],
    memberName: '',
    claimNumber: '',
    treatment: '',
    sumInsured: '',
    dateOfAdmission: '',
    dateOfDischarge: '',
    requestedAmount: '',
    claimDate: '',
    closeDate: '',
    claimStatus: 'Pending',
    paymentStatus: 'Unpaid',
    hospitalAddress: '',
    typeOfIllness: '',
    otherIllness: '',
    documents: {
      employeePhoto: null,
      dischargeBill: null,
      pharmacyBill: null,
      paymentReceipt: null
    }
  });

  // Form Data for New Claim
  const [formData, setFormData] = useState({
    employeeName: '',
    employeeId: '',
    mobile: '',
    bankName: '',
    accountNumber: '',
    relationship: 'Single',
    spouseName: '',
    children: [{ name: '', age: '' }],
    memberName: '',
    claimNumber: '',
    treatment: '',
    sumInsured: '',
    dateOfAdmission: '',
    dateOfDischarge: '',
    requestedAmount: '',
    claimDate: '',
    closeDate: '',
    claimStatus: 'Pending',
    paymentStatus: 'Unpaid',
    hospitalAddress: '',
    typeOfIllness: '',
    otherIllness: '',
    documents: {
      employeePhoto: null,
      dischargeBill: null,
      pharmacyBill: null,
      paymentReceipt: null
    }
  });

  // Illness types
  const illnessTypes = [
    "Fever",
    "Flu / Viral Infection",
    "Food Poisoning",
    "Allergy",
    "Migraine",
    "Asthma Attack",
    "Pneumonia",
    "COVID-19",
    "Gastric Pain",
    "Ulcer",
    "Jaundice",
    "Diabetes Complication",
    "High Blood Pressure",
    "Heart Disease",
    "Kidney Stone",
    "Arthritis",
    "Slip / Fall Injury",
    "Back Pain",
    "Fracture",
    "Dengue",
    "Malaria",
    "Chickenpox",
    "Typhoid",
    "Surgery",
    "Hospital Admission",
    "Emergency Treatment",
    "Other"
  ];

  // Claims data state
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const response = await insuranceClaimAPI.getAll();
      const mappedClaims = response.data.map(claim => ({
        ...claim,
        id: claim._id
      }));
      setClaims(mappedClaims);
    } catch (error) {
      console.error("Error fetching claims:", error);
      message.error("Failed to fetch insurance claims");
    }
  };

  const initialRecordFormState = {
    employeeId: '',
    employeeName: '',
    department: '',
    designation: '',
    branch: '',
    dateOfJoining: '',
    dateOfBirth: '',
    mobileNumber: '',
    email: '',
    nomineeName: '',
    nomineeRelationship: '',
    nomineeMobileNumber: '',
    insuredAmount: '₹2,00,000'
  };

  const [insuranceRecords, setInsuranceRecords] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    employeeName: '',
    employeeId: '',
    department: '',
    branch: ''
  });

  const filteredRecords = insuranceRecords.filter(record => {
    return (
      (filters.employeeName === '' || (record.employeeName && record.employeeName.toLowerCase().includes(filters.employeeName.toLowerCase()))) &&
      (filters.employeeId === '' || (record.employeeId && record.employeeId.toLowerCase().includes(filters.employeeId.toLowerCase()))) &&
      (filters.department === '' || (record.department && record.department.toLowerCase().includes(filters.department.toLowerCase()))) &&
      (filters.branch === '' || (record.branch && record.branch.toLowerCase().includes(filters.branch.toLowerCase())))
    );
  });

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      employeeName: '',
      employeeId: '',
      department: '',
      branch: ''
    });
  };
  const [recordForm, setRecordForm] = useState(initialRecordFormState);
  const [recordFormErrors, setRecordFormErrors] = useState({});
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [editingRecordIndex, setEditingRecordIndex] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);

  // Multi-step Form Components for New Claim
  const steps = [
    { number: 1, title: 'EMPLOYEE DETAILS', icon: UserCircleIcon },
    { number: 2, title: 'UPLOAD DOCUMENTS', icon: DocumentArrowUpIcon },
    { number: 3, title: 'TREATMENT DETAILS', icon: DocumentTextIcon }
  ];

  // Helper Functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRecordInputChange = (field, value) => {
    if (field === 'mobileNumber' || field === 'nomineeMobileNumber') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }

    setRecordForm(prev => ({
      ...prev,
      [field]: value
    }));

    if (recordFormErrors[field]) {
      setRecordFormErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const openCreateRecordModal = () => {
    setRecordForm(initialRecordFormState);
    setEditingRecordIndex(null);
    setRecordFormErrors({});
    setIsRecordModalOpen(true);
  };

  const openEditRecordModal = (record) => {
    const index = insuranceRecords.findIndex(r => r._id === record._id);
    const formattedRecord = {
      ...record,
      dateOfJoining: record.dateOfJoining ? record.dateOfJoining.split('T')[0] : '',
      dateOfBirth: record.dateOfBirth ? record.dateOfBirth.split('T')[0] : ''
    };
    setRecordForm(formattedRecord);
    setEditingRecordIndex(index);
    setRecordFormErrors({});
    setIsRecordModalOpen(true);
  };

  const handleDeleteRecord = async (record) => {
    Modal.confirm({
      title: 'Confirm Delete',
      content: 'Are you sure you want to delete this insurance record?',
      okText: 'Yes',
      cancelText: 'No',
      onOk: async () => {
        try {
          if (record._id) {
            await insuranceAPI.delete(record._id);
            Modal.success({
              title: 'Success',
              content: 'Insurance record deleted successfully',
            });
            setInsuranceRecords(prev => prev.filter(r => r._id !== record._id));
          }
        } catch (error) {
          console.error("Error deleting insurance record:", error);
          message.error('Failed to delete insurance record');
        }
      }
    });
  };

  const handleRecordEmployeeSelect = (employeeId) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);

    if (employee) {
      setRecordForm(prev => ({
        ...prev,
        employeeId: employee.employeeId,
        employeeName: employee.name || '',
        department: employee.department || employee.division || '',
        designation: employee.designation || '',
        branch: uniqueBranches.find(b => b.toLowerCase() === (employee.location || '').toLowerCase()) || employee.location || '',
        dateOfJoining: employee.dateOfJoining ? employee.dateOfJoining.split('T')[0] : '',
        dateOfBirth: employee.dob || employee.dateOfBirth ? (employee.dob || employee.dateOfBirth).split('T')[0] : '',
        mobileNumber: employee.mobileNo || employee.contactNumber || employee.mobile || '',
        email: employee.email || '',
      }));

      // Clear errors for autofilled fields
      setRecordFormErrors(prev => {
        const newErrors = { ...prev };
        ['employeeId', 'employeeName', 'department', 'designation', 'branch', 'dateOfJoining', 'dateOfBirth', 'mobileNumber', 'email'].forEach(key => delete newErrors[key]);
        return newErrors;
      });
    } else {
      setRecordForm(prev => ({
        ...prev,
        employeeId: employeeId
      }));
    }
  };

  const handleSubmitRecord = async (e) => {
    e.preventDefault();

    const requiredFields = [
      'employeeId',
      'employeeName',
      'department',
      'designation',
      'branch',
      'dateOfJoining',
      'dateOfBirth',
      'mobileNumber',
      'email',
      'nomineeName',
      'nomineeRelationship',
      'nomineeMobileNumber'
    ];

    const newErrors = {};
    requiredFields.forEach((field) => {
      if (!recordForm[field]) {
        newErrors[field] = true;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setRecordFormErrors(newErrors);
      return;
    }

    const recordToSave = {
      ...recordForm,
      insuredAmount: '₹2,00,000'
    };

    try {
      if (editingRecordIndex !== null) {
        const record = insuranceRecords[editingRecordIndex];
        const response = await insuranceAPI.update(record._id, recordToSave);
        setInsuranceRecords(prev => prev.map((item, index) =>
          index === editingRecordIndex ? response.data : item
        ));
        Modal.success({
          title: 'Success',
          content: 'Insurance record updated successfully',
        });
      } else {
        const response = await insuranceAPI.create(recordToSave);
        setInsuranceRecords(prev => [response.data, ...prev]);
        Modal.success({
          title: 'Success',
          content: 'Insurance record added successfully',
        });
      }

      setIsRecordModalOpen(false);
      setRecordForm(initialRecordFormState);
      setEditingRecordIndex(null);
      setRecordFormErrors({});
    } catch (error) {
      console.error("Error saving insurance record:", error);
      message.error('Failed to save insurance record');
    }
  };

  // Form Handlers for New Claim
  const handleInputChange = (field, value) => {
    // Format helper for max length error msg
    const setMaxLengthError = (fieldName) => {
      setErrors(prev => ({
        ...prev,
        [fieldName]: 'Maximum 250 characters allowed'
      }));
    };

    // Validation for specific fields
    if (field === 'mobile') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }
    if (field === 'accountNumber') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 18) return;
    }

    // Issue 2: Date Picker 4 digit year restriction
    if (['claimDate', 'dateOfAdmission', 'dateOfDischarge', 'closeDate'].includes(field)) {
      if (value) {
        if (value.length > 10) return;
        const year = value.split('-')[0];
        if (year && year.length > 4) return;
      }
    }

    // Issue: Claim Number only numbers
    if (field === 'claimNumber') {
      if (!/^\d*$/.test(value)) return;
    }

    // Issue 3: Character Limit 250
    // Fields that should have limits
    const textFields = ['employeeName', 'bankName', 'spouseName', 'memberName', 'claimNumber', 'treatment', 'hospitalAddress', 'otherIllness', 'typeOfIllness'];
    if (textFields.includes(field)) {
      if (value.length > 250) {
        setMaxLengthError(field);
        return;
      }
    }

    // Restricted inputs (Name fields - Alphabets only)
    if (['spouseName', 'memberName'].includes(field)) {
      if (value && /[^a-zA-Z\s]/.test(value)) return;
    }

    setFormData(prev => {
      // Logic: Admission <= Discharge <= Claim <= Close
      
      if (field === 'dateOfDischarge' && prev.dateOfAdmission && value && value < prev.dateOfAdmission) {
        return prev;
      }

      if (field === 'claimDate' && prev.dateOfDischarge && value && value < prev.dateOfDischarge) {
        return prev;
      }

      if (field === 'closeDate' && prev.claimDate && value && value < prev.claimDate) {
        return prev;
      }

      const updated = {
        ...prev,
        [field]: value
      };

      // Cascade clearing: If Admission moves past Discharge, clear Discharge and subsequent
      if (field === 'dateOfAdmission' && prev.dateOfDischarge && value && value > prev.dateOfDischarge) {
        updated.dateOfDischarge = '';
        updated.claimDate = '';
        updated.closeDate = '';
      }

      if (field === 'dateOfDischarge' && prev.claimDate && value && value > prev.claimDate) {
        updated.claimDate = '';
        updated.closeDate = '';
      }

      if (field === 'claimDate' && prev.closeDate && value && value > prev.closeDate) {
        updated.closeDate = '';
      }

      return updated;
    });
    setMaxLengthError('');

    // Clear error if exists
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleEmployeeSelect = (employeeId) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);

    if (employee) {
      setFormData(prev => ({
        ...prev,
        employeeName: employee.name,
        employeeId: employee.employeeId,
        mobile: employee.mobileNo || employee.contactNumber || employee.mobile || '',
        bankName: employee.bankName || '',
        accountNumber: employee.bankAccount || employee.accountNumber || '',
        relationship: employee.maritalStatus || 'Single',
        spouseName: employee.spouseName || ''
      }));

      // Clear errors
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.employeeId;
        delete newErrors.employeeName;
        delete newErrors.mobile;
        delete newErrors.bankName;
        delete newErrors.accountNumber;
        delete newErrors.relationship;
        return newErrors;
      });
    } else {
      // Handle reset if needed, or just set ID
      setFormData(prev => ({
        ...prev,
        employeeId: employeeId
      }));
    }
  };

  const handleRemoveFile = (field) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: null
      }
    }));
  };

  const handleNameBlur = (field) => {
    const value = formData[field];
    if (value && value.length > 0) {
      const capitalized = value.charAt(0).toUpperCase() + value.slice(1);
      setFormData(prev => ({ ...prev, [field]: capitalized }));
    }
  };

  const handleFileUpload = (field, file) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file
      }
    }));

    // Clear error
    if (errors[field] || errors.documents) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        // Re-check generic documents error if needed, but for now simple clear
        return newErrors;
      });
    }
  };

  // Edit form file upload
  const handleEditFileUpload = (field, file) => {
    setEditFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file
      }
    }));
  };

  // Children management functions
  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [...prev.children, { name: '', age: '' }]
    }));
  };

  const removeChild = (index) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  const updateChild = (index, field, value) => {
    // Issue 4: Age field restriction & Name restriction
    if (field === 'age') {
      if (value.length > 3) return;
    }
    if (field === 'name') {
      if (/[^a-zA-Z\s]/.test(value)) return;
    }

    setFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  // Edit children management
  const addEditChild = () => {
    setEditFormData(prev => ({
      ...prev,
      children: [...prev.children, { name: '', age: '' }]
    }));
  };

  const removeEditChild = (index) => {
    setEditFormData(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index)
    }));
  };

  const updateEditChild = (index, field, value) => {
    // Issue 4: Age field restriction
    if (field === 'age') {
      if (value.length > 3) return;
    }
    if (field === 'name') {
      if (/[^a-zA-Z\s]/.test(value)) return;
    }

    setEditFormData(prev => ({
      ...prev,
      children: prev.children.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      )
    }));
  };

  // Edit form handlers
  const handleEditInputChange = (field, value) => {
    // Issue 2: Date Picker 4 digit year restriction
    if (['claimDate', 'dateOfAdmission', 'dateOfDischarge', 'closeDate'].includes(field)) {
      if (value) {
        // Strict length check
        if (value.length > 10) return;
        const year = value.split('-')[0];
        if (year && year.length > 4) return;
      }
    }

    // Issue: Claim Number only numbers
    if (field === 'claimNumber') {
      if (!/^\d*$/.test(value)) return;
    }

    // Restricted inputs (Name fields - Alphabets only)
    if (['spouseName', 'memberName'].includes(field)) {
      if (value && /[^a-zA-Z\s]/.test(value)) return;
    }

    setEditFormData(prev => {
      // Logic: Admission <= Discharge <= Claim <= Close
      
      if (field === 'dateOfDischarge' && prev.dateOfAdmission && value && value < prev.dateOfAdmission) {
        return prev;
      }

      if (field === 'claimDate' && prev.dateOfDischarge && value && value < prev.dateOfDischarge) {
        return prev;
      }

      if (field === 'closeDate' && prev.claimDate && value && value < prev.claimDate) {
        return prev;
      }

      const updated = {
        ...prev,
        [field]: value
      };

      // Cascade clearing: If Admission moves past Discharge, clear Discharge and subsequent
      if (field === 'dateOfAdmission' && prev.dateOfDischarge && value && value > prev.dateOfDischarge) {
        updated.dateOfDischarge = '';
        updated.claimDate = '';
        updated.closeDate = '';
      }

      if (field === 'dateOfDischarge' && prev.claimDate && value && value > prev.claimDate) {
        updated.claimDate = '';
        updated.closeDate = '';
      }

      if (field === 'claimDate' && prev.closeDate && value && value > prev.closeDate) {
        updated.closeDate = '';
      }

      return updated;
    });
  };

  // Enhanced PDF Download Function
  const handleDownloadPDF = (claim) => {
    // Create a new window with the claim details
    const printWindow = window.open('', '_blank');

    // HTML content for the PDF
    const htmlContent = `
  < !DOCTYPE html >
    <html>
      <head>
        <title>Insurance Claim - ${claim.claimNumber}</title>
        <style>
          body {
            font - family: Arial, sans-serif;
          margin: 40px;
          color: #333;
          }
          .header {
            text - align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
          }
          .header h1 {
            color: #2c3e50;
          margin: 0;
          }
          .header h2 {
            color: #3498db;
          margin: 10px 0;
          }
          .section {
            margin - bottom: 25px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: #f9f9f9;
          }
          .section h3 {
            color: #2c3e50;
          border-bottom: 1px solid #ddd;
          padding-bottom: 8px;
          margin-top: 0;
          }
          .row {
            display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
          }
          .label {
            font - weight: bold;
          color: #555;
          min-width: 200px;
          }
          .value {
            flex: 1;
          color: #333;
          }
          .status {
            display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
          }
          .status-approved {
            background - color: #d4edda;
          color: #155724;
          }
          .status-pending {
            background - color: #fff3cd;
          color: #856404;
          }
          .status-rejected {
            background - color: #f8d7da;
          color: #721c24;
          }
          .amount {
            font - size: 20px;
          font-weight: bold;
          color: #2ecc71;
          }
          .footer {
            text - align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #ddd;
          color: #777;
          font-size: 12px;
          }
          .timestamp {
            font - size: 11px;
          color: #999;
          text-align: right;
          margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="timestamp">Generated on: ${new Date().toLocaleString()}</div>

        <div class="header">
          <h1>INSURANCE CLAIM DETAILS</h1>
          <h2>Claim Number: ${claim.claimNumber}</h2>
        </div>

        <div class="section">
          <h3>Basic Information</h3>
          <div class="row">
            <span class="label">Claim Number:</span>
            <span class="value">${claim.claimNumber}</span>
          </div>
          <div class="row">
            <span class="label">Employee Name:</span>
            <span class="value">${claim.employeeName}</span>
          </div>
          <div class="row">
            <span class="label">Employee ID:</span>
            <span class="value">${claim.employeeId}</span>
          </div>
          <div class="row">
            <span class="label">Member Name:</span>
            <span class="value">${claim.memberName}</span>
          </div>
          <div class="row">
            <span class="label">Treatment:</span>
            <span class="value">${claim.treatment}</span>
          </div>
        </div>

        <div class="section">
          <h3>Financial Details</h3>
          <div class="row">
            <span class="label">Sum Insured:</span>
            <span class="value amount">₹${claim.sumInsured?.toLocaleString()}</span>
          </div>
          <div class="row">
            <span class="label">Requested Amount:</span>
            <span class="value amount">₹${claim.requestedAmount?.toLocaleString()}</span>
          </div>
        </div>

        <div class="section">
          <h3>Treatment Details</h3>
          <div class="row">
            <span class="label">Hospital Address:</span>
            <span class="value">${claim.hospitalAddress}</span>
          </div>
          <div class="row">
            <span class="label">Type of Illness:</span>
            <span class="value">${claim.typeOfIllness}</span>
          </div>
          <div class="row">
            <span class="label">Admission Date:</span>
            <span class="value">${new Date(claim.dateOfAdmission).toLocaleDateString()}</span>
          </div>
          <div class="row">
            <span class="label">Discharge Date:</span>
            <span class="value">${new Date(claim.dateOfDischarge).toLocaleDateString()}</span>
          </div>
        </div>

        <div class="section">
          <h3>Status Information</h3>
          <div class="row">
            <span class="label">Claim Status:</span>
            <span class="value">
              <span class="status status-${claim.status.toLowerCase()}">${claim.status}</span>
            </span>
          </div>
          <div class="row">
            <span class="label">Payment Status:</span>
            <span class="value">
              <span class="status status-${claim.paymentStatus.toLowerCase()}">${claim.paymentStatus}</span>
            </span>
          </div>
          <div class="row">
            <span class="label">Claim Date:</span>
            <span class="value">${new Date(claim.claimDate).toLocaleDateString()}</span>
          </div>
          <div class="row">
            <span class="label">Close Date:</span>
            <span class="value">${claim.closeDate ? new Date(claim.closeDate).toLocaleDateString() : 'Open'}</span>
          </div>
        </div>

        <div class="section">
          <h3>Employee Information</h3>
          <div class="row">
            <span class="label">Mobile Number:</span>
            <span class="value">${claim.mobile}</span>
          </div>
          <div class="row">
            <span class="label">Relationship:</span>
            <span class="value">${claim.relationship}</span>
          </div>
          ${claim.spouseName ? `
            <div class="row">
              <span class="label">Spouse Name:</span>
              <span class="value">${claim.spouseName}</span>
            </div>
          ` : ''}
        </div>

        <div class="section">
          <h3>Bank Information</h3>
          <div class="row">
            <span class="label">Bank Name:</span>
            <span class="value">${claim.bankName}</span>
          </div>
          <div class="row">
            <span class="label">Account Number:</span>
            <span class="value">${claim.accountNumber}</span>
          </div>
        </div>

        ${claim.children && claim.children.length > 0 ? `
          <div class="section">
            <h3>Children Details</h3>
            ${claim.children.map((child, index) => `
              <div class="row">
                <span class="label">Child ${index + 1}:</span>
                <span class="value">${child.name} (Age: ${child.age} years)</span>
              </div>
            `).join('')}
            
          </div>
        ` : ''}

        ${claim.documents ? `
          <div class="section">
            <h3>Uploaded Documents</h3>
            <div class="row">
              <span class="label">Employee Photo:</span>
              <span class="value">${claim.documents.employeePhoto?.name || 'Not uploaded'}</span>
            </div>
            <div class="row">
              <span class="label">Discharge Bill:</span>
              <span class="value">${claim.documents.dischargeBill?.name || 'Not uploaded'}</span>
            </div>
            <div class="row">
              <span class="label">Pharmacy Bill:</span>
              <span class="value">${claim.documents.pharmacyBill?.name || 'Not uploaded'}</span>
            </div>
            <div class="row">
              <span class="label">Payment Receipt:</span>
              <span class="value">${claim.documents.paymentReceipt?.name || 'Not uploaded'}</span>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <p>This is an official document generated by Insurance Management System</p>
          <p>Document ID: ${claim.id} | Generated on: ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
    </html>
`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Give the content time to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 500);
  };

  // Form Submission Handlers
  const handleSubmitClaim = async (e) => {
    e.preventDefault();

    const newErrors = {};
    const requiredFields = [
      'employeeName', 'employeeId', 'mobile', 'bankName',
      'accountNumber', 'memberName', 'claimNumber', 'treatment',
      'sumInsured', 'requestedAmount', 'dateOfAdmission', 'dateOfDischarge',
      'claimDate', 'hospitalAddress', 'typeOfIllness', 'claimStatus', 'paymentStatus'
    ];

    requiredFields.forEach(field => {
      if (!formData[field]) newErrors[field] = true;
    });

    if (formData.typeOfIllness === 'Other' && !formData.otherIllness) {
      newErrors.otherIllness = true;
    }

    if (formData.relationship === 'Married') {
      if (!formData.spouseName) newErrors.spouseName = 'Spouse Name is required';

      // Validate Children - All visible rows must be filled
      formData.children.forEach((child, index) => {
        if (!child.name) newErrors[`childName_${index}`] = 'Name is required';
        if (!child.age) newErrors[`childAge_${index}`] = 'Age is required';
      });
    }

    if (formData.claimDate && formData.dateOfDischarge && formData.claimDate < formData.dateOfDischarge) {
      newErrors.claimDate = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // alert('Please fill in all required fields'); // Removed alert
      message.error('Please fill in all required fields');
      return;
    }

    // Additional validation for requested amount vs sum insured
    const sumInsured = parseFloat(formData.sumInsured);
    const requestedAmount = parseFloat(formData.requestedAmount);
    let maxAmountError = false;
    if (requestedAmount > sumInsured) {
      newErrors.requestedAmount = 'Requested amount cannot exceed sum insured';
      maxAmountError = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      message.error('Please fill in all required Treatment Details');
      return;
    }

    if (maxAmountError) {
      message.error("Requested Amount exceeds Sum Insured");
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('employeeName', formData.employeeName);
      formDataToSend.append('employeeId', formData.employeeId);
      formDataToSend.append('claimNumber', formData.claimNumber);
      formDataToSend.append('memberName', formData.memberName);
      formDataToSend.append('treatment', formData.treatment);
      formDataToSend.append('sumInsured', formData.sumInsured);
      formDataToSend.append('requestedAmount', formData.requestedAmount);
      formDataToSend.append('claimDate', formData.claimDate);
      formDataToSend.append('closeDate', formData.closeDate || '');
      formDataToSend.append('status', formData.claimStatus);
      formDataToSend.append('paymentStatus', formData.paymentStatus);
      formDataToSend.append('dateOfAdmission', formData.dateOfAdmission);
      formDataToSend.append('dateOfDischarge', formData.dateOfDischarge);
      formDataToSend.append('bankName', formData.bankName);
      formDataToSend.append('accountNumber', formData.accountNumber);
      formDataToSend.append('relationship', formData.relationship);
      formDataToSend.append('mobile', formData.mobile);
      formDataToSend.append('spouseName', formData.spouseName || '');
      formDataToSend.append('hospitalAddress', formData.hospitalAddress);
      
      const typeOfIllness = formData.typeOfIllness === 'Other' ? formData.otherIllness : formData.typeOfIllness;
      formDataToSend.append('typeOfIllness', typeOfIllness);
      if (formData.typeOfIllness === 'Other') {
        formDataToSend.append('otherIllness', formData.otherIllness);
      }

      formDataToSend.append('children', JSON.stringify(formData.children || []));

      // Append files
      if (formData.documents.employeePhoto) formDataToSend.append('employeePhoto', formData.documents.employeePhoto);
      if (formData.documents.dischargeBill) formDataToSend.append('dischargeBill', formData.documents.dischargeBill);
      if (formData.documents.pharmacyBill) formDataToSend.append('pharmacyBill', formData.documents.pharmacyBill);
      if (formData.documents.paymentReceipt) formDataToSend.append('paymentReceipt', formData.documents.paymentReceipt);

      const response = await insuranceClaimAPI.create(formDataToSend);
      const savedClaim = { ...response.data, id: response.data._id };
      
      setClaims(prev => [savedClaim, ...prev]);
      message.success('Claim submitted successfully!');

      // Reset form
      setFormData({
        employeeName: '',
        employeeId: '',
        mobile: '',
        bankName: '',
        accountNumber: '',
        relationship: 'Single',
        spouseName: '',
        children: [{ name: '', age: '' }],
        memberName: '',
        claimNumber: '',
        treatment: '',
        sumInsured: '',
        dateOfAdmission: '',
        dateOfDischarge: '',
        requestedAmount: '',
        claimDate: '',
        closeDate: '',
        claimStatus: 'Pending',
        paymentStatus: 'Unpaid',
        hospitalAddress: '',
        typeOfIllness: '',
        otherIllness: '',
        documents: {
          employeePhoto: null,
          dischargeBill: null,
          pharmacyBill: null,
          paymentReceipt: null
        }
      });
      setCurrentStep(1);
      setCurrentView('claimHistory');
    } catch (error) {
      console.error("Error creating claim:", error);
      message.error(error.response?.data?.message || 'Failed to submit claim');
    }
  };

  const handleUpdateClaim = async (e) => {
    e.preventDefault();

    const newErrors = {};
    const requiredFields = [
      'employeeName', 'employeeId', 'mobile', 'bankName',
      'accountNumber', 'memberName', 'claimNumber', 'treatment',
      'sumInsured', 'requestedAmount', 'dateOfAdmission', 'dateOfDischarge',
      'claimDate', 'hospitalAddress', 'typeOfIllness', 'claimStatus', 'paymentStatus'
    ];

    requiredFields.forEach(field => {
      if (!editFormData[field]) newErrors[field] = true;
    });

    if (editFormData.typeOfIllness === 'Other' && !editFormData.otherIllness) {
      newErrors.otherIllness = true;
    }

    if (editFormData.relationship === 'Married') {
      if (!editFormData.spouseName) newErrors.spouseName = 'Spouse Name is required';
      // Validate Children
      editFormData.children.forEach((child, index) => {
        if (!child.name) newErrors[`childName_${index}`] = 'Name is required';
        if (!child.age) newErrors[`childAge_${index}`] = 'Age is required';
      });
    }

    if (editFormData.claimDate && editFormData.dateOfDischarge && editFormData.claimDate < editFormData.dateOfDischarge) {
      newErrors.claimDate = true;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      message.error('Please fill in all required fields');
      return;
    }

    const sumInsured = parseFloat(editFormData.sumInsured);
    const requestedAmount = parseFloat(editFormData.requestedAmount);
    if (requestedAmount > sumInsured) {
      message.error("Requested Amount cannot exceed Sum Insured");
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('employeeName', editFormData.employeeName);
      formDataToSend.append('employeeId', editFormData.employeeId);
      formDataToSend.append('claimNumber', editFormData.claimNumber);
      formDataToSend.append('memberName', editFormData.memberName);
      formDataToSend.append('treatment', editFormData.treatment);
      formDataToSend.append('sumInsured', editFormData.sumInsured);
      formDataToSend.append('requestedAmount', editFormData.requestedAmount);
      formDataToSend.append('claimDate', editFormData.claimDate);
      formDataToSend.append('closeDate', editFormData.closeDate || '');
      formDataToSend.append('status', editFormData.claimStatus);
      formDataToSend.append('paymentStatus', editFormData.paymentStatus);
      formDataToSend.append('dateOfAdmission', editFormData.dateOfAdmission);
      formDataToSend.append('dateOfDischarge', editFormData.dateOfDischarge);
      formDataToSend.append('bankName', editFormData.bankName);
      formDataToSend.append('accountNumber', editFormData.accountNumber);
      formDataToSend.append('relationship', editFormData.relationship);
      formDataToSend.append('mobile', editFormData.mobile);
      formDataToSend.append('spouseName', editFormData.spouseName || '');
      formDataToSend.append('hospitalAddress', editFormData.hospitalAddress);
      
      const typeOfIllness = editFormData.typeOfIllness === 'Other' ? editFormData.otherIllness : editFormData.typeOfIllness;
      formDataToSend.append('typeOfIllness', typeOfIllness);
      if (editFormData.typeOfIllness === 'Other') {
        formDataToSend.append('otherIllness', editFormData.otherIllness);
      }

      formDataToSend.append('children', JSON.stringify(editFormData.children || []));

      // Append files only if they are File objects (newly uploaded)
      // If it's existing file (object with name property but not File), we don't send it, backend preserves old path
      if (editFormData.documents.employeePhoto instanceof File) formDataToSend.append('employeePhoto', editFormData.documents.employeePhoto);
      if (editFormData.documents.dischargeBill instanceof File) formDataToSend.append('dischargeBill', editFormData.documents.dischargeBill);
      if (editFormData.documents.pharmacyBill instanceof File) formDataToSend.append('pharmacyBill', editFormData.documents.pharmacyBill);
      if (editFormData.documents.paymentReceipt instanceof File) formDataToSend.append('paymentReceipt', editFormData.documents.paymentReceipt);

      const response = await insuranceClaimAPI.update(editingClaim.id, formDataToSend);
      const updatedClaim = { ...response.data, id: response.data._id };

      setClaims(prev => prev.map(claim =>
        claim.id === editingClaim.id ? updatedClaim : claim
      ));
      setEditingClaim(null);
      message.success('Claim updated successfully!');
    } catch (error) {
      console.error("Error updating claim:", error);
      message.error(error.response?.data?.message || 'Failed to update claim');
    }
  };

  const handleDeleteClaim = async (claimId) => {
    if (window.confirm('Are you sure you want to delete this claim?')) {
      try {
        await insuranceClaimAPI.delete(claimId);
        setClaims(prev => prev.filter(claim => claim.id !== claimId));
        message.success('Claim deleted successfully');
      } catch (error) {
        console.error("Error deleting claim:", error);
        message.error("Failed to delete claim");
      }
    }
  };

  // Navigation between steps
  const handleNextStep = (e) => {
    e?.preventDefault(); // Prevent any form submission

    let isValid = true;
    const newErrors = {};

    switch (currentStep) {
      case 1:
        // Validate employee details
        if (!formData.employeeId) newErrors.employeeId = true;
        if (!formData.employeeName) newErrors.employeeName = true; // Still check name even if auto-filled
        if (!formData.mobile || formData.mobile.length < 10) newErrors.mobile = true;
        if (!formData.bankName) newErrors.bankName = true;
        if (!formData.accountNumber || formData.accountNumber.length < 12) newErrors.accountNumber = true;

        if (formData.relationship === 'Married' && !formData.spouseName) {
          newErrors.spouseName = true;
        }

        // Validate children if relationship allows
        if (['Married', 'Divorced', 'Widowed'].includes(formData.relationship)) {
          formData.children.forEach((child, index) => {
            // "Children Details all fields required" -> Enforce validation for EVERY row
            if (!child.name) newErrors[`childName_${index}`] = 'Name is required';
            if (!child.age) newErrors[`childAge_${index}`] = 'Age is required';
          });
        }

        if (Object.keys(newErrors).length > 0) {
          isValid = false;
        }
        break;
      case 2:
        // Validate document uploads
        if (!formData.documents.employeePhoto) newErrors.employeePhoto = true;
        if (!formData.documents.dischargeBill) newErrors.dischargeBill = true;
        if (!formData.documents.pharmacyBill) newErrors.pharmacyBill = true;
        if (!formData.documents.paymentReceipt) newErrors.paymentReceipt = true;

        if (Object.keys(newErrors).length > 0) {
          isValid = false;
        }
        break;
    }

    setErrors(newErrors);

    if (!isValid) {
      message.error('Please fill in all required fields for this step.');
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handlePreviousStep = () => {
    setErrors({}); // Clear errors when going back
    setCurrentStep(currentStep - 1);
  };

  // UI Components for edit form
  const renderEditEmployeeDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee Name *
          </label>
          <input
            type="text"
            value={editFormData.employeeName}
            onChange={(e) => handleEditInputChange('employeeName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter employee name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee ID *
          </label>
          <input
            type="text"
            value={editFormData.employeeId}
            onChange={(e) => handleEditInputChange('employeeId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter employee ID"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Number *
          </label>
          <input
            type="tel"
            value={editFormData.mobile}
            onChange={(e) => handleEditInputChange('mobile', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter mobile number"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank Name *
          </label>
          <input
            type="text"
            value={editFormData.bankName}
            onChange={(e) => handleEditInputChange('bankName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter bank name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Number *
          </label>
          <input
            type="text"
            value={editFormData.accountNumber}
            onChange={(e) => handleEditInputChange('accountNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter account number"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship Status *
          </label>
          <select
            value={editFormData.relationship}
            onChange={(e) => handleEditInputChange('relationship', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
        </div>
      </div>

      {/* Spouse Details - Only show if Married */}
      {editFormData.relationship === 'Married' && (
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Spouse Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spouse Name *
              </label>
              <input
                type="text"
                value={editFormData.spouseName}
                onChange={(e) => handleEditInputChange('spouseName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
                placeholder="Enter spouse name"
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* Children Details */}
      {(editFormData.relationship === 'Married' || editFormData.relationship === 'Divorced' || editFormData.relationship === 'Widowed') && (
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Children Details</h3>
            <button
              type="button"
              disabled={!(editFormData.children?.[editFormData.children.length - 1]?.name && editFormData.children?.[editFormData.children.length - 1]?.age)}
              onClick={addEditChild}
              className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md ${
                !(editFormData.children?.[editFormData.children.length - 1]?.name && editFormData.children?.[editFormData.children.length - 1]?.age)
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-[#262760] bg-[#262760]/10 hover:bg-[#262760]/20'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760]`}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Child
            </button>
          </div>

          {editFormData.children.map((child, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Child {index + 1} Name *
                </label>
                <input
                  type="text"
                  value={child.name}
                  onChange={(e) => updateEditChild(index, 'name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
                  placeholder="Enter child name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age *
                </label>
                <input
                  type="number"
                  value={child.age}
                  onChange={(e) => updateEditChild(index, 'age', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
                  placeholder="Enter age"
                  min="0"
                  max="999"
                  required
                />
              </div>
              <div className="flex items-end">
                {editFormData.children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEditChild(index)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <MinusIcon className="h-4 w-4 mr-1" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderEditUploadDocuments = () => (
    <div className="space-y-6">
      <div className="bg-[#262760]/5 border border-[#262760]/20 rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#262760] mb-2">Uploaded Documents</h3>
        <p className="text-sm text-[#262760]/80">
          You can update the documents if needed. Maximum file size: 5MB per file.
        </p>
      </div>

      {[
        { key: 'employeePhoto', label: 'Employee Photo', required: true, accept: 'image/*' },
        { key: 'dischargeBill', label: 'Discharge Bill/Summary', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'pharmacyBill', label: 'Pharmacy Bills', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'paymentReceipt', label: 'Payment Receipts', required: true, accept: '.pdf,.jpg,.jpeg,.png' }
      ].map((doc) => (
        <div key={doc.key} className="border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {doc.label} {doc.required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex-1">
              <input
                type="file"
                onChange={(e) => {
                  handleEditFileUpload(doc.key, e.target.files[0]);
                  e.target.value = ''; // Reset input to allow re-selecting same file
                }}
                className="hidden"
                accept={doc.accept}
              />
              <div className="px-4 py-2 border border-gray-300 rounded-md text-center cursor-pointer hover:bg-[#262760]/10 hover:text-[#262760] transition-colors">
                Update File
              </div>
            </label>
            <span className="text-sm text-gray-500 flex-1">
              {editFormData.documents[doc.key]?.name || 'No file chosen'}
            </span>
          </div>
          {editFormData.documents[doc.key] && (
            <div className="mt-2 text-sm text-[#262760]">
              ✓ File selected: {editFormData.documents[doc.key].name}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Accepted formats: {doc.accept === 'image/*' ? 'JPG, JPEG, PNG' : 'PDF, JPG, JPEG, PNG'}
          </p>
        </div>
      ))}
    </div>
  );

  const renderEditTreatmentDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Member Name *
          </label>
          <input
            type="text"
            value={editFormData.memberName}
            onChange={(e) => handleEditInputChange('memberName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter member name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Number *
          </label>
          <input
            type="text"
            value={editFormData.claimNumber}
            onChange={(e) => handleEditInputChange('claimNumber', e.target.value)}
            maxLength={40}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter claim number"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Treatment/Medical Procedure *
          </label>
          <textarea
            value={editFormData.treatment}
            onChange={(e) => handleEditInputChange('treatment', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Describe the treatment received or medical procedure"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hospital Address *
          </label>
          <textarea
            value={editFormData.hospitalAddress}
            onChange={(e) => handleEditInputChange('hospitalAddress', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter hospital name and complete address"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type of Illness *
          </label>
          <select
            value={editFormData.typeOfIllness}
            onChange={(e) => handleEditInputChange('typeOfIllness', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
          >
            <option value="">Select Illness Type</option>
            {illnessTypes.map((illness, index) => (
              <option key={index} value={illness}>{illness}</option>
            ))}
          </select>
        </div>

        {editFormData.typeOfIllness === 'Other' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Other Illness *
            </label>
            <input
              type="text"
              value={editFormData.otherIllness}
              onChange={(e) => handleEditInputChange('otherIllness', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
              placeholder="Please specify illness"
              required={editFormData.typeOfIllness === 'Other'}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sum Insured Amount *
          </label>
          <input
            type="number"
            value={editFormData.sumInsured}
            onChange={(e) => handleEditInputChange('sumInsured', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter sum insured amount"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Requested Amount *
          </label>
          <input
            type="number"
            value={editFormData.requestedAmount}
            onChange={(e) => handleEditInputChange('requestedAmount', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            placeholder="Enter requested amount"
            min="0"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Admission *
          </label>
          <input
            type="date"
            value={editFormData.dateOfAdmission}
            onChange={(e) => handleEditInputChange('dateOfAdmission', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
            max="9999-12-31"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Discharge *
          </label>
          <input
            type="date"
            value={editFormData.dateOfDischarge}
            onChange={(e) => handleEditInputChange('dateOfDischarge', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
            max="9999-12-31"
            min={editFormData.dateOfAdmission || undefined}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Date *
          </label>
          <input
            type="date"
            value={editFormData.claimDate}
            onChange={(e) => handleEditInputChange('claimDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
            max="9999-12-31"
            min={editFormData.dateOfDischarge || undefined}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Close Date
          </label>
          <input
            type="date"
            value={editFormData.closeDate}
            onChange={(e) => handleEditInputChange('closeDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            max="9999-12-31"
            min={editFormData.claimDate || undefined}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Status *
          </label>
          <select
            value={editFormData.claimStatus}
            onChange={(e) => handleEditInputChange('claimStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Status *
          </label>
          <select
            value={editFormData.paymentStatus}
            onChange={(e) => handleEditInputChange('paymentStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            required
          >
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>
    </div>
  );

  // UI Components
  const renderStepIndicator = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center space-x-4">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center mt-3">
              <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${currentStep >= step.number
                ? 'bg-[#262760] border-[#262760] text-white'
                : 'border-gray-300 text-gray-500'
                }`}>
                <step.icon className="w-6 h-6" />
              </div>
              <span className={`mt-2 text-sm font-medium ${currentStep >= step.number ? 'text-[#262760]' : 'text-gray-500'
                }`}>
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 ${currentStep > step.number ? 'bg-[#262760]' : 'bg-gray-300'
                }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  const renderEmployeeDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Employee *
          </label>
          <select
            value={formData.employeeId}
            onChange={(e) => handleEmployeeSelect(e.target.value)}
            className={`w-full px-3 py-2 border ${errors.employeeId ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
          >
            <option value="">Select an employee</option>
            {employees.map(emp => (
              <option key={emp.employeeId} value={emp.employeeId}>{emp.name} - {emp.employeeId}</option>
            ))}
          </select>
          {errors.employeeId && <p className="mt-1 text-xs text-red-500">Employee is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee Name *
          </label>
          <input
            type="text"
            value={formData.employeeName}
            onChange={(e) => handleInputChange('employeeName', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.employeeName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter employee name"
            readOnly
          />
          {errors.employeeName && <p className="mt-1 text-xs text-red-500">Employee Name is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Employee ID *
          </label>
          <input
            type="text"
            value={formData.employeeId}
            onChange={(e) => handleInputChange('employeeId', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.employeeId ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter employee ID"
            readOnly
          />
          {errors.employeeId && <p className="mt-1 text-xs text-red-500">Employee ID is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mobile Number *
          </label>
          <input
            type="tel"
            value={formData.mobile}
            onChange={(e) => handleInputChange('mobile', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.mobile ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter mobile number"
          />
          {errors.mobile && <p className="mt-1 text-xs text-red-500">Mobile Number must be at least 10 digits</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank Name *
          </label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => handleInputChange('bankName', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.bankName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter bank name"
          />
          {errors.bankName && <p className="mt-1 text-xs text-red-500">Bank Name is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Number *
          </label>
          <input
            type="text"
            value={formData.accountNumber}
            onChange={(e) => handleInputChange('accountNumber', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.accountNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter account number"
          />
          {errors.accountNumber && <p className="mt-1 text-xs text-red-500">Account Number must be at least 12 digits</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Relationship Status *
          </label>
          <select
            value={formData.relationship}
            onChange={(e) => handleInputChange('relationship', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.relationship ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
          >
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Divorced">Divorced</option>
            <option value="Widowed">Widowed</option>
          </select>
          {errors.relationship && <p className="mt-1 text-xs text-red-500">Relationship is required</p>}
        </div>
      </div>

      {/* Spouse Details - Only show if Married */}
      {formData.relationship === 'Married' && (
        <div className="border-t pt-6 mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Spouse Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spouse Name *
              </label>
              <input
                type="text"
                value={formData.spouseName}
                onChange={(e) => handleInputChange('spouseName', e.target.value)}
                className={`w-full px-3 py-2 border ${errors.spouseName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                placeholder="Enter spouse name"
              />
              {errors.spouseName && <p className="mt-1 text-xs text-red-500">Spouse Name is required</p>}
            </div>
          </div>
        </div>
      )}

      {/* Children Details */}
      {(formData.relationship === 'Married' || formData.relationship === 'Divorced' || formData.relationship === 'Widowed') && (
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Children Details</h3>
            <button
              type="button"
              disabled={!(formData.children?.[formData.children.length - 1]?.name && formData.children?.[formData.children.length - 1]?.age)}
              onClick={addChild}
              className={`inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md ${
                !(formData.children?.[formData.children.length - 1]?.name && formData.children?.[formData.children.length - 1]?.age)
                  ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  : 'text-[#262760] bg-[#262760]/10 hover:bg-[#262760]/20'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760]`}
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              Add Child
            </button>
          </div>

          {formData.children.map((child, index) => (
            <div key={index} className="flex gap-4 mb-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Child Name *"
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${errors[`childName_${index}`] ? 'border-red-500' : ''}`}
                  value={child.name}
                  onChange={(e) => updateChild(index, 'name', e.target.value)}
                />
                {errors[`childName_${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`childName_${index}`]}</p>}
              </div>
              <div className="w-32">
                <input
                  type="number"
                  placeholder="Age *"
                  className={`w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${errors[`childAge_${index}`] ? 'border-red-500' : ''}`}
                  value={child.age}
                  onChange={(e) => updateChild(index, 'age', e.target.value)}
                  min="0"
                  max="999"
                />
                {errors[`childAge_${index}`] && <p className="text-red-500 text-xs mt-1">{errors[`childAge_${index}`]}</p>}
              </div>
              {formData.children.length > 1 && (
                <button
                  onClick={() => removeChild(index)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderUploadDocuments = () => (
    <div className="space-y-6">
      <div className="bg-[#262760]/5 border border-[#262760]/20 rounded-lg p-4">
        <h3 className="text-sm font-medium text-[#262760] mb-2">Required Documents</h3>
        <p className="text-sm text-[#262760]/80">
          Please upload clear and legible copies of all required documents. Maximum file size: 5MB per file.
        </p>
      </div>

      {[
        { key: 'employeePhoto', label: 'Employee Photo', required: true, accept: 'image/*' },
        { key: 'dischargeBill', label: 'Discharge Bill/Summary', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'pharmacyBill', label: 'Pharmacy Bills', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'paymentReceipt', label: 'Payment Receipts', required: true, accept: '.pdf,.jpg,.jpeg,.png' }
      ].map((doc) => (
        <div key={doc.key} className={`border ${errors[doc.key] ? 'border-red-500' : 'border-gray-200'} rounded-lg p-4`}>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {doc.label} {doc.required && <span className="text-red-500">*</span>}
          </label>
          <div className="flex items-center space-x-4">
            <label className="flex-1">
              <input
                type="file"
                onChange={(e) => {
                  handleFileUpload(doc.key, e.target.files[0]);
                  e.target.value = ''; // Reset input to allow re-selecting same file
                }}
                className="hidden"
                accept={doc.accept}
              />
              <div className={`px-4 py-2 border ${errors[doc.key] ? 'border-red-300 text-red-700' : 'border-gray-300'} rounded-md text-center cursor-pointer hover:bg-[#262760]/10 hover:text-[#262760] transition-colors`}>
                Choose File
              </div>
            </label>
            <div className="flex-1 flex items-center space-x-2">
              <span className="text-sm text-gray-500 truncate">
                {formData.documents[doc.key]?.name || 'No file chosen'}
              </span>
              {formData.documents[doc.key] && (
                <button
                  type="button"
                  onClick={() => handleRemoveFile(doc.key)}
                  className="text-gray-400 hover:text-red-500 p-1"
                  title="Remove file"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
          {errors[doc.key] && <p className="mt-1 text-xs text-red-500">{doc.label} is required</p>}
          {formData.documents[doc.key] && (
            <div className="mt-2 text-sm text-[#262760]">
              ✓ File selected: {formData.documents[doc.key].name}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Accepted formats: {doc.accept === 'image/*' ? 'JPG, JPEG, PNG' : 'PDF, JPG, JPEG, PNG'}
          </p>
        </div>
      ))}
    </div>
  );

  const renderTreatmentDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Member Name *
          </label>
          <input
            type="text"
            value={formData.memberName}
            onChange={(e) => handleInputChange('memberName', e.target.value)}
            onBlur={() => handleNameBlur('memberName')}
            className={`w-full px-3 py-2 border ${errors.memberName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter member name"
            maxLength={250}
          />
          {errors.memberName && <p className="mt-1 text-xs text-red-500">Member Name is required</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Number *
          </label>
          <input
            type="text"
            value={formData.claimNumber}
            onChange={(e) => handleInputChange('claimNumber', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.claimNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter claim number"
            maxLength={250}
          />
          {errors.claimNumber && <p className="mt-1 text-xs text-red-500">Claim Number is required</p>}
        </div>

        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Treatment/Medical Procedure *
          </label>
          <textarea
            value={formData.treatment}
            onChange={(e) => handleInputChange('treatment', e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border ${errors.treatment ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Describe the treatment received or medical procedure"
            maxLength={250}
          />
          {errors.treatment && <p className="mt-1 text-xs text-red-500">Treatment details are required</p>}
        </div>

        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hospital Address *
          </label>
          <textarea
            value={formData.hospitalAddress}
            onChange={(e) => handleInputChange('hospitalAddress', e.target.value)}
            rows={2}
            className={`w-full px-3 py-2 border ${errors.hospitalAddress ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter hospital name and complete address"
            maxLength={250}
          />
          {errors.hospitalAddress && <p className="mt-1 text-xs text-red-500">Hospital Address is required</p>}
        </div>


        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type of Illness *
          </label>
          <select
            value={formData.typeOfIllness}
            onChange={(e) => handleInputChange('typeOfIllness', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.typeOfIllness ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
          >
            <option value="">Select Illness Type</option>
            {illnessTypes.map((illness, index) => (
              <option key={index} value={illness}>{illness}</option>
            ))}
          </select>
          {errors.typeOfIllness && <p className="mt-1 text-xs text-red-500">Type of Illness is required</p>}
        </div>

        {formData.typeOfIllness === 'Other' && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Other Illness *
            </label>
            <input
              type="text"
              value={formData.otherIllness}
              onChange={(e) => handleInputChange('otherIllness', e.target.value)}
              className={`w-full px-3 py-2 border ${errors.otherIllness ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
              placeholder="Please specify illness"
              maxLength={250}
            />
            {errors.otherIllness && <p className="mt-1 text-xs text-red-500">Please specify the illness</p>}
          </div>
        )}

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sum Insured Amount *
          </label>
          <input
            type="number"
            value={formData.sumInsured}
            onChange={(e) => handleInputChange('sumInsured', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.sumInsured ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter sum insured amount"
            min="0"
          />
          {errors.sumInsured && <p className="mt-1 text-xs text-red-500">Sum Insured Amount is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Requested Amount *
          </label>
          <input
            type="number"
            value={formData.requestedAmount}
            onChange={(e) => handleInputChange('requestedAmount', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.requestedAmount ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            placeholder="Enter requested amount"
            min="0"
          />
          {errors.requestedAmount && <p className="mt-1 text-xs text-red-500">Requested Amount is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Admission *
          </label>
          <input
            type="date"
            value={formData.dateOfAdmission}
            onChange={(e) => handleInputChange('dateOfAdmission', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.dateOfAdmission ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            max="9999-12-31"
          />
          {errors.dateOfAdmission && <p className="mt-1 text-xs text-red-500">Admission Date is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date of Discharge *
          </label>
          <input
            type="date"
            value={formData.dateOfDischarge}
            onChange={(e) => handleInputChange('dateOfDischarge', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.dateOfDischarge ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            max="9999-12-31"
            min={formData.dateOfAdmission || undefined}
          />
          {errors.dateOfDischarge && <p className="mt-1 text-xs text-red-500">Discharge Date is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Date *
          </label>
          <input
            type="date"
            value={formData.claimDate}
            onChange={(e) => handleInputChange('claimDate', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.claimDate ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
            max="9999-12-31"
            min={formData.dateOfDischarge || undefined}
          />
          {errors.claimDate && <p className="mt-1 text-xs text-red-500">Claim Date is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Close Date
          </label>
          <input
            type="date"
            value={formData.closeDate}
            onChange={(e) => handleInputChange('closeDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
            max="9999-12-31"
            min={formData.claimDate || undefined}
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Claim Status *
          </label>
          <select
            value={formData.claimStatus}
            onChange={(e) => handleInputChange('claimStatus', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.claimStatus ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          {errors.claimStatus && <p className="mt-1 text-xs text-red-500">Claim Status is required</p>}
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Status *
          </label>
          <select
            value={formData.paymentStatus}
            onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
            className={`w-full px-3 py-2 border ${errors.paymentStatus ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
          >
            <option value="Unpaid">Unpaid</option>
            <option value="Paid">Paid</option>
            <option value="Rejected">Rejected</option>
          </select>
          {errors.paymentStatus && <p className="mt-1 text-xs text-red-500">Payment Status is required</p>}
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderEmployeeDetails();
      case 2:
        return renderUploadDocuments();
      case 3:
        return renderTreatmentDetails();
      default:
        return null;
    }
  };

  // Main Landing Page
  if (currentView === 'main') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-6 md:p-10">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900">Insurance Management</h1>
            
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-6 md:p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8">
              <button
                onClick={() => {
                  setCurrentView('newClaim');
                  setErrors({});
                }}
                className="group flex items-center justify-between w-full px-6 py-6 rounded-2xl border border-gray-200 hover:border-[#262760] hover:bg-[#262760]/5 transition-all duration-200 text-left"
              >
                <div className="flex items-center space-x-5">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-[#262760]/10 text-[#262760]">
                    <PlusIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-base md:text-lg font-semibold text-gray-900">New Insurance Claim</div>
                    <div className="text-xs md:text-sm text-gray-500">
                      Start a fresh insurance claim for an employee.
                    </div>
                  </div>
                </div>
                <span className="ml-4 text-[#262760] text-xl group-hover:translate-x-1 transition-transform duration-200">
                  →
                </span>
              </button>

              <button
                onClick={() => setCurrentView('claimHistory')}
                className="group flex items-center justify-between w-full px-6 py-6 rounded-2xl border border-gray-200 hover:border-[#262760] hover:bg-[#262760]/5 transition-all duration-200 text-left"
              >
                <div className="flex items-center space-x-5">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-[#262760]/10 text-[#262760]">
                    <DocumentTextIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-base md:text-lg font-semibold text-gray-900">Claim History</div>
                    <div className="text-xs md:text-sm text-gray-500">
                      View and manage all submitted insurance claims.
                    </div>
                  </div>
                </div>
                <span className="ml-4 text-[#262760] text-xl group-hover:translate-x-1 transition-transform duration-200">
                  →
                </span>
              </button>

              <button
                onClick={() => setCurrentView('insuranceRecords')}
                className="group flex items-center justify-between w-full px-6 py-6 rounded-2xl border border-gray-200 hover:border-[#262760] hover:bg-[#262760]/5 transition-all duration-200 text-left"
              >
                <div className="flex items-center space-x-5">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-[#262760]/10 text-[#262760]">
                    <UserIcon className="h-7 w-7" />
                  </div>
                  <div>
                    <div className="text-base md:text-lg font-semibold text-gray-900">Insurance Records</div>
                    <div className="text-xs md:text-sm text-gray-500">
                      Maintain member records and coverage details.
                    </div>
                  </div>
                </div>
                <span className="ml-4 text-[#262760] text-xl group-hover:translate-x-1 transition-transform duration-200">
                  →
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New Claim Form
  if (currentView === 'newClaim') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header with Back Button */}
          <div className="flex items-center mb-6 md:mb-8">
            <button
              onClick={() => {
                setCurrentView('main');
                setCurrentStep(1);
                setFormData({
                  employeeName: '',
                  employeeId: '',
                  mobile: '',
                  bankName: '',
                  accountNumber: '',
                  relationship: 'Single',
                  spouseName: '',
                  children: [{ name: '', age: '' }],
                  memberName: '',
                  claimNumber: '',
                  treatment: '',
                  sumInsured: '',
                  dateOfAdmission: '',
                  dateOfDischarge: '',
                  requestedAmount: '',
                  claimDate: '',
                  closeDate: '',
                  claimStatus: 'Pending',
                  paymentStatus: 'Unpaid',
                  hospitalAddress: '',
                  typeOfIllness: '',
                  otherIllness: '',
                  documents: {
                    employeePhoto: null,
                    dischargeBill: null,
                    pharmacyBill: null,
                    paymentReceipt: null
                  }
                });
                setErrors({});
              }}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 mr-4 shadow-sm"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Insurance
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">New Insurance Claim</h1>
              {/* Removed paragraph text */}
            </div>
          </div>

          {/* Form Container - Increased height */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-h-[600px]">
            {/* Step Indicator */}
            {renderStepIndicator()}

            <div className="p-6 md:p-8">
              <form onSubmit={handleSubmitClaim}>
                {/* Current Step Content */}
                <div className="mb-8">
                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    {renderCurrentStep()}
                  </div>
                </div>

                {/* Navigation Buttons - Removed Download ZIP button */}
                <div className="flex flex-col md:flex-row justify-between items-center mt-8 pt-8 border-t border-gray-200 space-y-4 md:space-y-0">
                  <div>
                    {currentStep > 1 && (
                      <button
                        type="button"
                        onClick={handlePreviousStep}
                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 shadow-sm"
                      >
                        Previous
                      </button>
                    )}
                  </div>

                  <div>
                    {currentStep < 3 ? (
                      <button
                        key="next-btn"
                        type="button"
                        onClick={handleNextStep}
                        className="px-8 py-4 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md text-lg"
                      >
                        Next Step
                      </button>
                    ) : (
                      <button
                        key="submit-btn"
                        type="submit"
                        className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md text-lg"
                      >
                        <PaperAirplaneIcon className="w-6 h-6 mr-3" />
                        Submit Claim
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Info */}
                <div className="text-center text-sm text-gray-500 mt-6">
                  Step {currentStep} of {steps.length} • Complete all sections to submit your claim
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Claim History View
  if (currentView === 'claimHistory') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6 md:mb-8">
            <button
              onClick={() => setCurrentView('main')}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 mr-4 shadow-sm"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Claim History</h1>
            </div>
          </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-h-[600px]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#262760]">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        S.No
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Employee Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Claim No
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Treatment
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Insured Amount
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Claim Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">
                        Payment Status
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-white uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {claims.map((claim, index) => (
                      <tr key={claim.id} className="hover:bg-[#262760]/5 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {claim.employeeId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {claim.employeeName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {claim.claimNumber}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {claim.treatment}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{claim.sumInsured?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(claim.claimDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                            {claim.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(claim.paymentStatus)}`}>
                            {claim.paymentStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setViewingClaim(claim)}
                              className="p-2 bg-[#262760] text-white hover:bg-[#1e2050] rounded-lg shadow-sm transition-all duration-150"
                              title="View Claim Details"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(claim)}
                              className="p-2 text-[#262760] hover:text-[#1e2050] hover:bg-[#262760]/10 rounded-lg transition-colors duration-150"
                              title="Download PDF"
                            >
                              <DocumentArrowDownIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingClaim(claim);
                                setEditFormData({
                                  employeeName: claim.employeeName || '',
                                  employeeId: claim.employeeId || '',
                                  mobile: claim.mobile || '',
                                  bankName: claim.bankName || '',
                                  accountNumber: claim.accountNumber || '',
                                  relationship: claim.relationship || 'Single',
                                  spouseName: claim.spouseName || '',
                                  children: claim.children || [{ name: '', age: '' }],
                                  memberName: claim.memberName || '',
                                  claimNumber: claim.claimNumber || '',
                                  treatment: claim.treatment || '',
                                  sumInsured: claim.sumInsured || '',
                                  dateOfAdmission: claim.dateOfAdmission || '',
                                  dateOfDischarge: claim.dateOfDischarge || '',
                                  requestedAmount: claim.requestedAmount || '',
                                  claimDate: claim.claimDate || '',
                                  closeDate: claim.closeDate || '',
                                  claimStatus: claim.status || 'Pending',
                                  paymentStatus: claim.paymentStatus || 'Unpaid',
                                  hospitalAddress: claim.hospitalAddress || '',
                                  typeOfIllness: claim.typeOfIllness || '',
                                  otherIllness: claim.otherIllness || '',
                                  documents: claim.documents || {
                                    employeePhoto: null,
                                    dischargeBill: null,
                                    pharmacyBill: null,
                                    paymentReceipt: null
                                  }
                                });
                              }}
                              className="p-2 text-[#262760] hover:text-[#1e2050] hover:bg-[#262760]/10 rounded-lg transition-colors duration-150"
                              title="Edit Claim"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClaim(claim.id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors duration-150"
                              title="Delete Claim"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {claims.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-gray-400 mb-4">
                      <DocumentTextIcon className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No claim history</h3>
                    <p className="text-gray-600 mb-6">Start by submitting your first insurance claim.</p>
                    <button
                      onClick={() => setCurrentView('newClaim')}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Create First Claim
                    </button>
                  </div>
                )}
              </div>
            </div>
        </div>

        {viewingClaim && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 transition-opacity duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto transform transition-all scale-100">
              
              {/* Modern Header with Gradient */}
              <div className="relative overflow-hidden bg-gradient-to-br from-[#262760] via-[#4f46e5] to-[#7c3aed] p-8 text-white">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center space-x-5">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner border border-white/10">
                      <DocumentTextIcon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold tracking-tight text-white">Claim Details</h2>
                      <div className="flex items-center mt-2 space-x-3 text-sm">
                        <span className="bg-black/20 px-3 py-1 rounded-md font-mono text-white/90 backdrop-blur-sm">#{viewingClaim.claimNumber}</span>
                        <span className="text-white/40">|</span>
                        <span className="text-white/90 flex items-center bg-white/10 px-3 py-1 rounded-md">
                          <ClockIcon className="w-4 h-4 mr-1.5" />
                          {new Date(viewingClaim.claimDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                     <div className={`px-4 py-2 rounded-xl text-sm font-bold shadow-lg backdrop-blur-md border border-white/20 flex items-center ${
                        viewingClaim.status === 'Approved' ? 'bg-green-500/20 text-green-50 border-green-400/30' : 
                        viewingClaim.status === 'Rejected' ? 'bg-red-500/20 text-red-50 border-red-400/30' : 'bg-yellow-500/20 text-yellow-50 border-yellow-400/30'
                     }`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${
                            viewingClaim.status === 'Approved' ? 'bg-green-400' : 
                            viewingClaim.status === 'Rejected' ? 'bg-red-400' : 'bg-yellow-400'
                        }`}></span>
                        {viewingClaim.status}
                     </div>
                     <button
                      onClick={() => setViewingClaim(null)}
                      className="group p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 text-white/80 hover:text-white border border-white/5 hover:border-white/20"
                    >
                      <XMarkIcon className="h-6 w-6 transform group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50/50">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  
                  {/* Left Column: Key Info & Status (4 cols) */}
                  <div className="md:col-span-4 space-y-6">
                    
                    {/* Status Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden relative group hover:shadow-lg transition-all duration-300">
                      <div className={`absolute top-0 left-0 w-1.5 h-full ${getPaymentStatusColor(viewingClaim.paymentStatus).includes('green') ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                      <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center">
                        Payment Status
                      </h4>
                      <div className="flex flex-col items-center justify-center py-4 bg-gray-50 rounded-xl border border-gray-100/50">
                        <div className={`text-2xl font-bold mb-1 ${getPaymentStatusColor(viewingClaim.paymentStatus).includes('green') ? 'text-green-600' : 'text-orange-600'}`}>
                          {viewingClaim.paymentStatus}
                        </div>
                        <p className="text-xs text-gray-400 text-center font-medium">
                          {viewingClaim.closeDate ? `Closed: ${new Date(viewingClaim.closeDate).toLocaleDateString()}` : 'Processing Request'}
                        </p>
                      </div>
                    </div>

                    {/* Financial Summary */}
                     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 group">
                      <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center group-hover:text-[#262760] transition-colors">
                        <BanknotesIcon className="w-4 h-4 mr-2" /> Financial Overview
                      </h4>
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                           <p className="text-xs text-gray-500 mb-1 font-medium">Sum Insured</p>
                           <p className="text-lg font-bold text-gray-700">₹{viewingClaim.sumInsured?.toLocaleString()}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-br from-[#262760]/5 to-[#4f46e5]/10 border border-[#262760]/10">
                           <p className="text-xs text-[#262760]/70 mb-1 font-bold uppercase">Requested Amount</p>
                           <p className="text-2xl font-bold text-[#262760]">₹{viewingClaim.requestedAmount?.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
                       <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-6 flex items-center">
                        <ClockIcon className="w-4 h-4 mr-2" /> Treatment Timeline
                      </h4>
                      <div className="relative pl-4 border-l-2 border-gray-100 space-y-8 ml-2">
                        
                        <div className="relative">
                           <div className="absolute -left-[21px] top-1 w-4 h-4 bg-white border-2 border-green-500 rounded-full shadow-sm"></div>
                           <p className="text-xs text-green-600 font-bold uppercase mb-0.5">Admission</p>
                           <p className="text-sm font-semibold text-gray-900">{new Date(viewingClaim.dateOfAdmission).toLocaleDateString()}</p>
                        </div>
                        
                        <div className="relative">
                           <div className="absolute -left-[21px] top-1 w-4 h-4 bg-white border-2 border-blue-500 rounded-full shadow-sm"></div>
                           <p className="text-xs text-blue-600 font-bold uppercase mb-0.5">Discharge</p>
                           <p className="text-sm font-semibold text-gray-900">{new Date(viewingClaim.dateOfDischarge).toLocaleDateString()}</p>
                        </div>

                        <div className="relative">
                           <div className="absolute -left-[21px] top-1 w-4 h-4 bg-white border-2 border-indigo-500 rounded-full shadow-sm"></div>
                           <p className="text-xs text-indigo-600 font-bold uppercase mb-0.5">Claimed</p>
                           <p className="text-sm font-semibold text-gray-900">{new Date(viewingClaim.claimDate).toLocaleDateString()}</p>
                        </div>

                        {viewingClaim.closeDate && (
                          <div className="relative">
                             <div className="absolute -left-[21px] top-1 w-4 h-4 bg-white border-2 border-gray-500 rounded-full shadow-sm"></div>
                             <p className="text-xs text-gray-600 font-bold uppercase mb-0.5">Closed</p>
                             <p className="text-sm font-semibold text-gray-900">{new Date(viewingClaim.closeDate).toLocaleDateString()}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Details (8 cols) */}
                  <div className="md:col-span-8 space-y-6">
                    
                    {/* Main Details Grid */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-50">
                         <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <UserIcon className="w-5 h-5" />
                         </div>
                         <h3 className="text-lg font-bold text-gray-900">Beneficiary Information</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="group">
                           <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block group-hover:text-indigo-600 transition-colors">Employee Name</label>
                           <div className="text-base font-semibold text-gray-800 bg-gray-50/50 p-2.5 rounded-lg border border-transparent group-hover:border-indigo-100 group-hover:bg-indigo-50/30 transition-all">{viewingClaim.employeeName}</div>
                        </div>

                        <div className="group">
                           <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block group-hover:text-indigo-600 transition-colors">Member Name</label>
                           <div className="text-base font-semibold text-gray-800 bg-gray-50/50 p-2.5 rounded-lg border border-transparent group-hover:border-indigo-100 group-hover:bg-indigo-50/30 transition-all">{viewingClaim.memberName}</div>
                        </div>
                        
                        <div className="group">
                           <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block group-hover:text-indigo-600 transition-colors">Relationship</label>
                           <div className="text-base font-semibold text-gray-800 bg-gray-50/50 p-2.5 rounded-lg border border-transparent group-hover:border-indigo-100 group-hover:bg-indigo-50/30 transition-all">{viewingClaim.relationship}</div>
                        </div>

                        <div className="group">
                           <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block group-hover:text-indigo-600 transition-colors">Contact Mobile</label>
                           <div className="text-base font-semibold text-gray-800 bg-gray-50/50 p-2.5 rounded-lg border border-transparent group-hover:border-indigo-100 group-hover:bg-indigo-50/30 transition-all">{viewingClaim.mobile}</div>
                        </div>
                        
                        <div className="group md:col-span-2">
                           <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block group-hover:text-indigo-600 transition-colors">Employee ID</label>
                           <div className="text-base font-mono font-semibold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg inline-block border border-gray-200">{viewingClaim.employeeId}</div>
                        </div>
                      </div>
                    </div>

                    {/* Medical & Hospital */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-lg transition-all duration-300">
                      <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-50">
                         <div className="p-2 bg-pink-50 rounded-lg text-pink-600">
                            <BuildingOfficeIcon className="w-5 h-5" />
                         </div>
                         <h3 className="text-lg font-bold text-gray-900">Medical Details</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="md:col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Hospital Address</label>
                            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-gray-100">
                              {viewingClaim.hospitalAddress}
                            </div>
                         </div>

                         <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Treatment / Procedure</label>
                            <div className="text-base font-semibold text-gray-800">{viewingClaim.treatment}</div>
                         </div>

                         <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Illness Type</label>
                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                              {viewingClaim.typeOfIllness}
                            </span>
                         </div>
                      </div>
                    </div>

                    {/* Bank Info */}
                     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 hover:shadow-lg transition-all duration-300">
                        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-gray-50">
                         <div className="p-2 bg-teal-50 rounded-lg text-teal-600">
                            <BuildingLibraryIcon className="w-5 h-5" />
                         </div>
                         <h3 className="text-lg font-bold text-gray-900">Bank Account</h3>
                      </div>

                        <div className="flex flex-col md:flex-row gap-8">
                           <div className="flex-1">
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Bank Name</label>
                              <div className="text-base font-semibold text-gray-800">{viewingClaim.bankName}</div>
                           </div>
                           <div className="flex-1">
                              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Account Number</label>
                              <div className="font-mono text-base font-semibold text-gray-800 bg-gray-100 px-4 py-2 rounded-lg tracking-wide border border-gray-200">{viewingClaim.accountNumber}</div>
                           </div>
                        </div>
                     </div>

                  </div>
                </div>

                {/* Family Section if exists */}
                 {(viewingClaim.spouseName || (viewingClaim.children && viewingClaim.children.length > 0)) && (
                  <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300">
                    <h4 className="text-sm font-bold text-gray-900 mb-6 flex items-center">
                      <UserGroupIcon className="w-5 h-5 mr-2 text-orange-500" />
                      Family Members
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {viewingClaim.spouseName && (
                        <div className="flex items-center p-4 bg-pink-50/50 rounded-xl border border-pink-100 hover:bg-pink-50 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold mr-4 text-sm border border-pink-200">SP</div>
                          <div>
                            <p className="text-[10px] text-pink-500 font-bold uppercase tracking-wider">Spouse</p>
                            <p className="text-sm font-bold text-gray-800">{viewingClaim.spouseName}</p>
                          </div>
                        </div>
                      )}
                      {viewingClaim.children && viewingClaim.children.map((child, index) => (
                        <div key={index} className="flex items-center p-4 bg-blue-50/50 rounded-xl border border-blue-100 hover:bg-blue-50 transition-colors">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-4 text-sm border border-blue-200">C{index+1}</div>
                          <div>
                            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Child ({child.age}y)</p>
                            <p className="text-sm font-bold text-gray-800">{child.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Footer Actions */}
              <div className="p-6 bg-white border-t border-gray-100 rounded-b-3xl flex justify-between items-center sticky bottom-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                 <button
                  onClick={() => handleDownloadPDF(viewingClaim)}
                  className="inline-flex items-center px-6 py-3 border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group"
                >
                  <DocumentArrowDownIcon className="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-600" />
                  Download PDF
                </button>
                <button
                  onClick={() => setViewingClaim(null)}
                  className="px-8 py-3 bg-gradient-to-r from-[#262760] to-[#4f46e5] text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transform hover:-translate-y-0.5 transition-all duration-200"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Claim Modal - Now shows full form */}
        {editingClaim && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-800">Edit Claim - {editingClaim.claimNumber}</h2>
                  <button
                    onClick={() => setEditingClaim(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <form onSubmit={handleUpdateClaim}>
                  {/* Multi-step form similar to new claim form */}
                  <div className="space-y-8">
                    {/* Employee Details Section */}
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <UserCircleIcon className="h-5 w-5 mr-2 text-[#262760]" />
                        Employee Details
                      </h3>
                      {renderEditEmployeeDetails()}
                    </div>

                    {/* Upload Documents Section */}
                    <div className="border-b pb-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <DocumentArrowUpIcon className="h-5 w-5 mr-2 text-[#262760]" />
                        Upload Documents
                      </h3>
                      {renderEditUploadDocuments()}
                    </div>

                    {/* Treatment Details Section */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <DocumentTextIcon className="h-5 w-5 mr-2 text-[#262760]" />
                        Treatment Details
                      </h3>
                      {renderEditTreatmentDetails()}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4 mt-8 pt-8 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setEditingClaim(null)}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md"
                    >
                      Update Claim
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {isRecordModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  {editingRecordIndex !== null ? 'Edit Insurance Member' : 'Add New Insurance Member'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setIsRecordModalOpen(false);
                    setRecordForm(initialRecordFormState);
                    setEditingRecordIndex(null);
                    setRecordFormErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmitRecord}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee ID
                      </label>
                      <select
                        value={recordForm.employeeId}
                        onChange={(e) => handleRecordEmployeeSelect(e.target.value)}
                        className={`w-full px-3 py-2 border ${recordFormErrors.employeeId ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                      >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.employeeId} value={emp.employeeId}>
                            {emp.employeeId} - {emp.name}
                          </option>
                        ))}
                      </select>
                      {recordFormErrors.employeeId && (
                        <p className="mt-1 text-xs text-red-500">Employee ID is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee Name
                      </label>
                      <input
                        type="text"
                        value={recordForm.employeeName}
                        onChange={(e) => handleRecordInputChange('employeeName', e.target.value)}
                        disabled={!!recordForm.employeeId}
                        className={`w-full px-3 py-2 border ${recordFormErrors.employeeName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${recordForm.employeeId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Enter employee name"
                      />
                      {recordFormErrors.employeeName && (
                        <p className="mt-1 text-xs text-red-500">Employee Name is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Division
                      </label>
                      <select
                        value={recordForm.department}
                        onChange={(e) => handleRecordInputChange('department', e.target.value)}
                        disabled={!!recordForm.employeeId}
                        className={`w-full px-3 py-2 border ${recordFormErrors.department ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${recordForm.employeeId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Select division</option>
                        {uniqueDepartments.map((dept, idx) => (
                          <option key={idx} value={dept}>{dept}</option>
                        ))}
                      </select>
                      {recordFormErrors.department && (
                        <p className="mt-1 text-xs text-red-500">Division is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={recordForm.designation}
                        onChange={(e) => handleRecordInputChange('designation', e.target.value)}
                        disabled={!!recordForm.employeeId}
                        className={`w-full px-3 py-2 border ${recordFormErrors.designation ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${recordForm.employeeId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Enter designation"
                      />
                      {recordFormErrors.designation && (
                        <p className="mt-1 text-xs text-red-500">Designation is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <select
                        value={recordForm.branch}
                        onChange={(e) => handleRecordInputChange('branch', e.target.value)}
                        disabled={!!recordForm.employeeId}
                        className={`w-full px-3 py-2 border ${recordFormErrors.branch ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${recordForm.employeeId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Select location</option>
                        <option value="Hosur">Hosur</option>
                        <option value="Chennai">Chennai</option>
                      </select>
                      {recordFormErrors.branch && (
                        <p className="mt-1 text-xs text-red-500">Location is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Joining
                      </label>
                      <input
                        type="date"
                        value={recordForm.dateOfJoining}
                        onChange={(e) => handleRecordInputChange('dateOfJoining', e.target.value)}
                        disabled={!!recordForm.employeeId}
                        className={`w-full px-3 py-2 border ${recordFormErrors.dateOfJoining ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${recordForm.employeeId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {recordFormErrors.dateOfJoining && (
                        <p className="mt-1 text-xs text-red-500">Date of Joining is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={recordForm.dateOfBirth}
                        onChange={(e) => handleRecordInputChange('dateOfBirth', e.target.value)}
                        disabled={!!recordForm.employeeId}
                        className={`w-full px-3 py-2 border ${recordFormErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${recordForm.employeeId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      />
                      {recordFormErrors.dateOfBirth && (
                        <p className="mt-1 text-xs text-red-500">Date of Birth is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="number"
                        value={recordForm.mobileNumber}
                        onChange={(e) => handleRecordInputChange('mobileNumber', e.target.value)}
                        disabled={!!recordForm.employeeId}
                        className={`w-full px-3 py-2 border ${recordFormErrors.mobileNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${recordForm.employeeId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Enter mobile number"
                      />
                      {recordFormErrors.mobileNumber && (
                        <p className="mt-1 text-xs text-red-500">Mobile Number is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={recordForm.email}
                        onChange={(e) => handleRecordInputChange('email', e.target.value)}
                        disabled={!!recordForm.employeeId}
                        className={`w-full px-3 py-2 border ${recordFormErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760] ${recordForm.employeeId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder="Enter email address"
                      />
                      {recordFormErrors.email && (
                        <p className="mt-1 text-xs text-red-500">Email is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nominee Name
                      </label>
                      <input
                        type="text"
                        value={recordForm.nomineeName}
                        onChange={(e) => handleRecordInputChange('nomineeName', e.target.value)}
                        className={`w-full px-3 py-2 border ${recordFormErrors.nomineeName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                        placeholder="Enter nominee name"
                      />
                      {recordFormErrors.nomineeName && (
                        <p className="mt-1 text-xs text-red-500">Nominee Name is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nominee Relationship
                      </label>
                      <input
                        type="text"
                        value={recordForm.nomineeRelationship}
                        onChange={(e) => handleRecordInputChange('nomineeRelationship', e.target.value)}
                        className={`w-full px-3 py-2 border ${recordFormErrors.nomineeRelationship ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                        placeholder="Enter relationship"
                      />
                      {recordFormErrors.nomineeRelationship && (
                        <p className="mt-1 text-xs text-red-500">Nominee Relationship is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nominee Mobile Number
                      </label>
                      <input
                        type="number"
                        value={recordForm.nomineeMobileNumber}
                        onChange={(e) => handleRecordInputChange('nomineeMobileNumber', e.target.value)}
                        className={`w-full px-3 py-2 border ${recordFormErrors.nomineeMobileNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                        placeholder="Enter nominee mobile number"
                      />
                      {recordFormErrors.nomineeMobileNumber && (
                        <p className="mt-1 text-xs text-red-500">Nominee Mobile Number is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Insured Amount
                      </label>
                      <input
                        type="text"
                        value="₹2,00,000"
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecordModalOpen(false);
                        setRecordForm(initialRecordFormState);
                        setEditingRecordIndex(null);
                        setRecordFormErrors({});
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md"
                    >
                      {editingRecordIndex !== null ? 'Update Member' : 'Save Member'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Insurance Records View
  if (currentView === 'insuranceRecords') {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-6 md:mb-8">
            <button
              onClick={() => setCurrentView('main')}
              className="inline-flex items-center px-4 py-2.5 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 mr-4 shadow-sm"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Insurance Records</h1>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden min-h-[600px]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Insurance Records</h2>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760] mr-3 ${showFilters ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}
                >
                  <FunnelIcon className="h-5 w-5 mr-2" />
                  Filters
                </button>
                <button
                  type="button"
                  onClick={openCreateRecordModal}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white text-sm font-medium rounded-lg shadow-sm hover:from-[#1e2050] hover:to-[#1a1b40] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#262760]"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add New Member
                </button>
              </div>
            </div>
            
            {showFilters && (
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Employee Name</label>
                    <input
                      type="text"
                      value={filters.employeeName}
                      onChange={(e) => handleFilterChange('employeeName', e.target.value)}
                      placeholder="Filter by name..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Employee ID</label>
                    <input
                      type="text"
                      value={filters.employeeId}
                      onChange={(e) => handleFilterChange('employeeId', e.target.value)}
                      placeholder="Filter by ID..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Division</label>
                    <select
                      value={filters.department}
                      onChange={(e) => handleFilterChange('department', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
                    >
                      <option value="">All Divisions</option>
                      {uniqueDepartments.map((dept, idx) => (
                        <option key={idx} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                    <select
                      value={filters.branch}
                      onChange={(e) => handleFilterChange('branch', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]"
                    >
                      <option value="">All Locations</option>
                      {uniqueBranches.map((branch, idx) => (
                        <option key={idx} value={branch}>{branch}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              {insuranceRecords.length > 0 ? (
                <div className="max-h-[480px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#262760] sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                          S.No
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                          Employee ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                          Employee Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                          Division
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                          Designation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                          Nominee Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                          Nominee Relationship
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                          Insured Amount
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-white uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRecords.length > 0 ? (
                        filteredRecords.map((record, index) => (
                        <tr key={`${record.employeeId}-${index}`} className="hover:bg-[#262760]/5 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.employeeId}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.employeeName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.department}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.designation}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.nomineeName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              {record.nomineeRelationship}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                            ₹2,00,000
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => setViewingRecord(record)}
                                className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors duration-150"
                                title="View Member Details"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditRecordModal(record)}
                                className="p-2 text-[#262760] hover:text-[#1e2050] hover:bg-[#262760]/10 rounded-lg transition-colors duration-150"
                                title="Edit Member"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRecord(record)}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors duration-150"
                                title="Delete Member"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                      ) : (
                        <tr>
                          <td colSpan="9" className="px-6 py-10 text-center text-gray-500">
                            <div className="flex flex-col items-center justify-center">
                              <MagnifyingGlassIcon className="h-10 w-10 text-gray-300 mb-2" />
                              <p className="text-sm">No matching records found</p>
                              <button 
                                onClick={clearFilters}
                                className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                Clear filters
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-16 text-center">
                  <div className="text-gray-400 mb-4">
                    <UserIcon className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No insurance records</h3>
                  <p className="text-gray-600 mb-6">Add members to manage insurance coverage records.</p>
                  <button
                    type="button"
                    onClick={openCreateRecordModal}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md"
                  >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Add New Member
                  </button>
                </div>
              )}
            </div>
          </div>

          {viewingRecord && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
                {/* Header */}
                <div className="relative bg-gradient-to-r from-[#262760] to-[#1e2050] p-8 overflow-hidden rounded-t-2xl">
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                  
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                        <UserIcon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">{viewingRecord.employeeName}</h2>
                        <p className="text-indigo-200 text-sm mt-1 flex items-center">
                          <span className="bg-white/10 px-2 py-0.5 rounded text-xs mr-2 border border-white/10">{viewingRecord.employeeId}</span>
                          {viewingRecord.designation} • {viewingRecord.department}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setViewingRecord(null)}
                      className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all duration-200"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>
                </div>

                <div className="p-8 space-y-8 bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                      <h4 className="text-sm font-bold text-[#262760] mb-6 flex items-center uppercase tracking-wider border-b border-gray-100 pb-3">
                        <UserCircleIcon className="h-5 w-5 mr-2 text-[#262760]" />
                        Personal Details
                      </h4>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Location</span>
                            <span className="text-sm font-medium text-gray-900">{viewingRecord.branch}</span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Date of Joining</span>
                            <span className="text-sm font-medium text-gray-900">
                              {viewingRecord.dateOfJoining ? new Date(viewingRecord.dateOfJoining).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Date of Birth</span>
                            <span className="text-sm font-medium text-gray-900">
                              {viewingRecord.dateOfBirth ? new Date(viewingRecord.dateOfBirth).toLocaleDateString() : ''}
                            </span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Insured Amount</span>
                            <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded inline-block">₹2,00,000</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
                      <h4 className="text-sm font-bold text-[#262760] mb-6 flex items-center uppercase tracking-wider border-b border-gray-100 pb-3">
                        <EnvelopeIcon className="h-5 w-5 mr-2 text-[#262760]" />
                        Contact Information
                      </h4>
                      <div className="space-y-4">
                        <div className="flex flex-col space-y-4">
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Email Address</span>
                            <div className="flex items-center text-sm font-medium text-gray-900">
                              <EnvelopeIcon className="h-4 w-4 mr-2 text-gray-400" />
                              {viewingRecord.email}
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Mobile Number</span>
                            <div className="flex items-center text-sm font-medium text-gray-900">
                              <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                              {viewingRecord.mobileNumber}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Nominee Information */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 md:col-span-2">
                      <h4 className="text-sm font-bold text-[#262760] mb-6 flex items-center uppercase tracking-wider border-b border-gray-100 pb-3">
                        <UserGroupIcon className="h-5 w-5 mr-2 text-[#262760]" />
                        Nominee Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Nominee Name</span>
                            <span className="text-sm font-medium text-gray-900">{viewingRecord.nomineeName}</span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Relationship</span>
                            <span className="text-sm font-medium text-gray-900">{viewingRecord.nomineeRelationship}</span>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Nominee Mobile</span>
                            <div className="flex items-center text-sm font-medium text-gray-900">
                              <PhoneIcon className="h-4 w-4 mr-2 text-gray-400" />
                              {viewingRecord.nomineeMobileNumber}
                            </div>
                          </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-end">
                  <button
                    onClick={() => setViewingRecord(null)}
                    className="px-8 py-2.5 bg-[#262760] text-white font-medium rounded-xl hover:bg-[#1e2050] transition-colors duration-200 shadow-lg shadow-indigo-500/20"
                  >
                    Close Details
                  </button>
                </div>
              </div>
            </div>
          )}

          {isRecordModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-800">
                    {editingRecordIndex !== null ? 'Edit Insurance Member' : 'Add New Insurance Member'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRecordModalOpen(false);
                      setRecordForm(initialRecordFormState);
                      setEditingRecordIndex(null);
                      setRecordFormErrors({});
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors	duration-200"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6">
                  <form onSubmit={handleSubmitRecord}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employee ID
                        </label>
                        <select
                          value={recordForm.employeeId}
                          onChange={(e) => handleRecordEmployeeSelect(e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.employeeId ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                        >
                          <option value="">Select Employee</option>
                          {employees.map((emp) => (
                            <option key={emp.employeeId} value={emp.employeeId}>
                              {emp.employeeId} - {emp.name}
                            </option>
                          ))}
                        </select>
                        {recordFormErrors.employeeId && (
                          <p className="mt-1 text-xs text-red-500">Employee ID is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Employee Name
                        </label>
                        <input
                          type="text"
                          value={recordForm.employeeName}
                          onChange={(e) => handleRecordInputChange('employeeName', e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.employeeName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                          placeholder="Enter employee name"
                        />
                        {recordFormErrors.employeeName && (
                          <p className="mt-1 text-xs text-red-500">Employee Name is required</p>
                        )}
                      </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Division
                      </label>
                      <select
                        value={recordForm.department}
                        onChange={(e) => handleRecordInputChange('department', e.target.value)}
                        className={`w-full px-3 py-2 border ${recordFormErrors.department ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                      >
                        <option value="">Select division</option>
                        {uniqueDepartments.map((dept, idx) => (
                          <option key={idx} value={dept}>{dept}</option>
                        ))}
                      </select>
                      {recordFormErrors.department && (
                        <p className="mt-1 text-xs text-red-500">Division is required</p>
                      )}
                    </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={recordForm.designation}
                          onChange={(e) => handleRecordInputChange('designation', e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.designation ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                          placeholder="Enter designation"
                        />
                        {recordFormErrors.designation && (
                          <p className="mt-1 text-xs text-red-500">Designation is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location
                        </label>
                        <select
                          value={recordForm.branch}
                          onChange={(e) => handleRecordInputChange('branch', e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.branch ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                        >
                          <option value="">Select location</option>
                          <option value="Hosur">Hosur</option>
                          <option value="Chennai">Chennai</option>
                        </select>
                        {recordFormErrors.branch && (
                          <p className="mt-1 text-xs text-red-500">Location is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Joining
                        </label>
                        <input
                          type="date"
                          value={recordForm.dateOfJoining}
                          onChange={(e) => handleRecordInputChange('dateOfJoining', e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.dateOfJoining ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                        />
                        {recordFormErrors.dateOfJoining && (
                          <p className="mt-1 text-xs text-red-500">Date of Joining is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date of Birth
                        </label>
                        <input
                          type="date"
                          value={recordForm.dateOfBirth}
                          onChange={(e) => handleRecordInputChange('dateOfBirth', e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.dateOfBirth ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                        />
                        {recordFormErrors.dateOfBirth && (
                          <p className="mt-1 text-xs text-red-500">Date of Birth is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mobile Number
                        </label>
                        <input
                          type="number"
                          value={recordForm.mobileNumber}
                          onChange={(e) => handleRecordInputChange('mobileNumber', e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.mobileNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                          placeholder="Enter mobile number"
                        />
                        {recordFormErrors.mobileNumber && (
                          <p className="mt-1 text-xs text-red-500">Mobile Number is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={recordForm.email}
                          onChange={(e) => handleRecordInputChange('email', e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                          placeholder="Enter email address"
                        />
                        {recordFormErrors.email && (
                          <p className="mt-1 text-xs text-red-500">Email is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nominee Name
                        </label>
                        <input
                          type="text"
                          value={recordForm.nomineeName}
                          onChange={(e) => handleRecordInputChange('nomineeName', e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.nomineeName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                          placeholder="Enter nominee name"
                        />
                        {recordFormErrors.nomineeName && (
                          <p className="mt-1 text-xs text-red-500">Nominee Name is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nominee Relationship
                        </label>
                        <input
                          type="text"
                          value={recordForm.nomineeRelationship}
                          onChange={(e) => handleRecordInputChange('nomineeRelationship', e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.nomineeRelationship ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                          placeholder="Enter relationship"
                        />
                        {recordFormErrors.nomineeRelationship && (
                          <p className="mt-1 text-xs text-red-500">Nominee Relationship is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nominee Mobile Number
                        </label>
                        <input
                          type="number"
                          value={recordForm.nomineeMobileNumber}
                          onChange={(e) => handleRecordInputChange('nomineeMobileNumber', e.target.value)}
                          className={`w-full px-3 py-2 border ${recordFormErrors.nomineeMobileNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-[#262760]`}
                          placeholder="Enter nominee mobile number"
                        />
                        {recordFormErrors.nomineeMobileNumber && (
                          <p className="mt-1 text-xs text-red-500">Nominee Mobile Number is required</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Insured Amount
                        </label>
                        <input
                          type="text"
                          value="₹2,00,000"
                          disabled
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-700 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecordModalOpen(false);
                          setRecordForm(initialRecordFormState);
                          setEditingRecordIndex(null);
                          setRecordFormErrors({});
                        }}
                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-3 bg-gradient-to-r from-[#262760] to-[#1e2050] text-white rounded-lg hover:from-[#1e2050] hover:to-[#1a1b40] transition-all duration-200 shadow-md"
                      >
                        {editingRecordIndex !== null ? 'Update Member' : 'Save Member'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default InsuranceManagement;
