// screens/InsuranceScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { employeeAPI, insuranceAPI, insuranceClaimAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const { width, height } = Dimensions.get('window');

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
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  filterBg: '#F9FAFB',
  red: '#EF4444',
  redLight: '#FEE2E2',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  indigoDark: '#262760',
  blue: '#3B82F6',
  blueLight: '#EBF5FF',
  green: '#10B981',
  greenLight: '#E8F5E9',
  purple: '#9B59B6',
  purpleLight: '#F3E8FF',
  pink: '#EC4899',
  pinkLight: '#FCE7F3',
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  teal: '#14B8A6',
  tealLight: '#CCFBF1',
  yellow: '#F59E0B',
  yellowLight: '#FEF3C7',
  shadow: '#000000',
  selectedBg: '#E8F5E9',
};

interface Employee {
  _id?: string;
  employeeId: string;
  name: string;
  email?: string;
  location?: string;
  division?: string;
  department?: string;
  designation?: string;
  dateOfJoining?: string;
  mobileNo?: string;
  contactNumber?: string;
  mobile?: string;
  bankName?: string;
  bankAccount?: string;
  accountNumber?: string;
  maritalStatus?: string;
  spouseName?: string;
}

interface InsuranceRecord {
  _id?: string;
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  branch: string;
  dateOfJoining: string;
  dateOfBirth: string;
  mobileNumber: string;
  email: string;
  nomineeName: string;
  nomineeRelationship: string;
  nomineeMobileNumber: string;
  insuredAmount: string;
}

interface UploadedDocument {
  name: string;
  type: string;
  size: number;
  uri: string;
  fileCopyUri?: string;
}

interface Claim {
  _id?: string;
  id?: string;
  employeeName: string;
  employeeId: string;
  mobile: string;
  bankName: string;
  accountNumber: string;
  relationship: string;
  spouseName?: string;
  children?: Array<{ name: string; age: string }>;
  memberName: string;
  claimNumber: string;
  treatment: string;
  sumInsured: number;
  dateOfAdmission: string;
  dateOfDischarge: string;
  requestedAmount: number;
  claimDate: string;
  closeDate?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  paymentStatus: 'Unpaid' | 'Paid' | 'Rejected';
  hospitalAddress: string;
  typeOfIllness: string;
  otherIllness?: string;
  documents: {
    employeePhoto: UploadedDocument | null;
    dischargeBill: UploadedDocument | null;
    pharmacyBill: UploadedDocument | null;
    paymentReceipt: UploadedDocument | null;
  };
}

interface InsuranceRecordFormData {
  employeeId: string;
  employeeName: string;
  department: string;
  designation: string;
  branch: string;
  dateOfJoining: string;
  dateOfBirth: string;
  mobileNumber: string;
  email: string;
  nomineeName: string;
  nomineeRelationship: string;
  nomineeMobileNumber: string;
  insuredAmount: string;
}

const illnessTypes = [
  "Fever", "Flu / Viral Infection", "Food Poisoning", "Allergy",
  "Migraine", "Asthma Attack", "Pneumonia", "COVID-19", "Gastric Pain",
  "Ulcer", "Jaundice", "Diabetes Complication", "High Blood Pressure",
  "Heart Disease", "Kidney Stone", "Arthritis", "Slip / Fall Injury",
  "Back Pain", "Fracture", "Dengue", "Malaria", "Chickenpox",
  "Typhoid", "Surgery", "Hospital Admission", "Emergency Treatment", "Other"
];

const divisions = ['SDS', 'TEKLA', 'DAS(Software)', 'Mechanical', 'Electrical'];
const branches = ['Hosur', 'Chennai'];

const steps = [
  { number: 1, title: 'EMPLOYEE DETAILS', icon: 'account-circle' },
  { number: 2, title: 'UPLOAD DOCUMENTS', icon: 'cloud-upload' },
  { number: 3, title: 'TREATMENT DETAILS', icon: 'file-document' }
];

