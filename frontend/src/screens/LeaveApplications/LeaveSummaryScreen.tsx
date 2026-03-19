// src/screens/LeaveManagement/LeaveSummaryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { leaveAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';
import * as XLSX from 'xlsx';

const { width } = Dimensions.get('window');

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
  approved: '#10B981',
  pending: '#F59E0B',
  rejected: '#EF4444',
  blue: '#3498db',
  green: '#27ae60',
  red: '#e74c3c',
  orange: '#f39c12',
  purple: '#9b59b6',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC',
  tableHeader: '#3498db'
};

interface LeaveApplication {
  id: string;
  employeeName: string;
  employeeId: string;
  leaveType: string;
  startDateRaw: string;
  endDateRaw: string;
  fromDate: string;
  toDate: string;
  fromMonth: number;
  fromYear: number;
  days: number;
  totalLeaveDays: number;
  status: 'Approved' | 'Pending' | 'Rejected';
  location: string;
}

const LeaveSummaryScreen = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Filter states
  const [selectedYear, setSelectedYear] = useState<string | number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string | number>(currentMonth);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  
  // Modal states
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showLeaveTypePicker, setShowLeaveTypePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<LeaveApplication | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [editDates, setEditDates] = useState({ startDate: '', endDate: '' });

  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);
  
  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  const locations = ['Hosur', 'Chennai'];
  const leaveTypes = ['Casual Leave', 'Sick Leave', 'Privilege Leave', 'Bereavement Leave'];
  const statusOptions = ['Approved', 'Pending', 'Rejected'];

  useEffect(() => {
    loadLeaves();
  }, []);

  useEffect(() => {
    const isApplied = selectedYear !== currentYear ||
      selectedMonth !== currentMonth ||
      selectedEmployeeId !== '' ||
      selectedLeaveType !== 'all' ||
      selectedLocation !== 'all' ||
      selectedStatus !== 'all';
    setIsFilterApplied(isApplied);
  }, [selectedYear, selectedMonth, selectedEmployeeId, selectedLeaveType, selectedLocation, selectedStatus]);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const res = await leaveAPI.list();
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped: LeaveApplication[] = items.map((l: any) => ({
        id: l._id,
        employeeName: l.employeeName || l.name || '',
        employeeId: l.employeeId || '',
        leaveType: l.leaveType === 'CL' ? 'Casual Leave' : 
                  l.leaveType === 'SL' ? 'Sick Leave' : 
                  l.leaveType === 'PL' ? 'Privilege Leave' : 
                  l.leaveType === 'BEREAVEMENT' ? 'Bereavement Leave' : l.leaveType,
        startDateRaw: l.startDate,
        endDateRaw: l.endDate,
        fromDate: new Date(l.startDate).toLocaleDateString('en-IN'),
        toDate: new Date(l.endDate).toLocaleDateString('en-IN'),
        fromMonth: new Date(l.startDate).getMonth() + 1,
        fromYear: new Date(l.startDate).getFullYear(),
        days: l.totalDays || 0,
        totalLeaveDays: l.totalDays || 0,
        status: l.status || 'Pending',
        location: l.location || l.branch || '—'
      }));
      setLeaveApplications(mapped);
    } catch (error) {
      console.error('Error loading leaves:', error);
      Alert.alert('Error', 'Failed to load leave applications');
    } finally {
      setLoading(false);
    }
  };

  const overlapsSelectedMonth = (startISO: string, endISO: string, year: string | number, month: string | number) => {
    if (year === 'all' || month === 'all') return true;
    const leaveStart = new Date(startISO);
    const leaveEnd = new Date(endISO);
    const windowStart = new Date(Number(year), Number(month) - 1, 1, 0, 0, 0, 0);
    const windowEnd = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    return leaveStart <= windowEnd && leaveEnd >= windowStart;
  };

  const filteredApplications = leaveApplications
    .filter(app => {
      const matchesMonthWindow = overlapsSelectedMonth(app.startDateRaw, app.endDateRaw, selectedYear, selectedMonth);
      const matchesEmployeeId = selectedEmployeeId === '' ||
        (app.employeeId || '').toLowerCase().includes(selectedEmployeeId.toLowerCase());
      const matchesLeaveType = selectedLeaveType === 'all' || app.leaveType === selectedLeaveType;
      const matchesLocation = selectedLocation === 'all' || app.location === selectedLocation;
      const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
      return matchesMonthWindow && matchesEmployeeId && matchesLeaveType && matchesLocation && matchesStatus;
    })
    .sort((a, b) => {
      const idA = (a.employeeId || '').toString().toLowerCase();
      const idB = (b.employeeId || '').toString().toLowerCase();
      if (idA < idB) return -1;
      if (idA > idB) return 1;
      return 0;
    });

  const totalLeaveDays = filteredApplications.reduce((sum, app) => sum + app.days, 0);

  const handleFilterChange = (filterType: string, value: any) => {
    switch (filterType) {
      case 'year':
        setSelectedYear(value);
        setShowYearPicker(false);
        break;
      case 'month':
        setSelectedMonth(value);
        setShowMonthPicker(false);
        break;
      case 'employeeId':
        setSelectedEmployeeId(value);
        break;
      case 'leaveType':
        setSelectedLeaveType(value);
        setShowLeaveTypePicker(false);
        break;
      case 'location':
        setSelectedLocation(value);
        setShowLocationPicker(false);
        break;
      case 'status':
        setSelectedStatus(value);
        setShowStatusPicker(false);
        break;
    }
  };

  const handleClearAllFilters = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    setSelectedEmployeeId('');
    setSelectedLeaveType('all');
    setSelectedLocation('all');
    setSelectedStatus('all');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLeaves();
    setIsRefreshing(false);
  };

  const handleView = (item: LeaveApplication) => {
    setSelectedApplication(item);
    setShowViewModal(true);
  };

  const handleEdit = (item: LeaveApplication) => {
    setSelectedApplication(item);
    setEditReason(item.leaveType);
    setEditDates({ 
      startDate: item.startDateRaw.split('T')[0], 
      endDate: item.endDateRaw.split('T')[0] 
    });
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Leave Application',
      'Are you sure you want to delete this leave application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveAPI.remove(id);
              setLeaveApplications(prev => prev.filter(item => item.id !== id));
              Alert.alert('Success', 'Leave application deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete leave application');
            }
          }
        }
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!selectedApplication) return;
    try {
      await leaveAPI.update(selectedApplication.id, {
        startDate: editDates.startDate,
        endDate: editDates.endDate,
        leaveType: editReason
      });
      Alert.alert('Success', 'Leave application updated successfully');
      setShowEditModal(false);
      loadLeaves();
    } catch (error) {
      Alert.alert('Error', 'Failed to update leave application');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: 'approve' }));
      const res = await leaveAPI.updateStatus(id, 'Approved');
      const updated = res.data;
      setLeaveApplications(prev => 
        prev.map(a => a.id === id ? { ...a, status: updated.status } : a)
      );
      Alert.alert('Success', 'Leave approved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to approve leave');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: 'reject' }));
      const res = await leaveAPI.updateStatus(id, 'Rejected');
      const updated = res.data;
      setLeaveApplications(prev => 
        prev.map(a => a.id === id ? { ...a, status: updated.status } : a)
      );
      Alert.alert('Success', 'Leave rejected successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject leave');
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  // Fixed Excel Download Function
  const handleDownloadExcel = async () => {
    setShowDownloadOptions(false);
    
    try {
      const selectedMonthName = months.find(m => m.value === selectedMonth)?.name || 'All';
      
      // Prepare data for Excel
      const data = filteredApplications.map((app, index) => ({
        'S.No': index + 1,
        'Employee ID': app.employeeId,
        'Employee Name': app.employeeName,
        'Leave Type': app.leaveType,
        'Location': app.location,
        'Start Date': app.fromDate,
        'End Date': app.toDate,
        'Total Days': app.totalLeaveDays,
        'Status': app.status
      }));

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths
      const colWidths = [
        { wch: 5 },   // S.No
        { wch: 12 },  // Employee ID
        { wch: 25 },  // Employee Name
        { wch: 18 },  // Leave Type
        { wch: 10 },  // Location
        { wch: 12 },  // Start Date
        { wch: 12 },  // End Date
        { wch: 8 },   // Total Days
        { wch: 12 }   // Status
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Leave Summary');
      
      // Generate Excel file as base64
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      // Create file path with timestamp to avoid conflicts
      const timestamp = new Date().getTime();
      const fileName = `Leave_Summary_${selectedMonthName}_${selectedYear}_${timestamp}.xlsx`;
      
      // Use appropriate directory based on platform
      let filePath = '';
      if (Platform.OS === 'android') {
        filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      } else {
        filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }
      
      // Write file
      await RNFS.writeFile(filePath, wbout, 'base64');
      
      // Check if file exists
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('File was not created');
      }
      
      // Share options
      const shareOptions = {
        title: 'Share Leave Summary',
        message: 'Leave Summary Report',
        url: `file://${filePath}`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        failOnCancel: false,
        showAppsToView: true,
      };

      // Share the file
      await Share.open(shareOptions);
      
    } catch (error: any) {
      console.error('Error in Excel download:', error);
      
      // Handle specific errors
      if (error.message && error.message.includes('User did not share')) {
        // User cancelled - do nothing
        return;
      }
      
      // Try fallback method
      try {
        await handleDownloadText();
      } catch (fallbackError) {
        Alert.alert(
          'Download Failed',
          'Failed to generate Excel report. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Fixed PDF Download Function
  const handleDownloadPDF = async () => {
    setShowDownloadOptions(false);
    
    try {
      const selectedMonthName = months.find(m => m.value === selectedMonth)?.name || 'All';
      
      // Calculate statistics
      const approved = filteredApplications.filter(a => a.status === 'Approved').length;
      const pending = filteredApplications.filter(a => a.status === 'Pending').length;
      const rejected = filteredApplications.filter(a => a.status === 'Rejected').length;
      
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Leave Summary Report</title>
          <style>
            * {
              box-sizing: border-box;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            body {
              margin: 20px;
              padding: 0;
              background: #fff;
            }
            .container {
              max-width: 1200px;
              margin: 0 auto;
              background: white;
              padding: 20px;
            }
            h1 {
              color: #0A0F2C;
              text-align: center;
              margin: 0 0 5px 0;
              font-size: 28px;
              font-weight: 700;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              padding-bottom: 15px;
              border-bottom: 3px solid #3498db;
            }
            .header h2 {
              color: #1A237E;
              margin: 5px 0;
              font-size: 20px;
              font-weight: 600;
            }
            .header p {
              color: #666;
              margin: 5px 0;
              font-size: 14px;
            }
            .summary {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 10px;
              margin-bottom: 25px;
              border-left: 5px solid #3498db;
              display: flex;
              flex-wrap: wrap;
              justify-content: space-between;
            }
            .summary-item {
              flex: 1;
              min-width: 120px;
              margin: 5px;
            }
            .summary-label {
              font-size: 13px;
              color: #666;
              margin-bottom: 5px;
              text-transform: uppercase;
            }
            .summary-value {
              font-size: 24px;
              font-weight: 700;
              color: #0A0F2C;
            }
            .summary-value.small {
              font-size: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 13px;
              background: white;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            th {
              background: #3498db;
              color: white;
              padding: 12px 8px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
              white-space: nowrap;
            }
            td {
              padding: 10px 8px;
              border-bottom: 1px solid #e0e0e0;
              color: #333;
            }
            tr:nth-child(even) {
              background: #f9f9f9;
            }
            .status-badge {
              padding: 4px 8px;
              border-radius: 20px;
              font-size: 11px;
              font-weight: 600;
              display: inline-block;
              text-align: center;
              min-width: 70px;
            }
            .status-approved {
              background: #d4edda;
              color: #155724;
            }
            .status-pending {
              background: #fff3cd;
              color: #856404;
            }
            .status-rejected {
              background: #f8d7da;
              color: #721c24;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 11px;
              color: #999;
              border-top: 1px solid #eee;
              padding-top: 15px;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>LEAVE SUMMARY REPORT</h1>
              <h2>${selectedMonthName} ${selectedYear}</h2>
              <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="summary">
              <div class="summary-item">
                <div class="summary-label">Total Applications</div>
                <div class="summary-value">${filteredApplications.length}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Total Days</div>
                <div class="summary-value">${totalLeaveDays}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Approved</div>
                <div class="summary-value small" style="color: #28a745;">${approved}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Pending</div>
                <div class="summary-value small" style="color: #ffc107;">${pending}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Rejected</div>
                <div class="summary-value small" style="color: #dc3545;">${rejected}</div>
              </div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Emp ID</th>
                  <th>Employee Name</th>
                  <th>Leave Type</th>
                  <th>Location</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${filteredApplications.map((app, index) => {
                  const statusClass = app.status.toLowerCase();
                  return `
                    <tr>
                      <td>${index + 1}</td>
                      <td><strong>${app.employeeId}</strong></td>
                      <td>${app.employeeName}</td>
                      <td>${app.leaveType}</td>
                      <td>${app.location}</td>
                      <td>${app.fromDate}</td>
                      <td>${app.toDate}</td>
                      <td><strong>${app.totalLeaveDays}</strong></td>
                      <td><span class="status-badge status-${statusClass}">${app.status}</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
            
            <div class="footer">
              <p>Generated by Employee Dashboard App</p>
              <p>This is a computer generated report - ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create file path with timestamp
      const timestamp = new Date().getTime();
      const fileName = `Leave_Summary_${selectedMonthName}_${selectedYear}_${timestamp}.html`;
      
      // Use appropriate directory
      let filePath = '';
      if (Platform.OS === 'android') {
        filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      } else {
        filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }
      
      // Write HTML file
      await RNFS.writeFile(filePath, htmlContent, 'utf8');
      
      // Check if file exists
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('File was not created');
      }
      
      // Share options
      const shareOptions = {
        title: 'Share Leave Summary',
        message: 'Leave Summary Report',
        url: `file://${filePath}`,
        type: 'text/html',
        failOnCancel: false,
        showAppsToView: true,
      };

      // Share the file
      await Share.open(shareOptions);
      
    } catch (error: any) {
      console.error('Error in PDF download:', error);
      
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      
      // Try fallback method
      try {
        await handleDownloadText();
      } catch (fallbackError) {
        Alert.alert(
          'Download Failed',
          'Failed to generate PDF report. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  // Text download as fallback
  const handleDownloadText = async () => {
    try {
      const selectedMonthName = months.find(m => m.value === selectedMonth)?.name || 'All';
      
      let content = `========================================\n`;
      content += `        LEAVE SUMMARY REPORT\n`;
      content += `========================================\n`;
      content += `Month: ${selectedMonthName} ${selectedYear}\n`;
      content += `Generated on: ${new Date().toLocaleString()}\n`;
      content += `Total Applications: ${filteredApplications.length}\n`;
      content += `Total Leave Days: ${totalLeaveDays}\n`;
      content += `========================================\n\n`;
      
      // Table header
      content += `S.No  | Emp ID     | Employee Name          | Leave Type        | Location | Start Date | End Date   | Days | Status  \n`;
      content += `-----|------------|------------------------|-------------------|----------|------------|------------|------|---------\n`;
      
      // Table rows
      filteredApplications.forEach((app, index) => {
        const sno = (index + 1).toString().padEnd(5);
        const empId = app.employeeId.padEnd(10);
        const name = app.employeeName.substring(0, 22).padEnd(22);
        const type = app.leaveType.substring(0, 17).padEnd(17);
        const loc = app.location.padEnd(8);
        const start = app.fromDate.padEnd(10);
        const end = app.toDate.padEnd(10);
        const days = app.totalLeaveDays.toString().padEnd(4);
        const status = app.status;
        
        content += `${sno} | ${empId} | ${name} | ${type} | ${loc} | ${start} | ${end} | ${days} | ${status}\n`;
      });
      
      content += `\n========================================\n`;
      content += `END OF REPORT\n`;
      content += `========================================\n`;

      const timestamp = new Date().getTime();
      const fileName = `Leave_Summary_${selectedMonthName}_${selectedYear}_${timestamp}.txt`;
      
      let filePath = '';
      if (Platform.OS === 'android') {
        filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      } else {
        filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }
      
      await RNFS.writeFile(filePath, content, 'utf8');
      
      const shareOptions = {
        title: 'Share Leave Summary',
        message: 'Leave Summary Report',
        url: `file://${filePath}`,
        type: 'text/plain',
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      console.error('Error in text download:', error);
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      Alert.alert('Error', 'Failed to generate text report');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return { bg: '#D1FAE5', text: '#065F46' };
      case 'Pending': return { bg: '#FEF3C7', text: '#92400E' };
      case 'Rejected': return { bg: '#FEE2E2', text: '#991B1B' };
      default: return { bg: '#F3F4F6', text: '#1F2937' };
    }
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          flex: 1,
          backgroundColor: COLORS.white,
          marginTop: 50,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.primary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>Filter Applications</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            {/* Year Filter */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>YEAR</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => setSelectedYear('all')}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      marginRight: 8,
                      backgroundColor: selectedYear === 'all' ? COLORS.primary : COLORS.filterBg,
                      borderWidth: 1,
                      borderColor: selectedYear === 'all' ? COLORS.primary : COLORS.border,
                    }}>
                    <Text style={{ color: selectedYear === 'all' ? COLORS.white : COLORS.textPrimary }}>All</Text>
                  </TouchableOpacity>
                  {years.map(year => (
                    <TouchableOpacity
                      key={year}
                      onPress={() => setSelectedYear(year)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        marginRight: 8,
                        backgroundColor: selectedYear === year ? COLORS.primary : COLORS.filterBg,
                        borderWidth: 1,
                        borderColor: selectedYear === year ? COLORS.primary : COLORS.border,
                      }}>
                      <Text style={{ color: selectedYear === year ? COLORS.white : COLORS.textPrimary }}>{year}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Month Filter */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>MONTH</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => setSelectedMonth('all')}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      marginRight: 8,
                      backgroundColor: selectedMonth === 'all' ? COLORS.primary : COLORS.filterBg,
                      borderWidth: 1,
                      borderColor: selectedMonth === 'all' ? COLORS.primary : COLORS.border,
                    }}>
                    <Text style={{ color: selectedMonth === 'all' ? COLORS.white : COLORS.textPrimary }}>All</Text>
                  </TouchableOpacity>
                  {months.map(month => (
                    <TouchableOpacity
                      key={month.value}
                      onPress={() => setSelectedMonth(month.value)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        marginRight: 8,
                        backgroundColor: selectedMonth === month.value ? COLORS.primary : COLORS.filterBg,
                        borderWidth: 1,
                        borderColor: selectedMonth === month.value ? COLORS.primary : COLORS.border,
                      }}>
                      <Text style={{ color: selectedMonth === month.value ? COLORS.white : COLORS.textPrimary }}>{month.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Employee ID Filter */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>EMPLOYEE ID</Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                backgroundColor: COLORS.white,
              }}>
                <Icon name="search" size={20} color={COLORS.gray} />
                <TextInput
                  value={selectedEmployeeId}
                  onChangeText={setSelectedEmployeeId}
                  placeholder="Enter employee ID..."
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    paddingHorizontal: 8,
                    fontSize: 15,
                  }}
                />
                {selectedEmployeeId !== '' && (
                  <TouchableOpacity onPress={() => setSelectedEmployeeId('')}>
                    <Icon name="close" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Leave Type Filter */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>LEAVE TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => setSelectedLeaveType('all')}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      marginRight: 8,
                      backgroundColor: selectedLeaveType === 'all' ? COLORS.primary : COLORS.filterBg,
                      borderWidth: 1,
                      borderColor: selectedLeaveType === 'all' ? COLORS.primary : COLORS.border,
                    }}>
                    <Text style={{ color: selectedLeaveType === 'all' ? COLORS.white : COLORS.textPrimary }}>All</Text>
                  </TouchableOpacity>
                  {leaveTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setSelectedLeaveType(type)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        marginRight: 8,
                        backgroundColor: selectedLeaveType === type ? COLORS.primary : COLORS.filterBg,
                        borderWidth: 1,
                        borderColor: selectedLeaveType === type ? COLORS.primary : COLORS.border,
                      }}>
                      <Text style={{ color: selectedLeaveType === type ? COLORS.white : COLORS.textPrimary }}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Location Filter */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>LOCATION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => setSelectedLocation('all')}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      marginRight: 8,
                      backgroundColor: selectedLocation === 'all' ? COLORS.primary : COLORS.filterBg,
                      borderWidth: 1,
                      borderColor: selectedLocation === 'all' ? COLORS.primary : COLORS.border,
                    }}>
                    <Text style={{ color: selectedLocation === 'all' ? COLORS.white : COLORS.textPrimary }}>All</Text>
                  </TouchableOpacity>
                  {locations.map(location => (
                    <TouchableOpacity
                      key={location}
                      onPress={() => setSelectedLocation(location)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        marginRight: 8,
                        backgroundColor: selectedLocation === location ? COLORS.primary : COLORS.filterBg,
                        borderWidth: 1,
                        borderColor: selectedLocation === location ? COLORS.primary : COLORS.border,
                      }}>
                      <Text style={{ color: selectedLocation === location ? COLORS.white : COLORS.textPrimary }}>{location}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Status Filter */}
            <View style={{ marginBottom: 30 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>STATUS</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    onPress={() => setSelectedStatus('all')}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 20,
                      marginRight: 8,
                      backgroundColor: selectedStatus === 'all' ? COLORS.primary : COLORS.filterBg,
                      borderWidth: 1,
                      borderColor: selectedStatus === 'all' ? COLORS.primary : COLORS.border,
                    }}>
                    <Text style={{ color: selectedStatus === 'all' ? COLORS.white : COLORS.textPrimary }}>All</Text>
                  </TouchableOpacity>
                  {statusOptions.map(status => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setSelectedStatus(status)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        marginRight: 8,
                        backgroundColor: selectedStatus === status ? COLORS.primary : COLORS.filterBg,
                        borderWidth: 1,
                        borderColor: selectedStatus === status ? COLORS.primary : COLORS.border,
                      }}>
                      <Text style={{ color: selectedStatus === status ? COLORS.white : COLORS.textPrimary }}>{status}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 }}>
              <TouchableOpacity
                onPress={handleClearAllFilters}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: COLORS.error,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor: COLORS.white,
                }}>
                <Text style={{ color: COLORS.error, fontWeight: '600' }}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  marginLeft: 8,
                  backgroundColor: COLORS.primary,
                  borderRadius: 12,
                  alignItems: 'center',
                }}>
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderDownloadModal = () => (
    <Modal
      visible={showDownloadOptions}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDownloadOptions(false)}>
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
        activeOpacity={1}
        onPress={() => setShowDownloadOptions(false)}>
        <View style={{
          position: 'absolute',
          top: 60,
          right: 16,
          backgroundColor: COLORS.white,
          borderRadius: 12,
          padding: 8,
          minWidth: 220,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 8,
        }}>
          <TouchableOpacity
            onPress={handleDownloadExcel}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              borderRadius: 8,
            }}>
            <Icon name="file-download" size={20} color={COLORS.green} />
            <Text style={{ marginLeft: 12, fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' }}>
              Download Excel Report
            </Text>
          </TouchableOpacity>
          
          <View style={{ height: 1, backgroundColor: COLORS.border, marginHorizontal: 8 }} />
          
          <TouchableOpacity
            onPress={handleDownloadPDF}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              borderRadius: 8,
            }}>
            <Icon name="picture-as-pdf" size={20} color={COLORS.error} />
            <Text style={{ marginLeft: 12, fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' }}>
              Download PDF Report
            </Text>
          </TouchableOpacity>
          
          <View style={{ height: 1, backgroundColor: COLORS.border, marginHorizontal: 8 }} />
          
          <TouchableOpacity
            onPress={handleDownloadText}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              borderRadius: 8,
            }}>
            <Icon name="description" size={20} color={COLORS.blue} />
            <Text style={{ marginLeft: 12, fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' }}>
              Download Text Report
            </Text>
          </TouchableOpacity>
          
          <View style={{ height: 1, backgroundColor: COLORS.border, marginHorizontal: 8 }} />
          
          <TouchableOpacity
            onPress={() => setShowDownloadOptions(false)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 12,
              borderRadius: 8,
            }}>
            <Icon name="close" size={20} color={COLORS.gray} />
            <Text style={{ marginLeft: 12, fontSize: 15, color: COLORS.gray, fontWeight: '500' }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderViewModal = () => (
    <Modal
      visible={showViewModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowViewModal(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          flex: 1,
          backgroundColor: COLORS.white,
          marginTop: 50,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.primary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>Leave Details</Text>
            <TouchableOpacity onPress={() => setShowViewModal(false)}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {selectedApplication && (
            <ScrollView style={{ padding: 20 }}>
              <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Employee ID</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary }}>{selectedApplication.employeeId}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Employee Name</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>{selectedApplication.employeeName}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Leave Type</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.blue }}>{selectedApplication.leaveType}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Location</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>{selectedApplication.location}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Start Date</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>{selectedApplication.fromDate}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>End Date</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>{selectedApplication.toDate}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Total Days</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.green }}>{selectedApplication.totalLeaveDays} days</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Status</Text>
                  <View style={[{
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 20,
                  }, { backgroundColor: getStatusColor(selectedApplication.status).bg }]}>
                    <Text style={{ fontSize: 12, color: getStatusColor(selectedApplication.status).text, fontWeight: '600' }}>
                      {selectedApplication.status}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border }}>
            <TouchableOpacity
              onPress={() => setShowViewModal(false)}
              style={{
                backgroundColor: COLORS.primary,
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: 'center',
              }}>
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditModal(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          flex: 1,
          backgroundColor: COLORS.white,
          marginTop: 50,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.primary,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>Edit Leave</Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>LEAVE TYPE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row' }}>
                  {leaveTypes.map(type => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => setEditReason(type)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 20,
                        marginRight: 8,
                        backgroundColor: editReason === type ? COLORS.primary : COLORS.filterBg,
                        borderWidth: 1,
                        borderColor: editReason === type ? COLORS.primary : COLORS.border,
                      }}>
                      <Text style={{ color: editReason === type ? COLORS.white : COLORS.textPrimary }}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>START DATE</Text>
              <TextInput
                value={editDates.startDate}
                onChangeText={(text) => setEditDates({ ...editDates, startDate: text })}
                placeholder="YYYY-MM-DD"
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                }}
              />
            </View>

            <View style={{ marginBottom: 30 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 }}>END DATE</Text>
              <TextInput
                value={editDates.endDate}
                onChangeText={(text) => setEditDates({ ...editDates, endDate: text })}
                placeholder="YYYY-MM-DD"
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                }}
              />
            </View>
          </ScrollView>

          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={() => setShowEditModal(false)}
              style={{
                flex: 1,
                paddingVertical: 14,
                marginRight: 8,
                borderWidth: 1,
                borderColor: COLORS.gray,
                borderRadius: 12,
                alignItems: 'center',
              }}>
              <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveEdit}
              style={{
                flex: 1,
                paddingVertical: 14,
                marginLeft: 8,
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                alignItems: 'center',
              }}>
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderTableHeader = () => (
    <View style={{
      flexDirection: 'row',
      backgroundColor: COLORS.tableHeader,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 8,
      marginBottom: 8,
    }}>
      <Text style={{ width: 40, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>S.No</Text>
      <Text style={{ width: 70, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Emp ID</Text>
      <Text style={{ flex: 1.2, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Name</Text>
      <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Type</Text>
      <Text style={{ width: 60, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Loc</Text>
      <Text style={{ width: 70, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Start</Text>
      <Text style={{ width: 70, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>End</Text>
      <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Days</Text>
      <Text style={{ width: 70, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Status</Text>
      <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Actions</Text>
    </View>
  );

  const renderTableRow = ({ item, index }: { item: LeaveApplication; index: number }) => {
    const statusColors = getStatusColor(item.status);
    
    return (
      <View style={{
        flexDirection: 'row',
        backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.filterBg,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        alignItems: 'center',
      }}>
        <Text style={{ width: 40, color: COLORS.textPrimary, fontSize: 12 }}>{index + 1}</Text>
        <Text style={{ width: 70, color: COLORS.primary, fontWeight: '500', fontSize: 12 }}>{item.employeeId}</Text>
        <Text style={{ flex: 1.2, color: COLORS.textPrimary, fontSize: 12 }} numberOfLines={1}>{item.employeeName}</Text>
        <Text style={{ width: 80, color: COLORS.blue, fontSize: 12 }} numberOfLines={1}>{item.leaveType}</Text>
        <Text style={{ width: 60, color: COLORS.textSecondary, fontSize: 12 }}>{item.location}</Text>
        <Text style={{ width: 70, color: COLORS.textSecondary, fontSize: 11 }}>{item.fromDate}</Text>
        <Text style={{ width: 70, color: COLORS.textSecondary, fontSize: 11 }}>{item.toDate}</Text>
        <Text style={{ width: 50, color: COLORS.green, fontWeight: '600', fontSize: 12 }}>{item.totalLeaveDays}</Text>
        <View style={{ width: 70 }}>
          <View style={[{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 12,
            alignSelf: 'flex-start',
          }, { backgroundColor: statusColors.bg }]}>
            <Text style={{ fontSize: 10, color: statusColors.text, fontWeight: '600' }}>
              {item.status}
            </Text>
          </View>
        </View>
        <View style={{ width: 120, flexDirection: 'row' }}>
          <TouchableOpacity onPress={() => handleView(item)} style={{ padding: 4 }}>
            <Icon name="visibility" size={18} color={COLORS.blue} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleEdit(item)} style={{ padding: 4 }}>
            <Icon name="edit" size={18} color={COLORS.orange} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 4 }}>
            <Icon name="delete" size={18} color={COLORS.red} />
          </TouchableOpacity>
          {item.status === 'Pending' && (
            <>
              <TouchableOpacity onPress={() => handleApprove(item.id)} style={{ padding: 4 }}>
                <Icon name="check-circle" size={18} color={COLORS.green} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleReject(item.id)} style={{ padding: 4 }}>
                <Icon name="cancel" size={18} color={COLORS.red} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Leave Summary" 
        showBack={true}
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={handleRefresh}
              style={{ marginRight: 16 }}>
              <Icon name="refresh" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowDownloadOptions(true)}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
              <Icon name="file-download" size={20} color={COLORS.white} />
              <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '500', marginLeft: 4 }}>Download</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Filter Section */}
      <View style={{ 
        backgroundColor: COLORS.white, 
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}>
        <TouchableOpacity
          onPress={() => setShowFilterModal(true)}
          style={{
            backgroundColor: COLORS.filterBg,
            borderRadius: 12,
            padding: 14,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="filter-list" size={20} color={COLORS.primary} />
            <Text style={{ marginLeft: 8, fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' }}>
              Filters
            </Text>
            {isFilterApplied && (
              <View style={{
                backgroundColor: COLORS.error,
                width: 20,
                height: 20,
                borderRadius: 10,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 8,
              }}>
                <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: 'bold' }}>!</Text>
              </View>
            )}
          </View>
          <Icon name="arrow-forward-ios" size={16} color={COLORS.gray} />
        </TouchableOpacity>

        {/* Active Filters Display */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            <View style={{
              backgroundColor: COLORS.primary + '10',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 16,
              marginRight: 8,
              borderWidth: 1,
              borderColor: COLORS.primary + '30',
            }}>
              <Text style={{ fontSize: 12, color: COLORS.primary }}>Year: {selectedYear === 'all' ? 'All' : selectedYear}</Text>
            </View>
            <View style={{
              backgroundColor: COLORS.primary + '10',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 16,
              marginRight: 8,
              borderWidth: 1,
              borderColor: COLORS.primary + '30',
            }}>
              <Text style={{ fontSize: 12, color: COLORS.primary }}>Month: {selectedMonth === 'all' ? 'All' : months.find(m => m.value === selectedMonth)?.name}</Text>
            </View>
            {selectedEmployeeId !== '' && (
              <View style={{
                backgroundColor: COLORS.primary + '10',
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 16,
                marginRight: 8,
                borderWidth: 1,
                borderColor: COLORS.primary + '30',
              }}>
                <Text style={{ fontSize: 12, color: COLORS.primary }}>Emp: {selectedEmployeeId}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Results Summary */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
            {filteredApplications.length} applications found
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.green, fontWeight: '600' }}>
            Total: {totalLeaveDays} days
          </Text>
        </View>
      </View>

      {/* Table */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading applications...</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={true}>
          <View style={{ paddingBottom: 80 }}>
            {renderTableHeader()}
            <FlatList
              data={filteredApplications}
              renderItem={renderTableRow}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 20 }}
              refreshControl={
                <RefreshControl 
                  refreshing={isRefreshing} 
                  onRefresh={handleRefresh}
                  colors={[COLORS.primary]}
                  tintColor={COLORS.primary}
                />
              }
              ListEmptyComponent={
                <View style={{ padding: 40, alignItems: 'center', width: width }}>
                  <Icon name="event-busy" size={64} color={COLORS.lightGray} />
                  <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontWeight: '500' }}>
                    No leave applications found
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 8, textAlign: 'center' }}>
                    Try adjusting your filters or pull down to refresh
                  </Text>
                </View>
              }
            />
          </View>
        </ScrollView>
      )}

      {/* Modals */}
      {renderFilterModal()}
      {renderDownloadModal()}
      {renderViewModal()}
      {renderEditModal()}

      {/* Footer - Updated to match Leave Balance style */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Leave Summary • Track Leave Applications • "
      />
    </SafeAreaView>
  );
};

export default LeaveSummaryScreen;