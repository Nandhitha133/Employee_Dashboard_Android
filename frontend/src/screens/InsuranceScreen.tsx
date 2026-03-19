// screens/InsuranceScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as DocumentPicker from 'react-native-document-picker';
import { types } from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { employeeAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';

// Types
interface UploadedDocument {
  name: string;
  type: string;
  size: number;
  uri: string;
  fileCopyUri?: string;
}

interface Claim {
  id: string;
  employeeName: string;
  employeeId: string;
  claimNumber: string;
  memberName: string;
  treatment: string;
  sumInsured: number;
  requestedAmount: number;
  claimDate: string;
  closeDate: string;
  status: 'Approved' | 'Pending' | 'Rejected';
  paymentStatus: 'Paid' | 'Pending' | 'Rejected' | 'Unpaid';
  dateOfAdmission: string;
  dateOfDischarge: string;
  bankName: string;
  accountNumber: string;
  relationship: string;
  mobile: string;
  spouseName?: string;
  hospitalAddress: string;
  typeOfIllness: string;
  otherIllness?: string;
  children?: Array<{ name: string; age: string }>;
  documents: {
    employeePhoto: UploadedDocument | null;
    dischargeBill: UploadedDocument | null;
    pharmacyBill: UploadedDocument | null;
    paymentReceipt: UploadedDocument | null;
  };
}

interface Employee {
  employeeId: string;
  name: string;
  mobileNo?: string;
  contactNumber?: string;
  mobile?: string;
  bankName?: string;
  bankAccount?: string;
  accountNumber?: string;
  maritalStatus?: string;
  spouseName?: string;
}

// Illness types
const illnessTypes = [
  "Fever", "Flu / Viral Infection", "Food Poisoning", "Allergy",
  "Migraine", "Asthma Attack", "Pneumonia", "COVID-19", "Gastric Pain",
  "Ulcer", "Jaundice", "Diabetes Complication", "High Blood Pressure",
  "Heart Disease", "Kidney Stone", "Arthritis", "Slip / Fall Injury",
  "Back Pain", "Fracture", "Dengue", "Malaria", "Chickenpox",
  "Typhoid", "Surgery", "Hospital Admission", "Emergency Treatment", "Other"
];

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  accent: '#4A148C',
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
};

