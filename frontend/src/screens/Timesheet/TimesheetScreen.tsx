// screens/Timesheet/TimesheetScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import { timesheetAPI, allocationAPI, employeeAPI, specialPermissionAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommonFooter from '../../components/CommonFooter';
import DocumentPicker from 'react-native-document-picker';
import { useRoute } from '@react-navigation/native';

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  accent: '#4A148C',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  mediumGray: '#E5E7EB',
  darkGray: '#9CA3AF',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  blue: '#2563EB',
  lightBlue: '#DBEAFE',
  green: '#059669',
  lightGreen: '#D1FAE5',
  red: '#DC2626',
  lightRed: '#FEE2E2',
  purple: '#7C3AED',
  lightPurple: '#EDE9FE',
  orange: '#EA580C',
  lightOrange: '#FFEDD5',
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  filterBg: '#F9FAFB',
  holidayBg: '#E8F5E9',
  gridBorder: '#D1D5DB',
  headerBg: '#0A0F2C',
  alternateRow: '#F9FAFB',
  darkBlue: '#262760',
  shadow: '#000000',
};

// Holiday Calendar 2026 data
const holidays2026 = [
  { date: '01-Jan-26', day: 'THURSDAY', occasion: 'New Year' },
  { date: '15-Jan-26', day: 'THURSDAY', occasion: 'Pongal' },
  { date: '16-Jan-26', day: 'FRIDAY', occasion: 'Pongal' },
  { date: '26-Jan-26', day: 'MONDAY', occasion: 'Republic Day' },
  { date: '14-Apr-26', day: 'TUESDAY', occasion: 'Tamil New Year' },
  { date: '01-May-26', day: 'FRIDAY', occasion: 'May Day' },
  { date: '14-Sep-26', day: 'MONDAY', occasion: 'Vinayagar Chathurthi' },
  { date: '02-Oct-26', day: 'FRIDAY', occasion: 'Gandhi Jayanthi' },
  { date: '19-Oct-26', day: 'MONDAY', occasion: 'Deepavali' },
  { date: 'REGIONAL', day: 'CHOOSE ONE', occasion: 'Regional Holiday' }
];

const isHoliday = (date: Date): boolean => {
  if (!date) return false;
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  const formattedDate = `${day}-${month}-${year}`;
  return holidays2026.some(h => h.date === formattedDate);
};

const getHolidayOccasion = (date: Date): string => {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = String(date.getFullYear()).slice(-2);
  const formattedDate = `${day}-${month}-${year}`;
  const holiday = holidays2026.find(h => h.date === formattedDate);
  return holiday ? holiday.occasion : '';
};

interface TimesheetEntry {
  id: string;
  project: string;
  projectCode: string;
  task: string;
  hours: number[];
  type: 'project' | 'leave' | 'special';
  shiftType: string;
  locked?: boolean;
  lockedDays?: boolean[];
}

interface Project {
  name: string;
  code: string;
}

interface SpecialPermission {
  _id: string;
  date: string;
  shift: string;
  fromTime?: string;
  toTime?: string;
  totalHours: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  attachment?: string;
}

