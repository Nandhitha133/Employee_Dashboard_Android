// screens/SalarySlips/SalarySlipsScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { monthlyPayrollAPI, employeeAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommonFooter from '../../components/CommonFooter';
import ViewShot from 'react-native-view-shot';
import Share from 'react-native-share';
import RNFS from 'react-native-fs';

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
  pink: '#ec4899',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC',
  selectedBg: '#E6F0FF'
};

interface PayslipData {
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  panNumber: string;
  uanNumber: string;
  month: string;
  year: number;
  financialYear: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  totalEarnings: number;
  pfDeduction: number;
  professionalTax: number;
  tds: number;
  esi: number;
  lopDeduction: number;
  loanDeduction: number;
  gratuity: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  workingDays: number;
  paidDays: number;
  leaveDays: number;
  paidDate: string;
  monthYear: string;
}

interface EmployeeProfile {
  employeeId?: string;
  name?: string;
  pan?: string;
  uan?: string;
  designation?: string;
  department?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  [key: string]: any;
}

interface PayrollRecord {
  employeeId: string;
  employeeName: string;
  designation?: string;
  department?: string;
  basicDA?: number;
  hra?: number;
  specialAllowance?: number;
  totalEarnings?: number;
  pf?: number;
  professionalTax?: number;
  tax?: number;
  esi?: number;
  lop?: number;
  loanDeduction?: number;
  gratuity?: number;
  totalDeductions?: number;
  netSalary?: number;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  paymentDate?: string;
  lopDays?: number;
  salaryMonth?: string;
  [key: string]: any;
}

