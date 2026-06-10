// screens/HolidaysAllowanceScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { employeeAPI, holidayAllowanceAPI, payrollAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';

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
  blue: '#3498db',
  green: '#27ae60',
  red: '#e74c3c',
  purple: '#9b59b6',
  orange: '#f39c12',
  darkBlue: '#1e2050',
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

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  employeename?: string;
  location: string;
  bankAccount?: string;
  bankDetails?: {
    accountNumber?: string;
  };
  totalEarnings?: number;
  ctc?: number;
  grossSalary?: number;
  netSalary?: number;
}

interface Payroll {
  employeeId: string;
  totalEarnings?: number;
  netSalary?: number;
  ctc?: number;
  location?: string;
  accountNumber?: string;
}

interface AllowanceRow {
  id: string;
  sNo: number;
  employeeId: string;
  employeeName: string;
  location: string;
  accountNumber: string;
  grossSalary: number;
  holidayDays: number;
  perDayAmount: number;
  holidayTotal: number;
  shiftAllottedAmount: number;
  shiftDays: number;
  shiftTotal: number;
  totalAmount: number;
  status?: string;
}

interface SavedAllowance {
  employeeId: string;
  holidayDays?: number;
  perDayAmount?: number;
  shiftAllottedAmount?: number;
  shiftDays?: number;
  grossSalary?: number;
}

const HolidaysAllowanceScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tableData, setTableData] = useState<AllowanceRow[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  
  // Filter states
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  // Popup state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMessage, setPopupMessage] = useState('');
  const [popupIsError, setPopupIsError] = useState(false);

  // Constants
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  // Calculate per day amount (capped at 1500)
  const calculatePerDayAmount = (grossSalary: number, year: number, month: number): number => {
    if (!grossSalary) return 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    if (!daysInMonth) return 0;
    const amount = Math.round(grossSalary / daysInMonth);
    return amount > 1500 ? 1500 : amount;
  };

  // Load initial data
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Reload when filters change
  useEffect(() => {
    if (selectedLocation && selectedMonth && selectedYear) {
      loadData();
    }
  }, [selectedLocation, selectedMonth, selectedYear]);

  const fetchInitialData = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      const emps = response.data || [];
      const locs = [...new Set(emps.map((e: any) => e.location).filter(Boolean))];
      setLocations(locs);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [empResponse, payrollResponse] = await Promise.all([
        employeeAPI.getAllEmployees(),
        payrollAPI.list()
      ]);

      let filteredEmps = empResponse.data || [];
      const payrolls = Array.isArray(payrollResponse.data) ? payrollResponse.data : [];

      // Create payroll map
      const payrollMap = new Map<string, Payroll>();
      payrolls.forEach((p: any) => {
        const empId = p.employeeId;
        if (empId && !payrollMap.has(empId)) {
          payrollMap.set(empId, p);
        }
      });

      // Filter by location
      if (selectedLocation) {
        filteredEmps = filteredEmps.filter((e: any) => e.location === selectedLocation);
      }

      // Fetch saved holiday allowances
      let savedRecords: SavedAllowance[] = [];
      try {
        const params: any = {
          month: selectedMonth,
          year: selectedYear,
        };
        if (selectedLocation) {
          params.location = selectedLocation;
        }
        const savedRes = await holidayAllowanceAPI.getSummary(params);
        if (savedRes && savedRes.data && savedRes.data.success) {
          savedRecords = savedRes.data.data || [];
        } else if (savedRes && savedRes.data && Array.isArray(savedRes.data)) {
          savedRecords = savedRes.data;
        }
      } catch (err) {
        console.error('Error fetching saved holiday allowances:', err);
        // Continue without saved data - use defaults
      }

      // Create saved map
      const savedMap = new Map<string, SavedAllowance>();
      savedRecords.forEach((item: any) => {
        if (item && item.employeeId) {
          savedMap.set(item.employeeId, item);
        }
      });

      // Merge data
      const merged: AllowanceRow[] = filteredEmps.map((emp: any, index: number) => {
        const payroll = payrollMap.get(emp.employeeId);
        const grossFromPayroll = payroll?.totalEarnings || payroll?.netSalary || payroll?.ctc || 0;
        const gross = grossFromPayroll || emp.totalEarnings || emp.netSalary || emp.ctc || 0;
        const saved = savedMap.get(emp.employeeId);
        
        let defaultPerDay = calculatePerDayAmount(gross, selectedYear, selectedMonth);
        let perDayAmount = saved?.perDayAmount ?? defaultPerDay;
        if (perDayAmount > 1500) perDayAmount = 1500;

        const holidayDays = saved?.holidayDays ?? 0;
        const holidayTotal = Math.round(holidayDays * perDayAmount);

        const shiftAllottedAmount = saved?.shiftAllottedAmount ?? 50;
        const shiftDays = saved?.shiftDays ?? 0;
        const shiftTotal = Math.round(shiftAllottedAmount * shiftDays);

        const totalAmount = holidayTotal + shiftTotal;

        return {
          id: emp._id,
          sNo: index + 1,
          employeeId: emp.employeeId,
          employeeName: emp.name || emp.employeename || '',
          location: payroll?.location || emp.location || '-',
          accountNumber: payroll?.accountNumber || emp.bankAccount || emp.bankDetails?.accountNumber || '-',
          grossSalary: saved?.grossSalary ?? gross,
          holidayDays,
          perDayAmount,
          holidayTotal,
          shiftAllottedAmount,
          shiftDays,
          shiftTotal,
          totalAmount,
          status: saved ? 'Saved' : 'Draft'
        };
      });

      setTableData(merged);
      
      // Show success message if data loaded
      if (merged.length > 0) {
        setPopupMessage(`Loaded ${merged.length} employees successfully`);
        setPopupIsError(false);
        setPopupVisible(true);
        setTimeout(() => setPopupVisible(false), 2000);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to load data';
      setPopupMessage(msg);
      setPopupIsError(true);
      setPopupVisible(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    const newData = [...tableData];
    const row = { ...newData[index] };
    const numValue = parseFloat(value) || 0;

    const recalcTotals = () => {
      row.holidayTotal = Math.round((row.holidayDays || 0) * (row.perDayAmount || 0));
      row.shiftTotal = Math.round((row.shiftAllottedAmount || 0) * (row.shiftDays || 0));
      row.totalAmount = row.holidayTotal + row.shiftTotal;
    };

    switch (field) {
      case 'holidayDays':
        row.holidayDays = numValue;
        recalcTotals();
        break;
      case 'perDayAmount':
        let amount = numValue;
        if (amount > 1500) amount = 1500;
        row.perDayAmount = amount;
        recalcTotals();
        break;
      case 'shiftAllottedAmount':
        row.shiftAllottedAmount = numValue;
        recalcTotals();
        break;
      case 'shiftDays':
        row.shiftDays = numValue;
        recalcTotals();
        break;
    }

    newData[index] = row;
    setTableData(newData);
  };

  const saveData = async () => {
    if (tableData.length === 0) {
      setPopupMessage('No data to save');
      setPopupIsError(true);
      setPopupVisible(true);
      return;
    }

    try {
      setLoading(true);
      const payload = {
        month: selectedMonth,
        year: selectedYear,
        allowances: tableData.map(row => ({
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          location: row.location,
          accountNumber: row.accountNumber,
          grossSalary: row.grossSalary,
          holidayDays: row.holidayDays,
          perDayAmount: row.perDayAmount,
          holidayTotal: row.holidayTotal,
          shiftAllottedAmount: row.shiftAllottedAmount,
          shiftDays: row.shiftDays,
          shiftTotal: row.shiftTotal,
          totalAmount: row.totalAmount
        }))
      };

      const res = await holidayAllowanceAPI.saveBulk(payload);
      const message = res?.data?.message || 'Holiday allowances saved successfully';
      setPopupMessage(message);
      setPopupIsError(false);
      setPopupVisible(true);
      
      // Reload data to update status
      setTimeout(() => {
        loadData();
      }, 1000);
    } catch (error: any) {
      console.error('Error saving data:', error);
      setPopupMessage(error.response?.data?.message || 'Failed to save data');
      setPopupIsError(true);
      setPopupVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleViewSummary = () => {
    navigation.navigate('HolidaysAllowanceSummary' as any, {
      location: selectedLocation,
      month: selectedMonth,
      year: selectedYear
    });
  };

  const formatNumber = (num: number): string => {
    return num?.toLocaleString() || '0';
  };

  // Render Popup Modal
  const renderPopup = () => (
    <Modal
      visible={popupVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setPopupVisible(false)}
    >
      <TouchableOpacity 
        style={styles.popupOverlay} 
        activeOpacity={1} 
        onPress={() => setPopupVisible(false)}
      >
        <View style={styles.popupContent}>
          <View style={[
            styles.popupIcon,
            popupIsError ? styles.popupIconError : styles.popupIconSuccess
          ]}>
            <Icon 
              name={popupIsError ? "close" : "check"} 
              size={32} 
              color={popupIsError ? COLORS.error : COLORS.success} 
            />
          </View>
          <Text style={styles.popupTitle}>
            {popupIsError ? 'Error' : 'Success'}
          </Text>
          <Text style={styles.popupMessage}>{popupMessage}</Text>
          <TouchableOpacity
            onPress={() => setPopupVisible(false)}
            style={[styles.popupButton, popupIsError ? styles.popupButtonError : styles.popupButtonSuccess]}
          >
            <Text style={styles.popupButtonText}>Okay</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Calculate summary totals
  const totalEmployees = tableData.length;
  const totalHolidayAmount = tableData.reduce((sum, row) => sum + (row.holidayTotal || 0), 0);
  const totalShiftAmount = tableData.reduce((sum, row) => sum + (row.shiftTotal || 0), 0);
  const totalAmount = tableData.reduce((sum, row) => sum + (row.totalAmount || 0), 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Holiday Allowance" 
        showBack={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Controls Section */}
        <View style={styles.controlsCard}>
          {/* Location Picker */}
          <View style={styles.pickerContainer}>
            <View style={styles.pickerIcon}>
              <Icon name="location-on" size={20} color={COLORS.darkBlue} />
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedLocation}
                onValueChange={(value: string) => setSelectedLocation(value)}
                style={styles.picker}
                dropdownIconColor={COLORS.primary}
              >
                <Picker.Item label="Select Location" value="" color={COLORS.gray} style={{ backgroundColor: COLORS.white }} />
                {locations.map(loc => (
                  <Picker.Item 
                    key={loc} 
                    label={loc} 
                    value={loc} 
                    color={COLORS.black}
                    style={{ backgroundColor: COLORS.white }}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Month Picker */}
          <View style={styles.pickerContainer}>
            <View style={styles.pickerIcon}>
              <Icon name="calendar-today" size={20} color={COLORS.darkBlue} />
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(value: number) => setSelectedMonth(value)}
                style={styles.picker}
                dropdownIconColor={COLORS.primary}
              >
                {months.map(m => (
                  <Picker.Item 
                    key={m.value} 
                    label={m.label} 
                    value={m.value} 
                    color={COLORS.black}
                    style={{ backgroundColor: COLORS.white }}
                  />
                ))}
              </Picker>
            </View>
          </View>

          {/* Year Selector */}
          <View style={styles.yearContainer}>
            <TouchableOpacity
              onPress={() => setSelectedYear(selectedYear - 1)}
              style={styles.yearButton}
            >
              <Icon name="chevron-left" size={20} color={COLORS.darkBlue} />
            </TouchableOpacity>
            <Text style={styles.yearText}>{selectedYear}</Text>
            <TouchableOpacity
              onPress={() => setSelectedYear(selectedYear + 1)}
              style={styles.yearButton}
            >
              <Icon name="chevron-right" size={20} color={COLORS.darkBlue} />
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={loadData}
              disabled={loading}
              style={[styles.actionButton, styles.loadButton]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Icon name="refresh" size={16} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Load Employees</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={saveData}
              disabled={loading || tableData.length === 0}
              style={[styles.actionButton, styles.saveButton, (loading || tableData.length === 0) && styles.disabledButton]}
            >
              <Icon name="save" size={16} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Save Data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleViewSummary}
              style={[styles.actionButton, styles.summaryButton]}
            >
              <Icon name="assessment" size={16} color={COLORS.white} />
              <Text style={styles.actionButtonText}>View Summary</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        {tableData.length > 0 && (
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Icon name="people" size={20} color={COLORS.blue} />
              <Text style={styles.summaryCardValue}>{totalEmployees}</Text>
              <Text style={styles.summaryCardLabel}>Employees</Text>
            </View>
            <View style={styles.summaryCard}>
              <Icon name="work" size={20} color={COLORS.orange} />
              <Text style={styles.summaryCardValue}>₹{formatNumber(totalHolidayAmount)}</Text>
              <Text style={styles.summaryCardLabel}>Holiday Total</Text>
            </View>
            <View style={styles.summaryCard}>
              <Icon name="schedule" size={20} color={COLORS.purple} />
              <Text style={styles.summaryCardValue}>₹{formatNumber(totalShiftAmount)}</Text>
              <Text style={styles.summaryCardLabel}>Shift Total</Text>
            </View>
            <View style={styles.summaryCard}>
              <Icon name="currency-rupee" size={20} color={COLORS.green} />
              <Text style={styles.summaryCardValue}>₹{formatNumber(totalAmount)}</Text>
              <Text style={styles.summaryCardLabel}>Total Amount</Text>
            </View>
          </View>
        )}

        {/* Table Section */}
        <View style={styles.tableContainer}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>Loading employees...</Text>
            </View>
          ) : tableData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="people-outline" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyTitle}>No Data</Text>
              <Text style={styles.emptyText}>
                Select location and click "Load Employees" to load data
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, { width: 50 }]}>S.No</Text>
                  <Text style={[styles.headerCell, { width: 100 }]}>Emp ID</Text>
                  <Text style={[styles.headerCell, { width: 150 }]}>Name</Text>
                  <Text style={[styles.headerCell, { width: 100 }]}>Location</Text>
                  <Text style={[styles.headerCell, { width: 120 }]}>Account No</Text>
                  <Text style={[styles.headerCell, { width: 100, textAlign: 'right' }]}>Gross Salary</Text>
                  
                  {/* Holiday Working Header */}
                  <Text style={[styles.headerCell, { width: 80, textAlign: 'center', backgroundColor: COLORS.darkBlue }]}>Holiday Days</Text>
                  <Text style={[styles.headerCell, { width: 100, textAlign: 'center', backgroundColor: COLORS.darkBlue }]}>Per Day Amt</Text>
                  <Text style={[styles.headerCell, { width: 100, textAlign: 'center', backgroundColor: COLORS.darkBlue }]}>Holiday Total</Text>
                  
                  {/* Shift Allowance Header */}
                  <Text style={[styles.headerCell, { width: 100, textAlign: 'center', backgroundColor: COLORS.darkBlue }]}>Shift Amt</Text>
                  <Text style={[styles.headerCell, { width: 80, textAlign: 'center', backgroundColor: COLORS.darkBlue }]}>Shift Days</Text>
                  <Text style={[styles.headerCell, { width: 100, textAlign: 'center', backgroundColor: COLORS.darkBlue }]}>Shift Total</Text>
                  
                  <Text style={[styles.headerCell, { width: 100, textAlign: 'right' }]}>Total Amt</Text>
                </View>

                {/* Table Body */}
                {tableData.map((row, index) => (
                  <View key={row.id} style={[styles.tableRow, index % 2 === 0 && styles.rowEven]}>
                    <Text style={[styles.cell, { width: 50, textAlign: 'center' }]}>{row.sNo}</Text>
                    <Text style={[styles.cell, { width: 100, fontWeight: '500' }]} numberOfLines={1}>{row.employeeId}</Text>
                    <Text style={[styles.cell, { width: 150 }]} numberOfLines={1}>{row.employeeName}</Text>
                    <Text style={[styles.cell, { width: 100 }]} numberOfLines={1}>{row.location}</Text>
                    <Text style={[styles.cell, { width: 120, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]} numberOfLines={1}>
                      {row.accountNumber}
                    </Text>
                    <Text style={[styles.cell, { width: 100, textAlign: 'right' }]}>₹{formatNumber(row.grossSalary)}</Text>
                    
                    {/* Holiday Working Inputs */}
                    <View style={[styles.cell, { width: 80 }]}>
                      <TextInput
                        value={row.holidayDays.toString()}
                        onChangeText={(value) => handleInputChange(index, 'holidayDays', value)}
                        keyboardType="numeric"
                        style={styles.tableInput}
                      />
                    </View>
                    <View style={[styles.cell, { width: 100 }]}>
                      <TextInput
                        value={row.perDayAmount.toString()}
                        onChangeText={(value) => handleInputChange(index, 'perDayAmount', value)}
                        keyboardType="numeric"
                        style={styles.tableInput}
                      />
                    </View>
                    <Text style={[styles.cell, { width: 100, textAlign: 'right', backgroundColor: COLORS.filterBg }]}>
                      ₹{formatNumber(row.holidayTotal)}
                    </Text>
                    
                    {/* Shift Allowance Inputs */}
                    <View style={[styles.cell, { width: 100 }]}>
                      <TextInput
                        value={row.shiftAllottedAmount.toString()}
                        onChangeText={(value) => handleInputChange(index, 'shiftAllottedAmount', value)}
                        keyboardType="numeric"
                        style={styles.tableInput}
                      />
                    </View>
                    <View style={[styles.cell, { width: 80 }]}>
                      <TextInput
                        value={row.shiftDays.toString()}
                        onChangeText={(value) => handleInputChange(index, 'shiftDays', value)}
                        keyboardType="numeric"
                        style={styles.tableInput}
                      />
                    </View>
                    <Text style={[styles.cell, { width: 100, textAlign: 'right', backgroundColor: COLORS.filterBg }]}>
                      ₹{formatNumber(row.shiftTotal)}
                    </Text>
                    
                    <Text style={[styles.cell, { width: 100, textAlign: 'right', fontWeight: 'bold', color: COLORS.primary }]}>
                      ₹{formatNumber(row.totalAmount)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Holiday Allowance • Employee Benefits • "
      />

      {/* Popup Modal */}
      {renderPopup()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  controlsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  pickerIcon: {
    paddingHorizontal: 12,
  },
  pickerWrapper: {
    flex: 1,
    marginLeft: -8,
    marginRight: -8,
  },
  picker: {
    height: 48,
    color: COLORS.textPrimary,
  },
  yearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  yearButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
  },
  yearText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginHorizontal: 20,
    minWidth: 60,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  loadButton: {
    backgroundColor: COLORS.primary,
  },
  saveButton: {
    backgroundColor: COLORS.green,
  },
  summaryButton: {
    backgroundColor: COLORS.purple,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '500',
  },
  summaryCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  summaryCardLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tableContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  loaderContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerCell: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowEven: {
    backgroundColor: '#F9FAFB',
  },
  cell: {
    fontSize: 12,
    color: COLORS.textPrimary,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  tableInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    textAlign: 'center',
    backgroundColor: COLORS.white,
    minHeight: 36,
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
  },
  popupIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  popupIconSuccess: {
    backgroundColor: '#E8F5E9',
  },
  popupIconError: {
    backgroundColor: '#FFEBEE',
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  popupMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  popupButton: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  popupButtonSuccess: {
    backgroundColor: COLORS.primary,
  },
  popupButtonError: {
    backgroundColor: COLORS.error,
  },
  popupButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HolidaysAllowanceScreen;