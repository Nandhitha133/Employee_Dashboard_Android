import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { holidayAllowanceAPI, employeeAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#f8fafc',
  secondary: '#4F1A6F',
  white: '#FFFFFF',
  gray: '#64748b',
  lightGray: '#e2e8f0',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  darkBlue: '#ffffff',
  cardBg: '#ffffff',
  textMuted: '#64748b',
};

interface SummaryMetrics {
  totalEmployees: number;
  totalHolidayWorkingAmount: number;
  totalShiftAllowanceAmount: number;
  totalFoodAllowanceAmount: number;
  grandTotalAmount: number;
}

export default function HolidaysAllowanceSummaryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = (route.params as any) || {};

  const [selectedLocation, setSelectedLocation] = useState<string>(routeParams.location || 'Hosur');
  const [selectedMonth, setSelectedMonth] = useState<number>(routeParams.month || new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(routeParams.year || new Date().getFullYear());

  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [records, setRecords] = useState<any[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics>({
    totalEmployees: 0,
    totalHolidayWorkingAmount: 0,
    totalShiftAllowanceAmount: 0,
    totalFoodAllowanceAmount: 0,
    grandTotalAmount: 0,
  });

  const months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 },
  ];

  const years = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1,
  ];

  // Fetch locations
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await employeeAPI.getAllEmployees();
        const emps = res.data || [];
        const uniqueLocs = [...new Set(emps.map((e: any) => e.location).filter(Boolean))] as string[];
        setLocations(uniqueLocs);
      } catch (err) {
        console.error('Error fetching locations:', err);
      }
    };
    fetchLocations();
  }, []);

  // Fetch summary and list data
  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        location: selectedLocation,
        month: selectedMonth,
        year: selectedYear,
      };

      // 1. Fetch detailed records
      const recordsRes = await holidayAllowanceAPI.list(params);
      let recordsList = [];
      if (recordsRes?.data?.success) {
        recordsList = recordsRes.data.data || [];
      } else if (Array.isArray(recordsRes?.data)) {
        recordsList = recordsRes.data;
      }
      setRecords(recordsList);

      // 2. Fetch summary metrics
      const summaryRes = await holidayAllowanceAPI.getSummary(params);
      if (summaryRes?.data?.success && summaryRes.data.summary) {
        setSummary(summaryRes.data.summary);
      } else {
        // Calculate manually if endpoint returns empty/null
        let totalEmp = recordsList.length;
        let holidayAmt = 0;
        let shiftAmt = 0;
        let foodAmt = 0;

        recordsList.forEach((r: any) => {
          holidayAmt += parseFloat(r.holidayTotal || r.holidayAmount) || 0;
          shiftAmt += parseFloat(r.shiftTotal || r.shiftAmount) || 0;
          foodAmt += parseFloat(r.foodTotal || r.foodAmount) || 0;
        });

        setSummary({
          totalEmployees: totalEmp,
          totalHolidayWorkingAmount: holidayAmt,
          totalShiftAllowanceAmount: shiftAmt,
          totalFoodAllowanceAmount: foodAmt,
          grandTotalAmount: holidayAmt + shiftAmt + foodAmt,
        });
      }
    } catch (err: any) {
      console.error('Error fetching allowance summary:', err);
      Alert.alert('Error', 'Failed to fetch allowance summary records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedLocation, selectedMonth, selectedYear]);

  // Export to CSV helper
  const handleExportCSV = async () => {
    if (records.length === 0) {
      Alert.alert('Info', 'No records found to export.');
      return;
    }

    try {
      let csvContent = 'S.No,Employee ID,Employee Name,Location,Holiday Days,Holiday Amount,Shift Days,Shift Amount,Total Amount\n';
      records.forEach((row, index) => {
        csvContent += `${index + 1},"${row.employeeId}","${row.employeeName}","${row.location || ''}",${row.holidayDays || 0},${row.holidayTotal || 0},${row.shiftDays || 0},${row.shiftTotal || 0},${row.totalAmount || 0}\n`;
      });

      await Share.share({
        message: csvContent,
        title: 'Holiday Allowance Summary Report',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export CSV report.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CommonHeader title="Allowance Master Summary" backgroundColor="#4F1A6F" />

      {/* FILTER BAR */}
      <View style={styles.filterCard}>
        <View style={styles.pickerRow}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Location</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedLocation}
                onValueChange={(itemValue) => setSelectedLocation(itemValue)}
                style={styles.picker}
                dropdownIconColor="#4F1A6F"
              >
                <Picker.Item label="Select Location" value="" />
                {locations.map((loc) => (
                  <Picker.Item key={loc} label={loc} value={loc} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Month</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedMonth}
                onValueChange={(itemValue) => setSelectedMonth(itemValue)}
                style={styles.picker}
                dropdownIconColor="#4F1A6F"
              >
                {months.map((m) => (
                  <Picker.Item key={m.value} label={m.label} value={m.value} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.pickerRow}>
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Year</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedYear}
                onValueChange={(itemValue) => setSelectedYear(itemValue)}
                style={styles.picker}
                dropdownIconColor="#4F1A6F"
              >
                {years.map((y) => (
                  <Picker.Item key={y} label={y.toString()} value={y} />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity style={styles.exportButton} onPress={handleExportCSV}>
            <Icon name="file-download" size={20} color="#FFF" />
            <Text style={styles.exportText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* STAT CARDS */}
      <ScrollView style={styles.content}>
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Icon name="people" size={24} color={COLORS.info} />
            <Text style={styles.statValue}>{summary.totalEmployees}</Text>
            <Text style={styles.statLabel}>Total Employees</Text>
          </View>

          <View style={styles.statCard}>
            <Icon name="beach-access" size={24} color={COLORS.success} />
            <Text style={styles.statValue}>₹{(summary.totalHolidayWorkingAmount || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Holiday Amt</Text>
          </View>
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Icon name="work" size={24} color={COLORS.warning} />
            <Text style={styles.statValue}>₹{(summary.totalShiftAllowanceAmount || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Shift Amt</Text>
          </View>

          <View style={[styles.statCard, styles.grandTotalCard]}>
            <Icon name="account-balance-wallet" size={24} color="#FFF" />
            <Text style={styles.grandTotalValue}>₹{(summary.grandTotalAmount || 0).toLocaleString()}</Text>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
          </View>
        </View>

        {/* DETAILS TABLE */}
        <Text style={styles.sectionTitle}>Employee Breakdown</Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.info} style={{ marginTop: 20 }} />
        ) : records.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="assignment" size={48} color={COLORS.gray} />
            <Text style={styles.emptyText}>No allowance records found for this selection.</Text>
          </View>
        ) : (
          records.map((item, index) => (
            <View key={item.id || index} style={styles.rowCard}>
              <View style={styles.rowHeader}>
                <View style={styles.snoBadge}>
                  <Text style={styles.snoText}>{index + 1}</Text>
                </View>
                <View style={styles.empInfo}>
                  <Text style={styles.empName}>{item.employeeName || 'N/A'}</Text>
                  <Text style={styles.empId}>{item.employeeId || 'N/A'}</Text>
                </View>
                <View style={styles.totalBadge}>
                  <Text style={styles.totalValueText}>₹{((item.totalAmount || (item.holidayTotal || 0) + (item.shiftTotal || 0)) || 0).toLocaleString()}</Text>
                </View>
              </View>

              <View style={styles.rowDetails}>
                <View style={styles.detailCol}>
                  <Text style={styles.detailTitle}>Holiday Details</Text>
                  <Text style={styles.detailVal}>{item.holidayDays || 0} Days @ ₹{item.perDayAmount || 0}</Text>
                  <Text style={styles.detailSub}>Total: ₹{item.holidayTotal || 0}</Text>
                </View>
                <View style={styles.detailCol}>
                  <Text style={styles.detailTitle}>Shift Details</Text>
                  <Text style={styles.detailVal}>{item.shiftDays || 0} Days @ ₹{item.shiftAllottedAmount || 50}</Text>
                  <Text style={styles.detailSub}>Total: ₹{item.shiftTotal || 0}</Text>
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <CommonFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  filterCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pickerContainer: {
    width: '48%',
  },
  pickerLabel: {
    color: '#64748b',
    fontSize: 12,
    marginBottom: 4,
  },
  pickerWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
  },
  picker: {
    color: '#0f172a',
    height: 44,
  },
  exportButton: {
    backgroundColor: COLORS.secondary,
    width: '48%',
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  exportText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  content: {
    paddingHorizontal: 12,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  statCard: {
    backgroundColor: '#ffffff',
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  grandTotalCard: {
    backgroundColor: COLORS.secondary,
  },
  statValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  grandTotalValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  grandTotalLabel: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  sectionTitle: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: 10,
    textAlign: 'center',
  },
  rowCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 8,
  },
  snoBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  snoText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: 'bold',
  },
  empInfo: {
    flex: 1,
  },
  empName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: 'bold',
  },
  empId: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  totalBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  totalValueText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  rowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  detailCol: {
    width: '48%',
  },
  detailTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailVal: {
    color: '#0f172a',
    fontSize: 12,
  },
  detailSub: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