const InsuranceScreen = () => {
  const [currentView, setCurrentView] = useState<'main' | 'newClaim' | 'claimHistory' | 'insuranceRecords'>('main');
  const [currentStep, setCurrentStep] = useState(1);
  const [viewingClaim, setViewingClaim] = useState<Claim | null>(null);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [viewingRecord, setViewingRecord] = useState<InsuranceRecord | null>(null);
  const [errors, setErrors] = useState<Record<string, string | boolean>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [insuranceRecords, setInsuranceRecords] = useState<InsuranceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showIllnessPicker, setShowIllnessPicker] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [showBranchPicker, setShowBranchPicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InsuranceRecord | null>(null);

  // Filters for insurance records
  const [filters, setFilters] = useState({
    employeeName: '',
    employeeId: '',
    department: '',
    branch: ''
  });

  // Form Data for New Claim
  const [formData, setFormData] = useState<Omit<Claim, '_id' | 'id'>>({
    employeeName: '',
    employeeId: '',
    mobile: '',
    bankName: '',
    accountNumber: '',
    relationship: 'Single',
    spouseName: '',
    children: [],
    memberName: '',
    claimNumber: '',
    treatment: '',
    sumInsured: 0,
    dateOfAdmission: '',
    dateOfDischarge: '',
    requestedAmount: 0,
    claimDate: '',
    closeDate: '',
    status: 'Pending',
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

  // Edit Form Data
  const [editFormData, setEditFormData] = useState<Omit<Claim, '_id' | 'id'>>({
    employeeName: '',
    employeeId: '',
    mobile: '',
    bankName: '',
    accountNumber: '',
    relationship: 'Single',
    spouseName: '',
    children: [],
    memberName: '',
    claimNumber: '',
    treatment: '',
    sumInsured: 0,
    dateOfAdmission: '',
    dateOfDischarge: '',
    requestedAmount: 0,
    claimDate: '',
    closeDate: '',
    status: 'Pending',
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

  // Insurance Record Form
  const initialRecordForm: InsuranceRecordFormData = {
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

  const [recordForm, setRecordForm] = useState<InsuranceRecordFormData>(initialRecordForm);
  const [recordFormErrors, setRecordFormErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchEmployees();
    fetchClaims();
    fetchInsuranceRecords();
  }, []);

  useEffect(() => {
    setErrors({});
  }, [currentStep]);

  useEffect(() => {
    if (formData.relationship === 'Married' || formData.relationship === 'Divorced' || formData.relationship === 'Widowed') {
      // Show children section
    }
  }, [formData.relationship]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getAllEmployees();
      const mapped: Employee[] = (response.data || []).map((e: any) => ({
        _id: e._id,
        employeeId: e.employeeId || e.id || '',
        name: e.name || '',
        location: e.location || e.branch || '',
        division: e.division || '',
        department: e.department || e.division || '',
        designation: e.designation || '',
        dateOfJoining: e.dateOfJoining || '',
        mobileNo: e.mobileNo || e.contactNumber || e.mobile || e.phone || '',
        bankName: e.bankName,
        bankAccount: e.bankAccount,
        accountNumber: e.accountNumber,
        maritalStatus: e.maritalStatus,
        spouseName: e.spouseName,
      }));
      setEmployees(mapped);
    } catch (error) {
      console.error("Error fetching employees:", error);
      Alert.alert('Error', 'Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };

  const fetchClaims = async () => {
    try {
      const response = await insuranceClaimAPI.getAll();
      const mapped = (response.data || []).map((c: any) => ({
        ...c,
        id: c._id,
        documents: c.documents || {
          employeePhoto: null,
          dischargeBill: null,
          pharmacyBill: null,
          paymentReceipt: null
        }
      }));
      setClaims(mapped);
    } catch (error) {
      console.error("Error fetching claims:", error);
    }
  };

  const fetchInsuranceRecords = async () => {
    try {
      const response = await insuranceAPI.getAll();
      setInsuranceRecords(response.data || []);
    } catch (error) {
      console.error("Error fetching insurance records:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchEmployees(), fetchClaims(), fetchInsuranceRecords()]).finally(() => {
      setRefreshing(false);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return { bg: COLORS.greenLight, text: COLORS.green };
      case 'Pending': return { bg: COLORS.yellowLight, text: COLORS.warning };
      case 'Rejected': return { bg: COLORS.redLight, text: COLORS.error };
      default: return { bg: COLORS.lightGray, text: COLORS.gray };
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return { bg: COLORS.greenLight, text: COLORS.green };
      case 'Unpaid': return { bg: COLORS.yellowLight, text: COLORS.warning };
      case 'Rejected': return { bg: COLORS.redLight, text: COLORS.error };
      default: return { bg: COLORS.lightGray, text: COLORS.gray };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    if (field === 'mobile') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }
    if (field === 'accountNumber') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 18) return;
    }
    if (['claimDate', 'dateOfAdmission', 'dateOfDischarge', 'closeDate'].includes(field as string)) {
      if (value && value.length > 10) return;
    }
    if (field === 'claimNumber') {
      if (!/^\d*$/.test(value)) return;
    }
    
    const textFields = ['employeeName', 'bankName', 'spouseName', 'memberName', 'claimNumber', 'treatment', 'hospitalAddress', 'otherIllness'];
    if (textFields.includes(field as string) && value.length > 250) {
      setErrors(prev => ({ ...prev, [field]: 'Maximum 250 characters allowed' }));
      return;
    }
    
    if (['spouseName', 'memberName'].includes(field as string)) {
      if (value && /[^a-zA-Z\s]/.test(value)) return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field as string]) {
      const newErrors = { ...errors };
      delete newErrors[field as string];
      setErrors(newErrors);
    }
  };

  const handleEditInputChange = (field: keyof typeof editFormData, value: any) => {
    if (['claimDate', 'dateOfAdmission', 'dateOfDischarge', 'closeDate'].includes(field as string)) {
      if (value && value.length > 10) return;
    }
    if (field === 'claimNumber') {
      if (!/^\d*$/.test(value)) return;
    }
    if (['spouseName', 'memberName'].includes(field as string)) {
      if (value && /[^a-zA-Z\s]/.test(value)) return;
    }
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmployeeSelect = (employeeId: string) => {
    setShowEmployeePicker(false);
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

      const newErrors = { ...errors };
      ['employeeId', 'employeeName', 'mobile', 'bankName', 'accountNumber', 'relationship'].forEach(field => {
        delete newErrors[field];
      });
      setErrors(newErrors);
    }
  };

  const handleRecordEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (employee) {
      setRecordForm(prev => ({
        ...prev,
        employeeId: employee.employeeId,
        employeeName: employee.name || '',
        department: employee.department || employee.division || '',
        designation: employee.designation || '',
        branch: branches.find(b => b.toLowerCase() === (employee.location || '').toLowerCase()) || employee.location || '',
        dateOfJoining: employee.dateOfJoining ? employee.dateOfJoining.split('T')[0] : '',
        mobileNumber: employee.mobileNo || employee.contactNumber || employee.mobile || '',
        email: employee.email || '',
      }));
    }
  };

  const handleFileUpload = async (field: keyof typeof formData.documents) => {
    try {
      const result = await DocumentPicker.pick({
        type: field === 'employeePhoto' 
          ? [DocumentPicker.types.images]
          : [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      if (result[0]) {
        const file = result[0];
        setFormData(prev => ({
          ...prev,
          documents: {
            ...prev.documents,
            [field]: {
              name: file.name || 'file',
              type: file.type || 'application/octet-stream',
              size: file.size || 0,
              uri: file.uri
            }
          }
        }));

        if (errors[field]) {
          const newErrors = { ...errors };
          delete newErrors[field];
          setErrors(newErrors);
        }
      }
    } catch (err: any) {
      if (err?.code === 'DOCUMENT_PICKER_CANCELED') {
        // User cancelled
      } else {
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const handleRemoveFile = (field: keyof typeof formData.documents) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: null
      }
    }));
  };

  const addChild = () => {
    setFormData(prev => ({
      ...prev,
      children: [...(prev.children || []), { name: '', age: '' }]
    }));
  };

  const removeChild = (index: number) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children?.filter((_, i) => i !== index) || []
    }));
  };

  const updateChild = (index: number, field: 'name' | 'age', value: string) => {
    if (field === 'age' && value.length > 3) return;
    if (field === 'name' && /[^a-zA-Z\s]/.test(value)) return;

    setFormData(prev => ({
      ...prev,
      children: prev.children?.map((child, i) =>
        i === index ? { ...child, [field]: value } : child
      ) || []
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string | boolean> = {};

    switch (step) {
      case 1:
        if (!formData.employeeId) newErrors.employeeId = true;
        if (!formData.employeeName) newErrors.employeeName = true;
        if (!formData.mobile || formData.mobile.length < 10) newErrors.mobile = true;
        if (!formData.bankName) newErrors.bankName = true;
        if (!formData.accountNumber || formData.accountNumber.length < 12) newErrors.accountNumber = true;
        if (formData.relationship === 'Married' && !formData.spouseName) {
          newErrors.spouseName = 'Spouse name is required';
        }
        if (formData.children) {
          formData.children.forEach((child, index) => {
            if (!child.name) newErrors[`childName_${index}`] = 'Name is required';
            if (!child.age) newErrors[`childAge_${index}`] = 'Age is required';
          });
        }
        break;
      case 2:
        if (!formData.documents.employeePhoto) newErrors.employeePhoto = true;
        if (!formData.documents.dischargeBill) newErrors.dischargeBill = true;
        if (!formData.documents.pharmacyBill) newErrors.pharmacyBill = true;
        if (!formData.documents.paymentReceipt) newErrors.paymentReceipt = true;
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else {
      Alert.alert('Validation Error', 'Please fill in all required fields');
    }
  };

  const handlePreviousStep = () => {
    setErrors({});
    setCurrentStep(currentStep - 1);
  };

  const handleSubmitClaim = async () => {
    const newErrors: Record<string, string | boolean> = {};
    const requiredFields = [
      'employeeName', 'employeeId', 'mobile', 'bankName',
      'accountNumber', 'memberName', 'claimNumber', 'treatment',
      'sumInsured', 'requestedAmount', 'dateOfAdmission', 'dateOfDischarge',
      'claimDate', 'hospitalAddress', 'typeOfIllness', 'status', 'paymentStatus'
    ];

    requiredFields.forEach(field => {
      if (!formData[field as keyof typeof formData]) newErrors[field] = true;
    });

    if (formData.typeOfIllness === 'Other' && !formData.otherIllness) {
      newErrors.otherIllness = true;
    }

    if (formData.relationship === 'Married' && !formData.spouseName) {
      newErrors.spouseName = true;
    }

    if (formData.requestedAmount > formData.sumInsured) {
      newErrors.requestedAmount = 'Requested amount cannot exceed sum insured';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Validation Error', 'Please fill in all required fields correctly');
      return;
    }

    setSaveLoading(true);
    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'documents') return;
        if (value !== null && value !== undefined) {
          if (key === 'children') {
            formDataToSend.append(key, JSON.stringify(value));
          } else {
            formDataToSend.append(key, String(value));
          }
        }
      });

      if (formData.documents.employeePhoto) {
        formDataToSend.append('employeePhoto', {
          uri: formData.documents.employeePhoto.uri,
          type: formData.documents.employeePhoto.type,
          name: formData.documents.employeePhoto.name,
        } as any);
      }
      if (formData.documents.dischargeBill) {
        formDataToSend.append('dischargeBill', {
          uri: formData.documents.dischargeBill.uri,
          type: formData.documents.dischargeBill.type,
          name: formData.documents.dischargeBill.name,
        } as any);
      }
      if (formData.documents.pharmacyBill) {
        formDataToSend.append('pharmacyBill', {
          uri: formData.documents.pharmacyBill.uri,
          type: formData.documents.pharmacyBill.type,
          name: formData.documents.pharmacyBill.name,
        } as any);
      }
      if (formData.documents.paymentReceipt) {
        formDataToSend.append('paymentReceipt', {
          uri: formData.documents.paymentReceipt.uri,
          type: formData.documents.paymentReceipt.type,
          name: formData.documents.paymentReceipt.name,
        } as any);
      }

      const response = await insuranceClaimAPI.create(formDataToSend);
      const newClaim = { ...response.data, id: response.data._id };
      setClaims(prev => [newClaim, ...prev]);
      Alert.alert('Success', 'Claim submitted successfully!');

      setFormData({
        employeeName: '',
        employeeId: '',
        mobile: '',
        bankName: '',
        accountNumber: '',
        relationship: 'Single',
        spouseName: '',
        children: [],
        memberName: '',
        claimNumber: '',
        treatment: '',
        sumInsured: 0,
        dateOfAdmission: '',
        dateOfDischarge: '',
        requestedAmount: 0,
        claimDate: '',
        closeDate: '',
        status: 'Pending',
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
    } catch (error: any) {
      console.error('Error submitting claim:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit claim');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateClaim = async () => {
    if (!editingClaim) return;

    const newErrors: Record<string, string | boolean> = {};
    const requiredFields = [
      'employeeName', 'employeeId', 'mobile', 'bankName',
      'accountNumber', 'memberName', 'claimNumber', 'treatment',
      'sumInsured', 'requestedAmount', 'dateOfAdmission', 'dateOfDischarge',
      'claimDate', 'hospitalAddress', 'typeOfIllness', 'status', 'paymentStatus'
    ];

    requiredFields.forEach(field => {
      if (!editFormData[field as keyof typeof editFormData]) newErrors[field] = true;
    });

    if (editFormData.typeOfIllness === 'Other' && !editFormData.otherIllness) {
      newErrors.otherIllness = true;
    }

    if (editFormData.requestedAmount > editFormData.sumInsured) {
      newErrors.requestedAmount = 'Requested amount cannot exceed sum insured';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Validation Error', 'Please fill in all required fields correctly');
      return;
    }

    setSaveLoading(true);
    try {
      const formDataToSend = new FormData();
      Object.entries(editFormData).forEach(([key, value]) => {
        if (key === 'documents') return;
        if (value !== null && value !== undefined) {
          if (key === 'children') {
            formDataToSend.append(key, JSON.stringify(value));
          } else {
            formDataToSend.append(key, String(value));
          }
        }
      });

      if (editFormData.documents.employeePhoto && typeof editFormData.documents.employeePhoto !== 'string') {
        formDataToSend.append('employeePhoto', {
          uri: editFormData.documents.employeePhoto.uri,
          type: editFormData.documents.employeePhoto.type,
          name: editFormData.documents.employeePhoto.name,
        } as any);
      }
      if (editFormData.documents.dischargeBill && typeof editFormData.documents.dischargeBill !== 'string') {
        formDataToSend.append('dischargeBill', {
          uri: editFormData.documents.dischargeBill.uri,
          type: editFormData.documents.dischargeBill.type,
          name: editFormData.documents.dischargeBill.name,
        } as any);
      }
      if (editFormData.documents.pharmacyBill && typeof editFormData.documents.pharmacyBill !== 'string') {
        formDataToSend.append('pharmacyBill', {
          uri: editFormData.documents.pharmacyBill.uri,
          type: editFormData.documents.pharmacyBill.type,
          name: editFormData.documents.pharmacyBill.name,
        } as any);
      }
      if (editFormData.documents.paymentReceipt && typeof editFormData.documents.paymentReceipt !== 'string') {
        formDataToSend.append('paymentReceipt', {
          uri: editFormData.documents.paymentReceipt.uri,
          type: editFormData.documents.paymentReceipt.type,
          name: editFormData.documents.paymentReceipt.name,
        } as any);
      }

      const response = await insuranceClaimAPI.update(editingClaim._id!, formDataToSend);
      const updatedClaim = { ...response.data, id: response.data._id };
      setClaims(prev => prev.map(claim =>
        claim.id === editingClaim.id ? updatedClaim : claim
      ));
      setEditingClaim(null);
      Alert.alert('Success', 'Claim updated successfully!');
    } catch (error: any) {
      console.error('Error updating claim:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update claim');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteClaim = (claimId: string) => {
    Alert.alert(
      'Delete Claim',
      'Are you sure you want to delete this claim?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await insuranceClaimAPI.delete(claimId);
              setClaims(prev => prev.filter(claim => claim.id !== claimId));
              Alert.alert('Success', 'Claim deleted successfully');
            } catch (error) {
              console.error('Error deleting claim:', error);
              Alert.alert('Error', 'Failed to delete claim');
            }
          }
        }
      ]
    );
  };

  const handleDeleteRecord = (record: InsuranceRecord) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this insurance record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await insuranceAPI.delete(record._id!);
              setInsuranceRecords(prev => prev.filter(r => r._id !== record._id));
              Alert.alert('Success', 'Record deleted successfully');
            } catch (error) {
              console.error('Error deleting record:', error);
              Alert.alert('Error', 'Failed to delete record');
            }
          }
        }
      ]
    );
  };

  const handleSaveRecord = async () => {
    const requiredFields = [
      'employeeId', 'employeeName', 'department', 'designation',
      'branch', 'dateOfJoining', 'dateOfBirth', 'mobileNumber',
      'email', 'nomineeName', 'nomineeRelationship', 'nomineeMobileNumber'
    ];

    const newErrors: Record<string, boolean> = {};
    requiredFields.forEach(field => {
      if (!recordForm[field as keyof InsuranceRecordFormData]) {
        newErrors[field] = true;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setRecordFormErrors(newErrors);
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    setSaveLoading(true);
    try {
      if (editingRecord) {
        const response = await insuranceAPI.update(editingRecord._id!, recordForm);
        setInsuranceRecords(prev => prev.map(r => r._id === editingRecord._id ? response.data : r));
        Alert.alert('Success', 'Record updated successfully');
      } else {
        const response = await insuranceAPI.create(recordForm);
        setInsuranceRecords(prev => [response.data, ...prev]);
        Alert.alert('Success', 'Record added successfully');
      }
      setShowRecordModal(false);
      setRecordForm(initialRecordForm);
      setEditingRecord(null);
    } catch (error: any) {
      console.error('Error saving record:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save record');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDownloadPDF = async (claim: Claim) => {
    const pdfContent = `
INSURANCE CLAIM DETAILS
Generated on: ${new Date().toLocaleString()}

Claim Number: ${claim.claimNumber}

BASIC INFORMATION
-----------------
Employee Name: ${claim.employeeName}
Employee ID: ${claim.employeeId}
Member Name: ${claim.memberName}
Treatment: ${claim.treatment}

FINANCIAL DETAILS
-----------------
Sum Insured: ₹${claim.sumInsured?.toLocaleString()}
Requested Amount: ₹${claim.requestedAmount?.toLocaleString()}

TREATMENT DETAILS
-----------------
Hospital: ${claim.hospitalAddress}
Illness Type: ${claim.typeOfIllness}
Admission: ${formatDate(claim.dateOfAdmission)}
Discharge: ${formatDate(claim.dateOfDischarge)}

STATUS
------
Claim Status: ${claim.status}
Payment Status: ${claim.paymentStatus}
Claim Date: ${formatDate(claim.claimDate)}
Close Date: ${claim.closeDate ? formatDate(claim.closeDate) : 'Open'}

EMPLOYEE INFORMATION
--------------------
Mobile: ${claim.mobile}
Relationship: ${claim.relationship}
${claim.spouseName ? `Spouse: ${claim.spouseName}` : ''}

BANK INFORMATION
----------------
Bank: ${claim.bankName}
Account: ${claim.accountNumber}
    `;

    const filePath = `${RNFS.DocumentDirectoryPath}/claim_${claim.claimNumber}.txt`;
    try {
      await RNFS.writeFile(filePath, pdfContent, 'utf8');
      await Share.open({
        title: 'Share Claim Details',
        url: `file://${filePath}`,
        type: 'text/plain',
        failOnCancel: false,
      });
    } catch (error: any) {
      if (error.message?.includes('User did not share')) return;
      Alert.alert('Error', 'Failed to share file');
    }
  };

  const exportToCSV = async () => {
    if (claims.length === 0) {
      Alert.alert('Warning', 'No claims to export');
      return;
    }

    const headers = ["S.No", "Claim Number", "Employee Name", "Employee ID", "Member Name", "Treatment", "Sum Insured", "Requested Amount", "Claim Date", "Status", "Payment Status"];
    const rows = claims.map((claim, index) => [
      (index + 1).toString(),
      claim.claimNumber,
      claim.employeeName,
      claim.employeeId,
      claim.memberName,
      claim.treatment,
      claim.sumInsured.toString(),
      claim.requestedAmount.toString(),
      formatDate(claim.claimDate),
      claim.status,
      claim.paymentStatus
    ]);

    let csvContent = "INSURANCE CLAIMS REPORT\n\n";
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });
    csvContent += `\nTotal Claims,${claims.length}\n`;
    csvContent += `Total Requested Amount,₹${claims.reduce((sum, claim) => sum + claim.requestedAmount, 0).toLocaleString()}\n`;

    const fileName = `insurance_claims_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csvContent, 'utf8');
      await Share.open({
        title: 'Export Insurance Claims',
        message: 'Insurance Claims Report',
        url: `file://${filePath}`,
        type: 'text/csv',
        failOnCancel: false,
      });
    } catch (error: any) {
      if (error.message?.includes('User did not share')) return;
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const filteredRecords = insuranceRecords.filter(record => {
    return (
      (filters.employeeName === '' || (record.employeeName && record.employeeName.toLowerCase().includes(filters.employeeName.toLowerCase()))) &&
      (filters.employeeId === '' || (record.employeeId && record.employeeId.toLowerCase().includes(filters.employeeId.toLowerCase()))) &&
      (filters.department === '' || (record.department && record.department.toLowerCase().includes(filters.department.toLowerCase()))) &&
      (filters.branch === '' || (record.branch && record.branch.toLowerCase().includes(filters.branch.toLowerCase())))
    );
  });

  const renderStepIndicator = () => (
    <View style={styles.stepContainer}>
      {steps.map((step, index) => (
        <View key={step.number} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            currentStep >= step.number ? styles.stepCircleActive : styles.stepCircleInactive
          ]}>
            <Icon name={step.icon} size={20} color={currentStep >= step.number ? COLORS.white : COLORS.gray} />
          </View>
          <Text style={[
            styles.stepLabel,
            currentStep >= step.number ? styles.stepLabelActive : styles.stepLabelInactive
          ]}>
            {step.title}
          </Text>
          {index < steps.length - 1 && (
            <View style={[
              styles.stepLine,
              currentStep > step.number ? styles.stepLineActive : styles.stepLineInactive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderEmployeeDetails = () => (
    <View style={styles.formSection}>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Select Employee *</Text>
        <TouchableOpacity
          onPress={() => setShowEmployeePicker(true)}
          style={[styles.selectInput, errors.employeeId && styles.inputError]}
        >
          <Text style={[styles.selectText, !formData.employeeId && styles.placeholderText]}>
            {formData.employeeName || 'Select an employee'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
        </TouchableOpacity>
        {errors.employeeId && <Text style={styles.errorText}>Employee is required</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Employee Name *</Text>
        <TextInput
          value={formData.employeeName}
          editable={false}
          style={[styles.input, styles.readOnlyInput]}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Employee ID *</Text>
        <TextInput
          value={formData.employeeId}
          editable={false}
          style={[styles.input, styles.readOnlyInput]}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Mobile Number *</Text>
        <TextInput
          value={formData.mobile}
          onChangeText={(value) => handleInputChange('mobile', value)}
          keyboardType="numeric"
          maxLength={10}
          style={[styles.input, errors.mobile && styles.inputError]}
          placeholder="Enter mobile number"
          placeholderTextColor={COLORS.gray}
        />
        {errors.mobile && <Text style={styles.errorText}>Valid mobile number is required</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Bank Name *</Text>
        <TextInput
          value={formData.bankName}
          onChangeText={(value) => handleInputChange('bankName', value)}
          style={[styles.input, errors.bankName && styles.inputError]}
          placeholder="Enter bank name"
          placeholderTextColor={COLORS.gray}
        />
        {errors.bankName && <Text style={styles.errorText}>Bank name is required</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Account Number *</Text>
        <TextInput
          value={formData.accountNumber}
          onChangeText={(value) => handleInputChange('accountNumber', value)}
          keyboardType="numeric"
          maxLength={18}
          style={[styles.input, errors.accountNumber && styles.inputError]}
          placeholder="Enter account number"
          placeholderTextColor={COLORS.gray}
        />
        {errors.accountNumber && <Text style={styles.errorText}>Valid account number is required</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Relationship Status *</Text>
        <TouchableOpacity
          onPress={() => setShowRelationshipPicker(true)}
          style={[styles.selectInput, errors.relationship && styles.inputError]}
        >
          <Text style={[styles.selectText, !formData.relationship && styles.placeholderText]}>
            {formData.relationship || 'Select relationship'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      {formData.relationship === 'Married' && (
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Spouse Name *</Text>
          <TextInput
            value={formData.spouseName}
            onChangeText={(value) => handleInputChange('spouseName', value)}
            style={[styles.input, errors.spouseName && styles.inputError]}
            placeholder="Enter spouse name"
            placeholderTextColor={COLORS.gray}
          />
          {errors.spouseName && <Text style={styles.errorText}>{errors.spouseName}</Text>}
        </View>
      )}

      {(formData.relationship === 'Married' || formData.relationship === 'Divorced' || formData.relationship === 'Widowed') && (
        <View style={styles.childrenSection}>
          <View style={styles.childrenHeader}>
            <Text style={styles.sectionSubtitle}>Children Details</Text>
            <TouchableOpacity
              onPress={addChild}
              disabled={formData.children && formData.children.length > 0 && !formData.children[formData.children.length - 1]?.name}
              style={[styles.addButton, (!formData.children || formData.children.length === 0 || formData.children[formData.children.length - 1]?.name) && styles.addButtonActive]}
            >
              <Icon name="add" size={16} color={COLORS.primary} />
              <Text style={styles.addButtonText}>Add Child</Text>
            </TouchableOpacity>
          </View>

          {formData.children?.map((child, index) => (
            <View key={index} style={styles.childCard}>
              <View style={styles.childRow}>
                <View style={styles.childNameField}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    value={child.name}
                    onChangeText={(value) => updateChild(index, 'name', value)}
                    style={[styles.input, errors[`childName_${index}`] && styles.inputError]}
                    placeholder="Child name"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.childAgeField}>
                  <Text style={styles.inputLabel}>Age *</Text>
                  <TextInput
                    value={child.age}
                    onChangeText={(value) => updateChild(index, 'age', value)}
                    keyboardType="numeric"
                    maxLength={3}
                    style={[styles.input, errors[`childAge_${index}`] && styles.inputError]}
                    placeholder="Age"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                {formData.children && formData.children.length > 1 && (
                  <TouchableOpacity onPress={() => removeChild(index)} style={styles.removeChildButton}>
                    <Icon name="delete" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>
              {errors[`childName_${index}`] && <Text style={styles.errorText}>{errors[`childName_${index}`]}</Text>}
              {errors[`childAge_${index}`] && <Text style={styles.errorText}>{errors[`childAge_${index}`]}</Text>}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderUploadDocuments = () => (
    <View style={styles.formSection}>
      <View style={styles.infoBox}>
        <Icon name="info-outline" size={20} color={COLORS.primary} />
        <Text style={styles.infoText}>
          Please upload clear copies of all required documents. Max file size: 5MB per file.
        </Text>
      </View>

      {[
        { key: 'employeePhoto', label: 'Employee Photo', required: true, accept: 'image/*' },
        { key: 'dischargeBill', label: 'Discharge Bill/Summary', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'pharmacyBill', label: 'Pharmacy Bills', required: true, accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'paymentReceipt', label: 'Payment Receipts', required: true, accept: '.pdf,.jpg,.jpeg,.png' }
      ].map((doc) => (
        <View key={doc.key} style={[styles.docCard, errors[doc.key] && styles.docCardError]}>
          <Text style={styles.docLabel}>
            {doc.label} {doc.required && <Text style={styles.requiredStar}>*</Text>}
          </Text>
          
          <TouchableOpacity
            onPress={() => handleFileUpload(doc.key as keyof typeof formData.documents)}
            style={styles.fileButton}
          >
            <Icon name="cloud-upload" size={24} color={errors[doc.key] ? COLORS.error : COLORS.primary} />
            <Text style={[styles.fileButtonText, errors[doc.key] && { color: COLORS.error }]}>Choose File</Text>
          </TouchableOpacity>

          {formData.documents[doc.key as keyof typeof formData.documents] && (
            <View style={styles.fileInfo}>
              <Icon name="check-circle" size={16} color={COLORS.success} />
              <Text style={styles.fileName} numberOfLines={1}>
                {formData.documents[doc.key as keyof typeof formData.documents]?.name}
              </Text>
              <Text style={styles.fileSize}>
                ({(formData.documents[doc.key as keyof typeof formData.documents]?.size || 0) / 1024} KB)
              </Text>
              <TouchableOpacity onPress={() => handleRemoveFile(doc.key as keyof typeof formData.documents)}>
                <Icon name="close" size={16} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          )}

          {errors[doc.key] && <Text style={styles.errorText}>{doc.label} is required</Text>}
          <Text style={styles.fileHint}>
            Accepted: {doc.accept === 'image/*' ? 'JPG, PNG' : 'PDF, JPG, PNG'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderTreatmentDetails = () => (
    <ScrollView style={styles.formSection}>
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Member Name *</Text>
        <TextInput
          value={formData.memberName}
          onChangeText={(value) => handleInputChange('memberName', value)}
          style={[styles.input, errors.memberName && styles.inputError]}
          placeholder="Enter member name"
          placeholderTextColor={COLORS.gray}
        />
        {errors.memberName && <Text style={styles.errorText}>Member name is required</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Claim Number *</Text>
        <TextInput
          value={formData.claimNumber}
          onChangeText={(value) => handleInputChange('claimNumber', value)}
          keyboardType="numeric"
          style={[styles.input, errors.claimNumber && styles.inputError]}
          placeholder="Enter claim number"
          placeholderTextColor={COLORS.gray}
        />
        {errors.claimNumber && <Text style={styles.errorText}>Claim number is required</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Treatment/Medical Procedure *</Text>
        <TextInput
          value={formData.treatment}
          onChangeText={(value) => handleInputChange('treatment', value)}
          multiline
          numberOfLines={3}
          style={[styles.textArea, errors.treatment && styles.inputError]}
          placeholder="Describe the treatment"
          placeholderTextColor={COLORS.gray}
        />
        {errors.treatment && <Text style={styles.errorText}>Treatment details are required</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Hospital Address *</Text>
        <TextInput
          value={formData.hospitalAddress}
          onChangeText={(value) => handleInputChange('hospitalAddress', value)}
          multiline
          numberOfLines={2}
          style={[styles.textArea, errors.hospitalAddress && styles.inputError]}
          placeholder="Enter hospital address"
          placeholderTextColor={COLORS.gray}
        />
        {errors.hospitalAddress && <Text style={styles.errorText}>Hospital address is required</Text>}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Type of Illness *</Text>
        <TouchableOpacity
          onPress={() => setShowIllnessPicker(true)}
          style={[styles.selectInput, errors.typeOfIllness && styles.inputError]}
        >
          <Text style={[styles.selectText, !formData.typeOfIllness && styles.placeholderText]}>
            {formData.typeOfIllness || 'Select illness type'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
        </TouchableOpacity>
        {errors.typeOfIllness && <Text style={styles.errorText}>Type of illness is required</Text>}
      </View>

      {formData.typeOfIllness === 'Other' && (
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>Other Illness *</Text>
          <TextInput
            value={formData.otherIllness}
            onChangeText={(value) => handleInputChange('otherIllness', value)}
            style={[styles.input, errors.otherIllness && styles.inputError]}
            placeholder="Please specify illness"
            placeholderTextColor={COLORS.gray}
          />
          {errors.otherIllness && <Text style={styles.errorText}>Please specify the illness</Text>}
        </View>
      )}

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.formLabel}>Sum Insured Amount *</Text>
          <TextInput
            value={formData.sumInsured?.toString()}
            onChangeText={(value) => handleInputChange('sumInsured', value)}
            keyboardType="numeric"
            style={[styles.input, errors.sumInsured && styles.inputError]}
            placeholder="Enter sum insured"
            placeholderTextColor={COLORS.gray}
          />
          {errors.sumInsured && <Text style={styles.errorText}>Sum insured is required</Text>}
        </View>

        <View style={styles.halfField}>
          <Text style={styles.formLabel}>Requested Amount *</Text>
          <TextInput
            value={formData.requestedAmount?.toString()}
            onChangeText={(value) => handleInputChange('requestedAmount', value)}
            keyboardType="numeric"
            style={[styles.input, errors.requestedAmount && styles.inputError]}
            placeholder="Enter requested amount"
            placeholderTextColor={COLORS.gray}
          />
          {errors.requestedAmount && <Text style={styles.errorText}>{typeof errors.requestedAmount === 'string' ? errors.requestedAmount : 'Requested amount is required'}</Text>}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.formLabel}>Date of Admission *</Text>
          <TextInput
            value={formData.dateOfAdmission}
            onChangeText={(value) => handleInputChange('dateOfAdmission', value)}
            placeholder="YYYY-MM-DD"
            style={[styles.input, errors.dateOfAdmission && styles.inputError]}
            placeholderTextColor={COLORS.gray}
          />
          {errors.dateOfAdmission && <Text style={styles.errorText}>Admission date is required</Text>}
        </View>

        <View style={styles.halfField}>
          <Text style={styles.formLabel}>Date of Discharge *</Text>
          <TextInput
            value={formData.dateOfDischarge}
            onChangeText={(value) => handleInputChange('dateOfDischarge', value)}
            placeholder="YYYY-MM-DD"
            style={[styles.input, errors.dateOfDischarge && styles.inputError]}
            placeholderTextColor={COLORS.gray}
          />
          {errors.dateOfDischarge && <Text style={styles.errorText}>Discharge date is required</Text>}
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.formLabel}>Claim Date *</Text>
          <TextInput
            value={formData.claimDate}
            onChangeText={(value) => handleInputChange('claimDate', value)}
            placeholder="YYYY-MM-DD"
            style={[styles.input, errors.claimDate && styles.inputError]}
            placeholderTextColor={COLORS.gray}
          />
          {errors.claimDate && <Text style={styles.errorText}>Claim date is required</Text>}
        </View>

        <View style={styles.halfField}>
          <Text style={styles.formLabel}>Close Date</Text>
          <TextInput
            value={formData.closeDate}
            onChangeText={(value) => handleInputChange('closeDate', value)}
            placeholder="YYYY-MM-DD"
            style={styles.input}
            placeholderTextColor={COLORS.gray}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.formLabel}>Claim Status *</Text>
          <View style={styles.statusOptions}>
            {['Pending', 'Approved', 'Rejected'].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => handleInputChange('status', status)}
                style={[styles.statusOption, formData.status === status && styles.statusOptionActive]}
              >
                <Text style={[styles.statusOptionText, formData.status === status && styles.statusOptionTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.status && <Text style={styles.errorText}>Claim status is required</Text>}
        </View>

        <View style={styles.halfField}>
          <Text style={styles.formLabel}>Payment Status *</Text>
          <View style={styles.statusOptions}>
            {['Unpaid', 'Paid', 'Rejected'].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => handleInputChange('paymentStatus', status)}
                style={[styles.statusOption, formData.paymentStatus === status && styles.statusOptionActive]}
              >
                <Text style={[styles.statusOptionText, formData.paymentStatus === status && styles.statusOptionTextActive]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.paymentStatus && <Text style={styles.errorText}>Payment status is required</Text>}
        </View>
      </View>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderEmployeeDetails();
      case 2: return renderUploadDocuments();
      case 3: return renderTreatmentDetails();
      default: return null;
    }
  };

  // Main View
  const renderMainView = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <CommonHeader title="Insurance" showBack={false} showMenu={true} />
      
      <ScrollView contentContainerStyle={styles.mainContent}>
        <TouchableOpacity
          onPress={() => {
            setCurrentView('newClaim');
            setErrors({});
          }}
          style={styles.mainCard}
        >
          <View style={styles.mainIconContainer}>
            <Icon name="add" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.mainTitle}>New Insurance Claim</Text>
          <Text style={styles.mainDescription}>
            Create a new insurance claim for yourself or family members
          </Text>
          <View style={styles.mainButton}>
            <Text style={styles.mainButtonText}>Create New Claim</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentView('claimHistory')}
          style={styles.mainCard}
        >
          <View style={styles.mainIconContainer}>
            <Icon name="history" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.mainTitle}>Claim History</Text>
          <Text style={styles.mainDescription}>
            View and manage your previous insurance claims
          </Text>
          <View style={styles.mainButton}>
            <Text style={styles.mainButtonText}>View History</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setCurrentView('insuranceRecords')}
          style={styles.mainCard}
        >
          <View style={styles.mainIconContainer}>
            <Icon name="people" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.mainTitle}>Insurance Records</Text>
          <Text style={styles.mainDescription}>
            Maintain member records and coverage details
          </Text>
          <View style={styles.mainButton}>
            <Text style={styles.mainButtonText}>View Records</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
      
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Insurance Claims • Employee Benefits • "
      />
    </SafeAreaView>
  );

  // New Claim View
  const renderNewClaimView = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <CommonHeader 
        title="New Insurance Claim" 
        showBack={true}
        onBack={() => {
          setCurrentView('main');
          setCurrentStep(1);
        }}
      />

      <ScrollView contentContainerStyle={styles.formContainer}>
        {renderStepIndicator()}
        {renderCurrentStep()}
      </ScrollView>

      <View style={styles.navButtons}>
        {currentStep > 1 ? (
          <TouchableOpacity onPress={handlePreviousStep} style={styles.prevButton}>
            <Text style={styles.prevButtonText}>Previous</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholderButton} />
        )}

        {currentStep < 3 ? (
          <TouchableOpacity onPress={handleNextStep} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmitClaim}
            disabled={saveLoading}
            style={[styles.submitButton, saveLoading && styles.disabledButton]}
          >
            {saveLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Icon name="send" size={18} color={COLORS.white} />
                <Text style={styles.submitButtonText}>Submit Claim</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Modals */}
      {renderEmployeePickerModal()}
      {renderRelationshipPickerModal()}
      {renderIllnessPickerModal()}
      
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Insurance Claims • Employee Benefits • "
      />
    </SafeAreaView>
  );

  // Employee Picker Modal
  const renderEmployeePickerModal = () => (
    <Modal
      visible={showEmployeePicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEmployeePicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowEmployeePicker(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Employee</Text>
            <TouchableOpacity onPress={() => setShowEmployeePicker(false)}>
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          {loading ? (
            <View style={styles.modalLoader}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={employees}
              keyExtractor={(item) => item.employeeId}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleEmployeeSelect(item.employeeId)}
                  style={[styles.modalItem, formData.employeeId === item.employeeId && styles.modalItemSelected]}
                >
                  <Text style={[styles.modalItemText, formData.employeeId === item.employeeId && styles.modalItemTextSelected]}>
                    {item.name}
                  </Text>
                  <Text style={styles.modalItemSubtext}>ID: {item.employeeId}</Text>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Relationship Picker Modal
  const renderRelationshipPickerModal = () => (
    <Modal
      visible={showRelationshipPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowRelationshipPicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowRelationshipPicker(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Relationship</Text>
            <TouchableOpacity onPress={() => setShowRelationshipPicker(false)}>
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          {['Single', 'Married', 'Divorced', 'Widowed'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => {
                handleInputChange('relationship', status);
                setShowRelationshipPicker(false);
              }}
              style={[styles.modalItem, formData.relationship === status && styles.modalItemSelected]}
            >
              <Text style={[styles.modalItemText, formData.relationship === status && styles.modalItemTextSelected]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Illness Picker Modal
  const renderIllnessPickerModal = () => (
    <Modal
      visible={showIllnessPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowIllnessPicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowIllnessPicker(false)}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Illness Type</Text>
            <TouchableOpacity onPress={() => setShowIllnessPicker(false)}>
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={illnessTypes}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  handleInputChange('typeOfIllness', item);
                  setShowIllnessPicker(false);
                }}
                style={[styles.modalItem, formData.typeOfIllness === item && styles.modalItemSelected]}
              >
                <Text style={[styles.modalItemText, formData.typeOfIllness === item && styles.modalItemTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Claim History View
  const renderClaimHistoryView = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <CommonHeader 
        title="Claim History" 
        showBack={true}
        onBack={() => setCurrentView('main')}
        rightComponent={
          claims.length > 0 ? (
            <TouchableOpacity onPress={exportToCSV}>
              <Icon name="file-download" size={24} color={COLORS.white} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      {claims.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="history" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>No claim history</Text>
          <Text style={styles.emptyText}>Start by submitting your first insurance claim.</Text>
          <TouchableOpacity onPress={() => setCurrentView('newClaim')} style={styles.createButton}>
            <Text style={styles.createButtonText}>Create First Claim</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => item.id || item._id!}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          renderItem={({ item }) => {
            const statusColors = getStatusColor(item.status);
            const paymentColors = getPaymentStatusColor(item.paymentStatus);
            
            return (
              <TouchableOpacity
                onPress={() => setViewingClaim(item)}
                style={styles.claimCard}
              >
                <View style={styles.claimHeader}>
                  <Text style={styles.claimNumber}>#{item.claimNumber}</Text>
                  <Text style={styles.claimDate}>{formatDate(item.claimDate)}</Text>
                </View>
                <Text style={styles.claimEmployee}>{item.employeeName}</Text>
                <Text style={styles.claimTreatment} numberOfLines={1}>{item.treatment}</Text>
                <View style={styles.claimFooter}>
                  <View>
                    <Text style={styles.claimAmountLabel}>Requested</Text>
                    <Text style={styles.claimAmount}>₹{item.requestedAmount?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.claimStatuses}>
                    <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                      <Text style={[styles.statusText, { color: statusColors.text }]}>{item.status}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: paymentColors.bg }]}>
                      <Text style={[styles.statusText, { color: paymentColors.text }]}>{item.paymentStatus}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.claimActions}>
                  <TouchableOpacity onPress={() => {
                    setEditingClaim(item);
                    setEditFormData({
                      ...item,
                      sumInsured: item.sumInsured,
                      requestedAmount: item.requestedAmount,
                    });
                  }} style={styles.actionButton}>
                    <Icon name="edit" size={20} color={COLORS.blue} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteClaim(item.id || item._id!)} style={styles.actionButton}>
                    <Icon name="delete" size={20} color={COLORS.red} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDownloadPDF(item)} style={styles.actionButton}>
                    <Icon name="file-download" size={20} color={COLORS.green} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {renderViewClaimModal()}
      {renderEditClaimModal()}
      
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Insurance Claims • Employee Benefits • "
      />
    </SafeAreaView>
  );

  // View Claim Modal
  const renderViewClaimModal = () => (
    <Modal
      visible={!!viewingClaim}
      transparent
      animationType="slide"
      onRequestClose={() => setViewingClaim(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.fullModalContent}>
          <View style={styles.modalHeaderGradient}>
            <View>
              <Text style={styles.modalHeaderTitle}>Claim Details</Text>
              <Text style={styles.modalHeaderSubtitle}>#{viewingClaim?.claimNumber}</Text>
            </View>
            <TouchableOpacity onPress={() => setViewingClaim(null)}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {viewingClaim && (
            <ScrollView style={styles.modalBody}>
              {/* Basic Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Basic Information</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Claim Number</Text>
                    <Text style={styles.detailValue}>{viewingClaim.claimNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Member Name</Text>
                    <Text style={styles.detailValue}>{viewingClaim.memberName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Treatment</Text>
                    <Text style={styles.detailValue}>{viewingClaim.treatment}</Text>
                  </View>
                </View>
              </View>

              {/* Financial Details */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Financial Details</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Sum Insured</Text>
                    <Text style={[styles.detailValue, styles.amountGreen]}>₹{viewingClaim.sumInsured?.toLocaleString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Requested Amount</Text>
                    <Text style={[styles.detailValue, styles.amountBlue]}>₹{viewingClaim.requestedAmount?.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {/* Treatment Dates */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Treatment Dates</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Admission</Text>
                    <Text style={styles.detailValue}>{formatDate(viewingClaim.dateOfAdmission)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Discharge</Text>
                    <Text style={styles.detailValue}>{formatDate(viewingClaim.dateOfDischarge)}</Text>
                  </View>
                </View>
              </View>

              {/* Status */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Status</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Claim Status</Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(viewingClaim.status).bg }]}>
                      <Text style={[styles.statusTextSmall, { color: getStatusColor(viewingClaim.status).text }]}>
                        {viewingClaim.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Status</Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: getPaymentStatusColor(viewingClaim.paymentStatus).bg }]}>
                      <Text style={[styles.statusTextSmall, { color: getPaymentStatusColor(viewingClaim.paymentStatus).text }]}>
                        {viewingClaim.paymentStatus}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Claim Date</Text>
                    <Text style={styles.detailValue}>{formatDate(viewingClaim.claimDate)}</Text>
                  </View>
                  {viewingClaim.closeDate && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Close Date</Text>
                      <Text style={styles.detailValue}>{formatDate(viewingClaim.closeDate)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Hospital Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Hospital Information</Text>
                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{viewingClaim.hospitalAddress}</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Illness Type</Text>
                    <Text style={[styles.detailValue, styles.primaryText]}>{viewingClaim.typeOfIllness}</Text>
                  </View>
                </View>
              </View>

              {/* Employee Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Employee Information</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Name</Text>
                    <Text style={styles.detailValue}>{viewingClaim.employeeName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Employee ID</Text>
                    <Text style={styles.detailValue}>{viewingClaim.employeeId}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mobile</Text>
                    <Text style={styles.detailValue}>{viewingClaim.mobile}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Relationship</Text>
                    <Text style={styles.detailValue}>{viewingClaim.relationship}</Text>
                  </View>
                  {viewingClaim.spouseName && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Spouse Name</Text>
                      <Text style={styles.detailValue}>{viewingClaim.spouseName}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Bank Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Bank Information</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Bank Name</Text>
                    <Text style={styles.detailValue}>{viewingClaim.bankName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Account Number</Text>
                    <Text style={styles.detailValue}>{viewingClaim.accountNumber}</Text>
                  </View>
                </View>
              </View>

              {/* Family Details */}
              {(viewingClaim.spouseName || (viewingClaim.children && viewingClaim.children.length > 0)) && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Family Details</Text>
                  <View style={styles.detailCard}>
                    {viewingClaim.spouseName && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Spouse Name</Text>
                        <Text style={styles.detailValue}>{viewingClaim.spouseName}</Text>
                      </View>
                    )}
                    {viewingClaim.children && viewingClaim.children.length > 0 && (
                      <View>
                        <Text style={styles.detailLabel}>Children</Text>
                        {viewingClaim.children.map((child, index) => (
                          <View key={index} style={styles.childDetailRow}>
                            <Text style={styles.childDetailName}>{child.name}</Text>
                            <Text style={styles.childDetailAge}>{child.age} yrs</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Documents */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Uploaded Documents</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Employee Photo</Text>
                    <Text style={styles.detailValue}>{viewingClaim.documents.employeePhoto?.name || 'Not uploaded'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Discharge Bill</Text>
                    <Text style={styles.detailValue}>{viewingClaim.documents.dischargeBill?.name || 'Not uploaded'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Pharmacy Bill</Text>
                    <Text style={styles.detailValue}>{viewingClaim.documents.pharmacyBill?.name || 'Not uploaded'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Receipt</Text>
                    <Text style={styles.detailValue}>{viewingClaim.documents.paymentReceipt?.name || 'Not uploaded'}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={() => viewingClaim && handleDownloadPDF(viewingClaim)} style={styles.downloadButton}>
              <Icon name="file-download" size={20} color={COLORS.primary} />
              <Text style={styles.downloadButtonText}>Download</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewingClaim(null)} style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Edit Claim Modal
  const renderEditClaimModal = () => (
    <Modal
      visible={!!editingClaim}
      transparent
      animationType="slide"
      onRequestClose={() => setEditingClaim(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.fullModalContent}>
          <View style={styles.modalHeaderGradient}>
            <View>
              <Text style={styles.modalHeaderTitle}>Edit Claim</Text>
              <Text style={styles.modalHeaderSubtitle}>#{editingClaim?.claimNumber}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditingClaim(null)}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Employee Details Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Employee Details</Text>
              <View style={styles.detailCard}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Employee Name *</Text>
                  <TextInput
                    value={editFormData.employeeName}
                    onChangeText={(value) => handleEditInputChange('employeeName', value)}
                    style={styles.input}
                    placeholder="Enter employee name"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Employee ID *</Text>
                  <TextInput
                    value={editFormData.employeeId}
                    onChangeText={(value) => handleEditInputChange('employeeId', value)}
                    style={styles.input}
                    placeholder="Enter employee ID"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Mobile Number *</Text>
                  <TextInput
                    value={editFormData.mobile}
                    onChangeText={(value) => handleEditInputChange('mobile', value)}
                    keyboardType="numeric"
                    maxLength={10}
                    style={styles.input}
                    placeholder="Enter mobile number"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Bank Name *</Text>
                  <TextInput
                    value={editFormData.bankName}
                    onChangeText={(value) => handleEditInputChange('bankName', value)}
                    style={styles.input}
                    placeholder="Enter bank name"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Account Number *</Text>
                  <TextInput
                    value={editFormData.accountNumber}
                    onChangeText={(value) => handleEditInputChange('accountNumber', value)}
                    keyboardType="numeric"
                    maxLength={18}
                    style={styles.input}
                    placeholder="Enter account number"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Relationship Status *</Text>
                  <View style={styles.statusOptions}>
                    {['Single', 'Married', 'Divorced', 'Widowed'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => handleEditInputChange('relationship', status)}
                        style={[styles.statusOption, editFormData.relationship === status && styles.statusOptionActive]}
                      >
                        <Text style={[styles.statusOptionText, editFormData.relationship === status && styles.statusOptionTextActive]}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                {editFormData.relationship === 'Married' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Spouse Name *</Text>
                    <TextInput
                      value={editFormData.spouseName}
                      onChangeText={(value) => handleEditInputChange('spouseName', value)}
                      style={styles.input}
                      placeholder="Enter spouse name"
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                )}
              </View>
            </View>

            {/* Treatment Details Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Treatment Details</Text>
              <View style={styles.detailCard}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Member Name *</Text>
                  <TextInput
                    value={editFormData.memberName}
                    onChangeText={(value) => handleEditInputChange('memberName', value)}
                    style={styles.input}
                    placeholder="Enter member name"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Claim Number *</Text>
                  <TextInput
                    value={editFormData.claimNumber}
                    onChangeText={(value) => handleEditInputChange('claimNumber', value)}
                    keyboardType="numeric"
                    style={styles.input}
                    placeholder="Enter claim number"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Treatment *</Text>
                  <TextInput
                    value={editFormData.treatment}
                    onChangeText={(value) => handleEditInputChange('treatment', value)}
                    multiline
                    numberOfLines={3}
                    style={styles.textArea}
                    placeholder="Describe treatment"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Hospital Address *</Text>
                  <TextInput
                    value={editFormData.hospitalAddress}
                    onChangeText={(value) => handleEditInputChange('hospitalAddress', value)}
                    multiline
                    numberOfLines={2}
                    style={styles.textArea}
                    placeholder="Enter hospital address"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Type of Illness *</Text>
                  <TouchableOpacity
                    onPress={() => setShowIllnessPicker(true)}
                    style={styles.selectInput}
                  >
                    <Text style={[styles.selectText, !editFormData.typeOfIllness && styles.placeholderText]}>
                      {editFormData.typeOfIllness || 'Select illness type'}
                    </Text>
                    <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
                {editFormData.typeOfIllness === 'Other' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Other Illness *</Text>
                    <TextInput
                      value={editFormData.otherIllness}
                      onChangeText={(value) => handleEditInputChange('otherIllness', value)}
                      style={styles.input}
                      placeholder="Please specify"
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                )}
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.formLabel}>Sum Insured *</Text>
                    <TextInput
                      value={editFormData.sumInsured?.toString()}
                      onChangeText={(value) => handleEditInputChange('sumInsured', value)}
                      keyboardType="numeric"
                      style={styles.input}
                      placeholder="Enter sum insured"
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.formLabel}>Requested Amount *</Text>
                    <TextInput
                      value={editFormData.requestedAmount?.toString()}
                      onChangeText={(value) => handleEditInputChange('requestedAmount', value)}
                      keyboardType="numeric"
                      style={styles.input}
                      placeholder="Enter requested amount"
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.formLabel}>Date of Admission *</Text>
                    <TextInput
                      value={editFormData.dateOfAdmission}
                      onChangeText={(value) => handleEditInputChange('dateOfAdmission', value)}
                      placeholder="YYYY-MM-DD"
                      style={styles.input}
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.formLabel}>Date of Discharge *</Text>
                    <TextInput
                      value={editFormData.dateOfDischarge}
                      onChangeText={(value) => handleEditInputChange('dateOfDischarge', value)}
                      placeholder="YYYY-MM-DD"
                      style={styles.input}
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.formLabel}>Claim Date *</Text>
                    <TextInput
                      value={editFormData.claimDate}
                      onChangeText={(value) => handleEditInputChange('claimDate', value)}
                      placeholder="YYYY-MM-DD"
                      style={styles.input}
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.formLabel}>Close Date</Text>
                    <TextInput
                      value={editFormData.closeDate}
                      onChangeText={(value) => handleEditInputChange('closeDate', value)}
                      placeholder="YYYY-MM-DD"
                      style={styles.input}
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.formLabel}>Claim Status *</Text>
                    <View style={styles.statusOptions}>
                      {['Pending', 'Approved', 'Rejected'].map((status) => (
                        <TouchableOpacity
                          key={status}
                          onPress={() => handleEditInputChange('status', status)}
                          style={[styles.statusOption, editFormData.status === status && styles.statusOptionActive]}
                        >
                          <Text style={[styles.statusOptionText, editFormData.status === status && styles.statusOptionTextActive]}>
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View style={styles.halfField}>
                    <Text style={styles.formLabel}>Payment Status *</Text>
                    <View style={styles.statusOptions}>
                      {['Unpaid', 'Paid', 'Rejected'].map((status) => (
                        <TouchableOpacity
                          key={status}
                          onPress={() => handleEditInputChange('paymentStatus', status)}
                          style={[styles.statusOption, editFormData.paymentStatus === status && styles.statusOptionActive]}
                        >
                          <Text style={[styles.statusOptionText, editFormData.paymentStatus === status && styles.statusOptionTextActive]}>
                            {status}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={() => setEditingClaim(null)} style={styles.cancelEditButton}>
              <Text style={styles.cancelEditButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleUpdateClaim}
              disabled={saveLoading}
              style={[styles.updateButton, saveLoading && styles.disabledButton]}
            >
              {saveLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.updateButtonText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Insurance Records View
  const renderInsuranceRecordsView = () => (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <CommonHeader 
        title="Insurance Records" 
        showBack={true}
        onBack={() => setCurrentView('main')}
      />

      <View style={styles.recordsHeader}>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterButton}>
          <Icon name="filter-list" size={20} color={COLORS.primary} />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => {
          setRecordForm(initialRecordForm);
          setEditingRecord(null);
          setRecordFormErrors({});
          setShowRecordModal(true);
        }} style={styles.addRecordButton}>
          <Icon name="add" size={20} color={COLORS.white} />
          <Text style={styles.addRecordButtonText}>Add New Member</Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersPanel}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Employee Name</Text>
              <TextInput
                value={filters.employeeName}
                onChangeText={(value) => setFilters(prev => ({ ...prev, employeeName: value }))}
                placeholder="Filter by name..."
                style={styles.filterInput}
                placeholderTextColor={COLORS.gray}
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Employee ID</Text>
              <TextInput
                value={filters.employeeId}
                onChangeText={(value) => setFilters(prev => ({ ...prev, employeeId: value }))}
                placeholder="Filter by ID..."
                style={styles.filterInput}
                placeholderTextColor={COLORS.gray}
              />
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Division</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={filters.department}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="All Divisions" value="" />
                  {divisions.map(div => (
                    <Picker.Item key={div} label={div} value={div} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Location</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={filters.branch}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, branch: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="All Locations" value="" />
                  {branches.map(branch => (
                    <Picker.Item key={branch} label={branch} value={branch} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
          {(filters.employeeName || filters.employeeId || filters.department || filters.branch) && (
            <TouchableOpacity onPress={() => setFilters({ employeeName: '', employeeId: '', department: '', branch: '' })} style={styles.clearFiltersButton}>
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {filteredRecords.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="people" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>No insurance records</Text>
          <Text style={styles.emptyText}>Add members to manage insurance coverage records.</Text>
          <TouchableOpacity onPress={() => {
            setRecordForm(initialRecordForm);
            setEditingRecord(null);
            setRecordFormErrors({});
            setShowRecordModal(true);
          }} style={styles.createButton}>
            <Text style={styles.createButtonText}>Add New Member</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item._id || item.employeeId}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          renderItem={({ item }) => (
            <View style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View>
                  <Text style={styles.recordName}>{item.employeeName}</Text>
                  <Text style={styles.recordId}>ID: {item.employeeId}</Text>
                </View>
                <View style={styles.recordActions}>
                  <TouchableOpacity onPress={() => {
                    setViewingRecord(item);
                  }} style={styles.recordActionButton}>
                    <Icon name="visibility" size={20} color={COLORS.blue} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => {
                    setEditingRecord(item);
                    setRecordForm({
                      employeeId: item.employeeId,
                      employeeName: item.employeeName,
                      department: item.department,
                      designation: item.designation,
                      branch: item.branch,
                      dateOfJoining: item.dateOfJoining?.split('T')[0] || '',
                      dateOfBirth: item.dateOfBirth?.split('T')[0] || '',
                      mobileNumber: item.mobileNumber,
                      email: item.email,
                      nomineeName: item.nomineeName,
                      nomineeRelationship: item.nomineeRelationship,
                      nomineeMobileNumber: item.nomineeMobileNumber,
                      insuredAmount: item.insuredAmount,
                    });
                    setRecordFormErrors({});
                    setShowRecordModal(true);
                  }} style={styles.recordActionButton}>
                    <Icon name="edit" size={20} color={COLORS.green} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteRecord(item)} style={styles.recordActionButton}>
                    <Icon name="delete" size={20} color={COLORS.red} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.recordDetails}>
                <View style={styles.recordDetail}>
                  <Text style={styles.recordDetailLabel}>Division</Text>
                  <Text style={styles.recordDetailValue}>{item.department}</Text>
                </View>
                <View style={styles.recordDetail}>
                  <Text style={styles.recordDetailLabel}>Designation</Text>
                  <Text style={styles.recordDetailValue}>{item.designation}</Text>
                </View>
                <View style={styles.recordDetail}>
                  <Text style={styles.recordDetailLabel}>Location</Text>
                  <Text style={styles.recordDetailValue}>{item.branch}</Text>
                </View>
                <View style={styles.recordDetail}>
                  <Text style={styles.recordDetailLabel}>Nominee</Text>
                  <Text style={styles.recordDetailValue}>{item.nomineeName} ({item.nomineeRelationship})</Text>
                </View>
              </View>
              <View style={styles.recordFooter}>
                <Text style={styles.recordInsured}>Insured Amount: {item.insuredAmount}</Text>
              </View>
            </View>
          )}
        />
      )}

      {renderViewRecordModal()}
      {renderRecordModal()}
      
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Insurance Records • Member Coverage • "
      />
    </SafeAreaView>
  );

  // View Record Modal
  const renderViewRecordModal = () => (
    <Modal
      visible={!!viewingRecord}
      transparent
      animationType="slide"
      onRequestClose={() => setViewingRecord(null)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.fullModalContent}>
          <View style={styles.modalHeaderGradient}>
            <View>
              <Text style={styles.modalHeaderTitle}>Member Details</Text>
              <Text style={styles.modalHeaderSubtitle}>{viewingRecord?.employeeName}</Text>
            </View>
            <TouchableOpacity onPress={() => setViewingRecord(null)}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {viewingRecord && (
            <ScrollView style={styles.modalBody}>
              {/* Personal Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Personal Information</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Employee ID</Text>
                    <Text style={styles.detailValue}>{viewingRecord.employeeId}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Employee Name</Text>
                    <Text style={styles.detailValue}>{viewingRecord.employeeName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Division</Text>
                    <Text style={styles.detailValue}>{viewingRecord.department}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Designation</Text>
                    <Text style={styles.detailValue}>{viewingRecord.designation}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{viewingRecord.branch}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date of Joining</Text>
                    <Text style={styles.detailValue}>{formatDate(viewingRecord.dateOfJoining)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date of Birth</Text>
                    <Text style={styles.detailValue}>{formatDate(viewingRecord.dateOfBirth)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Mobile Number</Text>
                    <Text style={styles.detailValue}>{viewingRecord.mobileNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{viewingRecord.email}</Text>
                  </View>
                </View>
              </View>

              {/* Nominee Information */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Nominee Information</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nominee Name</Text>
                    <Text style={styles.detailValue}>{viewingRecord.nomineeName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Relationship</Text>
                    <Text style={styles.detailValue}>{viewingRecord.nomineeRelationship}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nominee Mobile</Text>
                    <Text style={styles.detailValue}>{viewingRecord.nomineeMobileNumber}</Text>
                  </View>
                </View>
              </View>

              {/* Insurance Details */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Insurance Details</Text>
                <View style={styles.detailCard}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Insured Amount</Text>
                    <Text style={[styles.detailValue, styles.amountGreen]}>{viewingRecord.insuredAmount}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={() => setViewingRecord(null)} style={styles.closeModalButton}>
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Record Modal (Add/Edit)
  const renderRecordModal = () => (
    <Modal
      visible={showRecordModal}
      transparent
      animationType="slide"
      onRequestClose={() => {
        setShowRecordModal(false);
        setRecordForm(initialRecordForm);
        setEditingRecord(null);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.fullModalContent}>
          <View style={styles.modalHeaderGradient}>
            <Text style={styles.modalHeaderTitle}>
              {editingRecord ? 'Edit Insurance Member' : 'Add New Insurance Member'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowRecordModal(false);
              setRecordForm(initialRecordForm);
              setEditingRecord(null);
            }}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Employee ID</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={recordForm.employeeId}
                  onValueChange={handleRecordEmployeeSelect}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Employee" value="" />
                  {employees.map(emp => (
                    <Picker.Item key={emp.employeeId} label={`${emp.employeeId} - ${emp.name}`} value={emp.employeeId} />
                  ))}
                </Picker>
              </View>
              {recordFormErrors.employeeId && <Text style={styles.errorText}>Employee ID is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Employee Name</Text>
              <TextInput
                value={recordForm.employeeName}
                editable={false}
                style={[styles.input, styles.readOnlyInput]}
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Division</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={recordForm.department}
                  onValueChange={(value) => setRecordForm(prev => ({ ...prev, department: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Division" value="" />
                  {divisions.map(div => (
                    <Picker.Item key={div} label={div} value={div} />
                  ))}
                </Picker>
              </View>
              {recordFormErrors.department && <Text style={styles.errorText}>Division is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Designation</Text>
              <TextInput
                value={recordForm.designation}
                onChangeText={(value) => setRecordForm(prev => ({ ...prev, designation: value }))}
                style={[styles.input, recordFormErrors.designation && styles.inputError]}
                placeholder="Enter designation"
                placeholderTextColor={COLORS.gray}
              />
              {recordFormErrors.designation && <Text style={styles.errorText}>Designation is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Location</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={recordForm.branch}
                  onValueChange={(value) => setRecordForm(prev => ({ ...prev, branch: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="Select Location" value="" />
                  {branches.map(branch => (
                    <Picker.Item key={branch} label={branch} value={branch} />
                  ))}
                </Picker>
              </View>
              {recordFormErrors.branch && <Text style={styles.errorText}>Location is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date of Joining</Text>
              <TextInput
                value={recordForm.dateOfJoining}
                onChangeText={(value) => setRecordForm(prev => ({ ...prev, dateOfJoining: value }))}
                placeholder="YYYY-MM-DD"
                style={[styles.input, recordFormErrors.dateOfJoining && styles.inputError]}
                placeholderTextColor={COLORS.gray}
              />
              {recordFormErrors.dateOfJoining && <Text style={styles.errorText}>Date of Joining is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date of Birth</Text>
              <TextInput
                value={recordForm.dateOfBirth}
                onChangeText={(value) => setRecordForm(prev => ({ ...prev, dateOfBirth: value }))}
                placeholder="YYYY-MM-DD"
                style={[styles.input, recordFormErrors.dateOfBirth && styles.inputError]}
                placeholderTextColor={COLORS.gray}
              />
              {recordFormErrors.dateOfBirth && <Text style={styles.errorText}>Date of Birth is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mobile Number</Text>
              <TextInput
                value={recordForm.mobileNumber}
                onChangeText={(value) => setRecordForm(prev => ({ ...prev, mobileNumber: value }))}
                keyboardType="numeric"
                maxLength={10}
                style={[styles.input, recordFormErrors.mobileNumber && styles.inputError]}
                placeholder="Enter mobile number"
                placeholderTextColor={COLORS.gray}
              />
              {recordFormErrors.mobileNumber && <Text style={styles.errorText}>Mobile Number is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                value={recordForm.email}
                onChangeText={(value) => setRecordForm(prev => ({ ...prev, email: value }))}
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, recordFormErrors.email && styles.inputError]}
                placeholder="Enter email address"
                placeholderTextColor={COLORS.gray}
              />
              {recordFormErrors.email && <Text style={styles.errorText}>Email is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nominee Name</Text>
              <TextInput
                value={recordForm.nomineeName}
                onChangeText={(value) => setRecordForm(prev => ({ ...prev, nomineeName: value }))}
                style={[styles.input, recordFormErrors.nomineeName && styles.inputError]}
                placeholder="Enter nominee name"
                placeholderTextColor={COLORS.gray}
              />
              {recordFormErrors.nomineeName && <Text style={styles.errorText}>Nominee Name is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nominee Relationship</Text>
              <TextInput
                value={recordForm.nomineeRelationship}
                onChangeText={(value) => setRecordForm(prev => ({ ...prev, nomineeRelationship: value }))}
                style={[styles.input, recordFormErrors.nomineeRelationship && styles.inputError]}
                placeholder="Enter relationship"
                placeholderTextColor={COLORS.gray}
              />
              {recordFormErrors.nomineeRelationship && <Text style={styles.errorText}>Nominee Relationship is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nominee Mobile Number</Text>
              <TextInput
                value={recordForm.nomineeMobileNumber}
                onChangeText={(value) => setRecordForm(prev => ({ ...prev, nomineeMobileNumber: value }))}
                keyboardType="numeric"
                maxLength={10}
                style={[styles.input, recordFormErrors.nomineeMobileNumber && styles.inputError]}
                placeholder="Enter nominee mobile number"
                placeholderTextColor={COLORS.gray}
              />
              {recordFormErrors.nomineeMobileNumber && <Text style={styles.errorText}>Nominee Mobile Number is required</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Insured Amount</Text>
              <TextInput
                value="₹2,00,000"
                editable={false}
                style={[styles.input, styles.readOnlyInput]}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity onPress={() => {
              setShowRecordModal(false);
              setRecordForm(initialRecordForm);
              setEditingRecord(null);
            }} style={styles.cancelEditButton}>
              <Text style={styles.cancelEditButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveRecord}
              disabled={saveLoading}
              style={[styles.updateButton, saveLoading && styles.disabledButton]}
            >
              {saveLoading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.updateButtonText}>{editingRecord ? 'Update' : 'Save'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {currentView === 'main' && renderMainView()}
      {currentView === 'newClaim' && renderNewClaimView()}
      {currentView === 'claimHistory' && renderClaimHistoryView()}
      {currentView === 'insuranceRecords' && renderInsuranceRecordsView()}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mainContent: {
    padding: 16,
    paddingBottom: 30,
  },
  mainCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 32,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mainIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(38, 39, 96, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  mainDescription: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 16,
  },
  mainButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  mainButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  formContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  stepCircleInactive: {
    borderColor: COLORS.lightGray,
  },
  stepLabel: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  stepLabelInactive: {
    color: COLORS.gray,
  },
  stepLine: {
    width: 40,
    height: 2,
    marginHorizontal: 4,
  },
  stepLineActive: {
    backgroundColor: COLORS.primary,
  },
  stepLineInactive: {
    backgroundColor: COLORS.lightGray,
  },
  formSection: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  readOnlyInput: {
    backgroundColor: COLORS.filterBg,
    color: COLORS.textSecondary,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  selectInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: COLORS.gray,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  infoBox: {
    backgroundColor: 'rgba(38, 39, 96, 0.05)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: 'rgba(38, 39, 96, 0.8)',
    flex: 1,
  },
  docCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  docCardError: {
    borderColor: COLORS.error,
  },
  docLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 8,
  },
  requiredStar: {
    color: COLORS.error,
  },
  fileButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    backgroundColor: COLORS.filterBg,
  },
  fileButtonText: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.primary,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  fileName: {
    fontSize: 12,
    color: COLORS.primary,
    flex: 1,
  },
  fileSize: {
    fontSize: 10,
    color: COLORS.gray,
  },
  fileHint: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 4,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: COLORS.filterBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusOptionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statusOptionTextActive: {
    color: COLORS.white,
  },
  childrenSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
    marginTop: 8,
  },
  childrenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonActive: {
    backgroundColor: 'rgba(38, 39, 96, 0.1)',
  },
  addButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
  },
  childCard: {
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  childNameField: {
    flex: 1,
  },
  childAgeField: {
    width: 80,
  },
  inputLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 4,
  },
  removeChildButton: {
    padding: 8,
    marginTop: 20,
  },
  navButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  placeholderButton: {
    width: 80,
  },
  prevButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  prevButtonText: {
    color: COLORS.gray,
    fontWeight: '600',
  },
  nextButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  nextButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  fullModalContent: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalHeaderGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalLoader: {
    padding: 32,
    alignItems: 'center',
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalItemSelected: {
    backgroundColor: COLORS.selectedBg,
  },
  modalItemText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  modalItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalItemSubtext: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  claimCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  claimNumber: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  claimDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  claimEmployee: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  claimTreatment: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  claimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  claimAmountLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  claimAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  claimStatuses: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextSmall: {
    fontSize: 9,
    fontWeight: '600',
  },
  claimActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: COLORS.filterBg,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  amountGreen: {
    color: COLORS.green,
    fontWeight: 'bold',
  },
  amountBlue: {
    color: COLORS.blue,
    fontWeight: 'bold',
  },
  primaryText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  childDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  childDetailName: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  childDetailAge: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  downloadButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  downloadButtonText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  closeModalButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  cancelEditButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelEditButtonText: {
    color: COLORS.gray,
    fontWeight: '600',
  },
  updateButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  updateButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.filterBg,
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
  addRecordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    gap: 8,
  },
  addRecordButtonText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  filtersPanel: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterItem: {
    minWidth: 160,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 4,
  },
  filterInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  picker: {
    height: 44,
    color: COLORS.textPrimary,
  },
  clearFiltersButton: {
    alignItems: 'center',
    marginTop: 8,
  },
  clearFiltersText: {
    fontSize: 12,
    color: COLORS.red,
    fontWeight: '500',
  },
  recordCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  recordId: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 12,
  },
  recordActionButton: {
    padding: 8,
  },
  recordDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  recordDetail: {
    flex: 1,
    minWidth: 120,
  },
  recordDetailLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  recordDetailValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  recordFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 4,
  },
  recordInsured: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.green,
  },
});

export default InsuranceScreen;