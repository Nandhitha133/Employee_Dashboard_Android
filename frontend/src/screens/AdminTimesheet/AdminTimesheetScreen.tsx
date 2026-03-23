// screens/AdminTimesheet/AdminTimesheetScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import { adminTimesheetAPI, employeeAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommonFooter from '../../components/CommonFooter';
import { useFocusEffect } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  holidayBg: '#E8F5E9'
};

interface TimeEntry {
  project: string;
  task: string;
  monday?: number;
  tuesday?: number;
  wednesday?: number;
  thursday?: number;
  friday?: number;
  saturday?: number;
  sunday?: number;
  total?: number;
  type?: string;
}

interface Timesheet {
  _id: string;
  employeeId: string;
  employeeName: string;
  division: string;
  location: string;
  week: string;
  timeEntries: TimeEntry[];
  weeklyTotal?: number;
  status: string;
  submittedDate?: string;
  rejectionReason?: string;
}

interface TimesheetEmployee {
  employeeId: string;
  name: string;
  division: string;
  location: string;
}

interface User {
  role?: string;
  employeeId?: string;
  name?: string;
}

interface Stats {
  totalTimesheets: number;
  pending: number;
  approved: number;
  rejected: number;
  totalEmployees: number;
  projectHours: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: string;
}

