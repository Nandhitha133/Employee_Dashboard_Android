// screens/Payroll/PayrollDetailsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { employeeAPI, payrollAPI, leaveAPI, Employee as ApiEmployee } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  blue: '#3498db',
  green: '#27ae60',
  red: '#e74c3c',
  purple: '#9b59b6',
  orange: '#f39c12',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  blueLight: '#EBF5FF',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC',
  selectedBg: '#E6F0FF',
  dropdownBg: '#FFFFFF',
  dropdownText: '#000000',
};

interface SalaryData {
  id?: string;
  _id?: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  dateOfJoining: string;
  employmentType: string;
  
  // Salary Components
  basicDA: string;
  hra: string;
  specialAllowance: string;
  
  // Deductions
  pf: string;
  esi: string;
  tax: string;
  professionalTax: string;
  loanDeduction: string;
  lop: string;
  gratuity: string;
  
  // Calculated Fields
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  ctc: number;
  
  location: string;
  status: string;
  
  // Bank Details
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

// Local Employee interface that matches what we need
interface LocalEmployee {
  _id?: string;
  id?: string;
  employeeId: string;
  name?: string;
  employeename?: string;
  designation?: string;
  position?: string;
  role?: string;
  department?: string;
  division?: string;
  location?: string;
  address?: string;
  currentAddress?: string;
  dateOfJoining?: string;
  dateofjoin?: string;
  hireDate?: string;
  createdAt?: string;
  basicDA?: string;
  hra?: string;
  specialAllowance?: string;
  gratuity?: string;
  pf?: string;
  esi?: string;
  tax?: string;
  professionalTax?: string;
  loanDeduction?: string;
  lop?: string;
  bankName?: string;
  bankAccount?: string;
  ifsc?: string;
}

interface LOPPreview {
  days: number;
  perDay: number;
  amount: number;
  adjustedNet: number;
  totalEarnings: number;
}

interface PayrollRecord {
  id?: string;
  _id?: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  basicDA: number;
  netSalary: number;
  location?: string;
  [key: string]: any;
}

const initialSalaryData: SalaryData = {
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
  
  // Calculated Fields
  totalEarnings: 0,
  totalDeductions: 0,
  netSalary: 0,
  ctc: 0,
  
  location: '',
  status: 'Pending',
  
  // Bank Details
  bankName: '',
  accountNumber: '',
  ifscCode: ''
};

// Salary Calculation Functions
const calculateSalaryFields = (salaryData: any) => {
  const basicDA = parseFloat(salaryData.basicDA) || 0;
  const hra = parseFloat(salaryData.hra) || 0;
  const specialAllowance = parseFloat(salaryData.specialAllowance) || 0;
  const gratuity = parseFloat(salaryData.gratuity) || 0;
  const pf = parseFloat(salaryData.pf) || 0;
  const esi = parseFloat(salaryData.esi) || 0;
  const tax = parseFloat(salaryData.tax) || 0;
  const professionalTax = parseFloat(salaryData.professionalTax) || 0;
  const loanDeduction = parseFloat(salaryData.loanDeduction) || 0;
  const lop = parseFloat(salaryData.lop) || 0;

  const totalEarnings = basicDA + hra + specialAllowance;
  const totalDeductions = pf + esi + tax + professionalTax + loanDeduction + lop;
  const netSalary = totalEarnings - totalDeductions;
  const ctc = totalEarnings + gratuity;

  return {
    ...salaryData,
    totalEarnings,
    totalDeductions,
    netSalary,
    ctc
  };
};

const PayrollDetailsScreen = () => {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState<string | null>(null);
  const [formData, setFormData] = useState<SalaryData>(initialSalaryData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDesignation, setFilterDesignation] = useState('all');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [employeeLookupError, setEmployeeLookupError] = useState('');
  const [employeeList, setEmployeeList] = useState<LocalEmployee[]>([]);
  const [lopPreview, setLopPreview] = useState<LOPPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Custom dropdown state
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');

  // Filter options
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [designationOptions, setDesignationOptions] = useState<string[]>([]);

  const locations = [
    { value: 'all', label: 'All Locations' },
    { value: 'Chennai', label: 'Chennai' },
    { value: 'Hosur', label: 'Hosur' }
  ];

  useEffect(() => {
    loadPayrollData();
    loadEmployees();
  }, []);

  useEffect(() => {
    if (openDialog && formData.employeeId) {
      const base = calculateSalaryFields(formData);
      computeLOPPreview(formData.employeeId, base);
    } else if (!openDialog) {
      setLopPreview(null);
    }
  }, [openDialog, formData.employeeId, formData.basicDA, formData.hra, formData.specialAllowance]);

  useEffect(() => {
    if (viewRecord && viewRecord.employeeId) {
      const base = calculateSalaryFields(viewRecord);
      computeLOPPreview(viewRecord.employeeId, base);
    } else if (!viewRecord) {
      setLopPreview(null);
    }
  }, [viewRecord]);

  const loadPayrollData = async () => {
    setLoading(true);
    try {
      const res = await payrollAPI.list();
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped = items.map((p: any) => ({ id: p._id, ...p }));
      setPayrollRecords(mapped);
    } catch (error) {
      console.error('Error loading payroll data:', error);
      setPayrollRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayrollData();
    loadEmployees();
  };

  const transformApiEmployee = (emp: any): LocalEmployee => ({
    _id: emp._id,
    id: emp.id,
    employeeId: emp.employeeId || '',
    name: emp.name || '',
    employeename: emp.employeename || '',
    designation: emp.designation || '',
    position: emp.position || '',
    role: emp.role || '',
    department: emp.department || '',
    division: emp.division || '',
    location: emp.location || '',
    address: emp.address || '',
    currentAddress: emp.currentAddress || '',
    dateOfJoining: emp.dateOfJoining || '',
    dateofjoin: emp.dateofjoin || '',
    hireDate: emp.hireDate || '',
    createdAt: emp.createdAt || '',
    basicDA: emp.basicDA || '',
    hra: emp.hra || '',
    specialAllowance: emp.specialAllowance || '',
    gratuity: emp.gratuity || '',
    pf: emp.pf || '',
    esi: emp.esi || '',
    tax: emp.tax || '',
    professionalTax: emp.professionalTax || '',
    loanDeduction: emp.loanDeduction || '',
    lop: emp.lop || '',
    bankName: emp.bankName || '',
    bankAccount: emp.bankAccount || '',
    ifsc: emp.ifsc || '',
  });

  const loadEmployees = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      const items = Array.isArray(res.data) ? res.data : [];
      // Transform API data to local interface
      const transformedItems = items.map(transformApiEmployee);
      
      // Sort by Employee ID naturally
      const sortedItems = transformedItems.sort((a, b) => {
        const idA = (a.employeeId || '').toString();
        const idB = (b.employeeId || '').toString();
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });
      setEmployeeList(sortedItems);
      
      // Extract unique departments and designations
      const depts = [...new Set(sortedItems.map(e => e.department || e.division).filter(Boolean))] as string[];
      const desigs = [...new Set(sortedItems.map(e => e.designation || e.position).filter(Boolean))] as string[];
      
      setDepartmentOptions(depts);
      setDesignationOptions(desigs);
    } catch (error) {
      console.error('Error loading employees:', error);
      setEmployeeList([]);
    }
  };

