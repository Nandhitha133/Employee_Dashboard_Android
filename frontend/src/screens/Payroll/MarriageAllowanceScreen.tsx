// screens/Payroll/MarriageAllowanceScreen.tsx
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
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { employeeAPI, marriageAllowanceAPI, BASE_URL } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import DocumentPicker from 'react-native-document-picker';

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
  teal: '#14B8A6',
  tealLight: '#CCFBF1',
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

interface Employee {
  _id?: string;
  employeeId: string;
  name: string;
  location?: string;
  division?: string;
  department?: string;
  designation?: string;
  dateOfJoining?: string;
}

interface MarriageClaim {
  _id?: string;
  id?: string;
  employeeId: string;
  employeeName: string;
  division: string;
  designation: string;
  location: string;
  dateOfJoining?: string;
  marriageDate: string;
  spouseName: string;
  certificatePath?: string;
  invitationPath?: string;
  allowanceType: string;
  allowanceAmount: number;
  requestDate: string;
  requestedBy: string;
  managerStatus: 'Pending' | 'Approved' | 'Rejected';
  hrStatus: 'Pending' | 'Approved' | 'Rejected';
  remarks?: string;
  paymentStatus: 'Pending' | 'Paid';
  paymentDate?: string;
  paymentMode?: string;
}

interface FormData {
  employeeId: string;
  employeeName: string;
  division: string;
  designation: string;
  location: string;
  dateOfJoining: string;
  marriageDate: string;
  spouseName: string;
  certificateFile: any;
  invitationFile: any;
  allowanceType: string;
  allowanceAmount: string;
  requestDate: string;
  requestedBy: string;
  managerStatus: string;
  hrStatus: string;
  remarks: string;
  paymentStatus: string;
  paymentDate: string;
  paymentMode: string;
}