const AdminTimesheetScreen = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [user, setUser] = useState<User>({});
  const [allEmployees, setAllEmployees] = useState<TimesheetEmployee[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    employeeId: '',
    division: 'All Division',
    location: 'All Locations',
    status: 'All Status',
    week: 'All Weeks',
    project: 'All Projects',
    year: 'All Years'
  });

  // Options for pickers
  const [employeeIdOptions, setEmployeeIdOptions] = useState<string[]>(['']);
  const [projectOptions, setProjectOptions] = useState<string[]>(['All Projects']);
  const [weekOptions, setWeekOptions] = useState<string[]>(['All Weeks']);
  const [yearOptions, setYearOptions] = useState<string[]>(['All Years']);
  
  const [stats, setStats] = useState<Stats>({
    totalTimesheets: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalEmployees: 0,
    projectHours: 0
  });

  const isProjectManager = user.role === 'projectmanager' || user.role === 'project_manager';
  const isMounted = useRef(true);
  const fetchTimeout = useRef<any>(null);
  const initialLoadDone = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (fetchTimeout.current) {
        clearTimeout(fetchTimeout.current);
      }
    };
  }, []);

  // Load user and employees only once on mount
  useEffect(() => {
    loadUser();
    fetchEmployees();
  }, []);

  // Only fetch timesheets when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Only fetch if not initial load or if data is empty
      if (!initialLoadDone.current) {
        initialLoadDone.current = true;
        // Small delay to ensure user is loaded
        setTimeout(() => {
          if (isMounted.current && user.role) {
            fetchTimesheets();
          }
        }, 100);
      }
      return () => {};
    }, [user.role])
  );

  // Handle filter changes with debounce - only after initial load
  useEffect(() => {
    if (!isInitialLoadComplete) return;
    
    if (fetchTimeout.current) {
      clearTimeout(fetchTimeout.current);
    }
    
    fetchTimeout.current = setTimeout(() => {
      fetchTimesheets();
    }, 500);
    
    return () => {
      if (fetchTimeout.current) {
        clearTimeout(fetchTimeout.current);
      }
    };
  }, [filters, isInitialLoadComplete]);

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr && isMounted.current) {
        const userData = JSON.parse(userStr);
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getTimesheetEmployees();
      
      if (!isMounted.current) return;
      
      let rawData: any[] = [];
      
      if (Array.isArray(res.data)) {
        rawData = res.data;
      } else if (res.data?.success && Array.isArray(res.data.data)) {
        rawData = res.data.data;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        rawData = res.data.data;
      }
      
      const employeesData: TimesheetEmployee[] = rawData.map(emp => ({
        employeeId: emp.employeeId || emp.empId || emp.id || '',
        name: emp.name || emp.employeeName || emp.fullName || 'Unknown',
        division: emp.division || emp.department || 'Unknown',
        location: emp.location || emp.branch || 'Unknown'
      }));
      
      if (isMounted.current) {
        setAllEmployees(employeesData);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      if (isMounted.current) {
        setAllEmployees([]);
      }
    }
  };

  const formatDuration = (hours: number): string => {
    const val = Number(hours || 0);
    const totalMinutes = Math.round(val * 60);
    const sign = totalMinutes < 0 ? '-' : '';
    const absMinutes = Math.abs(totalMinutes);
    const hh = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const mm = String(absMinutes % 60).padStart(2, '0');
    return `${sign}${hh}:${mm}`;
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'pending':
      case 'submitted':
        return { bg: '#FEF3C7', text: '#92400E' };
      case 'not submitted':
        return { bg: '#F3F4F6', text: '#4A5568' };
      default:
        return { bg: '#F3F4F6', text: '#1F2937' };
    }
  };

  const fetchTimesheets = async () => {
    if (!isMounted.current) return;
    
    try {
      setLoading(true);
      
      // Prepare params - ensure it's always an object
      const params: Record<string, string> = { ...filters };
      
      // If filtering by Not Submitted, we need all timesheets first to compare
      if (filters.status === 'Not Submitted') {
        params.status = 'All Status';
      }

      // Make API call with params object
      const res = await adminTimesheetAPI.list(params);
      
      if (!isMounted.current) return;
      
      let data: Timesheet[] = [];
      
      // Match web version data extraction - res.data?.data || []
      if (res.data?.data && Array.isArray(res.data.data)) {
        data = res.data.data;
      } else if (Array.isArray(res.data)) {
        data = res.data;
      } else if (res.data?.timesheets && Array.isArray(res.data.timesheets)) {
        data = res.data.timesheets;
      } else if (res.data?.records && Array.isArray(res.data.records)) {
        data = res.data.records;
      }

      // Process options in a single pass for efficiency
      const needsYearUpdate = filters.year === 'All Years' && yearOptions.length === 1 && data.length > 0;
      const needsEmployeeIdUpdate = filters.employeeId === '' && employeeIdOptions.length === 1 && data.length > 0;
      const needsProjectUpdate = filters.project === 'All Projects' && projectOptions.length === 1 && data.length > 0;
      const needsWeekUpdate = filters.week === 'All Weeks' && weekOptions.length === 1 && filters.status !== 'Not Submitted' && data.length > 0;

      if (needsYearUpdate || needsEmployeeIdUpdate || needsProjectUpdate || needsWeekUpdate) {
        const uniqueYears = new Set<number>();
        const uniqueIds = new Set<string>();
        const projectSet = new Set<string>();
        const uniqueWeeks = new Set<string>();

        data.forEach(ts => {
          if (needsYearUpdate && ts.submittedDate) {
            uniqueYears.add(new Date(ts.submittedDate).getFullYear());
          }
          if (needsEmployeeIdUpdate && ts.employeeId) {
            uniqueIds.add(ts.employeeId);
          }
          if (needsProjectUpdate) {
            (ts.timeEntries || []).forEach(te => {
              const typeVal = (te.type || '').toLowerCase();
              const p = (te.project || '').trim();
              const taskVal = (te.task || '').toLowerCase();
              const isProj = typeVal === 'project' || (
                p && p.toLowerCase() !== 'leave' &&
                !taskVal.includes('leave') && !taskVal.includes('holiday')
              );
              if (isProj && p) projectSet.add(p);
            });
          }
          if (needsWeekUpdate && ts.week) {
            uniqueWeeks.add(ts.week);
          }
        });

        if (isMounted.current) {
          if (needsYearUpdate && uniqueYears.size > 0) {
            setYearOptions(["All Years", ...Array.from(uniqueYears).sort((a, b) => b - a).map(String)]);
          }
          if (needsEmployeeIdUpdate && uniqueIds.size > 0) {
            setEmployeeIdOptions(['', ...Array.from(uniqueIds).sort()]);
          }
          if (needsProjectUpdate && projectSet.size > 0) {
            setProjectOptions(["All Projects", ...Array.from(projectSet).sort()]);
          }
          if (needsWeekUpdate && uniqueWeeks.size > 0) {
            setWeekOptions(["All Weeks", ...Array.from(uniqueWeeks).sort().reverse()]);
          }
        }
      }

      // Filter by year after processing options
      if (filters.year !== 'All Years') {
        data = data.filter(ts => {
          if (!ts.submittedDate) return false;
          return String(new Date(ts.submittedDate).getFullYear()) === String(filters.year);
        });
      }

      // Handle Not Submitted Logic
      if (filters.status === 'Not Submitted' && allEmployees.length > 0) {
        const submittedEmployeeIds = new Set(data.map(r => r.employeeId));
        
        // Filter employees who haven't submitted
        const missingEmployees = allEmployees.filter(emp => {
          if (filters.division !== 'All Division' && emp.division !== filters.division) return false;
          if (filters.location !== 'All Locations' && emp.location !== filters.location) return false;
          if (filters.employeeId !== '' && emp.employeeId !== filters.employeeId) return false;
          return !submittedEmployeeIds.has(emp.employeeId);
        });

        // Transform into table-compatible format
        data = missingEmployees.map(emp => ({
          _id: `missing-${emp.employeeId}`,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          division: emp.division,
          location: emp.location,
          week: filters.week === 'All Weeks' ? '-' : filters.week,
          status: 'Not Submitted',
          timeEntries: [],
          weeklyTotal: 0,
          submittedDate: undefined
        }));
      }

      // Update employee ID options (only once)
      if (filters.employeeId === '' && employeeIdOptions.length === 1 && data.length > 0) {
        const uniqueIds = Array.from(new Set(data.map(r => r.employeeId).filter(Boolean))).sort();
        if (uniqueIds.length > 0 && isMounted.current) {
          setEmployeeIdOptions(['', ...uniqueIds]);
        }
      }

      // Extract projects
      if (filters.project === 'All Projects' && projectOptions.length === 1 && data.length > 0) {
        const projectSet = new Set<string>();
        data.forEach(ts => {
          (ts.timeEntries || []).forEach(te => {
            const typeVal = (te.type || '').toLowerCase();
            const p = (te.project || '').trim();
            const taskVal = (te.task || '').toLowerCase();
            const looksLikeProject = typeVal === 'project' || (
              p && p.toLowerCase() !== 'leave' &&
              !taskVal.includes('leave') && !taskVal.includes('holiday')
            );
            if (looksLikeProject && p) projectSet.add(p);
          });
        });
        if (projectSet.size > 0 && isMounted.current) {
          setProjectOptions(["All Projects", ...Array.from(projectSet).sort()]);
        }
      }

      // Extract weeks
      if (filters.week === 'All Weeks' && weekOptions.length === 1 && filters.status !== 'Not Submitted' && data.length > 0) {
        const uniqueWeeks = Array.from(new Set(data.map(r => r.week).filter(Boolean))).sort().reverse();
        if (uniqueWeeks.length > 0 && isMounted.current) {
          setWeekOptions(["All Weeks", ...uniqueWeeks]);
        }
      }

      // Calculate stats
      const totalEmployees = (() => {
        if (allEmployees.length > 0) {
          return allEmployees.filter(emp => {
            if (filters.division !== 'All Division' && emp.division !== filters.division) return false;
            if (filters.location !== 'All Locations' && emp.location !== filters.location) return false;
            if (filters.employeeId !== '' && emp.employeeId !== filters.employeeId) return false;
            return true;
          }).length;
        }
        return new Set(data.map(r => r.employeeId).filter(Boolean)).size;
      })();

      const statusCounts = data.reduce((acc, r) => {
        const s = (r.status || '').toLowerCase();
        if (s === 'approved') acc.approved++;
        else if (s === 'rejected') acc.rejected++;
        else if (s === 'pending' || s === 'submitted') acc.pending++;
        else if (s === 'not submitted') acc.notSubmitted++;
        else acc.pending++;
        return acc;
      }, { approved: 0, rejected: 0, pending: 0, notSubmitted: 0 });

      const projectHours = data.reduce((sum, r) => {
        const s = (r.status || '').toLowerCase();
        const includeRow = s === 'approved' || s === 'submitted';
        if (!includeRow) return sum;
        const entries = r.timeEntries || [];
        const projSum = entries.reduce((eSum, te) => {
          const typeVal = (te.type || '').toLowerCase();
          const p = (te.project || '').trim();
          const taskVal = (te.task || '').toLowerCase();
          const isProject = typeVal === 'project' || (
            p && p.toLowerCase() !== 'leave' &&
            !taskVal.includes('leave') && !taskVal.includes('holiday')
          );
          return eSum + (isProject ? Number(te.total || 0) : 0);
        }, 0);
        return sum + projSum;
      }, 0);

      if (isMounted.current) {
        setTimesheets(data);
        setIsDataLoaded(true);
        setIsInitialLoadComplete(true);
        setStats({
          totalTimesheets: data.length,
          pending: statusCounts.pending,
          approved: statusCounts.approved,
          rejected: statusCounts.rejected,
          totalEmployees,
          projectHours
        });
      }
    } catch (error: any) {
      console.error('Error fetching timesheets:', error);
      if (isMounted.current) {
        setTimesheets([]);
        setStats({
          totalTimesheets: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          totalEmployees: 0,
          projectHours: 0
        });
        Alert.alert('Error', error.response?.data?.message || 'Failed to load timesheets');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setInitialLoading(false);
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    if (!isMounted.current) return;
    setRefreshing(true);
    fetchTimesheets();
  };

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value,
      ...(['division', 'location', 'week', 'year', 'employeeId'].includes(filterName) ? { project: 'All Projects' } : {})
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      employeeId: '',
      division: 'All Division',
      location: 'All Locations',
      status: 'All Status',
      week: 'All Weeks',
      project: 'All Projects',
      year: 'All Years'
    });
  };

  const handleRefresh = () => {
    fetchTimesheets();
  };

  const isFilterApplied = (): boolean => {
    return (
      filters.employeeId !== '' ||
      filters.division !== 'All Division' ||
      filters.location !== 'All Locations' ||
      filters.status !== 'All Status' ||
      filters.week !== 'All Weeks' ||
      filters.project !== 'All Projects' ||
      filters.year !== 'All Years'
    );
  };

  const updateStatsFromList = (list: Timesheet[]) => {
    const totalTimesheets = list.length;
    const statusCounts = list.reduce((acc, r) => {
      const s = (r.status || '').toLowerCase();
      if (s === 'approved') acc.approved++;
      else if (s === 'rejected') acc.rejected++;
      else acc.pending++;
      return acc;
    }, { approved: 0, rejected: 0, pending: 0 });
    const projectHours = list.reduce((sum, r) => {
      const s = (r.status || '').toLowerCase();
      const includeRow = s === 'approved' || s === 'submitted' || s === 'pending';
      const entries = r.timeEntries || [];
      const projSum = entries.reduce((eSum, te) => {
        const typeVal = (te.type || '').toLowerCase();
        const p = (te.project || '').trim();
        const taskVal = (te.task || '').toLowerCase();
        const isProject = typeVal === 'project' || (
          p && p.toLowerCase() !== 'leave' &&
          !taskVal.includes('leave') && !taskVal.includes('holiday')
        );
        return eSum + (isProject ? Number(te.total || 0) : 0);
      }, 0);
      return sum + projSum;
    }, 0);
    
    setStats(prev => ({
      totalTimesheets,
      pending: statusCounts.pending,
      approved: statusCounts.approved,
      rejected: statusCounts.rejected,
      totalEmployees: prev.totalEmployees,
      projectHours
    }));
  };

  const handleApprove = async (timesheetId: string) => {
    setActionLoading(prev => ({ ...prev, [timesheetId]: true }));
    try {
      await adminTimesheetAPI.approve(timesheetId);
      const updatedTimesheets = timesheets.map((ts: Timesheet) => 
        ts._id === timesheetId ? { ...ts, status: 'Approved' } : ts
      );
      setTimesheets(updatedTimesheets);
      updateStatsFromList(updatedTimesheets);
      Alert.alert('Success', 'Timesheet approved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to approve timesheet');
    } finally {
      setActionLoading(prev => ({ ...prev, [timesheetId]: false }));
    }
  };

  const [rejectDialog, setRejectDialog] = useState<{ isOpen: boolean; timesheetId: string | null; reason: string }>({ 
    isOpen: false, 
    timesheetId: null, 
    reason: '' 
  });

  const openRejectDialog = (timesheetId: string) => {
    if (!timesheetId) return;
    setRejectDialog({ isOpen: true, timesheetId, reason: '' });
  };

  const closeRejectDialog = () => {
    setRejectDialog({ isOpen: false, timesheetId: null, reason: '' });
  };

  const submitReject = async () => {
    const timesheetId = rejectDialog.timesheetId;
    const reason = rejectDialog.reason.trim();

    if (!timesheetId) return;
    if (!reason) {
      Alert.alert('Error', 'Rejection reason is required');
      return;
    }

    setActionLoading(prev => ({ ...prev, [timesheetId]: true }));
    try {
      await adminTimesheetAPI.reject(timesheetId, reason);
      const updatedTimesheets = timesheets.map((ts: Timesheet) => 
        ts._id === timesheetId ? { ...ts, status: 'Rejected', rejectionReason: reason } : ts
      );
      setTimesheets(updatedTimesheets);
      updateStatsFromList(updatedTimesheets);
      closeRejectDialog();
      Alert.alert('Success', 'Timesheet rejected successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject timesheet');
    } finally {
      setActionLoading(prev => ({ ...prev, [timesheetId]: false }));
    }
  };

  const handleView = (timesheet: Timesheet) => {
    setSelectedTimesheet(timesheet);
    setShowViewModal(true);
  };

  // Stat Card Component
  const StatCard = ({ title, value, icon, color }: StatCardProps) => (
    <View style={{
      backgroundColor: COLORS.white,
      borderRadius: 12,
      padding: 12,
      marginRight: 8,
      minWidth: 120,
      borderWidth: 1,
      borderColor: COLORS.border,
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          backgroundColor: `${color}20`,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Icon name={icon} size={20} color={color} />
        </View>
      </View>
      <Text style={{ fontSize: 11, color: COLORS.gray, marginBottom: 4 }}>{title}</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.textPrimary }}>{value}</Text>
    </View>
  );

  // Reject Dialog Modal
  const renderRejectDialog = () => (
    <Modal
      visible={rejectDialog.isOpen}
      transparent
      animationType="fade"
      onRequestClose={closeRejectDialog}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{
          backgroundColor: COLORS.white,
          borderRadius: 12,
          width: '90%',
          maxWidth: 400,
          padding: 20,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary }}>Reject Timesheet</Text>
            <TouchableOpacity onPress={closeRejectDialog}>
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 12 }}>Enter rejection reason:</Text>
          
          <TextInput
            value={rejectDialog.reason}
            onChangeText={(text) => setRejectDialog(prev => ({ ...prev, reason: text }))}
            placeholder="Type reason..."
            placeholderTextColor={COLORS.gray}
            multiline
            numberOfLines={4}
            style={{
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              textAlignVertical: 'top',
              minHeight: 100,
              color: COLORS.textPrimary,
            }}
          />
          
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 12 }}>
            <TouchableOpacity
              onPress={closeRejectDialog}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: COLORS.gray }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={submitReject}
              disabled={!rejectDialog.reason.trim() || !!actionLoading[rejectDialog.timesheetId || '']}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: COLORS.red,
                borderRadius: 6,
                opacity: (!rejectDialog.reason.trim() || !!actionLoading[rejectDialog.timesheetId || '']) ? 0.6 : 1,
              }}
            >
              {actionLoading[rejectDialog.timesheetId || ''] ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Reject</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Filter Section
  const renderFilters = () => (
    <View style={{ backgroundColor: COLORS.white, padding: 12, marginBottom: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Filters</Text>
        {isFilterApplied() && (
          <TouchableOpacity onPress={handleClearFilters}>
            <Text style={{ color: COLORS.blue, fontSize: 14 }}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Employee ID Filter */}
          <View style={{ width: 150 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Employee ID</Text>
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
              <Picker
                selectedValue={filters.employeeId}
                onValueChange={(value: string) => handleFilterChange('employeeId', value)}
                style={{ height: 40, width: 150 }}
              >
                {employeeIdOptions.map(id => (
                  <PickerItem key={id} label={id === '' ? 'All Employees' : id} value={id} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Division Filter */}
          {!isProjectManager && (
            <View style={{ width: 120 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Division</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
                <Picker
                  selectedValue={filters.division}
                  onValueChange={(value: string) => handleFilterChange('division', value)}
                  style={{ height: 40, width: 120 }}
                >
                  <PickerItem label="All Division" value="All Division" />
                  <PickerItem label="SDS" value="SDS" />
                  <PickerItem label="TEKLA" value="TEKLA" />
                  <PickerItem label="DAS(Software)" value="DAS(Software)" />
                  <PickerItem label="Mechanical" value="Mechanical" />
                </Picker>
              </View>
            </View>
          )}

          {/* Location Filter */}
          {!isProjectManager && (
            <View style={{ width: 120 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Location</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
                <Picker
                  selectedValue={filters.location}
                  onValueChange={(value: string) => handleFilterChange('location', value)}
                  style={{ height: 40, width: 120 }}
                >
                  <PickerItem label="All Locations" value="All Locations" />
                  <PickerItem label="Chennai" value="Chennai" />
                  <PickerItem label="Hosur" value="Hosur" />
                </Picker>
              </View>
            </View>
          )}

          {/* Status Filter */}
          <View style={{ width: 120 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Status</Text>
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
              <Picker
                selectedValue={filters.status}
                onValueChange={(value: string) => handleFilterChange('status', value)}
                style={{ height: 40, width: 120 }}
              >
                <PickerItem label="All Status" value="All Status" />
                <PickerItem label="Submitted" value="Submitted" />
                <PickerItem label="Approved" value="Approved" />
                <PickerItem label="Rejected" value="Rejected" />
                <PickerItem label="Not Submitted" value="Not Submitted" />
              </Picker>
            </View>
          </View>

          {/* Year Filter */}
          <View style={{ width: 100 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Year</Text>
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
              <Picker
                selectedValue={filters.year}
                onValueChange={(value: string) => handleFilterChange('year', value)}
                style={{ height: 40, width: 100 }}
              >
                {yearOptions.map(year => (
                  <PickerItem key={year} label={year} value={year} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Week Filter */}
          <View style={{ width: 120 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Week</Text>
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
              <Picker
                selectedValue={filters.week}
                onValueChange={(value: string) => handleFilterChange('week', value)}
                style={{ height: 40, width: 120 }}
              >
                {weekOptions.map(week => (
                  <PickerItem key={week} label={week} value={week} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Project Filter */}
          <View style={{ width: 150 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Project</Text>
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
              <Picker
                selectedValue={filters.project}
                onValueChange={(value: string) => handleFilterChange('project', value)}
                style={{ height: 40, width: 150 }}
              >
                {projectOptions.map(p => (
                  <PickerItem key={p} label={p} value={p} />
                ))}
              </Picker>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  // Table Header
  const renderTableHeader = () => (
    <View style={{ 
      flexDirection: 'row', 
      backgroundColor: COLORS.primary, 
      paddingVertical: 12, 
      paddingHorizontal: 4,
    }}>
      <Text style={{ width: 80, color: COLORS.white, fontWeight: '700', fontSize: 12, paddingLeft: 4 }}>Emp ID</Text>
      <Text style={{ width: 100, color: COLORS.white, fontWeight: '700', fontSize: 12, paddingLeft: 4 }}>Name</Text>
      {!isProjectManager && <Text style={{ width: 80, color: COLORS.white, fontWeight: '700', fontSize: 12, paddingLeft: 4 }}>Division</Text>}
      {!isProjectManager && <Text style={{ width: 70, color: COLORS.white, fontWeight: '700', fontSize: 12, paddingLeft: 4 }}>Location</Text>}
      <Text style={{ width: 90, color: COLORS.white, fontWeight: '700', fontSize: 12, paddingLeft: 4 }}>Week</Text>
      <Text style={{ width: 100, color: COLORS.white, fontWeight: '700', fontSize: 12, paddingLeft: 4 }}>Projects</Text>
      <Text style={{ width: 80, color: COLORS.white, fontWeight: '700', fontSize: 12, paddingLeft: 4 }}>Hours</Text>
      <Text style={{ width: 80, color: COLORS.white, fontWeight: '700', fontSize: 12, paddingLeft: 4 }}>Status</Text>
      <Text style={{ width: 100, color: COLORS.white, fontWeight: '700', fontSize: 12, textAlign: 'center' }}>Actions</Text>
    </View>
  );

  // Table Row
  const renderTableRow = (timesheet: Timesheet, index: number) => {
    const statusColors = getStatusBadge(timesheet.status || '');
    const projects = (timesheet.timeEntries || [])
      .map(entry => entry.project)
      .filter(Boolean)
      .join(', ');

    return (
      <View key={timesheet._id} style={{ 
        flexDirection: 'row', 
        backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.filterBg,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        alignItems: 'center',
        minHeight: 50,
      }}>
        <Text style={{ width: 80, color: COLORS.blue, fontWeight: '500', fontSize: 12 }}>{timesheet.employeeId || '—'}</Text>
        <Text style={{ width: 100, color: COLORS.textPrimary, fontSize: 12 }}>{timesheet.employeeName}</Text>
        {!isProjectManager && <Text style={{ width: 80, color: COLORS.textSecondary, fontSize: 12 }}>{timesheet.division || '—'}</Text>}
        {!isProjectManager && <Text style={{ width: 70, color: COLORS.textSecondary, fontSize: 12 }}>{timesheet.location || '—'}</Text>}
        <Text style={{ width: 90, color: COLORS.textPrimary, fontSize: 12 }}>{timesheet.week || '—'}</Text>
        <Text style={{ width: 100, color: COLORS.textSecondary, fontSize: 11 }} numberOfLines={1}>{projects || '—'}</Text>
        <Text style={{ width: 80, color: COLORS.green, fontWeight: '600', fontSize: 12 }}>{formatDuration(timesheet.weeklyTotal || 0)}</Text>
        <View style={{ width: 80 }}>
          <View style={[{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 20,
            alignSelf: 'flex-start',
          }, { backgroundColor: statusColors.bg }]}>
            <Text style={{ fontSize: 10, color: statusColors.text, fontWeight: '600' }}>
              {timesheet.status === 'Submitted' ? 'Pending' : (timesheet.status || '—')}
            </Text>
          </View>
        </View>
        <View style={{ width: 100, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={() => handleView(timesheet)}
            style={{ padding: 6, backgroundColor: COLORS.primary, borderRadius: 4 }}
          >
            <Icon name="visibility" size={14} color={COLORS.white} />
          </TouchableOpacity>
          
          {!['approved', 'rejected', 'not submitted'].includes((timesheet.status || '').toLowerCase()) && (
            <>
              <TouchableOpacity
                onPress={() => openRejectDialog(timesheet._id)}
                disabled={actionLoading[timesheet._id]}
                style={{ padding: 6, backgroundColor: COLORS.red, borderRadius: 4 }}
              >
                {actionLoading[timesheet._id] ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Icon name="close" size={14} color={COLORS.white} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleApprove(timesheet._id)}
                disabled={actionLoading[timesheet._id]}
                style={{ padding: 6, backgroundColor: COLORS.green, borderRadius: 4 }}
              >
                {actionLoading[timesheet._id] ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Icon name="check" size={14} color={COLORS.white} />
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // View Modal
  const renderViewModal = () => {
    const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return (
      <Modal
        visible={showViewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowViewModal(false)}
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
              <View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>
                  Timesheet Details
                </Text>
                {selectedTimesheet && (
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
                    {selectedTimesheet.employeeName}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {selectedTimesheet && (
              <ScrollView style={{ padding: 16 }}>
                {/* Basic Info Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16, gap: 8 }}>
                  <View style={{ flex: 1, minWidth: '48%', padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Employee ID</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary }}>{selectedTimesheet.employeeId}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: '48%', padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Status</Text>
                    <View style={[{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 20,
                      alignSelf: 'flex-start',
                      marginTop: 2,
                    }, { backgroundColor: getStatusBadge(selectedTimesheet.status || '').bg }]}>
                      <Text style={{ fontSize: 11, color: getStatusBadge(selectedTimesheet.status || '').text, fontWeight: '600' }}>
                        {selectedTimesheet.status === 'Submitted' ? 'Pending' : (selectedTimesheet.status || '—')}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flex: 1, minWidth: '48%', padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Division</Text>
                    <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{selectedTimesheet.division || '—'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: '48%', padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Location</Text>
                    <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{selectedTimesheet.location || '—'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: '48%', padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Week</Text>
                    <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{selectedTimesheet.week || '—'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: '48%', padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: COLORS.gray }}>Submitted</Text>
                    <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>{selectedTimesheet.submittedDate || '—'}</Text>
                  </View>
                </View>

                {/* Time Entries Table */}
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, marginBottom: 12 }}>
                  Time Entries
                </Text>

                <ScrollView horizontal>
                  <View>
                    {/* Table Header */}
                    <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 4 }}>
                      <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Project</Text>
                      <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Task</Text>
                      {shortDays.map(day => (
                        <Text key={day} style={{ width: 40, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'center' }}>{day}</Text>
                      ))}
                      <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'center' }}>Total</Text>
                    </View>

                    {/* Table Rows */}
                    {(selectedTimesheet.timeEntries || []).map((entry: TimeEntry, idx: number) => (
                      <View key={idx} style={{ flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                        <Text style={{ width: 100, fontSize: 11, color: COLORS.textPrimary }} numberOfLines={1}>{entry.project}</Text>
                        <Text style={{ width: 100, fontSize: 11, color: COLORS.textSecondary }} numberOfLines={1}>{entry.task}</Text>
                        <Text style={{ width: 40, fontSize: 11, textAlign: 'center', color: COLORS.textSecondary }}>
                          {entry.monday && entry.monday > 0 ? formatDuration(entry.monday) : '-'}
                        </Text>
                        <Text style={{ width: 40, fontSize: 11, textAlign: 'center', color: COLORS.textSecondary }}>
                          {entry.tuesday && entry.tuesday > 0 ? formatDuration(entry.tuesday) : '-'}
                        </Text>
                        <Text style={{ width: 40, fontSize: 11, textAlign: 'center', color: COLORS.textSecondary }}>
                          {entry.wednesday && entry.wednesday > 0 ? formatDuration(entry.wednesday) : '-'}
                        </Text>
                        <Text style={{ width: 40, fontSize: 11, textAlign: 'center', color: COLORS.textSecondary }}>
                          {entry.thursday && entry.thursday > 0 ? formatDuration(entry.thursday) : '-'}
                        </Text>
                        <Text style={{ width: 40, fontSize: 11, textAlign: 'center', color: COLORS.textSecondary }}>
                          {entry.friday && entry.friday > 0 ? formatDuration(entry.friday) : '-'}
                        </Text>
                        <Text style={{ width: 40, fontSize: 11, textAlign: 'center', color: COLORS.textSecondary }}>
                          {entry.saturday && entry.saturday > 0 ? formatDuration(entry.saturday) : '-'}
                        </Text>
                        <Text style={{ width: 40, fontSize: 11, textAlign: 'center', color: COLORS.textSecondary }}>
                          {entry.sunday && entry.sunday > 0 ? formatDuration(entry.sunday) : '-'}
                        </Text>
                        <Text style={{ width: 50, fontSize: 11, textAlign: 'center', color: COLORS.green, fontWeight: '600' }}>
                          {formatDuration(entry.total || 0)}
                        </Text>
                      </View>
                    ))}

                    {/* Weekly Total */}
                    <View style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, backgroundColor: COLORS.filterBg, marginTop: 8 }}>
                      <Text style={{ width: 440, fontSize: 13, fontWeight: '600', color: COLORS.gray, textAlign: 'right' }}>Weekly Total:</Text>
                      <Text style={{ width: 50, fontSize: 13, fontWeight: '700', textAlign: 'center', color: COLORS.primary }}>
                        {formatDuration(selectedTimesheet.weeklyTotal || 0)}
                      </Text>
                    </View>

                    {/* Rejection Reason */}
                    {selectedTimesheet.status === 'Rejected' && selectedTimesheet.rejectionReason && (
                      <View style={{ marginTop: 16, padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#991B1B', marginBottom: 4 }}>Rejection Reason</Text>
                        <Text style={{ fontSize: 12, color: '#991B1B' }}>{selectedTimesheet.rejectionReason}</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </ScrollView>
            )}

            {/* Modal Actions */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border, flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setShowViewModal(false)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: COLORS.gray,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
              
              {selectedTimesheet && ['submitted', 'pending'].includes((selectedTimesheet.status || '').toLowerCase()) && (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      openRejectDialog(selectedTimesheet._id);
                      setShowViewModal(false);
                    }}
                    disabled={actionLoading[selectedTimesheet._id]}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      marginRight: 8,
                      backgroundColor: COLORS.red,
                      borderRadius: 6,
                    }}
                  >
                    {actionLoading[selectedTimesheet._id] ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={{ color: COLORS.white, fontWeight: '600' }}>Reject</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      handleApprove(selectedTimesheet._id);
                      setShowViewModal(false);
                    }}
                    disabled={actionLoading[selectedTimesheet._id]}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      backgroundColor: COLORS.green,
                      borderRadius: 6,
                    }}
                  >
                    {actionLoading[selectedTimesheet._id] ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={{ color: COLORS.white, fontWeight: '600' }}>Approve</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const statConfigs = [
    { title: 'Total Timesheets', value: stats.totalTimesheets, icon: 'bar-chart', color: COLORS.blue },
    { title: 'Pending Review', value: stats.pending, icon: 'access-time', color: COLORS.orange },
    { title: 'Approved', value: stats.approved, icon: 'check-circle', color: COLORS.green },
    { title: 'Rejected', value: stats.rejected, icon: 'cancel', color: COLORS.red },
    { title: 'Total Employees', value: stats.totalEmployees, icon: 'people', color: COLORS.purple },
    { title: 'Project Hours', value: formatDuration(stats.projectHours), icon: 'calendar-today', color: COLORS.pink }
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Admin Timesheet" showBack={true} />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Statistics Cards */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={{ flexDirection: 'row' }}>
            {statConfigs.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))}
          </View>
        </ScrollView>

        {/* Filters Toggle Button */}
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={{
            backgroundColor: COLORS.primary,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Icon name="filter-list" size={18} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '500', marginLeft: 6 }}>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Text>
        </TouchableOpacity>

        {/* Filters Section */}
        {showFilters && renderFilters()}

        {/* Submitted Timesheets Header with Count */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 12,
          marginTop: 8
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="assignment" size={20} color={COLORS.primary} />
            <Text style={{ 
              fontSize: 16, 
              fontWeight: '600', 
              color: COLORS.textPrimary,
              marginLeft: 8
            }}>
              Submitted Timesheets
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: COLORS.gray, 
              marginLeft: 8,
              fontWeight: '500'
            }}>
              {timesheets.length} records
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleRefresh}
            disabled={loading}
            style={{
              backgroundColor: loading ? COLORS.gray : COLORS.primary,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Icon name="refresh" size={16} color={COLORS.white} />
            <Text style={{ color: COLORS.white, fontSize: 12, marginLeft: 4 }}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Timesheets Table */}
        {initialLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading timesheets...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {renderTableHeader()}
                <View>
                  {timesheets.length === 0 ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <Icon name="assignment" size={48} color={COLORS.lightGray} />
                      <Text style={{ color: COLORS.gray, fontSize: 14, marginTop: 8 }}>No timesheets found</Text>
                    </View>
                  ) : (
                    timesheets.map((timesheet, index) => renderTableRow(timesheet, index))
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Admin Dashboard • Timesheet Management • "
      />

      {/* View Modal */}
      {renderViewModal()}

      {/* Reject Dialog */}
      {renderRejectDialog()}
    </SafeAreaView>
  );
};

export default AdminTimesheetScreen;