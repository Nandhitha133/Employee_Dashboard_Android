// screens/LeaveApplications/LeaveApplicationsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  StatusBar,
  Platform,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { leaveAPI, employeeAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  filterBg: '#F8FAFC',
  approved: '#10B981',
  pending: '#F59E0B',
  rejected: '#EF4444',
  blueLight: '#EBF5FF',
  greenLight: '#E8F5E9',
  redLight: '#FEE2E2',
  yellowLight: '#FEF3C7',
  indigoLight: '#EEF2FF',
 
};

// Leave types as per policy
const allLeaveTypes = [
  { value: 'CL', label: 'Casual Leave (CL)', icon: 'home' },
  { value: 'SL', label: 'Sick Leave (SL)', icon: 'medical-services' },
  { value: 'PL', label: 'Privilege Leave (PL)', icon: 'calendar-today' },
  { value: 'BEREAVEMENT', label: 'Bereavement Leave', icon: 'favorite' },
];

const bereavementRelations = [
  'Spouse', 'Parent', 'Child', 'Sibling', 'Grandparent', 'In-Laws'
];

const dayTypes = ['Full Day', 'Half Day'];

interface LeaveApplication {
  id: string;
  leaveType: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  dayType: string;
  totalDays: number;
  status: string;
  appliedDate: string;
  bereavementRelation?: string;
}

interface LeaveBalance {
  CL: number;
  SL: number;
  PL: number;
  BEREAVEMENT: number;
}

interface UsedLeaves {
  CL: number;
  SL: number;
  PL: number;
  BEREAVEMENT: number;
}

