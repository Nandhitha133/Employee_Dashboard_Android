// screens/ExitApprovalScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;

import { exitFormalityAPI, employeeAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import Share from 'react-native-share';
import ViewShot from 'react-native-view-shot';
import { generatePDF } from 'react-native-html-to-pdf';

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
  greenLight: '#E8F5E9',
  redLight: '#FEE2E2',
  yellowLight: '#FEF3C7',
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

interface ExitForm {
  _id: string;
  employeeId?: {
    employeeId: string;
  };
  employeeName: string;
  department?: string;
  division?: string;
  position?: string;
  proposedLastWorkingDay?: string;
  reasonForLeaving?: string;
  reasonDetails?: string;
  status: string;
  approvedByManager?: boolean;
  clearanceDepartments?: Array<{
    department: string;
    status: string;
  }>;
  employeeDetails?: {
    dateOfJoining?: string;
    address?: string;
    phone?: string;
    employeeId?: string;
    position?: string;
    department?: string;
  };
  createdAt?: string;
  resignationDate?: string;
  joinDate?: string;
  location?: string;
}

interface ApiEmployee {
  _id?: string;
  employeeId?: string;
  name?: string;
  employeename?: string;
  location?: string;
  department?: string;
  division?: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  location?: string;
  department?: string;
  division?: string;
}

interface FilterState {
  employeeName: string;
  employeeId: string;
  division: string;
  status: string;
  location: string;
}

interface RejectModal {
  visible: boolean;
  formId: string | null;
  reason: string;
}

interface ClearanceModal {
  visible: boolean;
  formId: string | null;
  department: string;
  status: string;
  remarks: string;
}

interface LetterData {
  date: string;
  employeeName: string;
  employeeAddress: string;
  employeePhone: string;
  employeeId: string;
  designation: string;
  department: string;
  joinDate: string;
  lastWorkingDate: string;
  yearsOfService: number;
  monthsOfService: number;
  companyName: string;
  companyAddress: string;
  hrManager: string;
  resignationDate: string;
  finalSettlement: string;
  assetsReturned: string;
  formalityCompleted: string;
}

const ExitApprovalScreen = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exitForms, setExitForms] = useState<ExitForm[]>([]);
  const [filteredForms, setFilteredForms] = useState<ExitForm[]>([]);
  const [selectedForm, setSelectedForm] = useState<ExitForm | null>(null);
  const [showRelievingLetter, setShowRelievingLetter] = useState(false);
  const [letterData, setLetterData] = useState<LetterData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const viewShotRef = React.useRef<ViewShot>(null);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    employeeName: '',
    employeeId: '',
    division: '',
    status: 'all',
    location: ''
  });

  // Modal states
  const [rejectModal, setRejectModal] = useState<RejectModal>({
    visible: false,
    formId: null,
    reason: ''
  });
  const [clearanceModal, setClearanceModal] = useState<ClearanceModal>({
    visible: false,
    formId: null,
    department: '',
    status: '',
    remarks: ''
  });

  // Get current user role from session storage
  const [userRole, setUserRole] = useState('');
  const companyName = 'CALDIM ENGINEERING PVT LTD';
  const companyAddress = 'No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.';
  const hrManager = 'HR Manager';

  useEffect(() => {
    // Get user data from session storage (you'll need to implement this based on your storage solution)
    // For React Native, you might use AsyncStorage instead
    const loadUserData = async () => {
      try {
        // This is a placeholder - implement based on your storage solution
        // const userStr = await AsyncStorage.getItem('user');
        // if (userStr) {
        //   const user = JSON.parse(userStr);
        //   setUserRole(user.role || '');
        // }
        // For now, set a default
        setUserRole('admin');
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
    fetchExitForms();
    fetchEmployees();
  }, []);

  const filterForms = React.useCallback(() => {
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
  }, [exitForms, filters, employees]);

  useEffect(() => {
    filterForms();
  }, [filterForms]);

  const fetchExitForms = async () => {
    setLoading(true);
    try {
      const res = await exitFormalityAPI.getAll();
      setExitForms(res.data.data || []);
    } catch (error) {
      console.error('Error fetching exit forms:', error);
      Alert.alert('Error', 'Failed to load exit forms');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchExitForms();
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      const apiEmployees: ApiEmployee[] = res.data || [];
      
      // Transform API employees to match our Employee interface with proper type safety
      const transformedEmployees: Employee[] = apiEmployees
        .filter(emp => emp.employeeId) // Filter out entries without employeeId
        .map(emp => ({
          _id: emp._id || '',
          employeeId: emp.employeeId || '', // Now safe due to filter
          name: emp.name || emp.employeename || '',
          location: emp.location || '',
          department: emp.department || '',
          division: emp.division || ''
        }));
      
      setEmployees(transformedEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Derive unique filter options from exitForms
  const uniqueEmployeeNames = useMemo(() => 
    [...new Set(exitForms.map(form => form.employeeName).filter(Boolean))].sort(),
  [exitForms]);

  const uniqueEmployeeIds = useMemo(() => 
    [...new Set(exitForms.map(form => form.employeeId?.employeeId).filter(Boolean))].sort(),
  [exitForms]);

  const uniqueDivisions = useMemo(() => 
    [...new Set(exitForms.map(form => form.department || form.division).filter(Boolean))].sort(),
  [exitForms]);

  const uniqueLocations = useMemo(() => {
    const locs = exitForms.map(form => {
      if (form.location) return form.location;
      const emp = employees.find(e => e.employeeId === form.employeeId?.employeeId);
      return emp?.location;
    }).filter(Boolean) as string[];
    
    // Normalize and unique
    const uniqueMap = new Map();
    locs.forEach(l => {
      if(l) uniqueMap.set(l.toLowerCase(), l);
    });
    return Array.from(uniqueMap.values()).sort();
  }, [exitForms, employees]);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'clearance_in_progress', label: 'Clearance In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'rejected', label: 'Rejected' }
  ];


  const handleGenerateRelievingLetter = (form: ExitForm) => {
    if (form.status !== 'completed') {
      Alert.alert('Warning', 'Relieving letter can only be generated for completed exit requests.');
      return;
    }

    // Calculate years of service
    const joinDate = new Date(form.employeeDetails?.dateOfJoining || form.joinDate || new Date());
    const lwd = new Date(form.proposedLastWorkingDay || new Date());
    const diffTime = Math.abs(lwd.getTime() - joinDate.getTime());
    const years = Math.floor(diffTime / (365 * 24 * 60 * 60 * 1000));
    const months = Math.floor((diffTime % (365 * 24 * 60 * 60 * 1000)) / (30 * 24 * 60 * 60 * 1000));

    const data: LetterData = {
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      employeeName: form.employeeName,
      employeeAddress: form.employeeDetails?.address || 'Not specified',
      employeePhone: form.employeeDetails?.phone || 'Not specified',
      employeeId: form.employeeId?.employeeId || form.employeeDetails?.employeeId || '',
      designation: form.employeeDetails?.position || form.position || '',
      department: form.employeeDetails?.department || form.department || '',
      joinDate: joinDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      lastWorkingDate: lwd.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
      yearsOfService: years,
      monthsOfService: months,
      companyName: companyName,
      companyAddress: companyAddress,
      hrManager: hrManager,
      resignationDate: new Date(form.createdAt || form.resignationDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      finalSettlement: 'Full and final settlement has been processed.',
      assetsReturned: 'All company assets have been returned.',
      formalityCompleted: 'All exit formalities have been completed.'
    };

    setLetterData(data);
    setShowRelievingLetter(true);
  };

  const downloadRelievingLetter = async () => {
    if (!letterData) return;

    try {
      // Create HTML content for PDF
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; margin: 0; }
              .header { background-color: #1e2b58; color: white; padding: 20px; position: relative; overflow: hidden; }
              .header-content { display: flex; align-items: center; gap: 20px; }
              .header-title { font-size: 36px; font-weight: bold; }
              .header-subtitle { color: #f37021; font-size: 12px; letter-spacing: 2px; }
              .contact-info { display: flex; flex-direction: column; align-items: flex-end; }
              .contact-item { display: flex; align-items: center; gap: 10px; margin-bottom: 5px; }
              .watermark { position: absolute; opacity: 0.05; font-size: 200px; transform: rotate(-45deg); pointer-events: none; }
              .content { padding: 30px; }
              .to-section { margin-bottom: 30px; }
              .subject { font-weight: bold; margin-bottom: 20px; }
              .body-text { line-height: 1.8; text-align: justify; margin-bottom: 40px; }
              .signature { text-align: right; margin-top: 50px; }
              .signature-line { width: 200px; border-top: 1px solid black; margin-left: auto; margin-bottom: 5px; }
              .footer { background: linear-gradient(90deg, #f37021 0%, #f37021 30%, #1e2b58 30%, #1e2b58 100%); color: white; padding: 15px 30px; display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-content">
                <div>
                  <div class="header-title">CALDIM</div>
                  <div class="header-subtitle">ENGINEERING PRIVATE LIMITED</div>
                </div>
                <div class="contact-info">
                  <div class="contact-item">
                    <span>044-47860455</span>
                    <span>📞</span>
                  </div>
                  <div class="contact-item">
                    <span>${companyAddress}</span>
                    <span>📍</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="watermark">CALDIM</div>
            <div class="content">
              <div style="text-align: right; margin-bottom: 20px;">Date: <strong>${letterData.date}</strong></div>
              
              <div class="to-section">
                <div><strong>To:</strong></div>
                <div style="font-size: 18px; font-weight: bold; margin-top: 10px;">${letterData.employeeName}</div>
                <div>${letterData.designation}</div>
              </div>

              <div class="subject">SUBJECT: <span style="font-weight: normal;">Relieving Order</span></div>

              <div class="body-text">
                <p>Dear <strong>${letterData.employeeName}</strong>,</p>
                <p>This is to acknowledge the receipt of your resignation letter dated <strong>${letterData.resignationDate}</strong>.</p>
                <p>While accepting the same, we thank you very much for the close association you had with us during the tenure from <strong>${letterData.joinDate}</strong> to <strong>${letterData.lastWorkingDate}</strong> as a <strong>${letterData.designation}</strong>. You have been relieved from your service with effect from the closing working hours of <strong>${letterData.lastWorkingDate}</strong> and your work with us is found to be satisfactory.</p>
                <p>We wish you all the best in your future career.</p>
              </div>

              <div class="signature">
                <div>For ${companyName}</div>
                <div class="signature-line"></div>
                <div><strong>${letterData.hrManager}</strong></div>
                <div>Authorized Signatory</div>
                <div>${companyName}</div>
              </div>
            </div>

            <div class="footer">
              <span>Website : www.caldimengg.com</span>
              <span>CIN U74999TN2016PTC110683</span>
            </div>
          </body>
        </html>
      `;

      const options = {
        html: htmlContent,
        fileName: `Relieving_Letter_${letterData.employeeId}_${Date.now()}`,
        directory: 'Documents',
      };

      const file = await generatePDF(options);
      
      const shareOptions = {
        title: 'Export Relieving Letter',
        message: 'Relieving Letter PDF',
        url: `file://${file.filePath}`,
        type: 'application/pdf',
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const handleManagerApprove = (formId: string) => {
    Alert.alert(
      'Manager Approval',
      'Are you sure you want to approve this exit request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActionLoading(true);
            try {
              await exitFormalityAPI.managerApprove(formId);
              Alert.alert('Success', 'Manager approval recorded.');
              fetchExitForms();
              setSelectedForm(null);
            } catch (error: any) {
              console.error('Manager approval failed:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to approve');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleHRApprove = (formId: string) => {
    Alert.alert(
      'Final Approval',
      'Confirm FINAL approval and completion of exit?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Complete',
          onPress: async () => {
            setActionLoading(true);
            try {
              await exitFormalityAPI.approve(formId);
              Alert.alert('Success', 'Exit process completed successfully.');
              fetchExitForms();
              setSelectedForm(null);
            } catch (error: any) {
              console.error('HR approval failed:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to complete');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDelete = (formId: string) => {
    Alert.alert(
      'Delete Exit Request',
      'Are you sure you want to delete this exit request? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await exitFormalityAPI.remove(formId);
              Alert.alert('Success', 'Exit request deleted.');
              fetchExitForms();
              if (selectedForm?._id === formId) setSelectedForm(null);
            } catch (error: any) {
              console.error('Delete failed:', error);
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleReject = (formId: string) => {
    setRejectModal({ visible: true, formId, reason: '' });
  };

  const submitRejection = async () => {
    if (!rejectModal.reason) {
      Alert.alert('Error', 'Please enter a reason for rejection');
      return;
    }
    
    if (!rejectModal.formId) {
      Alert.alert('Error', 'Invalid form ID');
      return;
    }
    
    setActionLoading(true);
    try {
      await exitFormalityAPI.reject(rejectModal.formId, rejectModal.reason);
      Alert.alert('Success', 'Exit request rejected/cancelled.');
      fetchExitForms();
      setSelectedForm(null);
      setRejectModal({ visible: false, formId: null, reason: '' });
    } catch (error: any) {
      console.error('Rejection failed:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  // open clearance modal via selected form UI interactions

  const submitClearanceUpdate = async () => {
    if (!clearanceModal.formId) {
      Alert.alert('Error', 'Invalid form ID');
      return;
    }
    
    setActionLoading(true);
    try {
      await exitFormalityAPI.updateClearance(
        clearanceModal.formId, 
        clearanceModal.department, 
        clearanceModal.status, 
        clearanceModal.remarks
      );
      const updatedForm = await exitFormalityAPI.getExitById(clearanceModal.formId);
      setSelectedForm(updatedForm.data.data);
      fetchExitForms();
      setClearanceModal({ visible: false, formId: null, department: '', status: '', remarks: '' });
      Alert.alert('Success', `Clearance updated for ${clearanceModal.department}`);
    } catch (error) {
      console.error('Clearance update failed:', error);
      Alert.alert('Error', 'Failed to update clearance');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return COLORS.green;
      case 'rejected': 
      case 'cancelled': return COLORS.red;
      case 'submitted': return COLORS.blue;
      case 'under_review': return COLORS.warning;
      case 'clearance_in_progress': return COLORS.purple;
      default: return COLORS.gray;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed': return COLORS.greenLight;
      case 'rejected': 
      case 'cancelled': return COLORS.redLight;
      case 'submitted': return COLORS.blueLight;
      case 'under_review': return COLORS.yellowLight;
      case 'clearance_in_progress': return '#9b59b620';
      default: return COLORS.filterBg;
    }
  };

  const isFilterApplied = filters.employeeName || filters.employeeId || filters.division || filters.status !== 'all' || filters.location;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Exit Approval" 
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
        {/* Filters Section */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Filters</Text>
            {isFilterApplied && (
              <TouchableOpacity 
                onPress={() => setFilters({
                  employeeName: '',
                  employeeId: '',
                  division: '',
                  status: 'all',
                  location: ''
                })}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Icon name="clear-all" size={18} color={COLORS.red} />
                <Text style={{ color: COLORS.red, fontSize: 13, marginLeft: 4 }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ width: '100%' }}>
            {/* Employee Name Filter */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee Name</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filters.employeeName}
                  onValueChange={(value) => setFilters({ ...filters, employeeName: value })}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All" value="" color={COLORS.gray} />
                  {uniqueEmployeeNames.map(name => (
                    <PickerItem key={name} label={name} value={name} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Employee ID Filter */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee ID</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filters.employeeId}
                  onValueChange={(value) => setFilters({ ...filters, employeeId: value })}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All" value="" color={COLORS.gray} />
                  {uniqueEmployeeIds.map(id => (
                    <PickerItem key={id} label={id} value={id} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Division Filter */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filters.division}
                  onValueChange={(value) => setFilters({ ...filters, division: value })}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Divisions" value="" color={COLORS.gray} />
                  {uniqueDivisions.map(div => (
                    <PickerItem key={div} label={div} value={div} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Location Filter */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filters.location}
                  onValueChange={(value) => setFilters({ ...filters, location: value })}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Locations" value="" color={COLORS.gray} />
                  {uniqueLocations.map(loc => (
                    <PickerItem key={loc} label={loc} value={loc.toLowerCase()} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Status Filter */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Status</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  {statusOptions.map(opt => (
                    <PickerItem key={opt.value} label={opt.label} value={opt.value} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Results Count */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            Showing {filteredForms.length} {filteredForms.length === 1 ? 'record' : 'records'}
          </Text>
          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ marginLeft: 8, color: COLORS.primary, fontSize: 12 }}>Loading...</Text>
            </View>
          )}
        </View>

        {/* Exit Forms Table */}
        {loading && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading exit forms...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 8 }}>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee ID</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee Name</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Division</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>LWD</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Reason</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Status</Text>
                  <Text style={{ width: 200, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredForms.length === 0 ? (
                  <View style={{ padding: 50, alignItems: 'center' }}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={{ marginTop: 12, color: COLORS.gray, fontSize: 16 }}>No exit requests found</Text>
                    <Text style={{ marginTop: 4, color: COLORS.lightGray, fontSize: 13 }}>Try adjusting your filters</Text>
                  </View>
                ) : filteredForms.map((form, index) => (
                  <View key={form._id} style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.filterBg }}>
                    <Text style={{ width: 100, fontSize: 13, fontWeight: '500', color: COLORS.textPrimary }}>{form.employeeId?.employeeId || '-'}</Text>
                    <Text style={{ width: 150, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{form.employeeName}</Text>
                    <Text style={{ width: 120, fontSize: 13, color: COLORS.textSecondary }}>{form.department || form.division || '-'}</Text>
                    <Text style={{ width: 100, fontSize: 13, color: COLORS.textSecondary }}>
                      {form.proposedLastWorkingDay ? new Date(form.proposedLastWorkingDay).toLocaleDateString() : '-'}
                    </Text>
                    <Text style={{ width: 120, fontSize: 13, color: COLORS.textSecondary }} numberOfLines={1}>
                      {form.reasonForLeaving?.replace(/_/g, ' ') || '-'}
                    </Text>
                    
                    {/* Status Badge */}
                    <View style={{ width: 100, alignItems: 'center' }}>
                      <View style={{ 
                        backgroundColor: getStatusBgColor(form.status),
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}>
                        <Text style={{ fontSize: 11, color: getStatusColor(form.status), fontWeight: '500' }}>
                          {form.status?.toUpperCase().replace(/_/g, ' ')}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={{ width: 200, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => setSelectedForm(form)} style={{ padding: 6, backgroundColor: COLORS.indigoLight, borderRadius: 20 }}>
                        <Icon name="visibility" size={18} color={COLORS.indigo} />
                      </TouchableOpacity>

                      {/* Manager Approve */}
                      {(['projectmanager', 'teamlead', 'admin'].includes(userRole) && !form.approvedByManager && form.status !== 'completed' && form.status !== 'rejected') && (
                        <TouchableOpacity onPress={() => handleManagerApprove(form._id)} style={{ padding: 6, backgroundColor: COLORS.greenLight, borderRadius: 20 }}>
                          <Icon name="check" size={18} color={COLORS.green} />
                        </TouchableOpacity>
                      )}

                      {/* HR Approve */}
                      {(['hr', 'admin'].includes(userRole) && form.status !== 'completed' && form.status !== 'rejected') && (
                        <TouchableOpacity onPress={() => handleHRApprove(form._id)} style={{ padding: 6, backgroundColor: COLORS.greenLight, borderRadius: 20 }}>
                          <Icon name="check-circle" size={18} color={COLORS.green} />
                        </TouchableOpacity>
                      )}

                      {/* Reject */}
                      {(form.status !== 'completed' && form.status !== 'rejected' && form.status !== 'cancelled') && (
                        <TouchableOpacity onPress={() => handleReject(form._id)} style={{ padding: 6, backgroundColor: COLORS.redLight, borderRadius: 20 }}>
                          <Icon name="close" size={18} color={COLORS.red} />
                        </TouchableOpacity>
                      )}

                      {/* Delete */}
                      {(['admin', 'hr'].includes(userRole)) && (
                        <TouchableOpacity onPress={() => handleDelete(form._id)} style={{ padding: 6, backgroundColor: COLORS.redLight, borderRadius: 20 }}>
                          <Icon name="delete" size={18} color={COLORS.red} />
                        </TouchableOpacity>
                      )}

                      {/* Relieving Letter */}
                      {form.status === 'completed' && (
                        <TouchableOpacity onPress={() => handleGenerateRelievingLetter(form)} style={{ padding: 6, backgroundColor: '#9b59b620', borderRadius: 20 }}>
                          <Icon name="description" size={18} color={COLORS.purple} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Details Modal */}
      <Modal
        visible={selectedForm !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedForm(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>Exit Request</Text>
                <Text style={{ fontSize: 12, color: COLORS.white, opacity: 0.8 }}>{selectedForm?.employeeName} • {selectedForm?.employeeId?.employeeId || '-'}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedForm(null)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {selectedForm && (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                    <View style={{ width: '50%', padding: 4 }}>
                      <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12 }}>
                        <Text style={{ fontSize: 12, color: COLORS.gray }}>Division</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{selectedForm.division || selectedForm.department || '-'}</Text>
                      </View>
                    </View>
                    <View style={{ width: '50%', padding: 4 }}>
                      <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12 }}>
                        <Text style={{ fontSize: 12, color: COLORS.gray }}>Position</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{selectedForm.position || '-'}</Text>
                      </View>
                    </View>
                    <View style={{ width: '50%', padding: 4 }}>
                      <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12 }}>
                        <Text style={{ fontSize: 12, color: COLORS.gray }}>Proposed LWD</Text>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>
                          {selectedForm.proposedLastWorkingDay ? new Date(selectedForm.proposedLastWorkingDay).toLocaleDateString() : '-'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ width: '50%', padding: 4 }}>
                      <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12 }}>
                        <Text style={{ fontSize: 12, color: COLORS.gray }}>Status</Text>
                        <View style={{ 
                          backgroundColor: getStatusBgColor(selectedForm.status),
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                          alignSelf: 'flex-start',
                          marginTop: 4
                        }}>
                          <Text style={{ fontSize: 12, color: getStatusColor(selectedForm.status), fontWeight: '500' }}>
                            {selectedForm.status?.toUpperCase().replace(/_/g, ' ')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray, marginBottom: 4 }}>Reason</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>{selectedForm.reasonForLeaving?.replace(/_/g, ' ') || '-'}</Text>
                    {selectedForm.reasonDetails && (
                      <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 4 }}>{selectedForm.reasonDetails}</Text>
                    )}
                  </View>

                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>Clearance</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {(selectedForm.clearanceDepartments || []).map((c, i) => (
                        <View key={i} style={{ width: '50%', padding: 2 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border, borderRadius: 4, padding: 8 }}>
                            <Text style={{ fontSize: 12, color: COLORS.textPrimary, textTransform: 'capitalize' }}>{c.department}</Text>
                            <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>{c.status}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                    {/* Manager Approve */}
                    {(['projectmanager', 'teamlead', 'admin'].includes(userRole) && !selectedForm.approvedByManager && selectedForm.status !== 'completed' && selectedForm.status !== 'rejected') && (
                      <TouchableOpacity
                        onPress={() => handleManagerApprove(selectedForm._id)}
                        disabled={actionLoading}
                        style={{
                          backgroundColor: COLORS.green,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 6,
                          marginLeft: 8,
                        }}
                      >
                        <Text style={{ color: COLORS.white, fontWeight: '600' }}>Manager Approve</Text>
                      </TouchableOpacity>
                    )}

                    {/* HR Approve */}
                    {(['hr', 'admin'].includes(userRole) && selectedForm.status !== 'completed' && selectedForm.status !== 'rejected') && (
                      <TouchableOpacity
                        onPress={() => handleHRApprove(selectedForm._id)}
                        disabled={actionLoading}
                        style={{
                          backgroundColor: COLORS.indigo,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 6,
                          marginLeft: 8,
                        }}
                      >
                        <Text style={{ color: COLORS.white, fontWeight: '600' }}>HR Approve</Text>
                      </TouchableOpacity>
                    )}

                    {/* Reject */}
                    {(selectedForm.status !== 'completed' && selectedForm.status !== 'rejected' && selectedForm.status !== 'cancelled') && (
                      <TouchableOpacity
                        onPress={() => handleReject(selectedForm._id)}
                        disabled={actionLoading}
                        style={{
                          backgroundColor: COLORS.red,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 6,
                          marginLeft: 8,
                        }}
                      >
                        <Text style={{ color: COLORS.white, fontWeight: '600' }}>Reject</Text>
                      </TouchableOpacity>
                    )}

                    {/* Delete */}
                    {(['admin', 'hr'].includes(userRole)) && (
                      <TouchableOpacity
                        onPress={() => handleDelete(selectedForm._id)}
                        disabled={actionLoading}
                        style={{
                          backgroundColor: COLORS.redLight,
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: 6,
                          marginLeft: 8,
                        }}
                      >
                        <Text style={{ color: COLORS.red, fontWeight: '600' }}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Relieving Letter Modal */}
      <Modal
        visible={showRelievingLetter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRelievingLetter(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>Relieving Letter</Text>
                <Text style={{ fontSize: 12, color: COLORS.white, opacity: 0.8 }}>Preview and download</Text>
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  onPress={downloadRelievingLetter}
                  style={{ marginRight: 12 }}
                >
                  <Icon name="file-download" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowRelievingLetter(false)}>
                  <Icon name="close" size={24} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ padding: 16 }} contentContainerStyle={{ alignItems: 'center' }}>
              {letterData && (
                <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }}>
                  <View style={{ 
                    width: 350, 
                    backgroundColor: COLORS.white, 
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    overflow: 'hidden',
                  }}>
                    {/* Header */}
                    <View style={{ backgroundColor: '#1e2b58', padding: 20 }}>
                      <Text style={{ color: COLORS.white, fontSize: 24, fontWeight: 'bold' }}>CALDIM</Text>
                      <Text style={{ color: '#f37021', fontSize: 10, letterSpacing: 1 }}>ENGINEERING PRIVATE LIMITED</Text>
                      <View style={{ position: 'absolute', top: 10, right: 20 }}>
                        <Text style={{ color: COLORS.white }}>044-47860455</Text>
                        <Text style={{ color: COLORS.white, fontSize: 10, width: 200, textAlign: 'right' }}>{companyAddress}</Text>
                      </View>
                    </View>

                    {/* Content */}
                    <View style={{ padding: 20 }}>
                      <Text style={{ textAlign: 'right', marginBottom: 20 }}>Date: <Text style={{ fontWeight: 'bold' }}>{letterData.date}</Text></Text>

                      <View style={{ marginBottom: 20 }}>
                        <Text style={{ fontWeight: 'bold' }}>To:</Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', marginTop: 5 }}>{letterData.employeeName}</Text>
                        <Text>{letterData.designation}</Text>
                      </View>

                      <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>SUBJECT: <Text style={{ fontWeight: 'normal' }}>Relieving Order</Text></Text>

                      <Text style={{ marginBottom: 5 }}>Dear <Text style={{ fontWeight: 'bold' }}>{letterData.employeeName}</Text>,</Text>

                      <Text style={{ lineHeight: 20, textAlign: 'justify', marginVertical: 10 }}>
                        This is to acknowledge the receipt of your resignation letter dated <Text style={{ fontWeight: 'bold' }}>{letterData.resignationDate}</Text>.
                      </Text>

                      <Text style={{ lineHeight: 20, textAlign: 'justify', marginVertical: 10 }}>
                        While accepting the same, we thank you very much for the close association you had with us during the tenure from <Text style={{ fontWeight: 'bold' }}>{letterData.joinDate}</Text> to <Text style={{ fontWeight: 'bold' }}>{letterData.lastWorkingDate}</Text> as a <Text style={{ fontWeight: 'bold' }}>{letterData.designation}</Text>. You have been relieved from your service with effect from the closing working hours of <Text style={{ fontWeight: 'bold' }}>{letterData.lastWorkingDate}</Text> and your work with us is found to be satisfactory.
                      </Text>

                      <Text style={{ lineHeight: 20, textAlign: 'justify', marginVertical: 10 }}>
                        We wish you all the best in your future career.
                      </Text>

                      <View style={{ alignItems: 'flex-end', marginTop: 30 }}>
                        <Text>For {companyName}</Text>
                        <View style={{ width: 150, borderTopWidth: 1, borderTopColor: COLORS.black, marginVertical: 5 }} />
                        <Text style={{ fontWeight: 'bold' }}>{letterData.hrManager}</Text>
                        <Text>Authorized Signatory</Text>
                        <Text>{companyName}</Text>
                      </View>
                    </View>

                    {/* Footer */}
                    <View style={{ flexDirection: 'row', backgroundColor: '#1e2b58', padding: 10 }}>
                      <Text style={{ color: COLORS.white, flex: 1 }}>Website : www.caldimengg.com</Text>
                      <Text style={{ color: COLORS.white }}>CIN U74999TN2016PTC110683</Text>
                    </View>
                  </View>
                </ViewShot>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Rejection Modal */}
      <Modal
        visible={rejectModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModal({ visible: false, formId: null, reason: '' })}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 400, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 }}>Reject Exit Request</Text>
            <Text style={{ fontSize: 14, color: COLORS.gray, marginBottom: 8 }}>Please provide a reason for rejection:</Text>
            <TextInput
              value={rejectModal.reason}
              onChangeText={(text) => setRejectModal({ ...rejectModal, reason: text })}
              placeholder="Enter rejection reason..."
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                backgroundColor: COLORS.white,
                color: COLORS.textPrimary,
                textAlignVertical: 'top',
                minHeight: 100,
                marginBottom: 16,
              }}
              placeholderTextColor={COLORS.gray}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setRejectModal({ visible: false, formId: null, reason: '' })}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: COLORS.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitRejection}
                disabled={actionLoading}
                style={{
                  backgroundColor: COLORS.red,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 6,
                }}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white }}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clearance Modal */}
      <Modal
        visible={clearanceModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setClearanceModal({ visible: false, formId: null, department: '', status: '', remarks: '' })}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 400, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>
              Update {clearanceModal.department?.toUpperCase()} Clearance
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.gray, marginBottom: 12 }}>
              Status: <Text style={{ fontWeight: '600', textTransform: 'capitalize' }}>{clearanceModal.status}</Text>
            </Text>
            
            <Text style={{ fontSize: 14, color: COLORS.gray, marginBottom: 4 }}>Remarks:</Text>
            <TextInput
              value={clearanceModal.remarks}
              onChangeText={(text) => setClearanceModal({ ...clearanceModal, remarks: text })}
              placeholder="Enter remarks (optional)..."
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
                marginBottom: 16,
              }}
              placeholderTextColor={COLORS.gray}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setClearanceModal({ visible: false, formId: null, department: '', status: '', remarks: '' })}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: COLORS.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitClearanceUpdate}
                disabled={actionLoading}
                style={{
                  backgroundColor: COLORS.indigo,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 6,
                }}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white }}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Exit Approval • Exit Management • "
      />
    </SafeAreaView>
  );
};

export default ExitApprovalScreen;