const SalarySlipsScreen = () => {
  const [financialYear, setFinancialYear] = useState('');
  const [month, setMonth] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeProfile, setEmployeeProfile] = useState<EmployeeProfile | null>(null);
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [showPayslip, setShowPayslip] = useState(false);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableMonths, setAvailableMonths] = useState<{name: string, value: string, available: boolean}[]>([]);
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  
  const viewShotRef = useRef<ViewShot>(null);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (financialYear && employeeId) {
      loadAvailablePayrolls();
    }
  }, [financialYear, employeeId]);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      
      if (!user?.id) {
        // Navigate to login
        return;
      }
      
      try {
        const me = await employeeAPI.getMyProfile();
        const profile = me?.data as EmployeeProfile;
        const empId = profile?.employeeId || user.employeeId || user.username || user.id;
        setEmployeeId(empId);
        setEmployeeProfile(profile);
        
        // Set PAN and UAN from profile
        if (profile) {
          // These will be used in payslip
        }
      } catch (err) {
        const fallbackId = user.employeeId || user.username || user.id;
        setEmployeeId(fallbackId);
      }
      
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = -2; i <= 1; i++) {
        const year = currentYear + i;
        years.push(`${year}-${year + 1}`);
      }
      setAvailableYears(years);
      
      // Set default financial year to current
      const currentMonth = new Date().getMonth();
      const currentYearNum = new Date().getFullYear();
      const defaultYear = currentMonth >= 3 ? currentYearNum : currentYearNum - 1;
      setFinancialYear(`${defaultYear}-${defaultYear + 1}`);
      
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadAvailablePayrolls = async () => {
    try {
      setIsLoading(true);
      
      // Parse financial year
      const yearStart = parseInt(financialYear.split('-')[0]);
      const yearEnd = parseInt(financialYear.split('-')[1]);
      
      // Generate all months in the financial year (April to March)
      const fyMonths = [
        { name: 'April', num: 4, year: yearStart },
        { name: 'May', num: 5, year: yearStart },
        { name: 'June', num: 6, year: yearStart },
        { name: 'July', num: 7, year: yearStart },
        { name: 'August', num: 8, year: yearStart },
        { name: 'September', num: 9, year: yearStart },
        { name: 'October', num: 10, year: yearStart },
        { name: 'November', num: 11, year: yearStart },
        { name: 'December', num: 12, year: yearStart },
        { name: 'January', num: 1, year: yearEnd },
        { name: 'February', num: 2, year: yearEnd },
        { name: 'March', num: 3, year: yearEnd },
      ];

      // Fetch payroll records for the employee
      let payrollRecords: PayrollRecord[] = [];
      try {
        const response = await monthlyPayrollAPI.getEmployeeHistory(employeeId);
        payrollRecords = Array.isArray(response?.data) ? response.data : [];
      } catch (err) {
        console.log('No payroll history found');
      }

      // Check availability for each month
      const monthsWithAvailability = fyMonths.map(fyMonth => {
        const formattedMonth = `${fyMonth.year}-${String(fyMonth.num).padStart(2, '0')}`;
        const hasRecord = payrollRecords.some(r => r.salaryMonth === formattedMonth);
        
        // Check if month is in the future
        const monthDate = new Date(fyMonth.year, fyMonth.num - 1, 1);
        const today = new Date();
        const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const isFuture = monthDate > currentMonthStart;
        
        return {
          name: fyMonth.name,
          value: fyMonth.name,
          available: hasRecord && !isFuture
        };
      });

      setAvailableMonths(monthsWithAvailability);
      
    } catch (error) {
      console.error('Error loading payrolls:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPayslip = async (selectedMonth: string) => {
    if (!financialYear || !selectedMonth) return;

    // Calculate the year and month number
    const yearStart = parseInt(financialYear.split('-')[0]);
    const yearEnd = parseInt(financialYear.split('-')[1]);
    const monthMap: Record<string, number> = {
      January: 1, February: 2, March: 3, April: 4,
      May: 5, June: 6, July: 7, August: 8,
      September: 9, October: 10, November: 11, December: 12
    };
    
    const selectedMonthNum = monthMap[selectedMonth];
    const selectedYear = selectedMonthNum >= 4 ? yearStart : yearStart + 1;
    const selectedDate = new Date(selectedYear, selectedMonthNum - 1, 1);
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Check if selected month is in the future
    if (selectedDate > currentMonthStart) {
      Alert.alert('Info', 'Payslip for this month is not available yet.');
      return;
    }

    const formattedMonth = `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}`;
    
    setIsLoading(true);
    
    try {
      // Try to fetch from API first
      const response = await monthlyPayrollAPI.list({ month: formattedMonth });
      const records = Array.isArray(response?.data) ? response.data : [];
      const rec = records.find((r: PayrollRecord) => String(r.employeeId) === String(employeeId));
      
      if (rec) {
        // Calculate actual days in the month
        const daysInMonth = new Date(selectedYear, selectedMonthNum, 0).getDate();
        const workingDays = daysInMonth;
        
        const lopDays = Number(rec.lopDays || 0);
        const paidDays = Math.max(0, workingDays - lopDays);
        const paidDate = rec.paymentDate || `${selectedYear}-${String(selectedMonthNum).padStart(2, '0')}-28`;
        
        const mapped: PayslipData = {
          employeeId: rec.employeeId,
          employeeName: rec.employeeName || employeeProfile?.name || 'N/A',
          designation: rec.designation || employeeProfile?.designation || '',
          department: rec.department || employeeProfile?.department || '',
          panNumber: employeeProfile?.pan || 'N/A',
          uanNumber: employeeProfile?.uan || 'N/A',
          month: selectedMonth,
          year: selectedYear,
          financialYear,
          basicSalary: Number(rec.basicDA || 0),
          hra: Number(rec.hra || 0),
          specialAllowance: Number(rec.specialAllowance || 0),
          totalEarnings: Number(rec.totalEarnings || 0),
          pfDeduction: Number(rec.pf || 0),
          professionalTax: Number(rec.professionalTax || 0),
          tds: Number(rec.tax || 0),
          esi: Number(rec.esi || 0),
          lopDeduction: Number(rec.lop || 0),
          loanDeduction: Number(rec.loanDeduction || 0),
          gratuity: Number(rec.gratuity || 0),
          otherDeductions: 0,
          totalDeductions: Number(rec.totalDeductions || 0),
          netSalary: Number(rec.netSalary || 0),
          bankName: rec.bankName || employeeProfile?.bankName || '',
          accountNumber: rec.accountNumber || employeeProfile?.accountNumber || '',
          ifscCode: rec.ifscCode || employeeProfile?.ifscCode || '',
          workingDays,
          paidDays,
          leaveDays: lopDays,
          paidDate,
          monthYear: formattedMonth
        };
        
        setPayslipData(mapped);
        setShowPayslip(true);
      } else {
        Alert.alert('Info', 'Payslip not found for the selected period');
      }
    } catch (error) {
      console.error('Error fetching payslip:', error);
      Alert.alert('Error', 'Failed to load payslip. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonthChange = (selectedMonth: string) => {
    setMonth(selectedMonth);
    if (financialYear && selectedMonth) {
      fetchPayslip(selectedMonth);
    }
  };

  const handleBackToSelection = () => {
    setShowPayslip(false);
    setPayslipData(null);
    setMonth('');
  };

  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    
    const convert = (n: number): string => {
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100);
      if (n < 100000) {
        const thousands = Math.floor(n / 1000);
        const remainder = n % 1000;
        return convert(thousands) + ' Thousand' + (remainder !== 0 ? ' ' + convert(remainder) : '');
      }
      if (n < 10000000) {
        const lakhs = Math.floor(n / 100000);
        const remainder = n % 100000;
        return convert(lakhs) + ' Lakh' + (remainder !== 0 ? ' ' + convert(remainder) : '');
      }
      return 'Amount too large';
    };
    
    return convert(num) + ' Rupees Only';
  };

  const handleDownloadPDF = async () => {
    if (!payslipData || !viewShotRef.current) return;
    
    setShowPDFOptions(false);
    
    try {
      if (viewShotRef.current && typeof viewShotRef.current.capture === 'function') {
        const uri = await viewShotRef.current.capture();
        if (!uri) return;
        
        const fileName = `payslip_${employeeId}_${payslipData.monthYear}.png`;
        const filePath = Platform.OS === 'android'
          ? `${RNFS.CachesDirectoryPath}/${fileName}`
          : `${RNFS.DocumentDirectoryPath}/${fileName}`;
        
        await RNFS.copyFile(uri, filePath);
        
        const shareOptions = {
          title: 'Share Payslip',
          message: `Payslip for ${payslipData.month} ${payslipData.year}`,
          url: `file://${filePath}`,
          type: 'image/png',
          failOnCancel: false,
        };
        
        await Share.open(shareOptions);
      } else {
        Alert.alert('Error', 'Unable to capture payslip');
      }
    } catch (error) {
      console.error('Error sharing payslip:', error);
      Alert.alert('Error', 'Failed to share payslip');
    }
  };

  const handlePrint = () => {
    Alert.alert('Info', 'Print functionality would open print dialog');
  };

  // Check if a month is available
  const isMonthAvailable = (monthName: string): boolean => {
    const monthInfo = availableMonths.find(m => m.name === monthName);
    return monthInfo ? monthInfo.available : false;
  };

  // Get month status text
  const getMonthStatus = (monthName: string): string => {
    const monthInfo = availableMonths.find(m => m.name === monthName);
    if (!monthInfo) return 'Not Available';
    return monthInfo.available ? 'Available' : 'No Data';
  };

  // Payslip Viewer Component
  const PayslipViewer = ({ data }: { data: PayslipData }) => (
    <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
      <View style={{ backgroundColor: COLORS.white, padding: 16, margin: 8, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
        {/* Header with Logo */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, marginRight: 12 }}>
            <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: 'bold' }}>C</Text>
          </View>
          <View>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: COLORS.primary }}>CALDIM</Text>
            <Text style={{ fontSize: 10, color: COLORS.orange, fontWeight: '600' }}>ENGINEERING PRIVATE LIMITED</Text>
          </View>
        </View>

        {/* Contact Info */}
        <View style={{ marginBottom: 16, padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: COLORS.textPrimary }}>044-47860455 • No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</Text>
        </View>

        {/* Title */}
        <View style={{ marginBottom: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.primary }}>Payslip for {data.month} {data.year}</Text>
        </View>

        {/* Employee & Bank Details */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
          <View style={{ width: '50%', padding: 4 }}>
            <View style={{ backgroundColor: COLORS.filterBg, padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: COLORS.primary }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 8 }}>Employee Details</Text>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>ID: <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{data.employeeId}</Text></Text>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>Name: <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{data.employeeName}</Text></Text>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>Designation: <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{data.designation}</Text></Text>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>PAN: <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{data.panNumber}</Text></Text>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>UAN: <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{data.uanNumber}</Text></Text>
            </View>
          </View>
          <View style={{ width: '50%', padding: 4 }}>
            <View style={{ backgroundColor: COLORS.filterBg, padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: COLORS.orange }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 8 }}>Bank Details</Text>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>Bank: <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{data.bankName}</Text></Text>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>A/c No: <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{data.accountNumber}</Text></Text>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>IFSC: <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{data.ifscCode}</Text></Text>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>Payment Date: <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{data.paidDate}</Text></Text>
            </View>
          </View>
        </View>

        {/* Salary Table */}
        <View style={{ marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary }}>
            <View style={{ flex: 1, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 12 }}>EARNINGS</Text>
            </View>
            <View style={{ flex: 1, padding: 10, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: COLORS.secondary }}>
              <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 12 }}>DEDUCTIONS</Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row' }}>
            {/* Earnings Column */}
            <View style={{ flex: 1, padding: 12, borderRightWidth: 1, borderRightColor: COLORS.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: COLORS.gray }}>Basic Salary</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>₹{data.basicSalary.toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: COLORS.gray }}>HRA</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>₹{data.hra.toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: COLORS.gray }}>Special Allowance</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>₹{data.specialAllowance.toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>Total Earnings</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary }}>₹{data.totalEarnings.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Deductions Column */}
            <View style={{ flex: 1, padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: COLORS.gray }}>Provident Fund</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>₹{data.pfDeduction.toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: COLORS.gray }}>Professional Tax</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>₹{data.professionalTax.toLocaleString('en-IN')}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: COLORS.gray }}>TDS</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>₹{data.tds.toLocaleString('en-IN')}</Text>
              </View>
              {data.lopDeduction > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray }}>Loss of Pay</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>₹{data.lopDeduction.toLocaleString('en-IN')}</Text>
                </View>
              )}
              {data.loanDeduction > 0 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray }}>Loan</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>₹{data.loanDeduction.toLocaleString('en-IN')}</Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.red }}>Total Deductions</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.red }}>₹{data.totalDeductions.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Net Salary */}
        <View style={{ backgroundColor: COLORS.primary, padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: COLORS.gray, fontSize: 11, marginBottom: 4 }}>Net Salary Payable</Text>
              <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: 'bold' }}>₹{data.netSalary.toLocaleString('en-IN')}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: COLORS.gray, fontSize: 10, marginBottom: 2 }}>Amount in words</Text>
              <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '500', fontStyle: 'italic' }}>{numberToWords(data.netSalary)}</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={{ fontSize: 10, color: COLORS.gray, textAlign: 'center' }}>
          This is a computer-generated document and does not require a signature.
        </Text>
      </View>
    </ViewShot>
  );

  const renderPDFOptionsModal = () => (
    <Modal
      visible={showPDFOptions}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPDFOptions(false)}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        activeOpacity={1}
        onPress={() => setShowPDFOptions(false)}
      >
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: COLORS.white,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          padding: 16,
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16, textAlign: 'center' }}>
            Download Payslip
          </Text>
          
          <TouchableOpacity
            onPress={handleDownloadPDF}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}
          >
            <Icon name="file-download" size={24} color={COLORS.blue} />
            <Text style={{ fontSize: 16, color: COLORS.textPrimary, marginLeft: 12 }}>Save as Image</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handlePrint}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}
          >
            <Icon name="print" size={24} color={COLORS.green} />
            <Text style={{ fontSize: 16, color: COLORS.textPrimary, marginLeft: 12 }}>Print</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setShowPDFOptions(false)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <Icon name="close" size={24} color={COLORS.gray} />
            <Text style={{ fontSize: 16, color: COLORS.gray, marginLeft: 12 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Salary Slips" 
        showBack={true}
        rightComponent={
          showPayslip ? (
            <TouchableOpacity onPress={() => setShowPDFOptions(true)}>
              <Icon name="file-download" size={24} color={COLORS.white} />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
      >
        {!showPayslip ? (
          <>
            {/* Selection Panel */}
            <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ backgroundColor: COLORS.primary, padding: 8, borderRadius: 8, marginRight: 12 }}>
                  <Icon name="calendar-today" size={20} color={COLORS.white} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>Select Pay Period</Text>
              </View>

              {/* Financial Year */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Financial Year</Text>
                <View style={{ borderWidth: 1, borderColor: financialYear ? COLORS.primary : COLORS.border, borderRadius: 8, backgroundColor: financialYear ? COLORS.selectedBg : COLORS.white }}>
                  <Picker
                    selectedValue={financialYear}
                    onValueChange={(value: string) => {
                      setFinancialYear(value);
                      setMonth('');
                    }}
                    enabled={!isLoading}
                    style={{ height: 45, color: financialYear ? COLORS.primary : COLORS.textPrimary }}
                  >
                    <Picker.Item label="-- Select Financial Year --" value="" color={COLORS.gray} />
                    {availableYears.map((year) => (
                      <Picker.Item key={year} label={year} value={year} color={COLORS.textPrimary} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Month */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Month</Text>
                <View style={{ borderWidth: 1, borderColor: month ? COLORS.primary : COLORS.border, borderRadius: 8, backgroundColor: month ? COLORS.selectedBg : COLORS.white }}>
                  <Picker
                    selectedValue={month}
                    onValueChange={(value: string) => handleMonthChange(value)}
                    enabled={!isLoading && !!financialYear}
                    style={{ height: 45, color: month ? COLORS.primary : COLORS.textPrimary }}
                  >
                    <Picker.Item label="-- Select Month --" value="" color={COLORS.gray} />
                    {months.map((monthName) => {
                      const available = isMonthAvailable(monthName);
                      return (
                        <Picker.Item 
                          key={monthName} 
                          label={available ? `${monthName} ✓` : `${monthName} (No Data)`} 
                          value={monthName}
                          color={available ? COLORS.primary : COLORS.gray}
                          enabled={available}
                        />
                      );
                    })}
                  </Picker>
                </View>
                {month && (
                  <Text style={{ fontSize: 11, color: isMonthAvailable(month) ? COLORS.green : COLORS.red, marginTop: 4 }}>
                    Status: {getMonthStatus(month)}
                  </Text>
                )}
              </View>

              {/* Instructions */}
              <View style={{ backgroundColor: '#EBF5FF', padding: 12, borderRadius: 8, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Icon name="info" size={16} color={COLORS.blue} />
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.blue, marginLeft: 6 }}>Instructions</Text>
                </View>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>• Select financial year first</Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>• Then select month to view payslip</Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 }}>• ✓ indicates months with available data</Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>• Grayed out months have no data</Text>
              </View>
            </View>

            {/* Info Panel */}
            <View style={{ backgroundColor: COLORS.white, padding: 24, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>💰</Text>
              <Text style={{ fontSize: 20, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 }}>CALDIM Salary Slips Portal</Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                <View style={{ width: '33.33%', padding: 4 }}>
                  <View style={{ backgroundColor: '#EBF5FF', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                    <Icon name="lock" size={20} color={COLORS.blue} />
                    <Text style={{ fontSize: 11, color: COLORS.blue, marginTop: 4, fontWeight: '500' }}>Secure</Text>
                  </View>
                </View>
                <View style={{ width: '33.33%', padding: 4 }}>
                  <View style={{ backgroundColor: '#E6F7E6', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                    <Icon name="history" size={20} color={COLORS.green} />
                    <Text style={{ fontSize: 11, color: COLORS.green, marginTop: 4, fontWeight: '500' }}>Historical</Text>
                  </View>
                </View>
                <View style={{ width: '33.33%', padding: 4 }}>
                  <View style={{ backgroundColor: '#F3E8FF', padding: 12, borderRadius: 8, alignItems: 'center' }}>
                    <Icon name="file-download" size={20} color={COLORS.purple} />
                    <Text style={{ fontSize: 11, color: COLORS.purple, marginTop: 4, fontWeight: '500' }}>Download</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        ) : isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 16, fontSize: 16, color: COLORS.textSecondary }}>Loading Payslip...</Text>
            <Text style={{ marginTop: 8, fontSize: 13, color: COLORS.gray }}>Fetching your salary details for {month} {financialYear}</Text>
          </View>
        ) : payslipData ? (
          <>
            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <TouchableOpacity
                onPress={handlePrint}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.blue,
                  paddingVertical: 12,
                  marginRight: 4,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="print" size={18} color={COLORS.white} />
                <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '500', marginLeft: 6 }}>Print</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDownloadPDF}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.green,
                  paddingVertical: 12,
                  marginLeft: 4,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="file-download" size={18} color={COLORS.white} />
                <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '500', marginLeft: 6 }}>Download</Text>
              </TouchableOpacity>
            </View>
            
            <PayslipViewer data={payslipData} />
            
            <TouchableOpacity
              onPress={handleBackToSelection}
              style={{
                backgroundColor: COLORS.primary,
                paddingVertical: 14,
                borderRadius: 8,
                alignItems: 'center',
                marginTop: 16,
              }}
            >
              <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '600' }}>Back to Selection</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Salary Slips • PF • Gratuity • "
      />

      {/* PDF Options Modal */}
      {renderPDFOptionsModal()}
    </SafeAreaView>
  );
};

export default SalarySlipsScreen;