// src/screens/LeaveManagement/LeaveBalanceScreen.tsx
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { leaveAPI, employeeAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';
import * as XLSX from 'xlsx';

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
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC'
};

interface LeaveBalance {
  casual: { allocated: number; used: number; balance: number };
  sick: { allocated: number; used: number; balance: number };
  privilege: { allocated: number; used: number; balance: number };
  totalBalance: number;
}

interface Employee {
  id: string;
  empId: string;
  name: string;
  location: string;
  designation: string;
  department: string;
  position: string;
  monthsOfService: number;
  hireDate: string;
  basicSalary: number;
  email: string;
  phone: string;
  balances: LeaveBalance;
}

const LeaveBalanceScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingMap, setPendingMap] = useState<Record<string, { CL: number; SL: number; PL: number }>>({});
  
  // Modal states
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [historyLeaves, setHistoryLeaves] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Edit state
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editBalances, setEditBalances] = useState({ casual: 0, sick: 0, privilege: 0 });

  const locations = ['Hosur', 'Chennai'];

  useEffect(() => {
    loadBalances();
  }, []);

  useEffect(() => {
    // Filter employees based on search term and location
    const filtered = employees.filter(emp => {
      const matchesSearch = 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.empId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.location || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLocation = locationFilter ? emp.location === locationFilter : true;
      
      return matchesSearch && matchesLocation;
    }).sort((a, b) => {
      const idA = (a.empId || '').toString().toLowerCase();
      const idB = (b.empId || '').toString().toLowerCase();
      if (idA < idB) return -1;
      if (idA > idB) return 1;
      return 0;
    });
    
    setFilteredEmployees(filtered);
  }, [employees, searchTerm, locationFilter]);

  const monthsBetween = (dateString: string): number => {
    if (!dateString) return 0;
    const start = new Date(dateString);
    if (isNaN(start.getTime())) return 0;
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    const total = years * 12 + months;
    return Math.max(0, total);
  };

  const loadBalances = async () => {
    setLoading(true);
    try {
      // Try to get leave balances from API
      const res = await leaveAPI.getBalance();
      const list = Array.isArray(res.data) ? res.data : [];
      const mapped: Employee[] = list.map((e: any, idx: number) => ({
        id: e.employeeId || idx.toString(),
        empId: e.employeeId || '',
        name: e.name || '',
        department: e.division || '',
        position: e.position || '',
        designation: e.designation || e.position || '',
        hireDate: e.hireDate || '',
        monthsOfService: e.monthsOfService || 0,
        email: e.email || '',
        phone: e.mobileNo || '',
        location: e.location || '',
        basicSalary: e.basicSalary || 0,
        balances: e.balances || calculateLeaveBalances({
          designation: e.designation || e.position || '',
          monthsOfService: e.monthsOfService || monthsBetween(e.hireDate || e.dateOfJoining || '')
        })
      }));
      setEmployees(mapped);

      // Get pending leaves for deduction
      try {
        const pend = await leaveAPI.list({ status: 'Pending' });
        const rows = Array.isArray(pend.data) ? pend.data : [];
        const agg: Record<string, { CL: number; SL: number; PL: number }> = {};
        rows.forEach((r: any) => {
          const id = String(r.employeeId || '').toLowerCase();
          if (!id) return;
          if (!agg[id]) agg[id] = { CL: 0, SL: 0, PL: 0 };
          const type = r.leaveType;
          const days = Number(r.totalDays || 0);
          if (type === 'CL') agg[id].CL += days;
          else if (type === 'SL') agg[id].SL += days;
          else if (type === 'PL') agg[id].PL += days;
        });
        setPendingMap(agg);
      } catch {
        setPendingMap({});
      }
    } catch (error) {
      console.error('Error loading balances:', error);
      // Fallback to employee API
      try {
        const res2 = await employeeAPI.getAllEmployees();
        const list2 = Array.isArray(res2.data) ? res2.data : [];
        const mapped2: Employee[] = list2.map((e: any, idx: number) => {
          const doj = e.dateOfJoining || e.dateofjoin || e.hireDate || e.createdAt || '';
          const m = monthsBetween(doj);
          const item = {
            id: e._id || idx.toString(),
            empId: e.employeeId || e.empId || '',
            name: e.name || e.employeename || '',
            department: e.division || e.department || '',
            position: e.position || e.designation || e.role || '',
            designation: e.designation || e.position || e.role || '',
            hireDate: doj,
            monthsOfService: m,
            email: e.email || '',
            phone: e.mobileNo || e.contactNumber || '',
            location: e.location || e.branch || '',
            basicSalary: e.basicSalary || 0,
            balances: calculateLeaveBalances({
              designation: e.designation || e.position || e.role || '',
              monthsOfService: m
            })
          };
          return item;
        });
        setEmployees(mapped2);
        setPendingMap({});
      } catch (err) {
        console.error('Error loading employees:', err);
        setEmployees([]);
        setPendingMap({});
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to calculate leave balances based on designation and duration
  const calculateLeaveBalances = (employee: { designation: string; monthsOfService: number }): LeaveBalance => {
    const { designation, monthsOfService } = employee;
    let casual = 0, sick = 0, privilege = 0;
    
    const isTrainee = String(designation || '').toLowerCase().includes('trainee');
    const traineeMonths = Math.min(monthsOfService, 12);
    const usedCasual = 0;
    const usedSick = 0;
    const usedPrivilege = 0;
    
    if (isTrainee) {
      privilege = traineeMonths * 1;
      casual = 0;
      sick = 0;
    } else {
      const firstSix = Math.min(monthsOfService, 6);
      const afterSix = Math.max(monthsOfService - 6, 0);
      const plNonCarry = (firstSix * 1);
      const plCarry = afterSix * 1.25;
      privilege = plNonCarry + plCarry;
      casual = afterSix * 0.5;
      sick = afterSix * 0.5;
    }
    
    return {
      casual: { 
        allocated: casual, 
        used: usedCasual, 
        balance: (casual - usedCasual)
      },
      sick: { 
        allocated: sick, 
        used: usedSick, 
        balance: (sick - usedSick)
      },
      privilege: { 
        allocated: privilege, 
        used: usedPrivilege, 
        balance: (privilege - usedPrivilege)
      },
      totalBalance: (casual + sick + privilege - (usedCasual + usedSick + usedPrivilege))
    };
  };

  // Calculate PL settlement amount
  const calculatePLSettlement = (employee: Employee, balance: number): string => {
    const { basicSalary } = employee;
    const daysInMonth = 30;
    return ((basicSalary / daysInMonth) * balance).toFixed(2);
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadBalances();
    setIsRefreshing(false);
  };

  const handleViewDetails = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowDetailsModal(true);
  };

  const handleViewHistory = async (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await leaveAPI.list({ employeeId: employee.empId || employee.id });
      setHistoryLeaves(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setHistoryLeaves([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setEditBalances({
      casual: employee.balances?.casual?.balance || 0,
      sick: employee.balances?.sick?.balance || 0,
      privilege: employee.balances?.privilege?.balance || 0
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingEmployee) return;
    try {
      await leaveAPI.saveBalance({
        employeeId: editingEmployee.empId || editingEmployee.id,
        balances: editBalances
      });
      Alert.alert('Success', 'Leave balance updated successfully');
      setShowEditModal(false);
      handleRefresh();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update leave balance');
    }
  };

  const handleSave = async (employee: Employee) => {
    try {
      const employeeId = employee.empId || employee.id;
      await leaveAPI.saveBalance({ employeeId });
      Alert.alert('Success', 'Leave balance saved to database');
      handleRefresh();
    } catch (err) {
      Alert.alert('Error', 'Failed to save leave balance');
    }
  };

  const handleSyncAll = async () => {
    Alert.alert(
      'Sync All',
      'Are you sure you want to save all employee balances to the database?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync All',
          onPress: async () => {
            setLoading(true);
            try {
              const res = await leaveAPI.syncAllBalances();
              Alert.alert('Success', res.data.message || 'Saved all balances successfully');
              loadBalances();
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Failed to save balances');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Fixed Excel Download Function
  const handleDownloadExcel = async () => {
    setShowDownloadOptions(false);
    
    try {
      const data = filteredEmployees.map(emp => ({
        'S.No': filteredEmployees.indexOf(emp) + 1,
        'Employee ID': emp.empId || emp.id,
        'Employee Name': emp.name,
        'Location': emp.location || 'N/A',
        'Casual Leave': getAvailableBalance(emp, 'CL'),
        'Sick Leave': getAvailableBalance(emp, 'SL'),
        'Privilege Leave': getAvailableBalance(emp, 'PL'),
        'Total Balance': emp.balances?.totalBalance || 0
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      
      // Set column widths
      const colWidths = [
        { wch: 5 },   // S.No
        { wch: 12 },  // Employee ID
        { wch: 25 },  // Employee Name
        { wch: 10 },  // Location
        { wch: 8 },   // CL
        { wch: 8 },   // SL
        { wch: 8 },   // PL
        { wch: 10 }   // Total
      ];
      ws['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(wb, ws, 'Leave Balances');
      
      const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      
      const timestamp = new Date().getTime();
      const fileName = `Leave_Balance_Report_${timestamp}.xlsx`;
      
      let filePath = '';
      if (Platform.OS === 'android') {
        filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      } else {
        filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }
      
      await RNFS.writeFile(filePath, wbout, 'base64');
      
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        throw new Error('File was not created');
      }
      
      const shareOptions = {
        title: 'Share Leave Balance Report',
        message: 'Leave Balance Report',
        url: `file://${filePath}`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        failOnCancel: false,
        showAppsToView: true,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      console.error('Error in Excel download:', error);
      
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      
      try {
        await handleDownloadText();
      } catch (fallbackError) {
        Alert.alert('Error', 'Failed to generate Excel report');
      }
    }
  };

  // PDF Download Function
  const handleDownloadPDF = async () => {
    setShowDownloadOptions(false);
    
    try {
      // Calculate statistics
      const totalEmployees = filteredEmployees.length;
      const totalCL = filteredEmployees.reduce((sum, emp) => sum + getAvailableBalance(emp, 'CL'), 0);
      const totalSL = filteredEmployees.reduce((sum, emp) => sum + getAvailableBalance(emp, 'SL'), 0);
      const totalPL = filteredEmployees.reduce((sum, emp) => sum + getAvailableBalance(emp, 'PL'), 0);
      
      // Create HTML content
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Leave Balance Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 30px; }
            h1 { color: #0A0F2C; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
            .header { text-align: center; margin-bottom: 30px; }
            .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3498db; }
            .summary-item { display: inline-block; margin: 10px 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background: #3498db; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border-bottom: 1px solid #ddd; }
            tr:nth-child(even) { background: #f2f2f2; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h1>LEAVE BALANCE REPORT</h1>
          <div class="header">
            <p>Generated on: ${new Date().toLocaleString()}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item"><strong>Total Employees:</strong> ${totalEmployees}</div>
            <div class="summary-item"><strong>Total CL:</strong> ${totalCL}</div>
            <div class="summary-item"><strong>Total SL:</strong> ${totalSL}</div>
            <div class="summary-item"><strong>Total PL:</strong> ${totalPL}</div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Emp ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>CL</th>
                <th>SL</th>
                <th>PL</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEmployees.map((emp, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td><strong>${emp.empId}</strong></td>
                  <td>${emp.name}</td>
                  <td>${emp.location || 'N/A'}</td>
                  <td>${getAvailableBalance(emp, 'CL')}</td>
                  <td>${getAvailableBalance(emp, 'SL')}</td>
                  <td>${getAvailableBalance(emp, 'PL')}</td>
                  <td><strong>${emp.balances?.totalBalance || 0}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Generated by Employee Dashboard App</p>
          </div>
        </body>
        </html>
      `;

      const timestamp = new Date().getTime();
      const fileName = `Leave_Balance_Report_${timestamp}.html`;
      
      let filePath = '';
      if (Platform.OS === 'android') {
        filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      } else {
        filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }
      
      await RNFS.writeFile(filePath, htmlContent, 'utf8');
      
      const shareOptions = {
        title: 'Share Leave Balance Report',
        url: `file://${filePath}`,
        type: 'text/html',
        failOnCancel: false,
        showAppsToView: true,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      console.error('Error in PDF download:', error);
      
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      
      try {
        await handleDownloadText();
      } catch (fallbackError) {
        Alert.alert('Error', 'Failed to generate PDF report');
      }
    }
  };

  // Text download as fallback
  const handleDownloadText = async () => {
    try {
      let content = `LEAVE BALANCE REPORT\n`;
      content += `========================================\n`;
      content += `Generated on: ${new Date().toLocaleString()}\n`;
      content += `Total Employees: ${filteredEmployees.length}\n`;
      content += `========================================\n\n`;
      
      content += `S.No\tEmp ID\tName\tLocation\tCL\tSL\tPL\tTotal\n`;
      content += `----\t------\t----\t--------\t--\t--\t--\t-----\n`;
      
      filteredEmployees.forEach((emp, index) => {
        content += `${index + 1}\t${emp.empId}\t${emp.name}\t${emp.location || 'N/A'}\t${getAvailableBalance(emp, 'CL')}\t${getAvailableBalance(emp, 'SL')}\t${getAvailableBalance(emp, 'PL')}\t${emp.balances?.totalBalance || 0}\n`;
      });

      const timestamp = new Date().getTime();
      const fileName = `Leave_Balance_Report_${timestamp}.txt`;
      
      let filePath = '';
      if (Platform.OS === 'android') {
        filePath = `${RNFS.CachesDirectoryPath}/${fileName}`;
      } else {
        filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      }
      
      await RNFS.writeFile(filePath, content, 'utf8');
      
      const shareOptions = {
        title: 'Share Leave Balance Report',
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

  const getAvailableBalance = (emp: Employee, type: string): number => {
    const id = String(emp.empId || emp.id || '').toLowerCase();
    const pending = pendingMap[id] || { CL: 0, SL: 0, PL: 0 };
    const base =
      type === 'CL' ? (emp.balances?.casual?.balance || 0) :
      type === 'SL' ? (emp.balances?.sick?.balance || 0) :
      (emp.balances?.privilege?.balance || 0);
    const cut = type === 'CL' ? pending.CL : type === 'SL' ? pending.SL : pending.PL;
    return Number(base) - Number(cut);
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'CL': return { bg: '#E6F3FF', text: COLORS.blue };
      case 'SL': return { bg: '#FFE6E6', text: COLORS.red };
      case 'PL': return { bg: '#F3E6FF', text: COLORS.purple };
      default: return { bg: COLORS.lightGray, text: COLORS.gray };
    }
  };

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

  const renderEmployeeItem = ({ item, index }: { item: Employee; index: number }) => {
    const isTrainee = String(item.designation || '').toLowerCase().includes('trainee');
    
    return (
      <TouchableOpacity
        onPress={() => handleViewDetails(item)}
        style={{
          backgroundColor: COLORS.white,
          borderRadius: 12,
          padding: 12,
          marginBottom: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: COLORS.primary + '10',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 8,
            }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.primary }}>{index + 1}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary }}>
                {item.empId}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.black }}>
                {item.name}
              </Text>
            </View>
          </View>
          <View style={{
            backgroundColor: item.location === 'Hosur' ? '#E6F3FF' : '#FFE6E6',
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
          }}>
            <Text style={{ fontSize: 12, color: item.location === 'Hosur' ? COLORS.blue : COLORS.red }}>
              {item.location}
            </Text>
          </View>
        </View>

        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-around', 
          backgroundColor: COLORS.filterBg,
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: COLORS.gray }}>CL</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.blue }}>
              {getAvailableBalance(item, 'CL')}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: COLORS.gray }}>SL</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.green }}>
              {getAvailableBalance(item, 'SL')}
            </Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: COLORS.gray }}>PL</Text>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.purple }}>
              {getAvailableBalance(item, 'PL')}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 }}>
          <TouchableOpacity
            onPress={() => handleViewHistory(item)}
            style={{ paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="history" size={18} color={COLORS.purple} />
            <Text style={{ color: COLORS.purple, fontSize: 11, marginLeft: 4 }}>History</Text>
          </TouchableOpacity>
          <View style={{ width: 1, height: '100%', backgroundColor: COLORS.border }} />
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={{ paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="edit" size={18} color={COLORS.blue} />
            <Text style={{ color: COLORS.blue, fontSize: 11, marginLeft: 4 }}>Edit</Text>
          </TouchableOpacity>
          <View style={{ width: 1, height: '100%', backgroundColor: COLORS.border }} />
          <TouchableOpacity
            onPress={() => handleSave(item)}
            style={{ paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="save" size={18} color={COLORS.green} />
            <Text style={{ color: COLORS.green, fontSize: 11, marginLeft: 4 }}>Save</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowDetailsModal(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          flex: 1,
          backgroundColor: COLORS.white,
          marginTop: 50,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>
                Leave Balance Details
              </Text>
              {selectedEmployee && (
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  {selectedEmployee.name} - {selectedEmployee.empId}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {selectedEmployee && (
            <ScrollView style={{ padding: 16 }}>
              {/* Employee Info */}
              <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, color: COLORS.gray }}>Designation</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.black }}>
                    {selectedEmployee.designation || '-'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, color: COLORS.gray }}>Department</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.black }}>
                    {selectedEmployee.department || '-'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, color: COLORS.gray }}>Months of Service</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.black }}>
                    {selectedEmployee.monthsOfService} months
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, color: COLORS.gray }}>Hire Date</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.black }}>
                    {formatDate(selectedEmployee.hireDate)}
                  </Text>
                </View>
              </View>

              {/* Leave Balances */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                  Leave Balance Details
                </Text>

                {/* Casual Leave Card */}
                <View style={{ backgroundColor: '#E6F3FF', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.blue, marginBottom: 8 }}>
                    Casual Leave
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Allocated</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.black }}>
                      {selectedEmployee.balances.casual.allocated}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Used</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.red }}>
                      {selectedEmployee.balances.casual.used}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray }}>Balance</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.blue }}>
                      {selectedEmployee.balances.casual.balance}
                    </Text>
                  </View>
                </View>

                {/* Sick Leave Card */}
                <View style={{ backgroundColor: '#E7F6EC', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.green, marginBottom: 8 }}>
                    Sick Leave
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Allocated</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.black }}>
                      {selectedEmployee.balances.sick.allocated}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Used</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.red }}>
                      {selectedEmployee.balances.sick.used}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray }}>Balance</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.green }}>
                      {selectedEmployee.balances.sick.balance}
                    </Text>
                  </View>
                </View>

                {/* Privilege Leave Card */}
                <View style={{ backgroundColor: '#F3E6FF', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.purple, marginBottom: 8 }}>
                    Privilege Leave
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Allocated</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.black }}>
                      {selectedEmployee.balances.privilege.allocated}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Used</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.red }}>
                      {selectedEmployee.balances.privilege.used}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray }}>Balance</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.purple }}>
                      {selectedEmployee.balances.privilege.balance}
                    </Text>
                  </View>
                </View>

                {/* PL Encashment if applicable */}
                {selectedEmployee.balances.privilege.balance >= 7 && (
                  <View style={{ backgroundColor: '#FFF3E0', borderRadius: 8, padding: 12, marginTop: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.orange, marginBottom: 4 }}>
                      PL Encashment Value
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.orange }}>
                      ₹{calculatePLSettlement(selectedEmployee, selectedEmployee.balances.privilege.balance)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Total Summary */}
              <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 16, marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray }}>Total Leave Summary</Text>
                    <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                      Allocated: {(selectedEmployee.balances.casual.allocated + selectedEmployee.balances.sick.allocated + selectedEmployee.balances.privilege.allocated).toFixed(1)}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.gray }}>
                      Used: {(selectedEmployee.balances.casual.used + selectedEmployee.balances.sick.used + selectedEmployee.balances.privilege.used)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.green }}>
                      {selectedEmployee.balances.totalBalance}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.gray }}>Total Available</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
            <TouchableOpacity
              onPress={() => setShowDetailsModal(false)}
              style={{
                backgroundColor: COLORS.primary,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
              }}>
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderHistoryModal = () => (
    <Modal
      visible={showHistoryModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHistoryModal(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{
          flex: 1,
          backgroundColor: COLORS.white,
          marginTop: 50,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>
                Leave History
              </Text>
              {selectedEmployee && (
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                  {selectedEmployee.name}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, padding: 16 }}>
            {historyLoading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : historyLeaves.length === 0 ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="history" size={48} color={COLORS.lightGray} />
                <Text style={{ fontSize: 16, color: COLORS.gray, marginTop: 16 }}>
                  No leave history found
                </Text>
              </View>
            ) : (
              <FlatList
                data={historyLeaves}
                keyExtractor={(item, index) => item._id || index.toString()}
                renderItem={({ item }) => {
                  const typeColors = getLeaveTypeColor(item.leaveType);
                  const statusColors = item.status === 'Approved' ? { bg: '#D1FAE5', text: '#065F46' } :
                                      item.status === 'Pending' ? { bg: '#FEF3C7', text: '#92400E' } :
                                      { bg: '#FEE2E2', text: '#991B1B' };
                  
                  return (
                    <View style={{
                      backgroundColor: COLORS.filterBg,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                        <View style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }, { backgroundColor: typeColors.bg }]}>
                          <Text style={{ fontSize: 12, color: typeColors.text, fontWeight: '600' }}>
                            {item.leaveType}
                          </Text>
                        </View>
                        <View style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }, { backgroundColor: statusColors.bg }]}>
                          <Text style={{ fontSize: 12, color: statusColors.text, fontWeight: '600' }}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, color: COLORS.gray }}>Start Date</Text>
                        <Text style={{ fontSize: 13, color: COLORS.black }}>{formatDate(item.startDate)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, color: COLORS.gray }}>End Date</Text>
                        <Text style={{ fontSize: 13, color: COLORS.black }}>{formatDate(item.endDate)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: COLORS.gray }}>Days</Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>{item.totalDays} days</Text>
                      </View>
                      {item.reason && (
                        <View style={{ marginTop: 8, padding: 8, backgroundColor: COLORS.white, borderRadius: 4 }}>
                          <Text style={{ fontSize: 12, color: COLORS.gray }}>Reason:</Text>
                          <Text style={{ fontSize: 12, color: COLORS.black }}>{item.reason}</Text>
                        </View>
                      )}
                    </View>
                  );
                }}
              />
            )}
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
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.primary,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>
              Edit Leave Balance
            </Text>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Icon name="close" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {editingEmployee && (
            <ScrollView style={{ padding: 16 }}>
              <View style={{ marginBottom: 16, backgroundColor: COLORS.filterBg, padding: 12, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, color: COLORS.gray }}>Employee</Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.black }}>{editingEmployee.name}</Text>
                <Text style={{ fontSize: 14, color: COLORS.gray, marginTop: 4 }}>{editingEmployee.empId}</Text>
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray, marginBottom: 8 }}>
                  Casual Leave Balance
                </Text>
                <TextInput
                  value={editBalances.casual.toString()}
                  onChangeText={(value) => setEditBalances({ ...editBalances, casual: parseFloat(value) || 0 })}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                  }}
                />
              </View>

              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray, marginBottom: 8 }}>
                  Sick Leave Balance
                </Text>
                <TextInput
                  value={editBalances.sick.toString()}
                  onChangeText={(value) => setEditBalances({ ...editBalances, sick: parseFloat(value) || 0 })}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                  }}
                />
              </View>

              <View style={{ marginBottom: 24 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray, marginBottom: 8 }}>
                  Privilege Leave Balance
                </Text>
                <TextInput
                  value={editBalances.privilege.toString()}
                  onChangeText={(value) => setEditBalances({ ...editBalances, privilege: parseFloat(value) || 0 })}
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                  }}
                />
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 }}>
                <TouchableOpacity
                  onPress={() => setShowEditModal(false)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    marginRight: 8,
                    borderWidth: 1,
                    borderColor: COLORS.gray,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}>
                  <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveEdit}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    marginLeft: 8,
                    backgroundColor: COLORS.primary,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}>
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Save</Text>
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
        title="Leave Balance" 
        showBack={true}
        rightComponent={
          <View style={{ flexDirection: 'row', alignItems:'center' }}>
            <TouchableOpacity 
              onPress={handleSyncAll}
              style={{ marginRight: 16 }}>
              <Icon name="sync" size={24} color={COLORS.white} />
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

      {/* Search and Filter */}
      <View style={{ padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            marginRight: 8,
            backgroundColor: COLORS.white,
          }}>
            <Icon name="search" size={20} color={COLORS.gray} />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by name or ID..."
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 8,
                fontSize: 14,
              }}
            />
            {searchTerm !== '' && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Icon name="close" size={20} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowLocationPicker(true)}
            style={{
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 8,
              paddingHorizontal: 16,
              justifyContent: 'center',
              backgroundColor: locationFilter ? COLORS.blue : COLORS.white,
            }}>
            <Text style={{ color: locationFilter ? COLORS.white : COLORS.black }}>
              {locationFilter || 'Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results count */}
        <Text style={{ fontSize: 12, color: COLORS.gray }}>
          {filteredEmployees.length} employees found
        </Text>
      </View>

      {/* Employee List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, color: COLORS.gray }}>Loading employees...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployeeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Icon name="people-outline" size={64} color={COLORS.lightGray} />
              <Text style={{ fontSize: 16, color: COLORS.gray, marginTop: 16, fontWeight: '500' }}>
                No employees found
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 8, textAlign: 'center' }}>
                Try adjusting your search or pull down to refresh
              </Text>
            </View>
          }
        />
      )}

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setShowLocationPicker(false)}>
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.black }}>
                Select Location
              </Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => {
                setLocationFilter('');
                setShowLocationPicker(false);
              }}
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
                backgroundColor: locationFilter === '' ? '#EEF2FF' : COLORS.white,
              }}>
              <Text style={{ 
                fontSize: 16, 
                color: locationFilter === '' ? COLORS.primary : COLORS.black,
                fontWeight: locationFilter === '' ? '600' : '400',
              }}>All Locations</Text>
            </TouchableOpacity>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc}
                onPress={() => {
                  setLocationFilter(loc);
                  setShowLocationPicker(false);
                }}
                style={{
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.border,
                  backgroundColor: locationFilter === loc ? '#EEF2FF' : COLORS.white,
                }}>
                <Text style={{
                  fontSize: 16,
                  color: locationFilter === loc ? COLORS.primary : COLORS.black,
                  fontWeight: locationFilter === loc ? '600' : '400',
                }}>
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Download Options Modal */}
      {renderDownloadModal()}

      {/* Modals */}
      {renderDetailsModal()}
      {renderHistoryModal()}
      {renderEditModal()}

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Leave Balance • Track & Manage Leaves • "
      />
    </SafeAreaView>
  );
};

export default LeaveBalanceScreen;