// screens/EmployeeManagementScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { employeeAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';

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
  darkBlue: '#1e2b58',
  lightBlue: '#EBF5FF',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC',
  selectedBg: '#E6F0FF',
  dropdownBg: '#FFFFFF',
  dropdownText: '#000000',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  amber: '#F59E0B',
  amberLight: '#FFFBEB',
};

// Division Designation Map
const DIVISION_DESIGNATION_MAP: Record<string, string[]> = {
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

// Extended Employee interface to match both local and API types
interface Employee {
  _id?: string;
  id?: string;
  employeeId?: string;
  name?: string;
  email?: string;
  mobileNo?: string;
  contactNumber?: string;
  division?: string;
  designation?: string;
  role?: string;
  position?: string;
  location?: string;
  branch?: string;
  status?: string;
  highestQualification?: string;
  qualification?: string;
  dateOfJoining?: string;
  dateofjoin?: string;
  previousExperience?: string;
  experience?: string;
  currentExperience?: string;
  gender?: string;
  dateOfBirth?: string;
  dob?: string;
  bloodGroup?: string;
  maritalStatus?: string;
  spouseName?: string;
  spouseContact?: string;
  nationality?: string;
  guardianName?: string;
  pan?: string;
  aadhaar?: string;
  passportNumber?: string;
  uan?: string;
  permanentAddress?: string;
  currentAddress?: string;
  emergencyContact?: string;
  emergencyMobile?: string;
  bankName?: string;
  bankAccount?: string;
  ifsc?: string;
  previousOrganizations?: Array<{
    organization: string;
    designation: string;
    position?: string;
    role?: string;
    startDate: string;
    endDate: string;
  }>;
}

interface FilterState {
  search: string;
  designation: string;
  division: string;
  location: string;
}

// Simple Employee Form Modal Component (inline to avoid import issues)
const EmployeeFormModal = ({ visible, onClose, employee, onSubmit }: any) => {
  const [formData, setFormData] = useState<any>({
    employeeId: '',
    name: '',
    email: '',
    mobileNo: '',
    division: '',
    designation: '',
    location: '',
    status: 'Active',
    gender: '',
    dateOfBirth: '',
    bloodGroup: '',
    maritalStatus: 'single',
    nationality: 'Indian',
    guardianName: '',
    pan: '',
    aadhaar: '',
    highestQualification: '',
    dateOfJoining: '',
    previousExperience: '',
    bankName: '',
    bankAccount: '',
    ifsc: '',
    permanentAddress: '',
    currentAddress: '',
    emergencyContact: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (employee) {
      setFormData({
        employeeId: employee.employeeId || '',
        name: employee.name || '',
        email: employee.email || '',
        mobileNo: employee.mobileNo || employee.contactNumber || '',
        division: employee.division || '',
        designation: employee.designation || employee.role || employee.position || '',
        location: employee.location || employee.branch || '',
        status: employee.status || 'Active',
        gender: employee.gender || '',
        dateOfBirth: employee.dateOfBirth || employee.dob || '',
        bloodGroup: employee.bloodGroup || '',
        maritalStatus: employee.maritalStatus || 'single',
        nationality: employee.nationality || 'Indian',
        guardianName: employee.guardianName || '',
        pan: employee.pan || '',
        aadhaar: employee.aadhaar || '',
        highestQualification: employee.highestQualification || employee.qualification || '',
        dateOfJoining: employee.dateOfJoining || employee.dateofjoin || '',
        previousExperience: employee.previousExperience || employee.experience || '',
        bankName: employee.bankName || '',
        bankAccount: employee.bankAccount || '',
        ifsc: employee.ifsc || '',
        permanentAddress: employee.permanentAddress || '',
        currentAddress: employee.currentAddress || '',
        emergencyContact: employee.emergencyContact || employee.emergencyMobile || '',
      });
    } else {
      resetForm();
    }
  }, [employee]);

  const resetForm = () => {
    setFormData({
      employeeId: '',
      name: '',
      email: '',
      mobileNo: '',
      division: '',
      designation: '',
      location: '',
      status: 'Active',
      gender: '',
      dateOfBirth: '',
      bloodGroup: '',
      maritalStatus: 'single',
      nationality: 'Indian',
      guardianName: '',
      pan: '',
      aadhaar: '',
      highestQualification: '',
      dateOfJoining: '',
      previousExperience: '',
      bankName: '',
      bankAccount: '',
      ifsc: '',
      permanentAddress: '',
      currentAddress: '',
      emergencyContact: '',
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.employeeId) newErrors.employeeId = 'Employee ID is required';
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.mobileNo) newErrors.mobileNo = 'Mobile number is required';
    if (!formData.division) newErrors.division = 'Division is required';
    if (!formData.designation) newErrors.designation = 'Designation is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
      resetForm();
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
      ...(field === 'division' ? { designation: '' } : {})
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const DIVISION_OPTIONS = [
    'TEKLA',
    'SDS',
    'HR/Admin',
    'DAS(Software)',
    'Electrical',
    'Management'
  ];

  const designationOptions = formData.division
    ? DIVISION_DESIGNATION_MAP[formData.division as keyof typeof DIVISION_DESIGNATION_MAP] || []
    : [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>
              {employee ? 'Edit Employee' : 'Add New Employee'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            {/* Basic Information */}
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 }}>Basic Information</Text>
            
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee ID *</Text>
              <TextInput
                value={formData.employeeId}
                onChangeText={(value) => handleChange('employeeId', value)}
                placeholder="Enter employee ID"
                style={{
                  borderWidth: 1,
                  borderColor: errors.employeeId ? COLORS.error : COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  backgroundColor: COLORS.white,
                  color: COLORS.textPrimary,
                }}
                placeholderTextColor={COLORS.gray}
              />
              {errors.employeeId ? <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.employeeId}</Text> : null}
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Full Name *</Text>
              <TextInput
                value={formData.name}
                onChangeText={(value) => handleChange('name', value)}
                placeholder="Enter full name"
                style={{
                  borderWidth: 1,
                  borderColor: errors.name ? COLORS.error : COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  backgroundColor: COLORS.white,
                  color: COLORS.textPrimary,
                }}
                placeholderTextColor={COLORS.gray}
              />
              {errors.name ? <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.name}</Text> : null}
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Email *</Text>
              <TextInput
                value={formData.email}
                onChangeText={(value) => handleChange('email', value)}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
                style={{
                  borderWidth: 1,
                  borderColor: errors.email ? COLORS.error : COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  backgroundColor: COLORS.white,
                  color: COLORS.textPrimary,
                }}
                placeholderTextColor={COLORS.gray}
              />
              {errors.email ? <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.email}</Text> : null}
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Mobile Number *</Text>
              <TextInput
                value={formData.mobileNo}
                onChangeText={(value) => handleChange('mobileNo', value)}
                placeholder="Enter mobile number"
                keyboardType="phone-pad"
                style={{
                  borderWidth: 1,
                  borderColor: errors.mobileNo ? COLORS.error : COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  backgroundColor: COLORS.white,
                  color: COLORS.textPrimary,
                }}
                placeholderTextColor={COLORS.gray}
              />
              {errors.mobileNo ? <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.mobileNo}</Text> : null}
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Gender</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={formData.gender}
                  onValueChange={(value) => handleChange('gender', value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="Select Gender" value="" color={COLORS.gray} />
                  <Picker.Item label="Male" value="male" color={COLORS.dropdownText} />
                  <Picker.Item label="Female" value="female" color={COLORS.dropdownText} />
                  <Picker.Item label="Other" value="other" color={COLORS.dropdownText} />
                </Picker>
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Date of Birth</Text>
              <TextInput
                value={formData.dateOfBirth}
                onChangeText={(value) => handleChange('dateOfBirth', value)}
                placeholder="YYYY-MM-DD"
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

            {/* Professional Information */}
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16, marginBottom: 12 }}>Professional Information</Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division *</Text>
              <View style={{ borderWidth: 1, borderColor: errors.division ? COLORS.error : COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={formData.division}
                  onValueChange={(value) => handleChange('division', value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="Select Division" value="" color={COLORS.gray} />
                  {DIVISION_OPTIONS.map(div => (
                    <Picker.Item key={div} label={div} value={div} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
              {errors.division ? <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.division}</Text> : null}
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Designation *</Text>
              <View style={{ borderWidth: 1, borderColor: errors.designation ? COLORS.error : COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={formData.designation}
                  onValueChange={(value) => handleChange('designation', value)}
                  enabled={!!formData.division}
                  style={{ height: 50, color: COLORS.dropdownText, opacity: formData.division ? 1 : 0.5 }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="Select Designation" value="" color={COLORS.gray} />
                  {designationOptions.map((des: string) => (
                    <Picker.Item key={des} label={des} value={des} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
              {errors.designation ? <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.designation}</Text> : null}
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
              <TextInput
                value={formData.location}
                onChangeText={(value) => handleChange('location', value)}
                placeholder="Enter location"
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

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Date of Joining</Text>
              <TextInput
                value={formData.dateOfJoining}
                onChangeText={(value) => handleChange('dateOfJoining', value)}
                placeholder="YYYY-MM-DD"
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

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Highest Qualification</Text>
              <TextInput
                value={formData.highestQualification}
                onChangeText={(value) => handleChange('highestQualification', value)}
                placeholder="Enter qualification"
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

            {/* Bank Information */}
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16, marginBottom: 12 }}>Bank Information</Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Bank Name</Text>
              <TextInput
                value={formData.bankName}
                onChangeText={(value) => handleChange('bankName', value)}
                placeholder="Enter bank name"
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

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Account Number</Text>
              <TextInput
                value={formData.bankAccount}
                onChangeText={(value) => handleChange('bankAccount', value)}
                placeholder="Enter account number"
                keyboardType="numeric"
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

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>IFSC Code</Text>
              <TextInput
                value={formData.ifsc}
                onChangeText={(value) => handleChange('ifsc', value)}
                placeholder="Enter IFSC code"
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

            {/* Address Information */}
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16, marginBottom: 12 }}>Address Information</Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Permanent Address</Text>
              <TextInput
                value={formData.permanentAddress}
                onChangeText={(value) => handleChange('permanentAddress', value)}
                placeholder="Enter permanent address"
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  backgroundColor: COLORS.white,
                  color: COLORS.textPrimary,
                  textAlignVertical: 'top',
                  minHeight: 80,
                }}
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Current Address</Text>
              <TextInput
                value={formData.currentAddress}
                onChangeText={(value) => handleChange('currentAddress', value)}
                placeholder="Enter current address"
                multiline
                numberOfLines={3}
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  backgroundColor: COLORS.white,
                  color: COLORS.textPrimary,
                  textAlignVertical: 'top',
                  minHeight: 80,
                }}
                placeholderTextColor={COLORS.gray}
              />
            </View>

            {/* Emergency Contact */}
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16, marginBottom: 12 }}>Emergency Contact</Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Emergency Contact Number</Text>
              <TextInput
                value={formData.emergencyContact}
                onChangeText={(value) => handleChange('emergencyContact', value)}
                placeholder="Enter emergency contact number"
                keyboardType="phone-pad"
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
          </ScrollView>

          {/* Footer Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
            <TouchableOpacity
              onPress={handleClose}
              style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.gray, borderRadius: 6, marginRight: 8 }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 6 }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>
                {employee ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const EmployeeManagementScreen = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    designation: '',
    division: '',
    location: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterEmployees();
  }, [employees, filters]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getAllEmployees();
      const data = response.data || [];
      // Sort by employeeId with proper null checks
      const sorted = data.sort((a: any, b: any) => {
        const idA = a.employeeId || '';
        const idB = b.employeeId || '';
        return idA.localeCompare(idB, undefined, { numeric: true });
      });
      setEmployees(sorted);
      setFilteredEmployees(sorted);
    } catch (error) {
      console.error('Error fetching employees:', error);
      showNotification('Failed to load employees', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const filterEmployees = () => {
    let filtered = [...employees];

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(emp =>
        emp.employeeId?.toLowerCase().includes(searchTerm) ?? false
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

    setFilteredEmployees(filtered);
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
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
      location: ''
    });
  };

  const isFilterApplied = Object.values(filters).some(value => value !== '');

  const divisionOptions = useMemo(() => {
    return Array.from(new Set(employees.map(e => e.division).filter(Boolean)));
  }, [employees]);

  const designationOptions = useMemo(() => {
    if (!filters.division) {
      return Array.from(
        new Set(
          employees
            .map(e => e.designation || e.role || e.position)
            .filter(Boolean)
        )
      ).sort((a, b) => a?.localeCompare(b || '') || 0);
    }
    return (DIVISION_DESIGNATION_MAP[filters.division] || []).slice().sort((a, b) => a.localeCompare(b));
  }, [employees, filters.division]);

  const locationOptions = useMemo(() => {
    return Array.from(new Set(employees.map(e => (e.location || e.branch)).filter(Boolean)));
  }, [employees]);

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleView = (employee: Employee) => {
    setViewingEmployee(employee);
    setShowViewModal(true);
  };

  const handleDelete = (id: string) => {
    setEmployeeToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    try {
      await employeeAPI.deleteEmployee(employeeToDelete);
      fetchEmployees();
      showNotification('Employee deleted successfully', 'success');
      setShowDeleteModal(false);
      setEmployeeToDelete(null);
    } catch (error) {
      console.error('Error deleting employee:', error);
      showNotification('Error deleting employee', 'error');
    }
  };

  const handleFormSubmit = async (formData: Partial<Employee>) => {
    try {
      if (editingEmployee) {
        await employeeAPI.updateEmployee(editingEmployee._id || editingEmployee.id || '', formData);
        showNotification('Employee updated successfully', 'success');
      } else {
        await employeeAPI.createEmployee(formData);
        showNotification('Employee added successfully', 'success');
      }
      setShowModal(false);
      setEditingEmployee(null);
      fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      showNotification('Error saving employee', 'error');
    }
  };

  const exportToCSV = async () => {
    const headers = [
      'S.No', 'Employee ID', 'Full Name', 'Division', 'Designation',
      'Highest Qualification', 'Date of Joining', 'Experience', 'Contact', 'Status'
    ];

    const rows = filteredEmployees.map((emp, index) => [
      (index + 1).toString(),
      emp.employeeId || '',
      `"${emp.name || ''}"`,
      emp.division || '',
      emp.designation || emp.role || emp.position || '',
      emp.highestQualification || emp.qualification || '',
      formatDate(emp.dateOfJoining || emp.dateofjoin),
      calculateServiceYears(emp.dateOfJoining || emp.dateofjoin) || emp.currentExperience || emp.experience || '',
      emp.mobileNo || emp.contactNumber || '',
      emp.status || 'Active'
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const fileName = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csvContent, 'utf8');
      
      const shareOptions = {
        title: 'Export Employees Data',
        message: 'Employee List',
        url: `file://${filePath}`,
        type: 'text/csv',
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const calculateServiceYears = (dateOfJoining?: string) => {
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

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'Active':
        return { backgroundColor: '#DCFCE7', color: '#166534' };
      case 'Inactive':
        return { backgroundColor: '#F3F4F6', color: '#4B5563' };
      case 'Suspended':
        return { backgroundColor: '#FEE2E2', color: '#B91C1C' };
      default:
        return { backgroundColor: '#F3F4F6', color: '#4B5563' };
    }
  };

  const renderViewModal = () => {
    if (!viewingEmployee) return null;

    return (
      <Modal
        visible={showViewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 50, height: 50, borderRadius: 12, backgroundColor: COLORS.secondary, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.white }}>
                    {viewingEmployee.name ? viewingEmployee.name.charAt(0).toUpperCase() : 'E'}
                  </Text>
                </View>
                <View>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>{viewingEmployee.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                      {viewingEmployee.designation || viewingEmployee.role || viewingEmployee.position}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.blue, marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 }}>
                      {viewingEmployee.employeeId}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Personal Information */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="person" size={20} color={COLORS.blue} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginLeft: 8 }}>Personal Information</Text>
                </View>

                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 16 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Employee ID</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.employeeId || '-'}</Text>
                    </View>
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Gender</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.gender || '-'}</Text>
                    </View>
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Date of Birth</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{formatDate(viewingEmployee.dateOfBirth || viewingEmployee.dob)}</Text>
                    </View>
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Qualification</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.qualification || viewingEmployee.highestQualification || '-'}</Text>
                    </View>
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Blood Group</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.bloodGroup || '-'}</Text>
                    </View>
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Marital Status</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, textTransform: 'capitalize' } as any}>{viewingEmployee.maritalStatus || '-'}</Text>
                    </View>
                    {viewingEmployee.maritalStatus === 'married' && (
                      <>
                        <View style={{ width: '50%', padding: 4 }}>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>Spouse Name</Text>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.spouseName || '-'}</Text>
                        </View>
                        <View style={{ width: '50%', padding: 4 }}>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>Spouse Contact</Text>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.spouseContact || '-'}</Text>
                        </View>
                      </>
                    )}
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Nationality</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.nationality || '-'}</Text>
                    </View>
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Guardian Name</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.guardianName || '-'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Contact Information */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="phone" size={20} color={COLORS.green} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginLeft: 8 }}>Contact Information</Text>
                </View>

                <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Mobile Number</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.contactNumber || viewingEmployee.mobileNo || '-'}</Text>
                    </View>
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Email Address</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.email || '-'}</Text>
                    </View>
                    <View style={{ width: '33.33%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Emergency Contact</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.emergencyContact || viewingEmployee.emergencyMobile || '-'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Professional Information */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="work" size={20} color={COLORS.purple} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginLeft: 8 }}>Professional Information</Text>
                </View>

                <View style={{ backgroundColor: '#F3E8FF', borderRadius: 12, padding: 16 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '25%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Designation</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.designation || viewingEmployee.role || viewingEmployee.position || '-'}</Text>
                    </View>
                    <View style={{ width: '25%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Division</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.division || '-'}</Text>
                    </View>
                    <View style={{ width: '25%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Date of Joining</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{formatDate(viewingEmployee.dateOfJoining || viewingEmployee.dateofjoin)}</Text>
                    </View>
                    <View style={{ width: '25%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Previous Experience</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.previousExperience || '-'}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Bank Information */}
              <View style={{ marginBottom: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="account-balance" size={20} color={COLORS.amber} />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginLeft: 8 }}>Bank Information</Text>
                </View>

                <View style={{ backgroundColor: '#FFFBEB', borderRadius: 12, padding: 16 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '25%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Bank Name</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.bankName || '-'}</Text>
                    </View>
                    <View style={{ width: '25%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Account Number</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.bankAccount || '-'}</Text>
                    </View>
                    <View style={{ width: '25%', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>IFSC Code</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewingEmployee.ifsc || '-'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer Actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setShowViewModal(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.gray, borderRadius: 6, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowViewModal(false);
                  handleEdit(viewingEmployee);
                }}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.green, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderDeleteModal = () => (
    <Modal
      visible={showDeleteModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDeleteModal(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '80%', maxWidth: 400, padding: 24 }}>
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
              <Icon name="delete" size={30} color={COLORS.red} />
            </View>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 8 }}>
            Delete Employee
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 24 }}>
            Are you sure you want to delete this employee? This action cannot be undone.
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <TouchableOpacity
              onPress={() => setShowDeleteModal(false)}
              style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.gray, borderRadius: 6, marginRight: 8 }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmDelete}
              style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.red, borderRadius: 6 }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderNotification = () => {
    if (!notification.visible) return null;
    
    const bgColor = notification.type === 'success' ? COLORS.green : COLORS.red;
    
    return (
      <View style={{ position: 'absolute', top: 60, left: 20, right: 20, zIndex: 1000 }}>
        <View style={{ backgroundColor: bgColor, borderRadius: 8, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}>
          <Icon name={notification.type === 'success' ? 'check-circle' : 'error'} size={20} color={COLORS.white} />
          <Text style={{ color: COLORS.white, marginLeft: 8, flex: 1 }}>{notification.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Employee Management" 
        showBack={true}
        rightComponent={
          <TouchableOpacity onPress={exportToCSV}>
            <Icon name="file-download" size={24} color={COLORS.white} />
          </TouchableOpacity>
        }
      />

      {renderNotification()}

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Header Actions */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={{
                backgroundColor: showFilters || isFilterApplied ? COLORS.lightBlue : COLORS.white,
                paddingHorizontal: 12,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginRight: 8,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Icon name="filter-list" size={20} color={showFilters || isFilterApplied ? COLORS.blue : COLORS.gray} />
              <Text style={{ marginLeft: 4, color: showFilters || isFilterApplied ? COLORS.blue : COLORS.gray }}>Filters</Text>
              {isFilterApplied ? (
                <View style={{ marginLeft: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: COLORS.white, fontSize: 10 }}>!</Text>
                </View>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={{
                backgroundColor: COLORS.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Icon name="add" size={20} color={COLORS.white} />
              <Text style={{ marginLeft: 4, color: COLORS.white }}>Add Employee</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters Panel */}
        {showFilters ? (
          <View style={{ backgroundColor: COLORS.lightBlue, padding: 16, borderRadius: 12, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Filter Employees</Text>
              {isFilterApplied ? (
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={{ color: COLORS.red }}>Clear All</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {/* Employee ID Search */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee ID</Text>
                <TextInput
                  value={filters.search}
                  onChangeText={(value) => handleFilterChange('search', value)}
                  placeholder="Filter by employee id"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 12,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              {/* Division Picker */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={filters.division}
                    onValueChange={(value) => handleFilterChange('division', value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Divisions" value="" color={COLORS.gray} />
                    {divisionOptions.map(div => (
                      <Picker.Item key={div} label={div} value={div} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Designation Picker */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Designation</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={filters.designation}
                    onValueChange={(value) => handleFilterChange('designation', value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Designations" value="" color={COLORS.gray} />
                    {designationOptions.map(desig => (
                      <Picker.Item key={desig} label={desig} value={desig} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Location Picker */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={filters.location}
                    onValueChange={(value) => handleFilterChange('location', value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Locations" value="" color={COLORS.gray} />
                    {locationOptions.map(loc => (
                      <Picker.Item key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {/* Results Count */}
        <View style={{ backgroundColor: COLORS.filterBg, padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            Showing <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{filteredEmployees.length}</Text> employees
          </Text>
        </View>

        {/* Employee Table */}
        {loading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading employees...</Text>
          </View>
        ) : filteredEmployees.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
            <Icon name="people" size={64} color={COLORS.lightGray} />
            <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontWeight: '500' }}>No employees found</Text>
            <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 8 }}>Try adjusting your filters or add a new employee</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 4 }}>
                  <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>S.No</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Employee ID</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Employee Name</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Division</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Designation</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Qualification</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Experience</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Contact</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredEmployees.map((employee, index) => {
                  const empId = employee._id || employee.id || '';
                  return (
                    <View key={empId || index} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                      <Text style={{ width: 50, fontSize: 12, textAlign: 'center', color: COLORS.textPrimary }}>{index + 1}</Text>
                      <Text style={{ width: 100, fontSize: 12, color: COLORS.blue, fontWeight: '500' }}>{employee.employeeId}</Text>
                      <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{employee.name}</Text>
                      
                      {/* Division Badge */}
                      <View style={{ width: 100, paddingHorizontal: 4 }}>
                        <View style={{ backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
                          <Text style={{ fontSize: 10, color: COLORS.indigo }}>{employee.division || '-'}</Text>
                        </View>
                      </View>
                      
                      <Text style={{ width: 120, fontSize: 12, color: COLORS.textSecondary }}>{employee.designation || employee.role || employee.position || '-'}</Text>
                      <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{employee.highestQualification || employee.qualification || '-'}</Text>
                      <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>
                        {calculateServiceYears(employee.dateOfJoining || employee.dateofjoin) || employee.currentExperience || employee.experience || '-'}
                      </Text>
                      <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{employee.mobileNo || employee.contactNumber || '-'}</Text>
                      
                      {/* Actions */}
                      <View style={{ width: 100, flexDirection: 'row', justifyContent: 'center' }}>
                        <TouchableOpacity onPress={() => handleView(employee)} style={{ padding: 6 }}>
                          <Icon name="visibility" size={18} color={COLORS.blue} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEdit(employee)} style={{ padding: 6 }}>
                          <Icon name="edit" size={18} color={COLORS.green} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => empId ? handleDelete(empId) : null} style={{ padding: 6 }}>
                          <Icon name="delete" size={18} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Employee Management • HR • "
      />

      {/* Add/Edit Employee Modal */}
      <EmployeeFormModal
        visible={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSubmit={handleFormSubmit}
      />

      {/* View Employee Modal */}
      {renderViewModal()}

      {/* Delete Confirmation Modal */}
      {renderDeleteModal()}
    </SafeAreaView>
  );
};

export default EmployeeManagementScreen;
