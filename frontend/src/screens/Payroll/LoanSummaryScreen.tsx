// screens/Payroll/LoanSummaryScreen.tsx
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
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { loanAPI, employeeAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

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

interface Employee {
  _id?: string;
  employeeId: string;
  name: string;
  location?: string;
  division?: string;
  department?: string;
  designation?: string;
}

interface Loan {
  _id?: string;
  id?: string;
  loanId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  tenureMonths: number;
  startDate: string;
  location: string;
  division: string;
  status: 'active' | 'completed' | 'on-hold';
  paymentEnabled: boolean;
  paidMonths?: number;
  nextDueDate?: string;
}

interface FormData {
  employeeId: string;
  employeeName: string;
  amount: string;
  tenureMonths: string;
  startDate: string;
  location: string;
  division: string;
  status?: 'active' | 'completed' | 'on-hold';
}

const LoanSummaryScreen = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDivision, setFilterDivision] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Form state with proper typing
  const [form, setForm] = useState<FormData>({
    employeeId: '',
    employeeName: '',
    amount: '',
    tenureMonths: '',
    startDate: new Date().toISOString().split('T')[0],
    location: 'Chennai',
    division: 'SDS',
  });

  // Dropdown options
  const locations = ['all', 'Chennai', 'Hosur'];
  const divisions = ['all', 'SDS', 'TEKLA', 'DAS(Software)', 'Mechanical', 'Electrical'];
  const statusOptions = ['all', 'active', 'completed', 'on-hold'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loansRes, employeesRes] = await Promise.all([
        loanAPI.list({}),
        employeeAPI.getAllEmployees()
      ]);

      if (loansRes.data?.success) {
        setLoans(loansRes.data.loans || []);
      }

      // Transform employee data to match our interface
      const empList = Array.isArray(employeesRes.data) ? employeesRes.data : [];
      const transformedEmployees: Employee[] = empList.map((emp: any) => ({
        _id: emp._id,
        employeeId: emp.employeeId || '',
        name: emp.name || emp.employeename || '',
        location: emp.location || '',
        division: emp.division || '',
        department: emp.department || '',
        designation: emp.designation || '',
      }));
      
      setEmployees(transformedEmployees);
    } catch (error) {
      console.error('Error loading data', error);
      Alert.alert('Error', 'Failed to load loan data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Filtered loans
  const filteredLoans = loans.filter(loan => {
    if (filterEmployeeId && !loan.employeeId.toLowerCase().includes(filterEmployeeId.toLowerCase())) {
      return false;
    }
    if (filterLocation !== 'all' && loan.location !== filterLocation) {
      return false;
    }
    if (filterDivision !== 'all' && loan.division !== filterDivision) {
      return false;
    }
    if (filterStatus !== 'all' && loan.status !== filterStatus) {
      return false;
    }
    return true;
  });

  // Helper functions
  const calcMonthlyDeduction = (loan: Loan) => {
    if (!loan.amount || !loan.tenureMonths) return 0;
    return Math.round(loan.amount / loan.tenureMonths);
  };

  const remainingBalance = (loan: Loan) => {
    const paid = loan.paidMonths || 0;
    return Math.max(loan.amount - calcMonthlyDeduction(loan) * paid, 0);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch(status) {
      case 'active': return COLORS.greenLight;
      case 'completed': return COLORS.blueLight;
      case 'on-hold': return COLORS.yellowLight;
      default: return COLORS.filterBg;
    }
  };

  const getStatusTextColor = (status: string) => {
    switch(status) {
      case 'active': return COLORS.green;
      case 'completed': return COLORS.blue;
      case 'on-hold': return COLORS.warning;
      default: return COLORS.gray;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleFilterChange = (field: string, value: string) => {
    switch(field) {
      case 'employeeId': setFilterEmployeeId(value); break;
      case 'location': setFilterLocation(value); break;
      case 'division': setFilterDivision(value); break;
      case 'status': setFilterStatus(value); break;
    }
  };

  const handleFormChange = (field: keyof FormData, value: string) => {
    if (field === 'amount' && Number(value) > 1000000) return;
    if (field === 'tenureMonths' && Number(value) > 60) return;
    
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleEmployeeSelect = (empId: string) => {
    const emp = employees.find(e => e.employeeId === empId);
    if (emp) {
      setForm(prev => ({
        ...prev,
        employeeId: emp.employeeId,
        employeeName: emp.name,
        location: emp.location || prev.location,
        division: emp.division || prev.division
      }));
    }
  };

  const handleAddLoan = async () => {
    if (!form.employeeId || !form.amount || !form.tenureMonths) {
      Alert.alert('Validation Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        employeeId: form.employeeId,
        employeeName: form.employeeName,
        amount: Number(form.amount),
        tenureMonths: Number(form.tenureMonths),
        startDate: form.startDate,
        location: form.location,
        division: form.division,
        status: 'active' as const,
        paymentEnabled: true
      };

      const response = await loanAPI.create(payload);
      if (response.data?.success) {
        setLoans(prev => [response.data.loan, ...prev]);
        setShowAddModal(false);
        setForm({
          employeeId: '',
          employeeName: '',
          amount: '',
          tenureMonths: '',
          startDate: new Date().toISOString().split('T')[0],
          location: 'Chennai',
          division: 'SDS',
        });
        Alert.alert('Success', 'Loan added successfully');
      }
    } catch (error) {
      console.error('Error adding loan', error);
      Alert.alert('Error', 'Failed to add loan');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLoan = async () => {
    if (!selectedLoan?._id) return;

    try {
      setLoading(true);
      const updatedLoan: Partial<Loan> = {
        employeeId: form.employeeId,
        employeeName: form.employeeName,
        amount: Number(form.amount),
        tenureMonths: Number(form.tenureMonths),
        startDate: form.startDate,
        location: form.location,
        division: form.division,
        status: form.status || selectedLoan.status
      };

      const response = await loanAPI.update(selectedLoan._id, updatedLoan);
      if (response.data?.success) {
        setLoans(prev => prev.map(loan => 
          loan._id === selectedLoan._id ? response.data.loan : loan
        ));
        setShowEditModal(false);
        setSelectedLoan(null);
        setForm({
          employeeId: '',
          employeeName: '',
          amount: '',
          tenureMonths: '',
          startDate: new Date().toISOString().split('T')[0],
          location: 'Chennai',
          division: 'SDS',
        });
        Alert.alert('Success', 'Loan updated successfully');
      }
    } catch (error) {
      console.error('Error updating loan', error);
      Alert.alert('Error', 'Failed to update loan');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLoan = (loan: Loan) => {
    Alert.alert(
      'Delete Loan',
      'Are you sure you want to delete this loan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await loanAPI.delete(loan._id!);
              if (response.data?.success) {
                setLoans(prev => prev.filter(l => l._id !== loan._id));
                Alert.alert('Success', 'Loan deleted successfully');
              }
            } catch (error) {
              console.error('Error deleting loan', error);
              Alert.alert('Error', 'Failed to delete loan');
            }
          }
        }
      ]
    );
  };

  const handleTogglePayment = async (loan: Loan) => {
    try {
      const response = await loanAPI.togglePayment(loan._id!);
      if (response.data?.success) {
        setLoans(prev => prev.map(l => 
          l._id === loan._id ? response.data.loan : l
        ));
      }
    } catch (error) {
      console.error('Error toggling payment', error);
      Alert.alert('Error', 'Failed to toggle payment');
    }
  };

  const handleViewLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowViewModal(true);
  };

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    setForm({
      employeeId: loan.employeeId,
      employeeName: loan.employeeName,
      amount: loan.amount.toString(),
      tenureMonths: loan.tenureMonths.toString(),
      startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      location: loan.location,
      division: loan.division,
      status: loan.status
    });
    setShowEditModal(true);
  };

  const exportCSV = async () => {
    const header = ['Employee ID', 'Employee Name', 'Loan Amount', 'Tenure', 'Monthly EMI', 'Remaining Balance', 'Status', 'Payment Status'];
    const rows = filteredLoans.map(loan => [
      loan.employeeId,
      loan.employeeName,
      loan.amount.toString(),
      loan.tenureMonths.toString(),
      calcMonthlyDeduction(loan).toString(),
      remainingBalance(loan).toString(),
      loan.status,
      loan.paymentEnabled ? 'Enabled' : 'Disabled'
    ]);

    const csv = [header, ...rows].map(row => row.join(',')).join('\n');

    const fileName = `Loan_Summary_${Date.now()}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csv, 'utf8');
      
      const shareOptions = {
        title: 'Export Loan Summary',
        message: 'Loan Summary Report',
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

  const isFilterApplied = filterEmployeeId || filterLocation !== 'all' || filterDivision !== 'all' || filterStatus !== 'all';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Loan Summary" 
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
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Filter Options</Text>
            {isFilterApplied && (
              <TouchableOpacity 
                onPress={() => {
                  setFilterEmployeeId('');
                  setFilterLocation('all');
                  setFilterDivision('all');
                  setFilterStatus('all');
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Icon name="clear-all" size={18} color={COLORS.red} />
                <Text style={{ color: COLORS.red, fontSize: 13, marginLeft: 4 }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ width: '100%' }}>
            {/* Employee ID Search */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Employee ID</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.filterBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Icon name="search" size={20} color={COLORS.gray} />
                <TextInput
                  value={filterEmployeeId}
                  onChangeText={(text) => handleFilterChange('employeeId', text)}
                  placeholder="Search by employee ID..."
                  placeholderTextColor={COLORS.gray}
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: COLORS.textPrimary,
                  }}
                />
                {filterEmployeeId !== '' && (
                  <TouchableOpacity onPress={() => setFilterEmployeeId('')}>
                    <Icon name="close" size={18} color={COLORS.gray} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Location Filter */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Location</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterLocation}
                  onValueChange={(value) => handleFilterChange('location', value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  {locations.map(loc => (
                    <Picker.Item key={loc} label={loc === 'all' ? 'All Locations' : loc} value={loc} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Division Filter */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Division</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDivision}
                  onValueChange={(value) => handleFilterChange('division', value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  {divisions.map(div => (
                    <Picker.Item key={div} label={div === 'all' ? 'All Divisions' : div} value={div} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Status Filter */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Status</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterStatus}
                  onValueChange={(value) => handleFilterChange('status', value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  {statusOptions.map(status => (
                    <Picker.Item 
                      key={status} 
                      label={status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')} 
                      value={status} 
                    />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{
                flex: 1,
                backgroundColor: COLORS.primary,
                paddingVertical: 14,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Icon name="add" size={20} color={COLORS.white} />
              <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 14, fontWeight: '500' }}>Add Loan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={exportCSV}
              style={{
                flex: 1,
                backgroundColor: COLORS.gray,
                paddingVertical: 14,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="file-download" size={20} color={COLORS.white} />
              <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 14, fontWeight: '500' }}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            Showing {filteredLoans.length} {filteredLoans.length === 1 ? 'record' : 'records'}
          </Text>
          {isFilterApplied && (
            <Text style={{ fontSize: 12, color: COLORS.blue }}>
              Filters Applied
            </Text>
          )}
        </View>

        {/* Loans Table */}
        {loading && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading loan data...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 8 }}>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee ID</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee Name</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Loan Amount</Text>
                  <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Tenure</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Monthly EMI</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Remaining Balance</Text>
                  <Text style={{ width: 90, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Status</Text>
                  <Text style={{ width: 90, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Payment</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredLoans.length === 0 ? (
                  <View style={{ padding: 50, alignItems: 'center' }}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={{ marginTop: 12, color: COLORS.gray, fontSize: 16 }}>No loan records found</Text>
                    <Text style={{ marginTop: 4, color: COLORS.lightGray, fontSize: 13 }}>Try adjusting your filters or add a new loan</Text>
                  </View>
                ) : filteredLoans.map((loan, idx) => {
                  const isPaymentAllowed = loan.paymentEnabled && loan.status !== 'completed';
                  
                  return (
                    <View key={loan._id || idx} style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: idx % 2 === 0 ? COLORS.white : COLORS.filterBg }}>
                      <Text style={{ width: 100, fontSize: 13, fontWeight: '500', color: COLORS.textPrimary }}>{loan.employeeId}</Text>
                      <View style={{ width: 150 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{loan.employeeName}</Text>
                        <Text style={{ fontSize: 11, color: COLORS.gray }}>{loan.division} | {loan.location}</Text>
                      </View>
                      <Text style={{ width: 120, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(loan.amount)}</Text>
                      <Text style={{ width: 80, fontSize: 13, color: COLORS.textSecondary, textAlign: 'right' }}>{loan.tenureMonths} months</Text>
                      <Text style={{ width: 100, fontSize: 13, color: COLORS.blue, fontWeight: '500', textAlign: 'right' }}>{formatCurrency(calcMonthlyDeduction(loan))}</Text>
                      <Text style={{ width: 120, fontSize: 13, fontWeight: '600', color: remainingBalance(loan) === 0 ? COLORS.green : COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(remainingBalance(loan))}</Text>
                      
                      {/* Status */}
                      <View style={{ width: 90, alignItems: 'center' }}>
                        <View style={{ 
                          backgroundColor: getStatusBgColor(loan.status), 
                          paddingHorizontal: 8, 
                          paddingVertical: 4, 
                          borderRadius: 12 
                        }}>
                          <Text style={{ fontSize: 11, color: getStatusTextColor(loan.status), fontWeight: '500' }}>
                            {loan.status.charAt(0).toUpperCase() + loan.status.slice(1).replace('-', ' ')}
                          </Text>
                        </View>
                      </View>

                      {/* Payment Toggle */}
                      <View style={{ width: 90, alignItems: 'center' }}>
                        <TouchableOpacity
                          onPress={() => handleTogglePayment(loan)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <View style={{
                            width: 40,
                            height: 20,
                            borderRadius: 10,
                            backgroundColor: loan.paymentEnabled ? COLORS.green : COLORS.gray,
                            marginRight: 4,
                          }}>
                            <View style={{
                              width: 16,
                              height: 16,
                              borderRadius: 8,
                              backgroundColor: COLORS.white,
                              position: 'absolute',
                              top: 2,
                              left: loan.paymentEnabled ? 22 : 2,
                            }} />
                          </View>
                          <Text style={{ fontSize: 11, color: loan.paymentEnabled ? COLORS.green : COLORS.gray }}>
                            {loan.paymentEnabled ? 'Enabled' : 'Disabled'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Actions */}
                      <View style={{ width: 150, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => handleViewLoan(loan)} style={{ padding: 6, backgroundColor: COLORS.indigoLight, borderRadius: 20 }}>
                          <Icon name="visibility" size={18} color={COLORS.indigo} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEditLoan(loan)} style={{ padding: 6, backgroundColor: COLORS.blueLight, borderRadius: 20 }}>
                          <Icon name="edit" size={18} color={COLORS.blue} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteLoan(loan)} style={{ padding: 6, backgroundColor: COLORS.redLight, borderRadius: 20 }}>
                          <Icon name="delete" size={18} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}

                {/* Footer Totals */}
                {filteredLoans.length > 0 && (
                  <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 2, borderTopColor: COLORS.border, backgroundColor: COLORS.filterBg }}>
                    <Text style={{ width: 100, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>Totals</Text>
                    <Text style={{ width: 150, fontSize: 13 }} />
                    <Text style={{ width: 120, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>
                      {formatCurrency(filteredLoans.reduce((sum, l) => sum + l.amount, 0))}
                    </Text>
                    <Text style={{ width: 80, fontSize: 13 }} />
                    <Text style={{ width: 100, fontSize: 13 }} />
                    <Text style={{ width: 120, fontSize: 13, fontWeight: '600', color: COLORS.green, textAlign: 'right' }}>
                      {formatCurrency(filteredLoans.reduce((sum, l) => sum + remainingBalance(l), 0))}
                    </Text>
                    <View style={{ width: 90 }} />
                    <View style={{ width: 90 }} />
                    <View style={{ width: 150 }} />
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Add Loan Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>Add New Loan</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Employee Selection */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee *</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={form.employeeId}
                    onValueChange={handleEmployeeSelect}
                    style={{ height: 50, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="Select Employee" value="" color={COLORS.gray} />
                    {employees.map(emp => (
                      <Picker.Item 
                        key={emp._id || emp.employeeId} 
                        label={`${emp.employeeId} - ${emp.name}`} 
                        value={emp.employeeId} 
                        color={COLORS.dropdownText} 
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Employee Name (Read Only) */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee Name</Text>
                <TextInput
                  value={form.employeeName}
                  editable={false}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.filterBg,
                    color: COLORS.textSecondary,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Loan Amount *</Text>
                  <TextInput
                    value={form.amount}
                    onChangeText={(text) => handleFormChange('amount', text)}
                    placeholder="Enter amount"
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
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>Max: ₹10,00,000</Text>
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Tenure (Months) *</Text>
                  <TextInput
                    value={form.tenureMonths}
                    onChangeText={(text) => handleFormChange('tenureMonths', text)}
                    placeholder="Enter months"
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
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>Max: 60 months</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={form.location}
                      onValueChange={(value) => handleFormChange('location', value)}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                      enabled={false}
                    >
                      <Picker.Item label="Chennai" value="Chennai" />
                      <Picker.Item label="Hosur" value="Hosur" />
                    </Picker>
                  </View>
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={form.division}
                      onValueChange={(value) => handleFormChange('division', value)}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                      enabled={false}
                    >
                      <Picker.Item label="SDS" value="SDS" />
                      <Picker.Item label="TEKLA" value="TEKLA" />
                      <Picker.Item label="DAS(Software)" value="DAS(Software)" />
                      <Picker.Item label="Mechanical" value="Mechanical" />
                      <Picker.Item label="Electrical" value="Electrical" />
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Start Date</Text>
                <TextInput
                  value={form.startDate}
                  onChangeText={(text) => handleFormChange('startDate', text)}
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
            </ScrollView>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.gray, borderRadius: 6, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddLoan}
                disabled={loading}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: loading ? COLORS.gray : COLORS.primary, borderRadius: 6 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Add Loan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Loan Modal */}
      <Modal
        visible={showViewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 600, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>Loan Details</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {selectedLoan && (
              <ScrollView style={{ maxHeight: 500 }}>
                {/* Employee Details Card */}
                <View style={{ backgroundColor: COLORS.indigoLight, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Icon name="person" size={20} color={COLORS.indigo} />
                    <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.indigo }}>Employee Details</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Employee ID</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{selectedLoan.employeeId}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Employee Name</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{selectedLoan.employeeName}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Location</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{selectedLoan.location}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Division</Text>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.indigo }}>{selectedLoan.division}</Text>
                    </View>
                  </View>
                </View>

                {/* Loan Details Card */}
                <View style={{ backgroundColor: COLORS.blueLight, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Icon name="account-balance" size={20} color={COLORS.blue} />
                    <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.blue }}>Loan Details</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Loan ID</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.blue }}>{selectedLoan.loanId}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Start Date</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{selectedLoan.startDate}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Loan Amount</Text>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary }}>{formatCurrency(selectedLoan.amount)}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Tenure</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{selectedLoan.tenureMonths} months</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Monthly EMI</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.blue }}>{formatCurrency(calcMonthlyDeduction(selectedLoan))}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Paid Months</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{selectedLoan.paidMonths || 0}</Text>
                    </View>
                  </View>
                </View>

                {/* Payment Status Card */}
                <View style={{ backgroundColor: COLORS.greenLight, borderRadius: 8, padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <Icon name="payment" size={20} color={COLORS.green} />
                    <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.green }}>Payment Status</Text>
                  </View>
                  
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Remaining Balance</Text>
                      <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary }}>{formatCurrency(remainingBalance(selectedLoan))}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray }}>Status</Text>
                      <View style={{ 
                        backgroundColor: getStatusBgColor(selectedLoan.status), 
                        paddingHorizontal: 8, 
                        paddingVertical: 4, 
                        borderRadius: 12,
                        alignSelf: 'flex-start'
                      }}>
                        <Text style={{ fontSize: 12, color: getStatusTextColor(selectedLoan.status), fontWeight: '500' }}>
                          {selectedLoan.status.charAt(0).toUpperCase() + selectedLoan.status.slice(1).replace('-', ' ')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={{ marginTop: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: COLORS.gray, marginRight: 8 }}>Payment:</Text>
                      <View style={{
                        width: 40,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: selectedLoan.paymentEnabled ? COLORS.green : COLORS.gray,
                        marginRight: 4,
                      }}>
                        <View style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: COLORS.white,
                          position: 'absolute',
                          top: 2,
                          left: selectedLoan.paymentEnabled ? 22 : 2,
                        }} />
                      </View>
                      <Text style={{ fontSize: 12, color: selectedLoan.paymentEnabled ? COLORS.green : COLORS.gray }}>
                        {selectedLoan.paymentEnabled ? 'Enabled' : 'Disabled'}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  {selectedLoan.tenureMonths && (
                    <View style={{ marginTop: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, color: COLORS.gray }}>Payment Progress</Text>
                        <Text style={{ fontSize: 11, color: COLORS.gray }}>
                          {selectedLoan.paidMonths || 0} of {selectedLoan.tenureMonths} months
                        </Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: COLORS.lightGray, borderRadius: 3 }}>
                        <View style={{ 
                          width: `${((selectedLoan.paidMonths || 0) / selectedLoan.tenureMonths) * 100}%`, 
                          height: 6, 
                          backgroundColor: COLORS.green, 
                          borderRadius: 3 
                        }} />
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowViewModal(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Loan Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>Edit Loan</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee ID</Text>
                <TextInput
                  value={form.employeeId}
                  onChangeText={(text) => handleFormChange('employeeId', text)}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee Name</Text>
                <TextInput
                  value={form.employeeName}
                  onChangeText={(text) => handleFormChange('employeeName', text)}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Loan Amount</Text>
                  <TextInput
                    value={form.amount}
                    onChangeText={(text) => handleFormChange('amount', text)}
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
                  />
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Tenure (Months)</Text>
                  <TextInput
                    value={form.tenureMonths}
                    onChangeText={(text) => handleFormChange('tenureMonths', text)}
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
                  />
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', paddingRight: 4, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={form.location}
                      onValueChange={(value) => handleFormChange('location', value)}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Chennai" value="Chennai" />
                      <Picker.Item label="Hosur" value="Hosur" />
                    </Picker>
                  </View>
                </View>

                <View style={{ width: '50%', paddingLeft: 4, marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={form.division}
                      onValueChange={(value) => handleFormChange('division', value)}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="SDS" value="SDS" />
                      <Picker.Item label="TEKLA" value="TEKLA" />
                      <Picker.Item label="DAS(Software)" value="DAS(Software)" />
                      <Picker.Item label="Mechanical" value="Mechanical" />
                      <Picker.Item label="Electrical" value="Electrical" />
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Start Date</Text>
                <TextInput
                  value={form.startDate}
                  onChangeText={(text) => handleFormChange('startDate', text)}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Status</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={form.status || selectedLoan?.status}
                    onValueChange={(value) => handleFormChange('status', value)}
                    style={{ height: 50, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="Active" value="active" />
                    <Picker.Item label="Completed" value="completed" />
                    <Picker.Item label="On Hold" value="on-hold" />
                  </Picker>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.gray, borderRadius: 6, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdateLoan}
                disabled={loading}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: loading ? COLORS.gray : COLORS.primary, borderRadius: 6 }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Update Loan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Loan Summary • Payroll • "
      />
    </SafeAreaView>
  );
};

export default LoanSummaryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
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
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButtonText: {
    color: COLORS.red,
    fontSize: 13,
    marginLeft: 4,
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
  },
  picker: {
    height: 50,
    color: COLORS.dropdownText,
  },
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  exportButton: {
    backgroundColor: COLORS.gray,
  },
  buttonText: {
    marginLeft: 6,
    color: COLORS.white,
    fontSize: 14,
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
  filtersAppliedText: {
    fontSize: 12,
    color: COLORS.blue,
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
  noRecordsSubText: {
    marginTop: 4,
    color: COLORS.lightGray,
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  employeeIdText: {
    width: 100,
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  employeeNameContainer: {
    width: 150,
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
    width: 120,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  tenureText: {
    width: 80,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  emiText: {
    width: 100,
    fontSize: 13,
    color: COLORS.blue,
    fontWeight: '500',
    textAlign: 'right',
  },
  balanceText: {
    width: 120,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  statusContainer: {
    width: 90,
    alignItems: 'center',
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
  paymentToggleContainer: {
    width: 90,
    alignItems: 'center',
  },
  paymentToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentToggleTrack: {
    width: 40,
    height: 20,
    borderRadius: 10,
    marginRight: 4,
  },
  paymentToggleThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    position: 'absolute',
    top: 2,
  },
  paymentToggleText: {
    fontSize: 11,
  },
  actionsContainer: {
    width: 150,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionIcon: {
    padding: 6,
    borderRadius: 20,
  },
  footerTotals: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.filterBg,
  },
  totalsText: {
    width: 100,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  maxAmountText: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.gray,
    borderRadius: 6,
    marginRight: 8,
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: {
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
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    padding: 20,
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
    borderRadius: 8,
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
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },
  cardValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  progressBarContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
  },
});
