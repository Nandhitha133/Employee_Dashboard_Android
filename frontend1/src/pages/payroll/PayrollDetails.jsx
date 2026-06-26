// src/pages/payroll/PayrollDetails.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Eye,
  Download,
  Calculator,
  MapPin,
  ChevronDown,
  X,
  AlertTriangle
} from 'lucide-react';
import useNotification from '../../hooks/useNotification';
import Notification from '../../components/Notifications/Notification';
import Modal from '../../components/Modals/Modal';
import { employeeAPI, payrollAPI, leaveAPI } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Salary Calculation Functions
const calculateSalaryFields = (salaryData) => {
  const basicDA = parseFloat(salaryData.basicDA) || 0;
  const hra = parseFloat(salaryData.hra) || 0;
  const specialAllowance = parseFloat(salaryData.specialAllowance) || 0;
  const gratuity = parseFloat(salaryData.gratuity) || 0;
  
  // Standard PF components
  let employeePF = parseFloat(salaryData.employeePfContribution) || 0;
  let employerPF = parseFloat(salaryData.employerPfContribution) || 0;
  
  const manualPf = parseFloat(salaryData.pf);
  if (!isNaN(manualPf) && manualPf !== (employeePF + employerPF)) {
    employeePF = manualPf / 2;
    employerPF = manualPf / 2;
  }
  
  const esi = parseFloat(salaryData.esi) || 0;
  const tax = parseFloat(salaryData.tax) || 0;
  const professionalTax = parseFloat(salaryData.professionalTax) || 0;
  const loanDeduction = parseFloat(salaryData.loanDeduction) || 0;
  const lop = parseFloat(salaryData.lop) || 0;
  const volunteerPF = parseFloat(salaryData.volunteerPF) || 0;

  // Total Earnings (Gross) = Basic + HRA + Special + Employee PF + Employer PF + ESI
  const totalEarnings = basicDA + hra + specialAllowance + employeePF + employerPF + esi;
  
  // Total Deductions = Employee PF + Employer PF + ESI + Tax + PT + Loan + LOP + Volunteer PF
  const totalDeductions = employeePF + employerPF + esi + tax + professionalTax + loanDeduction + lop + volunteerPF;
  
  // Net Salary = Gross - Total Deductions
  // This simplifies to (Basic + HRA + Special) - (Tax + PT + Loan + LOP + VolPF)
  const netSalary = totalEarnings - totalDeductions;
  const ctc = totalEarnings + gratuity;

  return {
    ...salaryData,
    basicDA,
    hra,
    specialAllowance,
    gratuity,
    pf: manualPf || (employeePF + employerPF),
    employeePfContribution: employeePF,
    employerPfContribution: employerPF,
    esi,
    tax,
    professionalTax,
    loanDeduction,
    lop,
    volunteerPF,
    totalEarnings,
    totalDeductions,
    netSalary,
    ctc
  };
};

// Robust date parsing helper
const parseDate = (dateVal) => {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) return d;
  
  // Handle DD-MM-YYYY or DD/MM/YYYY
  if (typeof dateVal === 'string') {
    const parts = dateVal.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) { // YYYY is last
        return new Date(parts[2], parts[1] - 1, parts[0]);
      } else if (parts[0].length === 4) { // YYYY is first
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
  }
  return null;
};

const initialSalaryData = {
  employeeId: '',
  employeeName: '',
  designation: '',
  department: '',
  dateOfJoining: new Date().toISOString().split('T')[0],
  employmentType: 'Permanent',
  
  // Salary Components
  basicDA: '',
  hra: '',
  specialAllowance: '',
  
  // Deductions
  pf: '',
  esi: '',
  tax: '',
  professionalTax: '',
  loanDeduction: '',
  lop: '',
  gratuity: '',
  volunteerPF: '',
  
  // Calculated Fields
  totalEarnings: 0,
  totalDeductions: 0,
  netSalary: 0,
  ctc: 0,
  
  location: '', 

  // Status
  status: 'Pending',
  
  // Bank Details
  bankName: '',
  accountNumber: '',
  ifscCode: ''
};

