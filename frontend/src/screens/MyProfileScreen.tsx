// screens/MyProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { employeeAPI } from '../services/api';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';

// Define RootStackParamList locally to avoid import issues
type RootStackParamList = {
  Login: undefined;
  Dashboard: { user: any };
  MyProfile: { user?: any };
  [key: string]: undefined | object;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MyProfile'>;
  route: RouteProp<RootStackParamList, 'MyProfile'>;
};

// Types
interface User {
  employeeId?: string;
  name?: string;
  email?: string;
  designation?: string;
  division?: string;
  status?: string;
  dateOfBirth?: string;
  qualification?: string;
  bloodGroup?: string;
  location?: string;
  gender?: string;
  maritalStatus?: string;
  spouseName?: string;
  spouseContact?: string;
  
  // Address fields
  permanentAddress?: string;
  permanentAddressLine?: string;
  permanentCity?: string;
  permanentState?: string;
  permanentPincode?: string;
  
  currentAddress?: string;
  currentAddressLine?: string;
  currentCity?: string;
  currentState?: string;
  currentPincode?: string;
  
  emergencyContact?: string;
  emergencyMobile?: string;
  nationality?: string;
  contactNumber?: string;
  mobileNo?: string;
  guardianName?: string;
  pan?: string;
  aadhaar?: string;
  passportNumber?: string;
  uan?: string;
  role?: string;
  position?: string;
  dateOfJoining?: string;
  dateofjoin?: string;
  previousExperience?: string;
  previousOrganizations?: Organization[];
  currentExperience?: string;
  bankName?: string;
  bankAccount?: string;
  branch?: string;
  ifsc?: string;
  permissions?: string[];
}

interface Employee {
  _id?: string;
  employeeId?: string;
  name?: string;
  employeename?: string;
  dateOfBirth?: string;
  dob?: string;
  qualification?: string;
  highestQualification?: string;
  bloodGroup?: string;
  location?: string;
  gender?: string;
  maritalStatus?: string;
  spouseName?: string;
  spouseContact?: string;
  permanentAddress?: string;
  currentAddress?: string;
  permanentAddressLine?: string;
  permanentCity?: string;
  permanentState?: string;
  permanentPincode?: string;
  currentAddressLine?: string;
  currentCity?: string;
  currentState?: string;
  currentPincode?: string;
  emergencyContact?: string;
  nationality?: string;
  contactNumber?: string;
  email?: string;
  guardianName?: string;
  pan?: string;
  aadhaar?: string;
  passportNumber?: string;
  uan?: string;
  designation?: string;
  division?: string;
  dateOfJoining?: string;
  dateofjoin?: string;
  previousExperience?: string;
  previousOrganizations?: Organization[];
  currentExperience?: string;
  status?: string;
  bankName?: string;
  bankAccount?: string;
  branch?: string;
  ifsc?: string;
}

interface Organization {
  organization: string;
  designation: string;
  role?: string;
  startDate: string;
  endDate: string;
}

interface FormData {
  employeeId: string;
  name: string;
  dateOfBirth: string;
  qualification: string;
  bloodGroup: string;
  location: string;
  gender: string;
  maritalStatus: string;
  spouseName: string;
  spouseContact: string;
  permanentAddressLine: string;
  permanentCity: string;
  permanentState: string;
  permanentPincode: string;
  currentAddressLine: string;
  currentCity: string;
  currentState: string;
  currentPincode: string;
  emergencyContact: string;
  nationality: string;
  contactNumber: string;
  email: string;
  guardianName: string;
  pan: string;
  aadhaar: string;
  passportNumber: string;
  uan: string;
  designation: string;
  division: string;
  dateOfJoining: string;
  previousExperience: string;
  previousOrganizations: Organization[];
  currentExperience: string;
  status: string;
  bankName: string;
  bankAccount: string;
  branch: string;
  ifsc: string;
}

interface Option {
  value: string;
  label: string;
}