const InsuranceScreen = () => {
  const [currentView, setCurrentView] = useState<'main' | 'newClaim' | 'claimHistory'>('main');
  const [currentStep, setCurrentStep] = useState(1);
  const [viewingClaim, setViewingClaim] = useState<Claim | null>(null);
  const [editingClaim, setEditingClaim] = useState<Claim | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean | string>>({});
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [showIllnessPicker, setShowIllnessPicker] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);
  const [showChildren, setShowChildren] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchClaims();
  }, []);

  // Clear errors when changing steps
  useEffect(() => {
    setErrors({});
  }, [currentStep]);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await employeeAPI.getAllEmployees();
      const mapped: Employee[] = (response.data || []).map((e: any) => ({
        employeeId: e.employeeId || e.id || '',
        name: e.name || '',
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
      // Replace with actual API call
      // const response = await insuranceAPI.getAllClaims();
      // setClaims(response.data);
    } catch (error) {
      console.error("Error fetching claims:", error);
    }
  };

  const [editFormData, setEditFormData] = useState<Omit<Claim, 'id'>>({
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

  const [formData, setFormData] = useState<Omit<Claim, 'id'>>({
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

  const [claims, setClaims] = useState<Claim[]>([]);

  // Show/hide children based on relationship status
  useEffect(() => {
    if (formData.relationship === 'Married' || formData.relationship === 'Divorced' || formData.relationship === 'Widowed') {
      setShowChildren(true);
    } else {
      setShowChildren(false);
      setFormData(prev => ({
        ...prev,
        children: []
      }));
    }
  }, [formData.relationship]);

  const steps = [
    { number: 1, title: 'EMPLOYEE DETAILS', icon: 'account-circle' },
    { number: 2, title: 'UPLOAD DOCUMENTS', icon: 'cloud-upload' },
    { number: 3, title: 'TREATMENT DETAILS', icon: 'file-document' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return { bg: '#D1FAE5', text: '#065F46' };
      case 'Pending': return { bg: '#FEF3C7', text: '#92400E' };
      case 'Rejected': return { bg: '#FEE2E2', text: '#991B1B' };
      default: return { bg: '#F3F4F6', text: '#1F2937' };
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return { bg: '#D1FAE5', text: '#065F46' };
      case 'Pending': return { bg: '#FEF3C7', text: '#92400E' };
      case 'Rejected': return { bg: '#FEE2E2', text: '#991B1B' };
      default: return { bg: '#F3F4F6', text: '#1F2937' };
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
    // Validation for specific fields
    if (field === 'mobile') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 10) return;
    }
    if (field === 'accountNumber') {
      if (!/^\d*$/.test(value)) return;
      if (value.length > 18) return;
    }

    // Date validation
    if (['claimDate', 'dateOfAdmission', 'dateOfDischarge', 'closeDate'].includes(field as string)) {
      if (value && value.length > 10) return;
    }

    // Claim number only numbers
    if (field === 'claimNumber') {
      if (!/^\d*$/.test(value)) return;
    }

    // Character limit 250
    const textFields = ['employeeName', 'bankName', 'spouseName', 'memberName', 'claimNumber', 'treatment', 'hospitalAddress', 'otherIllness'];
    if (textFields.includes(field as string) && value.length > 250) {
      setErrors(prev => ({ ...prev, [field]: 'Maximum 250 characters allowed' }));
      return;
    }

    // Alphabets only for name fields
    if (['spouseName', 'memberName'].includes(field as string)) {
      if (value && /[^a-zA-Z\s]/.test(value)) return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error if exists
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

      // Clear errors
      const newErrors = { ...errors };
      ['employeeId', 'employeeName', 'mobile', 'bankName', 'accountNumber', 'relationship'].forEach(field => {
        delete newErrors[field];
      });
      setErrors(newErrors);
    }
  };

  const handleFileUpload = async (field: keyof typeof formData.documents) => {
    try {
      const result = await DocumentPicker.pick({
        type: field === 'employeePhoto' 
          ? [types.images]
          : [types.pdf, types.images],
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

        // Clear error
        if (errors[field] || errors.documents) {
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
    const newErrors: Record<string, boolean | string> = {};

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

        // Validate children if shown
        if (showChildren && formData.children) {
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
    const newErrors: Record<string, boolean | string> = {};
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

    // Validate requested amount
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
      const newClaim: Omit<Claim, 'id'> = {
        ...formData,
        sumInsured: Number(formData.sumInsured),
        requestedAmount: Number(formData.requestedAmount),
      };

      // Replace with actual API call
      // const response = await insuranceAPI.createClaim(newClaim);
      // setClaims(prev => [response.data, ...prev]);

      // Mock success for now
      Alert.alert('Success', 'Claim submitted successfully!');

      // Reset form
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
    } catch (error) {
      console.error('Error submitting claim:', error);
      Alert.alert('Error', 'Failed to submit claim');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUpdateClaim = async () => {
    if (!editingClaim) return;

    const newErrors: Record<string, boolean | string> = {};
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
      // Replace with actual API call
      // await insuranceAPI.updateClaim(editingClaim.id, editFormData);
      
      setClaims(prev => prev.map(claim =>
        claim.id === editingClaim.id
          ? {
            ...claim,
            ...editFormData,
            sumInsured: Number(editFormData.sumInsured),
            requestedAmount: Number(editFormData.requestedAmount),
          }
          : claim
      ));

      setEditingClaim(null);
      Alert.alert('Success', 'Claim updated successfully!');
    } catch (error) {
      console.error('Error updating claim:', error);
      Alert.alert('Error', 'Failed to update claim');
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
              // Replace with actual API call
              // await insuranceAPI.deleteClaim(claimId);
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

  const generatePDFContent = (claim: Claim): string => {
    return `
      INSURANCE CLAIM DETAILS
      
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
      
      Generated on: ${new Date().toLocaleString()}
    `;
  };

  const handleDownloadPDF = async (claim: Claim) => {
    try {
      const pdfContent = generatePDFContent(claim);
      const filePath = `${RNFS.DocumentDirectoryPath}/claim_${claim.claimNumber}.txt`;
      
      await RNFS.writeFile(filePath, pdfContent, 'utf8');
      
      const shareOptions = {
        title: 'Share Claim Details',
        url: `file://${filePath}`,
        type: 'text/plain',
      };

      await Share.open(shareOptions);
    } catch (error) {
      console.error('Error sharing file:', error);
      Alert.alert('Error', 'Failed to share claim details');
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
      
      const shareOptions = {
        title: 'Export Insurance Claims',
        message: 'Insurance Claims Report',
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

  const renderStepIndicator = () => (
    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <View style={{ alignItems: 'center' }}>
              <View style={[{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 2,
                justifyContent: 'center',
                alignItems: 'center',
              }, currentStep >= step.number ? {
                backgroundColor: COLORS.primary,
                borderColor: COLORS.primary,
              } : {
                borderColor: COLORS.lightGray,
              }]}>
                <Icon 
                  name={step.icon} 
                  size={20} 
                  color={currentStep >= step.number ? COLORS.white : COLORS.gray} 
                />
              </View>
              <Text style={[{
                fontSize: 10,
                marginTop: 4,
                textAlign: 'center',
              }, currentStep >= step.number ? {
                color: COLORS.primary,
                fontWeight: '600',
              } : {
                color: COLORS.gray,
              }]}>
                {step.title}
              </Text>
            </View>
            {index < steps.length - 1 && (
              <View style={[{
                width: 40,
                height: 2,
                marginHorizontal: 4,
              }, currentStep > step.number ? {
                backgroundColor: COLORS.primary,
              } : {
                backgroundColor: COLORS.lightGray,
              }]} />
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );

  const renderEmployeeDetails = () => (
    <View style={{ padding: 16 }}>
      {/* Employee Selection Dropdown */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Select Employee *
        </Text>
        <TouchableOpacity
          onPress={() => setShowEmployeePicker(true)}
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            backgroundColor: COLORS.white,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }, errors.employeeId ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}>
          <Text style={{
            color: formData.employeeId ? COLORS.black : COLORS.gray,
          }}>
            {formData.employeeName || 'Select an employee'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
        </TouchableOpacity>
        {errors.employeeId && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Employee is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Employee Name *
        </Text>
        <TextInput
          value={formData.employeeName}
          editable={false}
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: '#F9FAFB',
          }, errors.employeeName ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
        />
        {errors.employeeName && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Employee name is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Mobile Number *
        </Text>
        <TextInput
          value={formData.mobile}
          onChangeText={(value) => handleInputChange('mobile', value)}
          keyboardType="numeric"
          maxLength={10}
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }, errors.mobile ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholder="Enter mobile number"
          placeholderTextColor={COLORS.gray}
        />
        {errors.mobile && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Valid mobile number is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Bank Name *
        </Text>
        <TextInput
          value={formData.bankName}
          onChangeText={(value) => handleInputChange('bankName', value)}
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }, errors.bankName ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholder="Enter bank name"
          placeholderTextColor={COLORS.gray}
        />
        {errors.bankName && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Bank name is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Account Number *
        </Text>
        <TextInput
          value={formData.accountNumber}
          onChangeText={(value) => handleInputChange('accountNumber', value)}
          keyboardType="numeric"
          maxLength={18}
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }, errors.accountNumber ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholder="Enter account number"
          placeholderTextColor={COLORS.gray}
        />
        {errors.accountNumber && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Valid account number is required
          </Text>
        )}
      </View>

      {/* Relationship Status Dropdown */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Relationship Status *
        </Text>
        <TouchableOpacity
          onPress={() => setShowRelationshipPicker(true)}
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            backgroundColor: COLORS.white,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }, errors.relationship ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}>
          <Text style={{
            color: formData.relationship ? COLORS.black : COLORS.gray,
          }}>
            {formData.relationship || 'Select relationship'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
        </TouchableOpacity>
      </View>

      {formData.relationship === 'Married' && (
        <View style={{ marginBottom: 16, borderTopWidth: 1, borderTopColor: COLORS.lightGray, paddingTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.black, marginBottom: 12 }}>
            Spouse Details
          </Text>
          <View>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
              Spouse Name *
            </Text>
            <TextInput
              value={formData.spouseName}
              onChangeText={(value) => handleInputChange('spouseName', value)}
              style={[{
                borderWidth: 1,
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                backgroundColor: COLORS.white,
              }, errors.spouseName ? {
                borderColor: COLORS.error,
              } : {
                borderColor: COLORS.lightGray,
              }]}
              placeholder="Enter spouse name"
              placeholderTextColor={COLORS.gray}
            />
            {errors.spouseName && (
              <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
                {typeof errors.spouseName === 'string' ? errors.spouseName : 'Spouse name is required'}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Children Section - Only shown when showChildren is true */}
      {showChildren && (
        <View style={{ borderTopWidth: 1, borderTopColor: COLORS.lightGray, paddingTop: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.black }}>
              Children Details
            </Text>
            <TouchableOpacity
              onPress={addChild}
              disabled={formData.children && formData.children.length > 0 && !formData.children[formData.children.length - 1]?.name}
              style={[{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }, formData.children && formData.children.length > 0 && !formData.children[formData.children.length - 1]?.name ? {
                backgroundColor: '#F3F4F6',
              } : {
                backgroundColor: 'rgba(38, 39, 96, 0.1)',
              }]}>
              <Text style={{
                color: formData.children && formData.children.length > 0 && !formData.children[formData.children.length - 1]?.name 
                  ? COLORS.gray 
                  : COLORS.primary,
                fontWeight: '500',
              }}>
                + Add Child
              </Text>
            </TouchableOpacity>
          </View>

          {formData.children?.map((child, index) => (
            <View key={index} style={{ marginBottom: 12, padding: 12, borderWidth: 1, borderColor: COLORS.lightGray, borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>Name *</Text>
                  <TextInput
                    value={child.name}
                    onChangeText={(value) => updateChild(index, 'name', value)}
                    style={[{
                      borderWidth: 1,
                      borderRadius: 6,
                      padding: 8,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                    }, errors[`childName_${index}`] ? {
                      borderColor: COLORS.error,
                    } : {
                      borderColor: COLORS.lightGray,
                    }]}
                    placeholder="Child name"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <View style={{ width: 80 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>Age *</Text>
                  <TextInput
                    value={child.age}
                    onChangeText={(value) => updateChild(index, 'age', value)}
                    keyboardType="numeric"
                    maxLength={3}
                    style={[{
                      borderWidth: 1,
                      borderRadius: 6,
                      padding: 8,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                    }, errors[`childAge_${index}`] ? {
                      borderColor: COLORS.error,
                    } : {
                      borderColor: COLORS.lightGray,
                    }]}
                    placeholder="Age"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>
              {formData.children && formData.children.length > 1 && (
                <TouchableOpacity
                  onPress={() => removeChild(index)}
                  style={{ alignSelf: 'flex-end' }}>
                  <Text style={{ color: COLORS.error }}>Remove</Text>
                </TouchableOpacity>
              )}
              {errors[`childName_${index}`] && (
                <Text style={{ color: COLORS.error, fontSize: 10, marginTop: 2 }}>
                  {errors[`childName_${index}`]}
                </Text>
              )}
              {errors[`childAge_${index}`] && (
                <Text style={{ color: COLORS.error, fontSize: 10, marginTop: 2 }}>
                  {errors[`childAge_${index}`]}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderUploadDocuments = () => (
    <View style={{ padding: 16 }}>
      <View style={{ backgroundColor: 'rgba(38, 39, 96, 0.05)', borderRadius: 8, padding: 12, marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, marginBottom: 4 }}>
          Required Documents
        </Text>
        <Text style={{ fontSize: 12, color: 'rgba(38, 39, 96, 0.8)' }}>
          Please upload clear copies. Max file size: 5MB per file.
        </Text>
      </View>

      {[
        { key: 'employeePhoto', label: 'Employee Photo', accept: 'image/*' },
        { key: 'dischargeBill', label: 'Discharge Bill/Summary', accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'pharmacyBill', label: 'Pharmacy Bills', accept: '.pdf,.jpg,.jpeg,.png' },
        { key: 'paymentReceipt', label: 'Payment Receipts', accept: '.pdf,.jpg,.jpeg,.png' }
      ].map((doc) => (
        <View key={doc.key} style={[{
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }, errors[doc.key] ? {
          borderColor: COLORS.error,
        } : {
          borderColor: COLORS.lightGray,
        }]}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
            {doc.label} *
          </Text>
          
          <TouchableOpacity
            onPress={() => handleFileUpload(doc.key as keyof typeof formData.documents)}
            style={{
              borderWidth: 1,
              borderColor: errors[doc.key] ? COLORS.error : COLORS.lightGray,
              borderStyle: 'dashed',
              borderRadius: 8,
              padding: 12,
              alignItems: 'center',
              backgroundColor: '#F9FAFB',
            }}>
            <Icon name="cloud-upload" size={24} color={errors[doc.key] ? COLORS.error : COLORS.primary} />
            <Text style={{ color: errors[doc.key] ? COLORS.error : COLORS.primary, marginTop: 4 }}>
              Choose File
            </Text>
          </TouchableOpacity>

          {formData.documents[doc.key as keyof typeof formData.documents] && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: COLORS.primary }} numberOfLines={1}>
                  ✓ {formData.documents[doc.key as keyof typeof formData.documents]?.name}
                </Text>
                <Text style={{ fontSize: 10, color: COLORS.gray }}>
                  {((formData.documents[doc.key as keyof typeof formData.documents]?.size || 0) / 1024).toFixed(2)} KB
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemoveFile(doc.key as keyof typeof formData.documents)}>
                <Icon name="close" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          )}

          {errors[doc.key] && (
            <Text style={{ color: COLORS.error, fontSize: 10, marginTop: 4 }}>
              {doc.label} is required
            </Text>
          )}

          <Text style={{ fontSize: 10, color: COLORS.gray, marginTop: 4 }}>
            Accepted: {doc.accept === 'image/*' ? 'JPG, PNG' : 'PDF, JPG, PNG'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderTreatmentDetails = () => (
    <ScrollView style={{ padding: 16 }}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Member Name *
        </Text>
        <TextInput
          value={formData.memberName}
          onChangeText={(value) => handleInputChange('memberName', value)}
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }, errors.memberName ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholder="Enter member name"
          placeholderTextColor={COLORS.gray}
        />
        {errors.memberName && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Member name is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Claim Number *
        </Text>
        <TextInput
          value={formData.claimNumber}
          onChangeText={(value) => handleInputChange('claimNumber', value)}
          keyboardType="numeric"
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }, errors.claimNumber ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholder="Enter claim number"
          placeholderTextColor={COLORS.gray}
        />
        {errors.claimNumber && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Claim number is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Treatment/Medical Procedure *
        </Text>
        <TextInput
          value={formData.treatment}
          onChangeText={(value) => handleInputChange('treatment', value)}
          multiline
          numberOfLines={3}
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
            textAlignVertical: 'top',
            minHeight: 80,
          }, errors.treatment ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholder="Describe the treatment"
          placeholderTextColor={COLORS.gray}
        />
        {errors.treatment && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Treatment details are required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Hospital Address *
        </Text>
        <TextInput
          value={formData.hospitalAddress}
          onChangeText={(value) => handleInputChange('hospitalAddress', value)}
          multiline
          numberOfLines={2}
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
            textAlignVertical: 'top',
            minHeight: 60,
          }, errors.hospitalAddress ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholder="Enter hospital address"
          placeholderTextColor={COLORS.gray}
        />
        {errors.hospitalAddress && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Hospital address is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Type of Illness *
        </Text>
        <TouchableOpacity
          onPress={() => setShowIllnessPicker(true)}
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            backgroundColor: COLORS.white,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }, errors.typeOfIllness ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}>
          <Text style={{
            color: formData.typeOfIllness ? COLORS.black : COLORS.gray,
          }}>
            {formData.typeOfIllness || 'Select illness type'}
          </Text>
          <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
        </TouchableOpacity>
        {errors.typeOfIllness && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Type of illness is required
          </Text>
        )}
      </View>

      {formData.typeOfIllness === 'Other' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
            Other Illness *
          </Text>
          <TextInput
            value={formData.otherIllness}
            onChangeText={(value) => handleInputChange('otherIllness', value)}
            style={[{
              borderWidth: 1,
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              backgroundColor: COLORS.white,
            }, errors.otherIllness ? {
              borderColor: COLORS.error,
            } : {
              borderColor: COLORS.lightGray,
            }]}
            placeholder="Please specify illness"
            placeholderTextColor={COLORS.gray}
          />
          {errors.otherIllness && (
            <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
              Please specify the illness
            </Text>
          )}
        </View>
      )}

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Sum Insured Amount *
        </Text>
        <TextInput
          value={formData.sumInsured?.toString()}
          onChangeText={(value) => handleInputChange('sumInsured', value)}
          keyboardType="numeric"
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }, errors.sumInsured ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholder="Enter sum insured amount"
          placeholderTextColor={COLORS.gray}
        />
        {errors.sumInsured && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Sum insured is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Requested Amount *
        </Text>
        <TextInput
          value={formData.requestedAmount?.toString()}
          onChangeText={(value) => handleInputChange('requestedAmount', value)}
          keyboardType="numeric"
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }, errors.requestedAmount ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholder="Enter requested amount"
          placeholderTextColor={COLORS.gray}
        />
        {errors.requestedAmount && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            {typeof errors.requestedAmount === 'string' ? errors.requestedAmount : 'Requested amount is required'}
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Date of Admission *
        </Text>
        <TextInput
          value={formData.dateOfAdmission}
          onChangeText={(value) => handleInputChange('dateOfAdmission', value)}
          placeholder="YYYY-MM-DD"
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }, errors.dateOfAdmission ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholderTextColor={COLORS.gray}
        />
        {errors.dateOfAdmission && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Admission date is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Date of Discharge *
        </Text>
        <TextInput
          value={formData.dateOfDischarge}
          onChangeText={(value) => handleInputChange('dateOfDischarge', value)}
          placeholder="YYYY-MM-DD"
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }, errors.dateOfDischarge ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholderTextColor={COLORS.gray}
        />
        {errors.dateOfDischarge && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Discharge date is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Claim Date *
        </Text>
        <TextInput
          value={formData.claimDate}
          onChangeText={(value) => handleInputChange('claimDate', value)}
          placeholder="YYYY-MM-DD"
          style={[{
            borderWidth: 1,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }, errors.claimDate ? {
            borderColor: COLORS.error,
          } : {
            borderColor: COLORS.lightGray,
          }]}
          placeholderTextColor={COLORS.gray}
        />
        {errors.claimDate && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Claim date is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Close Date
        </Text>
        <TextInput
          value={formData.closeDate}
          onChangeText={(value) => handleInputChange('closeDate', value)}
          placeholder="YYYY-MM-DD"
          style={{
            borderWidth: 1,
            borderColor: COLORS.lightGray,
            borderRadius: 8,
            padding: 12,
            fontSize: 14,
            backgroundColor: COLORS.white,
          }}
          placeholderTextColor={COLORS.gray}
        />
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Claim Status *
        </Text>
        <View style={[{
          borderWidth: 1,
          borderRadius: 8,
          borderColor: errors.status ? COLORS.error : COLORS.lightGray,
        }]}>
          {['Pending', 'Approved', 'Rejected'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => handleInputChange('status', status)}
              style={[{
                padding: 12,
                borderBottomWidth: status !== 'Rejected' ? 1 : 0,
                borderBottomColor: COLORS.lightGray,
                backgroundColor: formData.status === status ? '#EEF2FF' : COLORS.white,
              }]}>
              <Text style={{
                color: formData.status === status ? COLORS.primary : COLORS.black,
                fontWeight: formData.status === status ? '600' : '400',
              }}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.status && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Claim status is required
          </Text>
        )}
      </View>

      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>
          Payment Status *
        </Text>
        <View style={[{
          borderWidth: 1,
          borderRadius: 8,
          borderColor: errors.paymentStatus ? COLORS.error : COLORS.lightGray,
        }]}>
          {['Unpaid', 'Paid', 'Rejected'].map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => handleInputChange('paymentStatus', status)}
              style={[{
                padding: 12,
                borderBottomWidth: status !== 'Rejected' ? 1 : 0,
                borderBottomColor: COLORS.lightGray,
                backgroundColor: formData.paymentStatus === status ? '#EEF2FF' : COLORS.white,
              }]}>
              <Text style={{
                color: formData.paymentStatus === status ? COLORS.primary : COLORS.black,
                fontWeight: formData.paymentStatus === status ? '600' : '400',
              }}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.paymentStatus && (
          <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 4 }}>
            Payment status is required
          </Text>
        )}
      </View>
    </ScrollView>
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

  const renderMainView = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <CommonHeader 
        title="Insurance" 
        showBack={false} 
        showMenu={true}
      />
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
        showsVerticalScrollIndicator={true}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            onPress={() => {
              setCurrentView('newClaim');
              setErrors({});
            }}
            style={{
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
            }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(38, 39, 96, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Icon name="add" size={40} color={COLORS.primary} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 }}>
              New Insurance Claim
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 16 }}>
              Create a new insurance claim for yourself or family members
            </Text>
            <View style={{
              backgroundColor: COLORS.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
            }}>
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>Create New Claim</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCurrentView('claimHistory')}
            style={{
              backgroundColor: COLORS.white,
              borderRadius: 16,
              padding: 32,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(38, 39, 96, 0.1)',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Icon name="history" size={40} color={COLORS.primary} />
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8 }}>
              Claim History
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 16 }}>
              View and manage your previous insurance claims
            </Text>
            <View style={{
              backgroundColor: COLORS.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
            }}>
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>View History</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Insurance Claims • Employee Benefits • "
      />
    </SafeAreaView>
  );

  const renderNewClaimView = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <CommonHeader 
        title="New Insurance Claim" 
        showBack={true}
        onBack={() => {
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
          setErrors({});
        }}
      />

      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {renderStepIndicator()}
        {renderCurrentStep()}
      </ScrollView>

      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.white,
      }}>
        {currentStep > 1 ? (
          <TouchableOpacity
            onPress={handlePreviousStep}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 8,
            }}>
            <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Previous</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}

        {currentStep < 3 ? (
          <TouchableOpacity
            onPress={handleNextStep}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: COLORS.primary,
              borderRadius: 8,
            }}>
            <Text style={{ color: COLORS.white, fontWeight: '600' }}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleSubmitClaim}
            disabled={saveLoading}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 24,
              backgroundColor: COLORS.primary,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              opacity: saveLoading ? 0.7 : 1,
            }}>
            {saveLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Icon name="send" size={18} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Submit Claim</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Employee Picker Modal */}
      <Modal
        visible={showEmployeePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEmployeePicker(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setShowEmployeePicker(false)}>
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '70%',
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>
                Select Employee
              </Text>
              <TouchableOpacity onPress={() => setShowEmployeePicker(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {employees.map((employee) => (
                  <TouchableOpacity
                    key={employee.employeeId}
                    onPress={() => handleEmployeeSelect(employee.employeeId)}
                    style={{
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.border,
                      backgroundColor: formData.employeeId === employee.employeeId ? COLORS.selectedBg : COLORS.white,
                    }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: formData.employeeId === employee.employeeId ? COLORS.primary : COLORS.textPrimary,
                    }}>
                      {employee.name}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: COLORS.textSecondary,
                      marginTop: 4,
                    }}>
                      ID: {employee.employeeId}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Relationship Picker Modal */}
      <Modal
        visible={showRelationshipPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRelationshipPicker(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setShowRelationshipPicker(false)}>
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>
                Select Relationship
              </Text>
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
                style={{
                  padding: 16,
                  borderBottomWidth: status !== 'Widowed' ? 1 : 0,
                  borderBottomColor: COLORS.border,
                  backgroundColor: formData.relationship === status ? COLORS.selectedBg : COLORS.white,
                }}>
                <Text style={{
                  fontSize: 16,
                  color: formData.relationship === status ? COLORS.primary : COLORS.textPrimary,
                  fontWeight: formData.relationship === status ? '600' : '400',
                }}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Illness Type Picker Modal */}
      <Modal
        visible={showIllnessPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowIllnessPicker(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setShowIllnessPicker(false)}>
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '70%',
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>
                Select Illness Type
              </Text>
              <TouchableOpacity onPress={() => setShowIllnessPicker(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {illnessTypes.map((illness, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    handleInputChange('typeOfIllness', illness);
                    setShowIllnessPicker(false);
                  }}
                  style={{
                    padding: 16,
                    borderBottomWidth: index < illnessTypes.length - 1 ? 1 : 0,
                    borderBottomColor: COLORS.border,
                    backgroundColor: formData.typeOfIllness === illness ? COLORS.selectedBg : COLORS.white,
                  }}>
                  <Text style={{
                    color: formData.typeOfIllness === illness ? COLORS.primary : COLORS.textPrimary,
                    fontWeight: formData.typeOfIllness === illness ? '600' : '400',
                  }}>
                    {illness}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Insurance Claims • Employee Benefits • "
      />
    </SafeAreaView>
  );

  const renderClaimHistoryView = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
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
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}
        >
          <Icon name="history" size={64} color={COLORS.lightGray} />
          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 }}>
            No claim history
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            Start by submitting your first insurance claim.
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentView('newClaim')}
            style={{
              backgroundColor: COLORS.primary,
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
            }}>
            <Text style={{ color: COLORS.white, fontWeight: '600' }}>Create First Claim</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlatList
          data={claims}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          renderItem={({ item }) => {
            const statusColors = getStatusColor(item.status);
            const paymentColors = getPaymentStatusColor(item.paymentStatus);

            return (
              <TouchableOpacity
                onPress={() => setViewingClaim(item)}
                style={{
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
                }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>#{item.claimNumber}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{formatDate(item.claimDate)}</Text>
                </View>
                
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 }}>
                  {item.employeeName}
                </Text>
                
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }} numberOfLines={1}>
                  {item.treatment}
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Requested</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>
                      ₹{item.requestedAmount?.toLocaleString()}
                    </Text>
                  </View>
                  
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                      marginBottom: 4,
                    }, { backgroundColor: statusColors.bg }]}>
                      <Text style={{ fontSize: 10, color: statusColors.text, fontWeight: '600' }}>
                        {item.status}
                      </Text>
                    </View>
                    <View style={[{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 4,
                    }, { backgroundColor: paymentColors.bg }]}>
                      <Text style={{ fontSize: 10, color: paymentColors.text, fontWeight: '600' }}>
                        {item.paymentStatus}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingClaim(item);
                      setEditFormData({
                        ...item,
                        sumInsured: item.sumInsured,
                        requestedAmount: item.requestedAmount,
                      });
                    }}
                    style={{ padding: 8 }}>
                    <Icon name="edit" size={20} color={COLORS.blue} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteClaim(item.id)}
                    style={{ padding: 8 }}>
                    <Icon name="delete" size={20} color={COLORS.red} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDownloadPDF(item)}
                    style={{ padding: 8 }}>
                    <Icon name="file-download" size={20} color={COLORS.green} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* View Claim Modal */}
      <Modal
        visible={!!viewingClaim}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingClaim(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            flex: 1,
            backgroundColor: COLORS.white,
            marginTop: 50,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
              backgroundColor: COLORS.primary,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>
                  Claim Details
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  #{viewingClaim?.claimNumber}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setViewingClaim(null)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {viewingClaim && (
              <ScrollView style={{ flex: 1, padding: 16 }}>
                {/* Basic Information */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                    Basic Information
                  </Text>
                  <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Claim Number</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>
                        {viewingClaim.claimNumber}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Member Name</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>
                        {viewingClaim.memberName}
                      </Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 }}>Treatment</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewingClaim.treatment}</Text>
                    </View>
                  </View>
                </View>

                {/* Financial Details */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                    Financial Details
                  </Text>
                  <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Sum Insured</Text>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.green }}>
                        ₹{viewingClaim.sumInsured?.toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Requested Amount</Text>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.blue }}>
                        ₹{viewingClaim.requestedAmount?.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Treatment Dates */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                    Treatment Dates
                  </Text>
                  <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Admission</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>
                        {formatDate(viewingClaim.dateOfAdmission)}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Discharge</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>
                        {formatDate(viewingClaim.dateOfDischarge)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Status */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                    Status
                  </Text>
                  <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Claim Status</Text>
                      <View style={[{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      }, { backgroundColor: getStatusColor(viewingClaim.status).bg }]}>
                        <Text style={{ fontSize: 12, color: getStatusColor(viewingClaim.status).text, fontWeight: '600' }}>
                          {viewingClaim.status}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Payment Status</Text>
                      <View style={[{
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                      }, { backgroundColor: getPaymentStatusColor(viewingClaim.paymentStatus).bg }]}>
                        <Text style={{ fontSize: 12, color: getPaymentStatusColor(viewingClaim.paymentStatus).text, fontWeight: '600' }}>
                          {viewingClaim.paymentStatus}
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>Claim Date</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                        {formatDate(viewingClaim.claimDate)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Hospital Information */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                    Hospital Information
                  </Text>
                  <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                    <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 }}>Address</Text>
                    <Text style={{ fontSize: 14, color: COLORS.textPrimary, marginBottom: 8 }}>
                      {viewingClaim.hospitalAddress}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Illness Type</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary }}>
                        {viewingClaim.typeOfIllness}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Employee Information */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                    Employee Information
                  </Text>
                  <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Name</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>
                        {viewingClaim.employeeName}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Employee ID</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                        {viewingClaim.employeeId}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Mobile</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                        {viewingClaim.mobile}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Relationship</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                        {viewingClaim.relationship}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Bank Information */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                    Bank Information
                  </Text>
                  <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Bank Name</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>
                        {viewingClaim.bankName}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Account Number</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                        {viewingClaim.accountNumber}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Family Details */}
                {(viewingClaim.spouseName || (viewingClaim.children && viewingClaim.children.length > 0)) && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                      Family Details
                    </Text>
                    <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                      {viewingClaim.spouseName && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Spouse Name</Text>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>
                            {viewingClaim.spouseName}
                          </Text>
                        </View>
                      )}
                      {viewingClaim.children && viewingClaim.children.length > 0 && (
                        <View>
                          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }}>Children</Text>
                          {viewingClaim.children.map((child, index) => (
                            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{child.name}</Text>
                              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{child.age} yrs</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Documents */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                    Uploaded Documents
                  </Text>
                  <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: COLORS.border }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Employee Photo</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                        {viewingClaim.documents.employeePhoto?.name || 'Not uploaded'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Discharge Bill</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                        {viewingClaim.documents.dischargeBill?.name || 'Not uploaded'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Pharmacy Bill</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                        {viewingClaim.documents.pharmacyBill?.name || 'Not uploaded'}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Payment Receipt</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                        {viewingClaim.documents.paymentReceipt?.name || 'Not uploaded'}
                      </Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}>
              <TouchableOpacity
                onPress={() => viewingClaim && handleDownloadPDF(viewingClaim)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                  borderRadius: 8,
                  alignItems: 'center',
                }}>
                <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewingClaim(null)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  marginLeft: 8,
                  backgroundColor: COLORS.primary,
                  borderRadius: 8,
                  alignItems: 'center',
                }}>
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Claim Modal */}
      <Modal
        visible={!!editingClaim}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingClaim(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            flex: 1,
            backgroundColor: COLORS.white,
            marginTop: 50,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
              backgroundColor: COLORS.primary,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>
                  Edit Claim
                </Text>
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  #{editingClaim?.claimNumber}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingClaim(null)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 16 }}>
              {/* Employee Details Section */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                  Employee Details
                </Text>
                
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Employee Name *
                  </Text>
                  <TextInput
                    value={editFormData.employeeName}
                    onChangeText={(value) => handleEditInputChange('employeeName', value)}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.employeeName ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Enter employee name"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Employee ID *
                  </Text>
                  <TextInput
                    value={editFormData.employeeId}
                    onChangeText={(value) => handleEditInputChange('employeeId', value)}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.employeeId ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Enter employee ID"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Mobile Number *
                  </Text>
                  <TextInput
                    value={editFormData.mobile}
                    onChangeText={(value) => handleEditInputChange('mobile', value)}
                    keyboardType="numeric"
                    maxLength={10}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.mobile ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Enter mobile number"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Bank Name *
                  </Text>
                  <TextInput
                    value={editFormData.bankName}
                    onChangeText={(value) => handleEditInputChange('bankName', value)}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.bankName ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Enter bank name"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Account Number *
                  </Text>
                  <TextInput
                    value={editFormData.accountNumber}
                    onChangeText={(value) => handleEditInputChange('accountNumber', value)}
                    keyboardType="numeric"
                    maxLength={18}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.accountNumber ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Enter account number"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Relationship Status *
                  </Text>
                  <View style={{
                    borderWidth: 1,
                    borderColor: errors.relationship ? COLORS.error : COLORS.border,
                    borderRadius: 8,
                  }}>
                    {['Single', 'Married', 'Divorced', 'Widowed'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => handleEditInputChange('relationship', status)}
                        style={[{
                          padding: 12,
                          borderBottomWidth: status !== 'Widowed' ? 1 : 0,
                          borderBottomColor: COLORS.border,
                          backgroundColor: editFormData.relationship === status ? COLORS.selectedBg : COLORS.white,
                        }]}>
                        <Text style={{
                          color: editFormData.relationship === status ? COLORS.primary : COLORS.textPrimary,
                          fontWeight: editFormData.relationship === status ? '600' : '400',
                        }}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Treatment Details Section */}
              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                  Treatment Details
                </Text>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Member Name *
                  </Text>
                  <TextInput
                    value={editFormData.memberName}
                    onChangeText={(value) => handleEditInputChange('memberName', value)}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.memberName ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Enter member name"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Claim Number *
                  </Text>
                  <TextInput
                    value={editFormData.claimNumber}
                    onChangeText={(value) => handleEditInputChange('claimNumber', value)}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.claimNumber ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Enter claim number"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Treatment *
                  </Text>
                  <TextInput
                    value={editFormData.treatment}
                    onChangeText={(value) => handleEditInputChange('treatment', value)}
                    multiline
                    numberOfLines={3}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.treatment ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                      textAlignVertical: 'top',
                      minHeight: 80,
                    }}
                    placeholder="Describe treatment"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Hospital Address *
                  </Text>
                  <TextInput
                    value={editFormData.hospitalAddress}
                    onChangeText={(value) => handleEditInputChange('hospitalAddress', value)}
                    multiline
                    numberOfLines={2}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.hospitalAddress ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                      textAlignVertical: 'top',
                      minHeight: 60,
                    }}
                    placeholder="Enter hospital address"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Type of Illness *
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowIllnessPicker(true)}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.typeOfIllness ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      backgroundColor: COLORS.white,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                    <Text style={{
                      color: editFormData.typeOfIllness ? COLORS.textPrimary : COLORS.gray,
                    }}>
                      {editFormData.typeOfIllness || 'Select illness type'}
                    </Text>
                    <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>

                {editFormData.typeOfIllness === 'Other' && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                      Other Illness *
                    </Text>
                    <TextInput
                      value={editFormData.otherIllness}
                      onChangeText={(value) => handleEditInputChange('otherIllness', value)}
                      style={{
                        borderWidth: 1,
                        borderColor: errors.otherIllness ? COLORS.error : COLORS.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 14,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                      }}
                      placeholder="Please specify"
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                )}

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Sum Insured *
                  </Text>
                  <TextInput
                    value={editFormData.sumInsured?.toString()}
                    onChangeText={(value) => handleEditInputChange('sumInsured', value)}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.sumInsured ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Enter sum insured"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Requested Amount *
                  </Text>
                  <TextInput
                    value={editFormData.requestedAmount?.toString()}
                    onChangeText={(value) => handleEditInputChange('requestedAmount', value)}
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.requestedAmount ? COLORS.error : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholder="Enter requested amount"
                    placeholderTextColor={COLORS.gray}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Date of Admission *
                  </Text>
                  <TextInput
                    value={editFormData.dateOfAdmission}
                    onChangeText={(value) => handleEditInputChange('dateOfAdmission', value)}
                    placeholder="YYYY-MM-DD"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.dateOfAdmission ? COLORS.error : COLORS.border,
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
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Date of Discharge *
                  </Text>
                  <TextInput
                    value={editFormData.dateOfDischarge}
                    onChangeText={(value) => handleEditInputChange('dateOfDischarge', value)}
                    placeholder="YYYY-MM-DD"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.dateOfDischarge ? COLORS.error : COLORS.border,
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
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Claim Date *
                  </Text>
                  <TextInput
                    value={editFormData.claimDate}
                    onChangeText={(value) => handleEditInputChange('claimDate', value)}
                    placeholder="YYYY-MM-DD"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.claimDate ? COLORS.error : COLORS.border,
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
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Close Date
                  </Text>
                  <TextInput
                    value={editFormData.closeDate}
                    onChangeText={(value) => handleEditInputChange('closeDate', value)}
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
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Claim Status *
                  </Text>
                  <View style={{
                    borderWidth: 1,
                    borderColor: errors.status ? COLORS.error : COLORS.border,
                    borderRadius: 8,
                  }}>
                    {['Pending', 'Approved', 'Rejected'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => handleEditInputChange('status', status)}
                        style={[{
                          padding: 12,
                          borderBottomWidth: status !== 'Rejected' ? 1 : 0,
                          borderBottomColor: COLORS.border,
                          backgroundColor: editFormData.status === status ? COLORS.selectedBg : COLORS.white,
                        }]}>
                        <Text style={{
                          color: editFormData.status === status ? COLORS.primary : COLORS.textPrimary,
                          fontWeight: editFormData.status === status ? '600' : '400',
                        }}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textSecondary, marginBottom: 4 }}>
                    Payment Status *
                  </Text>
                  <View style={{
                    borderWidth: 1,
                    borderColor: errors.paymentStatus ? COLORS.error : COLORS.border,
                    borderRadius: 8,
                  }}>
                    {['Unpaid', 'Paid', 'Rejected'].map((status) => (
                      <TouchableOpacity
                        key={status}
                        onPress={() => handleEditInputChange('paymentStatus', status)}
                        style={[{
                          padding: 12,
                          borderBottomWidth: status !== 'Rejected' ? 1 : 0,
                          borderBottomColor: COLORS.border,
                          backgroundColor: editFormData.paymentStatus === status ? COLORS.selectedBg : COLORS.white,
                        }]}>
                        <Text style={{
                          color: editFormData.paymentStatus === status ? COLORS.primary : COLORS.textPrimary,
                          fontWeight: editFormData.paymentStatus === status ? '600' : '400',
                        }}>
                          {status}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}>
              <TouchableOpacity
                onPress={() => setEditingClaim(null)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  alignItems: 'center',
                }}>
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateClaim}
                disabled={saveLoading}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  marginLeft: 8,
                  backgroundColor: COLORS.primary,
                  borderRadius: 8,
                  alignItems: 'center',
                  opacity: saveLoading ? 0.7 : 1,
                }}>
                {saveLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Insurance Claims • Employee Benefits • "
      />
    </SafeAreaView>
  );

  return (
    <>
      {currentView === 'main' && renderMainView()}
      {currentView === 'newClaim' && renderNewClaimView()}
      {currentView === 'claimHistory' && renderClaimHistoryView()}
    </>
  );
};

export default InsuranceScreen;