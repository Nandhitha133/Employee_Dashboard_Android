// screens/AdminTimesheet/EditInOutTimeScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { attendanceAPI, employeeAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';

const { width, height } = Dimensions.get('window');

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
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  filterBg: '#F8FAFC',
  red: '#EF4444',
  redLight: '#FEE2E2',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  blue: '#3B82F6',
  blueLight: '#EBF5FF',
  green: '#10B981',
  greenLight: '#E8F5E9',
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  rose: '#F43F5E',
  roseLight: '#FFE4E6',
  shadow: '#000000',
  dropdownBg: '#FFFFFF',
  dropdownText: '#111827',
  dropdownBorder: '#E5E7EB',
};

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employeeName?: string;
  name?: string;
  punchTime: string;
  direction: 'in' | 'out';
  source?: string;
  date?: string;
}

interface Employee {
  id?: string;
  _id?: string;
  employeeId?: string;
  name: string;
  department?: string;
  designation?: string;
}

interface FormData {
  punchTime: string;
  direction: 'in' | 'out';
}

const EditInOutTimeScreen = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  // Filters
  const [filters, setFilters] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    search: '',
  });

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [formData, setFormData] = useState<FormData>({
    punchTime: '',
    direction: 'in',
  });

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const showSuccess = (msg: string) => showMessage(msg, 'success');
  const showError = (msg: string) => showMessage(msg, 'error');

  useEffect(() => {
    loadEmployees();
    loadAttendance();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      const empList = Array.isArray(res.data) ? res.data : [];
      setEmployees(empList);
    } catch (error) {
      console.error("Failed to load employees", error);
    }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const params: any = {
        startDate: filters.date,
        endDate: filters.date,
      };
      if (filters.employeeId) {
        params.employeeId = filters.employeeId;
      }
      const res = await attendanceAPI.getAll(params);
      const attendanceData = Array.isArray(res.data?.attendance) ? res.data.attendance : [];
      setRecords(attendanceData);
      if (attendanceData.length === 0) {
        // Don't show error, just empty state
      }
    } catch (error) {
      console.error("Failed to load attendance records", error);
      showError("Failed to load attendance records");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAttendance();
  };

  const handleFetchRecords = () => {
    loadAttendance();
  };

  const filteredRecords = useMemo(() => {
    if (!filters.search) return records;
    const searchStr = filters.search.toLowerCase();
    return records.filter(rec => {
      const empId = String(rec.employeeId || '').toLowerCase();
      const empName = String(rec.employeeName || rec.name || '').toLowerCase();
      return empId.includes(searchStr) || empName.includes(searchStr);
    });
  }, [records, filters.search]);

  const handleEditClick = (record: AttendanceRecord) => {
    // Format date for datetime-local input
    const date = new Date(record.punchTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    setEditingRecord(record);
    setFormData({
      punchTime: formattedDateTime,
      direction: record.direction,
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (id: string, employeeName: string) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to delete this attendance record for ${employeeName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await attendanceAPI.remove(id);
              showSuccess("Record deleted successfully");
              loadAttendance();
            } catch (error) {
              showError("Failed to delete record");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;

    setActionLoading(true);
    try {
      await attendanceAPI.update(editingRecord._id, {
        punchTime: formData.punchTime,
        direction: formData.direction,
      });
      showSuccess("Record updated successfully");
      setShowEditModal(false);
      loadAttendance();
    } catch (error) {
      showError("Failed to update record");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateTime = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
    } catch {
      return dateStr;
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setFilters(prev => ({ ...prev, date: `${year}-${month}-${day}` }));
    }
  };

  const onPunchTimeChange = (event: any, selectedDate?: Date) => {
    setShowDateTimePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const hours = String(selectedDate.getHours()).padStart(2, '0');
      const minutes = String(selectedDate.getMinutes()).padStart(2, '0');
      const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      setFormData(prev => ({ ...prev, punchTime: formattedDateTime }));
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'in' 
      ? { bg: COLORS.emeraldLight, text: COLORS.emerald }
      : { bg: COLORS.roseLight, text: COLORS.rose };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Edit In/Out Time" showBack={true} />

      {/* Message Banner */}
      {message !== '' && (
        <View style={[
          styles.messageBanner,
          messageType === 'success' && styles.successBanner,
          messageType === 'error' && styles.errorBanner,
        ]}>
          <Text style={[
            styles.messageText,
            messageType === 'success' && styles.successText,
            messageType === 'error' && styles.errorText,
          ]}>
            {message}
          </Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Filters Section */}
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Employee</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={filters.employeeId}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, employeeId: value }))}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                  dropdownIconRippleColor={COLORS.primary}
                  mode="dropdown"
                >
                  <Picker.Item 
                    label="All Employees" 
                    value="" 
                    color={COLORS.dropdownText}
                    style={styles.pickerItem}
                  />
                  {employees.map(emp => (
                    <Picker.Item 
                      key={emp._id || emp.employeeId} 
                      label={`${emp.employeeId} - ${emp.name}`} 
                      value={emp.employeeId}
                      color={COLORS.dropdownText}
                      style={styles.pickerItem}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Select Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar-today" size={20} color={COLORS.gray} />
                <Text style={styles.dateText}>{filters.date}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Search Records</Text>
              <View style={styles.searchContainer}>
                <Icon name="search" size={18} color={COLORS.gray} style={styles.searchIcon} />
                <TextInput
                  value={filters.search}
                  onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
                  placeholder="Filter by Name or ID..."
                  placeholderTextColor={COLORS.gray}
                  style={styles.searchInput}
                />
                {filters.search !== '' && (
                  <TouchableOpacity onPress={() => setFilters(prev => ({ ...prev, search: '' }))}>
                    <Icon name="close" size={16} color={COLORS.gray} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleFetchRecords}
              disabled={loading}
              style={[styles.fetchButton, loading && styles.disabledButton]}
            >
              <Icon name="filter-list" size={18} color={COLORS.white} />
              <Text style={styles.fetchButtonText}>
                {loading ? 'Fetching...' : 'Fetch Records'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            Showing {filteredRecords.length} {filteredRecords.length === 1 ? 'record' : 'records'}
          </Text>
        </View>

        {/* Attendance Table */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading attendance records...</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Employee ID</Text>
                  <Text style={[styles.tableHeaderText, { width: 150 }]}>Employee Name</Text>
                  <Text style={[styles.tableHeaderText, { width: 180 }]}>Punch Time</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Direction</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Source</Text>
                  <Text style={[styles.tableHeaderText, { width: 120, textAlign: 'center' }]}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredRecords.length === 0 ? (
                  <View style={styles.noRecordsContainer}>
                    <IconCommunity name="clock-outline" size={48} color={COLORS.gray} />
                    <Text style={styles.noRecordsText}>
                      {records.length > 0 ? 'No results match your search.' : 'No attendance records found.'}
                    </Text>
                    <Text style={styles.noRecordsSubText}>
                      Select filters and click "Fetch Records" to load data.
                    </Text>
                  </View>
                ) : (
                  filteredRecords.map((record, idx) => {
                    const directionColors = getDirectionColor(record.direction);
                    return (
                      <View key={record._id} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: COLORS.white }]}>
                        <Text style={[styles.cellText, { width: 100, fontWeight: '600', color: COLORS.primary }]}>
                          {record.employeeId}
                        </Text>
                        <Text style={[styles.cellText, { width: 150, fontWeight: '500' }]}>
                          {record.employeeName || record.name}
                        </Text>
                        <Text style={[styles.cellText, { width: 180 }]}>
                          {formatDateTime(record.punchTime)}
                        </Text>
                        <View style={{ width: 100 }}>
                          <View style={[styles.directionBadge, { backgroundColor: directionColors.bg }]}>
                            <Text style={[styles.directionText, { color: directionColors.text }]}>
                              {record.direction.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                        <View style={{ width: 100 }}>
                          <View style={styles.sourceBadge}>
                            <Text style={styles.sourceText}>
                              {record.source || 'local'}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Actions */}
                        <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                          <TouchableOpacity
                            onPress={() => handleEditClick(record)}
                            style={[styles.actionIcon, { backgroundColor: COLORS.blueLight }]}
                          >
                            <Icon name="edit" size={18} color={COLORS.blue} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDeleteClick(record._id, record.employeeName || record.name || '')}
                            style={[styles.actionIcon, { backgroundColor: COLORS.redLight }]}
                          >
                            <Icon name="delete" size={18} color={COLORS.red} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(filters.date)}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Punch Record</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Employee Info */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Employee Info</Text>
                <View style={styles.employeeInfoBox}>
                  <Text style={styles.employeeInfoText}>
                    {editingRecord?.employeeId} - {editingRecord?.employeeName || editingRecord?.name}
                  </Text>
                </View>
              </View>

              {/* Punch Date & Time */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Punch Date & Time</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDateTimePicker(true)}
                >
                  <Icon name="calendar-today" size={20} color={COLORS.gray} />
                  <Text style={styles.dateText}>
                    {formData.punchTime ? formData.punchTime.replace('T', ' ') : 'Select date and time'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Direction */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Direction</Text>
                <View style={styles.directionOptions}>
                  <TouchableOpacity
                    onPress={() => setFormData(prev => ({ ...prev, direction: 'in' }))}
                    style={[
                      styles.directionOption,
                      formData.direction === 'in' && styles.directionOptionActive,
                    ]}
                  >
                    <Text style={[
                      styles.directionOptionText,
                      formData.direction === 'in' && styles.directionOptionTextActive,
                    ]}>
                      IN
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setFormData(prev => ({ ...prev, direction: 'out' }))}
                    style={[
                      styles.directionOption,
                      formData.direction === 'out' && styles.directionOptionActive,
                    ]}
                  >
                    <Text style={[
                      styles.directionOptionText,
                      formData.direction === 'out' && styles.directionOptionTextActive,
                    ]}>
                      OUT
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUpdate}
                disabled={actionLoading}
                style={[styles.saveButton, actionLoading && styles.disabledButton]}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Icon name="save" size={16} color={COLORS.white} />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Separate DateTime Picker for Edit Modal */}
      {showDateTimePicker && editingRecord && (
        <DateTimePicker
          value={formData.punchTime ? new Date(formData.punchTime) : new Date()}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onPunchTimeChange}
          maximumDate={new Date()}
        />
      )}

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Attendance • Modification • Management • "
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  messageBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  successBanner: {
    backgroundColor: COLORS.greenLight,
    borderColor: COLORS.green,
  },
  errorBanner: {
    backgroundColor: COLORS.redLight,
    borderColor: COLORS.red,
  },
  messageText: {
    fontSize: 13,
    textAlign: 'center',
  },
  successText: {
    color: COLORS.green,
  },
  errorText: {
    color: COLORS.red,
  },
  filterContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    padding: 16,
  },
  filterRow: {
    gap: 12,
  },
  filterItem: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: COLORS.dropdownBorder,
    borderRadius: 8,
    backgroundColor: COLORS.dropdownBg,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    color: COLORS.dropdownText,
    backgroundColor: COLORS.dropdownBg,
  },
  pickerItem: {
    fontSize: 14,
    color: COLORS.dropdownText,
    backgroundColor: COLORS.dropdownBg,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
    gap: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  fetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  fetchButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    opacity: 0.6,
  },
  resultsContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
  tableContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  noRecordsContainer: {
    padding: 50,
    alignItems: 'center',
  },
  noRecordsText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 16,
  },
  noRecordsSubText: {
    marginTop: 4,
    color: COLORS.lightGray,
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  cellText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  directionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  directionText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sourceBadge: {
    backgroundColor: COLORS.filterBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: 'flex-start',
  },
  sourceText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  actionIcon: {
    padding: 8,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 8,
  },
  employeeInfoBox: {
    backgroundColor: COLORS.blueLight,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.blue,
  },
  employeeInfoText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.blue,
  },
  directionOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  directionOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  directionOptionActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  directionOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
  },
  directionOptionTextActive: {
    color: COLORS.white,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.gray,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default EditInOutTimeScreen;