  const computeLOPPreview = async (empId: string, base: any) => {
    try {
      const res = await leaveAPI.getBalance(empId ? { employeeId: empId } : undefined);
      const data = res?.data;
      let balances = null;
      if (Array.isArray(data)) {
        const found = data.find((e: any) => String(e.employeeId || '').toLowerCase() === String(empId || '').toLowerCase());
        balances = found?.balances || null;
      } else if (data && data.balances) {
        balances = data.balances;
      }
      const totalEarnings = (base?.totalEarnings ?? (calculateSalaryFields(base).totalEarnings)) || 0;
      const perDay = totalEarnings / 30;
      const cl = Number(balances?.casual?.balance ?? 0);
      const sl = Number(balances?.sick?.balance ?? 0);
      const pl = Number(balances?.privilege?.balance ?? 0);
      const negDays = Math.max(0, -cl) + Math.max(0, -sl) + Math.max(0, -pl);
      const lopAmount = Math.round(perDay * negDays);
      const adjustedNet = Math.round(totalEarnings - lopAmount);
      setLopPreview({
        days: negDays,
        perDay,
        amount: lopAmount,
        adjustedNet,
        totalEarnings
      });
    } catch {
      const totalEarnings = (base?.totalEarnings ?? (calculateSalaryFields(base).totalEarnings)) || 0;
      setLopPreview({
        days: 0,
        perDay: totalEarnings / 30,
        amount: 0,
        adjustedNet: totalEarnings,
        totalEarnings
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Auto-calculate salary fields
    const salaryFields = [
      'basicDA', 'hra', 'specialAllowance', 'gratuity',
      'pf', 'esi', 'tax', 'professionalTax', 'loanDeduction', 'lop'
    ];
    
    if (salaryFields.includes(field)) {
      setTimeout(() => {
        const updatedData = calculateSalaryFields({
          ...formData,
          [field]: value
        });
        setFormData(updatedData);
      }, 100);
    }
  };

  const handleEmployeeSelect = (empId: string) => {
    const emp = employeeList.find(e => e.employeeId === empId);
    if (!emp) {
      setEmployeeLookupError('Employee not found');
      return;
    }
    
    const doj = emp.dateOfJoining || emp.dateofjoin || emp.hireDate || emp.createdAt || '';
    const dojISO = doj ? new Date(doj).toISOString().split('T')[0] : formData.dateOfJoining;
    
    const filled = {
      employeeId: empId,
      employeeName: emp.name || emp.employeename || '',
      designation: emp.designation || emp.position || emp.role || '',
      department: emp.department || emp.division || '',
      location: emp.location || emp.address || emp.currentAddress || '',
      dateOfJoining: dojISO,
      // Salary Components from employee profile when available
      basicDA: emp.basicDA ?? formData.basicDA,
      hra: emp.hra ?? formData.hra,
      specialAllowance: emp.specialAllowance ?? formData.specialAllowance,
      gratuity: emp.gratuity ?? formData.gratuity,
      pf: emp.pf ?? formData.pf,
      esi: emp.esi ?? formData.esi,
      tax: emp.tax ?? formData.tax,
      professionalTax: emp.professionalTax ?? formData.professionalTax,
      loanDeduction: emp.loanDeduction ?? formData.loanDeduction,
      lop: emp.lop ?? formData.lop,
      // Bank details
      bankName: emp.bankName || formData.bankName || '',
      accountNumber: emp.bankAccount || formData.accountNumber || '',
      ifscCode: emp.ifsc || formData.ifscCode || ''
    };
    
    const updatedData = calculateSalaryFields({ ...formData, ...filled });
    setFormData(updatedData);
    setIsEmployeeDropdownOpen(false);
    setEmployeeSearchTerm('');
    setEmployeeLookupError('');
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const requiredFields = [
      'employeeId', 'employeeName', 'designation', 'department',
      'basicDA', 'hra'
    ];

    requiredFields.forEach(field => {
      if (!formData[field as keyof SalaryData] || formData[field as keyof SalaryData] === '') {
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
    
    try {
      setLoading(true);
      if (editingIndex) {
        // Update existing record
        const recId = editingIndex;
        await payrollAPI.update(recId, updatedData);
        setSuccessMessage('Payroll record updated successfully!');
      } else {
        // Add new record
        await payrollAPI.create({ ...updatedData, location: updatedData.location || 'Chennai' });
        setSuccessMessage('Payroll record added successfully!');
      }
      
      loadPayrollData();
      handleCloseDialog();
    } catch (error) {
      console.error('Error saving payroll record:', error);
      setSuccessMessage(editingIndex ? 'Failed to update payroll record' : 'Failed to add payroll record');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleEdit = (record: any) => {
    setFormData(record);
    setEditingIndex(record.id || record._id);
    setOpenDialog(true);
  };

  const handleDelete = (record: any) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this payroll record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const recId = record.id || record._id;
              await payrollAPI.remove(recId);
              loadPayrollData();
              setSuccessMessage('Payroll record deleted successfully!');
              setTimeout(() => setSuccessMessage(''), 3000);
            } catch (error) {
              console.error('Error deleting record:', error);
              setSuccessMessage('Failed to delete payroll record');
              setTimeout(() => setSuccessMessage(''), 3000);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
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

  const handleViewRecord = (record: any) => {
    setViewRecord(record);
  };

  const handleCloseView = () => {
    setViewRecord(null);
  };

  const formatNumberIN = (value: number) => {
    return value.toLocaleString('en-IN');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Filter records
  const filteredRecords = payrollRecords.filter(record => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      record.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employeeId?.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  const isFilterApplied = filterLocation !== 'all' || filterDepartment !== 'all' || filterDesignation !== 'all';

  const renderEmployeeDropdown = () => {
    if (!isEmployeeDropdownOpen) return null;

    const filteredEmployees = employeeList.filter(emp => {
      const search = employeeSearchTerm.toLowerCase();
      const id = (emp.employeeId || '').toLowerCase();
      const nm = (emp.name || emp.employeename || '').toLowerCase();
      return id.includes(search) || nm.includes(search);
    });

    return (
      <Modal
        visible={isEmployeeDropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsEmployeeDropdownOpen(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setIsEmployeeDropdownOpen(false)}
        >
          <View style={{ backgroundColor: COLORS.white, margin: 20, borderRadius: 12, maxHeight: '80%' }}>
            <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.filterBg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.white }}>
                <Icon name="search" size={20} color={COLORS.gray} style={{ marginLeft: 8 }} />
                <TextInput
                  value={employeeSearchTerm}
                  onChangeText={setEmployeeSearchTerm}
                  placeholder="Search by ID or Name..."
                  style={{
                    flex: 1,
                    padding: 12,
                    fontSize: 14,
                    color: COLORS.textPrimary,
                  }}
                  placeholderTextColor={COLORS.gray}
                  autoFocus
                />
              </View>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              <TouchableOpacity
                onPress={() => {
                  setFormData({ ...formData, employeeId: '' });
                  setIsEmployeeDropdownOpen(false);
                  setEmployeeSearchTerm('');
                }}
                style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}
              >
                <Text style={{ color: COLORS.gray }}>Select Employee ID</Text>
              </TouchableOpacity>

              {filteredEmployees.map(emp => {
                const id = emp.employeeId || '';
                const nm = emp.name || emp.employeename || '';
                const isSelected = formData.employeeId === id;
                
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => handleEmployeeSelect(id)}
                    style={{
                      padding: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.border,
                      backgroundColor: isSelected ? COLORS.indigoLight : COLORS.white,
                    }}
                  >
                    <Text style={{ color: isSelected ? COLORS.indigo : COLORS.textPrimary, fontWeight: isSelected ? '600' : '400' }}>
                      {id} {nm ? `- ${nm}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {filteredEmployees.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.gray }}>No employees found</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Payroll Details" 
        showBack={true}
      />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Success Message */}
        {successMessage ? (
          <View style={{ backgroundColor: COLORS.success + '20', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: COLORS.success }}>{successMessage}</Text>
          </View>
        ) : null}

        {/* Header with Search */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="search" size={20} color={COLORS.gray} />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by Employee Name, ID"
              style={{
                flex: 1,
                marginLeft: 8,
                padding: 8,
                fontSize: 14,
                color: COLORS.textPrimary,
              }}
              placeholderTextColor={COLORS.gray}
            />
          </View>
        </View>

        {/* Filters Section */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Filters</Text>
            {isFilterApplied && (
              <TouchableOpacity onPress={() => {
                setFilterLocation('all');
                setFilterDepartment('all');
                setFilterDesignation('all');
              }}>
                <Text style={{ color: COLORS.red }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {/* Location Filter */}
            <View style={{ width: '50%', padding: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterLocation}
                  onValueChange={(value) => setFilterLocation(value)}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  {locations.map(loc => (
                    <Picker.Item key={loc.value} label={loc.label} value={loc.value} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Department Filter */}
            <View style={{ width: '50%', padding: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDepartment}
                  onValueChange={(value) => setFilterDepartment(value)}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Division" value="all" color={COLORS.gray} />
                  {departmentOptions.map(dept => (
                    <Picker.Item key={dept} label={dept} value={dept} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Designation Filter */}
            <View style={{ width: '50%', padding: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Designation</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDesignation}
                  onValueChange={(value) => setFilterDesignation(value)}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Designations" value="all" color={COLORS.gray} />
                  {designationOptions.map(desig => (
                    <Picker.Item key={desig} label={desig} value={desig} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Add Record Button */}
            <View style={{ width: '50%', padding: 4 }}>
              <TouchableOpacity
                onPress={handleAddNew}
                style={{
                  backgroundColor: COLORS.primary,
                  padding: 12,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 20,
                }}
              >
                <Icon name="add" size={18} color={COLORS.white} />
                <Text style={{ marginLeft: 4, color: COLORS.white, fontSize: 12 }}>Add Record</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 12, color: COLORS.gray }}>
              Showing {filteredRecords.length} of {payrollRecords.length} records
            </Text>
          </View>
        </View>

        {/* Payroll Table */}
        {loading && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 4 }}>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Employee ID</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Employee Name</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Designation</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4, textAlign: 'right' }}>Basic+DA</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4, textAlign: 'right' }}>Net Salary</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Location</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredRecords.map((record, index) => {
                  const effectiveLocation = employeeList.find(e => e.employeeId === record.employeeId)?.location || 
                                           record.location || 
                                           employeeList.find(e => e.employeeId === record.employeeId)?.address || 
                                           'Unknown';
                  
                  return (
                    <View key={record.id || record._id || index} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                      <Text style={{ width: 100, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{record.employeeId}</Text>
                      <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary }}>{record.employeeName}</Text>
                      <Text style={{ width: 120, fontSize: 12, color: COLORS.textSecondary }}>{record.designation}</Text>
                      <Text style={{ width: 100, fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(record.basicDA)}</Text>
                      <Text style={{ width: 100, fontSize: 12, color: COLORS.green, textAlign: 'right', fontWeight: '600' }}>{formatCurrency(record.netSalary)}</Text>
                      <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{effectiveLocation}</Text>
                      
                      {/* Actions */}
                      <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center' }}>
                        <TouchableOpacity onPress={() => handleEdit(record)} style={{ padding: 6 }}>
                          <Icon name="edit" size={18} color={COLORS.blue} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleViewRecord(record)} style={{ padding: 6 }}>
                          <Icon name="visibility" size={18} color={COLORS.indigo} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(record)} style={{ padding: 6 }}>
                          <Icon name="delete" size={18} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.gray }}>No records found</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={openDialog}
        transparent
        animationType="slide"
        onRequestClose={handleCloseDialog}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>
                {editingIndex ? 'Edit Salary Record' : 'Add New Salary Record'}
              </Text>
              <TouchableOpacity onPress={handleCloseDialog}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Employee Details */}
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 }}>Employee Details</Text>
              
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee ID *</Text>
                <TouchableOpacity
                  onPress={() => setIsEmployeeDropdownOpen(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: errors.employeeId ? COLORS.red : COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: COLORS.white,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: formData.employeeId ? COLORS.textPrimary : COLORS.gray }}>
                    {formData.employeeId 
                      ? (() => {
                          const selectedEmp = employeeList.find(e => e.employeeId === formData.employeeId);
                          const nm = selectedEmp?.name || selectedEmp?.employeename || '';
                          return `${formData.employeeId}${nm ? ` - ${nm}` : ''}`;
                        })()
                      : 'Select Employee ID'}
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
                </TouchableOpacity>
                {errors.employeeId ? <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.employeeId}</Text> : null}
                {employeeLookupError && !errors.employeeId ? <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{employeeLookupError}</Text> : null}
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee Name *</Text>
                <TextInput
                  value={formData.employeeName}
                  editable={false}
                  style={{
                    borderWidth: 1,
                    borderColor: errors.employeeName ? COLORS.red : COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.filterBg,
                    color: COLORS.textPrimary,
                  }}
                />
                {errors.employeeName ? <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.employeeName}</Text> : null}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Designation *</Text>
                  <TextInput
                    value={formData.designation}
                    editable={false}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.designation ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.filterBg,
                      color: COLORS.textPrimary,
                    }}
                  />
                  {errors.designation ? <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.designation}</Text> : null}
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division *</Text>
                  <TextInput
                    value={formData.department}
                    editable={false}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.department ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.filterBg,
                      color: COLORS.textPrimary,
                    }}
                  />
                  {errors.department ? <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.department}</Text> : null}
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
                  <TextInput
                    value={formData.location}
                    editable={false}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.filterBg,
                      color: COLORS.textPrimary,
                    }}
                  />
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Date of Joining</Text>
                  <TextInput
                    value={formData.dateOfJoining}
                    editable={false}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.filterBg,
                      color: COLORS.textPrimary,
                    }}
                  />
                </View>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employment Type</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={formData.employmentType}
                    onValueChange={(value) => handleInputChange('employmentType', value)}
                    style={{ height: 50, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="Permanent" value="Permanent" color={COLORS.dropdownText} />
                    <Picker.Item label="Contract" value="Contract" color={COLORS.dropdownText} />
                    <Picker.Item label="Intern" value="Intern" color={COLORS.dropdownText} />
                  </Picker>
                </View>
              </View>

              {/* Earnings */}
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16, marginBottom: 12 }}>Earnings & Allowances</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Basic + DA *</Text>
                  <TextInput
                    value={formData.basicDA}
                    onChangeText={(text) => handleInputChange('basicDA', text)}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.basicDA ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  {errors.basicDA ? <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.basicDA}</Text> : null}
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>HRA *</Text>
                  <TextInput
                    value={formData.hra}
                    onChangeText={(text) => handleInputChange('hra', text)}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.hra ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  {errors.hra ? <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.hra}</Text> : null}
                </View>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Special Allowance</Text>
                <TextInput
                  value={formData.specialAllowance}
                  onChangeText={(text) => handleInputChange('specialAllowance', text)}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              {/* Benefits */}
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.purple, marginTop: 16, marginBottom: 12 }}>Benefits (Part of CTC)</Text>
              
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Gratuity</Text>
                <TextInput
                  value={formData.gratuity}
                  onChangeText={(text) => handleInputChange('gratuity', text)}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              {/* Deductions */}
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.red, marginTop: 16, marginBottom: 12 }}>Deductions</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>PF Contribution</Text>
                  <TextInput
                    value={formData.pf}
                    onChangeText={(text) => handleInputChange('pf', text)}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>ESI Contribution</Text>
                  <TextInput
                    value={formData.esi}
                    onChangeText={(text) => handleInputChange('esi', text)}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Income Tax</Text>
                  <TextInput
                    value={formData.tax}
                    onChangeText={(text) => handleInputChange('tax', text)}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Professional Tax</Text>
                  <TextInput
                    value={formData.professionalTax}
                    onChangeText={(text) => handleInputChange('professionalTax', text)}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Loan Deduction</Text>
                  <TextInput
                    value={formData.loanDeduction}
                    onChangeText={(text) => handleInputChange('loanDeduction', text)}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Loss of Pay (LOP)</Text>
                  <TextInput
                    value={formData.lop}
                    onChangeText={(text) => handleInputChange('lop', text)}
                    keyboardType="numeric"
                    placeholder="Enter amount"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>

              {/* Salary Summary */}
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.green, marginTop: 16, marginBottom: 12 }}>Salary Summary</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Total Earnings</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, backgroundColor: COLORS.filterBg }}>
                    <Text style={{ color: COLORS.green, fontWeight: '600' }}>₹{formData.totalEarnings?.toLocaleString()}</Text>
                  </View>
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Total Deductions</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, backgroundColor: COLORS.filterBg }}>
                    <Text style={{ color: COLORS.red, fontWeight: '600' }}>₹{formData.totalDeductions?.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Net Salary</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, backgroundColor: COLORS.filterBg }}>
                    <Text style={{ color: COLORS.blue, fontWeight: '700' }}>₹{formData.netSalary?.toLocaleString()}</Text>
                  </View>
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>CTC</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, backgroundColor: COLORS.filterBg }}>
                    <Text style={{ color: COLORS.purple, fontWeight: '700' }}>₹{formData.ctc?.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {lopPreview && formData.employeeId && (
                <View style={{ backgroundColor: COLORS.blueLight, borderRadius: 8, padding: 12, marginTop: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.blue, marginBottom: 8 }}>LOP Preview</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Per Day Salary</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>₹{formatNumberIN(Math.round(lopPreview.perDay))}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Negative Leave Days</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.red }}>{lopPreview.days}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>LOP Deduction</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.red }}>₹{formatNumberIN(lopPreview.amount)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Adjusted Net Salary</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.blue }}>₹{formatNumberIN(lopPreview.adjustedNet)}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Bank Details */}
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16, marginBottom: 12 }}>Bank Details</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Bank Name</Text>
                  <TextInput
                    value={formData.bankName}
                    editable={false}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.filterBg,
                      color: COLORS.textPrimary,
                    }}
                  />
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Account Number</Text>
                  <TextInput
                    value={formData.accountNumber}
                    editable={false}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.filterBg,
                      color: COLORS.textPrimary,
                    }}
                  />
                </View>
              </View>

              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>IFSC Code</Text>
                <TextInput
                  value={formData.ifscCode}
                  editable={false}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.filterBg,
                    color: COLORS.textPrimary,
                  }}
                />
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={handleCloseDialog}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.gray, borderRadius: 6, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: loading ? COLORS.gray : COLORS.primary, borderRadius: 6 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>{editingIndex ? 'Update' : 'Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Record Modal */}
      <Modal
        visible={!!viewRecord}
        transparent
        animationType="slide"
        onRequestClose={handleCloseView}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>
                Salary Details - {viewRecord?.employeeName}
              </Text>
              <TouchableOpacity onPress={handleCloseView}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {viewRecord && (
              <ScrollView style={{ padding: 16 }}>
                {/* Employee Info */}
                <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>Employee Information</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Employee ID</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{viewRecord.employeeId}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Name</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{viewRecord.employeeName}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Designation</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{viewRecord.designation}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Division</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{viewRecord.department}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Location</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {employeeList.find(e => e.employeeId === viewRecord.employeeId)?.location || viewRecord.location || 'N/A'}
                      </Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Employment Type</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{viewRecord.employmentType}</Text>
                    </View>
                  </View>
                </View>

                {/* Earnings */}
                <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.green, marginBottom: 8 }}>Earnings</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Basic + DA</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{formatCurrency(viewRecord.basicDA)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>HRA</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{formatCurrency(viewRecord.hra)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Special Allowance</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{formatCurrency(viewRecord.specialAllowance)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Total Earnings</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.green }}>{formatCurrency(viewRecord.totalEarnings)}</Text>
                    </View>
                  </View>
                </View>

                {/* Benefits */}
                <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.purple, marginBottom: 8 }}>Benefits</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Gratuity</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{formatCurrency(viewRecord.gratuity)}</Text>
                    </View>
                  </View>
                </View>

                {/* Deductions */}
                <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.red, marginBottom: 8 }}>Deductions</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>PF Contribution</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{formatCurrency(viewRecord.pf)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>ESI Contribution</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{formatCurrency(viewRecord.esi)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Income Tax</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{formatCurrency(viewRecord.tax)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Professional Tax</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{formatCurrency(viewRecord.professionalTax)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Loan Deduction</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{formatCurrency(viewRecord.loanDeduction)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>LOP</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>{formatCurrency(viewRecord.lop)}</Text>
                    </View>
                    <View style={{ width: '100%', marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Total Deductions</Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.red }}>{formatCurrency(viewRecord.totalDeductions)}</Text>
                    </View>
                  </View>
                </View>

                {/* Summary */}
                <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.blue, marginBottom: 8 }}>Summary</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Net Salary</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.blue }}>{formatCurrency(viewRecord.netSalary)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>CTC</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.purple }}>{formatCurrency(viewRecord.ctc)}</Text>
                    </View>
                  </View>
                </View>

                {/* Bank Details */}
                {viewRecord.bankName && (
                  <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>Bank Details</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      <View style={{ width: '50%', marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, color: COLORS.gray }}>Bank Name</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textPrimary }}>{viewRecord.bankName}</Text>
                      </View>
                      <View style={{ width: '50%', marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, color: COLORS.gray }}>Account Number</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textPrimary }}>{viewRecord.accountNumber}</Text>
                      </View>
                      <View style={{ width: '100%', marginBottom: 8 }}>
                        <Text style={{ fontSize: 11, color: COLORS.gray }}>IFSC Code</Text>
                        <Text style={{ fontSize: 12, color: COLORS.textPrimary }}>{viewRecord.ifscCode}</Text>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={handleCloseView}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Employee Dropdown Modal */}
      {renderEmployeeDropdown()}

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Payroll Details • Finance • "
      />
    </SafeAreaView>
  );
};

export default PayrollDetailsScreen;