interface InputOptions {
  required?: boolean;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  maxLength?: number;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

interface Errors {
  [key: string]: string;
}

// Helper function to format date to YYYY-MM-DD only
const formatDateOnly = (dateString: string | undefined): string => {
  if (!dateString) return '';
  
  try {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // Try to parse the date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    
    // Format to YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const MyProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maritalStatus, setMaritalStatus] = useState<string>('single');
  const [sameAsPermanent, setSameAsPermanent] = useState<boolean>(false);
  const [employeeDoc, setEmployeeDoc] = useState<Employee | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [saveModalVisible, setSaveModalVisible] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Date picker states
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [datePickerField, setDatePickerField] = useState<'dateOfBirth' | 'dateOfJoining' | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  // Dropdown modal states
  const [showPickerModal, setShowPickerModal] = useState<boolean>(false);
  const [pickerOptions, setPickerOptions] = useState<Option[]>([]);
  const [pickerField, setPickerField] = useState<keyof FormData | null>(null);
  const [pickerLabel, setPickerLabel] = useState<string>('');
  
  // Form state - all empty initially, will be populated from database
  const [formData, setFormData] = useState<FormData>({
    employeeId: '',
    name: '',
    dateOfBirth: '',
    qualification: '',
    bloodGroup: '',
    location: '',
    gender: '',
    maritalStatus: 'single',
    spouseName: '',
    spouseContact: '',
    permanentAddressLine: '',
    permanentCity: '',
    permanentState: '',
    permanentPincode: '',
    currentAddressLine: '',
    currentCity: '',
    currentState: '',
    currentPincode: '',
    emergencyContact: '',
    nationality: 'Indian',
    contactNumber: '',
    email: '',
    guardianName: '',
    pan: '',
    aadhaar: '',
    passportNumber: '',
    uan: '',
    designation: '',
    division: '',
    dateOfJoining: '',
    previousExperience: '',
    previousOrganizations: [],
    currentExperience: '',
    status: 'Active',
    bankName: '',
    bankAccount: '',
    branch: '',
    ifsc: ''
  });

  const [organizations, setOrganizations] = useState<Organization[]>([
    { organization: '', designation: '', startDate: '', endDate: '' }
  ]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  // Helper function to parse address string
  const parseAddress = (addr: string | undefined): { line: string; city: string; state: string; pincode: string } => {
    if (!addr || typeof addr !== 'string') {
      return { line: '', city: '', state: '', pincode: '' };
    }
    const parts = addr.split(',').map(s => s.trim()).filter(Boolean);
    let line = '';
    let city = '';
    let state = '';
    let pincode = '';
    
    if (parts.length >= 4) {
      line = parts.slice(0, parts.length - 3).join(', ');
      city = parts[parts.length - 3];
      state = parts[parts.length - 2];
      pincode = parts[parts.length - 1].replace(/\D/g, '').slice(0, 6);
    } else if (parts.length === 3) {
      line = parts[0];
      city = parts[1];
      state = parts[2];
    } else {
      line = addr;
    }
    return { line, city, state, pincode };
  };

  // Options for dropdowns
  const genderOptions: Option[] = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'transgender', label: 'Transgender' }
  ];

  const bloodGroupOptions: Option[] = [
    { value: 'A+', label: 'A+' },
    { value: 'A-', label: 'A-' },
    { value: 'B+', label: 'B+' },
    { value: 'B-', label: 'B-' },
    { value: 'O+', label: 'O+' },
    { value: 'O-', label: 'O-' },
    { value: 'AB+', label: 'AB+' },
    { value: 'AB-', label: 'AB-' }
  ];

  const divisionOptions: Option[] = [
    { value: 'SDS', label: 'SDS' },
    { value: 'TEKLA', label: 'TEKLA' },
    { value: 'DAS(Software)', label: 'DAS(Software)' },
    { value: 'DDS(Manufacturing)', label: 'DDS(Manufacturing)' },
    { value: 'Electrical', label: 'Electrical' },
    { value: 'HR/Admin', label: 'HR/Admin' },
    { value: 'Engineering Services', label: 'Engineering Services' }
  ];

  const locationOptions: Option[] = [
    { value: 'Hosur', label: 'Hosur' },
    { value: 'Chennai', label: 'Chennai' }
  ];

  const designationOptions: Option[] = [
    { value: 'Managing Director (MD)', label: 'Managing Director (MD)' },
    { value: 'General Manager (GM)', label: 'General Manager (GM)' },
    { value: 'Branch Manager', label: 'Branch Manager' },
    { value: 'Admin Manager', label: 'Admin Manager' },
    { value: 'Office Assistant', label: 'Office Assistant' },
    { value: 'IT Admin', label: 'IT Admin' },
    { value: 'Trainee', label: 'Trainee' },
    { value: 'System Engineer', label: 'System Engineer' },
    { value: 'Senior Engineer', label: 'Senior Engineer' },
    { value: 'Junior Engineer', label: 'Junior Engineer' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Team Lead', label: 'Team Lead' },
    { value: 'Software Developer', label: 'Software Developer' },
    { value: 'HR Executive', label: 'HR Executive' },
    { value: 'Accountant', label: 'Accountant' },
    { value: 'Sales Executive', label: 'Sales Executive' }
  ];

  const indiaStates: string[] = [
    'Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana',
    'Maharashtra', 'Delhi', 'Uttar Pradesh', 'Gujarat', 'Rajasthan',
    'Madhya Pradesh', 'West Bengal', 'Bihar', 'Odisha', 'Punjab',
    'Haryana', 'Jharkhand', 'Assam', 'Chhattisgarh'
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadUserData = async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Get user from route params or AsyncStorage
      let userData: User = {};
      
      if (route.params?.user) {
        userData = route.params.user;
        console.log('User from route params:', userData);
      } else {
        const userStr = await AsyncStorage.getItem('user');
        userData = userStr ? JSON.parse(userStr) : {};
        console.log('User from AsyncStorage:', userData);
      }
      
      setUser(userData);

      // Fetch profile from API - this is the source of truth
      try {
        console.log('Fetching profile from API...');
        const res = await employeeAPI.getMyProfile();
        console.log('API Response:', res.data);
        
        const emp: Employee = res.data;
        
        if (emp && emp.employeeId) {
          setEmployeeDoc(emp);
          
          // Parse addresses if they exist
          const perm = emp.permanentAddress ? parseAddress(emp.permanentAddress) : { line: '', city: '', state: '', pincode: '' };
          const curr = emp.currentAddress ? parseAddress(emp.currentAddress) : { line: '', city: '', state: '', pincode: '' };
          
          // Format dates to YYYY-MM-DD only
          const formattedDateOfBirth = formatDateOnly(emp.dateOfBirth || emp.dob);
          const formattedDateOfJoining = formatDateOnly(emp.dateOfJoining || emp.dateofjoin);
          
          // Format previous organization dates
          const formattedOrganizations = emp.previousOrganizations?.map(org => ({
            ...org,
            startDate: formatDateOnly(org.startDate),
            endDate: formatDateOnly(org.endDate)
          })) || [];
          
          // Map API data to form data - ONLY from API, no fallbacks
          const apiData: FormData = {
            employeeId: emp.employeeId || '',
            name: emp.name || emp.employeename || '',
            dateOfBirth: formattedDateOfBirth,
            qualification: emp.qualification || emp.highestQualification || '',
            bloodGroup: emp.bloodGroup || '',
            location: emp.location || '',
            gender: emp.gender || '',
            maritalStatus: emp.maritalStatus || 'single',
            spouseName: emp.spouseName || '',
            spouseContact: emp.spouseContact || '',
            permanentAddressLine: emp.permanentAddressLine || perm.line || '',
            permanentCity: emp.permanentCity || perm.city || '',
            permanentState: emp.permanentState || perm.state || '',
            permanentPincode: emp.permanentPincode || perm.pincode || '',
            currentAddressLine: emp.currentAddressLine || curr.line || '',
            currentCity: emp.currentCity || curr.city || '',
            currentState: emp.currentState || curr.state || '',
            currentPincode: emp.currentPincode || curr.pincode || '',
            emergencyContact: emp.emergencyContact || '',
            nationality: emp.nationality || 'Indian',
            contactNumber: emp.contactNumber || '',
            email: emp.email || '',
            guardianName: emp.guardianName || '',
            pan: emp.pan || '',
            aadhaar: emp.aadhaar || '',
            passportNumber: emp.passportNumber || '',
            uan: emp.uan || '',
            designation: emp.designation || '',
            division: emp.division || '',
            dateOfJoining: formattedDateOfJoining,
            previousExperience: emp.previousExperience || '',
            previousOrganizations: formattedOrganizations,
            currentExperience: emp.currentExperience || '',
            status: emp.status || 'Active',
            bankName: emp.bankName || '',
            bankAccount: emp.bankAccount || '',
            branch: emp.branch || '',
            ifsc: emp.ifsc || ''
          };
          
          setMaritalStatus(apiData.maritalStatus || 'single');
          
          // Set organizations from API data with formatted dates
          if (formattedOrganizations.length > 0) {
            setOrganizations(formattedOrganizations.map(org => ({
              organization: org.organization || '',
              designation: org.designation || org.role || '',
              startDate: org.startDate || '',
              endDate: org.endDate || ''
            })));
          } else {
            setOrganizations([{ organization: '', designation: '', startDate: '', endDate: '' }]);
          }
          
          setFormData(apiData);
          console.log('Form data set from API:', apiData);
          showMessage('Profile data loaded successfully', 'success');
        } else {
          console.log('No employee data found in API response');
          // If no data from API, keep form empty
          setEmployeeDoc(null);
          setMaritalStatus('single');
          setFormData(prev => ({
            ...prev,
            employeeId: userData.employeeId || '',
            name: userData.name || '',
            email: userData.email || '',
            contactNumber: userData.contactNumber || userData.mobileNo || ''
          }));
          showMessage('No profile data found. Please update your profile.', 'info');
        }
      } catch (err) {
        console.error("Error loading profile from API:", err);
        showMessage('Failed to load profile data from server', 'error');
      }
      
    } catch (error) {
      console.error('Error loading user:', error);
      showMessage('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  // Calculate total previous experience
  useEffect(() => {
    if (organizations.length > 0 && organizations[0].organization) {
      let totalMonths = 0;
      
      organizations.forEach((org: Organization) => {
        if (org.startDate && org.endDate) {
          const start = new Date(org.startDate);
          const end = new Date(org.endDate);
          const diffInMonths = (end.getFullYear() - start.getFullYear()) * 12 + 
                              (end.getMonth() - start.getMonth());
          totalMonths += diffInMonths > 0 ? diffInMonths : 0;
        } else if (org.startDate) {
          const start = new Date(org.startDate);
          const now = new Date();
          const diffInMonths = (now.getFullYear() - start.getFullYear()) * 12 + 
                              (now.getMonth() - start.getMonth());
          totalMonths += diffInMonths > 0 ? diffInMonths : 0;
        }
      });
      
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      
      let experienceText = '';
      if (years > 0) {
        experienceText += `${years} year${years > 1 ? 's' : ''}`;
      }
      if (months > 0) {
        experienceText += `${years > 0 ? ' ' : ''}${months} month${months > 1 ? 's' : ''}`;
      }
      if (!experienceText) {
        experienceText = '0 years';
      }
      
      setFormData((prev: FormData) => ({
        ...prev,
        previousExperience: experienceText,
        previousOrganizations: organizations
      }));
    }
  }, [organizations]);

  const handleInputChange = (field: keyof FormData, value: string): void => {
    let newValue = value;
    
    // Validation rules
    if (field === 'employeeId') {
      newValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 20);
    }
    if (field === 'name') {
      newValue = value.toUpperCase().replace(/[^A-Za-z\s]/g, '').slice(0, 25);
    }
    if (field === 'qualification') {
      newValue = value.toUpperCase().replace(/[^A-Z\s()./&-]/g, '').slice(0, 10);
    }
    if (field === 'contactNumber' || field === 'spouseContact' || field === 'emergencyContact') {
      newValue = value.replace(/\D/g, '');
      if (field === 'contactNumber' || field === 'emergencyContact') {
        newValue = newValue.slice(0, 10);
      }
    }
    if (field === 'guardianName') {
      newValue = value.replace(/[^A-Za-z\s]/g, '');
    }
    if (field === 'pan') {
      newValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    }
    if (field === 'aadhaar') {
      newValue = value.replace(/\D/g, '').slice(0, 12);
    }
    if (field === 'email') {
      newValue = value.slice(0, 40);
    }
    if (field === 'uan') {
      newValue = value.replace(/\D/g, '').slice(0, 12);
    }

    const updatedData = { ...formData, [field]: newValue };

    // Calculate current experience based on date of joining
    if (field === 'dateOfJoining' && value) {
      const joiningDate = new Date(value);
      const today = new Date();
      const experienceInMilliseconds = today.getTime() - joiningDate.getTime();
      const experienceInYears = experienceInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
      
      if (experienceInYears > 0) {
        const years = Math.floor(experienceInYears);
        const months = Math.floor((experienceInYears - years) * 12);
        let experienceText = '';
        if (years > 0) {
          experienceText += `${years} year${years > 1 ? 's' : ''}`;
        }
        if (months > 0) {
          experienceText += `${years > 0 ? ' ' : ''}${months} month${months > 1 ? 's' : ''}`;
        }
        if (!experienceText) {
          experienceText = 'Less than 1 month';
        }
        updatedData.currentExperience = experienceText;
      } else {
        updatedData.currentExperience = '0 years';
      }
    }

    if (field === 'maritalStatus') {
      setMaritalStatus(value);
    }

    setFormData(updatedData);
    validateField(field, newValue);
  };

  const validateField = (field: keyof FormData, value: string): string => {
    let error = '';
    const v = String(value || '').trim();

    if (field === 'employeeId' && v && !/^CDE\d{3}$/.test(v)) {
      error = 'Must be CDE followed by exactly 3 digits';
    }
    if (field === 'name' && !v) {
      error = 'Employee name is required';
    }
    if (field === 'name' && v && !/^[A-Za-z\s]+$/.test(v)) {
      error = 'Only alphabetic characters allowed';
    }
    if (field === 'contactNumber' && v && !/^\d{10}$/.test(v)) {
      error = 'Must be exactly 10 digits';
    }
    if (field === 'email' && v && !v.includes('@')) {
      error = 'Email must include @';
    }
    if (field === 'emergencyContact' && v && !/^\d{10}$/.test(v)) {
      error = 'Must be 10 digits';
    }
    if (field === 'guardianName' && v && !/^[A-Za-z\s]+$/.test(v)) {
      error = 'Only alphabetic characters allowed';
    }
    if (field === 'pan' && v && !/^[A-Z]{5}\d{4}[A-Z]$/.test(v)) {
      error = 'Format: 5 letters + 4 digits + 1 letter';
    }
    if (field === 'aadhaar' && v && !/^\d{12}$/.test(v)) {
      error = 'Must be exactly 12 digits';
    }
    if ((field === 'permanentPincode' || field === 'currentPincode') && v && !/^\d{6}$/.test(v)) {
      error = 'Must be 6 digits';
    }
    if (field === 'uan' && v && !/^\d{12}$/.test(v)) {
      error = 'Must be exactly 12 digits';
    }

    setErrors((prev: Errors) => ({ ...prev, [field]: error }));
    return error;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Errors = {};

    if (step === 1) {
      const empIdError = validateField('employeeId', formData.employeeId);
      if (empIdError) newErrors.employeeId = empIdError;
      
      const nameError = validateField('name', formData.name);
      if (nameError) newErrors.name = nameError;
      
      if (!formData.gender) newErrors.gender = 'Gender is required';
      if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
      if (!formData.qualification) newErrors.qualification = 'Qualification is required';
      if (!formData.bloodGroup) newErrors.bloodGroup = 'Blood group is required';
      
      const contactError = validateField('contactNumber', formData.contactNumber);
      if (contactError) newErrors.contactNumber = contactError;
      
      const emailError = validateField('email', formData.email);
      if (emailError) newErrors.email = emailError;
      
      const emergencyError = validateField('emergencyContact', formData.emergencyContact);
      if (emergencyError) newErrors.emergencyContact = emergencyError;
      
      if (!formData.permanentAddressLine) newErrors.permanentAddressLine = 'Address is required';
      if (!formData.permanentCity) newErrors.permanentCity = 'City is required';
      if (!formData.permanentState) newErrors.permanentState = 'State is required';
      
      const permPincodeError = validateField('permanentPincode', formData.permanentPincode);
      if (permPincodeError) newErrors.permanentPincode = permPincodeError;
      
      if (!sameAsPermanent) {
        if (!formData.currentAddressLine) newErrors.currentAddressLine = 'Address is required';
        if (!formData.currentCity) newErrors.currentCity = 'City is required';
        if (!formData.currentState) newErrors.currentState = 'State is required';
        
        const currPincodeError = validateField('currentPincode', formData.currentPincode);
        if (currPincodeError) newErrors.currentPincode = currPincodeError;
      }
      
      const panError = validateField('pan', formData.pan);
      if (panError) newErrors.pan = panError;
      
      const aadhaarError = validateField('aadhaar', formData.aadhaar);
      if (aadhaarError) newErrors.aadhaar = aadhaarError;
      
      const uanError = validateField('uan', formData.uan);
      if (uanError) newErrors.uan = uanError;
    }

    if (step === 2) {
      if (!formData.designation) newErrors.designation = 'Designation is required';
      if (!formData.division) newErrors.division = 'Division is required';
      if (!formData.location) newErrors.location = 'Location is required';
      if (!formData.dateOfJoining) newErrors.dateOfJoining = 'Date of joining is required';
    }

    if (step === 3) {
      if (!formData.bankName) newErrors.bankName = 'Bank name is required';
      if (!formData.bankAccount) newErrors.bankAccount = 'Account number is required';
      if (!formData.branch) newErrors.branch = 'Branch is required';
      if (!formData.ifsc) newErrors.ifsc = 'IFSC code is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (): void => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = (): void => {
    setCurrentStep(currentStep - 1);
  };

  const handleOrganizationChange = (index: number, field: keyof Organization, value: string): void => {
    let newValue = value;
    if (field === 'organization') {
      newValue = value.slice(0, 50);
    }
    if (field === 'designation') {
      newValue = value.slice(0, 50);
    }
    
    const updated = [...organizations];
    updated[index][field] = newValue;
    setOrganizations(updated);
  };

  const addOrganization = (): void => {
    setOrganizations([...organizations, { organization: '', designation: '', startDate: '', endDate: '' }]);
  };

  const removeOrganization = (index: number): void => {
    const updated = organizations.filter((_, i) => i !== index);
    setOrganizations(updated);
  };

  // Date picker handlers
  const openDatePicker = (field: 'dateOfBirth' | 'dateOfJoining') => {
    const currentDate = formData[field] ? new Date(formData[field]) : new Date();
    setTempDate(currentDate);
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate && datePickerField) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      handleInputChange(datePickerField, formattedDate);
    }
    
    if (Platform.OS === 'ios') {
      // Keep picker open on iOS for better UX
    } else {
      setDatePickerField(null);
    }
  };

  // Dropdown picker handlers
  const openPickerModal = (field: keyof FormData, options: Option[], label: string) => {
    setPickerOptions(options);
    setPickerField(field);
    setPickerLabel(label);
    setShowPickerModal(true);
  };

  const selectPickerValue = (value: string) => {
    if (pickerField) {
      handleInputChange(pickerField, value);
    }
    setShowPickerModal(false);
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validateStep(3)) return;

    try {
      setLoading(true);
      
      // Format dates before submitting
      const formattedData = {
        ...formData,
        dateOfBirth: formatDateOnly(formData.dateOfBirth),
        dateOfJoining: formatDateOnly(formData.dateOfJoining),
        previousOrganizations: organizations.map(org => ({
          ...org,
          startDate: formatDateOnly(org.startDate),
          endDate: formatDateOnly(org.endDate)
        }))
      };
      
      // Prepare final data with aliases for backend compatibility
      const finalData = {
        ...formattedData,
        name: formData.name,
        employeename: formData.name,
        qualification: formData.qualification,
        highestQualification: formData.qualification,
        previousOrganizations: organizations
      };

      const hasUserAccess = user?.permissions?.includes('user_access') || false;
      
      if (hasUserAccess && employeeDoc?._id) {
        // If user has admin access and is editing a linked employee doc
        await employeeAPI.updateEmployee(employeeDoc._id, finalData);
        showMessage('Employee profile updated successfully!', 'success');
      } else {
        // Otherwise use the "me" endpoint
        await employeeAPI.updateMyProfile(finalData);
        showMessage('Your profile has been updated successfully!', 'success');
      }

      // Update stored user data
      const updatedUser = {
        ...(user || {}),
        name: finalData.name || user?.name || '',
        email: finalData.email || user?.email || '',
        employeeId: finalData.employeeId || user?.employeeId || '',
        designation: finalData.designation || user?.designation || '',
        division: finalData.division || user?.division || '',
        status: finalData.status || user?.status || ''
      };

      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      // Refresh profile data
      try {
        const res = await employeeAPI.getMyProfile();
        setEmployeeDoc(res.data);
      } catch (err) {
        console.error("Error refreshing profile:", err);
      }
      
      setSaveModalVisible(true);
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile. Please try again.';
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isAddOrganizationDisabled = organizations.some(org => 
    !org.organization || !org.designation || !org.startDate || !org.endDate
  );

  const renderInput = (
    field: keyof FormData, 
    label: string, 
    options: InputOptions = {}
  ): React.ReactElement => {
    const {
      required = false,
      editable = true,
      keyboardType = 'default',
      maxLength,
      placeholder = '',
      multiline = false,
      autoCapitalize = 'none'
    } = options;

    // Determine if field should be disabled
    const isDisabled = !editable || [
      'employeeId', 'contactNumber', 'email', 'aadhaar', 'uan', 
      'designation', 'division', 'dateOfJoining', 'location',
      'bankName', 'bankAccount', 'branch', 'ifsc'
    ].includes(field);

    // Format display value for date fields
    let displayValue = formData[field] as string;
    if (field === 'dateOfBirth' || field === 'dateOfJoining') {
      displayValue = formatDateOnly(displayValue);
    }

    // For date fields, make them clickable to open date picker
    if (field === 'dateOfBirth' || field === 'dateOfJoining') {
      return (
        <View style={styles.inputContainer}>
          <Text style={styles.label}>
            {label} {required && <Text style={styles.required}>*</Text>}
          </Text>
          <TouchableOpacity
            onPress={() => openDatePicker(field)}
            style={[
              styles.input,
              isDisabled && styles.disabledInput,
              errors[field] && styles.inputError
            ]}
          >
            <Text style={[
              styles.dateText,
              !displayValue && styles.placeholderText
            ]}>
              {displayValue || 'Select Date'}
            </Text>
          </TouchableOpacity>
          {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
        </View>
      );
    }

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TextInput
          style={[
            styles.input,
            isDisabled && styles.disabledInput,
            errors[field] && styles.inputError
          ]}
          value={displayValue}
          onChangeText={(value: string) => handleInputChange(field, value)}
          editable={!isDisabled}
          keyboardType={keyboardType}
          maxLength={maxLength}
          placeholder={placeholder}
          multiline={multiline}
          autoCapitalize={autoCapitalize}
          placeholderTextColor="#9ca3af"
        />
        {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  const renderSelect = (
    field: keyof FormData, 
    label: string, 
    options: Option[], 
    required: boolean = false
  ): React.ReactElement => {
    const isDisabled = [
      'gender', 'maritalStatus', 'division', 'designation', 'location'
    ].includes(field);

    const currentValue = formData[field] as string;
    const selectedOption = options.find(opt => opt.value === currentValue);

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TouchableOpacity
          onPress={() => !isDisabled && openPickerModal(field, options, label)}
          style={[
            styles.input,
            isDisabled && styles.disabledInput,
            errors[field] && styles.inputError
          ]}
        >
          <Text style={[
            styles.selectText,
            !currentValue && styles.placeholderText
          ]}>
            {selectedOption ? selectedOption.label : `Select ${label}`}
          </Text>
          <Icon name="arrow-drop-down" size={24} color="#6b7280" style={styles.dropdownIcon} />
        </TouchableOpacity>
        {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  const renderDateField = (
    field: keyof FormData, 
    label: string, 
    required: boolean = false
  ): React.ReactElement => {
    const value = formData[field];
    const displayValue = formatDateOnly(typeof value === 'string' ? value : '');

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <TouchableOpacity
          onPress={() => openDatePicker(field as 'dateOfBirth' | 'dateOfJoining')}
          style={[
            styles.input,
            errors[field] && styles.inputError
          ]}
        >
          <Text style={[
            styles.dateText,
            !displayValue && styles.placeholderText
          ]}>
            {displayValue || 'Select Date'}
          </Text>
          <Icon name="calendar-today" size={18} color="#6b7280" style={styles.calendarIcon} />
        </TouchableOpacity>
        {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#262760" />
        <Text style={styles.loadingText}>Loading profile data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#262760" />
      
      <CommonHeader 
        title="My Profile" 
        showBack={true}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#262760']}
            tintColor="#262760"
          />
        }
      >
        {/* Message Banner */}
        {message && (
          <View style={[
            styles.messageBanner,
            message.type === 'success' && styles.successBanner,
            message.type === 'error' && styles.errorBanner,
            message.type === 'info' && styles.infoBanner,
          ]}>
            <IconCommunity 
              name={
                message.type === 'success' ? 'check-circle' :
                message.type === 'error' ? 'alert-circle' : 'information'
              } 
              size={20} 
              color={
                message.type === 'success' ? '#10b981' :
                message.type === 'error' ? '#ef4444' : '#3b82f6'
              } 
            />
            <Text style={[
              styles.messageText,
              message.type === 'success' && styles.successText,
              message.type === 'error' && styles.errorText,
              message.type === 'info' && styles.infoText,
            ]}>
              {message.text}
            </Text>
          </View>
        )}

        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          {['Personal', 'Professional', 'Bank'].map((step: string, index: number) => (
            <View key={step} style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                currentStep === index + 1 && styles.activeStepDot
              ]}>
                <Text style={[
                  styles.stepText,
                  currentStep === index + 1 && styles.activeStepText
                ]}>
                  {index + 1}
                </Text>
              </View>
              <Text style={[
                styles.stepLabel,
                currentStep === index + 1 && styles.activeStepLabel
              ]}>
                {step}
              </Text>
              {index < 2 && <View style={styles.stepLine} />}
            </View>
          ))}
        </View>

        {/* Step 1: Personal Information */}
        {currentStep === 1 && (
          <View style={styles.formSection}>
            {/* Personal Information */}
            <View style={[styles.section, styles.personalSection]}>
              <View style={styles.sectionHeader}>
                <Icon name="person" size={24} color="#3b82f6" />
                <Text style={[styles.sectionTitle, styles.personalTitle]}>
                  Personal Information
                </Text>
              </View>

              {renderInput('employeeId', 'Employee ID', { required: true, editable: false })}
              {renderInput('name', 'Full Name', { required: true, editable: false })}
              
              {renderSelect('gender', 'Gender', genderOptions, true)}
              {renderDateField('dateOfBirth', 'Date of Birth', true)}
              {renderSelect('bloodGroup', 'Blood Group', bloodGroupOptions, true)}
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Marital Status</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => handleInputChange('maritalStatus', 'single')}
                  >
                    <View style={[styles.radio, maritalStatus === 'single' && styles.radioSelected]}>
                      {maritalStatus === 'single' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>Single</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.radioOption}
                    onPress={() => handleInputChange('maritalStatus', 'married')}
                  >
                    <View style={[styles.radio, maritalStatus === 'married' && styles.radioSelected]}>
                      {maritalStatus === 'married' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.radioLabel}>Married</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {maritalStatus === 'married' && (
                <>
                  {renderInput('spouseName', 'Spouse Name')}
                  {renderInput('spouseContact', 'Spouse Contact', { keyboardType: 'phone-pad', maxLength: 10 })}
                </>
              )}

              {renderInput('qualification', 'Qualification', { required: true, maxLength: 10 })}
            </View>

            {/* Contact Information */}
            <View style={[styles.section, styles.contactSection]}>
              <View style={styles.sectionHeader}>
                <Icon name="phone" size={24} color="#10b981" />
                <Text style={[styles.sectionTitle, styles.contactTitle]}>
                  Contact Information
                </Text>
              </View>

              {renderInput('contactNumber', 'Mobile Number', { 
                required: true, 
                keyboardType: 'phone-pad', 
                maxLength: 10,
                editable: false 
              })}
              {renderInput('email', 'Email Address', { 
                required: true, 
                keyboardType: 'email-address',
                editable: false 
              })}
              {renderInput('emergencyContact', 'Emergency Contact', { 
                required: true, 
                keyboardType: 'phone-pad', 
                maxLength: 10 
              })}
              {renderInput('guardianName', 'Guardian Name')}
            </View>

            {/* Address Information */}
            <View style={[styles.section, styles.addressSection]}>
              <View style={styles.sectionHeader}>
                <Icon name="location-on" size={24} color="#8b5cf6" />
                <Text style={[styles.sectionTitle, styles.addressTitle]}>
                  Address Information
                </Text>
              </View>

              <Text style={styles.subsectionTitle}>Permanent Address</Text>
              {renderInput('permanentAddressLine', 'Address Line', { required: true, multiline: true })}
              {renderInput('permanentCity', 'City', { required: true })}
              {renderSelect('permanentState', 'State', indiaStates.map((s: string) => ({ value: s, label: s })), true)}
              {renderInput('permanentPincode', 'Pincode', { 
                required: true, 
                keyboardType: 'numeric', 
                maxLength: 6 
              })}

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => {
                    setSameAsPermanent(!sameAsPermanent);
                    if (!sameAsPermanent) {
                      setFormData({
                        ...formData,
                        currentAddressLine: formData.permanentAddressLine,
                        currentCity: formData.permanentCity,
                        currentState: formData.permanentState,
                        currentPincode: formData.permanentPincode
                      });
                    }
                  }}
                >
                  <View style={[styles.checkboxBox, sameAsPermanent && styles.checkboxChecked]}>
                    {sameAsPermanent && <Icon name="check" size={16} color="#fff" />}
                  </View>
                  <Text style={styles.checkboxLabel}>Same as Permanent Address</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.subsectionTitle}>Current Address</Text>
              {renderInput('currentAddressLine', 'Address Line', { 
                required: !sameAsPermanent, 
                multiline: true,
                editable: !sameAsPermanent
              })}
              {renderInput('currentCity', 'City', { 
                required: !sameAsPermanent,
                editable: !sameAsPermanent
              })}
              {renderSelect('currentState', 'State', indiaStates.map((s: string) => ({ value: s, label: s })), !sameAsPermanent)}
              {renderInput('currentPincode', 'Pincode', { 
                required: !sameAsPermanent, 
                keyboardType: 'numeric', 
                maxLength: 6,
                editable: !sameAsPermanent
              })}
            </View>

            {/* Identification Details */}
            <View style={[styles.section, styles.identificationSection]}>
              <View style={styles.sectionHeader}>
                <Icon name="badge" size={24} color="#f59e0b" />
                <Text style={[styles.sectionTitle, styles.identificationTitle]}>
                  Identification Details
                </Text>
              </View>

              {renderInput('pan', 'PAN Number', { 
                required: true, 
                maxLength: 10,
                autoCapitalize: 'characters'
              })}
              {renderInput('aadhaar', 'Aadhaar Number', { 
                required: true, 
                keyboardType: 'numeric', 
                maxLength: 12,
                editable: false 
              })}
              {renderInput('passportNumber', 'Passport Number', { autoCapitalize: 'characters' })}
              {renderInput('uan', 'UAN Number', { 
                required: true, 
                keyboardType: 'numeric', 
                maxLength: 12,
                editable: false 
              })}
            </View>
          </View>
        )}

        {/* Step 2: Professional Information */}
        {currentStep === 2 && (
          <View style={styles.formSection}>
            {/* Employment Information */}
            <View style={[styles.section, styles.professionalSection]}>
              <View style={styles.sectionHeader}>
                <Icon name="work" size={24} color="#06b6d4" />
                <Text style={[styles.sectionTitle, styles.professionalTitle]}>
                  Employment Information
                </Text>
              </View>

              {renderSelect('designation', 'Designation', designationOptions, true)}
              {renderSelect('division', 'Division', divisionOptions, true)}
              {renderDateField('dateOfJoining', 'Date of Joining', true)}
              {renderSelect('location', 'Location', locationOptions, true)}
              <View style={styles.experienceSummary}>
                <Text style={styles.experienceLabel}>Current Experience:</Text>
                <Text style={styles.experienceValue}>{formData.currentExperience || '0 years'}</Text>
              </View>
            </View>

            {/* Previous Experience */}
            <View style={[styles.section, styles.professionalSection]}>
              <View style={styles.sectionHeader}>
                <Icon name="history" size={24} color="#06b6d4" />
                <Text style={[styles.sectionTitle, styles.professionalTitle]}>
                  Previous Experience
                </Text>
              </View>

              {organizations.map((org: Organization, index: number) => (
                <View key={index} style={styles.organizationItem}>
                  <View style={styles.organizationHeader}>
                    <Text style={styles.organizationTitle}>
                      Organization {index + 1}
                    </Text>
                    {organizations.length > 1 && (
                      <TouchableOpacity onPress={() => removeOrganization(index)}>
                        <Icon name="delete" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Organization Name</Text>
                    <TextInput
                      style={styles.input}
                      value={org.organization}
                      onChangeText={(value: string) => handleOrganizationChange(index, 'organization', value)}
                      maxLength={50}
                      placeholder="Enter organization name"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Designation</Text>
                    <TextInput
                      style={styles.input}
                      value={org.designation}
                      onChangeText={(value: string) => handleOrganizationChange(index, 'designation', value)}
                      maxLength={50}
                      placeholder="Enter designation"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Start Date</Text>
                    <TouchableOpacity
                      onPress={() => {
                        // For organization dates, we'll keep them as text inputs for now
                        // In a real app, you'd add date pickers here too
                      }}
                      style={styles.input}
                    >
                      <Text style={[
                        styles.dateText,
                        !org.startDate && styles.placeholderText
                      ]}>
                        {org.startDate || 'Select Date'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>End Date</Text>
                    <TouchableOpacity
                      onPress={() => {
                        // For organization dates, we'll keep them as text inputs for now
                        // In a real app, you'd add date pickers here too
                      }}
                      style={styles.input}
                    >
                      <Text style={[
                        styles.dateText,
                        !org.endDate && styles.placeholderText
                      ]}>
                        {org.endDate || 'Select Date'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.addButton, isAddOrganizationDisabled && styles.disabledButton]}
                onPress={addOrganization}
                disabled={isAddOrganizationDisabled}
              >
                <Icon name="add" size={20} color="#fff" />
                <Text style={styles.addButtonText}>Add Organization</Text>
              </TouchableOpacity>

              <View style={styles.experienceSummary}>
                <Text style={styles.experienceLabel}>Total Previous Experience:</Text>
                <Text style={styles.experienceValue}>{formData.previousExperience || '0 years'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Step 3: Bank Information */}
        {currentStep === 3 && (
          <View style={styles.formSection}>
            <View style={[styles.section, styles.bankSection]}>
              <View style={styles.sectionHeader}>
                <Icon name="account-balance" size={24} color="#ec4899" />
                <Text style={[styles.sectionTitle, styles.bankTitle]}>
                  Bank Account Details
                </Text>
              </View>

              {renderInput('bankName', 'Bank Name', { required: true, editable: false })}
              {renderInput('bankAccount', 'Account Number', { required: true, editable: false })}
              {renderInput('branch', 'Branch Name', { required: true, editable: false })}
              {renderInput('ifsc', 'IFSC Code', { required: true, editable: false, autoCapitalize: 'characters' })}
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {currentStep > 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.backNavButton]}
              onPress={handleBack}
            >
              <Text style={styles.backNavButtonText}>Previous</Text>
            </TouchableOpacity>
          )}

          {currentStep < 3 ? (
            <TouchableOpacity
              style={[styles.navButton, styles.nextNavButton, currentStep > 1 ? styles.navButtonWithPrevious : styles.navButtonFull]}
              onPress={handleNext}
            >
              <Text style={styles.nextNavButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.navButton, styles.submitNavButton, currentStep > 1 ? styles.navButtonWithPrevious : styles.navButtonFull]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitNavButtonText}>Save Profile</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="My Profile • Employee Portal • "
      />

      {/* Date Picker Modal for iOS */}
      {showDatePicker && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => {
            setShowDatePicker(false);
            setDatePickerField(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowDatePicker(false);
              setDatePickerField(null);
            }}
          >
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity onPress={() => {
                  setShowDatePicker(false);
                  setDatePickerField(null);
                }}>
                  <Text style={styles.datePickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => {
                  if (datePickerField) {
                    const year = tempDate.getFullYear();
                    const month = String(tempDate.getMonth() + 1).padStart(2, '0');
                    const day = String(tempDate.getDate()).padStart(2, '0');
                    const formattedDate = `${year}-${month}-${day}`;
                    handleInputChange(datePickerField, formattedDate);
                  }
                  setShowDatePicker(false);
                  setDatePickerField(null);
                }}>
                  <Text style={styles.datePickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setTempDate(selectedDate);
                  }
                  if (Platform.OS === 'android') {
                    onDateChange(event, selectedDate);
                  }
                }}
                style={styles.datePicker}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Dropdown Picker Modal */}
      <Modal
        visible={showPickerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPickerModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPickerModal(false)}
        >
          <View style={styles.pickerModalContainer}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>Select {pickerLabel}</Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <Icon name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerModalContent}>
              {pickerOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pickerOption}
                  onPress={() => selectPickerValue(option.value)}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    pickerField && formData[pickerField] === option.value && styles.pickerOptionSelected
                  ]}>
                    {option.label}
                  </Text>
                  {pickerField && formData[pickerField] === option.value && (
                    <Icon name="check" size={20} color="#262760" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon name="check-circle" size={60} color="#10b981" />
            <Text style={styles.modalTitle}>Profile Saved</Text>
            <Text style={styles.modalMessage}>
              Your profile has been updated successfully!
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setSaveModalVisible(false);
                setCurrentStep(1);
                navigation.goBack();
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 16,
    paddingBottom: 80,
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  successBanner: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  infoBanner: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  messageText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  successText: {
    color: '#10b981',
  },
  errorText: {
    color: '#ef4444',
  },
  infoText: {
    color: '#3b82f6',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  stepItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepDot: {
    backgroundColor: '#262760',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeStepText: {
    color: '#fff',
  },
  stepLabel: {
    marginLeft: 6,
    fontSize: 11,
    color: '#6b7280',
  },
  activeStepLabel: {
    color: '#262760',
    fontWeight: '600',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 6,
  },
  formSection: {
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  personalSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  contactSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  addressSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  identificationSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  professionalSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#06b6d4',
  },
  bankSection: {
    borderLeftWidth: 4,
    borderLeftColor: '#ec4899',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  personalTitle: {
    color: '#3b82f6',
  },
  contactTitle: {
    color: '#10b981',
  },
  addressTitle: {
    color: '#8b5cf6',
  },
  identificationTitle: {
    color: '#f59e0b',
  },
  professionalTitle: {
    color: '#06b6d4',
  },
  bankTitle: {
    color: '#ec4899',
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
    marginBottom: 4,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  dateText: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  selectText: {
    fontSize: 14,
    color: '#1f2937',
    flex: 1,
  },
  dropdownIcon: {
    marginLeft: 8,
  },
  calendarIcon: {
    marginLeft: 8,
  },
  select: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  radioGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  radioSelected: {
    borderColor: '#262760',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#262760',
  },
  radioLabel: {
    fontSize: 13,
    color: '#4b5563',
  },
  checkboxContainer: {
    marginVertical: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#262760',
    borderColor: '#262760',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#4b5563',
  },
  organizationItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  organizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  organizationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#262760',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    opacity: 0.5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  experienceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  experienceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
  },
  experienceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#262760',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  navButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  navButtonFull: {
    flex: 1,
  },
  navButtonWithPrevious: {
    flex: 1,
    marginLeft: 8,
  },
  backNavButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  nextNavButton: {
    backgroundColor: '#262760',
  },
  submitNavButton: {
    backgroundColor: '#10b981',
  },
  backNavButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  nextNavButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  submitNavButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  datePickerCancel: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  datePickerTitle: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerDone: {
    color: '#262760',
    fontSize: 16,
    fontWeight: '600',
  },
  datePicker: {
    height: 200,
    width: '100%',
  },
  pickerModalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  pickerModalContent: {
    padding: 16,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#4b5563',
  },
  pickerOptionSelected: {
    color: '#262760',
    fontWeight: '600',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#262760',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',  
    fontSize: 14,
    fontWeight: '500',
  },
});

export default MyProfileScreen