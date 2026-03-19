// screens/Timesheet/TimesheetHistoryScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import RNFS from 'react-native-fs';
import XLSX from 'xlsx';
import Share from 'react-native-share';
import { timesheetAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';

const COLORS = {
  primary: '#262760',
  primaryDark: '#1e2050',
  secondary: '#1A237E',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
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
  filterBg: '#F8FAFC',
};

interface TimesheetEntry {
  project: string;
  projectCode?: string;
  task: string;
  hours: number[];
  type?: string;
}

interface Timesheet {
  _id: string;
  weekStartDate: string;
  weekEndDate: string;
  entries: TimesheetEntry[];
  status: string;
  totalHours?: number;
  totalHoursWithBreak?: number;
  submittedAt?: string;
  updatedAt?: string;
  shiftType?: string;
  dailyShiftTypes?: string[];
  isSessionDraft?: boolean;
  rejectionReason?: string;
}

interface Filter {
  year: string;
  month: string;
  status: string;
}

interface MonthOption {
  value: string;
  label: string;
}

const TimesheetHistoryScreen: React.FC = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState<Timesheet[]>([]);
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [timesheetToDelete, setTimesheetToDelete] = useState<Timesheet | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState<boolean>(false);
  const [messageDialogConfig, setMessageDialogConfig] = useState<{
    title: string;
    message: string;
    type: 'info' | 'success' | 'error' | 'warning';
  }>({
    title: '',
    message: '',
    type: 'info'
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filter, setFilter] = useState<Filter>({
    year: '',
    month: '',
    status: ''
  });
  const [downloadOption, setDownloadOption] = useState<'weekly' | 'monthly'>('weekly');
  const [downloadFormat, setDownloadFormat] = useState<'excel' | 'pdf'>('excel');

  const years: string[] = ['2026', '2025', '2024', '2023', '2022'];
  const months: MonthOption[] = [
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' },
  ];
  const statuses: string[] = ['draft', 'submitted', 'approved', 'rejected'];

  const showMessage = (title: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void => {
    setMessageDialogConfig({ title, message, type });
    setShowMessageDialog(true);
  };

  const getProjectCode = (entry: TimesheetEntry): string => {
    if (!entry) return '-';
    if (entry.projectCode) return entry.projectCode;
    if (entry.project) {
      const codeMatch = entry.project.match(/^([A-Z0-9]+)/);
      return codeMatch ? codeMatch[1] : entry.project.substring(0, 8).toUpperCase();
    }
    return '-';
  };

  const getProjectCodes = (entries: TimesheetEntry[]): string => {
    const projectCodes = Array.from(new Set((entries || []).map(e => getProjectCode(e)))).filter(Boolean);
    return projectCodes.length > 0 ? projectCodes.join(', ') : '-';
  };

  const fetchTimesheets = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await timesheetAPI.getMyTimesheets();
      const backendData = Array.isArray(res.data?.data) ? res.data.data : [];
      setTimesheets(backendData);
      setFilteredTimesheets(backendData);
    } catch (err) {
      console.error('Failed to fetch timesheets:', err);
      showMessage('Error', 'Unable to load timesheet history. Please try again.', 'error');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTimesheets();
  }, [fetchTimesheets]);

  // Apply filters
  useEffect(() => {
    let filtered = timesheets;

    if (filter.year) {
      filtered = filtered.filter(t => {
        const timesheetYear = new Date(t.weekStartDate).getFullYear().toString();
        return timesheetYear === filter.year;
      });
    }

    if (filter.month !== '') {
      filtered = filtered.filter(t => {
        const timesheetMonth = new Date(t.weekStartDate).getMonth().toString();
        return timesheetMonth === filter.month;
      });
    }

    if (filter.status) {
      filtered = filtered.filter(t =>
        (t.status || '').toLowerCase() === filter.status.toLowerCase()
      );
    }

    setFilteredTimesheets(filtered);
  }, [filter, timesheets]);

  const onRefresh = (): void => {
    setRefreshing(true);
    fetchTimesheets();
  };

  const getStatusBadge = (status: string): { bg: string; text: string } => {
    const statusLower = (status || '').toLowerCase();
    switch (statusLower) {
      case 'approved':
        return { bg: COLORS.greenLight, text: COLORS.green };
      case 'submitted':
        return { bg: COLORS.yellowLight, text: COLORS.warning };
      case 'rejected':
        return { bg: COLORS.redLight, text: COLORS.red };
      case 'draft':
        return { bg: COLORS.lightGray, text: COLORS.gray };
      default:
        return { bg: COLORS.lightGray, text: COLORS.gray };
    }
  };

  const formatWeekRange = (start: string, end: string): string => {
    const s = new Date(start);
    const e = new Date(end);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const formatDateTime = (dateStr: string): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toHHMM = (hours: number): string => {
    const val = Number(hours || 0);
    if (val === 0) return '0:00';
    const m = Math.round(val * 60);
    if (m === 0) return '0:00';
    const sign = m < 0 ? '-' : '';
    const abs = Math.abs(m);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    return `${sign}${hh}:${mm}`;
  };

  const getShiftBreakHours = (shift: string): number => {
    if (!shift) return 0;
    const s = String(shift);
    if (s.startsWith("First Shift")) return 65 / 60;
    if (s.startsWith("Second Shift")) return 60 / 60;
    if (s.startsWith("General Shift")) return 75 / 60;
    return 0;
  };

  const calculateWeeklyTotalWithBreak = (timesheet: Timesheet): number => {
    if (!timesheet) return 0;
    const entries = Array.isArray(timesheet.entries) ? timesheet.entries : [];
    const weeklyWork = entries.reduce(
      (sum, e) => sum + (Array.isArray(e.hours) ? e.hours.reduce((s, h) => s + (Number(h) || 0), 0) : 0),
      0
    );
    return weeklyWork;
  };

  const getTotalHoursWithBreakValue = (timesheet: Timesheet): number => {
    const fromBackend = Number(timesheet?.totalHoursWithBreak || 0);
    if (fromBackend > 0) return fromBackend;
    return calculateWeeklyTotalWithBreak(timesheet);
  };

  const isDraft = (timesheet: Timesheet): boolean => {
    return (timesheet.status || '').toLowerCase() === 'draft';
  };

  const hasApprovedLeave = (timesheet: Timesheet): boolean => {
    return (timesheet.entries || []).some(e => (e.project || '') === 'Leave' && (e.task || '').startsWith('Leave Approved'));
  };

  const handleViewDetails = (timesheet: Timesheet): void => {
    setSelectedTimesheet(timesheet);
    setShowDetailsModal(true);
  };

  const handleEdit = (timesheet: Timesheet): void => {
    showMessage('Info', 'Edit functionality will navigate to Timesheet screen', 'info');
  };

  const handleDelete = (timesheet: Timesheet): void => {
    setTimesheetToDelete(timesheet);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!timesheetToDelete) return;
    
    try {
      await timesheetAPI.deleteTimesheet(timesheetToDelete._id);
      const updatedTimesheets = timesheets.filter(t => t._id !== timesheetToDelete._id);
      setTimesheets(updatedTimesheets);
      setFilteredTimesheets(updatedTimesheets);
      setShowDeleteConfirm(false);
      setTimesheetToDelete(null);
      showMessage('Success', 'Draft deleted successfully', 'success');
    } catch (err) {
      console.error('Failed to delete draft:', err);
      setShowDeleteConfirm(false);
      showMessage('Error', 'Failed to delete draft. Please try again.', 'error');
    }
  };

  const clearFilters = (): void => {
    setFilter({ year: '', month: '', status: '' });
  };

  // Download Functions
  const generateWeeklyExcel = async (): Promise<void> => {
    try {
      const workbook = XLSX.utils.book_new();
      
      filteredTimesheets.forEach((timesheet, index) => {
        const weekStart = new Date(timesheet.weekStartDate);
        const weekEnd = new Date(timesheet.weekEndDate);
        const sheetName = `Week_${index + 1}`;
        
        const headers = ['Project', 'Project Code', 'Task', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Total'];
        const data = [headers];
        
        timesheet.entries.forEach(entry => {
          const row = [
            entry.project,
            getProjectCode(entry),
            entry.task,
            toHHMM(entry.hours[0] || 0),
            toHHMM(entry.hours[1] || 0),
            toHHMM(entry.hours[2] || 0),
            toHHMM(entry.hours[3] || 0),
            toHHMM(entry.hours[4] || 0),
            toHHMM(entry.hours[5] || 0),
            toHHMM(entry.hours[6] || 0),
            toHHMM(entry.hours.reduce((sum, hour) => sum + (Number(hour) || 0), 0))
          ];
          data.push(row);
        });
        
        data.push([]);
        data.push(['', '', 'TOTAL HOURS (Work + Break)', '', '', '', '', '', '', '', toHHMM(getTotalHoursWithBreakValue(timesheet))]);
        data.push(['', '', 'STATUS', '', '', '', '', '', '', '', timesheet.status]);
        data.push(['', '', 'WEEK', '', '', '', '', '', '', '', `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`]);
        
        const worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));
      });
      
      const wbout = XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' });
      const fileName = `Timesheet_Weekly_${new Date().toISOString().split('T')[0]}.xlsx`;
      const filePath = RNFS.DocumentDirectoryPath + '/' + fileName;
      
      await RNFS.writeFile(filePath, wbout, 'ascii');
      
      await Share.open({
        url: 'file://' + filePath,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        title: 'Share Timesheet Report',
      });
      
      showMessage('Success', 'Excel file generated successfully', 'success');
    } catch (error) {
      console.error('Error generating Excel:', error);
      showMessage('Error', 'Failed to generate Excel file', 'error');
    }
  };

  const generateMonthlyExcel = async (): Promise<void> => {
    try {
      const workbook = XLSX.utils.book_new();
      
      const monthlyData: { [key: string]: Timesheet[] } = {};
      filteredTimesheets.forEach(timesheet => {
        const monthYear = new Date(timesheet.weekStartDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long' 
        });
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = [];
        }
        monthlyData[monthYear].push(timesheet);
      });
      
      Object.keys(monthlyData).forEach(monthYear => {
        const monthTimesheets = monthlyData[monthYear];
        const worksheetData: any[][] = [['Timesheet Monthly Summary - ' + monthYear]];
        worksheetData.push([]);
        worksheetData.push(['Week', 'Projects', 'Project Codes', 'Total Hours (Work + Break)', 'Status', 'Submitted Date']);
        
        monthTimesheets.forEach(timesheet => {
          const projects = Array.from(new Set(timesheet.entries.map(e => e.project))).join(', ');
          const projectCodes = getProjectCodes(timesheet.entries);
          const weekRange = formatWeekRange(timesheet.weekStartDate, timesheet.weekEndDate);
          const submittedDate = timesheet.submittedAt 
            ? new Date(timesheet.submittedAt).toLocaleDateString()
            : 'Draft';
          
          worksheetData.push([
            weekRange,
            projects,
            projectCodes,
            toHHMM(getTotalHoursWithBreakValue(timesheet)),
            timesheet.status,
            submittedDate
          ]);
        });
        
        const monthlyTotal = monthTimesheets.reduce(
          (sum, t) => sum + getTotalHoursWithBreakValue(t),
          0
        );
        worksheetData.push([]);
        worksheetData.push(['Monthly Total Hours:', '', '', toHHMM(monthlyTotal), '', '']);
        
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, monthYear.substring(0, 31));
      });
      
      const wbout = XLSX.write(workbook, { type: 'binary', bookType: 'xlsx' });
      const fileName = `Timesheet_Monthly_${new Date().toISOString().split('T')[0]}.xlsx`;
      const filePath = RNFS.DocumentDirectoryPath + '/' + fileName;
      
      await RNFS.writeFile(filePath, wbout, 'ascii');
      
      await Share.open({
        url: 'file://' + filePath,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        title: 'Share Timesheet Report',
      });
      
      showMessage('Success', 'Excel file generated successfully', 'success');
    } catch (error) {
      console.error('Error generating Excel:', error);
      showMessage('Error', 'Failed to generate Excel file', 'error');
    }
  };

  const handleDownload = async (): Promise<void> => {
    if (filteredTimesheets.length === 0) {
      showMessage('Info', 'No data available to download.', 'info');
      return;
    }

    if (downloadOption === 'weekly' && downloadFormat === 'excel') {
      await generateWeeklyExcel();
    } else if (downloadOption === 'monthly' && downloadFormat === 'excel') {
      await generateMonthlyExcel();
    } else {
      showMessage('Info', 'PDF generation is not yet implemented in mobile version', 'info');
    }
    
    setShowDownloadModal(false);
  };

  const renderTimesheetItem = ({ item }: { item: Timesheet }): JSX.Element => {
    const projectList = Array.from(new Set((item.entries || []).map(e => e.project))).filter(Boolean);
    const projectCodes = getProjectCodes(item.entries);
    const isDraftTimesheet = isDraft(item);
    const statusStyle = getStatusBadge(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleViewDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.weekInfo}>
            <Icon name="date-range" size={20} color={COLORS.primary} />
            <Text style={styles.weekText}>
              {formatWeekRange(item.weekStartDate, item.weekEndDate)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.projectsContainer}>
            <Text style={styles.label}>Projects:</Text>
            {projectList.length === 0 ? (
              <Text style={styles.value}>—</Text>
            ) : (
              projectList.slice(0, 2).map((project, index) => (
                <View key={index} style={styles.projectItem}>
                  <View style={styles.bullet} />
                  <Text style={styles.projectText}>{project}</Text>
                </View>
              ))
            )}
            {projectList.length > 2 && (
              <Text style={styles.moreText}>+{projectList.length - 2} more</Text>
            )}
          </View>

          <View style={styles.codesContainer}>
            <Text style={styles.label}>Codes:</Text>
            {projectCodes === '-' ? (
              <Text style={styles.value}>—</Text>
            ) : (
              projectCodes.split(', ').slice(0, 2).map((code, index) => (
                <View key={index} style={styles.codeItem}>
                  <View style={[styles.bullet, { backgroundColor: COLORS.green }]} />
                  <Text style={styles.codeText}>{code}</Text>
                </View>
              ))
            )}
          </View>

          <View style={styles.hoursContainer}>
            <Text style={styles.label}>Total Hours:</Text>
            <Text style={styles.hoursValue}>
              {toHHMM(getTotalHoursWithBreakValue(item))}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.lastUpdated}>
            {isDraftTimesheet
              ? (item.updatedAt ? `Updated: ${formatDateTime(item.updatedAt)}` : '—')
              : (item.submittedAt ? `Submitted: ${formatDate(item.submittedAt)}` : '—')
            }
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => handleViewDetails(item)}
              style={styles.actionButton}
            >
              <Icon name="visibility" size={20} color={COLORS.info} />
            </TouchableOpacity>
            
            {isDraftTimesheet && (
              <>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={styles.actionButton}
                >
                  <Icon name="edit" size={20} color={COLORS.success} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={styles.actionButton}
                >
                  <Icon name="delete" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterModal = (): JSX.Element => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Icon name="filter-list" size={24} color={COLORS.textPrimary} />
              <Text style={styles.modalTitle}>Filter Timesheets</Text>
            </View>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* Year Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Year</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filter.year}
                  onValueChange={(value: string) => setFilter({...filter, year: value})}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Years" value="" />
                  {years.map(year => {
                    return <PickerItem key={year} label={year} value={year} />;
                  })}
                </Picker>
              </View>
            </View>

            {/* Month Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Month</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filter.month}
                  onValueChange={(value: string) => setFilter({...filter, month: value})}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Months" value="" />
                  {months.map(month => {
                    return <PickerItem key={month.value} label={month.label} value={month.value} />;
                  })}
                </Picker>
              </View>
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filter.status}
                  onValueChange={(value: string) => setFilter({...filter, status: value})}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Status" value="" />
                  {statuses.map(status => {
                    return (
                      <PickerItem 
                        key={status} 
                        label={status.charAt(0).toUpperCase() + status.slice(1)} 
                        value={status} 
                      />
                    );
                  })}
                </Picker>
              </View>
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Clear Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderDetailsModal = (): JSX.Element => (
    <Modal
      visible={showDetailsModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Icon name="description" size={24} color={COLORS.textPrimary} />
              <Text style={styles.modalTitle}>
                Timesheet Details
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          {selectedTimesheet && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalInfo}>
                <Text style={styles.modalWeek}>
                  {formatWeekRange(selectedTimesheet.weekStartDate, selectedTimesheet.weekEndDate)}
                </Text>
                <View style={styles.modalStatusRow}>
                  <Text style={styles.modalLabel}>Status:</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(selectedTimesheet.status).bg }]}>
                    <Text style={[styles.statusText, { color: getStatusBadge(selectedTimesheet.status).text }]}>
                      {selectedTimesheet.status}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Time Entries</Text>
              
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Project</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Code</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Task</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Mon</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Tue</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Wed</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Thu</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Fri</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Sat</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Sun</Text>
                <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Total</Text>
              </View>

              {selectedTimesheet.entries.map((entry, index) => {
                const hours = entry.hours || [0,0,0,0,0,0,0];
                const rowTotal = hours.reduce((sum, h) => sum + (Number(h) || 0), 0);
                return (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{entry.project}</Text>
                    <Text style={[styles.tableCell, { flex: 1.5 }]} numberOfLines={1}>
                      <Text style={styles.codeText}>{getProjectCode(entry)}</Text>
                    </Text>
                    <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>{entry.task}</Text>
                    {hours.map((h, i) => (
                      <Text key={i} style={[styles.tableCell, { flex: 0.8 }]}>{toHHMM(h)}</Text>
                    ))}
                    <Text style={[styles.tableCell, { flex: 0.8, fontWeight: 'bold' }]}>{toHHMM(rowTotal)}</Text>
                  </View>
                );
              })}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Hours:</Text>
                <Text style={styles.totalValue}>
                  {toHHMM(calculateWeeklyTotalWithBreak(selectedTimesheet))}
                </Text>
              </View>
            </ScrollView>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowDetailsModal(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderDownloadModal = (): JSX.Element => (
    <Modal
      visible={showDownloadModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDownloadModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '70%' }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleContainer}>
              <Icon name="download" size={24} color={COLORS.textPrimary} />
              <Text style={styles.modalTitle}>Download Report</Text>
            </View>
            <TouchableOpacity onPress={() => setShowDownloadModal(false)}>
              <Icon name="close" size={24} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <ScrollView>
            <Text style={styles.downloadLabel}>Select Report Type:</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  downloadOption === 'weekly' && styles.optionCardSelected,
                ]}
                onPress={() => setDownloadOption('weekly')}
              >
                <Icon 
                  name="date-range" 
                  size={24} 
                  color={downloadOption === 'weekly' ? COLORS.info : COLORS.gray} 
                />
                <Text style={[
                  styles.optionTitle,
                  downloadOption === 'weekly' && styles.optionTextSelected
                ]}>
                  Weekly Report
                </Text>
                <Text style={styles.optionSubtitle}>Detailed weekly breakdown</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  downloadOption === 'monthly' && styles.optionCardSelected,
                ]}
                onPress={() => setDownloadOption('monthly')}
              >
                <Icon 
                  name="calendar-month" 
                  size={24} 
                  color={downloadOption === 'monthly' ? COLORS.info : COLORS.gray} 
                />
                <Text style={[
                  styles.optionTitle,
                  downloadOption === 'monthly' && styles.optionTextSelected
                ]}>
                  Monthly Summary
                </Text>
                <Text style={styles.optionSubtitle}>Monthly overview</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.downloadLabel}>Select Format:</Text>
            <View style={styles.optionRow}>
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  downloadFormat === 'excel' && styles.optionCardSelected,
                ]}
                onPress={() => setDownloadFormat('excel')}
              >
                <Icon 
                  name="grid-on" 
                  size={24} 
                  color={downloadFormat === 'excel' ? COLORS.success : COLORS.gray} 
                />
                <Text style={[
                  styles.optionTitle,
                  downloadFormat === 'excel' && styles.optionTextSelected
                ]}>
                  Excel (.xlsx)
                </Text>
                <Text style={styles.optionSubtitle}>Editable format</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.optionCard,
                  downloadFormat === 'pdf' && styles.optionCardSelected,
                ]}
                onPress={() => setDownloadFormat('pdf')}
              >
                <Icon 
                  name="picture-as-pdf" 
                  size={24} 
                  color={downloadFormat === 'pdf' ? COLORS.error : COLORS.gray} 
                />
                <Text style={[
                  styles.optionTitle,
                  downloadFormat === 'pdf' && styles.optionTextSelected
                ]}>
                  PDF (.pdf)
                </Text>
                <Text style={styles.optionSubtitle}>Printable format</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Download Summary:</Text>
              <Text style={styles.summaryText}>
                You are about to download a {downloadOption} report in {downloadFormat.toUpperCase()} format.
                {filteredTimesheets.length > 0 && ` This will include ${filteredTimesheets.length} timesheet(s).`}
              </Text>
            </View>

            <View style={styles.downloadActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDownloadModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={handleDownload}
              >
                <Icon name="download" size={20} color={COLORS.white} />
                <Text style={styles.downloadButtonText}>Download</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderDeleteConfirmModal = (): JSX.Element => (
    <Modal
      visible={showDeleteConfirm}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowDeleteConfirm(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModal}>
          <Text style={styles.confirmTitle}>Confirm Deletion</Text>
          <Text style={styles.confirmMessage}>
            Are you sure you want to delete this draft? This action cannot be undone.
          </Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity
              style={styles.confirmCancelButton}
              onPress={() => setShowDeleteConfirm(false)}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmDeleteButton}
              onPress={confirmDelete}
            >
              <Text style={styles.confirmDeleteText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderMessageDialog = (): JSX.Element => (
    <Modal
      visible={showMessageDialog}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowMessageDialog(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.messageModal}>
          <Icon 
            name={
              messageDialogConfig.type === 'success' ? 'check-circle' :
              messageDialogConfig.type === 'error' ? 'error' :
              messageDialogConfig.type === 'warning' ? 'warning' : 'info'
            }
            size={48} 
            color={
              messageDialogConfig.type === 'success' ? COLORS.success :
              messageDialogConfig.type === 'error' ? COLORS.error :
              messageDialogConfig.type === 'warning' ? COLORS.warning : COLORS.info
            }
          />
          <Text style={styles.messageTitle}>{messageDialogConfig.title}</Text>
          <Text style={styles.messageText}>{messageDialogConfig.message}</Text>
          <TouchableOpacity
            style={[
              styles.messageButton,
              {
                backgroundColor:
                  messageDialogConfig.type === 'success' ? COLORS.success :
                  messageDialogConfig.type === 'error' ? COLORS.error :
                  messageDialogConfig.type === 'warning' ? COLORS.warning : COLORS.primary
              }
            ]}
            onPress={() => setShowMessageDialog(false)}
          >
            <Text style={styles.messageButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <CommonHeader title="Timesheet History" showBack={true} />

      {/* Filter Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="filter-list" size={20} color={COLORS.primary} />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.downloadButtonSmall}
          onPress={() => setShowDownloadModal(true)}
        >
          <Icon name="download" size={20} color={COLORS.white} />
          <Text style={styles.downloadButtonSmallText}>Download</Text>
        </TouchableOpacity>
      </View>

      {/* Results count */}
      <View style={styles.resultsCount}>
        <Text style={styles.resultsText}>
          Showing {filteredTimesheets.length} of {timesheets.length} timesheets
        </Text>
      </View>

      {/* Timesheet List */}
      {isLoading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading timesheets...</Text>
        </View>
      ) : filteredTimesheets.length > 0 ? (
        <FlatList
          data={filteredTimesheets}
          renderItem={renderTimesheetItem}
          keyExtractor={(item: Timesheet) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        />
      ) : (
        <View style={styles.centerContainer}>
          <Icon name="history" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>No Timesheets Found</Text>
          <Text style={styles.emptySubtitle}>
            No timesheets match your current filters.
          </Text>
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={clearFilters}
          >
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modals */}
      {renderFilterModal()}
      {renderDetailsModal()}
      {renderDownloadModal()}
      {renderDeleteConfirmModal()}
      {renderMessageDialog()}

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="History • Records • Tracking • "
      />
    </SafeAreaView>
  );
};

