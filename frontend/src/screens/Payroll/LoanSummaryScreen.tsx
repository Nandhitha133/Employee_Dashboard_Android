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
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
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

  // Form state
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

  const calcMonthlyDeduction = (loan: Loan) => {
    if (!loan.amount || !loan.tenureMonths) return 0;
    return Math.round(loan.amount / loan.tenureMonths);
  };

  const remainingBalance = (loan: Loan) => {
    const paid = loan.paidMonths || 0;
    return Math.max(loan.amount - calcMonthlyDeduction(loan) * paid, 0);
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
      await Share.open({
        title: 'Export Loan Summary',
        message: 'Loan Summary Report',
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

  const isFilterApplied = filterEmployeeId || filterLocation !== 'all' || filterDivision !== 'all' || filterStatus !== 'all';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Loan Summary" showBack={true} />

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
            <Text style={styles.filterTitle}>Filter Options</Text>
            {isFilterApplied && (
              <TouchableOpacity 
                onPress={() => {
                  setFilterEmployeeId('');
                  setFilterLocation('all');
                  setFilterDivision('all');
                  setFilterStatus('all');
                }}
                style={styles.clearButton}
              >
                <Icon name="clear-all" size={18} color={COLORS.red} />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Employee ID Search */}
          <View style={styles.filterInputContainer}>
            <Text style={styles.filterInputLabel}>Employee ID</Text>
            <View style={styles.textInputContainer}>
              <Icon name="search" size={20} color={COLORS.gray} />
              <TextInput
                value={filterEmployeeId}
                onChangeText={setFilterEmployeeId}
                placeholder="Search by employee ID..."
                placeholderTextColor={COLORS.gray}
                style={styles.textInput}
              />
              {filterEmployeeId !== '' && (
                <TouchableOpacity onPress={() => setFilterEmployeeId('')}>
                  <Icon name="close" size={18} color={COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Location Filter */}
          <View style={styles.filterInputContainer}>
            <Text style={styles.filterInputLabel}>Location</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterLocation}
                onValueChange={setFilterLocation}
                style={styles.picker}
                dropdownIconColor={COLORS.primary}
              >
                {locations.map(loc => (
                  <Picker.Item key={loc} label={loc === 'all' ? 'All Locations' : loc} value={loc} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Division Filter */}
          <View style={styles.filterInputContainer}>
            <Text style={styles.filterInputLabel}>Division</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterDivision}
                onValueChange={setFilterDivision}
                style={styles.picker}
                dropdownIconColor={COLORS.primary}
              >
                {divisions.map(div => (
                  <Picker.Item key={div} label={div === 'all' ? 'All Divisions' : div} value={div} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterInputContainer}>
            <Text style={styles.filterInputLabel}>Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterStatus}
                onValueChange={setFilterStatus}
                style={styles.picker}
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

          {/* Action Buttons */}
          <View style={styles.actionButtonContainer}>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={[styles.actionButton, styles.addButton]}
            >
              <Icon name="add" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Add Loan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={exportCSV}
              style={[styles.actionButton, styles.exportButton]}
            >
              <Icon name="file-download" size={20} color={COLORS.white} />
              <Text style={styles.buttonText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            Showing {filteredLoans.length} {filteredLoans.length === 1 ? 'record' : 'records'}
          </Text>
          {isFilterApplied && (
            <Text style={styles.filtersAppliedText}>Filters Applied</Text>
          )}
        </View>

        {/* Loans Table */}
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading loan data...</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Employee ID</Text>
                  <Text style={[styles.tableHeaderText, { width: 150 }]}>Employee Name</Text>
                  <Text style={[styles.tableHeaderText, { width: 120, textAlign: 'right' }]}>Loan Amount</Text>
                  <Text style={[styles.tableHeaderText, { width: 80, textAlign: 'right' }]}>Tenure</Text>
                  <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'right' }]}>Monthly EMI</Text>
                  <Text style={[styles.tableHeaderText, { width: 120, textAlign: 'right' }]}>Remaining Balance</Text>
                  <Text style={[styles.tableHeaderText, { width: 90, textAlign: 'center' }]}>Status</Text>
                  <Text style={[styles.tableHeaderText, { width: 90, textAlign: 'center' }]}>Payment</Text>
                  <Text style={[styles.tableHeaderText, { width: 150, textAlign: 'center' }]}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredLoans.length === 0 ? (
                  <View style={styles.noRecordsContainer}>
                    <IconCommunity name="information-outline" size={48} color={COLORS.gray} />
                    <Text style={styles.noRecordsText}>No loan records found</Text>
                    <Text style={styles.noRecordsSubText}>Try adjusting your filters or add a new loan</Text>
                  </View>
                ) : filteredLoans.map((loan, idx) => (
                  <View key={loan._id || idx} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: COLORS.white }]}>
                    <Text style={[styles.employeeIdText, { width: 100 }]}>{loan.employeeId}</Text>
                    <View style={{ width: 150 }}>
                      <Text style={styles.employeeNameText}>{loan.employeeName}</Text>
                      <Text style={styles.employeeSubText}>{loan.division} | {loan.location}</Text>
                    </View>
                    <Text style={[styles.amountText, { width: 120, textAlign: 'right' }]}>{formatCurrency(loan.amount)}</Text>
                    <Text style={[styles.tenureText, { width: 80, textAlign: 'right' }]}>{loan.tenureMonths} months</Text>
                    <Text style={[styles.emiText, { width: 100, textAlign: 'right' }]}>{formatCurrency(calcMonthlyDeduction(loan))}</Text>
                    <Text style={[styles.balanceText, { width: 120, textAlign: 'right', color: remainingBalance(loan) === 0 ? COLORS.green : COLORS.textPrimary }]}>
                      {formatCurrency(remainingBalance(loan))}
                    </Text>
                    
                    {/* Status */}
                    <View style={{ width: 90, alignItems: 'center' }}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(loan.status) }]}>
                        <Text style={[styles.statusText, { color: getStatusTextColor(loan.status) }]}>
                          {loan.status.charAt(0).toUpperCase() + loan.status.slice(1).replace('-', ' ')}
                        </Text>
                      </View>
                    </View>

                    {/* Payment Toggle */}
                    <View style={{ width: 90, alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => handleTogglePayment(loan)}
                        style={styles.paymentToggleButton}
                      >
                        <View style={[styles.paymentToggleTrack, { backgroundColor: loan.paymentEnabled ? COLORS.green : COLORS.gray }]}>
                          <View style={[styles.paymentToggleThumb, { left: loan.paymentEnabled ? 22 : 2 }]} />
                        </View>
                        <Text style={[styles.paymentToggleText, { color: loan.paymentEnabled ? COLORS.green : COLORS.gray }]}>
                          {loan.paymentEnabled ? 'Enabled' : 'Disabled'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Actions */}
                    <View style={{ width: 150, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => handleViewLoan(loan)} style={[styles.actionIcon, { backgroundColor: COLORS.indigoLight }]}>
                        <Icon name="visibility" size={18} color={COLORS.indigo} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEditLoan(loan)} style={[styles.actionIcon, { backgroundColor: COLORS.blueLight }]}>
                        <Icon name="edit" size={18} color={COLORS.blue} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteLoan(loan)} style={[styles.actionIcon, { backgroundColor: COLORS.redLight }]}>
                        <Icon name="delete" size={18} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {/* Footer Totals */}
                {filteredLoans.length > 0 && (
                  <View style={styles.footerTotals}>
                    <Text style={[styles.totalsText, { width: 100 }]}>Totals</Text>
                    <Text style={{ width: 150 }} />
                    <Text style={[styles.amountText, { width: 120, textAlign: 'right', fontWeight: 'bold' }]}>
                      {formatCurrency(filteredLoans.reduce((sum, l) => sum + l.amount, 0))}
                    </Text>
                    <Text style={{ width: 80 }} />
                    <Text style={{ width: 100 }} />
                    <Text style={[styles.balanceText, { width: 120, textAlign: 'right', fontWeight: 'bold', color: COLORS.green }]}>
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

      {/* Add Loan Modal - Simplified for brevity, but structure remains */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Loan</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Employee Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Employee *</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={form.employeeId}
                    onValueChange={handleEmployeeSelect}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="Select Employee" value="" color={COLORS.gray} />
                    {employees.map(emp => (
                      <Picker.Item 
                        key={emp._id || emp.employeeId} 
                        label={`${emp.employeeId} - ${emp.name}`} 
                        value={emp.employeeId} 
                      />
                    ))}
                  </Picker>
                </View>
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
                  <Text style={styles.formLabel}>Loan Amount *</Text>
                  <TextInput
                    value={form.amount}
                    onChangeText={(text) => setForm(prev => ({ ...prev, amount: text }))}
                    placeholder="Enter amount"
                    keyboardType="numeric"
                    style={styles.formInput}
                  />
                </View>
                <View style={[styles.col, { marginLeft: 8 }]}>
                  <Text style={styles.formLabel}>Tenure (Months) *</Text>
                  <TextInput
                    value={form.tenureMonths}
                    onChangeText={(text) => setForm(prev => ({ ...prev, tenureMonths: text }))}
                    placeholder="Enter months"
                    keyboardType="numeric"
                    style={styles.formInput}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Start Date</Text>
                <TextInput
                  value={form.startDate}
                  onChangeText={(text) => setForm(prev => ({ ...prev, startDate: text }))}
                  placeholder="YYYY-MM-DD"
                  style={styles.formInput}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAddLoan}
                disabled={loading}
                style={[styles.submitButton, loading && { backgroundColor: COLORS.gray }]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>Add Loan</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Loan Summary • Payroll • "
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
    overflow: 'hidden',
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
    marginLeft: 8,
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
  tenureText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  emiText: {
    fontSize: 13,
    color: COLORS.blue,
    fontWeight: '500',
  },
  balanceText: {
    fontSize: 13,
    fontWeight: '600',
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
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  col: {
    flex: 1,
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
  cancelButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default LoanSummaryScreen;