interface EmployeeProfile {
  dateOfJoining?: string;
  dateofjoin?: string;
  hireDate?: string;
  createdAt?: string;
  designation?: string;
  position?: string;
  role?: string;
  employeeId?: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

const LeaveApplicationsScreen = () => {
  const [leaveData, setLeaveData] = useState({
    leaveType: 'PL',
    startDate: '',
    endDate: '',
    dayType: 'Full Day',
    bereavementRelation: '',
    supportingDocuments: null
  });

  const [allowedLeaveTypes, setAllowedLeaveTypes] = useState(allLeaveTypes);
  const [totalLeaveDays, setTotalLeaveDays] = useState(0);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({
    CL: 6,
    SL: 6,
    PL: 15,
    BEREAVEMENT: 2
  });
  const [apiUsedLeaves, setApiUsedLeaves] = useState<UsedLeaves | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveApplication[]>([]);
  const [editingLeaveId, setEditingLeaveId] = useState<string | null>(null);
  const [viewLeave, setViewLeave] = useState<LeaveApplication | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState({ message: '', type: 'success' as 'success' | 'error' | 'info', visible: false });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, leaveId: null as string | null });
  const [warningModal, setWarningModal] = useState({ isOpen: false, message: '' });
  const [submitModal, setSubmitModal] = useState({ isOpen: false, leave: null as LeaveApplication | null });

  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showRelationPicker, setShowRelationPicker] = useState(false);

  // Calculate date limits
  const today = new Date();
  const firstDayPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastDayCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const formatDateForInput = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const minDateLimit = formatDateForInput(firstDayPrevMonth);
  const maxDateLimit = formatDateForInput(lastDayCurrentMonth);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => setNotification({ message: '', type: 'success', visible: false }), 3000);
  };

  // Calculate working days excluding weekends
  const calculateWorkingDays = (start: string, end: string, dayType: string) => {
    if (!start || !end) return 0;

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (startDate > endDate) return 0;

    let count = 0;
    const current = new Date(startDate);

    while (current <= endDate) {
      const day = current.getDay();
      // Skip weekends (0=Sunday, 6=Saturday)
      if (day !== 0 && day !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Adjust for half day
    if (dayType === 'Half Day' && count === 1) {
      return 0.5;
    }

    return count;
  };

  const fetchMyLeaves = async () => {
    try {
      const res = await leaveAPI.myLeaves();
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped: LeaveApplication[] = items.map((l: any) => ({
        id: l._id,
        leaveType: l.leaveType,
        leaveTypeName: allLeaveTypes.find(t => t.value === l.leaveType)?.label || l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        dayType: l.dayType,
        totalDays: l.totalDays,
        status: l.status,
        appliedDate: l.appliedDate,
        bereavementRelation: l.bereavementRelation || ''
      }));
      setLeaveHistory(mapped);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    }
  };

  useEffect(() => {
    fetchMyLeaves();
    loadBalanceForMe();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMyLeaves();
    await loadBalanceForMe();
    setRefreshing(false);
  };

  const monthsBetween = (dateString: string) => {
    if (!dateString) return 0;
    const start = new Date(dateString);
    if (isNaN(start.getTime())) return 0;
    const now = new Date();
    const years = now.getFullYear() - start.getFullYear();
    const months = now.getMonth() - start.getMonth();
    const total = years * 12 + months;
    return Math.max(0, total);
  };

  const calculateLeaveBalances = (employee: { designation: string; monthsOfService: number }) => {
    const { designation, monthsOfService } = employee;
    let casual = 0, sick = 0, privilege = 0;
    const isTrainee = String(designation || '').toLowerCase().includes('trainee');
    const traineeMonths = Math.min(monthsOfService, 12);
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
    return { CL: casual, SL: sick, PL: privilege };
  };

  const applyVisibilityRules = (designation: string, monthsOfService: number) => {
    const isTrainee = String(designation || '').toLowerCase().includes('trainee');
    let showCLSL = false;
    
    if (isTrainee) {
      if (monthsOfService >= 12) showCLSL = true;
    } else {
      if (monthsOfService >= 6) showCLSL = true;
    }
    
    const filtered = allLeaveTypes.filter(t => {
      if (t.value === 'CL' || t.value === 'SL') return showCLSL;
      return true;
    });
    setAllowedLeaveTypes(filtered);
    
    // If current selected leave type is now hidden, reset to something valid
    if (!filtered.find(t => t.value === leaveData.leaveType)) {
      setLeaveData(prev => ({ ...prev, leaveType: filtered[0]?.value || '' }));
    }
  };

  const loadBalanceForMe = async () => {
    try {
      // Try dedicated endpoint for current user's balance
      const myRes = await leaveAPI.myBalance();
      const data = myRes?.data || {};
      if (data && data.balances) {
        applyVisibilityRules(data.position || data.designation || '', data.monthsOfService || 0);
        setLeaveBalance({
          CL: data.balances.casual?.allocated || 0,
          SL: data.balances.sick?.allocated || 0,
          PL: data.balances.privilege?.allocated || 0,
          BEREAVEMENT: 2
        });
        setApiUsedLeaves({
          CL: data.balances.casual?.used || 0,
          SL: data.balances.sick?.used || 0,
          PL: data.balances.privilege?.used || 0,
          BEREAVEMENT: 0
        });
        return;
      }
      
      // Fallback to AsyncStorage
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      const empId = user.employeeId || user.employeeCode || user.empId || '';
      
      const res = await leaveAPI.getBalance(empId ? { employeeId: empId } : undefined);
      const items = Array.isArray(res.data) ? res.data : [];
      const mine = items.find(e => String(e.employeeId || '').toLowerCase() === String(empId || '').toLowerCase()) ||
        items.find(e => String(e.email || '').toLowerCase() === String(user.email || '').toLowerCase()) ||
        items.find(e => String(e.name || '').toLowerCase() === String(user.name || '').toLowerCase());
      
      if (mine && mine.balances) {
        applyVisibilityRules(mine.position || mine.designation || '', mine.monthsOfService || 0);
        setLeaveBalance({
          CL: mine.balances.casual?.allocated || 0,
          SL: mine.balances.sick?.allocated || 0,
          PL: mine.balances.privilege?.allocated || 0,
          BEREAVEMENT: 2
        });
        setApiUsedLeaves({
          CL: mine.balances.casual?.used || 0,
          SL: mine.balances.sick?.used || 0,
          PL: mine.balances.privilege?.used || 0,
          BEREAVEMENT: 0
        });
        return;
      }
      throw new Error('No balance found');
    } catch (error) {
      // Final fallback
      try {
        const [empRes, myLeavesRes] = await Promise.all([
          employeeAPI.getMyProfile().catch(() => ({ data: {} as EmployeeProfile })),
          leaveAPI.myLeaves().catch(() => ({ data: [] }))
        ]);
        const emp = (empRes?.data || {}) as EmployeeProfile;
        const doj = emp.dateOfJoining || emp.dateofjoin || emp.hireDate || emp.createdAt || '';
        const m = monthsBetween(doj);
        const d = emp.designation || emp.position || emp.role || '';
        
        applyVisibilityRules(d, m);

        const alloc = calculateLeaveBalances({ designation: d, monthsOfService: m });
        const myApproved = Array.isArray(myLeavesRes?.data) ? myLeavesRes.data.filter((l: any) => l.status === 'Approved') : [];
        const used = myApproved.reduce((acc: UsedLeaves, l: any) => {
          const t = l.leaveType;
          const days = Number(l.totalDays || 0);
          if (t === 'CL') acc.CL += days;
          else if (t === 'SL') acc.SL += days;
          else if (t === 'PL') acc.PL += days;
          return acc;
        }, { CL: 0, SL: 0, PL: 0, BEREAVEMENT: 0 });
        
        setLeaveBalance({
          CL: Number(alloc.CL || 0),
          SL: Number(alloc.SL || 0),
          PL: Number(alloc.PL || 0),
          BEREAVEMENT: 2
        });
        setApiUsedLeaves(used);
      } catch (err) {
        console.error('Error in fallback balance calculation:', err);
      }
    }
  };

  const handleInputChange = (name: string, value: string) => {
    let newData = { ...leaveData, [name]: value };

    if (name === 'startDate' && leaveData.dayType === 'Half Day') {
      newData.endDate = value;
    }

    setLeaveData(newData);

    // Recalculate days
    let currentStartDate = name === 'startDate' ? value : leaveData.startDate;
    let currentEndDate = name === 'endDate' ? value : (name === 'startDate' && leaveData.dayType === 'Half Day' ? value : leaveData.endDate);
    let currentDayType = leaveData.dayType;

    if (currentStartDate && currentEndDate) {
      const days = calculateWorkingDays(currentStartDate, currentEndDate, currentDayType);
      setTotalLeaveDays(days);
    }
  };

  const handleDayTypeChange = (type: string) => {
    let newEndDate = leaveData.endDate;
    if (type === 'Half Day' && leaveData.startDate) {
      newEndDate = leaveData.startDate;
    }
    
    setLeaveData(prev => ({ ...prev, dayType: type, endDate: newEndDate }));

    if (leaveData.startDate && newEndDate) {
      const days = calculateWorkingDays(leaveData.startDate, newEndDate, type);
      setTotalLeaveDays(days);
    }
  };

  const getAvailableBalance = (type: string): number => {
    const base = Number(leaveBalance[type as keyof LeaveBalance] || 0);
    const pending = Number(pendingLeaves[type as keyof UsedLeaves] || 0);
    const used = Number(usedLeaves[type as keyof UsedLeaves] || 0);
    return base - pending - used;
  };

  // Calculate leave summary
  const usedLeaves = apiUsedLeaves || leaveHistory.reduce((acc: UsedLeaves, leave) => {
    if (['CL', 'SL', 'PL', 'BEREAVEMENT'].includes(leave.leaveType) && leave.status === 'Approved') {
      const key = leave.leaveType as keyof UsedLeaves;
      acc[key] = (acc[key] || 0) + leave.totalDays;
    }
    return acc;
  }, { CL: 0, SL: 0, PL: 0, BEREAVEMENT: 0 });

  const pendingLeaves = leaveHistory.reduce((acc: UsedLeaves, leave) => {
    if (['CL', 'SL', 'PL', 'BEREAVEMENT'].includes(leave.leaveType) && leave.status === 'Pending') {
      const key = leave.leaveType as keyof UsedLeaves;
      acc[key] = (acc[key] || 0) + leave.totalDays;
    }
    return acc;
  }, { CL: 0, SL: 0, PL: 0, BEREAVEMENT: 0 });

  const handleSubmit = async () => {
    if (submitting) return;
    
    // Validation
    if (!leaveData.startDate || !leaveData.endDate || !leaveData.leaveType) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    if (leaveData.leaveType === 'BEREAVEMENT' && !leaveData.bereavementRelation) {
      showNotification('Please specify relationship for bereavement leave', 'error');
      return;
    }

    // Check leave balance
    if (['CL', 'SL', 'BEREAVEMENT'].includes(leaveData.leaveType)) {
      const available = getAvailableBalance(leaveData.leaveType);
      if (totalLeaveDays > available) {
        setWarningModal({
          isOpen: true,
          message: 'You do not have sufficient leave balance for this leave type. Please apply leave under Privilege Leave (PL).'
        });
        return;
      }
    }

    // Check for overlapping leaves
    const newStart = new Date(leaveData.startDate);
    const newEnd = new Date(leaveData.endDate);
    const newIsHalfDay = leaveData.dayType === 'Half Day';

    if (newIsHalfDay) {
      if (isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
        return;
      }

      const targetDate = new Date(
        newStart.getFullYear(),
        newStart.getMonth(),
        newStart.getDate()
      );

      let halfDayTotal = 0;
      let hasFullDayConflict = false;

      leaveHistory.forEach(leave => {
        if (leave.status !== 'Approved' && leave.status !== 'Pending') return;
        if (editingLeaveId && leave.id === editingLeaveId) return;

        const existingStart = new Date(leave.startDate);
        const existingEnd = new Date(leave.endDate);

        if (isNaN(existingStart.getTime()) || isNaN(existingEnd.getTime())) {
          return;
        }

        const existingStartDay = new Date(
          existingStart.getFullYear(),
          existingStart.getMonth(),
          existingStart.getDate()
        );
        const existingEndDay = new Date(
          existingEnd.getFullYear(),
          existingEnd.getMonth(),
          existingEnd.getDate()
        );

        const coversTarget = targetDate >= existingStartDay && targetDate <= existingEndDay;

        if (!coversTarget) return;

        if (leave.dayType === 'Half Day' && existingStartDay.getTime() === existingEndDay.getTime()) {
          halfDayTotal += Number(leave.totalDays || 0);
        } else {
          hasFullDayConflict = true;
        }
      });

      if (hasFullDayConflict || halfDayTotal >= 1) {
        setWarningModal({
          isOpen: true,
          message: 'You have already taken leave on this date.'
        });
        return;
      }
    } else {
      const hasOverlappingLeave = leaveHistory.some(leave => {
        if (leave.status !== 'Approved' && leave.status !== 'Pending') return false;
        if (editingLeaveId && leave.id === editingLeaveId) return false;
        const existingStart = new Date(leave.startDate);
        const existingEnd = new Date(leave.endDate);
        if (isNaN(existingStart.getTime()) || isNaN(existingEnd.getTime()) ||
            isNaN(newStart.getTime()) || isNaN(newEnd.getTime())) {
          return false;
        }
        return newStart <= existingEnd && newEnd >= existingStart;
      });

      if (hasOverlappingLeave) {
        setWarningModal({
          isOpen: true,
          message: 'You have already taken leave on this date.'
        });
        return;
      }
    }

    setSubmitting(true);

    const leaveTypeName = allLeaveTypes.find(type => type.value === leaveData.leaveType)?.label || leaveData.leaveType;

    try {
      if (editingLeaveId) {
        const res = await leaveAPI.update(editingLeaveId, {
          leaveType: leaveData.leaveType,
          startDate: leaveData.startDate,
          endDate: leaveData.endDate,
          dayType: leaveData.dayType,
          bereavementRelation: leaveData.bereavementRelation || '',
          totalDays: totalLeaveDays
        });
        const l = res.data;
        setLeaveHistory(prev => prev.map(x => x.id === editingLeaveId ? {
          id: l._id,
          leaveType: l.leaveType,
          leaveTypeName: leaveTypeName,
          startDate: l.startDate,
          endDate: l.endDate,
          dayType: l.dayType,
          totalDays: l.totalDays,
          status: l.status,
          appliedDate: l.appliedDate,
          bereavementRelation: l.bereavementRelation || ''
        } : x));
        setEditingLeaveId(null);
        showNotification('Leave application updated successfully.', 'success');
      } else {
        const res = await leaveAPI.apply({
          leaveType: leaveData.leaveType,
          startDate: leaveData.startDate,
          endDate: leaveData.endDate,
          dayType: leaveData.dayType,
          bereavementRelation: leaveData.bereavementRelation || '',
          totalDays: totalLeaveDays
        });
        const l = res.data;
        const newLeave = {
          id: l._id,
          leaveType: l.leaveType,
          leaveTypeName: leaveTypeName,
          startDate: l.startDate,
          endDate: l.endDate,
          dayType: l.dayType,
          totalDays: l.totalDays,
          status: l.status,
          appliedDate: l.appliedDate,
          bereavementRelation: l.bereavementRelation || ''
        };
        setLeaveHistory(prev => [newLeave, ...prev]);
        setSubmitModal({ isOpen: true, leave: newLeave });
      }
    } catch (error) {
      console.error('Error submitting leave:', error);
      showNotification('Failed to submit leave application.', 'error');
    }

    // Reset form
    setLeaveData({
      leaveType: 'PL',
      startDate: '',
      endDate: '',
      dayType: 'Full Day',
      bereavementRelation: '',
      supportingDocuments: null
    });
    setTotalLeaveDays(0);
    setIsEditModalOpen(false);
    setSubmitting(false);
  };

  const handleEdit = (leave: LeaveApplication) => {
    if (leave.status !== 'Pending') {
      showNotification('Only Pending applications can be edited.', 'error');
      return;
    }
    setEditingLeaveId(leave.id);
    setLeaveData({
      leaveType: leave.leaveType,
      startDate: new Date(leave.startDate).toISOString().slice(0, 10),
      endDate: new Date(leave.endDate).toISOString().slice(0, 10),
      dayType: leave.dayType || 'Full Day',
      bereavementRelation: leave.leaveType === 'BEREAVEMENT' ? (leave.bereavementRelation || '') : '',
      supportingDocuments: null
    });
    setTotalLeaveDays(leave.totalDays || 0);
    setIsEditModalOpen(true);
  };

  const handleDelete = (leave: LeaveApplication) => {
    if (leave.status !== 'Pending') {
      showNotification('Only Pending applications can be deleted.', 'error');
      return;
    }
    setDeleteModal({ isOpen: true, leaveId: leave.id });
  };

  const confirmDelete = async () => {
    if (!deleteModal.leaveId) return;
    try {
      await leaveAPI.remove(deleteModal.leaveId);
      setLeaveHistory(prev => prev.filter(x => x.id !== deleteModal.leaveId));
      showNotification('Leave application deleted.', 'success');
    } catch (error) {
      showNotification('Failed to delete leave application.', 'error');
    }
    setDeleteModal({ isOpen: false, leaveId: null });
  };

  const handleView = (leave: LeaveApplication) => {
    setViewLeave(leave);
    setIsViewModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'Pending':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'Rejected':
        return { bg: '#FEE2E2', text: '#991B1B' };
      default:
        return { bg: '#F3F4F6', text: '#1F2937' };
    }
  };

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'CL': return 'home';
      case 'SL': return 'medical-services';
      case 'PL': return 'calendar-today';
      case 'BEREAVEMENT': return 'favorite';
      default: return 'description';
    }
  };

  const renderLeaveForm = () => (
    <View style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border }}>
      <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 }}>Submit Leave Request</Text>

      {/* Leave Type Selection */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>Select Leave Type *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row' }}>
            {allowedLeaveTypes.map(type => (
              <TouchableOpacity
                key={type.value}
                onPress={() => setLeaveData(prev => ({ ...prev, leaveType: type.value }))}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginRight: 8,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: leaveData.leaveType === type.value ? COLORS.blue : COLORS.border,
                  backgroundColor: leaveData.leaveType === type.value ? COLORS.blueLight : COLORS.white,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Icon name={type.icon} size={20} color={leaveData.leaveType === type.value ? COLORS.blue : COLORS.gray} />
                <Text style={{ 
                  marginLeft: 6,
                  fontSize: 13,
                  color: leaveData.leaveType === type.value ? COLORS.blue : COLORS.textPrimary,
                  fontWeight: leaveData.leaveType === type.value ? '600' : '400'
                }}>
                  {type.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Bereavement Relation */}
      {leaveData.leaveType === 'BEREAVEMENT' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>Relationship with Deceased *</Text>
          <TouchableOpacity
            onPress={() => setShowRelationPicker(true)}
            style={{
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 8,
              padding: 12,
              backgroundColor: COLORS.white,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: leaveData.bereavementRelation ? COLORS.textPrimary : COLORS.gray }}>
              {leaveData.bereavementRelation || 'Select Relationship'}
            </Text>
            <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
          </TouchableOpacity>
        </View>
      )}

      {/* Dates Section */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>Start Date *</Text>
        <TouchableOpacity
          onPress={() => setShowStartDatePicker(true)}
          style={{
            borderWidth: 1,
            borderColor: leaveData.startDate ? COLORS.blue : COLORS.border,
            borderRadius: 8,
            padding: 12,
            backgroundColor: leaveData.startDate ? COLORS.blueLight : COLORS.white,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: leaveData.startDate ? COLORS.blue : COLORS.gray }}>
            {leaveData.startDate ? formatDateForDisplay(leaveData.startDate) : 'Select Date'}
          </Text>
          <Icon name="calendar-today" size={20} color={leaveData.startDate ? COLORS.blue : COLORS.gray} />
        </TouchableOpacity>
      </View>

      {/* Day Type */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>Day Type</Text>
        <View style={{ flexDirection: 'row' }}>
          {dayTypes.map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => handleDayTypeChange(type)}
              style={{
                flex: 1,
                paddingVertical: 12,
                marginRight: type === 'Full Day' ? 8 : 0,
                borderRadius: 8,
                backgroundColor: leaveData.dayType === type ? COLORS.blue : COLORS.filterBg,
                alignItems: 'center',
              }}
            >
              <Text style={{ 
                color: leaveData.dayType === type ? COLORS.white : COLORS.textPrimary,
                fontWeight: '500'
              }}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* End Date */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>End Date *</Text>
        <TouchableOpacity
          onPress={() => !(leaveData.dayType === 'Half Day') && setShowEndDatePicker(true)}
          style={{
            borderWidth: 1,
            borderColor: leaveData.endDate ? COLORS.blue : COLORS.border,
            borderRadius: 8,
            padding: 12,
            backgroundColor: (leaveData.dayType === 'Half Day' || !leaveData.endDate) ? COLORS.white : COLORS.blueLight,
            opacity: leaveData.dayType === 'Half Day' ? 0.5 : 1,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: leaveData.endDate ? COLORS.blue : COLORS.gray }}>
            {leaveData.endDate ? formatDateForDisplay(leaveData.endDate) : 'Select Date'}
          </Text>
          <Icon name="calendar-today" size={20} color={leaveData.endDate ? COLORS.blue : COLORS.gray} />
        </TouchableOpacity>
      </View>

      {/* Total Days Display */}
      {totalLeaveDays > 0 && (
        <View style={{ marginBottom: 16, padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>Total Leave Days:</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.blue }}>{totalLeaveDays} day{totalLeaveDays !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={{
          backgroundColor: submitting ? COLORS.gray : COLORS.blue,
          paddingVertical: 14,
          borderRadius: 8,
          alignItems: 'center',
        }}
      >
        {submitting ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={{ color: COLORS.white, fontSize: 16, fontWeight: '600' }}>
            {editingLeaveId ? 'Update Leave Application' : 'Submit Leave Application'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderLeaveBalanceCard = (type: string, label: string, icon: string, color: string, bgColor: string) => (
    <View style={{ backgroundColor: bgColor, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: color + '30', marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.textPrimary }}>{label}</Text>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: color }}>{getAvailableBalance(type)} days</Text>
      <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 4 }}>Used: {usedLeaves[type as keyof UsedLeaves]} days</Text>
    </View>
  );

  const renderLeaveHistoryItem = ({ item }: { item: LeaveApplication }) => {
    const statusColors = getStatusBadge(item.status);
    
    return (
      <View style={{ backgroundColor: COLORS.white, padding: 12, marginBottom: 8, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ padding: 6, backgroundColor: statusColors.bg, borderRadius: 6, marginRight: 8 }}>
              <Icon name={getLeaveTypeIcon(item.leaveType)} size={16} color={statusColors.text} />
            </View>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{item.leaveTypeName}</Text>
              <Text style={{ fontSize: 11, color: COLORS.gray }}>{item.dayType}</Text>
            </View>
          </View>
          <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 10, color: statusColors.text, fontWeight: '600' }}>{item.status}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 11, color: COLORS.gray }}>From</Text>
            <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatDateForDisplay(item.startDate)}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 11, color: COLORS.gray }}>To</Text>
            <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{formatDateForDisplay(item.endDate)}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 11, color: COLORS.gray }}>Days</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.blue }}>{item.totalDays}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 }}>
          <TouchableOpacity onPress={() => handleView(item)} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}>
            <Icon name="visibility" size={16} color={COLORS.blue} />
            <Text style={{ fontSize: 11, color: COLORS.blue, marginLeft: 4 }}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleEdit(item)} 
            disabled={item.status !== 'Pending'}
            style={{ flexDirection: 'row', alignItems: 'center', marginRight: 16 }}
          >
            <Icon name="edit" size={16} color={item.status === 'Pending' ? COLORS.green : COLORS.gray} />
            <Text style={{ fontSize: 11, color: item.status === 'Pending' ? COLORS.green : COLORS.gray, marginLeft: 4 }}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => handleDelete(item)} 
            disabled={item.status !== 'Pending'}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Icon name="delete" size={16} color={item.status === 'Pending' ? COLORS.red : COLORS.gray} />
            <Text style={{ fontSize: 11, color: item.status === 'Pending' ? COLORS.red : COLORS.gray, marginLeft: 4 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Leave Applications" showBack={true} />

      {/* Notification Banner */}
      {notification.visible && (
        <View style={{ 
          position: 'absolute',
          top: Platform.OS === 'ios' ? 60 : 10,
          left: 16,
          right: 16,
          zIndex: 1000,
          backgroundColor: notification.type === 'success' ? COLORS.greenLight : 
                         notification.type === 'error' ? COLORS.redLight : COLORS.blueLight,
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: notification.type === 'success' ? COLORS.green :
                      notification.type === 'error' ? COLORS.red : COLORS.blue,
        }}>
          <Text style={{ 
            color: notification.type === 'success' ? COLORS.green :
                   notification.type === 'error' ? COLORS.red : COLORS.blue,
            fontWeight: '500'
          }}>
            {notification.message}
          </Text>
        </View>
      )}

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Leave Request Form */}
        {renderLeaveForm()}

        {/* Leave Summary */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 }}>Leave Summary</Text>
          
          {renderLeaveBalanceCard('CL', 'Casual Leave (CL)', 'home', COLORS.green, '#E8F5E9')}
          {renderLeaveBalanceCard('SL', 'Sick Leave (SL)', 'medical-services', COLORS.red, '#FFEBEE')}
          {renderLeaveBalanceCard('PL', 'Privilege Leave (PL)', 'calendar-today', COLORS.blue, '#E3F2FD')}
          {renderLeaveBalanceCard('BEREAVEMENT', 'Bereavement Leave', 'favorite', COLORS.purple, '#F3E5F5')}
        </View>

        {/* Leave History */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 }}>Leave History</Text>
          
          {leaveHistory.length === 0 ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <Icon name="history" size={48} color={COLORS.lightGray} />
              <Text style={{ fontSize: 16, color: COLORS.gray, marginTop: 12 }}>No leave history found</Text>
              <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 4 }}>Submit your first leave application</Text>
            </View>
          ) : (
            <FlatList
              data={leaveHistory}
              renderItem={renderLeaveHistoryItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Leave • Applications • History • "
      />

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={leaveData.startDate ? new Date(leaveData.startDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              handleInputChange('startDate', formatDateForInput(selectedDate));
            }
          }}
          minimumDate={firstDayPrevMonth}
          maximumDate={lastDayCurrentMonth}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={leaveData.endDate ? new Date(leaveData.endDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              handleInputChange('endDate', formatDateForInput(selectedDate));
            }
          }}
          minimumDate={leaveData.startDate ? new Date(leaveData.startDate) : firstDayPrevMonth}
          maximumDate={lastDayCurrentMonth}
        />
      )}

      {/* Relation Picker Modal */}
      <Modal
        visible={showRelationPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRelationPicker(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setShowRelationPicker(false)}
        >
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
          }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>Select Relationship</Text>
            </View>
            {bereavementRelations.map(relation => (
              <TouchableOpacity
                key={relation}
                onPress={() => {
                  setLeaveData(prev => ({ ...prev, bereavementRelation: relation }));
                  setShowRelationPicker(false);
                }}
                style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}
              >
                <Text style={{ fontSize: 16, color: COLORS.textPrimary }}>{relation}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* View Leave Modal */}
      <Modal
        visible={isViewModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsViewModalOpen(false)}
      >
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
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>Leave Application</Text>
              <TouchableOpacity onPress={() => setIsViewModalOpen(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {viewLeave && (
              <ScrollView style={{ padding: 16 }}>
                <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Leave Type</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>{viewLeave.leaveTypeName}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Start Date</Text>
                    <Text style={{ fontSize: 16, color: COLORS.textPrimary }}>{formatDateForDisplay(viewLeave.startDate)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>End Date</Text>
                    <Text style={{ fontSize: 16, color: COLORS.textPrimary }}>{formatDateForDisplay(viewLeave.endDate)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Day Type</Text>
                    <Text style={{ fontSize: 16, color: COLORS.textPrimary }}>{viewLeave.dayType}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Total Days</Text>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.blue }}>{viewLeave.totalDays}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, color: COLORS.gray }}>Status</Text>
                    <View style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }, { backgroundColor: getStatusBadge(viewLeave.status).bg }]}>
                      <Text style={{ fontSize: 12, color: getStatusBadge(viewLeave.status).text, fontWeight: '600' }}>{viewLeave.status}</Text>
                    </View>
                  </View>
                  {viewLeave.leaveType === 'BEREAVEMENT' && viewLeave.bereavementRelation && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 14, color: COLORS.gray }}>Relation</Text>
                      <Text style={{ fontSize: 16, color: COLORS.textPrimary }}>{viewLeave.bereavementRelation}</Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setIsViewModalOpen(false)}
                style={{
                  backgroundColor: COLORS.primary,
                  paddingVertical: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalOpen(false)}
      >
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
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>Edit Leave Application</Text>
              <TouchableOpacity onPress={() => {
                setIsEditModalOpen(false);
                setEditingLeaveId(null);
                setLeaveData({
                  leaveType: 'PL',
                  startDate: '',
                  endDate: '',
                  dayType: 'Full Day',
                  bereavementRelation: '',
                  supportingDocuments: null
                });
                setTotalLeaveDays(0);
              }}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {renderLeaveForm()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Warning Modal */}
      <Modal
        visible={warningModal.isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setWarningModal({ isOpen: false, message: '' })}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '80%', maxWidth: 300, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' }}>Balance Check</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'center' }}>
              {warningModal.message}
            </Text>
            <TouchableOpacity
              onPress={() => setWarningModal({ isOpen: false, message: '' })}
              style={{
                backgroundColor: COLORS.blue,
                paddingVertical: 10,
                borderRadius: 6,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModal.isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModal({ isOpen: false, leaveId: null })}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '80%', maxWidth: 300, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12, textAlign: 'center' }}>Confirm Deletion</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20, textAlign: 'center' }}>
              Are you sure you want to delete this leave application? This action cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setDeleteModal({ isOpen: false, leaveId: null })}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 6,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                  marginRight: 8,
                }}
              >
                <Text style={{ color: COLORS.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDelete}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 6,
                  backgroundColor: COLORS.red,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Submit Success Modal */}
      <Modal
        visible={submitModal.isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSubmitModal({ isOpen: false, leave: null })}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '80%', maxWidth: 300, padding: 20 }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.greenLight, justifyContent: 'center', alignItems: 'center' }}>
                <Icon name="check" size={24} color={COLORS.green} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12 }}>Leave Submitted</Text>
            </View>
            
            {submitModal.leave && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 }}>
                  Your leave request has been submitted.
                </Text>
                <View style={{ backgroundColor: COLORS.filterBg, padding: 12, borderRadius: 8 }}>
                  <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>
                    <Text style={{ fontWeight: '600' }}>Type:</Text> {submitModal.leave.leaveTypeName}
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textPrimary, marginTop: 4 }}>
                    <Text style={{ fontWeight: '600' }}>Period:</Text> {formatDateForDisplay(submitModal.leave.startDate)} to {formatDateForDisplay(submitModal.leave.endDate)}
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textPrimary, marginTop: 4 }}>
                    <Text style={{ fontWeight: '600' }}>Days:</Text> {submitModal.leave.totalDays}
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.textPrimary, marginTop: 4 }}>
                    <Text style={{ fontWeight: '600' }}>Status:</Text> {submitModal.leave.status}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setSubmitModal({ isOpen: false, leave: null })}
              style={{
                backgroundColor: COLORS.blue,
                paddingVertical: 10,
                borderRadius: 6,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default LeaveApplicationsScreen;