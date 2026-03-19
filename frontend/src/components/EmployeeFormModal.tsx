// components/EmployeeFormModal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';

const COLORS = {
  primary: '#0A0F2C',
  white: '#FFFFFF',
  gray: '#666666',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  error: '#EF4444',
  success: '#10B981',
  dropdownBg: '#FFFFFF',
  dropdownText: '#000000',
};

interface EmployeeFormModalProps {
  visible: boolean;
  onClose: () => void;
  employee: any;
  onSubmit: (data: any) => void;
}

const DIVISION_OPTIONS = [
  'TEKLA',
  'SDS',
  'HR/Admin',
  'DAS(Software)',
  'Electrical',
  'Management'
];

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

const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  visible,
  onClose,
  employee,
  onSubmit,
}) => {
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

  const designationOptions = formData.division
    ? DIVISION_DESIGNATION_MAP[formData.division] || []
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
              {errors.employeeId && <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.employeeId}</Text>}
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
              {errors.name && <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.name}</Text>}
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
              {errors.email && <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.email}</Text>}
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
              {errors.mobileNo && <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.mobileNo}</Text>}
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
              {errors.division && <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.division}</Text>}
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
                  {designationOptions.map(des => (
                    <Picker.Item key={des} label={des} value={des} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
              {errors.designation && <Text style={{ color: COLORS.error, fontSize: 11, marginTop: 2 }}>{errors.designation}</Text>}
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

export default EmployeeFormModal;