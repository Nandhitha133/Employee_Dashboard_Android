// screens/ExpenditureManagement/ExpenditureManagementScreen.tsx
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
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import * as DocumentPicker from 'react-native-document-picker';
import { types } from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { expenditureAPI, BASE_URL } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';

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

interface Expenditure {
  id: string;
  sNo: number;
  date: string;
  type: string;
  paymentMode: string;
  amount: number;
  documentType: string;
  fileName?: string;
  fileData?: string;
  remarks?: string;
}

interface MonthlyRecord {
  _id?: string;
  id?: string;
  month: string;
  year: number;
  location: string;
  budgetAllocated: number;
  expenditures: Expenditure[];
}

interface Document {
  file: string;
  name: string;
  type: string;
}

const ExpenditureManagementScreen = () => {
  const [activeTab, setActiveTab] = useState<'manage' | 'summary'>('manage');
  const [viewMode, setViewMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MonthlyRecord | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Master Data
  const expenditureTypes = [
    "Milk", "Food", "Maid Salary", "Bakery", "Intern Stipend",
    "LinkedIn Subscription", "The Cake Home", "Flower Bill",
    "Electricity Bill", "AirFiber Bill", "Others"
  ];

  const paymentModes = ["Net Banking", "UPI", "Credit Card", "Cheque", "Cash"];
  const documentTypes = ["Invoice", "Voucher", "Not Applicable"];
  const locations = ["Chennai", "Hosur"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNames: Record<string, string> = {
    "Jan": "January", "Feb": "February", "Mar": "March", "Apr": "April",
    "May": "May", "Jun": "June", "Jul": "July", "Aug": "August",
    "Sep": "September", "Oct": "October", "Nov": "November", "Dec": "December"
  };
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  // Manage Tab States
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [location, setLocation] = useState('');
  const [budgetAllocated, setBudgetAllocated] = useState('');
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');

  const [newExpense, setNewExpense] = useState({
    type: '',
    customType: '',
    paymentMode: '',
    amount: '',
    documentType: '',
    file: null as any,
    fileData: '',
    fileName: '',
    remarks: '',
    date: ''
  });

  // Summary Tab States
  const [summaryLocation, setSummaryLocation] = useState('');
  const [summaryYear, setSummaryYear] = useState(currentYear.toString());
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [summaryMonth, setSummaryMonth] = useState('');

  // Modal States
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [detailedRecord, setDetailedRecord] = useState<any>(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [documentType, setDocumentType] = useState('');

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [summaryErrors, setSummaryErrors] = useState<Record<string, string>>({});
  const [editingExpenditureId, setEditingExpenditureId] = useState<string | null>(null);

  const monthMap: Record<string, number> = {
    "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
    "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
  };

  const getMonthDateRange = () => {
    if (!month || !year) return { min: '', max: '', disabled: true };
    const monthIndex = monthMap[month];
    if (monthIndex === undefined) return { min: '', max: '', disabled: true };

    const yearNum = parseInt(year);
    const min = `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
    const max = `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-${lastDay}`;
    return { min, max, disabled: false };
  };

  // Calculations
  const budgetSpent = expenditures.reduce((sum, item) => sum + (item.amount || 0), 0);
  const remainingBalance = parseFloat(budgetAllocated || '0') - budgetSpent;
  const budgetStatus = remainingBalance >= 0 ? 'success' : 'danger';
  const budgetStatusText = remainingBalance >= 0
    ? `Within limit (+₹${remainingBalance.toLocaleString('en-IN')})`
    : `Over spent (₹${Math.abs(remainingBalance).toLocaleString('en-IN')})`;

  useEffect(() => {
    checkConnection();
  }, []);

  useEffect(() => {
    if (activeTab === 'summary' && summaryYear && isConnected) {
      loadSummary();
    }
  }, [activeTab, summaryYear, summaryLocation, isConnected]);

  useEffect(() => {
    if (month && year && location && !viewMode && isConnected) {
      checkExistingRecord();
    }
  }, [month, year, location, isConnected]);

  // Update the checkConnection function in ExpenditureManagementScreen.tsx
const checkConnection = async (showAlert = false) => {
  try {
    console.log('🔍 Checking connection to server...');
    console.log('Server URL:', BASE_URL);
    
    setIsConnected(null);
    
    // Use expenditureAPI.healthCheck() instead of standalone healthCheck
    const response = await expenditureAPI.healthCheck();
    
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

  const checkExistingRecord = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server. Please check connection first.');
      return;
    }

    try {
      console.log('🔍 Checking for existing record:', { year, location });
      const res = await expenditureAPI.getSummary({ year, location });
      
      if (res.data && res.data.success) {
        const existing = res.data.data.find((r: any) => r.month === month);

        if (existing) {
          Alert.alert(
            'Record Exists',
            `A record for ${month} ${year} in ${location} already exists.\n\nYou cannot create a duplicate record.\n\nClick OK to load the existing record for editing/adding expenditures.\nClick Cancel to change the selection.`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => setMonth('')
              },
              {
                text: 'OK',
                onPress: () => loadRecordForEditing(existing._id || existing.id)
              }
            ]
          );
        }
      }
    } catch (err: any) {
      console.error('Error checking for existing record:', err);
      
      if (!err.response) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to server. Please check connection.'
        );
      }
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [types.images, types.pdf],
      });

      if (result[0]) {
        const file = result[0];
        
        if (file.size && file.size > 2 * 1024 * 1024) {
          Alert.alert('Error', 'File size should be less than 2MB');
          return;
        }

        const base64 = await RNFS.readFile(file.uri, 'base64');
        const mimeType = file.type || 'application/octet-stream';
        const fileData = `data:${mimeType};base64,${base64}`;

        setNewExpense({
          ...newExpense,
          file: file,
          fileData: fileData,
          fileName: file.name || 'file'
        });
      }
    } catch (err: any) {
      if (err?.code === 'DOCUMENT_PICKER_CANCELED') {
        // User cancelled
      } else {
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const viewUploadedFile = (fileData: string, fileName: string = 'document') => {
    if (!fileData) {
      Alert.alert('Info', 'No file to view');
      return;
    }

    let isImage = false;
    let isPdf = false;

    if (fileData.startsWith('data:image')) {
      isImage = true;
    } else if (fileData.startsWith('data:application/pdf')) {
      isPdf = true;
    } else {
      const extension = fileName ? fileName.split('.').pop()?.toLowerCase() : '';
      if (extension && ['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        isImage = true;
      } else if (extension === 'pdf') {
        isPdf = true;
      }
    }

    setCurrentDocument({
      file: fileData,
      name: fileName,
      type: isImage ? 'image' : isPdf ? 'pdf' : 'file'
    });
    setDocumentType(isImage ? 'image' : isPdf ? 'pdf' : 'file');
    setDocumentModalOpen(true);
  };

  const addExpenditure = () => {
    let type = newExpense.type;
    if (type === "Others" && newExpense.customType.trim()) {
      type = newExpense.customType;
    }

    const newErrors: Record<string, string> = {};

    if (!month) newErrors.month = "Month is required";
    if (!year) newErrors.year = "Year is required";
    if (!location) newErrors.location = "Location is required";
    if (!budgetAllocated) newErrors.budgetAllocated = "Budget Allocated is required";
    if (!type) newErrors.type = "Type is required";
    if (!newExpense.paymentMode) newErrors.paymentMode = "Payment Mode is required";
    if (!newExpense.amount) newErrors.amount = "Amount is required";
    if (!newExpense.date) newErrors.date = "Date is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert('Validation Error', 'Please fill all required fields correctly');
      return;
    }

    if (parseFloat(newExpense.amount) <= 0) {
      Alert.alert('Validation Error', 'Amount must be greater than 0');
      return;
    }

    if (editingExpenditureId) {
      setExpenditures(expenditures.map(exp =>
        exp.id === editingExpenditureId ? {
          ...exp,
          type: type,
          paymentMode: newExpense.paymentMode,
          amount: parseFloat(newExpense.amount) || 0,
          date: newExpense.date,
          documentType: newExpense.documentType || 'Not Applicable',
          fileData: newExpense.fileData,
          fileName: newExpense.fileName,
          remarks: newExpense.remarks
        } : exp
      ));
      setEditingExpenditureId(null);
    } else {
      const newExpenditure: Expenditure = {
        id: Date.now() + Math.random() + '',
        sNo: expenditures.length + 1,
        type: type,
        paymentMode: newExpense.paymentMode,
        amount: parseFloat(newExpense.amount) || 0,
        date: newExpense.date,
        documentType: newExpense.documentType || 'Not Applicable',
        fileData: newExpense.fileData,
        fileName: newExpense.fileName,
        remarks: newExpense.remarks
      };
      setExpenditures([...expenditures, newExpenditure]);
    }

    setNewExpense({
      type: '',
      customType: '',
      paymentMode: '',
      amount: '',
      documentType: '',
      file: null,
      fileData: '',
      fileName: '',
      remarks: '',
      date: ''
    });
    setErrors({});
  };

  const removeExpense = (id: string) => {
    Alert.alert(
      'Delete Expenditure',
      'Are you sure you want to delete this expenditure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const filtered = expenditures.filter((e) => e.id !== id);
            const updated = filtered.map((item, index) => ({
              ...item,
              sNo: index + 1
            }));
            setExpenditures(updated);
            Alert.alert('Success', 'Expenditure deleted successfully');
          }
        }
      ]
    );
  };

  const editExpense = (id: string) => {
    const expenseToEdit = expenditures.find(e => e.id === id);
    if (expenseToEdit) {
      setNewExpense({
        type: expenseToEdit.type,
        customType: expenseToEdit.type === "Others" ? expenseToEdit.type : "",
        paymentMode: expenseToEdit.paymentMode,
        amount: expenseToEdit.amount.toString(),
        documentType: expenseToEdit.documentType,
        file: null,
        fileData: expenseToEdit.fileData || '',
        fileName: expenseToEdit.fileName || '',
        remarks: expenseToEdit.remarks || '',
        date: expenseToEdit.date
      });
      setEditingExpenditureId(id);
      setErrors({});
    }
  };

  const cancelEdit = () => {
    setNewExpense({
      type: '',
      customType: '',
      paymentMode: '',
      amount: '',
      documentType: '',
      file: null,
      fileData: '',
      fileName: '',
      remarks: '',
      date: ''
    });
    setErrors({});
    setEditingExpenditureId(null);
  };

  const clearForm = () => {
    setMonth('');
    setYear('');
    setLocation('');
    setBudgetAllocated('');
    setExpenditures([]);
    setSelectedRecord(null);
    setViewMode(false);
    setNewExpense({
      type: '',
      customType: '',
      paymentMode: '',
      amount: '',
      documentType: '',
      file: null,
      fileData: '',
      fileName: '',
      remarks: '',
      date: ''
    });
    setErrors({});
    setEditingExpenditureId(null);
  };

  const saveRecord = async () => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server. Please check connection first.');
      return;
    }

    if (!month || !year || !location || !budgetAllocated) {
      Alert.alert('Validation Error', 'Month, Year, Location, and Budget Allocated are required');
      return;
    }

    if (expenditures.length === 0) {
      Alert.alert('Warning', 'Please add at least one expenditure record');
      return;
    }

    const record = {
      month,
      year: parseInt(year),
      location,
      budgetAllocated: parseFloat(budgetAllocated || '0'),
      expenditures: expenditures.map(e => ({
        type: e.type,
        paymentMode: e.paymentMode,
        amount: e.amount,
        date: e.date,
        documentType: e.documentType || 'Not Applicable',
        fileName: e.fileName || '',
        fileData: e.fileData || '',
        remarks: e.remarks || ''
      }))
    };

    try {
      setSaveLoading(true);
      setSavingMessage('Saving record to database...');

      console.log('📤 Preparing to save record:', record);

      let response;
      if (viewMode && selectedRecord && selectedRecord._id) {
        console.log('✏️ Updating existing record:', selectedRecord._id);
        response = await expenditureAPI.updateRecord(selectedRecord._id, record);
      } else {
        console.log('➕ Creating new record');
        response = await expenditureAPI.saveMonthlyRecord(record);
      }

      console.log('✅ API Response:', response.data);

      if (response.data && response.data.success) {
        Alert.alert('Success', `✅ Record ${viewMode ? 'updated' : 'saved'} successfully in database!`);

        setSummaryYear(year);
        setSummaryLocation(location);
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
          'Cannot connect to the server. Please check:\n\n' +
          '1. The server is running on Render\n' +
          '2. You have internet connection\n' +
          '3. The server is not sleeping (try accessing in browser)',
          [
            { text: 'Cancel' },
            {
              text: 'Check Connection',
              onPress: () => checkConnection(true)
            }
          ]
        );
      } else {
        const errorMessage = err.response?.data?.message || err.message || 'Unknown error';

        if (err.response?.status === 400 && errorMessage.includes('already exists')) {
          Alert.alert('Error', '❌ Cannot save: A record for this period already exists. Please check the Summary tab to find and edit the existing record.');
        } else {
          Alert.alert('Error', `❌ Save failed: ${errorMessage}`);
        }
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

      if (summaryLocation && summaryLocation !== 'Select All') {
        params.location = summaryLocation;
      }

      console.log('📊 Loading summary with params:', params);
      const res = await expenditureAPI.getSummary(params);
      console.log('📊 Summary response:', res.data);

      if (res.data && res.data.success && res.data.data) {
        const processedData = res.data.data.map((record: any, index: number) => {
          const totalExpenditure = record.expenditures?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0) || 0;
          const budgetAllocated = record.budget || record.budgetAllocated || 0;
          const totalBalance = budgetAllocated - totalExpenditure;
          const status = totalBalance >= 0 ? 'success' : 'danger';
          const statusText = totalBalance >= 0
            ? `Within limit (+₹${totalBalance.toLocaleString('en-IN')})`
            : `Over spent (₹${Math.abs(totalBalance).toLocaleString('en-IN')})`;

          return {
            ...record,
            id: record._id || record.id,
            sNo: index + 1,
            totalExpenditure,
            budgetAllocated,
            totalBalance,
            status,
            statusText
          };
        });

        setSummaryData(processedData);
        console.log('📊 Processed summary data:', processedData);
      } else {
        setSummaryData([]);
      }
    } catch (err: any) {
      console.error('❌ Summary error:', err);
      
      if (!err.response) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to the server. Please check:\n\n' +
          '1. The server is running on Render\n' +
          '2. You have internet connection\n' +
          '3. The server is not sleeping (try accessing in browser)',
          [
            { text: 'Cancel' },
            {
              text: 'Check Connection',
              onPress: () => checkConnection(true)
            }
          ]
        );
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
      const res = await expenditureAPI.getRecordById(recordId);
      console.log('📄 Record details response:', res.data);

      if (res.data && res.data.success) {
        const record = res.data.data;
        const totalExpenditure = record.expenditures?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0) || 0;
        const budgetAllocated = record.budget || record.budgetAllocated || 0;
        const remainingBalance = budgetAllocated - totalExpenditure;
        const budgetStatus = remainingBalance >= 0 ? 'success' : 'danger';
        const budgetStatusText = remainingBalance >= 0
          ? `Within limit (+₹${remainingBalance.toLocaleString('en-IN')})`
          : `Over spent (₹${Math.abs(remainingBalance).toLocaleString('en-IN')})`;

        setDetailedRecord({
          ...record,
          budgetAllocated,
          budgetSpent: totalExpenditure,
          remainingBalance,
          budgetStatus,
          budgetStatusText
        });
        setViewModalOpen(true);
      } else {
        Alert.alert('Info', 'No record found');
      }
    } catch (err) {
      console.error('❌ Error loading record details:', err);
      Alert.alert('Error', 'Failed to load record details');
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
              await expenditureAPI.deleteRecord(recordId);
              Alert.alert('Success', '✅ Record deleted successfully from database');

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
              } else {
                Alert.alert('Error', 'Failed to delete record from database');
              }
            }
          }
        }
      ]
    );
  };

  const loadRecordForEditing = async (recordId: string) => {
    if (!isConnected) {
      Alert.alert('Error', 'Not connected to server. Please check connection first.');
      return;
    }

    try {
      setLoading(true);
      console.log('✏️ Loading record for editing:', recordId);
      const res = await expenditureAPI.getRecordById(recordId);

      if (res.data && res.data.success) {
        const record = res.data.data;
        setSelectedRecord(record);
        setViewMode(true);

        setMonth(record.month);
        setYear(record.year.toString());
        setLocation(record.location);
        setBudgetAllocated((record.budget || record.budgetAllocated || 0).toString());

        const expendituresWithSNo = record.expenditures?.map((exp: any, index: number) => ({
          ...exp,
          id: exp._id || Date.now() + Math.random() + '',
          sNo: index + 1
        })) || [];

        setExpenditures(expendituresWithSNo);
        setActiveTab('manage');

        Alert.alert('Success', 'Record loaded for editing. Make changes and click Save to update.');
      } else {
        Alert.alert('Error', 'Failed to load record');
      }
    } catch (err: any) {
      console.error('❌ Error loading record:', err);
      
      if (!err.response) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to the server. Please check your internet connection.'
        );
      } else {
        Alert.alert('Error', 'Failed to load record for editing');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = async () => {
    if (!month || !year || !location || !budgetAllocated) {
      Alert.alert('Warning', 'Please fill all required fields: Month, Year, Location, and Budget Allocated');
      return;
    }

    const headers = ["Month", "Year", "Location", "Budget Allocated (₹)", "Budget Spent (₹)", "Remaining Balance (₹)", "Status"];
    const mainRow = [
      month,
      year,
      location,
      budgetAllocated,
      budgetSpent.toFixed(2),
      remainingBalance.toFixed(2),
      budgetStatusText
    ];

    const expenditureHeaders = ["S.No", "Date", "Type of Expenditure", "Mode of Payment", "Amount (₹)", "Documents", "Remarks"];
    const expenditureRows = expenditures.map(exp => [
      exp.sNo.toString(),
      exp.date,
      exp.type,
      exp.paymentMode,
      exp.amount.toFixed(2),
      exp.fileName || "-",
      exp.remarks || "-"
    ]);

    let csvContent = "EXPENDITURE MANAGEMENT RECORD\n\n";
    csvContent += "Summary:\n";
    csvContent += headers.join(',') + '\n';
    csvContent += mainRow.join(',') + '\n\n';

    csvContent += "Expenditure Details:\n";
    csvContent += expenditureHeaders.join(',') + '\n';
    expenditureRows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const fileName = `expenditure_${month}_${year}_${location}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csvContent, 'utf8');
      
      const shareOptions = {
        title: 'Export Expenditure Data',
        message: 'Expenditure Management Report',
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

    const headers = ["S.No", "Month", "Location", "Budget Allocated (₹)", "Budget Spent (₹)", "Total Balance (₹)", "Budget Status"];

    const rows = summaryData.map(row => [
      row.sNo.toString(),
      row.month,
      row.location || '-',
      row.budgetAllocated?.toFixed(2) || "0.00",
      row.totalExpenditure?.toFixed(2) || "0.00",
      row.totalBalance?.toFixed(2) || "0.00",
      row.statusText || "-"
    ]);

    let csvContent = `EXPENDITURE SUMMARY REPORT - ${summaryYear}`;
    if (summaryLocation && summaryLocation !== "Select All") {
      csvContent += ` - ${summaryLocation}`;
    }
    csvContent += '\n\n';

    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const overallSummary = summaryData.reduce((acc: any, row) => {
      return {
        totalBudgetAllocated: acc.totalBudgetAllocated + (row.budgetAllocated || 0),
        totalBudgetSpent: acc.totalBudgetSpent + (row.totalExpenditure || 0),
        monthsCount: acc.monthsCount + 1
      };
    }, { totalBudgetAllocated: 0, totalBudgetSpent: 0, monthsCount: 0 });

    const overallBalance = overallSummary.totalBudgetAllocated - overallSummary.totalBudgetSpent;

    csvContent += '\nOverall Summary:\n';
    csvContent += `Year,${summaryYear}\n`;
    if (summaryLocation && summaryLocation !== "Select All") {
      csvContent += `Location,${summaryLocation}\n`;
    }
    csvContent += `Total Budget Allocated,₹${overallSummary.totalBudgetAllocated.toFixed(2)}\n`;
    csvContent += `Total Budget Spent,₹${overallSummary.totalBudgetSpent.toFixed(2)}\n`;
    csvContent += `Overall Balance,₹${overallBalance.toFixed(2)}\n`;
    csvContent += `Average Monthly Spend,₹${(overallSummary.totalBudgetSpent / overallSummary.monthsCount).toFixed(2)}\n`;
    csvContent += `Number of Months,${overallSummary.monthsCount}\n`;

    const fileName = `expenditure_summary_${summaryYear}_${summaryLocation || 'all'}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csvContent, 'utf8');
      
      const shareOptions = {
        title: 'Export Summary Data',
        message: 'Expenditure Summary Report',
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

  const renderDocumentModal = () => (
    <Modal
      visible={documentModalOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setDocumentModalOpen(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 600, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>Document Viewer</Text>
            <TouchableOpacity onPress={() => setDocumentModalOpen(false)}>
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 16 }}>
            {documentType === 'image' && currentDocument && (
              <Image source={{ uri: currentDocument.file }} style={{ width: '100%', height: 400, resizeMode: 'contain' }} />
            )}
            {documentType === 'pdf' && currentDocument && (
              <View style={{ height: 400, justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="picture-as-pdf" size={80} color={COLORS.red} />
                <Text style={{ marginTop: 16, fontSize: 14, color: COLORS.textPrimary }}>{currentDocument.name}</Text>
                <Text style={{ marginTop: 8, fontSize: 12, color: COLORS.gray }}>PDF preview not available</Text>
              </View>
            )}
            {documentType === 'file' && currentDocument && (
              <View style={{ height: 200, justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="insert-drive-file" size={80} color={COLORS.blue} />
                <Text style={{ marginTop: 16, fontSize: 14, color: COLORS.textPrimary }}>{currentDocument.name}</Text>
              </View>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
            <Text style={{ fontSize: 12, color: COLORS.gray }} numberOfLines={1} ellipsizeMode="middle">
              File: {currentDocument?.name}
            </Text>
            <TouchableOpacity
              onPress={async () => {
                if (currentDocument) {
                  try {
                    const fileName = `document_${Date.now()}.${documentType === 'image' ? 'png' : 'pdf'}`;
                    const filePath = Platform.OS === 'android'
                      ? `${RNFS.CachesDirectoryPath}/${fileName}`
                      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

                    const base64Data = currentDocument.file.split(',')[1] || currentDocument.file;
                    await RNFS.writeFile(filePath, base64Data, 'base64');

                    const shareOptions = {
                      title: 'Share Document',
                      url: `file://${filePath}`,
                      type: documentType === 'image' ? 'image/png' : 'application/pdf',
                      failOnCancel: false,
                    };

                    await Share.open(shareOptions);
                  } catch (error: any) {
                    if (error.message && error.message.includes('User did not share')) {
                      return;
                    }
                    Alert.alert('Error', 'Failed to share document');
                  }
                }
              }}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.green, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 }}
            >
              <Icon name="file-download" size={16} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '500', marginLeft: 4 }}>Download</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

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
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>Expenditure Details</Text>
              {detailedRecord && (
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  {monthNames[detailedRecord.month] || detailedRecord.month} {detailedRecord.year} - {detailedRecord.location}
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
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Budget Allocated</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.blue }}>₹{detailedRecord.budgetAllocated?.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
                <View style={{ width: '33.33%', padding: 4 }}>
                  <View style={{ backgroundColor: '#FFE6E6', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Budget Spent</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.red }}>₹{detailedRecord.budgetSpent?.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
                <View style={{ width: '33.33%', padding: 4 }}>
                  <View style={{ backgroundColor: detailedRecord.remainingBalance < 0 ? '#FFE6E6' : '#E6F7E6', padding: 12, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Remaining</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: detailedRecord.remainingBalance < 0 ? COLORS.red : COLORS.green }}>₹{detailedRecord.remainingBalance?.toLocaleString('en-IN')}</Text>
                  </View>
                </View>
              </View>

              {/* Status */}
              <View style={{ marginBottom: 16, padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8 }}>
                <Text style={{ fontSize: 13, color: detailedRecord.budgetStatus === 'danger' ? COLORS.red : COLORS.green }}>
                  Status: {detailedRecord.budgetStatusText}
                </Text>
              </View>

              {/* Expenditures Table */}
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>Expenditure Records</Text>

              <ScrollView horizontal>
                <View>
                  {/* Table Header */}
                  <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 4 }}>
                    <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'center' }}>S.No</Text>
                    <Text style={{ width: 90, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Date</Text>
                    <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Type</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Payment</Text>
                    <Text style={{ width: 90, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>Amount</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Doc</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Remarks</Text>
                  </View>

                  {/* Table Rows */}
                  {detailedRecord.expenditures?.map((exp: any, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                      <Text style={{ width: 50, fontSize: 11, textAlign: 'center', color: COLORS.textPrimary }}>{idx + 1}</Text>
                      <Text style={{ width: 90, fontSize: 11, color: COLORS.textSecondary }}>{new Date(exp.date).toLocaleDateString()}</Text>
                      <Text style={{ width: 120, fontSize: 11, color: COLORS.textPrimary, fontWeight: '500' }}>{exp.type}</Text>
                      <Text style={{ width: 100, fontSize: 11, color: COLORS.textSecondary }}>{exp.paymentMode}</Text>
                      <Text style={{ width: 90, fontSize: 11, color: COLORS.red, fontWeight: '600', textAlign: 'right' }}>₹{exp.amount?.toLocaleString('en-IN')}</Text>
                      <Text style={{ width: 80, fontSize: 11, color: COLORS.textSecondary }}>
                        {exp.fileData ? (
                          <TouchableOpacity onPress={() => viewUploadedFile(exp.fileData, exp.fileName)}>
                            <Icon name="visibility" size={16} color={COLORS.blue} />
                          </TouchableOpacity>
                        ) : '-'}
                      </Text>
                      <Text style={{ width: 100, fontSize: 11, color: COLORS.textSecondary }}>{exp.remarks || '-'}</Text>
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

  const monthDateRange = getMonthDateRange();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Expenditure Management" 
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
              Manage Expenditure
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
            {/* Header Information */}
            <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Enter Monthly Details</Text>
                {viewMode && selectedRecord && (
                  <View style={{ backgroundColor: COLORS.lightBlue, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                    <Text style={{ fontSize: 12, color: COLORS.blue }}>Editing: {monthNames[month] || month} {year} - {location}</Text>
                  </View>
                )}
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {/* Month Picker */}
                <View style={{ width: '50%', padding: 4 }}>
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
                      selectedValue={month}
                      onValueChange={(value: string) => {
                        setMonth(value);
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
                      <PickerItem label="Select Month" value="" color={COLORS.gray} />
                      {months.map(m => (
                        <PickerItem key={m} label={m} value={m} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                  {errors.month && <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.month}</Text>}
                </View>

                {/* Year Picker */}
                <View style={{ width: '50%', padding: 4 }}>
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
                      selectedValue={year}
                      onValueChange={(value: string) => {
                        setYear(value);
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
                      <PickerItem label="Select Year" value="" color={COLORS.gray} />
                      {years.map(y => (
                        <PickerItem key={y} label={y} value={y} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                  {errors.year && <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.year}</Text>}
                </View>

                {/* Location Picker */}
                <View style={{ width: '50%', padding: 4 }}>
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
                      selectedValue={location}
                      onValueChange={(value: string) => {
                        setLocation(value);
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
                      <PickerItem label="Select Location" value="" color={COLORS.gray} />
                      {locations.map(l => (
                        <PickerItem key={l} label={l} value={l} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                  {errors.location && <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.location}</Text>}
                </View>

                <View style={{ width: '50%', padding: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Budget Allocated (₹) *</Text>
                  <TextInput
                    value={budgetAllocated}
                    onChangeText={(text) => {
                      if (/^\d*\.?\d*$/.test(text) && text.length <= 8) {
                        setBudgetAllocated(text);
                      }
                      if (errors.budgetAllocated) {
                        const newErrors = { ...errors };
                        delete newErrors.budgetAllocated;
                        setErrors(newErrors);
                      }
                    }}
                    placeholder="Enter budget amount"
                    keyboardType="numeric"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.budgetAllocated ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  {errors.budgetAllocated && <Text style={{ color: COLORS.red, fontSize: 11, marginTop: 2 }}>{errors.budgetAllocated}</Text>}
                </View>
              </View>
            </View>

            {/* Financial Summary Cards */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
              <View style={{ width: '33.33%', padding: 4 }}>
                <View style={{ backgroundColor: COLORS.lightBlue, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.blue + '20' }}>
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: 4 }}>Budget Allocated</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.blue }}>₹{parseFloat(budgetAllocated || '0').toLocaleString('en-IN')}</Text>
                </View>
              </View>
              <View style={{ width: '33.33%', padding: 4 }}>
                <View style={{ backgroundColor: '#FFE6E6', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.red + '20' }}>
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: 4 }}>Budget Spent</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.red }}>₹{budgetSpent.toLocaleString('en-IN')}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.gray }}>{expenditures.length} records</Text>
                </View>
              </View>
              <View style={{ width: '33.33%', padding: 4 }}>
                <View style={{ 
                  backgroundColor: budgetStatus === 'danger' ? '#FFE6E6' : '#E6F7E6', 
                  padding: 12, 
                  borderRadius: 8, 
                  borderWidth: 1, 
                  borderColor: budgetStatus === 'danger' ? COLORS.red + '20' : COLORS.green + '20' 
                }}>
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: 4 }}>Remaining Balance</Text>
                  <Text style={{ fontSize: 16, fontWeight: 'bold', color: budgetStatus === 'danger' ? COLORS.red : COLORS.green }}>
                    ₹{remainingBalance.toLocaleString('en-IN')}
                  </Text>
                  <Text style={{ fontSize: 10, color: COLORS.gray }}>{budgetStatusText}</Text>
                </View>
              </View>
            </View>

            {/* Add New/Edit Expenditure Form */}
            <View style={{ backgroundColor: COLORS.filterBg, padding: 16, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 }}>
                {editingExpenditureId ? 'Edit Expenditure' : 'Add New Expenditure'}
              </Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ width: 850 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {/* Type Picker */}
                    <View style={{ width: 160, padding: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Type *</Text>
                      <View style={{ 
                        borderWidth: 1, 
                        borderColor: errors.type ? COLORS.red : COLORS.border, 
                        borderRadius: 8, 
                        backgroundColor: COLORS.dropdownBg,
                        justifyContent: 'center',
                        minHeight: 48,
                      }}>
                        <Picker
                          selectedValue={newExpense.type}
                          onValueChange={(value: string) => {
                            setNewExpense({ ...newExpense, type: value });
                            if (errors.type) {
                              const newErrors = { ...errors };
                              delete newErrors.type;
                              setErrors(newErrors);
                            }
                          }}
                          style={{ 
                            height: Platform.OS === 'ios' ? 48 : 48,
                            color: COLORS.dropdownText,
                            marginLeft: Platform.OS === 'android' ? -8 : 0,
                            marginRight: Platform.OS === 'android' ? -8 : 0,
                          }}
                          dropdownIconColor={COLORS.primary}
                        >
                          <PickerItem label="Select Type" value="" color={COLORS.gray} />
                          {expenditureTypes.map(type => (
                            <PickerItem key={type} label={type} value={type} color={COLORS.dropdownText} />
                          ))}
                        </Picker>
                      </View>
                      {newExpense.type === 'Others' && (
                        <TextInput
                          value={newExpense.customType}
                          onChangeText={(text) => setNewExpense({ ...newExpense, customType: text })}
                          placeholder="Enter custom type"
                          placeholderTextColor={COLORS.gray}
                          style={{
                            borderWidth: 1,
                            borderColor: COLORS.border,
                            borderRadius: 8,
                            padding: 10,
                            fontSize: 12,
                            marginTop: 4,
                            backgroundColor: COLORS.white,
                            color: COLORS.textPrimary,
                          }}
                        />
                      )}
                    </View>

                    {/* Payment Mode Picker */}
                    <View style={{ width: 140, padding: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Payment Mode *</Text>
                      <View style={{ 
                        borderWidth: 1, 
                        borderColor: errors.paymentMode ? COLORS.red : COLORS.border, 
                        borderRadius: 8, 
                        backgroundColor: COLORS.dropdownBg,
                        justifyContent: 'center',
                        minHeight: 48,
                      }}>
                        <Picker
                          selectedValue={newExpense.paymentMode}
                          onValueChange={(value: string) => {
                            setNewExpense({ ...newExpense, paymentMode: value });
                            if (errors.paymentMode) {
                              const newErrors = { ...errors };
                              delete newErrors.paymentMode;
                              setErrors(newErrors);
                            }
                          }}
                          style={{ 
                            height: Platform.OS === 'ios' ? 48 : 48,
                            color: COLORS.dropdownText,
                            marginLeft: Platform.OS === 'android' ? -8 : 0,
                            marginRight: Platform.OS === 'android' ? -8 : 0,
                          }}
                          dropdownIconColor={COLORS.primary}
                        >
                          <PickerItem label="Select" value="" color={COLORS.gray} />
                          {paymentModes.map(mode => (
                            <PickerItem key={mode} label={mode} value={mode} color={COLORS.dropdownText} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    {/* Amount Input */}
                    <View style={{ width: 110, padding: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Amount (₹) *</Text>
                      <TextInput
                        value={newExpense.amount}
                        onChangeText={(text) => {
                          if (/^\d*\.?\d*$/.test(text) && text.length <= 8) {
                            setNewExpense({ ...newExpense, amount: text });
                          }
                          if (errors.amount) {
                            const newErrors = { ...errors };
                            delete newErrors.amount;
                            setErrors(newErrors);
                          }
                        }}
                        placeholder="Amount"
                        placeholderTextColor={COLORS.gray}
                        keyboardType="numeric"
                        style={{
                          borderWidth: 1,
                          borderColor: errors.amount ? COLORS.red : COLORS.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 12,
                          backgroundColor: COLORS.white,
                          color: COLORS.textPrimary,
                          minHeight: 48,
                        }}
                      />
                    </View>

                    {/* Date Input */}
                    <View style={{ width: 130, padding: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Date *</Text>
                      <TextInput
                        value={newExpense.date}
                        onChangeText={(text) => {
                          setNewExpense({ ...newExpense, date: text });
                          if (errors.date) {
                            const newErrors = { ...errors };
                            delete newErrors.date;
                            setErrors(newErrors);
                          }
                        }}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={COLORS.gray}
                        editable={!monthDateRange.disabled}
                        style={{
                          borderWidth: 1,
                          borderColor: errors.date ? COLORS.red : COLORS.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 12,
                          backgroundColor: monthDateRange.disabled ? COLORS.filterBg : COLORS.white,
                          color: COLORS.textPrimary,
                          minHeight: 48,
                        }}
                      />
                    </View>

                    {/* Document Type Picker */}
                    <View style={{ width: 110, padding: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Document Type</Text>
                      <View style={{ 
                        borderWidth: 1, 
                        borderColor: COLORS.border, 
                        borderRadius: 8, 
                        backgroundColor: COLORS.dropdownBg,
                        justifyContent: 'center',
                        minHeight: 48,
                      }}>
                        <Picker
                          selectedValue={newExpense.documentType}
                          onValueChange={(value: string) => setNewExpense({ ...newExpense, documentType: value })}
                          style={{ 
                            height: Platform.OS === 'ios' ? 48 : 48,
                            color: COLORS.dropdownText,
                            marginLeft: Platform.OS === 'android' ? -8 : 0,
                            marginRight: Platform.OS === 'android' ? -8 : 0,
                          }}
                          dropdownIconColor={COLORS.primary}
                        >
                          <PickerItem label="Select" value="" color={COLORS.gray} />
                          {documentTypes.map(doc => (
                            <PickerItem key={doc} label={doc} value={doc} color={COLORS.dropdownText} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    {/* File Upload */}
                    <View style={{ width: 120, padding: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Upload File</Text>
                      <TouchableOpacity
                        onPress={handleFileUpload}
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          borderRadius: 8,
                          padding: 12,
                          backgroundColor: COLORS.white,
                          alignItems: 'center',
                          justifyContent: 'center',
                          minHeight: 48,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: COLORS.blue }}>Choose File</Text>
                      </TouchableOpacity>
                      {newExpense.fileName ? (
                        <Text style={{ fontSize: 10, color: COLORS.gray, marginTop: 2 }} numberOfLines={1}>{newExpense.fileName}</Text>
                      ) : null}
                    </View>

                    {/* Remarks Input */}
                    <View style={{ width: 130, padding: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Remarks</Text>
                      <TextInput
                        value={newExpense.remarks}
                        onChangeText={(text) => setNewExpense({ ...newExpense, remarks: text })}
                        placeholder="Remarks"
                        placeholderTextColor={COLORS.gray}
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          borderRadius: 8,
                          padding: 12,
                          fontSize: 12,
                          backgroundColor: COLORS.white,
                          color: COLORS.textPrimary,
                          minHeight: 48,
                        }}
                      />
                    </View>

                    {/* Action Buttons */}
                    <View style={{ width: 110, padding: 4, justifyContent: 'flex-end' }}>
                      <View style={{ flexDirection: 'row', height: 48 }}>
                        {editingExpenditureId && (
                          <TouchableOpacity
                            onPress={cancelEdit}
                            style={{
                              flex: 1,
                              backgroundColor: COLORS.gray,
                              marginRight: 4,
                              borderRadius: 6,
                              alignItems: 'center',
                              justifyContent: 'center',
                              height: 48,
                            }}
                          >
                            <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '500' }}>Cancel</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={addExpenditure}
                          style={{
                            flex: 1,
                            backgroundColor: COLORS.primary,
                            borderRadius: 6,
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 48,
                          }}
                        >
                          <Text style={{ color: COLORS.white, fontSize: 12, fontWeight: '500' }}>
                            {editingExpenditureId ? 'Update' : 'Add'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Expenditure Table */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>
                Expenditure Records ({expenditures.length} items)
              </Text>

              <ScrollView horizontal>
                <View>
                  {/* Table Header */}
                  <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 4 }}>
                    <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'center' }}>S.No</Text>
                    <Text style={{ width: 90, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Date</Text>
                    <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Type</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Payment</Text>
                    <Text style={{ width: 90, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>Amount</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Doc</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Location</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Remarks</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Actions</Text>
                  </View>

                  {/* Table Rows */}
                  {expenditures.length === 0 ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Text style={{ color: COLORS.gray, fontSize: 14 }}>No expenditure records added yet.</Text>
                    </View>
                  ) : (
                    expenditures.map((exp) => (
                      <View key={exp.id} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                        <Text style={{ width: 50, fontSize: 11, textAlign: 'center', color: COLORS.textPrimary }}>{exp.sNo}</Text>
                        <Text style={{ width: 90, fontSize: 11, color: COLORS.textSecondary }}>{exp.date}</Text>
                        <Text style={{ width: 120, fontSize: 11, color: COLORS.textPrimary, fontWeight: '500' }}>{exp.type}</Text>
                        <Text style={{ width: 100, fontSize: 11, color: COLORS.textSecondary }}>{exp.paymentMode}</Text>
                        <Text style={{ width: 90, fontSize: 11, color: COLORS.red, fontWeight: '600', textAlign: 'right' }}>₹{exp.amount.toLocaleString('en-IN')}</Text>
                        <Text style={{ width: 80, fontSize: 11, color: COLORS.textSecondary }}>
                          {exp.fileData ? (
                            <TouchableOpacity onPress={() => viewUploadedFile(exp.fileData || '', exp.fileName)}>
                              <Icon name="visibility" size={16} color={COLORS.blue} />
                            </TouchableOpacity>
                          ) : '-'}
                        </Text>
                        <Text style={{ width: 100, fontSize: 11, color: COLORS.textSecondary }}>{location || '-'}</Text>
                        <Text style={{ width: 100, fontSize: 11, color: COLORS.textSecondary }}>{exp.remarks || '-'}</Text>
                        <View style={{ width: 80, flexDirection: 'row' }}>
                          <TouchableOpacity onPress={() => editExpense(exp.id)} style={{ padding: 4 }}>
                            <Icon name="edit" size={16} color={COLORS.blue} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => removeExpense(exp.id)} style={{ padding: 4 }}>
                            <Icon name="delete" size={16} color={COLORS.red} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Save/Update Button */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
              <TouchableOpacity
                onPress={clearForm}
                style={{ paddingHorizontal: 20, paddingVertical: 10, marginRight: 8, borderWidth: 1, borderColor: COLORS.gray, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Clear Form</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveRecord}
                disabled={saveLoading || !isConnected}
                style={{ 
                  paddingHorizontal: 20, 
                  paddingVertical: 10, 
                  backgroundColor: (saveLoading || !isConnected) ? COLORS.gray : COLORS.primary, 
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
                Summary Filters - {summaryYear} {summaryLocation && summaryLocation !== "Select All" ? `- ${summaryLocation}` : ''}
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
                      onValueChange={(value: string) => setSummaryMonth(value)}
                      style={{ 
                        height: Platform.OS === 'ios' ? 48 : 48,
                        color: COLORS.dropdownText,
                        marginLeft: Platform.OS === 'android' ? -8 : 0,
                        marginRight: Platform.OS === 'android' ? -8 : 0,
                      }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <PickerItem label="All Months" value="" color={COLORS.gray} />
                      {months.map(m => (
                        <PickerItem key={m} label={m} value={m} color={COLORS.dropdownText} />
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
                      <PickerItem label="Select Year" value="" color={COLORS.gray} />
                      {years.map(y => (
                        <PickerItem key={y} label={y} value={y} color={COLORS.dropdownText} />
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
                      <PickerItem label="Select All" value="" color={COLORS.gray} />
                      {locations.map(l => (
                        <PickerItem key={l} label={l} value={l} color={COLORS.dropdownText} />
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

            {/* Summary Header */}
            {summaryData.length > 0 && !loading && (
              <View style={{ backgroundColor: COLORS.lightBlue, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>
                      Summary for {summaryYear}
                      {summaryLocation && summaryLocation !== "Select All" ? ` - ${summaryLocation}` : ' (All Locations)'}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                      {summaryData.length} month{summaryData.length !== 1 ? 's' : ''} of data
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: COLORS.gray }}>Generated: {new Date().toLocaleDateString()}</Text>
                </View>
              </View>
            )}

            {/* Summary Table */}
            {loading ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading summary data...</Text>
              </View>
            ) : summaryData.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border }}>
                <Icon name="bar-chart" size={64} color={COLORS.lightGray} />
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
                      <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4, textAlign: 'right' }}>Budget (₹)</Text>
                      <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4, textAlign: 'right' }}>Spent (₹)</Text>
                      <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4, textAlign: 'right' }}>Balance (₹)</Text>
                      <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Status</Text>
                      <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                    </View>

                    {/* Table Rows */}
                    {summaryData
                      .filter(row => !summaryMonth || row.month === summaryMonth)
                      .map((row, index) => (
                        <View key={row.id} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                          <Text style={{ width: 50, fontSize: 12, textAlign: 'center', color: COLORS.textPrimary }}>{row.sNo}</Text>
                          <Text style={{ width: 100, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{monthNames[row.month] || row.month}</Text>
                          <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{row.location || '-'}</Text>
                          <Text style={{ width: 120, fontSize: 12, color: COLORS.blue, textAlign: 'right' }}>₹{row.budgetAllocated?.toLocaleString('en-IN')}</Text>
                          <Text style={{ width: 120, fontSize: 12, color: COLORS.red, textAlign: 'right' }}>₹{row.totalExpenditure?.toLocaleString('en-IN')}</Text>
                          <Text style={{ width: 120, fontSize: 12, color: row.totalBalance < 0 ? COLORS.red : COLORS.green, fontWeight: '600', textAlign: 'right' }}>
                            ₹{row.totalBalance?.toLocaleString('en-IN')}
                          </Text>
                          <View style={{ width: 150, flexDirection: 'row', alignItems: 'center' }}>
                            <Icon name={row.status === 'danger' ? 'warning' : 'check-circle'} size={14} color={row.status === 'danger' ? COLORS.red : COLORS.green} />
                            <Text style={{ fontSize: 11, color: row.status === 'danger' ? COLORS.red : COLORS.green, marginLeft: 4 }}>{row.statusText}</Text>
                          </View>
                          <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center' }}>
                            <TouchableOpacity onPress={() => viewRecordDetails(row.id)} style={{ padding: 6 }}>
                              <Icon name="visibility" size={18} color={COLORS.blue} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => loadRecordForEditing(row.id)} style={{ padding: 6 }}>
                              <Icon name="edit" size={18} color={COLORS.green} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteRecord(row.id)} style={{ padding: 6 }}>
                              <Icon name="delete" size={18} color={COLORS.red} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                  </View>
                </ScrollView>

                {/* Overall Summary Statistics */}
                {summaryData.length > 0 && (
                  <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.filterBg }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      <View style={{ width: '25%', padding: 4 }}>
                        <View style={{ padding: 8 }}>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>Total Budget</Text>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.blue }}>
                            ₹{summaryData.reduce((sum, row) => sum + (row.budgetAllocated || 0), 0).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                      <View style={{ width: '25%', padding: 4 }}>
                        <View style={{ padding: 8 }}>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>Total Spent</Text>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.red }}>
                            ₹{summaryData.reduce((sum, row) => sum + (row.totalExpenditure || 0), 0).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                      <View style={{ width: '25%', padding: 4 }}>
                        <View style={{ padding: 8 }}>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>Overall Balance</Text>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: summaryData.reduce((sum, row) => sum + (row.totalBalance || 0), 0) < 0 ? COLORS.red : COLORS.green }}>
                            ₹{summaryData.reduce((sum, row) => sum + (row.totalBalance || 0), 0).toLocaleString('en-IN')}
                          </Text>
                        </View>
                      </View>
                      <View style={{ width: '25%', padding: 4 }}>
                        <View style={{ padding: 8 }}>
                          <Text style={{ fontSize: 11, color: COLORS.gray }}>Avg Monthly</Text>
                          <Text style={{ fontSize: 14, fontWeight: 'bold', color: COLORS.purple }}>
                            ₹{(summaryData.reduce((sum, row) => sum + (row.totalExpenditure || 0), 0) / summaryData.length).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
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
        marqueeText="Expenditure Management • Budget Tracking • "
      />

      {/* Modals */}
      {renderViewModal()}
      {renderDocumentModal()}
    </SafeAreaView>
  );
};

export default ExpenditureManagementScreen;