const MarriageAllowanceScreen = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [claims, setClaims] = useState<MarriageClaim[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    division: '',
    location: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<MarriageClaim | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MarriageClaim | null>(null);

  // Date picker states
  const [showMarriageDatePicker, setShowMarriageDatePicker] = useState(false);
  const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);
  const [showRequestDatePicker, setShowRequestDatePicker] = useState(false);
  const [selectedMarriageDate, setSelectedMarriageDate] = useState<Date | null>(null);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState<Date | null>(null);
  const [selectedRequestDate, setSelectedRequestDate] = useState<Date>(new Date());

  // User info
  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  // Location options - Only Chennai and Hosur
  const locationOptionsList = ['Chennai', 'Hosur'];

  // Form state
  const [form, setForm] = useState<FormData>({
    employeeId: '',
    employeeName: '',
    division: '',
    designation: '',
    location: '',
    dateOfJoining: '',
    marriageDate: '',
    spouseName: '',
    certificateFile: null,
    invitationFile: null,
    allowanceType: 'Marriage Allowance',
    allowanceAmount: '5000',
    requestDate: new Date().toISOString().split('T')[0],
    requestedBy: user?.name || user?.username || '',
    managerStatus: 'Pending',
    hrStatus: 'Pending',
    remarks: '',
    paymentStatus: 'Pending',
    paymentDate: '',
    paymentMode: '',
  });

  // Dropdown options for filters
  const divisionOptions = useMemo(() => {
    const divisions = new Set(employees.map(e => e.division).filter(Boolean));
    return ['', ...Array.from(divisions)];
  }, [employees]);

  const locationOptions = useMemo(() => {
    const locations = new Set(employees.map(e => (e.location)).filter(Boolean));
    return ['', ...Array.from(locations)];
  }, [employees]);

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const idA = (a.employeeId || a._id || '').toString();
      const idB = (b.employeeId || b._id || '').toString();
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [employees]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [employeesRes, claimsRes] = await Promise.all([
        employeeAPI.getAllEmployees().catch(() => ({ data: [] })),
        marriageAllowanceAPI.list({}).catch(() => ({ data: { data: [] } }))
      ]);

      const empList = Array.isArray(employeesRes.data) ? employeesRes.data : [];
      const transformedEmployees: Employee[] = empList.map((emp: any) => ({
        _id: emp._id,
        employeeId: emp.employeeId || emp.displayId || '',
        name: emp.name || emp.employeename || '',
        location: emp.location || emp.branch || '',
        division: emp.division || '',
        department: emp.department || '',
        designation: emp.designation || '',
        dateOfJoining: emp.dateOfJoining || '',
      }));
      setEmployees(transformedEmployees);

      const claimsData = claimsRes.data?.data || [];
      setClaims(claimsData);
    } catch (error) {
      console.error('Error loading data', error);
      Alert.alert('Error', 'Failed to load marriage allowance data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredClaims = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return claims.filter(item => {
      const matchesSearch = !search || [
        item.employeeId, item.employeeName
      ].some(v => (v || '').toLowerCase().includes(search));
      const matchesDivision = !filters.division || filters.division === '' || item.division === filters.division;
      const matchesLocation = !filters.location || filters.location === '' || item.location === filters.location;
      return matchesSearch && matchesDivision && matchesLocation;
    }).sort((a, b) => {
      const idA = (a.employeeId || '').toString();
      const idB = (b.employeeId || '').toString();
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [claims, filters]);

  const hasExistingClaim = useMemo(() => {
    if (!form.employeeId) return false;
    return claims.some(c => c.employeeId === form.employeeId && (!editingId || c._id !== editingId));
  }, [claims, form.employeeId, editingId]);

  const onEmployeeChange = (employeeId: string) => {
    setForm(prev => ({ ...prev, employeeId }));
    const emp = employees.find(e => e.employeeId === employeeId || e._id === employeeId);
    if (emp) {
      setForm(prev => ({
        ...prev,
        employeeId: emp.employeeId || emp._id || '',
        employeeName: emp.name || '',
        division: emp.division || '',
        designation: emp.designation || '',
        location: emp.location || '',
        dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : '',
      }));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedMarriageDate(null);
    setSelectedPaymentDate(null);
    setSelectedRequestDate(new Date());
    setForm({
      employeeId: '',
      employeeName: '',
      division: '',
      designation: '',
      location: '',
      dateOfJoining: '',
      marriageDate: '',
      spouseName: '',
      certificateFile: null,
      invitationFile: null,
      allowanceType: 'Marriage Allowance',
      allowanceAmount: '5000',
      requestDate: new Date().toISOString().split('T')[0],
      requestedBy: user?.name || user?.username || '',
      managerStatus: 'Pending',
      hrStatus: 'Pending',
      remarks: '',
      paymentStatus: 'Pending',
      paymentDate: '',
      paymentMode: '',
    });
  };

  const handleMarriageDateChange = (event: any, selectedDate?: Date) => {
    setShowMarriageDatePicker(false);
    if (selectedDate) {
      setSelectedMarriageDate(selectedDate);
      setForm(prev => ({ ...prev, marriageDate: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const handlePaymentDateChange = (event: any, selectedDate?: Date) => {
    setShowPaymentDatePicker(false);
    if (selectedDate) {
      setSelectedPaymentDate(selectedDate);
      setForm(prev => ({ ...prev, paymentDate: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const handleRequestDateChange = (event: any, selectedDate?: Date) => {
    setShowRequestDatePicker(false);
    if (selectedDate) {
      setSelectedRequestDate(selectedDate);
      setForm(prev => ({ ...prev, requestDate: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const handleFileSelect = async (field: 'certificateFile' | 'invitationFile') => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.images, DocumentPicker.types.pdf],
      });
      if (result[0]) {
        setForm(prev => ({ ...prev, [field]: result[0] }));
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        console.error('Error picking file:', err);
        Alert.alert('Error', 'Failed to select file');
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.employeeId) {
      Alert.alert('Validation Error', 'Please select an employee');
      return;
    }
    if (!form.marriageDate) {
      Alert.alert('Validation Error', 'Please enter marriage date');
      return;
    }
    if (!form.location) {
      Alert.alert('Validation Error', 'Please select location');
      return;
    }
    if (hasExistingClaim) {
      Alert.alert('Validation Error', 'Only one claim allowed per employee');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      
      Object.entries(form).forEach(([key, value]) => {
        if (key === 'certificateFile' || key === 'invitationFile') return;
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        }
      });
      
      if (form.certificateFile) {
        formData.append('certificate', {
          uri: form.certificateFile.uri,
          type: form.certificateFile.type,
          name: form.certificateFile.name,
        } as any);
      }
      if (form.invitationFile) {
        formData.append('invitation', {
          uri: form.invitationFile.uri,
          type: form.invitationFile.type,
          name: form.invitationFile.name,
        } as any);
      }

      if (editingId) {
        await marriageAllowanceAPI.update(editingId, formData);
        Alert.alert('Success', 'Marriage allowance claim updated successfully');
      } else {
        await marriageAllowanceAPI.create(formData);
        Alert.alert('Success', 'Marriage allowance claim submitted successfully');
      }
      setShowForm(false);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Error submitting claim', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit claim');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: MarriageClaim) => {
    setEditingId(item._id || null);
    setShowForm(true);
    const marriageDate = item.marriageDate ? new Date(item.marriageDate) : null;
    const paymentDate = item.paymentDate ? new Date(item.paymentDate) : null;
    const requestDate = item.requestDate ? new Date(item.requestDate) : new Date();
    
    setSelectedMarriageDate(marriageDate);
    setSelectedPaymentDate(paymentDate);
    setSelectedRequestDate(requestDate);
    
    setForm({
      employeeId: item.employeeId,
      employeeName: item.employeeName || '',
      division: item.division || '',
      designation: item.designation || '',
      location: item.location || '',
      dateOfJoining: item.dateOfJoining ? String(item.dateOfJoining).slice(0, 10) : '',
      marriageDate: item.marriageDate ? String(item.marriageDate).slice(0, 10) : '',
      spouseName: item.spouseName || '',
      certificateFile: null,
      invitationFile: null,
      allowanceType: item.allowanceType || 'Marriage Allowance',
      allowanceAmount: item.allowanceAmount?.toString() || '5000',
      requestDate: item.requestDate ? String(item.requestDate).slice(0, 10) : new Date().toISOString().slice(0, 10),
      requestedBy: item.requestedBy || (user?.name || user?.username || ''),
      managerStatus: item.managerStatus || 'Pending',
      hrStatus: item.hrStatus || 'Pending',
      remarks: item.remarks || '',
      paymentStatus: item.paymentStatus || 'Pending',
      paymentDate: item.paymentDate ? String(item.paymentDate).slice(0, 10) : '',
      paymentMode: item.paymentMode || '',
    });
  };

  const handleDelete = (item: MarriageClaim) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      setLoading(true);
      await marriageAllowanceAPI.delete(itemToDelete._id!);
      Alert.alert('Success', 'Deleted successfully');
      setShowDeleteModal(false);
      setItemToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting claim', error);
      Alert.alert('Error', 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusBgColor = (status: string) => {
    switch(status) {
      case 'Paid': return COLORS.greenLight;
      case 'Pending': return COLORS.yellowLight;
      case 'Approved': return COLORS.greenLight;
      case 'Rejected': return COLORS.redLight;
      default: return COLORS.filterBg;
    }
  };

  const getStatusTextColor = (status: string) => {
    switch(status) {
      case 'Paid': return COLORS.green;
      case 'Pending': return COLORS.warning;
      case 'Approved': return COLORS.success;
      case 'Rejected': return COLORS.error;
      default: return COLORS.gray;
    }
  };

  const getDocumentUrl = (path: string) => {
    if (!path) return null;
    return `${BASE_URL}${path}`;
  };

  const openDocument = async (url: string) => {
    if (!url) return;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this document');
      }
    } catch (error) {
      console.error('Error opening document:', error);
      Alert.alert('Error', 'Failed to open document');
    }
  };

  const exportExcel = async () => {
    const header = ['S.No', 'Employee ID', 'Employee Name', 'Division', 'Location', 'Marriage Date', 'Spouse Name', 'Allowance Amount', 'Payment Status', 'Manager Status', 'HR Status'];
    const rows = filteredClaims.map((claim, idx) => [
      (idx + 1).toString(),
      claim.employeeId,
      claim.employeeName,
      claim.division,
      claim.location,
      claim.marriageDate ? new Date(claim.marriageDate).toLocaleDateString() : '',
      claim.spouseName || '—',
      claim.allowanceAmount?.toString() || '5000',
      claim.paymentStatus,
      claim.managerStatus,
      claim.hrStatus,
    ]);

    const csv = [header, ...rows].map(row => row.join(',')).join('\n');
    const fileName = `Marriage_Allowance_${Date.now()}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csv, 'utf8');
      await Share.open({
        title: 'Export Marriage Allowance',
        message: 'Marriage Allowance Report',
        url: `file://${filePath}`,
        type: 'text/csv',
        failOnCancel: false,
      });
    } catch (error: any) {
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const exportPDF = async () => {
    Alert.alert('Info', 'PDF export coming soon');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Marriage Allowance" showBack={true} />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Filters Section */}
        <View style={styles.filterContainer}>
          <View style={styles.filterHeader}>
            <View style={styles.filterHeaderLeft}>
              <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterToggleButton}>
                <Icon name="filter-list" size={20} color={COLORS.textPrimary} />
                <Text style={styles.filterToggleText}>Filters</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.filterHeaderRight}>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setShowForm(true);
                }}
                style={[styles.actionButton, styles.addButton]}
              >
                <Icon name="add" size={20} color={COLORS.white} />
                <Text style={styles.buttonText}>New Allowance</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={exportExcel}
                style={[styles.actionButton, styles.exportButton]}
              >
                <Icon name="file-download" size={20} color={COLORS.white} />
                <Text style={styles.buttonText}>Excel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={exportPDF}
                style={[styles.actionButton, styles.exportButton]}
              >
                <Icon name="picture-as-pdf" size={20} color={COLORS.white} />
                <Text style={styles.buttonText}>PDF</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showFilters && (
            <View style={styles.filtersPanel}>
              <View style={styles.filterInputContainer}>
                <View style={styles.textInputContainer}>
                  <Icon name="search" size={20} color={COLORS.gray} />
                  <TextInput
                    value={filters.search}
                    onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
                    placeholder="Search by name or ID..."
                    placeholderTextColor={COLORS.gray}
                    style={styles.textInput}
                  />
                  {filters.search !== '' && (
                    <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, search: '' }))}>
                      <Icon name="close" size={18} color={COLORS.gray} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.filterInputContainer}>
                <Text style={styles.filterInputLabel}>Division</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={filters.division}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, division: value }))}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Divisions" value="" />
                    {divisionOptions.map(div => div && (
                      <Picker.Item key={div} label={div} value={div} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.filterInputContainer}>
                <Text style={styles.filterInputLabel}>Location</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={filters.location}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Locations" value="" />
                    {locationOptions.map(loc => loc && (
                      <Picker.Item key={loc} label={loc} value={loc} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            Showing {filteredClaims.length} {filteredClaims.length === 1 ? 'record' : 'records'}
          </Text>
        </View>

        {/* Claims Table */}
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading marriage allowance data...</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { width: 60 }]}>S.No</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Employee ID</Text>
                  <Text style={[styles.tableHeaderText, { width: 150 }]}>Employee Name</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Division</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Location</Text>
                  <Text style={[styles.tableHeaderText, { width: 110 }]}>Marriage Date</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Spouse Name</Text>
                  <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'right' }]}>Amount</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Payment Status</Text>
                  <Text style={[styles.tableHeaderText, { width: 120 }]}>Actions</Text>
                </View>

                {filteredClaims.length === 0 ? (
                  <View style={styles.noRecordsContainer}>
                    <IconCommunity name="cake-off" size={48} color={COLORS.gray} />
                    <Text style={styles.noRecordsText}>No marriage allowance records found</Text>
                  </View>
                ) : filteredClaims.map((claim, idx) => (
                  <View key={claim._id || idx} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: COLORS.white }]}>
                    <Text style={[styles.employeeIdText, { width: 60 }]}>{idx + 1}</Text>
                    <Text style={[styles.employeeIdText, { width: 100 }]}>{claim.employeeId}</Text>
                    <View style={{ width: 150 }}>
                      <Text style={styles.employeeNameText}>{claim.employeeName}</Text>
                      <Text style={styles.employeeSubText}>{claim.designation}</Text>
                    </View>
                    <Text style={[styles.employeeIdText, { width: 100 }]}>{claim.division}</Text>
                    <Text style={[styles.employeeIdText, { width: 100 }]}>{claim.location}</Text>
                    <Text style={[styles.employeeIdText, { width: 110 }]}>
                      {claim.marriageDate ? new Date(claim.marriageDate).toLocaleDateString() : ''}
                    </Text>
                    <Text style={[styles.employeeIdText, { width: 100 }]}>{claim.spouseName || '—'}</Text>
                    <Text style={[styles.amountText, { width: 100, textAlign: 'right' }]}>
                      {formatCurrency(claim.allowanceAmount)}
                    </Text>
                    
                    <View style={{ width: 100, alignItems: 'center' }}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(claim.paymentStatus) }]}>
                        <Text style={[styles.statusText, { color: getStatusTextColor(claim.paymentStatus) }]}>
                          {claim.paymentStatus}
                        </Text>
                      </View>
                    </View>

                    <View style={{ width: 120, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => setViewingItem(claim)} style={[styles.actionIcon, { backgroundColor: COLORS.indigoLight }]}>
                        <Icon name="visibility" size={18} color={COLORS.indigo} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEdit(claim)} style={[styles.actionIcon, { backgroundColor: COLORS.blueLight }]}>
                        <Icon name="edit" size={18} color={COLORS.blue} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(claim)} style={[styles.actionIcon, { backgroundColor: COLORS.redLight }]}>
                        <Icon name="delete" size={18} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Form Modal */}
      <Modal
        visible={showForm}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowForm(false);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Marriage Allowance' : 'New Marriage Allowance'}</Text>
              <TouchableOpacity onPress={() => {
                setShowForm(false);
                resetForm();
              }}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Employee Details Section */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Icon name="person" size={20} color={COLORS.indigo} />
                  <Text style={styles.sectionTitle}>Employee Details</Text>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Employee ID *</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={form.employeeId}
                      onValueChange={onEmployeeChange}
                      style={styles.picker}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select Employee" value="" color={COLORS.gray} />
                      {sortedEmployees.map(emp => (
                        <Picker.Item 
                          key={emp._id || emp.employeeId} 
                          label={`${emp.employeeId} - ${emp.name}`} 
                          value={emp.employeeId} 
                        />
                      ))}
                    </Picker>
                  </View>
                  {hasExistingClaim && (
                    <Text style={styles.errorText}>Claim already exists for this employee</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Employee Name</Text>
                  <TextInput
                    value={form.employeeName}
                    editable={false}
                    style={[styles.formInput, styles.readOnlyInput]}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Division</Text>
                    <TextInput
                      value={form.division}
                      editable={false}
                      style={[styles.formInput, styles.readOnlyInput]}
                    />
                  </View>
                  <View style={[styles.col, { marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>Designation</Text>
                    <TextInput
                      value={form.designation}
                      editable={false}
                      style={[styles.formInput, styles.readOnlyInput]}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Location *</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={form.location}
                        onValueChange={(value) => setForm(prev => ({ ...prev, location: value }))}
                        style={styles.picker}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="Select Location" value="" />
                        {locationOptionsList.map(loc => (
                          <Picker.Item key={loc} label={loc} value={loc} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  <View style={[styles.col, { marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>Date of Joining</Text>
                    <TextInput
                      value={form.dateOfJoining}
                      editable={false}
                      style={[styles.formInput, styles.readOnlyInput]}
                    />
                  </View>
                </View>
              </View>

              {/* Marriage Details Section */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <IconCommunity name="cake" size={20} color={COLORS.teal} />
                  <Text style={styles.sectionTitle}>Marriage Details</Text>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Marriage Date *</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowMarriageDatePicker(true)}
                    >
                      <Text style={form.marriageDate ? styles.dateText : styles.datePlaceholder}>
                        {form.marriageDate || 'Select marriage date'}
                      </Text>
                      <Icon name="calendar-today" size={20} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.col, { marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>Spouse Name</Text>
                    <TextInput
                      value={form.spouseName}
                      onChangeText={(text) => setForm(prev => ({ ...prev, spouseName: text }))}
                      placeholder="Enter spouse name"
                      style={styles.formInput}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Marriage Certificate</Text>
                    <TouchableOpacity onPress={() => handleFileSelect('certificateFile')} style={styles.fileButton}>
                      <Icon name="cloud-upload" size={20} color={COLORS.info} />
                      <Text style={styles.fileButtonText}>
                        {form.certificateFile ? form.certificateFile.name : 'Upload Certificate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.col, { marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>Marriage Invitation (Optional)</Text>
                    <TouchableOpacity onPress={() => handleFileSelect('invitationFile')} style={styles.fileButton}>
                      <Icon name="cloud-upload" size={20} color={COLORS.info} />
                      <Text style={styles.fileButtonText}>
                        {form.invitationFile ? form.invitationFile.name : 'Upload Invitation'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Allowance Details Section */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Icon name="attach-money" size={20} color={COLORS.blue} />
                  <Text style={styles.sectionTitle}>Allowance Details</Text>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Allowance Type</Text>
                    <TextInput
                      value={form.allowanceType}
                      editable={false}
                      style={[styles.formInput, styles.readOnlyInput]}
                    />
                  </View>
                  <View style={[styles.col, { marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>Allowance Amount</Text>
                    <TextInput
                      value={`₹ ${parseInt(form.allowanceAmount).toLocaleString()}`}
                      editable={false}
                      style={[styles.formInput, styles.readOnlyInput]}
                    />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Request Date</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowRequestDatePicker(true)}
                    >
                      <Text style={styles.dateText}>{form.requestDate}</Text>
                      <Icon name="calendar-today" size={20} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.col, { marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>Requested By</Text>
                    <TextInput
                      value={form.requestedBy}
                      editable={false}
                      style={[styles.formInput, styles.readOnlyInput]}
                    />
                  </View>
                </View>
              </View>

              {/* Payment Details Section */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Icon name="payment" size={20} color={COLORS.green} />
                  <Text style={styles.sectionTitle}>Payment Details</Text>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Payment Status</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={form.paymentStatus}
                        onValueChange={(value) => setForm(prev => ({ ...prev, paymentStatus: value }))}
                        style={styles.picker}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="Pending" value="Pending" />
                        <Picker.Item label="Paid" value="Paid" />
                      </Picker>
                    </View>
                  </View>
                  <View style={[styles.col, { marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>Payment Date</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => setShowPaymentDatePicker(true)}
                    >
                      <Text style={form.paymentDate ? styles.dateText : styles.datePlaceholder}>
                        {form.paymentDate || 'Select payment date'}
                      </Text>
                      <Icon name="calendar-today" size={20} color={COLORS.gray} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Payment Mode</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={form.paymentMode}
                      onValueChange={(value) => setForm(prev => ({ ...prev, paymentMode: value }))}
                      style={styles.picker}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select" value="" />
                      <Picker.Item label="Salary Credit" value="Salary Credit" />
                      <Picker.Item label="Bank Transfer" value="Bank Transfer" />
                      <Picker.Item label="Cash" value="Cash" />
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Approval Status Section */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Icon name="verified" size={20} color={COLORS.warning} />
                  <Text style={styles.sectionTitle}>Approval Status</Text>
                </View>

                <View style={styles.row}>
                  <View style={[styles.col, { marginRight: 8 }]}>
                    <Text style={styles.formLabel}>Manager Status</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={form.managerStatus}
                        onValueChange={(value) => setForm(prev => ({ ...prev, managerStatus: value }))}
                        style={styles.picker}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="Pending" value="Pending" />
                        <Picker.Item label="Approved" value="Approved" />
                        <Picker.Item label="Rejected" value="Rejected" />
                      </Picker>
                    </View>
                  </View>
                  <View style={[styles.col, { marginLeft: 8 }]}>
                    <Text style={styles.formLabel}>HR Status</Text>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={form.hrStatus}
                        onValueChange={(value) => setForm(prev => ({ ...prev, hrStatus: value }))}
                        style={styles.picker}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="Pending" value="Pending" />
                        <Picker.Item label="Approved" value="Approved" />
                        <Picker.Item label="Rejected" value="Rejected" />
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Remarks</Text>
                  <TextInput
                    value={form.remarks}
                    onChangeText={(text) => setForm(prev => ({ ...prev, remarks: text }))}
                    placeholder="Enter any remarks..."
                    multiline
                    numberOfLines={3}
                    style={[styles.formInput, styles.textArea]}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => {
                  setShowForm(false);
                  resetForm();
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.submitButton, loading && { backgroundColor: COLORS.gray }]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>{editingId ? 'Update' : 'Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showMarriageDatePicker && (
        <DateTimePicker
          value={selectedMarriageDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleMarriageDateChange}
          maximumDate={new Date()}
        />
      )}
      
      {showPaymentDatePicker && (
        <DateTimePicker
          value={selectedPaymentDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handlePaymentDateChange}
          maximumDate={new Date()}
        />
      )}
      
      {showRequestDatePicker && (
        <DateTimePicker
          value={selectedRequestDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleRequestDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* View Modal */}
      <Modal
        visible={viewingItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingItem(null)}
      >
        <View style={styles.viewModalContainer}>
          <View style={styles.viewModalContent}>
            <View style={styles.viewModalHeader}>
              <Text style={styles.viewModalTitle}>Marriage Allowance Details</Text>
              <TouchableOpacity onPress={() => setViewingItem(null)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {viewingItem && (
              <ScrollView style={{ maxHeight: 500 }}>
                {/* Employee Details */}
                <View style={[styles.card, { backgroundColor: COLORS.indigoLight }]}>
                  <View style={styles.cardHeader}>
                    <Icon name="person" size={20} color={COLORS.indigo} />
                    <Text style={[styles.cardTitle, { color: COLORS.indigo }]}>Employee Details</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Employee</Text>
                      <Text style={styles.cardValue}>{viewingItem.employeeName} ({viewingItem.employeeId})</Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Division</Text>
                      <Text style={styles.cardValue}>{viewingItem.division || '—'}</Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Designation</Text>
                      <Text style={styles.cardValue}>{viewingItem.designation || '—'}</Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Location</Text>
                      <Text style={styles.cardValue}>{viewingItem.location || '—'}</Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Joining Date</Text>
                      <Text style={styles.cardValue}>
                        {viewingItem.dateOfJoining ? new Date(viewingItem.dateOfJoining).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Marriage Details */}
                <View style={[styles.card, { backgroundColor: COLORS.tealLight }]}>
                  <View style={styles.cardHeader}>
                    <IconCommunity name="cake" size={20} color={COLORS.teal} />
                    <Text style={[styles.cardTitle, { color: COLORS.teal }]}>Marriage Details</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Marriage Date</Text>
                      <Text style={styles.cardValue}>
                        {viewingItem.marriageDate ? new Date(viewingItem.marriageDate).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Spouse Name</Text>
                      <Text style={styles.cardValue}>{viewingItem.spouseName || '—'}</Text>
                    </View>
                  </View>

                  <View style={styles.cardRow}>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Certificate</Text>
                      {viewingItem.certificatePath ? (
                        <TouchableOpacity onPress={() => openDocument(getDocumentUrl(viewingItem.certificatePath!)!)} style={styles.documentLink}>
                          <Icon name="picture-as-pdf" size={16} color={COLORS.teal} />
                          <Text style={styles.documentLinkText}>View Certificate</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.cardValue}>No document</Text>
                      )}
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Invitation</Text>
                      {viewingItem.invitationPath ? (
                        <TouchableOpacity onPress={() => openDocument(getDocumentUrl(viewingItem.invitationPath!)!)} style={styles.documentLink}>
                          <Icon name="image" size={16} color={COLORS.teal} />
                          <Text style={styles.documentLinkText}>View Invitation</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.cardValue}>No document</Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Allowance Details */}
                <View style={[styles.card, { backgroundColor: COLORS.blueLight }]}>
                  <View style={styles.cardHeader}>
                    <Icon name="attach-money" size={20} color={COLORS.blue} />
                    <Text style={[styles.cardTitle, { color: COLORS.blue }]}>Allowance Details</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Allowance Type</Text>
                      <Text style={styles.cardValue}>{viewingItem.allowanceType || 'Marriage Allowance'}</Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Allowance Amount</Text>
                      <Text style={styles.cardValue}>{formatCurrency(viewingItem.allowanceAmount || 5000)}</Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Request Date</Text>
                      <Text style={styles.cardValue}>
                        {viewingItem.requestDate ? new Date(viewingItem.requestDate).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Requested By</Text>
                      <Text style={styles.cardValue}>{viewingItem.requestedBy || '—'}</Text>
                    </View>
                  </View>
                </View>

                {/* Payment Details */}
                <View style={[styles.card, { backgroundColor: COLORS.greenLight }]}>
                  <View style={styles.cardHeader}>
                    <Icon name="payment" size={20} color={COLORS.green} />
                    <Text style={[styles.cardTitle, { color: COLORS.green }]}>Payment Details</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Payment Status</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(viewingItem.paymentStatus), alignSelf: 'flex-start' }]}>
                        <Text style={[styles.statusText, { color: getStatusTextColor(viewingItem.paymentStatus) }]}>
                          {viewingItem.paymentStatus}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Payment Mode</Text>
                      <Text style={styles.cardValue}>{viewingItem.paymentMode || '—'}</Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Payment Date</Text>
                      <Text style={styles.cardValue}>
                        {viewingItem.paymentDate ? new Date(viewingItem.paymentDate).toLocaleDateString() : '—'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Approval Status */}
                <View style={[styles.card, { backgroundColor: COLORS.yellowLight }]}>
                  <View style={styles.cardHeader}>
                    <Icon name="verified" size={20} color={COLORS.warning} />
                    <Text style={[styles.cardTitle, { color: COLORS.warning }]}>Approval Status</Text>
                  </View>
                  <View style={styles.cardRow}>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>Manager Status</Text>
                      <Text style={styles.cardValue}>{viewingItem.managerStatus}</Text>
                    </View>
                    <View style={styles.cardItem}>
                      <Text style={styles.cardLabel}>HR Status</Text>
                      <Text style={styles.cardValue}>{viewingItem.hrStatus}</Text>
                    </View>
                  </View>
                  {viewingItem.remarks && (
                    <View style={styles.cardRow}>
                      <View style={styles.cardItem}>
                        <Text style={styles.cardLabel}>Remarks</Text>
                        <Text style={styles.cardValue}>{viewingItem.remarks}</Text>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setViewingItem(null)}
              style={styles.viewModalCloseButton}
            >
              <Text style={styles.viewModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.viewModalContainer}>
          <View style={[styles.viewModalContent, { width: '80%', maxWidth: 400 }]}>
            <View style={styles.deleteModalContent}>
              <IconCommunity name="alert-circle" size={48} color={COLORS.red} />
              <Text style={styles.deleteModalTitle}>Confirm Deletion</Text>
              <Text style={styles.deleteModalMessage}>
                Are you sure you want to delete the marriage allowance record for{' '}
                <Text style={{ fontWeight: 'bold' }}>{itemToDelete?.employeeName}</Text>?
                This action cannot be undone.
              </Text>
              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  onPress={() => setShowDeleteModal(false)}
                  style={styles.deleteCancelButton}
                >
                  <Text style={styles.deleteCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={confirmDelete}
                  style={styles.deleteConfirmButton}
                >
                  <Text style={styles.deleteConfirmButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Marriage Allowance • Payroll • "
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    padding: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.filterBg,
  },
  filterToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  filtersPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  filterInputContainer: {
    marginBottom: 16,
  },
  filterInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 6,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.filterBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.dropdownBg,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    color: COLORS.dropdownText,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButton: {
    backgroundColor: COLORS.primary,
  },
  exportButton: {
    backgroundColor: COLORS.gray,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '500',
  },
  resultsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  resultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  tableContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  noRecordsContainer: {
    padding: 50,
    alignItems: 'center',
  },
  noRecordsText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 16,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  employeeIdText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  employeeNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  employeeSubText: {
    fontSize: 11,
    color: COLORS.gray,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionIcon: {
    padding: 6,
    borderRadius: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
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
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalBody: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 4,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  readOnlyInput: {
    backgroundColor: COLORS.filterBg,
    color: COLORS.textSecondary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  col: {
    flex: 1,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  datePlaceholder: {
    fontSize: 14,
    color: COLORS.gray,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.filterBg,
  },
  fileButtonText: {
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.info,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.gray,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  viewModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    padding: 20,
    maxHeight: '80%',
  },
  viewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  cardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardItem: {
    width: '50%',
    marginBottom: 12,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 2,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  documentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  documentLinkText: {
    marginLeft: 4,
    fontSize: 13,
    color: COLORS.info,
    textDecorationLine: 'underline',
  },
  viewModalCloseButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  viewModalCloseText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  deleteModalContent: {
    alignItems: 'center',
    padding: 20,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  deleteModalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteCancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.gray,
    alignItems: 'center',
  },
  deleteCancelButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.red,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default MarriageAllowanceScreen;