const PayrollDetails = () => {
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState(initialSalaryData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDesignation, setFilterDesignation] = useState('all');
  const [errors, setErrors] = useState({});
  const [viewRecord, setViewRecord] = useState(null);
  const [employeeLookupError, setEmployeeLookupError] = useState('');
  const [employeeList, setEmployeeList] = useState([]);
  const [lopPreview, setLopPreview] = useState(null);
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  
  // Custom dropdown state
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  // Load payroll data on mount
  useEffect(() => {
    payrollAPI.list()
      .then(res => {
        const items = Array.isArray(res.data) ? res.data : [];
        const mapped = items.map(p => ({ 
          ...p, 
          id: p._id,
          pf: p.pf || (Number(p.employeePfContribution || 0) + Number(p.employerPfContribution || 0)) || 0,
          lop: p.lop || 0
        }));
        setPayrollRecords(mapped);
      })
      .catch(() => {
        setPayrollRecords([]);
      });
  }, []);

  useEffect(() => {
    if (openDialog && formData.employeeId) {
      const base = calculateSalaryFields(formData);
      computeLopPreview(formData.employeeId, base);
    } else if (!openDialog) {
      setLopPreview(null);
    }
  }, [openDialog, formData.employeeId, formData.basicDA, formData.hra, formData.specialAllowance]);

  useEffect(() => {
    if (viewRecord && viewRecord.employeeId) {
      const base = calculateSalaryFields(viewRecord);
      computeLopPreview(viewRecord.employeeId, base);
    } else if (!viewRecord) {
      setLopPreview(null);
    }
  }, [viewRecord]);

  useEffect(() => {
    let mounted = true;

    const fetchEmployees = () => {
      employeeAPI.getAllEmployees()
        .then(res => {
          if (!mounted) return;
          const items = Array.isArray(res.data) ? res.data : [];
          const sortedItems = items.sort((a, b) => {
            const idA = (a.employeeId || '').toString();
            const idB = (b.employeeId || '').toString();
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
          });
          setEmployeeList(sortedItems);
        })
        .catch(() => {
          if (!mounted) return;
          setEmployeeList([]);
        });
    };

    const handleFocus = () => fetchEmployees();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchEmployees();
      }
    };

    fetchEmployees();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      mounted = false;
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleInputChange = (e) => {
    let { name, value } = e.target;

    // Fields that should only contain numbers
    const numericFields = [
      'basicDA', 'hra', 'specialAllowance', 'pf', 'esi', 'tax', 
      'professionalTax', 'loanDeduction', 'lop', 'gratuity', 'volunteerPF'
    ];

    if (numericFields.includes(name)) {
      value = value.replace(/[^0-9.]/g, '');
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    const salaryFields = [
      'basicDA', 'hra', 'specialAllowance', 'gratuity',
      'pf', 'esi', 'tax', 'professionalTax', 'loanDeduction', 'lop', 'volunteerPF'
    ];
    
    if (salaryFields.includes(name)) {
      setTimeout(() => {
        const updatedData = calculateSalaryFields({
          ...formData,
          [name]: value
        });
        setFormData(updatedData);
      }, 100);
    }
    
    if (name === 'employeeId') {
      setEmployeeLookupError('');
      const v = String(value || '').trim();
      if (v.length > 0) {
        employeeAPI.getAllEmployees()
          .then(res => {
            const items = Array.isArray(res.data) ? res.data : [];
            const emp = items.find(e => String(e.employeeId || '').toLowerCase() === v.toLowerCase());
            if (!emp) {
              setEmployeeLookupError('Employee not found');
              return;
            }
            const doj = emp.dateOfJoining || emp.dateofjoin || emp.hireDate || emp.createdAt || '';
            const dojParsed = parseDate(doj);
            const dojISO = dojParsed ? dojParsed.toISOString().split('T')[0] : formData.dateOfJoining;
            
            const empPF = Number(emp.pf || 0) || (Number(emp.employeePfContribution || 0) + Number(emp.employerPfContribution || 0));

            const filled = {
              employeeId: v,
              employeeName: emp.name || emp.employeename || '',
              designation: emp.designation || emp.position || emp.role || '',
              department: emp.department || emp.division || '',
              location: emp.location || emp.address || emp.currentAddress || '',
              dateOfJoining: dojISO,
              basicDA: emp.basicDA ?? formData.basicDA,
              hra: emp.hra ?? formData.hra,
              specialAllowance: emp.specialAllowance ?? formData.specialAllowance,
              gratuity: emp.gratuity ?? formData.gratuity,
              pf: empPF || formData.pf,
              employeePfContribution: emp.employeePfContribution || 0,
              employerPfContribution: emp.employerPfContribution || 0,
              esi: emp.esi ?? formData.esi,
              tax: emp.tax ?? formData.tax,
              professionalTax: emp.professionalTax ?? formData.professionalTax,
              loanDeduction: emp.loanDeduction ?? formData.loanDeduction,
              lop: emp.lop ?? formData.lop,
              volunteerPF: emp.volunteerPF || 0,
              bankName: emp.bankName || formData.bankName || '',
              accountNumber: emp.bankAccount || formData.accountNumber || '',
              ifscCode: emp.ifsc || formData.ifscCode || ''
            };
            const updatedData = calculateSalaryFields({ ...formData, ...filled });
            setFormData(updatedData);
          })
          .catch(() => {
            setEmployeeLookupError('Unable to load employee data');
          });
      }
    }
  };

  const computeLopPreview = async (empId, base) => {
    try {
      const res = await leaveAPI.getBalance(empId ? { employeeId: empId } : undefined);
      const data = res?.data;
      let balances = null;
      if (Array.isArray(data)) {
        const found = data.find(e => String(e.employeeId || '').toLowerCase() === String(empId || '').toLowerCase());
        balances = found?.balances || null;
      } else if (data && data.balances) {
        balances = data.balances;
      }
      const allFields = calculateSalaryFields(base);
      const totalEarnings = allFields.totalEarnings || 0;
      const netSalary = allFields.netSalary || 0;
      const currentLop = parseFloat(allFields.lop) || 0;
      const perDay = totalEarnings / 30;
      const cl = Number(balances?.casual?.balance ?? 0);
      const sl = Number(balances?.sick?.balance ?? 0);
      const pl = Number(balances?.privilege?.balance ?? 0);
      const negDays = Math.max(0, -cl) + Math.max(0, -sl) + Math.max(0, -pl);
      const lopAmount = Math.round(perDay * negDays);
      const adjustedNet = Math.round(netSalary + currentLop - lopAmount);
      setLopPreview({
        days: negDays,
        perDay,
        amount: lopAmount,
        adjustedNet,
        totalEarnings
      });
    } catch {
      const allFields = calculateSalaryFields(base);
      const totalEarnings = allFields.totalEarnings || 0;
      const netSalary = allFields.netSalary || 0;
      const currentLop = parseFloat(allFields.lop) || 0;
      setLopPreview({
        days: 0,
        perDay: totalEarnings / 30,
        amount: 0,
        adjustedNet: Math.round(netSalary + currentLop),
        totalEarnings
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'employeeId', 'employeeName', 'designation', 'department',
      'basicDA', 'hra'
    ];

    requiredFields.forEach(field => {
      if (!formData[field] || formData[field] === '') {
        newErrors[field] = 'This field is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    const updatedData = calculateSalaryFields(formData);
    
    if (editingIndex !== null) {
      // Update existing record
      try {
        const recId = payrollRecords[editingIndex]?.id || payrollRecords[editingIndex]?._id;
        const res = await payrollAPI.update(recId, updatedData);
        const saved = res.data;
        const updatedRecords = [...payrollRecords];
        updatedRecords[editingIndex] = { id: saved._id, ...saved };
        setPayrollRecords(updatedRecords);
        showSuccess('Payroll record updated successfully!');
      } catch (err) {
        showError('Failed to update payroll record');
      }
    } else {
      // Add new record
      try {
        const res = await payrollAPI.create({ ...updatedData, location: updatedData.location || 'Chennai' });
        const saved = res.data;
        setPayrollRecords(prev => [{ id: saved._id, ...saved }, ...prev]);
        showSuccess('Payroll record added successfully!');
      } catch (err) {
        showError('Failed to add payroll record');
      }
    }

    handleCloseDialog();
  };

  const handleEdit = (record) => {
    const idx = payrollRecords.findIndex(
      (r) => (r.id || r._id) === (record.id || record._id)
    );
    const effectiveIndex = idx === -1 ? null : idx;
    const base = effectiveIndex !== null ? payrollRecords[effectiveIndex] : record;
    const emp = employeeList.find(e => (e.employeeId || '').toString() === (base.employeeId || '').toString());
    const dojRaw = (emp && (emp.dateOfJoining || emp.dateofjoin || emp.hireDate)) || base.dateOfJoining || base.createdAt || '';
    const dojISO = dojRaw ? new Date(dojRaw).toISOString().split('T')[0] : '';
    const effectiveLocation = (emp && (emp.location || emp.address || emp.currentAddress)) || base.location || '';
    
    // Calculate standard PF (employee contribution + employer contribution)
    const stdPF = Number(base.employeePfContribution || 0) + Number(base.employerPfContribution || 0);
    const pfVal = stdPF > 0 ? stdPF : (Number(base.pf || 0) - Number(base.volunteerPF || 0));

    const data = {
      ...base,
      pf: pfVal > 0 ? pfVal : (base.pf || 0),
      location: effectiveLocation,
      dateOfJoining: dojISO || base.dateOfJoining || '',
      bankName: (emp && emp.bankName) ? emp.bankName : base.bankName,
      accountNumber: (emp && emp.bankAccount) ? emp.bankAccount : base.accountNumber,
      ifscCode: (emp && emp.ifsc) ? emp.ifsc : base.ifscCode
    };

    const calculatedData = calculateSalaryFields(data);
    setFormData(calculatedData);
    setEditingIndex(effectiveIndex);
    setOpenDialog(true);
  };

  const handleDelete = (record) => {
    setRecordToDelete(record);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    
    try {
      const recId = recordToDelete.id || recordToDelete._id;
      await payrollAPI.remove(recId);
      setPayrollRecords(prev => prev.filter(r => (r.id || r._id) !== recId));
      showSuccess('Payroll record deleted successfully!');
      setIsDeleteModalOpen(false);
      setRecordToDelete(null);
    } catch {
      showError('Failed to delete payroll record');
    }
  };

  const handleAddNew = () => {
    setFormData(initialSalaryData);
    setEditingIndex(null);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData(initialSalaryData);
    setEditingIndex(null);
    setErrors({});
  };

  const handleViewRecord = (record) => {
    const emp = employeeList.find(e => (e.employeeId || '').toString() === (record.employeeId || '').toString());
    const merged = {
      ...record,
      designation: emp?.designation || record.designation,
      department: emp?.department || record.department,
      bankName: (emp && emp.bankName) ? emp.bankName : record.bankName,
      accountNumber: (emp && emp.bankAccount) ? emp.bankAccount : record.accountNumber,
      ifscCode: (emp && emp.ifsc) ? emp.ifsc : record.ifscCode
    };
    setViewRecord(merged);
  };

  const handleCloseView = () => {
    setViewRecord(null);
  };

  const formatNumberIN = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return '0';
    }
    return num.toLocaleString('en-IN');
  };

  const handleDownloadAllPDF = () => {
    if (filteredRecords.length === 0) {
      showError('No records to download');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');

    doc.setFontSize(16);
    doc.text('Payroll Report', 14, 15);

    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 21);
    doc.text(`Total Records: ${filteredRecords.length}`, 14, 26);
    doc.text(
      `Location Filter: ${filterLocation === 'all' ? 'All Locations' : filterLocation}`,
      14,
      31
    );

    const head = [
      [
        'S.No',
        'Emp ID',
        'Name',
        'Designation',
        'Division',
        'Location',
        'Basic+DA',
        'HRA',
        'Special',
        'Total Earn',
        'PF',
        'ESI',
        'Tax',
        'Prof Tax',
        'Loan',
        'LOP',
        'Total Ded',
        'Vol PF',
        'Net Salary',
        'CTC',
        'Status'
      ]
    ];

    const body = filteredRecords.map((record, index) => {
      const emp = employeeList.find(e => e.employeeId === record.employeeId);
      const designation = emp?.designation || record.designation || '';
      const department = emp?.department || record.department || '';
      const location = emp?.location || record.location || 'N/A';

      return [
        index + 1,
        record.employeeId || '',
        record.employeeName || '',
        designation,
        department,
        location,
        formatNumberIN(record.basicDA),
        formatNumberIN(record.hra),
        formatNumberIN(record.specialAllowance),
        formatNumberIN(record.totalEarnings),
        formatNumberIN(record.pf),
        formatNumberIN(record.esi),
        formatNumberIN(record.tax),
        formatNumberIN(record.professionalTax),
        formatNumberIN(record.loanDeduction),
        formatNumberIN(record.lop),
        formatNumberIN(record.totalDeductions),
        formatNumberIN(record.volunteerPF || 0),
        formatNumberIN(record.netSalary),
        formatNumberIN(record.ctc),
        record.status || ''
      ];
    });

    autoTable(doc, {
      head,
      body,
      startY: 38,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [38, 39, 96], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 18 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 24 }
      }
    });

    doc.save(`Payroll_Report_${new Date().toISOString().split('T')[0]}.pdf`);

    showSuccess(`PDF report downloaded with ${filteredRecords.length} records`);
  };

  const handleDownloadExcel = () => {
    const headers = [
      'Employee ID',
      'Name',
      'Designation',
      'Department',
      'Location',
      'Basic+DA',
      'HRA',
      'Special Allowance',
      'Total Earnings',
      'PF',
      'ESI',
      'Tax',
      'Professional Tax',
      'Loan Deduction',
      'LOP',
      'Total Deductions',
      'Volunteer PF',
      'Net Salary',
      'CTC',
      'Status',
      'Bank Name',
      'Account Number',
      'IFSC Code'
    ];

    const data = filteredRecords.map(record => {
      const emp = employeeList.find(e => e.employeeId === record.employeeId);
      const designation = emp?.designation || record.designation || '';
      const department = emp?.department || record.department || '';
      const effectiveLocation = emp?.location || 
                                record.location || 
                                emp?.address || 
                                'Unknown';
      return [
        record.employeeId,
        record.employeeName,
        designation,
        department,
        effectiveLocation,
        record.basicDA,
        record.hra,
        record.specialAllowance,
        record.totalEarnings,
        record.pf,
        record.esi,
        record.tax,
        record.professionalTax,
        record.loanDeduction,
        record.lop,
        record.totalDeductions,
        record.volunteerPF || 0,
        record.netSalary,
        record.ctc,
        record.status,
        record.bankName,
        record.accountNumber,
        record.ifscCode
      ];
    });

    const wsData = [headers, ...data];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payroll Details");
    
    // Auto-size columns (optional but nice)
    const colWidths = headers.map(header => ({ wch: header.length + 5 }));
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `Payroll_Details_${new Date().toISOString().split('T')[0]}.xlsx`);

    showSuccess(`Excel report downloaded with ${filteredRecords.length} records`);
  };

  const handleCalculateSalary = () => {
    const updatedData = calculateSalaryFields(formData);
    setFormData(updatedData);
    showSuccess('Salary calculated successfully!');
  };

  const filteredRecords = payrollRecords.filter(record => {
    // Search filter
    const matchesSearch = 
      record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Location filter
    const effectiveLocation = employeeList.find(e => e.employeeId === record.employeeId)?.location || record.location;
    const matchesLocation = filterLocation === 'all' || effectiveLocation === filterLocation;

    // Department filter
    const matchesDepartment = filterDepartment === 'all' || record.department === filterDepartment;

    // Designation filter
    const matchesDesignation = filterDesignation === 'all' || record.designation === filterDesignation;
    
    return matchesSearch && matchesLocation && matchesDepartment && matchesDesignation;
  }).sort((a, b) => {
    const idA = (a.employeeId || '').toString();
    const idB = (b.employeeId || '').toString();
    return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
  });

  const formatCurrency = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'Chennai', label: 'Chennai' },
    { value: 'Hosur', label: 'Hosur' }
  ];

  const departments = [
    'all',
    ...new Set(
      payrollRecords
        .filter(item => filterDesignation === 'all' || item.designation === filterDesignation)
        .map(item => item.department)
        .filter(Boolean)
    )
  ];
  const designations = [
    'all',
    ...new Set(
      payrollRecords
        .filter(item => filterDepartment === 'all' || item.department === filterDepartment)
        .map(item => item.designation)
        .filter(Boolean)
    )
  ];


  return (
    <div className="p-6">
      {/* Header with Search Box */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        {/* Search Box in Header */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by Employee Name, ID"
            value={searchTerm}
            maxLength={20}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Success Message - Replaced by Notification */}

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Filter by Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" />
              Location
            </label>
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {locations.map(location => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Division
            </label>
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Division</option>
              {departments.filter(d => d !== 'all').map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Designation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Designation
            </label>
            <select
              value={filterDesignation}
              onChange={(e) => setFilterDesignation(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Designations</option>
              {designations.filter(d => d !== 'all').map(desig => (
                <option key={desig} value={desig}>
                  {desig}
                </option>
              ))}
            </select>
          </div>

          {/* Add Salary Record Box */}
          <div className="flex items-end">
            <button
              onClick={handleAddNew}
              className="w-full flex items-center justify-center px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Salary Record
            </button>
          </div>

          {/* Download All PDF Button */}
          <div className="flex items-end">
            <button
              onClick={handleDownloadAllPDF}
              className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </button>
          </div>

          {/* Download Excel Button */}
          <div className="flex items-end">
            <button
              onClick={handleDownloadExcel}
              className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredRecords.length} of {payrollRecords.length} records
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-auto h-[calc(100vh-320px)]">
          <table className="min-w-full divide-y divide-gray-200 relative">
            <thead className="bg-[#262760] sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Employee ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Employee Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Basic+DA
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Net Salary
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Account No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.map((record, index) => {
                const emp = employeeList.find(
                  e => (e.employeeId || '').toString() === (record.employeeId || '').toString()
                );

                return (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{record.employeeId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{record.employeeName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{emp?.designation || record.designation}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{formatCurrency(record.basicDA)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-bold text-green-600">
                      {formatCurrency(record.netSalary)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">
                      {emp?.bankAccount ||
                        record.accountNumber ||
                        "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">
                      {emp?.location ||
                        record.location ||
                        emp?.address ||
                        "Unknown"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewRecord(record)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {openDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingIndex !== null ? 'Edit Salary Record' : 'Add New Salary Record'}
              </h2>
              <button
                onClick={handleCloseDialog}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Close"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Employee Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Employee Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee ID *
                      </label>
                      <div className="relative">
                        <div
                          className={`w-full px-3 py-2 border rounded-lg cursor-pointer flex justify-between items-center bg-white ${
                            errors.employeeId ? 'border-red-500' : 'border-gray-300'
                          }`}
                          onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                        >
                          <span className={`${!formData.employeeId ? 'text-gray-500' : 'text-gray-900'}`}>
                            {formData.employeeId 
                              ? (() => {
                                  const selectedEmp = employeeList.find(e => e.employeeId === formData.employeeId);
                                  const nm = selectedEmp?.name || selectedEmp?.employeename || '';
                                  return `${formData.employeeId}${nm ? ` - ${nm}` : ''}`;
                                })()
                              : 'Select Employee ID'}
                          </span>
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        </div>

                        {isEmployeeDropdownOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col">
                            <div className="p-2 border-b bg-gray-50">
                              <div className="relative">
                                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  placeholder="Search by ID or Name..."
                                  value={employeeSearchTerm}
                                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  autoFocus
                                />
                              </div>
                            </div>
                            <div className="overflow-y-auto max-h-48">
                              <div 
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-500"
                                onClick={() => {
                                  handleInputChange({ target: { name: 'employeeId', value: '' } });
                                  setIsEmployeeDropdownOpen(false);
                                  setEmployeeSearchTerm('');
                                }}
                              >
                                Select Employee ID
                              </div>
                              {employeeList
                                .filter(emp => {
                                  const search = employeeSearchTerm.toLowerCase();
                                  const id = (emp.employeeId || '').toLowerCase();
                                  const nm = (emp.name || emp.employeename || '').toLowerCase();
                                  return id.includes(search) || nm.includes(search);
                                })
                                .map(emp => {
                                  const id = emp.employeeId || '';
                                  const nm = emp.name || emp.employeename || '';
                                  return (
                                    <div
                                      key={id || nm}
                                      className={`px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm ${
                                        formData.employeeId === id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                      }`}
                                      onClick={() => {
                                        handleInputChange({ target: { name: 'employeeId', value: id } });
                                        setIsEmployeeDropdownOpen(false);
                                        setEmployeeSearchTerm('');
                                      }}
                                    >
                                      {id} {nm ? `- ${nm}` : ''}
                                    </div>
                                  );
                                })}
                                {employeeList.filter(emp => {
                                  const search = employeeSearchTerm.toLowerCase();
                                  const id = (emp.employeeId || '').toLowerCase();
                                  const nm = (emp.name || emp.employeename || '').toLowerCase();
                                  return id.includes(search) || nm.includes(search);
                                }).length === 0 && (
                                  <div className="px-3 py-2 text-gray-500 text-sm text-center">
                                    No employees found
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                      </div>
                      {errors.employeeId && (
                        <p className="text-red-500 text-sm mt-1">{errors.employeeId}</p>
                      )}
                      {employeeLookupError && !errors.employeeId && (
                        <p className="text-red-500 text-sm mt-1">{employeeLookupError}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employee Name *
                      </label>
                      <input
                        type="text"
                        name="employeeName"
                        value={formData.employeeName}
                        onChange={handleInputChange}
                        readOnly
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none ${
                          errors.employeeName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation *
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        readOnly
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none ${
                          errors.designation ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Division *
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        readOnly
                        className={`w-full px-3 py-2 border rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none ${
                          errors.department ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        readOnly
                        placeholder="e.g. Chennai, Hosur"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date of Joining
                      </label>
                      <input
                        type="date"
                        name="dateOfJoining"
                        value={formData.dateOfJoining}
                        onChange={handleInputChange}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Employment Type
                      </label>
                      <select
                        name="employmentType"
                        value={formData.employmentType}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Permanent">Permanent</option>
                        <option value="Contract">Contract</option>
                        <option value="Intern">Intern</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Earnings & Allowances</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Basic + DA *', name: 'basicDA', error: errors.basicDA },
                      { label: 'HRA *', name: 'hra', error: errors.hra },
                      { label: 'Special Allowance', name: 'specialAllowance' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            name={field.name}
                            maxLength={7}
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              field.error ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <h3 className="text-lg font-medium text-purple-900 mb-4">Benefits (Part of CTC)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Gratuity', name: 'gratuity' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            name={field.name}
                            maxLength={7}
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-4">Deductions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'PF Contribution', name: 'pf' },
                      { label: 'ESI Contribution', name: 'esi' },
                      { label: 'Income Tax', name: 'tax' },
                      { label: 'Professional Tax', name: 'professionalTax' },
                      { label: 'Loan Deduction', name: 'loanDeduction' },
                      { label: 'Loss of Pay (LOP)', name: 'lop' },
                      { label: 'Volunteer PF', name: 'volunteerPF' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            name={field.name}
                            maxLength={7}
                            value={formData[field.name]}
                            onChange={handleInputChange}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Salary Summary */}
                <div>
                  <h3 className="text-lg font-medium text-green-900 mb-4">Salary Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Earnings', name: 'totalEarnings', color: 'text-green-600' },
                      { label: 'Total Deductions', name: 'totalDeductions', color: 'text-red-600' },
                      { label: 'Net Salary', name: 'netSalary', color: 'text-blue-600 font-bold' },
                      { label: 'Cost to Company (CTC)', name: 'ctc', color: 'text-purple-600' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="text"
                            value={formData[field.name]}
                            readOnly
                            className={`w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg ${field.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  {lopPreview && formData.employeeId && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Standard Month Days</label>
                          <input
                            type="text"
                            value={30}
                            readOnly
                            className="w-full pl-3 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Per Day Salary</label>
                          <div className="font-medium">{formatCurrency(lopPreview.perDay)}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Negative Leave Days</label>
                          <div className="font-medium text-red-600">{lopPreview.days}</div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">LOP Deduction</label>
                          <div className="font-medium text-red-600">{formatCurrency(lopPreview.amount)}</div>
                        </div>
                      </div>
                      <div className="mt-3">
                        <label className="text-sm font-medium text-gray-700">Net Salary (Adjusted for LOP)</label>
                        <div className="text-xl font-bold text-blue-700">{formatCurrency(lopPreview.adjustedNet)}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bank Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleInputChange}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        name="accountNumber"
                        value={formData.accountNumber}
                        onChange={handleInputChange}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        name="ifscCode"
                        value={formData.ifscCode}
                        onChange={handleInputChange}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseDialog}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingIndex !== null ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Record Modal */}
      {viewRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">
                Salary Details - {viewRecord.employeeName}
              </h2>
              <button
                onClick={handleCloseView}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-6">
                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Employee ID</label>
                    <p className="font-medium">{viewRecord.employeeId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Name</label>
                    <p className="font-medium">{viewRecord.employeeName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Designation</label>
                    <p>{viewRecord.designation}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Division</label>
                    <p>{viewRecord.department}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p>{employeeList.find(e => e.employeeId === viewRecord.employeeId)?.location || viewRecord.location || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Employment Type</label>
                    <p>{viewRecord.employmentType}</p>
                  </div>
                </div>

                {/* Earnings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Earnings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Basic + DA</label>
                      <p className="font-medium">{formatCurrency(viewRecord.basicDA)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">HRA</label>
                      <p className="font-medium">{formatCurrency(viewRecord.hra)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Special Allowance</label>
                      <p className="font-medium">{formatCurrency(viewRecord.specialAllowance)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Earnings</label>
                      <p className="font-bold text-green-600">{formatCurrency(viewRecord.totalEarnings)}</p>
                    </div>
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Benefits</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Gratuity</label>
                      <p className="font-medium">{formatCurrency(viewRecord.gratuity)}</p>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Deductions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Employee PF</label>
                      <p className="font-medium">{formatCurrency(viewRecord.employeePfContribution || (viewRecord.pf / 2))}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Employer PF</label>
                      <p className="font-medium">{formatCurrency(viewRecord.employerPfContribution || (viewRecord.pf / 2))}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">ESI Contribution</label>
                      <p className="font-medium">{formatCurrency(viewRecord.esi)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Gratuity</label>
                      <p className="font-medium">{formatCurrency(viewRecord.gratuity)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Income Tax</label>
                      <p className="font-medium">{formatCurrency(viewRecord.tax)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Professional Tax</label>
                      <p className="font-medium">{formatCurrency(viewRecord.professionalTax)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Loan Deduction</label>
                      <p className="font-medium">{formatCurrency(viewRecord.loanDeduction)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">LOP</label>
                      <p className="font-medium">{formatCurrency(viewRecord.lop)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Volunteer PF</label>
                      <p className="font-medium">{formatCurrency(viewRecord.volunteerPF)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Total Deductions</label>
                      <p className="font-bold text-red-600">{formatCurrency(viewRecord.totalDeductions)}</p>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Net Salary</label>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(viewRecord.netSalary)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">CTC</label>
                      <p className="text-xl font-bold text-purple-600">{formatCurrency(viewRecord.ctc)}</p>
                    </div>
                  </div>
                </div>
               

                {/* Bank Details */}
                {viewRecord.bankName && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Bank Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Bank Name</label>
                        <p>{viewRecord.bankName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Account Number</label>
                        <p>{viewRecord.accountNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">IFSC Code</label>
                        <p>{viewRecord.ifscCode}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex justify-end">
                <button
                  onClick={handleCloseView}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-10 h-10" />
            <p className="text-sm font-medium">
              Are you sure you want to delete the payroll record for <span className="font-bold">{recordToDelete?.employeeName}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast Notification */}
      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
};

export default PayrollDetails;
