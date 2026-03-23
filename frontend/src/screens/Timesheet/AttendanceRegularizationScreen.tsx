// screens/Timesheet/AttendanceRegularizationScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { timesheetAPI, attendanceAPI, attendanceApprovalAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommonFooter from '../../components/CommonFooter';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  holidayBg: '#E8F5E9',
  gridBorder: '#D1D5DB',
  headerBg: '#0A0F2C',
  alternateRow: '#F9FAFB'
};

interface AttendanceRecord {
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  hours: number;
}

interface RequestRecord {
  status: string;
  inTime: string;
  outTime: string;
  updatedAt?: string;
  reviewedAt?: string;
  submittedAt?: string;
  createdAt?: string;
  [key: string]: any;
}

interface User {
  employeeId?: string;
  employeeCode?: string;
  empId?: string;
  id?: string;
  _id?: string;
  email?: string;
  name?: string;
  [key: string]: any;
}

const AttendanceRegularizationScreen = () => {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [inDate, setInDate] = useState('');
  const [inTime, setInTime] = useState('');
  const [outDate, setOutDate] = useState('');
  const [outTime, setOutTime] = useState('');
  const [modalError, setModalError] = useState('');
  const [myRequestsByDate, setMyRequestsByDate] = useState<Record<string, RequestRecord>>({});
  const [user, setUser] = useState<User>({});
  const [showInDatePicker, setShowInDatePicker] = useState(false);
  const [showOutDatePicker, setShowOutDatePicker] = useState(false);
  const [showInTimePicker, setShowInTimePicker] = useState(false);
  const [showOutTimePicker, setShowOutTimePicker] = useState(false);
  const [notification, setNotification] = useState({
    message: '',
    type: 'info' as 'info' | 'success' | 'error',
    isVisible: false,
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const monthRange = useMemo(() => {
    const start = new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1));
    const end = new Date(Date.UTC(month.getFullYear(), month.getMonth() + 1, 0));
    return {
      startISO: start.toISOString(),
      endISO: end.toISOString(),
    };
  }, [month]);

  const formatDate = (isoDate: string): string => {
    try {
      const d = new Date(isoDate);
      const dd = String(d.getUTCDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mmm = months[d.getUTCMonth()];
      const yyyy = d.getUTCFullYear();
      return `${dd}-${mmm}-${yyyy}`;
    } catch {
      return isoDate;
    }
  };

  const formatTime = (isoDate: string | null): string => {
    if (!isoDate) return '-';
    try {
      const d = new Date(isoDate);
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '-';
    }
  };

  const formatHours = (h: number): string => {
    const hours = Math.floor(h);
    const minutes = Math.round((h - hours) * 60);
    const mm = String(minutes).padStart(2, '0');
    return `${hours}:${mm} hrs`;
  };

  const prevMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() - 1);
    setMonth(d);
  };

  const nextMonth = () => {
    const d = new Date(month);
    d.setMonth(d.getMonth() + 1);
    
    // Prevent navigating to future months
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    if (d > currentMonth) {
      return;
    }
    
    setMonth(d);
  };

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await timesheetAPI.getAttendanceData({
        startDate: monthRange.startISO,
        endDate: monthRange.endISO,
        _t: Date.now(),
      });
      const recs = Array.isArray(res.data?.records) ? res.data.records : [];
      
      // Generate all days for the month
      const start = new Date(Date.UTC(month.getFullYear(), month.getMonth(), 1));
      const end = new Date(Date.UTC(month.getFullYear(), month.getMonth() + 1, 0));
      
      // If viewing current month, stop at today
      const now = new Date();
      const isCurrentMonth = now.getFullYear() === month.getFullYear() && now.getMonth() === month.getMonth();
      let finalEnd = end;
      
      if (isCurrentMonth) {
        const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        if (todayUTC < end) {
          finalEnd = todayUTC;
        }
      }

      const allDays: string[] = [];
      const current = new Date(start);
      while (current <= finalEnd) {
        allDays.push(current.toISOString().split('T')[0]);
        current.setUTCDate(current.getUTCDate() + 1);
      }

      // Merge records with all days
      const fullRecords = allDays.map(dateKey => {
        const found = recs.find((r: any) => r.date === dateKey);
        return found || {
          date: dateKey,
          punchIn: null,
          punchOut: null,
          hours: 0
        };
      });

      setRecords(fullRecords);
      setWeeklyHours(Number(res.data?.weeklyHours || 0));
    } catch (error) {
      console.error('Error loading attendance:', error);
      setRecords([]);
      setWeeklyHours(0);
    } finally {
      setLoading(false);
    }
  }, [monthRange.startISO, monthRange.endISO, month]);

  const loadMyRequests = useCallback(async () => {
    try {
      const employeeId = user.employeeId || user.employeeCode || user.empId || user.id || '';

      const res = await attendanceApprovalAPI.list();
      const list = Array.isArray(res.data?.requests) ? res.data.requests : [];
      
      const mine = list.filter((r: any) => {
        const matchesEmpId = String(r.employeeId) === String(employeeId);
        const matchesSubmitted = user.id && String(r.submittedBy) === String(user.id);
        return matchesEmpId || matchesSubmitted;
      });
      
      const byDate: Record<string, RequestRecord> = {};
      for (const r of mine) {
        const d = new Date(r.inTime);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        const existing = byDate[dateKey];
        const existingUpdated = existing ? new Date(existing.updatedAt || existing.reviewedAt || existing.submittedAt || existing.createdAt || 0).getTime() : -1;
        const currentUpdated = new Date(r.updatedAt || r.reviewedAt || r.submittedAt || r.createdAt || 0).getTime();
        
        if (!existing || currentUpdated >= existingUpdated) {
          byDate[dateKey] = r;
        }
      }
      setMyRequestsByDate(byDate);
    } catch (err) {
      console.error('Error loading my requests:', err);
      setMyRequestsByDate({});
    }
  }, [user]);

  useEffect(() => {
    loadAttendance();
    loadMyRequests();
  }, [monthRange.startISO, monthRange.endISO, loadAttendance, loadMyRequests]);

  const openEdit = (rec: AttendanceRecord) => {
    setEditingRecord(rec);
    const baseDateKey = new Date(rec.punchIn || rec.date).toISOString().split('T')[0];
    setInDate(baseDateKey);
    setOutDate(baseDateKey);
    setInTime(rec.punchIn ? new Date(rec.punchIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    setOutTime(rec.punchOut ? new Date(rec.punchOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '');
    setModalError('');
    setShowEditModal(true);
  };

  const closeEdit = () => {
    setShowEditModal(false);
    setEditingRecord(null);
    setInDate('');
    setInTime('');
    setOutDate('');
    setOutTime('');
    setModalError('');
  };

  const combineDateAndTime = (dateISO: string, timeStr: string): string | null => {
    if (!timeStr) return null;
    const dateKey = new Date(dateISO).toISOString().split('T')[0];
    const dt = new Date(`${dateKey}T${timeStr}`);
    return dt.toISOString();
  };

  const computePreview = (): string | null => {
    try {
      if (!inDate || !inTime || !outDate || !outTime) return null;
      const inDt = new Date(`${inDate}T${inTime}`);
      const outDt = new Date(`${outDate}T${outTime}`);
      if (outDt <= inDt) return null;
      const diffMs = outDt.getTime() - inDt.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      const h = Math.floor(hours);
      const m = Math.round((hours - h) * 60);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} hours`;
    } catch {
      return null;
    }
  };

  const showNotification = (message: string, type: 'info' | 'success' | 'error') => {
    setNotification({ message, type, isVisible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  const saveEdit = async () => {
    if (!editingRecord) return;
    
    const employeeId = user.employeeId || user.employeeCode || user.empId || user.id || '';

    if (!employeeId) {
      closeEdit();
      return;
    }

    if (!inDate || !inTime || !outDate || !outTime) {
      return;
    }

    const inISO = combineDateAndTime(inDate, inTime);
    const outISO = combineDateAndTime(outDate, outTime);

    if (!inISO || !outISO) {
      setModalError('Invalid date/time');
      return;
    }

    const inDt = new Date(inISO);
    const outDt = new Date(outISO);
    if (outDt <= inDt) {
      setModalError('In Time must be less than Out Time');
      return;
    }

    // Check if there are any changes
    const originalInDate = new Date(editingRecord.punchIn || editingRecord.date).toISOString().split('T')[0];
    const originalOutDate = new Date(editingRecord.punchOut || editingRecord.date).toISOString().split('T')[0];
    const originalInTime = editingRecord.punchIn ? new Date(editingRecord.punchIn).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
    const originalOutTime = editingRecord.punchOut ? new Date(editingRecord.punchOut).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

    const originalInISO = combineDateAndTime(originalInDate, originalInTime);
    const originalOutISO = combineDateAndTime(originalOutDate, originalOutTime);

    // Normalize milliseconds to 0 for comparison
    const normalizeDate = (iso: string | null) => {
      if (!iso) return null;
      const d = new Date(iso);
      d.setMilliseconds(0);
      d.setSeconds(0);
      return d.getTime();
    };

    const isChanged = normalizeDate(inISO) !== normalizeDate(originalInISO) || 
                      normalizeDate(outISO) !== normalizeDate(originalOutISO);

    if (!isChanged) {
      setModalError('No changes detected');
      return;
    }

    const durationSeconds = Math.round((outDt.getTime() - inDt.getTime()) / 1000);

    try {
      setLoading(true);
      setModalError('');
      await attendanceApprovalAPI.request({
        employeeId,
        email: user.email,
        inTime: inISO,
        outTime: outISO,
        workDurationSeconds: durationSeconds,
      });
      showNotification('Request sent successfully', 'success');
      closeEdit();
      await loadMyRequests();
    } catch (error: any) {
      console.error('Save error:', error);
      const msg = error.response?.data?.message || 'Failed to save request';
      setModalError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onInDateChange = (event: any, selectedDate?: Date) => {
    setShowInDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setInDate(`${year}-${month}-${day}`);
    }
  };

  const onOutDateChange = (event: any, selectedDate?: Date) => {
    setShowOutDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setOutDate(`${year}-${month}-${day}`);
    }
  };

  const onInTimeChange = (event: any, selectedDate?: Date) => {
    setShowInTimePicker(false);
    if (selectedDate) {
      const hours = String(selectedDate.getHours()).padStart(2, '0');
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      setInTime(`${hours}:${minutes}`);
    }
  };

  const onOutTimeChange = (event: any, selectedDate?: Date) => {
    setShowOutTimePicker(false);
    if (selectedDate) {
      const hours = String(selectedDate.getHours()).padStart(2, '0');
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      setOutTime(`${hours}:${minutes}`);
    }
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

  // Fixed Table Header with consistent column widths
  const renderTableHeader = () => (
    <View style={{ 
      flexDirection: 'row', 
      backgroundColor: COLORS.headerBg,
      borderTopWidth: 1,
      borderTopColor: COLORS.gridBorder,
      borderBottomWidth: 2,
      borderBottomColor: COLORS.gridBorder,
    }}>
      <View style={{ width: 100, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>DATE</Text>
      </View>
      <View style={{ width: 90, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>IN TIME</Text>
      </View>
      <View style={{ width: 90, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>OUT TIME</Text>
      </View>
      <View style={{ width: 100, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>TOTAL HOURS</Text>
      </View>
      <View style={{ width: 90, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>STATUS</Text>
      </View>
      <View style={{ width: 80, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center' }}>
        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>ACTION</Text>
      </View>
    </View>
  );

  // Fixed Table Row with consistent column widths
  const renderTableRow = (rec: AttendanceRecord, index: number) => {
    const request = myRequestsByDate[rec.date];
    const statusColors = request ? getStatusBadge(request.status) : null;
    
    return (
      <View key={`${rec.date}|${index}`} style={{ 
        flexDirection: 'row', 
        backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.alternateRow,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.gridBorder,
        minHeight: 50,
      }}>
        <View style={{ width: 100, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, justifyContent: 'center' }}>
          <Text style={{ color: COLORS.textPrimary, fontSize: 12 }}>{formatDate(rec.date)}</Text>
        </View>
        <View style={{ width: 90, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, justifyContent: 'center' }}>
          <Text style={{ color: rec.punchIn ? COLORS.textPrimary : COLORS.gray, fontSize: 12 }}>{formatTime(rec.punchIn)}</Text>
        </View>
        <View style={{ width: 90, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, justifyContent: 'center' }}>
          <Text style={{ color: rec.punchOut ? COLORS.textPrimary : COLORS.gray, fontSize: 12 }}>{formatTime(rec.punchOut)}</Text>
        </View>
        <View style={{ width: 100, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, justifyContent: 'center' }}>
          <Text style={{ color: COLORS.blue, fontWeight: '600', fontSize: 12 }}>{formatHours(rec.hours || 0)}</Text>
        </View>
        <View style={{ width: 90, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, justifyContent: 'center' }}>
          {request ? (
            <View style={[{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 20,
              alignSelf: 'flex-start',
            }, { backgroundColor: statusColors?.bg }]}>
              <Text style={{ fontSize: 11, color: statusColors?.text, fontWeight: '600' }}>
                {request.status}
              </Text>
            </View>
          ) : (
            <Text style={{ color: COLORS.gray, fontSize: 12 }}>-</Text>
          )}
        </View>
        <View style={{ width: 80, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => openEdit(rec)}
            style={{
              backgroundColor: COLORS.blue,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 4,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Icon name="edit" size={14} color={COLORS.white} />
            <Text style={{ color: COLORS.white, fontSize: 11, marginLeft: 4 }}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Attendance Regularization" showBack={true} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 10 }}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          {/* Month Navigation */}
          <View style={{ backgroundColor: COLORS.white, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={prevMonth} style={{ padding: 6, backgroundColor: '#F0F0F0', borderRadius: 20 }}>
                  <Icon name="chevron-left" size={20} color={COLORS.primary} />
                </TouchableOpacity>
                
                <View style={{ alignItems: 'center', marginHorizontal: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.primary }}>
                    {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </Text>
                </View>

                <TouchableOpacity 
                  onPress={nextMonth} 
                  style={{ padding: 6, backgroundColor: '#F0F0F0', borderRadius: 20 }}
                >
                  <Icon name="chevron-right" size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Table with fixed column widths */}
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 10, color: COLORS.textSecondary, fontSize: 13 }}>Loading attendance data...</Text>
            </View>
          ) : (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              <View style={{ borderWidth: 1, borderColor: COLORS.gridBorder, backgroundColor: COLORS.white }}>
                {/* Table Header */}
                {renderTableHeader()}
                
                {/* Table Rows */}
                <View style={{ maxHeight: 450 }}>
                  {records.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: COLORS.gray, fontSize: 14 }}>No attendance records</Text>
                    </View>
                  ) : (
                    records.map((rec, idx) => renderTableRow(rec, idx))
                  )}
                </View>

                {/* Table Footer - Summary */}
                <View style={{ 
                  flexDirection: 'row', 
                  backgroundColor: '#E3F2FD',
                  borderTopWidth: 2,
                  borderTopColor: COLORS.gridBorder,
                }}>
                  <View style={{ width: 100, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
                    <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 12 }}>TOTAL</Text>
                  </View>
                  <View style={{ width: 90, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }} />
                  <View style={{ width: 90, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }} />
                  <View style={{ width: 100, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
                    <Text style={{ color: COLORS.blue, fontWeight: '700', fontSize: 12 }}>
                      {formatHours(weeklyHours || 0)}
                    </Text>
                  </View>
                  <View style={{ width: 90, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }} />
                  <View style={{ width: 80, paddingVertical: 12, paddingHorizontal: 8 }} />
                </View>
              </View>
            </ScrollView>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Empowering Excellence • Building Future • Innovating Together • "
      />

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={closeEdit}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            backgroundColor: COLORS.white, 
            borderRadius: 12, 
            width: '90%',
            maxWidth: 400,
            maxHeight: '80%',
          }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
            }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.textPrimary }}>Edit Day</Text>
              <TouchableOpacity onPress={closeEdit}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* IN Date */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 }}>IN Date</Text>
                <TouchableOpacity
                  onPress={() => setShowInDatePicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: inDate ? COLORS.primary : COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: inDate ? COLORS.primary + '10' : COLORS.white,
                  }}
                >
                  <Text style={{ color: inDate ? COLORS.primary : COLORS.gray }}>
                    {inDate || 'Select Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* IN Time */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 }}>IN Time</Text>
                <TouchableOpacity
                  onPress={() => setShowInTimePicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: inTime ? COLORS.primary : COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: inTime ? COLORS.primary + '10' : COLORS.white,
                  }}
                >
                  <Text style={{ color: inTime ? COLORS.primary : COLORS.gray }}>
                    {inTime || 'Select Time'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* OUT Date */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 }}>OUT Date</Text>
                <TouchableOpacity
                  onPress={() => setShowOutDatePicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: outDate ? COLORS.primary : COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: outDate ? COLORS.primary + '10' : COLORS.white,
                  }}
                >
                  <Text style={{ color: outDate ? COLORS.primary : COLORS.gray }}>
                    {outDate || 'Select Date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* OUT Time */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 }}>OUT Time</Text>
                <TouchableOpacity
                  onPress={() => setShowOutTimePicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: outTime ? COLORS.primary : COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: outTime ? COLORS.primary + '10' : COLORS.white,
                  }}
                >
                  <Text style={{ color: outTime ? COLORS.primary : COLORS.gray }}>
                    {outTime || 'Select Time'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Calculated Total */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 }}>Calculated Total</Text>
                <View style={{ padding: 12, backgroundColor: COLORS.filterBg, borderRadius: 8 }}>
                  <Text style={{ fontSize: 14, color: COLORS.blue, fontWeight: '600' }}>
                    {computePreview() || '-'}
                  </Text>
                </View>
              </View>

              {/* Error Message */}
              {modalError ? (
                <View style={{ marginBottom: 16, padding: 10, backgroundColor: '#FFEBEE', borderRadius: 6 }}>
                  <Text style={{ color: COLORS.error, fontSize: 13 }}>{modalError}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'flex-end',
              padding: 16,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}>
              <TouchableOpacity
                onPress={closeEdit}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: COLORS.gray,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveEdit}
                disabled={!inDate || !inTime || !outDate || !outTime || loading}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: (!inDate || !inTime || !outDate || !outTime || loading) ? COLORS.gray : COLORS.primary,
                  borderRadius: 6,
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date/Time Pickers */}
      {showInDatePicker && (
        <DateTimePicker
          value={inDate ? new Date(inDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onInDateChange}
          maximumDate={new Date()}
        />
      )}

      {showOutDatePicker && (
        <DateTimePicker
          value={outDate ? new Date(outDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onOutDateChange}
          maximumDate={new Date()}
        />
      )}

      {showInTimePicker && (
        <DateTimePicker
          value={inTime ? new Date(`2000-01-01T${inTime}`) : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onInTimeChange}
          is24Hour={false}
        />
      )}

      {showOutTimePicker && (
        <DateTimePicker
          value={outTime ? new Date(`2000-01-01T${outTime}`) : new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onOutTimeChange}
          is24Hour={false}
        />
      )}

      {/* Notification */}
      <Modal
        visible={notification.isVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ 
            backgroundColor: COLORS.white, 
            borderRadius: 8, 
            padding: 16, 
            minWidth: 200,
            alignItems: 'center',
          }}>
            <Icon 
              name={notification.type === 'success' ? 'check-circle' : notification.type === 'error' ? 'error' : 'info'} 
              size={32} 
              color={notification.type === 'success' ? COLORS.green : notification.type === 'error' ? COLORS.red : COLORS.blue} 
            />
            <Text style={{ marginTop: 8, fontSize: 14, color: COLORS.textPrimary, textAlign: 'center' }}>
              {notification.message}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default AttendanceRegularizationScreen;