const TimesheetScreen = () => {
  const route: any = useRoute();
  const initialDate = route.params?.initialDate;
  
  const [currentWeek, setCurrentWeek] = useState(initialDate ? new Date(initialDate) : new Date());
  const [timesheetRows, setTimesheetRows] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [shiftType, setShiftType] = useState('');
  const [dailyShiftTypes, setDailyShiftTypes] = useState(['', '', '', '', '', '', '']);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [totals, setTotals] = useState({
    daily: [0, 0, 0, 0, 0, 0, 0],
    weekly: 0,
  });
  const [onPremisesTime, setOnPremisesTime] = useState({
    daily: [0, 0, 0, 0, 0, 0, 0],
    weekly: 0,
    prevSunday: 0,
  });
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [cellInputs, setCellInputs] = useState<Record<string, string>>({});
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Validation Error');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [monthlyPermissionCount, setMonthlyPermissionCount] = useState(0);
  const [monthlyBasePermissionCount, setMonthlyBasePermissionCount] = useState(0);
  const [isLeaveAutoDraft, setIsLeaveAutoDraft] = useState(false);
  const [showNavigationDialog, setShowNavigationDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalData, setOriginalData] = useState<string | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [spDate, setSpDate] = useState<Date | null>(null);
  const [spReason, setSpReason] = useState('');
  const [spFile, setSpFile] = useState<any>(null);
  const [spFileName, setSpFileName] = useState('');
  const [spCalculation, setSpCalculation] = useState({ 
    required: 0, 
    onPremises: 0, 
    balance: 0, 
    shift: '', 
    allowed: true, 
    message: '' 
  });
  const [mySpecials, setMySpecials] = useState<SpecialPermission[]>([]);
  
  // Refs for live updates
  const liveUpdateInterval = useRef<any>(null);
  const appState = useRef(AppState.currentState);
  const isMounted = useRef(true);
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const shiftTypes = ['First Shift', 'Second Shift', 'General Shift'];
  const tasks = [
    'Development', 'Testing', 'Implementation', 'Maintenance Support',
    'Modeling', 'Editing', 'Backdrafting', 'Checking', 'Estimation Work',
    'Documentation', 'Other\'s', 'Non Product(Training)', 'Project Discussion',
    'Idle', 'Meeting', 'RFI’s', 'Study', 'On Duty', 'Project Management',
    'Hiring', 'Office Administration', 'HR Activities', 'Accounts',
    
  ];
  const leaveTypes = ['Permission'];

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (liveUpdateInterval.current) {
        clearInterval(liveUpdateInterval.current);
      }
    };
  }, []);

  // Update currentWeek if initialDate changes
  useEffect(() => {
    if (initialDate) {
      const date = new Date(initialDate);
      if (!isNaN(date.getTime())) {
        setCurrentWeek(date);
      }
    }
  }, [initialDate]);

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const showError = (message: string, title = 'Validation Error') => {
    setErrorMessage(message);
    setErrorTitle(title);
    setShowErrorDialog(true);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadWeekData(true);
  }, [currentWeek]);

  const getWeekDates = useCallback(() => {
    const base = new Date(currentWeek);
    const day = base.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(base);
    monday.setDate(base.getDate() - diffToMonday);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [currentWeek]);

  const weekDates = getWeekDates();

  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const normalizeToUTCDateOnly = (d: Date): string => {
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    return utc.toISOString();
  };

  const formatHoursHHMM = (hours: number): string => {
    const totalMinutes = Math.round((Number(hours) || 0) * 60);
    const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const mm = String(totalMinutes % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const parseHHMMToHours = (str: string): number => {
    if (typeof str !== 'string') return Number(str) || 0;
    const s = str.trim();
    if (!s) return 0;
    if (s.includes(':')) {
      const parts = s.split(':');
      let h = Math.max(0, parseInt(parts[0], 10) || 0);
      let mRaw = parseInt(parts[1], 10);
      let m = Math.max(0, isNaN(mRaw) ? 0 : mRaw);
      if (m >= 60) {
        h += Math.floor(m / 60);
        m = m % 60;
      }
      const step = 5;
      m = Math.round(m / step) * step;
      if (m === 60) {
        h += 1;
        m = 0;
      }
      return h + m / 60;
    }
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  };

  const normalizeHHMMInput = (val: string): string => {
    if (typeof val !== "string") return "";

    if (val.includes(':')) {
      const parts = val.split(':');
      let h = parseInt(parts[0] || '0', 10);
      let m = parseInt(parts[1] || '0', 10);

      if (isNaN(h)) h = 0;
      if (isNaN(m)) m = 0;
      if (m > 59) m = 59;

      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      return `${hh}:${mm}`;
    }

    const digits = val.replace(/\D/g, "");
    if (!digits) return "";

    if (digits.length === 3) {
      const h = digits.slice(0, 1);
      const m = digits.slice(1, 3);
      let mVal = parseInt(m, 10);
      if (mVal > 59) mVal = 59;
      return `0${h}:${String(mVal).padStart(2, '0')}`;
    }

    const h = digits.slice(0, 2);
    const mRaw = digits.slice(2, 4);
    if (mRaw.length === 0) return h;
    let m = parseInt(mRaw, 10);
    if (isNaN(m)) m = 0;
    if (m > 59) m = 59;
    const mm = String(m).padStart(2, "0");
    return `${h}:${mm}`;
  };

  const getShiftMinHours = (shift: string): number => {
    if (!shift) return 0;
    const s = String(shift);
    if (s.startsWith('General Shift')) return 9.5;
    if (s.startsWith('First Shift') || s.startsWith('Second Shift')) return 8.5;
    return 0;
  };

  const getSpecialPermissionRequiredHours = (shift: string): number => {
    if (!shift) return 0;
    const s = String(shift).toLowerCase();
    if (s.startsWith("first shift")) return 7 + 15/60;
    if (s.startsWith("second shift") || s.startsWith("secend shift")) return 7 + 15/60;
    if (s.startsWith("general shift")) return 8 + 0/60;
    return 0;
  };

  const computeBreakForDay = (dayIndex: number): number => {
    // Break time is disabled - always return 0
    return 0;
  };

  const computeWeeklyBreak = (): number => {
    return 0;
  };

  const getDailyTotalWithBreak = (dayIndex: number): string => {
    const workTotal = totals.daily[dayIndex] || 0;
    return formatHoursHHMM(workTotal);
  };

  const getWeeklyTotalWithBreak = (): string => {
    return formatHoursHHMM(totals.weekly);
  };

  const isShiftSelectedForDay = (idx: number): boolean => {
    const s = dailyShiftTypes?.[idx];
    return !!s && s !== '';
  };

  const hasFullDayLeave = (dayIndex: number): boolean => {
    return timesheetRows.some((row: TimesheetEntry) =>
      (row.task === 'Full Day Leave' || row.task === 'Office Holiday' || (row.task || '').startsWith('Leave Approved')) &&
      Number(row.hours[dayIndex] || 0) >= 9
    );
  };

  const hasAnyApprovedLeave = (dayIndex: number): boolean => {
    return timesheetRows.some(
      (row) => (row.task || "").startsWith("Leave Approved") && Number(row.hours?.[dayIndex] || 0) > 0
    );
  };

  const getMissingShiftDays = (): string[] => {
    const missing: string[] = [];
    for (let i = 0; i < 5; i++) {
      if (hasFullDayLeave(i) || hasAnyApprovedLeave(i)) continue;
      const shift = dailyShiftTypes?.[i] || shiftType || "";
      if (!shift || shift === "") {
        missing.push(days[i]);
      }
    }
    return missing;
  };

  const missingShiftDays = getMissingShiftDays();

  const allDaysSatisfied = (() => {
    if (missingShiftDays.length > 0) return false;
    for (let i = 0; i < 7; i++) {
      if (hasFullDayLeave(i) || hasAnyApprovedLeave(i)) continue;
      const shift = dailyShiftTypes?.[i] || shiftType || "";
      if (!shift || shift === "") continue;

      const totalHours = totals.daily[i];
      const currentMinutes = Math.round(totalHours * 60);

      let minMinutes = 0;
      if (shift.startsWith("First Shift") || shift.startsWith("Second Shift")) {
        minMinutes = (7 * 60) + 15;
      } else if (shift.startsWith("General Shift")) {
        minMinutes = 8 * 60;
      }

      if (minMinutes > 0 && currentMinutes < minMinutes) return false;

      const onPremisesHours = onPremisesTime.daily?.[i] || 0;
      const onPremisesMinutes = Math.round(onPremisesHours * 60);

      const permissionHoursRow = timesheetRows
        .filter(r => r.task === "Permission")
        .reduce((sum, r) => sum + (Number(r.hours?.[i]) || 0), 0);
      
      let specialPermissionHours = 0;
      if (mySpecials && mySpecials.length > 0) {
        const currentDate = weekDates[i];
        const approvedSpecials = mySpecials.filter(sp => 
          sp.status === 'APPROVED' && 
          new Date(sp.date).toDateString() === currentDate.toDateString()
        );
        const latestApproved = approvedSpecials.length > 0 ? [approvedSpecials[0]] : [];
        specialPermissionHours = latestApproved.reduce((sum, sp) => sum + (Number(sp.totalHours) || 0), 0);
      }
      
      const permissionMinutes = Math.round((permissionHoursRow + specialPermissionHours) * 60);

      const otherLeaveHours = timesheetRows
        .filter(r => (r.type === 'leave' || r.project === 'Leave' || r.task === 'Office Holiday') && r.task !== 'Permission')
        .reduce((sum, r) => sum + (Number(r.hours?.[i]) || 0), 0);
      const otherLeaveMinutes = Math.round(otherLeaveHours * 60);

      const adjustedOnPremisesMinutes = onPremisesMinutes + permissionMinutes + otherLeaveMinutes;

      if ((onPremisesMinutes > 0 || currentMinutes > 0) && Math.abs(adjustedOnPremisesMinutes - currentMinutes) > 2) {
        return false;
      }
    }
    return true;
  })();

  const calculateTotals = useCallback(() => {
    const dailyTotals = [0, 0, 0, 0, 0, 0, 0];
    let weeklyTotal = 0;
    timesheetRows.forEach((row: TimesheetEntry) => {
      row.hours.forEach((hours: number, index: number) => {
        dailyTotals[index] += hours;
        weeklyTotal += hours;
      });
    });
    setTotals({
      daily: dailyTotals,
      weekly: weeklyTotal,
    });
  }, [timesheetRows]);

  useEffect(() => {
    calculateTotals();
  }, [timesheetRows, calculateTotals]);

  useEffect(() => {
    if (originalData && timesheetRows.length > 0) {
      const currentData = JSON.stringify(timesheetRows);
      setHasUnsavedChanges(currentData !== originalData);
    }
  }, [timesheetRows, originalData]);

  const getLeaveRowCount = (): number => {
    return timesheetRows.filter(row => row.type === "leave").length;
  };

  const isAddLeaveDisabled = (): boolean => {
    const hasPermission = timesheetRows.some(row => row.task === "Permission" && row.type !== "special");
    return getLeaveRowCount() >= 4 || isSubmitted || isLeaveAutoDraft || hasPermission;
  };

  const hasSomeData = (): boolean => {
    return timesheetRows.some(row =>
      row.project ||
      row.task ||
      row.hours.some(hours => hours > 0)
    );
  };

  const isPermissionAllowed = (dayIndex: number, excludeRowId: string | null = null): boolean => {
    const hasExistingPermission = timesheetRows.some(row =>
      row.task === "Permission" && row.hours[dayIndex] > 0 && row.id !== excludeRowId
    );
    return !hasExistingPermission;
  };

  const updateMonthlyPermissionCount = useCallback(() => {
    const currentMonth = currentWeek.getMonth();
    const currentYear = currentWeek.getFullYear();

    let count = 0;

    const getPermissionCountForHours = (h: number): number => {
      const val = Number(h) || 0;
      if (val >= 2) return 2;
      if (val >= 1) return 1;
      return 0;
    };

    timesheetRows.forEach((row) => {
      if (row.task && (row.task === "Permission" || row.task.toLowerCase().includes("permission")) && row.type !== 'special') {
        row.hours.forEach((hours, dayIndex) => {
          const date = weekDates[dayIndex];
          if (date && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            const c = getPermissionCountForHours(hours);
            if (c > 0) {
              count += c;
            }
          }
        });
      }
    });

    setMonthlyPermissionCount(monthlyBasePermissionCount + count);
  }, [currentWeek, timesheetRows, monthlyBasePermissionCount, weekDates]);

  useEffect(() => {
    updateMonthlyPermissionCount();
  }, [updateMonthlyPermissionCount]);

  const calculateSpecialPermission = (dateStr: string) => {
    if (!dateStr) {
      setSpCalculation({ required: 0, onPremises: 0, balance: 0, shift: "", allowed: true, message: "" });
      return;
    }
    
    const [y, m, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, day);

    const dayIndex = weekDates.findIndex(wd => 
      wd.getDate() === targetDate.getDate() && 
      wd.getMonth() === targetDate.getMonth() && 
      wd.getFullYear() === targetDate.getFullYear()
    );

    if (dayIndex === -1) {
      setSpCalculation({ required: 0, onPremises: 0, balance: 0, shift: "", allowed: true, message: "" });
      return;
    }

    const shift = dailyShiftTypes?.[dayIndex] || shiftType || "";
    const onPremises = Number(onPremisesTime?.daily?.[dayIndex] || 0);
    const required = getSpecialPermissionRequiredHours(shift);
    
    let balance = 0;
    let allowed = true;
    let message = "";

    if (required > 0) {
      if (onPremises >= required) {
        allowed = false;
        message = "Minimum shift hours already completed. No special permission required.";
        balance = 0;
      } else {
        const reqMins = Math.round(required * 60);
        const opMins = Math.round(onPremises * 60);
        const balMins = Math.max(0, reqMins - opMins);
        balance = balMins / 60;
      }
    } else {
      if (onPremises > 0) {
        allowed = false;
        message = "No shift detected or 0 required hours.";
      }
    }

    setSpCalculation({
      required,
      onPremises,
      balance,
      shift,
      allowed,
      message
    });
  };

  useEffect(() => {
    if (showSpecialModal && spDate) {
      const y = spDate.getFullYear();
      const m = String(spDate.getMonth() + 1).padStart(2, '0');
      const d = String(spDate.getDate()).padStart(2, '0');
      calculateSpecialPermission(`${y}-${m}-${d}`);
    }
  }, [showSpecialModal, spDate, dailyShiftTypes, onPremisesTime]);

  const calculateOnPremisesTime = useCallback((attendanceData: any[], weekDates: Date[]) => {
    const weekKeys = weekDates.map(d => formatDateKey(d));

    const dailyOnPremises = [0, 0, 0, 0, 0, 0, 0];
    let weeklyOnPremises = 0;
    let prevSundayHours = 0;

    const prevSunday = new Date(weekDates[0]);
    prevSunday.setDate(prevSunday.getDate() - 1);
    const prevSundayKey = formatDateKey(prevSunday);

    if (!attendanceData || attendanceData.length === 0) {
      return {
        daily: [0, 0, 0, 0, 0, 0, 0],
        weekly: 0,
        prevSunday: 0
      };
    }

    attendanceData.forEach((record: any) => {
      try {
        let recordDateStr = record.date || record.attendanceDate || record.punchDate || record.day;
        
        if (!recordDateStr && record._id) {
          const timestamp = parseInt(record._id.toString().substring(0, 8), 16) * 1000;
          if (!isNaN(timestamp)) {
            recordDateStr = new Date(timestamp).toISOString().split('T')[0];
          }
        }

        if (!recordDateStr) return;

        let datePart = recordDateStr;
        if (typeof recordDateStr === 'string') {
          if (recordDateStr.includes('T')) {
            datePart = recordDateStr.split('T')[0];
          }
          else if (recordDateStr.includes('/')) {
            const parts = recordDateStr.split('/');
            if (parts.length === 3) {
              if (parts[0].length === 4) {
                datePart = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              } else {
                datePart = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
              }
            }
          }
          else if (recordDateStr.includes('.')) {
            const parts = recordDateStr.split('.');
            if (parts.length === 3) {
              if (parts[2].length === 4) {
                datePart = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
            }
          }
        }

        let workMins = 0;
        if (record.workDuration !== undefined) {
          workMins = Number(record.workDuration) || 0;
        } else if (record.totalHours !== undefined) {
          workMins = (Number(record.totalHours) || 0) * 60;
        } else if (record.duration !== undefined) {
          workMins = Number(record.duration) || 0;
        } else if (record.minutes !== undefined) {
          workMins = Number(record.minutes) || 0;
        } else if (record.hours !== undefined && record.hours !== null) {
          const hours = Number(record.hours) || 0;
          if (hours > 0 && hours < 24) {
            workMins = hours * 60;
          }
        }

        if (datePart === prevSundayKey) {
          prevSundayHours += workMins / 60;
        }

        const dayIndex = weekKeys.indexOf(datePart);
        if (dayIndex !== -1) {
          if (workMins > 0) {
            const hoursInHours = workMins / 60;
            dailyOnPremises[dayIndex] = Number((dailyOnPremises[dayIndex] + hoursInHours).toFixed(2));
            weeklyOnPremises = Number((weeklyOnPremises + hoursInHours).toFixed(2));
          }
        }
      } catch (error) {
        console.error('Error processing attendance record:', error);
      }
    });

    return {
      daily: dailyOnPremises.map(h => Number(h.toFixed(2))),
      weekly: Number(weeklyOnPremises.toFixed(2)),
      prevSunday: Number(prevSundayHours.toFixed(2))
    };
  }, []);

  const fetchLiveAttendance = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      const wd = getWeekDates();
      const prevSunday = new Date(wd[0]);
      prevSunday.setDate(prevSunday.getDate() - 1);
      const attendanceStartStr = normalizeToUTCDateOnly(prevSunday);
      const weekEndStr = normalizeToUTCDateOnly(wd[6]);

      const attendanceRes = await timesheetAPI.getAttendanceData({
        startDate: attendanceStartStr,
        endDate: weekEndStr,
        _t: Date.now()
      });

      if (isMounted.current && attendanceRes.status === 200 && attendanceRes.data) {
        let attendanceData: any[] = [];
        
        if (attendanceRes.data.data?.records && Array.isArray(attendanceRes.data.data.records)) {
          attendanceData = attendanceRes.data.data.records;
        } else if (attendanceRes.data.records && Array.isArray(attendanceRes.data.records)) {
          attendanceData = attendanceRes.data.records;
        } else if (Array.isArray(attendanceRes.data)) {
          attendanceData = attendanceRes.data;
        } else if (attendanceRes.data.data && Array.isArray(attendanceRes.data.data)) {
          attendanceData = attendanceRes.data.data;
        }
        
        if (attendanceData.length > 0) {
          setAttendanceRecords(attendanceData);
          const calculatedOnPremises = calculateOnPremisesTime(attendanceData, wd);
          setOnPremisesTime(calculatedOnPremises);
          setLastUpdateTime(new Date());
        } else {
          setOnPremisesTime({
            daily: [0, 0, 0, 0, 0, 0, 0],
            weekly: 0,
            prevSunday: 0
          });
        }
      }
    } catch (error: any) {
      console.error('❌ Error in live attendance update:', error.message || error);
    }
  }, [getWeekDates, calculateOnPremisesTime]);

  useEffect(() => {
    loadWeekData();
    
    liveUpdateInterval.current = setInterval(() => {
      fetchLiveAttendance();
    }, 30000);
    
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        fetchLiveAttendance();
      }
      appState.current = nextAppState;
    });
    
    return () => {
      if (liveUpdateInterval.current) {
        clearInterval(liveUpdateInterval.current);
      }
      subscription.remove();
    };
  }, []);

  const loadAllocatedProjects = useCallback(async () => {
    try {
      const [meResult, allocResult] = await Promise.allSettled([
        employeeAPI.getMyProfile(),
        allocationAPI.getAllAllocations()
      ]);
      
      const me = (meResult.status === 'fulfilled' ? meResult.value?.data : {}) as any;
      const allocations = (allocResult.status === 'fulfilled' && Array.isArray(allocResult.value?.data)
        ? allocResult.value.data
        : []) as any[];

      const weekDates = getWeekDates();
      const weekStart = new Date(weekDates[0]);
      const weekEnd = new Date(weekDates[6]);
      weekEnd.setHours(23, 59, 59, 999);

      const inSelectedWeek = (alloc: any) => {
        try {
          if (!alloc.startDate || !alloc.endDate) return true;
          const parseDate = (dateStr: string) => {
            if (!dateStr) return null;
            const parts = String(dateStr).split('T')[0].split('-');
            if (parts.length !== 3) return new Date(dateStr);
            return new Date(
              parseInt(parts[0], 10), 
              parseInt(parts[1], 10) - 1, 
              parseInt(parts[2], 10)
            );
          };
          const sd = parseDate(alloc.startDate);
          const ed = parseDate(alloc.endDate);
          if (!sd || !ed || isNaN(sd.getTime()) || isNaN(ed.getTime())) return true;
          if (sd > ed) return true;
          const ws = new Date(weekStart);
          ws.setHours(0, 0, 0, 0);
          const we = new Date(weekEnd);
          we.setHours(23, 59, 59, 999);
          return sd <= we && ed >= ws;
        } catch (_) {
          return true;
        }
      };

      const normalizeId = (id: string = '') => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      const userStr = await AsyncStorage.getItem('user');
      const userSession = userStr ? JSON.parse(userStr) : {};
      
      const empId = normalizeId(me.employeeId || userSession.employeeId);
      const empMongoId = String(me._id || '').trim();
      const empName = String(me.name || userSession.name || '').trim().toLowerCase();

      const mineByMatch = allocations.filter(a => {
        const code = normalizeId(a.employeeCode);
        const eid = String(a.employeeId || '').trim();
        const ename = String(a.employeeName || '').trim().toLowerCase();
        const matchesEmployee =
          (code && empId && code === empId) ||
          (eid && empMongoId && eid === empMongoId) ||
          (ename && empName && ename === empName);
        const statusVal = String(a.status || '').trim().toLowerCase();
        const statusAllowed = statusVal === 'active';
        return matchesEmployee && statusAllowed;
      });

      const mineWeek = mineByMatch.filter(inSelectedWeek);
      const mine = mineWeek.length ? mineWeek : mineByMatch;
      
      const unique: Project[] = [];
      const seen = new Set();
      
      for (const a of mine) {
        const key = `${a.projectName}|${a.projectCode}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push({ name: a.projectName, code: a.projectCode });
        }
      }
      
      setProjects(unique);
    } catch (error) {
      console.error('Error loading projects:', error);
      setProjects([]);
    }
  }, [getWeekDates]);

  useEffect(() => {
    loadAllocatedProjects();
  }, [loadAllocatedProjects, currentWeek]);

  useEffect(() => {
    const loadMonthlyBasePermissionCount = async () => {
      try {
        const currentMonth = currentWeek.getMonth();
        const currentYear = currentWeek.getFullYear();

        const weekDates = getWeekDates();
        const weekStartStr = new Date(Date.UTC(weekDates[0].getFullYear(), weekDates[0].getMonth(), weekDates[0].getDate())).toISOString();

        const res = await timesheetAPI.getPermissionUsage({
          month: currentMonth,
          year: currentYear,
          excludeWeekStart: weekStartStr
        });

        if (res.data && res.data.success) {
          setMonthlyBasePermissionCount(res.data.count);
        } else {
          setMonthlyBasePermissionCount(0);
        }
      } catch (e) {
        console.error("Error loading permission usage:", e);
        setMonthlyBasePermissionCount(0);
      }
    };
    loadMonthlyBasePermissionCount();
  }, [currentWeek]);

  const loadWeekData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const wd = getWeekDates();
      const weekStartStr = normalizeToUTCDateOnly(wd[0]);
      const weekEndStr = normalizeToUTCDateOnly(wd[6]);

      const prevSunday = new Date(wd[0]);
      prevSunday.setDate(prevSunday.getDate() - 1);
      const attendanceStartStr = normalizeToUTCDateOnly(prevSunday);

      const [timesheetRes, attendanceRes, specialRes] = await Promise.allSettled([
        timesheetAPI.getTimesheet({
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          _t: Date.now()
        }),
        timesheetAPI.getAttendanceData({
          startDate: attendanceStartStr,
          endDate: weekEndStr,
          _t: Date.now()
        }),
        specialPermissionAPI.my({
          weekStart: weekStartStr,
          weekEnd: weekEndStr,
          _t: Date.now()
        })
      ]);

      if (specialRes.status === "fulfilled" && specialRes.value) {
        const specialData = specialRes.value.data?.data || specialRes.value.data || [];
        setMySpecials(Array.isArray(specialData) ? specialData : []);
      } else {
        setMySpecials([]);
      }

      let rows: TimesheetEntry[] = [];
      let loadedShiftType = '';
      let loadedDailyShiftTypes = ['', '', '', '', '', '', ''];
      let attendanceData: any[] = [];
      let sheet: any = {};

      if (timesheetRes.status === 'fulfilled' && timesheetRes.value) {
        const res = timesheetRes.value as any;
        sheet = (res?.data && res.data.data) ? res.data.data : res.data;

        rows = (sheet.entries || []).map((e: any) => ({
          id: Date.now() + Math.random() + '',
          project: e.project || '',
          projectCode: e.projectCode || '',
          task: e.task || '',
          hours: Array.isArray(e.hours) 
            ? e.hours.map((h: any): number => {
                if (typeof h === 'string') {
                  const parsed = parseFloat(h);
                  return isNaN(parsed) ? 0 : parsed;
                }
                if (typeof h === 'number') {
                  return isNaN(h) ? 0 : h;
                }
                const converted = Number(h);
                return isNaN(converted) ? 0 : converted;
              })
            : [0, 0, 0, 0, 0, 0, 0],
          type: e.type || (e.project === 'Leave' ? 'leave' : 'project'),
          shiftType: e.shiftType || '',
          locked: e.locked || false,
          lockedDays: e.lockedDays || [false, false, false, false, false, false, false],
        }));

        loadedShiftType = sheet.shiftType || '';
        if (Array.isArray(sheet.dailyShiftTypes) && sheet.dailyShiftTypes.length === 7) {
          loadedDailyShiftTypes = sheet.dailyShiftTypes;
        } else {
          loadedDailyShiftTypes = [
            loadedShiftType, loadedShiftType, loadedShiftType,
            loadedShiftType, loadedShiftType, loadedShiftType, loadedShiftType
          ];
        }

        setShiftType(loadedShiftType);
        setDailyShiftTypes(loadedDailyShiftTypes);
        setRejectionReason(sheet.rejectionReason || '');
        setIsSubmitted(
          (sheet.status || '').toLowerCase() === 'submitted' ||
          (sheet.status || '').toLowerCase() === 'approved'
        );
        setIsLeaveAutoDraft(false);
      }

      if (attendanceRes.status === 'fulfilled' && attendanceRes.value) {
        const attRes = attendanceRes.value as any;
        
        if (attRes.data?.records && Array.isArray(attRes.data.records)) {
          attendanceData = attRes.data.records;
        } else if (attRes.data?.data && Array.isArray(attRes.data.data)) {
          attendanceData = attRes.data.data;
        } else if (Array.isArray(attRes.data)) {
          attendanceData = attRes.data;
        } else if (attRes.data && Array.isArray(attRes.data)) {
          attendanceData = attRes.data;
        }

        setAttendanceRecords(attendanceData);

        if (attendanceData.length > 0) {
          const calculatedOnPremises = calculateOnPremisesTime(attendanceData, wd);
          setOnPremisesTime(calculatedOnPremises);
        } else {
          setOnPremisesTime({
            daily: [0, 0, 0, 0, 0, 0, 0],
            weekly: 0,
            prevSunday: 0
          });
        }
      } else if (Array.isArray(sheet.onPremisesTime?.daily)) {
        setOnPremisesTime({
          daily: (sheet.onPremisesTime.daily || []).map((n: number) => Number(n) || 0),
          weekly: Number(sheet.onPremisesTime.weekly) || 0,
          prevSunday: Number(sheet.onPremisesTime?.prevSunday) || 0
        });
      }

      const specialRows: TimesheetEntry[] = [];
      if (specialRes.status === "fulfilled" && specialRes.value) {
        const specials = Array.isArray(specialRes.value.data?.data) ? specialRes.value.data.data : [];
        const approvedSpecials = specials.filter((s: SpecialPermission) => s.status === 'APPROVED');
        
        const uniqueApprovedSpecials = approvedSpecials.filter((sp: SpecialPermission, index: number, self: SpecialPermission[]) => 
          index === self.findIndex((t) => (
            new Date(t.date).toDateString() === new Date(sp.date).toDateString()
          ))
        );
        
        uniqueApprovedSpecials.forEach((sp: SpecialPermission) => {
          const spDate = new Date(sp.date);
          const spDateStr = spDate.toDateString();
          const dayIndex = wd.findIndex(d => d.toDateString() === spDateStr);
          
          if (dayIndex !== -1) {
            const taskName = (sp.fromTime && sp.toTime) 
              ? `Permission (${sp.fromTime} - ${sp.toTime})` 
              : 'Permission';
            
            const hours = [0, 0, 0, 0, 0, 0, 0];
            hours[dayIndex] = Number(sp.totalHours) || 0;

            specialRows.push({
              id: `sp-${sp._id || Date.now()}-${dayIndex}`,
              project: 'Special Permission',
              projectCode: 'SP',
              task: taskName,
              type: 'special',
              shiftType: '',
              hours: hours,
              locked: true,
              lockedDays: [false, false, false, false, false, false, false].map((_, i) => i === dayIndex)
            });
          }
        });
      }

      if (rows.length === 0) {
        const holidayHours = wd.map((date: Date) => isHoliday(date) ? 9.5 : 0);
        const hasHoliday = holidayHours.some((h: number) => h > 0);

        const initialRows: TimesheetEntry[] = [];

        if (hasHoliday) {
          initialRows.push({
            id: Date.now() + Math.random() + '',
            project: 'Office Holiday',
            projectCode: '',
            task: 'Office Holiday',
            hours: holidayHours,
            type: 'project',
            shiftType: '',
            locked: true
          });
        }

        initialRows.push({
          id: Date.now() + Math.random() + '1',
          project: '',
          projectCode: '',
          task: '',
          hours: [0, 0, 0, 0, 0, 0, 0],
          type: 'project',
          shiftType: ''
        });

        initialRows.push(...specialRows);

        setTimesheetRows(initialRows);
        setOriginalData(JSON.stringify(initialRows));
        setHasUnsavedChanges(false);
      } else {
        const holidayHours = wd.map((date: Date) => isHoliday(date) ? 9.5 : 0);
        const hasHoliday = holidayHours.some((h: number) => h > 0);
        const hasHolidayRow = rows.some((r: any) => r.project === 'Office Holiday' || r.task === 'Office Holiday');

        if (hasHoliday && !hasHolidayRow) {
          rows.unshift({
            id: Date.now() + Math.random() + '',
            project: 'Office Holiday',
            projectCode: '',
            task: 'Office Holiday',
            hours: holidayHours,
            type: 'project',
            shiftType: '',
            locked: true
          });
        }

        rows = rows.filter(r => r.type !== 'special' && r.project !== 'Special Permission');
        rows.push(...specialRows);

        setTimesheetRows(rows);
        setOriginalData(JSON.stringify(rows));
        setHasUnsavedChanges(false);
      }

      setLastUpdateTime(new Date());

    } catch (err) {
      console.error('Error loading week data:', err);
      if (timesheetRows.length === 0) addProjectRow();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentWeek, calculateOnPremisesTime]);

  useEffect(() => {
    loadWeekData();
  }, [currentWeek, loadWeekData]);

  const addProjectRow = () => {
    setTimesheetRows((prev: TimesheetEntry[]) => {
      const lockedDays = [false, false, false, false, false, false, false];
      for (let i = 0; i < 7; i++) {
        const totalLeaveHours = prev.reduce((sum: number, row: TimesheetEntry) => {
          if (row.type === 'leave' && (row.task || '').startsWith('Leave Approved')) {
            return sum + (Number(row.hours[i]) || 0);
          }
          return sum;
        }, 0);
        if (totalLeaveHours >= 8) {
          lockedDays[i] = true;
        }
      }

      const newRow: TimesheetEntry = {
        id: Date.now() + Math.random() + '',
        project: '',
        projectCode: '',
        task: '',
        hours: [0, 0, 0, 0, 0, 0, 0],
        type: 'project',
        shiftType: '',
        lockedDays: lockedDays
      };
      return [...prev, newRow];
    });
  };

  const addLeaveRow = () => {
    if (isAddLeaveDisabled()) {
      showError('Maximum 4 leave rows allowed per timesheet.');
      return;
    }

    const newRow: TimesheetEntry = {
      id: Date.now() + Math.random() + '',
      project: 'Leave',
      projectCode: '',
      task: 'Permission',
      hours: [0, 0, 0, 0, 0, 0, 0],
      type: 'leave',
      shiftType: ''
    };
    setTimesheetRows((prev: TimesheetEntry[]) => [...prev, newRow]);
  };

  const deleteRow = (id: string) => {
    if (timesheetRows.length <= 1) {
      showError('At least one row must remain.');
      return;
    }
    setTimesheetRows((prev: TimesheetEntry[]) => prev.filter((row: TimesheetEntry) => row.id !== id));
  };

  const updateRow = (id: string, field: keyof TimesheetEntry, value: string) => {
    setTimesheetRows((prev: TimesheetEntry[]) =>
      prev.map((row: TimesheetEntry) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };

          if (field === "task") {
            updatedRow.hours = [0, 0, 0, 0, 0, 0, 0];
          }

          if (field === "project") {
            const p = projects.find((proj: Project) => proj.name === value);
            updatedRow.projectCode = p ? p.code : '';
          }

          return updatedRow;
        }
        return row;
      })
    );
  };

  const updateHours = (id: string, dayIndex: number, value: string) => {
    const row = timesheetRows.find((r: TimesheetEntry) => r.id === id);
    if (!row) return;

    if (!isShiftSelectedForDay(dayIndex)) {
      showError('Please select a shift for this day first.');
      return;
    }

    const isFullDayMarked = timesheetRows.some(
      (r: TimesheetEntry) =>
        (r.task === 'Full Day Leave' || r.task === 'Office Holiday' || (r.task === 'Leave Approved' && Number(r.hours?.[dayIndex] || 0) >= 9)) &&
        (Number(r.hours?.[dayIndex] || 0) > 0)
    );

    if (isFullDayMarked && row.task !== 'Full Day Leave' && row.task !== 'Office Holiday' && row.task !== 'Leave Approved') {
      showError('Leave/Holiday applied on this day; other entries are blocked.');
      return;
    }

    let val = value;
    if (typeof val === "string") {
      val = normalizeHHMMInput(val);
    }

    if (val === "" || val === null || val === undefined) {
      setTimesheetRows((prev: TimesheetEntry[]) =>
        prev.map((r: TimesheetEntry) => {
          if (r.id === id) {
            const newHours = [...r.hours];
            newHours[dayIndex] = 0;
            return { ...r, hours: newHours };
          }
          return r;
        })
      );
      return;
    }

    let numValue = parseHHMMToHours(val);

    const currentDailyAllTotal = timesheetRows.reduce((total: number, r: TimesheetEntry) => {
      if (r.id === id) return total;
      return total + (r.hours[dayIndex] || 0);
    }, 0);

    const currentDailyProjectTotal = timesheetRows.reduce((total: number, r: TimesheetEntry) => {
      if (r.id === id) return total;
      if (r.type !== "project") return total;
      return total + (r.hours[dayIndex] || 0);
    }, 0);

    const newWorkTotalAll = currentDailyAllTotal + numValue;

    if (newWorkTotalAll > 24) {
      showError(`Daily total cannot exceed 24 hours.`);
      return;
    }

    if (newWorkTotalAll >= 22 && newWorkTotalAll <= 24) {
      const remainingHours = (24 - newWorkTotalAll).toFixed(1);
      showError(`⚠️ Warning: Approaching 24-hour limit. Only ${remainingHours}h remaining`, "Warning");
    }

    if (row.task === "Office Holiday" || row.task === "Full Day Leave") {
      if (numValue > 0 && numValue < 9.5) {
        numValue = 9.5;
      } else if (numValue === 0) {
        numValue = 0;
      }
      if (numValue > 0 && numValue !== 9.5) {
        numValue = 9.5;
      }
    } else if (row.task === "Half Day Leave") {
      if (numValue > 0 && numValue < 4.75) {
        numValue = 4.75;
      } else if (numValue === 0) {
        numValue = 0;
      }
      if (numValue > 0 && numValue !== 4.75) {
        numValue = 4.75;
      }
    } else if (row.task === "Permission") {
      if (numValue <= 0) {
        numValue = 0;
      } else if (numValue < 1) {
        showError("Minimum duration for permission is 1 hour.");
        return;
      } else if (numValue > 2) {
        showError("Maximum duration for permission is 2 hours.");
        return;
      } else if (numValue !== 1 && numValue !== 2) {
        showError("Permission duration must be whole hours (1 or 2).");
        return;
      }

      const getPermissionCountForHours = (h: number): number => {
        const val = Number(h) || 0;
        if (val >= 2) return 2;
        if (val >= 1) return 1;
        return 0;
      };

      const computeMonthlyPermissionCountWithOverride = (overrideRowId: string, overrideDayIndex: number, overrideHours: number): number => {
        const currentMonth = currentWeek.getMonth();
        const currentYear = currentWeek.getFullYear();
        let count = monthlyBasePermissionCount;

        timesheetRows.forEach((r) => {
          if (r.task !== "Permission" || r.type === 'special' || r.project === 'Special Permission') return;
          r.hours.forEach((h, idx) => {
            const date = weekDates[idx];
            if (date && date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
              const hours = (r.id === overrideRowId && idx === overrideDayIndex) ? overrideHours : h;
              const c = getPermissionCountForHours(hours);
              count += c;
            }
          });
        });
        return count;
      };

      if (numValue > 0) {
        const prospectiveCount = computeMonthlyPermissionCountWithOverride(id, dayIndex, numValue);
        if (prospectiveCount > 3) {
          showError(`Monthly permission limit (3) exceeded! Used: ${prospectiveCount}`);
          return;
        }
      }
    } else {
      numValue = Math.max(0, numValue);
    }

    const hasPartialLeave = timesheetRows.some(
      (r) => (r.task === "Half Day Leave" || ((r.task || "").startsWith("Leave Approved") && Number(r.hours?.[dayIndex] || 0) < 9)) &&
        Number(r.hours?.[dayIndex] || 0) > 0
    );

    if (row.type === "project") {
      const opHours = Number(onPremisesTime?.daily?.[dayIndex] || 0);
      if (opHours > 0) {
        const remainingAllowed = Math.max(0, opHours - currentDailyProjectTotal);
        if (numValue > remainingAllowed) {
          numValue = remainingAllowed;
        }
      } else if (!hasPartialLeave) {
        numValue = 0;
      }
    }

    const finalWorkTotal = currentDailyAllTotal + numValue;

    if (finalWorkTotal > 24) {
      showError(`Daily total cannot exceed 24 hours.`);
      return;
    }

    setTimesheetRows((prev: TimesheetEntry[]) =>
      prev.map((r: TimesheetEntry) => {
        if (r.id === id) {
          const newHours = [...r.hours];
          newHours[dayIndex] = Math.round(numValue * 100) / 100;
          return { ...r, hours: newHours };
        }
        return r;
      })
    );
  };

  const saveAsDraft = async () => {
    if (!hasSomeData()) {
      showError('Please enter at least some data before saving.');
      return;
    }

    const userStr = await AsyncStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};

    const sanitizedEntries = timesheetRows.map((row: TimesheetEntry) => ({
      project: row.project || 'Unnamed Project',
      projectCode: row.type === 'leave' ? '' : (projects.find((p: Project) => p.name === row.project)?.code || ''),
      task: row.task || 'Unnamed Task',
      type: row.type,
      locked: row.locked,
      hours: row.hours.map((h: number) => Number(h) || 0),
    }));

    const payload = {
      weekStartDate: normalizeToUTCDateOnly(weekDates[0]),
      weekEndDate: normalizeToUTCDateOnly(weekDates[6]),
      entries: sanitizedEntries,
      totalHours: Number((totals.weekly).toFixed(1)) || 0,
      status: 'Draft',
      shiftType: shiftType,
      dailyShiftTypes: dailyShiftTypes,
      employeeId: user.employeeId || '',
      employeeName: user.name || '',
      onPremisesTime: {
        daily: onPremisesTime.daily.map((n: number) => Number(n) || 0),
        weekly: Number(onPremisesTime.weekly) || 0
      }
    };

    try {
      setLoading(true);
      await timesheetAPI.saveTimesheet(payload);
      setOriginalData(JSON.stringify(timesheetRows));
      setHasUnsavedChanges(false);
      showMessage('Timesheet saved as draft!', 'success');
    } catch (error: any) {
      console.error('Error saving timesheet:', error);
      showMessage(error.response?.data?.message || 'Failed to save timesheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const submitTimesheet = async () => {
    if (!allDaysSatisfied) {
      showError("Minimum hours not met for one or more days.");
      return;
    }

    const invalidRows = timesheetRows.filter(
      (row: TimesheetEntry) => !row.project || (row.type === 'project' && !row.task)
    );
    if (invalidRows.length > 0) {
      showError('Please fill all required fields for all rows.');
      return;
    }

    if (totals.weekly === 0) {
      showError('Please enter hours for at least one day.');
      return;
    }

    const missingShiftDays = getMissingShiftDays();
    if (missingShiftDays.length > 0) {
      showError(`Please select a shift for: ${missingShiftDays.join(', ')}`);
      return;
    }

    if (monthlyPermissionCount > 3) {
      showError(`Monthly permission limit exceeded! Current: ${monthlyPermissionCount}/3`);
      return;
    }

    const userStr = await AsyncStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};

    const sanitizedEntries = timesheetRows.map((row: TimesheetEntry) => ({
      project: row.project,
      projectCode: row.type === 'leave' ? '' : (projects.find((p: Project) => p.name === row.project)?.code || ''),
      task: row.task,
      type: row.type,
      locked: row.locked,
      hours: row.hours.map((h: number) => Number(h) || 0),
    }));

    const payload = {
      weekStartDate: normalizeToUTCDateOnly(weekDates[0]),
      weekEndDate: normalizeToUTCDateOnly(weekDates[6]),
      entries: sanitizedEntries,
      totalHours: Number((totals.weekly).toFixed(1)) || 0,
      status: 'Submitted',
      shiftType: shiftType,
      dailyShiftTypes: dailyShiftTypes,
      employeeId: user.employeeId || '',
      employeeName: user.name || '',
      onPremisesTime: {
        daily: onPremisesTime.daily.map((n: number) => Number(n) || 0),
        weekly: Number(onPremisesTime.weekly) || 0
      }
    };

    try {
      setLoading(true);
      await timesheetAPI.saveTimesheet(payload);
      setIsSubmitted(true);
      showMessage('Timesheet submitted successfully!', 'success');
    } catch (error: any) {
      console.error('Error submitting timesheet:', error);
      showMessage(error.response?.data?.message || 'Failed to submit timesheet', 'error');
    } finally {
      setLoading(false);
    }
  };

  const previousWeek = () => {
    handleNavigation(() => {
      const newWeek = new Date(currentWeek);
      newWeek.setDate(newWeek.getDate() - 7);
      setCurrentWeek(newWeek);
      setTimesheetRows([]);
      setIsSubmitted(false);
      setRejectionReason('');
      setOriginalData(null);
    });
  };

  const nextWeek = () => {
    if (!canNavigateNextWeek()) return;
    handleNavigation(() => {
      const newWeek = new Date(currentWeek);
      newWeek.setDate(newWeek.getDate() + 7);
      setCurrentWeek(newWeek);
      setTimesheetRows([]);
      setIsSubmitted(false);
      setRejectionReason('');
      setOriginalData(null);
    });
  };

  const goToCurrentWeek = () => {
    handleNavigation(() => {
      setCurrentWeek(new Date());
      setTimesheetRows([]);
      setIsSubmitted(false);
      setRejectionReason('');
      setOriginalData(null);
    });
  };

  const handleNavigation = (navigationFunction: () => void) => {
    if (hasUnsavedChanges && !isSubmitted) {
      setPendingNavigation(() => navigationFunction);
      setShowNavigationDialog(true);
    } else {
      navigationFunction();
    }
  };

  const confirmSaveAndNavigate = () => {
    saveAsDraft();
    setShowNavigationDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const discardAndNavigate = () => {
    setShowNavigationDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };

  const cancelNavigation = () => {
    setShowNavigationDialog(false);
    setPendingNavigation(null);
  };

  const canNavigateNextWeek = (): boolean => {
    const next = new Date(currentWeek);
    next.setDate(next.getDate() + 7);
    const nextMonday = new Date(next);
    const todayMonday = new Date();
    const day = todayMonday.getDay();
    const diffToMonday = (day + 6) % 7;
    todayMonday.setDate(todayMonday.getDate() - diffToMonday);
    return nextMonday <= todayMonday;
  };

  const formatWeekRange = (): string => {
    const startMonth = weekDates[0].toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekDates[6].toLocaleDateString('en-US', { month: 'short' });
    const startDay = weekDates[0].getDate();
    const endDay = weekDates[6].getDate();
    const startYear = weekDates[0].getFullYear();
    const endYear = weekDates[6].getFullYear();

    const getISOWeek = (d: Date): number => {
      const date = new Date(d.valueOf());
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
      const week1 = new Date(date.getFullYear(), 0, 4);
      return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    };

    const weekNumber = getISOWeek(weekDates[0]);
    
    if (startYear !== endYear) {
      return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear} (Week ${weekNumber})`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear} (Week ${weekNumber})`;
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
      });
      setSpFile(result[0]);
      setSpFileName(result[0].name);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled document picker');
      } else {
        console.error('Document picker error:', err);
      }
    }
  };

  // Improved Action Buttons with better design
  const renderActionButtons = () => (
    <View style={{ 
      flexDirection: 'row', 
      flexWrap: 'wrap', 
      justifyContent: 'space-between', 
      padding: 16,
      backgroundColor: COLORS.white,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    }}>
      <TouchableOpacity
        onPress={addProjectRow}
        disabled={isSubmitted}
        style={{
          backgroundColor: isSubmitted ? COLORS.gray : COLORS.primary,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 30,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
          width: '48%',
          elevation: 2,
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
      >
        <View style={{ 
          backgroundColor: COLORS.white + '30', 
          borderRadius: 20, 
          width: 30, 
          height: 20, 
          justifyContent: 'center', 
          alignItems: 'center',
          marginRight: 10
        }}>
          <Icon name="add" size={18} color={COLORS.white} />
        </View>
        <Text style={{ color: COLORS.white, fontWeight: '500', fontSize: 13}}>ADD PROJECT</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={addLeaveRow}
        disabled={isAddLeaveDisabled()}
        style={{
          backgroundColor: isAddLeaveDisabled() ? COLORS.gray : COLORS.primary,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 30,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
          width: '48%',
          elevation: 2,
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
      >
        <View style={{ 
          backgroundColor: COLORS.white + '30', 
          borderRadius: 20, 
          width: 30, 
          height: 30, 
          justifyContent: 'center', 
          alignItems: 'center',
          marginRight: 10
        }}>
          <IconCommunity name="clock-outline" size={16} color={COLORS.white} />
        </View>
        <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 12 }}>ADD PERMISSION</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => {
          const today = new Date();
          const inWeek = weekDates.some(d => d.toDateString() === today.toDateString());
          const initialDate = inWeek ? today : weekDates[0];
          setSpDate(initialDate);
          const y = initialDate.getFullYear();
          const m = String(initialDate.getMonth() + 1).padStart(2, '0');
          const d = String(initialDate.getDate()).padStart(2, '0');
          calculateSpecialPermission(`${y}-${m}-${d}`);
          setSpReason("");
          setSpFile(null);
          setSpFileName('');
          setShowSpecialModal(true);
        }}
        disabled={isSubmitted}
        style={{
          backgroundColor: isSubmitted ? COLORS.gray : COLORS.purple,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 30,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
          width: '48%',
          elevation: 2,
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
      >
        <View style={{ 
          backgroundColor: COLORS.white + '30', 
          borderRadius: 20, 
          width: 30, 
          height: 30, 
          justifyContent: 'center', 
          alignItems: 'center',
          marginRight: 10
        }}>
          <Icon name="security" size={16} color={COLORS.white} />
        </View>
        <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 12 }}>SPECIAL PERMISSION</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={saveAsDraft}
        disabled={loading || !hasSomeData() || isSubmitted}
        style={{
          backgroundColor: (loading || !hasSomeData() || isSubmitted) ? COLORS.gray : COLORS.success,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 30,
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 8,
          width: '48%',
          elevation: 2,
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
      >
        <View style={{ 
          backgroundColor: COLORS.white + '30', 
          borderRadius: 20, 
          width: 30, 
          height: 30, 
          justifyContent: 'center', 
          alignItems: 'center',
          marginRight: 10
        }}>
          <Icon name="save" size={16} color={COLORS.white} />
        </View>
        <Text style={{ color: COLORS.white, fontWeight: '600', fontSize: 12 }}>SAVE DRAFT</Text>
      </TouchableOpacity>
    </View>
  );

  // Shift Row with original table colors
  const renderShiftRow = () => (
    <View style={{ 
      flexDirection: 'row', 
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#D1D5DB',
      borderBottomWidth: 0,
      minHeight: 50,
    }}>
      <View style={{ width: 40, paddingVertical: 8, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', justifyContent: 'center', backgroundColor: '#E5E7EB' }}>
        <Text style={{ color: '#2C3E50', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>SFT</Text>
      </View>
      <View style={{ width: 140, paddingVertical: 8, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', justifyContent: 'center', backgroundColor: '#E5E7EB' }}>
        <Text style={{ color: '#2C3E50', fontSize: 12, fontWeight: '700' }}>SHIFT TYPE</Text>
      </View>
      <View style={{ width: 150, paddingVertical: 8, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', justifyContent: 'center', backgroundColor: '#E5E7EB' }}>
        <Text style={{ color: '#2C3E50', fontSize: 12, fontWeight: '700' }}>SELECT SHIFT</Text>
      </View>
      
      {days.map((day, index) => {
        const selectedShift = dailyShiftTypes[index] || '';
        const isWeekend = index >= 5;
        const isHolidayDate = isHoliday(weekDates[index]);
        
        return (
          <View key={day} style={{ width: 70, paddingVertical: 4, paddingHorizontal: 2, borderRightWidth: index < 6 ? 1 : 0, borderRightColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', backgroundColor: isHolidayDate ? '#E8F5E9' : '#FFFFFF' }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#2C3E50' }}>{day}</Text>
            <Text style={{ fontSize: 9, color: '#7F8C8D', marginBottom: 2 }}>
              {weekDates[index].getDate()}/{weekDates[index].getMonth() + 1}
            </Text>
            <View style={{ 
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 4,
              backgroundColor: '#FFFFFF',
              width: 62,
              height: 30,
              overflow: 'hidden',
              opacity: isWeekend || isHolidayDate ? 0.6 : 1,
            }}>
              <Picker
                selectedValue={dailyShiftTypes[index] || ''}
                onValueChange={(value: string) => {
                  const newShiftTypes = [...dailyShiftTypes];
                  newShiftTypes[index] = value;
                  setDailyShiftTypes(newShiftTypes);
                }}
                enabled={!isSubmitted && !isWeekend && !isHolidayDate}
                style={{ 
                  height: 30,
                  width: '100%',
                  color: '#2C3E50',
                  marginLeft: -8,
                  backgroundColor: '#FFFFFF',
                }}
                dropdownIconColor={COLORS.primary}
                mode="dropdown"
              >
                <PickerItem label="-" value="" color="#7F8C8D" />
                {shiftTypes.map((type) => {
                  return <PickerItem key={type} label={type} value={type} color="#2C3E50" />;
                })}
              </Picker>
            </View>
            {selectedShift && (
              <Text style={{ fontSize: 8, color: COLORS.primary, marginTop: 2, fontWeight: '600' }}>
                {selectedShift.split(' ')[0]}
              </Text>
            )}
            {isHolidayDate && !selectedShift && (
              <Text style={{ fontSize: 8, color: '#059669', marginTop: 2, fontWeight: '600' }}>
                HOLIDAY
              </Text>
            )}
          </View>
        );
      })}
      
      <View style={{ width: 70, paddingVertical: 8, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E7EB' }}>
        <Text style={{ color: '#2C3E50', fontSize: 12, fontWeight: '700' }}>TOTAL</Text>
      </View>
      <View style={{ width: 50, paddingVertical: 8, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E5E7EB' }}>
        <Text style={{ color: '#2C3E50', fontSize: 12, fontWeight: '700' }}>ACT</Text>
      </View>
    </View>
  );

  // Table Header with original colors
  const renderTableHeader = () => (
    <View style={{ 
      flexDirection: 'row', 
      backgroundColor: '#262760',
    }}>
      <View style={{ width: 40, paddingVertical: 12, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB' }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>#</Text>
      </View>
      <View style={{ width: 140, paddingVertical: 12, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB' }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>PROJECT</Text>
      </View>
      <View style={{ width: 150, paddingVertical: 12, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB' }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>TASK</Text>
      </View>
      {days.map((day, index) => (
        <View key={day} style={{ width: 70, paddingVertical: 8, paddingHorizontal: 2, borderRightWidth: 1, borderRightColor: '#D1D5DB', alignItems: 'center', backgroundColor: isHoliday(weekDates[index]) ? '#059669' : '#262760' }}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>{day}</Text>
          <Text style={{ color: '#FFFFFF', fontSize: 9, marginTop: 2 }}>
            {weekDates[index].getDate()}/{weekDates[index].getMonth() + 1}
          </Text>
        </View>
      ))}
      <View style={{ width: 70, paddingVertical: 12, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>TOTAL</Text>
      </View>
      <View style={{ width: 50, paddingVertical: 12, paddingHorizontal: 4, alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>ACT</Text>
      </View>
    </View>
  );

  // Table Row with original colors
  const renderTableRow = (row: TimesheetEntry, index: number) => (
    <View key={row.id} style={{ 
      flexDirection: 'row', 
      backgroundColor: index % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
      borderBottomWidth: 1,
      borderBottomColor: '#D1D5DB',
      minHeight: 55,
    }}>
      <View style={{ width: 40, paddingVertical: 8, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', justifyContent: 'center' }}>
        <Text style={{ color: '#2C3E50', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>{index + 1}</Text>
      </View>
      
      <View style={{ width: 140, paddingVertical: 4, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', justifyContent: 'center' }}>
        {row.type === 'leave' ? (
          <View style={{ backgroundColor: '#EBF5FF', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6 }}>
            <Text style={{ color: '#2563EB', fontWeight: '600', fontSize: 13, textAlign: 'center' }}>Leave</Text>
          </View>
        ) : row.type === 'special' ? (
          <View style={{ backgroundColor: '#EDE9FE', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6 }}>
            <Text style={{ color: '#7C3AED', fontWeight: '600', fontSize: 13, textAlign: 'center' }}>Special</Text>
          </View>
        ) : row.project === 'Office Holiday' ? (
          <View style={{ backgroundColor: '#D1FAE5', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6 }}>
            <Text style={{ color: '#059669', fontWeight: '600', fontSize: 13, textAlign: 'center' }}>Holiday</Text>
          </View>
        ) : (
          <View style={{ 
            borderWidth: 1, 
            borderColor: '#D1D5DB', 
            borderRadius: 6,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
            height: 45,
            justifyContent: 'center',
          }}>
            <Picker
              selectedValue={row.project}
              onValueChange={(value: string) => {
                updateRow(row.id, 'project', value);
              }}
              enabled={!isSubmitted && !row.locked}
              style={{ 
                color: '#2C3E50', 
                height: 45,
                width: '100%',
                marginLeft: -8,
                backgroundColor: '#FFFFFF',
              }}
              dropdownIconColor={COLORS.primary}
              mode="dropdown"
            >
              <PickerItem label="-- Select Project --" value="" color="#7F8C8D" />
              {projects.map((p: Project) => {
                return (
                  <PickerItem 
                    key={p.code || p.name} 
                    label={p.name} 
                    value={p.name}
                    color="#2C3E50"
                  />
                );
              })}
            </Picker>
          </View>
        )}
      </View>

      <View style={{ width: 150, paddingVertical: 4, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', justifyContent: 'center' }}>
        {row.task === 'Office Holiday' || row.task === 'Permission' || row.type === 'special' ? (
          <View style={{ 
            backgroundColor: row.type === 'special' ? '#EDE9FE' : (row.task === 'Office Holiday' ? '#D1FAE5' : '#EBF5FF'),
            paddingVertical: 8, 
            paddingHorizontal: 4, 
            borderRadius: 6 
          }}>
            <Text style={{ 
              color: row.type === 'special' ? '#7C3AED' : (row.task === 'Office Holiday' ? '#059669' : '#2563EB'),
              fontWeight: '600', 
              fontSize: 13,
              textAlign: 'center'
            }}>
              {row.task}
            </Text>
          </View>
        ) : (
          <View style={{ 
            borderWidth: 1, 
            borderColor: '#D1D5DB', 
            borderRadius: 6,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
            height: 45,
            justifyContent: 'center',
          }}>
            <Picker
              selectedValue={row.task}
              onValueChange={(value: string) => {
                updateRow(row.id, 'task', value);
              }}
              enabled={!isSubmitted && !row.locked}
              style={{ 
                color: '#2C3E50', 
                height: 45,
                width: '100%',
                marginLeft: -8,
                backgroundColor: '#FFFFFF',
              }}
              dropdownIconColor={COLORS.primary}
              mode="dropdown"
            >
              <PickerItem label="-- Select Task --" value="" color="#7F8C8D" />
              {(row.type === 'leave' ? leaveTypes : tasks).map((item: string) => {
                return (
                  <PickerItem 
                    key={item} 
                    label={item} 
                    value={item}
                    color="#2C3E50"
                  />
                );
              })}
            </Picker>
          </View>
        )}
      </View>

      {row.hours.map((hours: number, dayIndex: number) => {
        const isLocked = row.locked === true;
        const isDayLocked = row.lockedDays && row.lockedDays[dayIndex] === true;
        const isMissingProjectOrTask = row.type === 'project' ? (!row.project || !row.task) : (!row.task);
        const isFullDayLeaveBlocked = hasFullDayLeave(dayIndex) && 
          row.task !== 'Full Day Leave' && 
          row.task !== 'Office Holiday' && 
          row.task !== 'Leave Approved';
        
        const isPermissionNotAllowed = row.task === "Permission" && !isPermissionAllowed(dayIndex, row.id);
        const monthlyLimitReached = monthlyPermissionCount >= 3 && Number(hours) === 0 && row.task === "Permission";
        
        const isDisabled = Boolean(
          isSubmitted || 
          isLocked || 
          isDayLocked ||
          isMissingProjectOrTask ||
          isFullDayLeaveBlocked ||
          isPermissionNotAllowed ||
          monthlyLimitReached
        );

        const shiftSelected = Boolean(dailyShiftTypes[dayIndex] || shiftType);
        const isEditable = !isDisabled && shiftSelected;

        return (
          <View key={dayIndex} style={{ 
            width: 70, 
            paddingVertical: 4, 
            paddingHorizontal: 2, 
            borderRightWidth: 1, 
            borderRightColor: '#D1D5DB', 
            justifyContent: 'center', 
            alignItems: 'center',
            backgroundColor: isHoliday(weekDates[dayIndex]) ? '#E8F5E9' : 'transparent'
          }}>
            <TextInput
              value={cellInputs[`${row.id}_${dayIndex}`] ?? formatHoursHHMM(hours)}
              onChangeText={(val: string) => {
                if (/^[0-9:]*$/.test(val)) {
                  const normalized = normalizeHHMMInput(val);
                  setCellInputs((prev: Record<string, string>) => ({ ...prev, [`${row.id}_${dayIndex}`]: normalized }));
                }
              }}
              onBlur={() => {
                const val = cellInputs[`${row.id}_${dayIndex}`] || '';
                updateHours(row.id, dayIndex, val);
                setCellInputs((prev: Record<string, string>) => {
                  const next = { ...prev };
                  delete next[`${row.id}_${dayIndex}`];
                  return next;
                });
              }}
              editable={isEditable}
              style={{
                width: 62,
                height: 40,
                borderWidth: 1,
                borderColor: !shiftSelected || isDisabled ? '#E5E7EB' : '#2563EB',
                borderRadius: 6,
                textAlign: 'center',
                fontSize: 13,
                fontWeight: '500',
                backgroundColor: !shiftSelected || isDisabled ? '#F3F4F6' : '#FFFFFF',
                color: isDisabled ? '#6B7280' : '#2C3E50',
              }}
              placeholder="00:00"
              placeholderTextColor="#9CA3AF"
              maxLength={5}
            />
            {row.task === "Permission" && hours > 0 && (
              <View style={{ position: 'absolute', top: 0, right: 2 }}>
                <View style={{ backgroundColor: '#2563EB', width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: 'bold' }}>P</Text>
                </View>
              </View>
            )}
          </View>
        );
      })}

      <View style={{ width: 70, paddingVertical: 8, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#059669', fontWeight: '700', fontSize: 14 }}>
          {formatHoursHHMM(row.hours.reduce((sum: number, h: number) => sum + h, 0))}
        </Text>
      </View>

      <View style={{ width: 50, paddingVertical: 8, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => deleteRow(row.id)}
          disabled={timesheetRows.length <= 1 || isSubmitted || row.locked === true}
          style={{ 
            padding: 6, 
            backgroundColor: (isSubmitted || row.locked === true) ? '#F3F4F6' : '#FEE2E2', 
            borderRadius: 20,
            width: 36,
            height: 36,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Icon name="delete" size={20} color={(isSubmitted || row.locked === true) ? '#9CA3AF' : '#DC2626'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Footer with original colors (Break Time removed)
  const renderFooter = () => (
    <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderTopWidth: 0 }}>
      {/* On-Premises Time */}
      <View style={{ flexDirection: 'row', backgroundColor: '#E8F5E9', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
        <View style={{ width: 40, paddingVertical: 10, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', backgroundColor: '#E5E7EB' }} />
        <View style={{ width: 140, paddingVertical: 10, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', backgroundColor: '#E5E7EB' }}>
          <Text style={{ color: '#2C3E50', fontWeight: '600', fontSize: 12 }}>ON-PREMISES</Text>
        </View>
        <View style={{ width: 150, paddingVertical: 10, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', backgroundColor: '#E5E7EB' }}>
          <Text style={{ color: '#2C3E50', fontWeight: '600', fontSize: 12 }}>TIME</Text>
        </View>
        {onPremisesTime.daily.map((hours: number, index: number) => (
          <View key={index} style={{ width: 70, paddingVertical: 10, paddingHorizontal: 2, borderRightWidth: 1, borderRightColor: '#D1D5DB', alignItems: 'center', backgroundColor: '#E8F5E9' }}>
            <Text style={{ color: '#059669', fontWeight: '600', fontSize: 13 }}>
              {formatHoursHHMM(hours)}
            </Text>
          </View>
        ))}
        <View style={{ width: 70, paddingVertical: 10, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', alignItems: 'center', backgroundColor: '#E8F5E9' }}>
          <Text style={{ color: '#059669', fontWeight: '600', fontSize: 13 }}>
            {formatHoursHHMM(onPremisesTime.weekly)}
          </Text>
        </View>
        <View style={{ width: 50, paddingVertical: 10, paddingHorizontal: 4, backgroundColor: '#E8F5E9' }} />
      </View>

      {/* Work Hours Total */}
      <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#D1D5DB' }}>
        <View style={{ width: 40, paddingVertical: 10, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', backgroundColor: '#E5E7EB' }} />
        <View style={{ width: 140, paddingVertical: 10, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', backgroundColor: '#E5E7EB' }}>
          <Text style={{ color: '#2C3E50', fontWeight: '600', fontSize: 12 }}>WORK HOURS</Text>
        </View>
        <View style={{ width: 150, paddingVertical: 10, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', backgroundColor: '#E5E7EB' }}>
          <Text style={{ color: '#2C3E50', fontWeight: '600', fontSize: 12 }}>TOTAL</Text>
        </View>
        {totals.daily.map((total: number, index: number) => (
          <View key={index} style={{ width: 70, paddingVertical: 10, paddingHorizontal: 2, borderRightWidth: 1, borderRightColor: '#D1D5DB', alignItems: 'center' }}>
            <Text style={{ color: '#2C3E50', fontWeight: '500', fontSize: 13 }}>
              {formatHoursHHMM(total)}
            </Text>
          </View>
        ))}
        <View style={{ width: 70, paddingVertical: 10, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', alignItems: 'center' }}>
          <Text style={{ color: '#059669', fontWeight: '600', fontSize: 13 }}>
            {formatHoursHHMM(totals.weekly)}
          </Text>
        </View>
        <View style={{ width: 50, paddingVertical: 10, paddingHorizontal: 4 }} />
      </View>

      {/* Total Hours (Work only - Break removed) */}
      <View style={{ flexDirection: 'row', backgroundColor: '#DBEAFE' }}>
        <View style={{ width: 40, paddingVertical: 12, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', backgroundColor: '#E5E7EB' }} />
        <View style={{ width: 140, paddingVertical: 12, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', backgroundColor: '#E5E7EB' }}>
          <Text style={{ color: '#2C3E50', fontWeight: '700', fontSize: 13 }}>TOTAL</Text>
        </View>
        <View style={{ width: 150, paddingVertical: 12, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', backgroundColor: '#E5E7EB' }}>
          <Text style={{ color: '#2C3E50', fontWeight: '700', fontSize: 13 }}>HOURS</Text>
        </View>
        {days.map((_, index) => (
          <View key={index} style={{ width: 70, paddingVertical: 12, paddingHorizontal: 2, borderRightWidth: 1, borderRightColor: '#D1D5DB', alignItems: 'center', backgroundColor: '#DBEAFE' }}>
            <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 14 }}>
              {getDailyTotalWithBreak(index)}
            </Text>
          </View>
        ))}
        <View style={{ width: 70, paddingVertical: 12, paddingHorizontal: 4, borderRightWidth: 1, borderRightColor: '#D1D5DB', alignItems: 'center', backgroundColor: '#DBEAFE' }}>
          <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 14 }}>
            {getWeeklyTotalWithBreak()}
          </Text>
        </View>
        <View style={{ width: 50, paddingVertical: 12, paddingHorizontal: 4, backgroundColor: '#DBEAFE' }} />
      </View>

      {/* Attendance Records and Permission Count */}
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#F3F4F6',
        borderTopWidth: 1,
        borderTopColor: '#D1D5DB'
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: attendanceRecords.length > 0 ? '#10B981' : '#EF4444',
            marginRight: 6
          }} />
          <Text style={{ fontSize: 11, color: '#4B5563' }}>
            {attendanceRecords.length > 0 
              ? `${attendanceRecords.length} attendance records` 
              : 'No attendance data'}
          </Text>
        </View>
        <Text style={{ fontSize: 10, color: '#4B5563' }}>
          Updated: {lastUpdateTime.toLocaleTimeString()}
        </Text>
      </View>

      <View style={{ 
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: monthlyPermissionCount >= 3 ? '#FEE2E2' : '#DBEAFE',
        borderTopWidth: 1,
        borderTopColor: '#D1D5DB'
      }}>
        <Text style={{ 
          fontSize: 12, 
          color: monthlyPermissionCount >= 3 ? '#DC2626' : '#2563EB',
          fontWeight: '600'
        }}>
          Permissions used this month: {monthlyPermissionCount}/3
        </Text>
      </View>
    </View>
  );

  // Special Permissions List
  const renderSpecialPermissionsList = () => (
    <View style={{ 
      backgroundColor: '#FFFFFF', 
      margin: 16, 
      borderRadius: 12, 
      borderWidth: 1, 
      borderColor: '#E5E7EB',
      overflow: 'hidden',
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    }}>
      <View style={{ 
        backgroundColor: '#262760', 
        padding: 14, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="security" size={18} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14, marginLeft: 8 }}>
            Special Permissions This Week
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            const today = new Date();
            const inWeek = weekDates.some(d => d.toDateString() === today.toDateString());
            const initialDate = inWeek ? today : weekDates[0];
            setSpDate(initialDate);
            const y = initialDate.getFullYear();
            const m = String(initialDate.getMonth() + 1).padStart(2, '0');
            const d = String(initialDate.getDate()).padStart(2, '0');
            calculateSpecialPermission(`${y}-${m}-${d}`);
            setSpReason("");
            setSpFile(null);
            setSpFileName('');
            setShowSpecialModal(true);
          }}
          disabled={isSubmitted}
          style={{ 
            backgroundColor: isSubmitted ? '#6B7280' : '#FFFFFF', 
            paddingHorizontal: 12, 
            paddingVertical: 6, 
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center'
          }}
        >
          <Icon name="add" size={16} color={isSubmitted ? '#FFFFFF' : '#262760'} />
          <Text style={{ color: isSubmitted ? '#FFFFFF' : '#262760', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>NEW</Text>
        </TouchableOpacity>
      </View>

      {mySpecials.length === 0 ? (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Icon name="info-outline" size={32} color="#E5E7EB" />
          <Text style={{ color: '#6B7280', fontSize: 14, marginTop: 8 }}>No special permissions for this week.</Text>
        </View>
      ) : (
        <View>
          {mySpecials
            .filter((sp, index, self) => 
              index === self.findIndex((t) => (
                new Date(t.date).toDateString() === new Date(sp.date).toDateString()
              ))
            )
            .map((sp) => {
              const d = new Date(sp.date);
              const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              const hours = Number(sp.totalHours || 0);
              const hh = String(Math.floor(hours)).padStart(2, '0');
              const mm = String(Math.round((hours - Math.floor(hours)) * 60)).padStart(2, '0');
              
              let statusColor = '#F59E0B';
              let statusBg = '#FFEDD5';
              if (sp.status === 'APPROVED') {
                statusColor = '#10B981';
                statusBg = '#D1FAE5';
              }
              if (sp.status === 'REJECTED') {
                statusColor = '#EF4444';
                statusBg = '#FEE2E2';
              }

              return (
                <View key={sp._id} style={{ 
                  flexDirection: 'row', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#E5E7EB'
                }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Icon name="event" size={14} color="#6B7280" />
                      <Text style={{ color: '#111827', fontWeight: '500', fontSize: 13, marginLeft: 6 }}>
                        {dateStr} • {hh}:{mm}
                      </Text>
                    </View>
                    <Text style={{ color: '#4B5563', fontSize: 12 }} numberOfLines={2}>
                      {sp.reason}
                    </Text>
                  </View>
                  <View style={{ 
                    backgroundColor: statusBg,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 16,
                    marginLeft: 8
                  }}>
                    <Text style={{ color: statusColor, fontWeight: '600', fontSize: 11 }}>
                      {sp.status}
                    </Text>
                  </View>
                </View>
              );
            })}
        </View>
      )}
    </View>
  );

  // Important Notes
  const renderImportantNotes = () => (
    <View style={{ 
      padding: 16, 
      backgroundColor: '#FEF3C7', 
      marginHorizontal: 16,
      marginVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#F59E0B40',
      elevation: 2,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Icon name="info" size={20} color="#F59E0B" />
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginLeft: 8 }}>IMPORTANT NOTES</Text>
      </View>
      
      <View style={{ paddingLeft: 8 }}>
        <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 6 }}>• Shift timings:</Text>
        <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 4, marginLeft: 12 }}>
          • First Shift: 7:00 AM - 3:30 PM (Min 7h 15m)
        </Text>
        <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 4, marginLeft: 12 }}>
          • Second Shift: 3:00 PM - 11:30 PM (Min 7h 15m)
        </Text>
        <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 8, marginLeft: 12 }}>
          • General Shift: 9:30 AM - 7:00 PM (Min 8h 00m)
        </Text>
        <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 4 }}>• Monthly permission limit: Maximum 3 permissions</Text>
        <Text style={{ fontSize: 12, color: '#4B5563', marginBottom: 4 }}>• Permission duration: 1-2 hours only</Text>
        <Text style={{ fontSize: 12, color: '#059669' }}>• On-Premises time updates every 30 seconds</Text>
      </View>
    </View>
  );

  // Special Permission Modal
  const renderSpecialPermissionModal = () => (
    <Modal
      visible={showSpecialModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSpecialModal(false)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '90%', maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0A0F2C' }}>Special Permission</Text>
            <TouchableOpacity onPress={() => setShowSpecialModal(false)} style={{ padding: 4 }}>
              <Icon name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Date Picker */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Date *</Text>
              <View style={{ borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                <Picker
                  selectedValue={spDate ? formatDateKey(spDate) : ''}
                  onValueChange={(value: string) => {
                    if (value) {
                      const [y, m, d] = value.split('-').map(Number);
                      const localDate = new Date(y, m - 1, d);
                      setSpDate(localDate);
                      calculateSpecialPermission(value);
                    } else {
                      setSpDate(null);
                    }
                  }}
                  style={{ height: 50, color: '#111827', backgroundColor: '#FFFFFF' }}
                  dropdownIconColor="#0A0F2C"
                >
                  <PickerItem label="-- Select Date --" value="" color="#4B5563" />
                  {weekDates.map((d, idx) => (
                    <PickerItem 
                      key={idx} 
                      label={d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} 
                      value={formatDateKey(d)} 
                      color="#111827"
                    />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Calculation Display */}
            {spDate && (
              <View style={{ backgroundColor: '#DBEAFE', padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#4B5563' }}>Shift:</Text>
                  <Text style={{ fontWeight: '600', color: '#111827' }}>{spCalculation.shift || "N/A"}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#4B5563' }}>On-Premises:</Text>
                  <Text style={{ fontWeight: '600', color: '#111827' }}>{formatHoursHHMM(spCalculation.onPremises)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ color: '#4B5563' }}>Required:</Text>
                  <Text style={{ fontWeight: '600', color: '#111827' }}>{formatHoursHHMM(spCalculation.required)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                  <Text style={{ color: '#2563EB', fontWeight: '600' }}>Balance:</Text>
                  <Text style={{ color: '#2563EB', fontWeight: 'bold' }}>{formatHoursHHMM(spCalculation.balance)}</Text>
                </View>
                {!spCalculation.allowed && (
                  <Text style={{ color: '#DC2626', fontWeight: '600', marginTop: 10, textAlign: 'center' }}>
                    {spCalculation.message}
                  </Text>
                )}
              </View>
            )}

            {/* Reason */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Reason *</Text>
              <TextInput
                value={spReason}
                onChangeText={setSpReason}
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  padding: 12,
                  minHeight: 100,
                  textAlignVertical: 'top',
                  color: '#111827',
                  backgroundColor: '#FFFFFF',
                }}
                placeholder="Enter reason for special permission"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
              />
            </View>

            {/* Attachment */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 }}>Attachment (Optional)</Text>
              <TouchableOpacity
                onPress={pickDocument}
                style={{
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  borderRadius: 8,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F9FAFB'
                }}
              >
                <Icon name="attach-file" size={20} color="#0A0F2C" />
                <Text style={{ marginLeft: 10, color: spFileName ? '#111827' : '#6B7280', flex: 1, fontSize: 13 }}>
                  {spFileName || 'Choose file'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => setShowSpecialModal(false)}
              style={{ paddingHorizontal: 16, paddingVertical: 10, marginRight: 8 }}
            >
              <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={async () => {
                if (!spDate || !spReason.trim()) {
                  showError("Please fill all required fields (Date, Reason).");
                  return;
                }
                
                const requestHours = spCalculation.balance;
                
                if (requestHours <= 0) {
                  showError("No shortage hours to request.");
                  return;
                }

                try {
                  const formData = new FormData();
                  const d = new Date(spDate);
                  const isoDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
                  formData.append('date', isoDate);
                  formData.append('shift', spCalculation.shift || "");
                  formData.append('fromTime', ""); 
                  formData.append('toTime', "");
                  formData.append('totalHours', requestHours.toString());
                  formData.append('reason', spReason.trim());
                  
                  if (spFile) {
                    formData.append('attachment', {
                      uri: spFile.uri,
                      type: spFile.type,
                      name: spFile.name,
                    } as any);
                  }

                  await specialPermissionAPI.create(formData);
                  
                  const weekStartStr = new Date(Date.UTC(weekDates[0].getFullYear(), weekDates[0].getMonth(), weekDates[0].getDate())).toISOString();
                  const weekEndStr = new Date(Date.UTC(weekDates[6].getFullYear(), weekDates[6].getMonth(), weekDates[6].getDate())).toISOString();
                  const spRes = await specialPermissionAPI.my({ weekStart: weekStartStr, weekEnd: weekEndStr, _t: Date.now() });
                  
                  setMySpecials(Array.isArray(spRes.data?.data) ? spRes.data.data : []);
                  setShowSpecialModal(false);
                  setSpDate(null);
                  setSpReason('');
                  setSpFile(null);
                  setSpFileName('');
                  showMessage("Special Permission submitted!", "success");
                } catch (err) {
                  console.error("Error submitting special permission:", err);
                  showError("Failed to submit Special Permission.");
                }
              }}
              disabled={!spCalculation.allowed}
              style={{
                backgroundColor: !spCalculation.allowed ? '#6B7280' : '#0A0F2C',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                Submit ({formatHoursHHMM(spCalculation.balance)})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F2C" />
      
      <CommonHeader title="Timesheet" showBack={true} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 10 }}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#0A0F2C']}
              tintColor="#0A0F2C"
            />
          }
        >
          {/* Message Banner */}
          {message !== '' && (
            <View style={{ 
              margin: 12, 
              padding: 12, 
              borderRadius: 8,
              backgroundColor: messageType === 'success' ? '#D1FAE5' : 
                             messageType === 'error' ? '#FEE2E2' : '#DBEAFE',
              borderWidth: 1,
              borderColor: messageType === 'success' ? '#10B981' :
                          messageType === 'error' ? '#EF4444' : '#3B82F6',
            }}>
              <Text style={{ 
                color: messageType === 'success' ? '#10B981' :
                       messageType === 'error' ? '#EF4444' : '#3B82F6',
                fontWeight: '500',
                fontSize: 13
              }}>
                {message}
              </Text>
            </View>
          )}

          {/* Week Navigation */}
          <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={previousWeek} style={{ padding: 8, backgroundColor: '#F3F4F6', borderRadius: 25 }}>
                  <Icon name="chevron-left" size={22} color="#0A0F2C" />
                </TouchableOpacity>
                
                <View style={{ alignItems: 'center', marginHorizontal: 12 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#0A0F2C' }}>
                    {currentWeek.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#4B5563' }}>
                    {formatWeekRange()}
                  </Text>
                </View>

                <TouchableOpacity 
                  onPress={nextWeek} 
                  disabled={!canNavigateNextWeek()}
                  style={{ padding: 8, backgroundColor: canNavigateNextWeek() ? '#F3F4F6' : '#F3F4F6', borderRadius: 25, opacity: canNavigateNextWeek() ? 1 : 0.5 }}
                >
                  <Icon name="chevron-right" size={22} color={canNavigateNextWeek() ? '#0A0F2C' : '#9CA3AF'} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                onPress={goToCurrentWeek}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#0A0F2C', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 25 }}
              >
                <Icon name="today" size={16} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600', marginLeft: 6 }}>CURRENT</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rejection Reason */}
          {rejectionReason ? (
            <View style={{ backgroundColor: '#FEE2E2', padding: 12, margin: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#DC2626' }}>
              <Text style={{ color: '#DC2626', fontWeight: '600', fontSize: 13 }}>❌ {rejectionReason}</Text>
            </View>
          ) : null}

          {/* Action Buttons - Improved Design */}
          {renderActionButtons()}

          {/* Timesheet Table */}
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <ActivityIndicator size="large" color="#0A0F2C" />
              <Text style={{ marginTop: 10, color: '#4B5563', fontSize: 13 }}>Loading timesheet data...</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={{ borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', marginHorizontal: 12, marginVertical: 8 }}>
                {/* Shift Row */}
                {renderShiftRow()}
                {/* Table Header */}
                {renderTableHeader()}
                {/* Data Rows */}
                {timesheetRows.map((row: TimesheetEntry, index: number) => renderTableRow(row, index))}
                {/* Footer */}
                {renderFooter()}
              </View>
            </ScrollView>
          )}

          {/* Special Permissions List */}
          {renderSpecialPermissionsList()}

          {/* Important Notes */}
          {renderImportantNotes()}

          {/* Submit Button */}
          <View style={{ padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
            <TouchableOpacity
              onPress={submitTimesheet}
              disabled={!allDaysSatisfied || loading || isSubmitted}
              style={{
                backgroundColor: (!allDaysSatisfied || loading || isSubmitted) ? '#6B7280' : '#10B981',
                paddingVertical: 16,
                borderRadius: 30,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                elevation: 3,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : isSubmitted ? (
                <>
                  <Icon name="check-circle" size={20} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>✓ SUBMITTED</Text>
                </>
              ) : (
                <>
                  <Icon name="send" size={20} color="#FFFFFF" />
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16, marginLeft: 8 }}>
                    SUBMIT WEEK ({getWeeklyTotalWithBreak()})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Timesheet • Work & Productivity • "
      />

      {/* Navigation Confirmation Dialog */}
      <Modal
        visible={showNavigationDialog}
        transparent
        animationType="fade"
        onRequestClose={cancelNavigation}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '80%' }}>
            <Icon name="warning" size={40} color="#F59E0B" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' }}>Unsaved Changes</Text>
            <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 20, textAlign: 'center' }}>You have unsaved changes. What would you like to do?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <TouchableOpacity
                onPress={cancelNavigation}
                style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ color: '#6B7280', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={discardAndNavigate}
                style={{ paddingHorizontal: 16, paddingVertical: 10 }}
              >
                <Text style={{ color: '#DC2626', fontWeight: '600' }}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmSaveAndNavigate}
                style={{ backgroundColor: '#0A0F2C', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25 }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Save Draft</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Special Permission Modal */}
      {renderSpecialPermissionModal()}

      {/* Error Dialog */}
      <Modal
        visible={showErrorDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorDialog(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '80%' }}>
            <Icon name={errorTitle.includes('Success') ? "check-circle" : "error"} size={48} color={errorTitle.includes('Success') ? '#10B981' : '#EF4444'} style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: errorTitle.includes('Success') ? '#10B981' : '#EF4444', marginBottom: 8, textAlign: 'center' }}>
              {errorTitle}
            </Text>
            <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 20, textAlign: 'center' }}>{errorMessage}</Text>
            <TouchableOpacity
              onPress={() => setShowErrorDialog(false)}
              style={{ backgroundColor: '#0A0F2C', paddingVertical: 14, borderRadius: 25, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 15 }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default TimesheetScreen;