// Keep all styles exactly as they were - no changes needed
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  filterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: COLORS.filterBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  downloadButtonSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  downloadButtonSmallText: {
    marginLeft: 6,
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  resultsCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.filterBg,
  },
  resultsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  listContent: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  weekInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weekText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 8,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    marginBottom: 12,
  },
  projectsContainer: {
    marginBottom: 8,
  },
  codesContainer: {
    marginBottom: 8,
  },
  hoursContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  codeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.blue,
    marginRight: 8,
  },
  projectText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  codeText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.filterBg,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
  },
  moreText: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
    fontStyle: 'italic',
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  lastUpdated: {
    fontSize: 11,
    color: COLORS.gray,
    fontStyle: 'italic',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 6,
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearFiltersText: {
    color: COLORS.info,
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 8,
  },
  modalInfo: {
    marginBottom: 20,
  },
  modalWeek: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 8,
  },
  modalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableHeaderCell: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  tableCell: {
    fontSize: 11,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  // Filter Modal Styles
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  clearButton: {
    flex: 1,
    marginRight: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  applyButton: {
    flex: 1,
    marginLeft: 8,
    padding: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  // Download Modal Styles
  downloadLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: COLORS.info,
    backgroundColor: COLORS.blueLight,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 8,
    marginBottom: 2,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: COLORS.info,
  },
  optionSubtitle: {
    fontSize: 11,
    color: COLORS.gray,
    textAlign: 'center',
  },
  summaryBox: {
    backgroundColor: COLORS.filterBg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  downloadActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  downloadButton: {
    flex: 1,
    marginLeft: 8,
    padding: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  // Confirm Modal Styles
  confirmModal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  confirmCancelButton: {
    flex: 1,
    marginRight: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  confirmDeleteButton: {
    flex: 1,
    marginLeft: 8,
    padding: 12,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  // Message Modal Styles
  messageModal: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  messageTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  messageButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  messageButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TimesheetHistoryScreen;