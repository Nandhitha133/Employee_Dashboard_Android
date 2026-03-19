// screens/HolidayAllowanceScreen.tsx
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
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { employeeAPI, holidayAllowanceAPI, BASE_URL } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';

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

// TypeScript Interfaces
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
  totalAmount: number;
  status: 'Draft' | 'Saved' | 'Approved';
}

interface SummaryRecord {
  _id?: string;
  id?: string;
  month: number;
  year: number;
  location: string;
  allowances: AllowanceRow[];
  totalAllowance: number;
  employeeCount: number;
  averageAllowance: number;
  status: string;
  monthName: string;
  sNo?: number;
}

interface DetailedRecord {
  _id?: string;
  month: number;
  year: number;
  location: string;
  allowances: AllowanceRow[];
  totalAllowance: number;
  employeeCount: number;
  averageAllowance: number;
  status: string;
  monthName: string;
}

const HolidaysAllowance = () => {
  const [activeTab, setActiveTab] = useState<'manage' | 'summary'>('manage');
  const [viewMode, setViewMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Filter States
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  
  // Data States
  const [tableData, setTableData] = useState<AllowanceRow[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');

  // Summary Tab States
  const [summaryLocation, setSummaryLocation] = useState('');
  const [summaryYear, setSummaryYear] = useState<string>(new Date().getFullYear().toString());
  const [summaryData, setSummaryData] = useState<SummaryRecord[]>([]);
  const [summaryMonth, setSummaryMonth] = useState<number | ''>('');

  // Modal States
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [detailedRecord, setDetailedRecord] = useState<DetailedRecord | null>(null);

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});

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

  const monthNames: Record<number, string> = {
    1: 'January', 2: 'February', 3: 'March', 4: 'April',
    5: 'May', 6: 'June', 7: 'July', 8: 'August',
    9: 'September', 10: 'October', 11: 'November', 12: 'December'
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  // Calculations
  const totalAllowance = tableData.reduce((sum, item) => sum + (item.totalAmount || 0), 0);
  const totalEmployees = tableData.length;
  const averageAllowance = totalEmployees > 0 ? totalAllowance / totalEmployees : 0;

  useEffect(() => {
    checkConnection();
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'summary' && summaryYear && isConnected) {
      loadSummary();
    }
  }, [activeTab, summaryYear, summaryLocation, isConnected]);

  useEffect(() => {
    if (selectedLocation && selectedMonth && selectedYear && !viewMode && isConnected) {
      checkExistingRecord();
    }
  }, [selectedLocation, selectedMonth, selectedYear, isConnected]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    checkConnection();
    if (activeTab === 'summary') {
      loadSummary().finally(() => setRefreshing(false));
    } else {
      fetchInitialData().finally(() => setRefreshing(false));
    }
  }, [activeTab]);

  const checkConnection = async (showAlert = false) => {
    try {
      console.log('🔍 Checking connection to server...');
      console.log('Server URL:', BASE_URL);
      
      setIsConnected(null);
      
      const response = await holidayAllowanceAPI.healthCheck();
      
      if (response.data) {
        console.log('✅ Server connection successful:', response.data);
        setIsConnected(true);
        setRetryCount(0);
        if (showAlert) {
          Alert.alert('Success', 'Connected to server successfully!');
        }
        return true;
      } else {
        throw new Error('Invalid response');
      }
    } catch (error: any) {
      console.error('❌ Server connection failed:', error);
      setIsConnected(false);
      
      if (showAlert) {
        Alert.alert(
          'Connection Error',
          `Cannot connect to server at:\n${BASE_URL}\n\n` +
          `Error: ${error.message || 'Unknown error'}\n\n` +
          `Please check:\n` +
          `1. The server is running on Render\n` +
          `2. You have internet connection\n` +
          `3. The server URL is correct\n\n` +
          `Would you like to open the server URL in browser?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open URL',
              onPress: () => Linking.openURL('https://employee-react-main.onrender.com')
            },
            {
              text: 'Retry',
              onPress: () => checkConnection(true)
            }
          ]
        );
      }
      return false;
    }
  };

  const testAPIConnection = async () => {
    try {
      console.log('Testing API connection to Render...');
      const response = await holidayAllowanceAPI.healthCheck();
      console.log('✅ API Connection successful:', response.data);
      setIsConnected(true);
    } catch (error: any) {
      console.error('❌ API Connection failed:', error);
      setIsConnected(false);
      Alert.alert(
        'Connection Error',
        'Cannot connect to server. Please make sure backend is running.'
      );
    }
  };

  const fetchInitialData = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      const employees = response.data || [];
      const locs = [...new Set(employees.map((e: any) => e.location).filter(Boolean))];
      setLocations(locs as string[]);
    } catch (error) {
      console.error('Error fetching employees:', error);
      Alert.alert('Error', 'Failed to load locations');
    }
  };

  const checkExistingRecord = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server. Please check connection first.');
      return;
    }

    try {
      const params = {
        month: selectedMonth,
        year: selectedYear,
        location: selectedLocation
      };
      console.log('🔍 Checking for existing record with params:', params);
      const res = await holidayAllowanceAPI.getSummary(params);
      console.log('📊 Check existing record response:', res.data);
      
      if (res.data && res.data.success && res.data.data.length > 0) {
        const existing = res.data.data[0];
        Alert.alert(
          'Record Exists',
          `A record for ${monthNames[selectedMonth]} ${selectedYear} in ${selectedLocation} already exists.\n\nClick OK to load the existing record for editing.\nClick Cancel to change the selection.`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => setSelectedLocation('')
            },
            {
              text: 'OK',
              onPress: () => loadRecordForEditing(existing._id || existing.id)
            }
          ]
        );
      } else {
        loadEmployees();
      }
    } catch (err: any) {
      console.error('Error checking for existing record:', err);
      
      if (err.response?.status === 404) {
        console.log('⚠️ Summary endpoint not found (404) - Loading employees directly');
        loadEmployees();
      } else {
        Alert.alert('Error', 'Failed to check for existing record. Loading employees anyway.');
        loadEmployees();
      }
    }
  };

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const response = await employeeAPI.getAllEmployees();
      let employees = response.data || [];
      
      if (selectedLocation) {
        employees = employees.filter((e: any) => e.location === selectedLocation);
      }

      const processedData: AllowanceRow[] = employees.map((emp: any, index: number) => {
        const gross = emp.totalEarnings || emp.ctc || emp.grossSalary || 0;
        const perDayAmount = gross > 0 ? Math.round(gross / 30) : 0;

        return {
          id: emp._id || `temp_${index}`,
          sNo: index + 1,
          employeeId: emp.employeeId || '',
          employeeName: emp.name || emp.employeename || '',
          location: emp.location || '-',
          accountNumber: emp.bankAccount || emp.bankDetails?.accountNumber || '-',
          grossSalary: gross,
          holidayDays: 0,
          perDayAmount: perDayAmount,
          totalAmount: 0,
          status: 'Draft'
        };
      });

      setTableData(processedData);
    } catch (error: any) {
      console.error('Error loading employees:', error);
      Alert.alert('Error', 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecordForEditing = async (recordId: string) => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server. Please check connection first.');
      return;
    }

    try {
      setLoading(true);
      console.log('✏️ Loading record for editing:', recordId);
      const res = await holidayAllowanceAPI.getRecordById(recordId);
      console.log('📄 Record details response:', res.data);

      if (res.data && res.data.success) {
        const record = res.data.data;
        setSelectedRecord(record);
        setViewMode(true);

        setSelectedMonth(record.month);
        setSelectedYear(record.year.toString());
        setSelectedLocation(record.location);

        const allowancesWithIds: AllowanceRow[] = record.allowances?.map((a: any, index: number) => ({
          ...a,
          id: a._id || `temp_${index}`,
          sNo: index + 1
        })) || [];

        setTableData(allowancesWithIds);
        setActiveTab('manage');

        Alert.alert('Success', 'Record loaded for editing. Make changes and click Save to update.');
      } else {
        Alert.alert('Error', 'Failed to load record');
      }
    } catch (err: any) {
      console.error('❌ Error loading record:', err);
      
      if (err.response?.status === 404) {
        Alert.alert('Error', 'Record not found (404). Please check if the record exists.');
      } else {
        Alert.alert('Error', 'Failed to load record for editing');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, field: 'holidayDays' | 'perDayAmount', value: string) => {
    const numValue = parseFloat(value) || 0;
    
    setTableData(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item };
        
        if (field === 'holidayDays') {
          updated.holidayDays = numValue;
          updated.totalAmount = Math.round(numValue * updated.perDayAmount);
        } else if (field === 'perDayAmount') {
          updated.perDayAmount = numValue;
          updated.totalAmount = Math.round(updated.holidayDays * numValue);
        }
        
        return updated;
      }
      return item;
    }));
  };

  const saveRecord = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server. Please check connection first.');
      return;
    }

    if (!selectedLocation || !selectedMonth || !selectedYear) {
      Alert.alert('Validation Error', 'Location, Month, and Year are required');
      return;
    }

    if (tableData.length === 0) {
      Alert.alert('Warning', 'No employee data to save');
      return;
    }

    const record = {
      month: selectedMonth,
      year: parseInt(selectedYear),
      location: selectedLocation,
      allowances: tableData.map(a => ({
        employeeId: a.employeeId,
        employeeName: a.employeeName,
        location: a.location,
        accountNumber: a.accountNumber,
        grossSalary: a.grossSalary,
        holidayDays: a.holidayDays,
        perDayAmount: a.perDayAmount,
        totalAmount: a.totalAmount
      }))
    };

    try {
      setSaveLoading(true);
      setSavingMessage('Saving record to database...');

      console.log('📤 Saving record:', record);
      let response;
      
      if (viewMode && selectedRecord && selectedRecord._id) {
        console.log('✏️ Updating existing record:', selectedRecord._id);
        response = await holidayAllowanceAPI.updateRecord(selectedRecord._id, record);
      } else {
        console.log('➕ Creating new record');
        response = await holidayAllowanceAPI.saveMonthlyRecord(record);
      }

      console.log('✅ API Response:', response.data);

      if (response.data && response.data.success) {
        Alert.alert('Success', `✅ Record ${viewMode ? 'updated' : 'saved'} successfully!`);
        
        setSummaryYear(selectedYear);
        setSummaryLocation(selectedLocation);
        setActiveTab('summary');
        clearForm();
      } else {
        Alert.alert('Error', `❌ ${viewMode ? 'Update' : 'Save'} failed: ${response.data?.message || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('❌ Save error:', err);
      
      if (!err.response) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to the server. Please check your internet connection.'
        );
      } else if (err.response.status === 404) {
        Alert.alert(
          'Error', 
          `❌ Save failed: Endpoint not found (404).\n\nPlease check if the backend has the required routes:\n` +
          `- POST /api/holiday-allowance\n` +
          `- PUT /api/holiday-allowance/:id`
        );
      } else {
        Alert.alert('Error', `❌ Save failed: ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setSaveLoading(false);
      setSavingMessage('');
    }
  };

  const loadSummary = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server. Please check connection first.');
      return;
    }

    if (!summaryYear) {
      setSummaryErrors({ summaryYear: 'Year is required' });
      return;
    }
    setSummaryErrors({});

    try {
      setLoading(true);
      const params: any = { year: summaryYear };

      if (summaryLocation) {
        params.location = summaryLocation;
      }

      console.log('📊 Loading summary with params:', params);
      const res = await holidayAllowanceAPI.getSummary(params);
      console.log('📊 Summary response:', res.data);

      if (res.data && res.data.success && res.data.data) {
        const processedData: SummaryRecord[] = res.data.data.map((record: any, index: number) => {
          const totalAllowance = record.allowances?.reduce((sum: number, a: any) => sum + (a.totalAmount || 0), 0) || 0;
          const employeeCount = record.allowances?.length || 0;
          const averageAllowance = employeeCount > 0 ? totalAllowance / employeeCount : 0;

          return {
            ...record,
            id: record._id || record.id,
            sNo: index + 1,
            month: record.month,
            monthName: monthNames[record.month],
            location: record.location,
            totalAllowance,
            employeeCount,
            averageAllowance,
            status: record.status || 'Draft'
          };
        });

        setSummaryData(processedData);
      } else {
        setSummaryData([]);
      }
    } catch (err: any) {
      console.error('❌ Summary error:', err);
      
      if (!err.response) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to the server. Please check your internet connection.'
        );
      } else if (err.response.status === 404) {
        console.log('⚠️ Summary endpoint not found (404) - Using mock data for testing');
        setSummaryData([]);
        Alert.alert('Info', 'Summary endpoint not found. Please ensure backend routes are configured.');
      } else {
        Alert.alert('Error', '❌ Failed to load summary data');
      }
      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  };

  const viewRecordDetails = async (recordId: string) => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server. Please check connection first.');
      return;
    }

    try {
      setLoading(true);
      console.log('📄 Fetching record details for ID:', recordId);
      const res = await holidayAllowanceAPI.getRecordById(recordId);
      console.log('📄 Record details response:', res.data);

      if (res.data && res.data.success) {
        const record = res.data.data;
        const totalAllowance = record.allowances?.reduce((sum: number, a: any) => sum + (a.totalAmount || 0), 0) || 0;
        const employeeCount = record.allowances?.length || 0;
        const averageAllowance = employeeCount > 0 ? totalAllowance / employeeCount : 0;

        setDetailedRecord({
          ...record,
          totalAllowance,
          employeeCount,
          averageAllowance,
          monthName: monthNames[record.month]
        });
        setViewModalOpen(true);
      } else {
        Alert.alert('Info', 'No record found');
      }
    } catch (err: any) {
      console.error('❌ Error loading record details:', err);
      
      if (err.response?.status === 404) {
        Alert.alert('Error', 'Record not found (404)');
      } else {
        Alert.alert('Error', 'Failed to load record details');
      }
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (recordId: string) => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server. Please check connection first.');
      return;
    }

    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ Deleting record:', recordId);
              await holidayAllowanceAPI.deleteRecord(recordId);
              Alert.alert('Success', '✅ Record deleted successfully');

              if (activeTab === 'summary' && summaryYear) {
                loadSummary();
              }

              if (selectedRecord && selectedRecord._id === recordId) {
                clearForm();
              }
            } catch (err: any) {
              console.error('❌ Delete error:', err);
              
              if (!err.response) {
                Alert.alert(
                  'Connection Error',
                  'Cannot connect to the server. Please check your internet connection.'
                );
              } else if (err.response.status === 404) {
                Alert.alert('Error', 'Delete endpoint not found (404)');
              } else {
                Alert.alert('Error', 'Failed to delete record');
              }
            }
          }
        }
      ]
    );
  };

  const clearForm = () => {
    setSelectedLocation('');
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(currentYear.toString());
    setTableData([]);
    setSelectedRecord(null);
    setViewMode(false);
    setErrors({});
  };

  const exportToCSV = async () => {
    if (!selectedLocation || !selectedMonth || !selectedYear) {
      Alert.alert('Warning', 'Please select Location, Month, and Year');
      return;
    }

    const headers = ["S.No", "Employee ID", "Employee Name", "Location", "Account Number", "Gross Salary", "Holiday Days", "Per Day Amount", "Total Amount"];
    const rows = tableData.map(a => [
      a.sNo.toString(),
      a.employeeId,
      a.employeeName,
      a.location,
      a.accountNumber,
      a.grossSalary.toString(),
      a.holidayDays.toString(),
      a.perDayAmount.toString(),
      a.totalAmount.toString()
    ]);

    let csvContent = "HOLIDAY ALLOWANCE RECORD\n\n";
    csvContent += `Month: ${monthNames[selectedMonth]}, Year: ${selectedYear}, Location: ${selectedLocation}\n\n`;
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    csvContent += `\nSummary\n`;
    csvContent += `Total Employees,${totalEmployees}\n`;
    csvContent += `Total Allowance,${totalAllowance}\n`;
    csvContent += `Average Allowance,${averageAllowance.toFixed(2)}\n`;

    const fileName = `holiday_allowance_${monthNames[selectedMonth]}_${selectedYear}_${selectedLocation}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csvContent, 'utf8');
      
      const shareOptions = {
        title: 'Export Holiday Allowance Data',
        message: 'Holiday Allowance Report',
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

  const exportSummaryToCSV = async () => {
    if (summaryData.length === 0) {
      Alert.alert('Warning', 'No summary data to export');
      return;
    }

    const headers = ["S.No", "Month", "Location", "Employee Count", "Total Allowance (₹)", "Average Allowance (₹)", "Status"];
    const rows = summaryData.map(row => [
      row.sNo?.toString() || '',
      row.monthName,
      row.location,
      row.employeeCount.toString(),
      row.totalAllowance.toFixed(2),
      row.averageAllowance.toFixed(2),
      row.status
    ]);

    let csvContent = `HOLIDAY ALLOWANCE SUMMARY REPORT - ${summaryYear}\n\n`;
    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const overallTotal = summaryData.reduce((sum, row) => sum + row.totalAllowance, 0);
    const overallEmployees = summaryData.reduce((sum, row) => sum + row.employeeCount, 0);
    const overallAverage = overallEmployees > 0 ? overallTotal / overallEmployees : 0;

    csvContent += '\nOverall Summary:\n';
    csvContent += `Year,${summaryYear}\n`;
    csvContent += `Total Records,${summaryData.length}\n`;
    csvContent += `Total Allowance,₹${overallTotal.toFixed(2)}\n`;
    csvContent += `Total Employees,${overallEmployees}\n`;
    csvContent += `Overall Average,₹${overallAverage.toFixed(2)}\n`;

    const fileName = `holiday_allowance_summary_${summaryYear}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csvContent, 'utf8');
      
      const shareOptions = {
        title: 'Export Summary Data',
        message: 'Holiday Allowance Summary Report',
        url: `file://${filePath}`,
        type: 'text/csv',
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      Alert.alert('Error', 'Failed to export summary');
    }
  };

  const renderConnectionStatus = () => {
    if (isConnected === null) {
      return (
        <TouchableOpacity
          onPress={() => checkConnection(true)}
          style={{
            backgroundColor: COLORS.warning,
            padding: 8,
            borderRadius: 4,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="small" color={COLORS.white} />
          <Text style={{ color: COLORS.white, marginLeft: 8 }}>Checking server connection...</Text>
        </TouchableOpacity>
      );
    } else if (isConnected === false) {
      return (
        <TouchableOpacity
          onPress={() => checkConnection(true)}
          style={{
            backgroundColor: COLORS.error,
            padding: 8,
            borderRadius: 4,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="wifi-off" size={16} color={COLORS.white} />
          <Text style={{ color: COLORS.white, marginLeft: 8 }}>Server disconnected. Tap to retry.</Text>
        </TouchableOpacity>
      );
    }
    return null;
  };

  const renderViewModal = () => (
    <Modal
      visible={viewModalOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setViewModalOpen(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>Holiday Allowance Details</Text>
              {detailedRecord && (
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  {detailedRecord.monthName} {detailedRecord.year} - {detailedRecord.location}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setViewModalOpen(false)}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {detailedRecord && (
            <ScrollView style={{ padding: 16 }}>
              {/* Summary Cards */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
                <View style={{ width: '33.33%', padding: 4 }}>
                  <View style={{ backgroundColor: COLORS.lightBlue, padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Total Employees</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.blue }}>{detailedRecord.employeeCount}</Text>
                  </View>
                </View>
                <View style={{ width: '33.33%', padding: 4 }}>
                  <View style={{ backgroundColor: '#FFE6E6', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Total Allowance</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.red }}>₹{detailedRecord.totalAllowance?.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={{ width: '33.33%', padding: 4 }}>
                  <View style={{ backgroundColor: '#E6F7E6', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Average</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.green }}>₹{detailedRecord.averageAllowance?.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {/* Status */}
              <View style={{ marginBottom: 16, padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8 }}>
                <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>Status: {detailedRecord.status}</Text>
              </View>

              {/* Allowances Table */}
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>Employee Allowances</Text>

              <ScrollView horizontal>
                <View>
                  {/* Table Header */}
                  <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 4 }}>
                    <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'center' }}>S.No</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Employee ID</Text>
                    <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Name</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Days</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>Per Day</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>Total</Text>
                  </View>

                  {/* Table Rows */}
                  {detailedRecord.allowances?.map((item: AllowanceRow, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                      <Text style={{ width: 50, fontSize: 11, textAlign: 'center', color: COLORS.textPrimary }}>{idx + 1}</Text>
                      <Text style={{ width: 100, fontSize: 11, color: COLORS.textSecondary }}>{item.employeeId}</Text>
                      <Text style={{ width: 120, fontSize: 11, color: COLORS.textPrimary, fontWeight: '500' }}>{item.employeeName}</Text>
                      <Text style={{ width: 80, fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' }}>{item.holidayDays}</Text>
                      <Text style={{ width: 100, fontSize: 11, color: COLORS.blue, fontWeight: '600', textAlign: 'right' }}>₹{item.perDayAmount?.toLocaleString()}</Text>
                      <Text style={{ width: 100, fontSize: 11, color: COLORS.red, fontWeight: '600', textAlign: 'right' }}>₹{item.totalAmount?.toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                <TouchableOpacity
                  onPress={() => setViewModalOpen(false)}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 6, marginRight: 8 }}
                >
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setViewModalOpen(false);
                    if (detailedRecord?._id) {
                      loadRecordForEditing(detailedRecord._id);
                    }
                  }}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.green, borderRadius: 6 }}
                >
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Edit</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Holiday Allowance" 
        showBack={true}
        rightComponent={
          <TouchableOpacity onPress={() => checkConnection(true)}>
            <Icon 
              name={isConnected === true ? "wifi" : isConnected === false ? "wifi-off" : "sync"} 
              size={24} 
              color={COLORS.white} 
            />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
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
        {/* Connection Status */}
        {renderConnectionStatus()}

        {/* Tabs */}
        <View style={{ flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <TouchableOpacity
            onPress={() => setActiveTab('manage')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'manage' ? COLORS.primary : 'transparent',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'manage' ? COLORS.primary : COLORS.gray }}>
              Manage Allowance
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setActiveTab('summary');
              setSummaryMonth('');
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'summary' ? COLORS.primary : 'transparent',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'summary' ? COLORS.primary : COLORS.gray }}>
              View Summary
            </Text>
          </TouchableOpacity>
        </View>

        {/* MANAGE TAB */}
        {activeTab === 'manage' && (
          <View>
            {/* Filter Section */}
            <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Select Period & Location</Text>
                {viewMode && selectedRecord && (
                  <View style={{ backgroundColor: COLORS.lightBlue, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <Text style={{ fontSize: 12, color: COLORS.blue }}>Editing: {monthNames[selectedMonth]} {selectedYear} - {selectedLocation}</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {/* Location Picker */}
                <View style={{ width: '33.33%', padding: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location *</Text>
                  <View style={{ 
                    borderWidth: 1, 
                    borderColor: errors.location ? COLORS.red : COLORS.border, 
                    borderRadius: 8, 
                    backgroundColor: COLORS.dropdownBg,
                    justifyContent: 'center',
                    minHeight: 50,
                  }}>
                    <Picker
                      selectedValue={selectedLocation}
                      onValueChange={(value: string) => {
                        setSelectedLocation(value);
                        if (errors.location) {
                          const newErrors = { ...errors };
                          delete newErrors.location;
                          setErrors(newErrors);
                        }
                      }}
                      enabled={!viewMode}
                      style={{ 
                        height: Platform.OS === 'ios' ? 50 : 50,
                        color: COLORS.dropdownText,
                        marginLeft: Platform.OS === 'android' ? -8 : 0,
                        marginRight: Platform.OS === 'android' ? -8 : 0,
                      }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select Location" value="" color={COLORS.gray} />
                      {locations.map(loc => (
                        <Picker.Item key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                  {errors.location && <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.location}</Text>}
                </View>

                {/* Month Picker */}
                <View style={{ width: '33.33%', padding: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Month *</Text>
                  <View style={{ 
                    borderWidth: 1, 
                    borderColor: errors.month ? COLORS.red : COLORS.border, 
                    borderRadius: 8, 
                    backgroundColor: COLORS.dropdownBg,
                    justifyContent: 'center',
                    minHeight: 50,
                  }}>
                    <Picker
                      selectedValue={selectedMonth}
                      onValueChange={(value: number) => {
                        setSelectedMonth(value);
                        if (errors.month) {
                          const newErrors = { ...errors };
                          delete newErrors.month;
                          setErrors(newErrors);
                        }
                      }}
                      enabled={!viewMode}
                      style={{ 
                        height: Platform.OS === 'ios' ? 50 : 50,
                        color: COLORS.dropdownText,
                        marginLeft: Platform.OS === 'android' ? -8 : 0,
                        marginRight: Platform.OS === 'android' ? -8 : 0,
                      }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select Month" value={undefined} color={COLORS.gray} />
                      {months.map(m => (
                        <Picker.Item key={m.value} label={m.label} value={m.value} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                  {errors.month && <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.month}</Text>}
                </View>

                {/* Year Picker */}
                <View style={{ width: '33.33%', padding: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Year *</Text>
                  <View style={{ 
                    borderWidth: 1, 
                    borderColor: errors.year ? COLORS.red : COLORS.border, 
                    borderRadius: 8, 
                    backgroundColor: COLORS.dropdownBg,
                    justifyContent: 'center',
                    minHeight: 50,
                  }}>
                    <Picker
                      selectedValue={selectedYear}
                      onValueChange={(value: string) => {
                        setSelectedYear(value);
                        if (errors.year) {
                          const newErrors = { ...errors };
                          delete newErrors.year;
                          setErrors(newErrors);
                        }
                      }}
                      enabled={!viewMode}
                      style={{ 
                        height: Platform.OS === 'ios' ? 50 : 50,
                        color: COLORS.dropdownText,
                        marginLeft: Platform.OS === 'android' ? -8 : 0,
                        marginRight: Platform.OS === 'android' ? -8 : 0,
                      }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select Year" value="" color={COLORS.gray} />
                      {years.map(y => (
                        <Picker.Item key={y} label={y} value={y} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                  {errors.year && <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.year}</Text>}
                </View>

                {/* Load Button */}
                <View style={{ width: '100%', padding: 4, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={checkExistingRecord}
                    disabled={loading || !selectedLocation || !selectedMonth || !selectedYear || !isConnected}
                    style={{
                      backgroundColor: (loading || !selectedLocation || !selectedMonth || !selectedYear || !isConnected) ? COLORS.gray : COLORS.primary,
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                    }}
                  >
                    {loading ? (
                      <>
                        <ActivityIndicator size="small" color={COLORS.white} />
                        <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '500', marginLeft: 4 }}>Loading Employees...</Text>
                      </>
                    ) : (
                      <>
                        <Icon name="people" size={16} color={COLORS.white} />
                        <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '500', marginLeft: 4 }}>
                          {!isConnected ? 'Connect to Server' : 'Load Employees'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Summary Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              <View style={{ width: '33.33%', padding: 4 }}>
                <View style={{ backgroundColor: COLORS.lightBlue, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.blue + '20' }}>
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: 4 }}>Total Employees</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.blue }}>{totalEmployees}</Text>
                </View>
              </View>
              <View style={{ width: '33.33%', padding: 4 }}>
                <View style={{ backgroundColor: '#FFE6E6', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.red + '20' }}>
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: 4 }}>Total Allowance</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.red }}>₹{totalAllowance.toLocaleString()}</Text>
                </View>
              </View>
              <View style={{ width: '33.33%', padding: 4 }}>
                <View style={{ backgroundColor: '#E6F7E6', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.green + '20' }}>
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: 4 }}>Average</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.green }}>₹{averageAllowance.toFixed(2)}</Text>
                </View>
              </View>
            </View>

            {/* Allowance Table */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>
                Employee Holiday Allowance ({tableData.length} employees)
              </Text>

              <ScrollView horizontal>
                <View>
                  {/* Table Header */}
                  <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 4 }}>
                    <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>S.No</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee ID</Text>
                    <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Name</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Location</Text>
                    <Text style={{ width: 130, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Account No.</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Gross Salary</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Days</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Per Day</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Total</Text>
                  </View>

                  {/* Table Rows */}
                  {tableData.length === 0 ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Icon name="people-outline" size={48} color={COLORS.lightGray} />
                      <Text style={{ color: COLORS.gray, fontSize: 14, marginTop: 8 }}>No employees loaded. Select location and click Load Employees.</Text>
                    </View>
                  ) : (
                    tableData.map((item) => (
                      <View key={item.id} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                        <Text style={{ width: 50, fontSize: 12, textAlign: 'center', color: COLORS.textPrimary }}>{item.sNo}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{item.employeeId}</Text>
                        <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{item.employeeName}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{item.location}</Text>
                        <Text style={{ width: 130, fontSize: 12, color: COLORS.textSecondary }}>{item.accountNumber}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.blue, textAlign: 'right' }}>₹{item.grossSalary.toLocaleString()}</Text>
                        
                        {/* Editable Fields */}
                        <View style={{ width: 80, paddingHorizontal: 2 }}>
                          <TextInput
                            value={item.holidayDays.toString()}
                            onChangeText={(value) => handleInputChange(item.id, 'holidayDays', value)}
                            keyboardType="numeric"
                            style={{
                              borderWidth: 1,
                              borderColor: COLORS.border,
                              borderRadius: 4,
                              padding: 6,
                              fontSize: 12,
                              textAlign: 'center',
                              backgroundColor: COLORS.white,
                              color: COLORS.textPrimary,
                              minHeight: 36,
                            }}
                          />
                        </View>
                        
                        <View style={{ width: 100, paddingHorizontal: 2 }}>
                          <TextInput
                            value={item.perDayAmount.toString()}
                            onChangeText={(value) => handleInputChange(item.id, 'perDayAmount', value)}
                            keyboardType="numeric"
                            style={{
                              borderWidth: 1,
                              borderColor: COLORS.border,
                              borderRadius: 4,
                              padding: 6,
                              fontSize: 12,
                              textAlign: 'right',
                              backgroundColor: COLORS.white,
                              color: COLORS.textPrimary,
                              minHeight: 36,
                            }}
                          />
                        </View>
                        
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.red, fontWeight: '600', textAlign: 'right', paddingRight: 8 }}>
                          ₹{item.totalAmount.toLocaleString()}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                onPress={clearForm}
                style={{ paddingHorizontal: 20, paddingVertical: 10, marginRight: 8, borderWidth: 1, borderColor: COLORS.gray, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveRecord}
                disabled={saveLoading || tableData.length === 0 || !isConnected}
                style={{ 
                  paddingHorizontal: 20, 
                  paddingVertical: 10, 
                  backgroundColor: (saveLoading || tableData.length === 0 || !isConnected) ? COLORS.gray : COLORS.primary, 
                  borderRadius: 6, 
                  flexDirection: 'row', 
                  alignItems: 'center' 
                }}
              >
                {saveLoading ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.white} />
                    <Text style={{ color: COLORS.white, fontWeight: '600', marginLeft: 4 }}>{savingMessage || (viewMode ? 'Updating...' : 'Saving...')}</Text>
                  </>
                ) : (
                  <>
                    <Icon name="save" size={16} color={COLORS.white} />
                    <Text style={{ color: COLORS.white, fontWeight: '600', marginLeft: 4 }}>
                      {!isConnected ? 'Connect to Server' : (viewMode ? 'Update Record' : 'Save Monthly Record')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <View>
            {/* Filters */}
            <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 }}>
                Summary Filters - {summaryYear} {summaryLocation ? `- ${summaryLocation}` : ''}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {/* Month Picker */}
                <View style={{ width: '33.33%', padding: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Month</Text>
                  <View style={{ 
                    borderWidth: 1, 
                    borderColor: COLORS.border, 
                    borderRadius: 8, 
                    backgroundColor: COLORS.dropdownBg,
                    justifyContent: 'center',
                    minHeight: 48,
                  }}>
                    <Picker
                      selectedValue={summaryMonth}
                      onValueChange={(value: number | '') => setSummaryMonth(value)}
                      style={{ 
                        height: Platform.OS === 'ios' ? 48 : 48,
                        color: COLORS.dropdownText,
                        marginLeft: Platform.OS === 'android' ? -8 : 0,
                        marginRight: Platform.OS === 'android' ? -8 : 0,
                      }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="All Months" value="" color={COLORS.gray} />
                      {months.map(m => (
                        <Picker.Item key={m.value} label={m.label} value={m.value} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Year Picker */}
                <View style={{ width: '33.33%', padding: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Year *</Text>
                  <View style={{ 
                    borderWidth: 1, 
                    borderColor: summaryErrors.summaryYear ? COLORS.red : COLORS.border, 
                    borderRadius: 8, 
                    backgroundColor: COLORS.dropdownBg,
                    justifyContent: 'center',
                    minHeight: 48,
                  }}>
                    <Picker
                      selectedValue={summaryYear}
                      onValueChange={(value: string) => {
                        setSummaryYear(value);
                        setSummaryErrors({});
                      }}
                      style={{ 
                        height: Platform.OS === 'ios' ? 48 : 48,
                        color: COLORS.dropdownText,
                        marginLeft: Platform.OS === 'android' ? -8 : 0,
                        marginRight: Platform.OS === 'android' ? -8 : 0,
                      }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select Year" value="" color={COLORS.gray} />
                      {years.map(y => (
                        <Picker.Item key={y} label={y} value={y} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                  {summaryErrors.summaryYear && <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{summaryErrors.summaryYear}</Text>}
                </View>

                {/* Location Picker */}
                <View style={{ width: '33.33%', padding: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
                  <View style={{ 
                    borderWidth: 1, 
                    borderColor: COLORS.border, 
                    borderRadius: 8, 
                    backgroundColor: COLORS.dropdownBg,
                    justifyContent: 'center',
                    minHeight: 48,
                  }}>
                    <Picker
                      selectedValue={summaryLocation}
                      onValueChange={(value: string) => setSummaryLocation(value)}
                      style={{ 
                        height: Platform.OS === 'ios' ? 48 : 48,
                        color: COLORS.dropdownText,
                        marginLeft: Platform.OS === 'android' ? -8 : 0,
                        marginRight: Platform.OS === 'android' ? -8 : 0,
                      }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="All Locations" value="" color={COLORS.gray} />
                      {locations.map(loc => (
                        <Picker.Item key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={{ width: '100%', padding: 4, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={loadSummary}
                    disabled={loading || !isConnected}
                    style={{
                      backgroundColor: (loading || !isConnected) ? COLORS.gray : COLORS.primary,
                      paddingVertical: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                    }}
                  >
                    {loading ? (
                      <>
                        <ActivityIndicator size="small" color={COLORS.white} />
                        <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '500', marginLeft: 4 }}>Loading...</Text>
                      </>
                    ) : (
                      <>
                        <Icon name="filter-list" size={16} color={COLORS.white} />
                        <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '500', marginLeft: 4 }}>
                          {!isConnected ? 'Connect to Server' : 'Load Summary'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Summary Table */}
            {loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading summary data...</Text>
              </View>
            ) : summaryData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
                <Icon name="assessment" size={64} color={COLORS.lightGray} />
                <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontWeight: '500' }}>No summary data</Text>
                <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 8 }}>Select year and click "Load Summary"</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
                <ScrollView horizontal>
                  <View>
                    {/* Table Header */}
                    <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 4 }}>
                      <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>S.No</Text>
                      <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Month</Text>
                      <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Location</Text>
                      <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4, textAlign: 'right' }}>Employees</Text>
                      <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4, textAlign: 'right' }}>Total (₹)</Text>
                      <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4, textAlign: 'right' }}>Average (₹)</Text>
                      <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Status</Text>
                      <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                    </View>

                    {/* Table Rows */}
                    {summaryData
                      .filter(row => !summaryMonth || row.month === summaryMonth)
                      .map((row) => (
                        <View key={row.id} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                          <Text style={{ width: 50, fontSize: 12, textAlign: 'center', color: COLORS.textPrimary }}>{row.sNo}</Text>
                          <Text style={{ width: 100, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{row.monthName}</Text>
                          <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{row.location}</Text>
                          <Text style={{ width: 120, fontSize: 12, color: COLORS.blue, textAlign: 'right' }}>{row.employeeCount}</Text>
                          <Text style={{ width: 150, fontSize: 12, color: COLORS.red, textAlign: 'right' }}>₹{row.totalAllowance?.toLocaleString()}</Text>
                          <Text style={{ width: 150, fontSize: 12, color: COLORS.green, textAlign: 'right' }}>₹{row.averageAllowance?.toFixed(2)}</Text>
                          <View style={{ width: 100, flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name={row.status === 'Approved' ? 'check-circle' : 'schedule'} size={14} color={row.status === 'Approved' ? COLORS.green : COLORS.orange} />
                            <Text style={{ fontSize: 11, color: row.status === 'Approved' ? COLORS.green : COLORS.orange, marginLeft: 4 }}>{row.status}</Text>
                          </View>
                          <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center' }}>
                            <TouchableOpacity onPress={() => viewRecordDetails(row.id || '')} style={{ padding: 6 }}>
                              <Icon name="visibility" size={18} color={COLORS.blue} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => loadRecordForEditing(row.id || '')} style={{ padding: 6 }}>
                              <Icon name="edit" size={18} color={COLORS.green} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteRecord(row.id || '')} style={{ padding: 6 }}>
                              <Icon name="delete" size={18} color={COLORS.red} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                  </View>
                </ScrollView>

                {/* Overall Summary */}
                {summaryData.length > 0 && (
                  <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.filterBg }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      <View style={{ width: '25%', padding: 4 }}>
                        <View style={{ padding: 8 }}>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>Total Records</Text>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.blue }}>{summaryData.length}</Text>
                        </View>
                      </View>
                      <View style={{ width: '25%', padding: 4 }}>
                        <View style={{ padding: 8 }}>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>Total Allowance</Text>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.red }}>
                            ₹{summaryData.reduce((sum, row) => sum + row.totalAllowance, 0).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                      <View style={{ width: '25%', padding: 4 }}>
                        <View style={{ padding: 8 }}>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>Total Employees</Text>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.green }}>
                            {summaryData.reduce((sum, row) => sum + row.employeeCount, 0)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ width: '25%', padding: 4 }}>
                        <View style={{ padding: 8 }}>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>Overall Average</Text>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.purple }}>
                            ₹{(summaryData.reduce((sum, row) => sum + row.totalAllowance, 0) / 
                               (summaryData.reduce((sum, row) => sum + row.employeeCount, 0) || 1)).toLocaleString(undefined, {maximumFractionDigits: 2})}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Holiday Allowance • Employee Benefits • "
      />

      {/* Modals */}
      {renderViewModal()}
    </SafeAreaView>
  );
};

export default HolidaysAllowance;