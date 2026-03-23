// screens/AdminTimesheet/SpecialPermissionScreen.tsx
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
import { specialPermissionAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

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
  yellow: '#F59E0B',
  yellowLight: '#FEF3C7',
  dropdownBg: '#FFFFFF',
  dropdownText: '#111827',
  dropdownBorder: '#E5E7EB',
};

interface SpecialPermission {
  _id: string;
  employeeId: string;
  employeeName: string;
  location?: string;
  division?: string;
  date: string;
  shift?: string;
  fromTime?: string;
  toTime?: string;
  totalHours: number;
  onPremisesHours?: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  attachment?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

const SpecialPermissionScreen = () => {
  const [items, setItems] = useState<SpecialPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    Alert.alert(type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info', msg);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setDebugInfo('Fetching data...');
      
      // Build params - exactly like web version
      const params: any = {};
      if (statusFilter !== 'All') {
        params.status = statusFilter;
      }
      
      console.log('Fetching special permissions with params:', params);
      
      // Use getAll method only (list doesn't exist)
      const response = await specialPermissionAPI.getAll(params);
      
      console.log('API Response:', JSON.stringify(response.data, null, 2));
      
      // Extract data from response - handle multiple possible structures
      let data: SpecialPermission[] = [];
      
      if (response.data?.data && Array.isArray(response.data.data)) {
        data = response.data.data;
        setDebugInfo(`Found ${data.length} records in response.data.data`);
      } else if (Array.isArray(response.data)) {
        data = response.data;
        setDebugInfo(`Found ${data.length} records in response.data array`);
      } else if (response.data?.requests && Array.isArray(response.data.requests)) {
        data = response.data.requests;
        setDebugInfo(`Found ${data.length} records in response.data.requests`);
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        data = response.data.results;
        setDebugInfo(`Found ${data.length} records in response.data.results`);
      } else if (response.data?.items && Array.isArray(response.data.items)) {
        data = response.data.items;
        setDebugInfo(`Found ${data.length} records in response.data.items`);
      } else {
        setDebugInfo('No data found in response structure');
        console.log('Response structure:', Object.keys(response.data || {}));
      }
      
      setItems(data);
      
      if (data.length === 0) {
        console.log('No records found for status filter:', statusFilter);
      } else {
        console.log('Sample item:', data[0]);
      }
      
    } catch (error: any) {
      console.error('Failed to load special permissions:', error);
      setDebugInfo(`Error: ${error.message || 'Unknown error'}`);
      showMessage(error.response?.data?.message || error.message || 'Failed to load data', 'error');
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApprove = async (id: string) => {
    Alert.alert(
      'Approve Request',
      'Are you sure you want to approve this special permission request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setActionLoading(true);
            try {
              await specialPermissionAPI.approve(id);
              showMessage('Request approved successfully', 'success');
              loadData();
            } catch (error: any) {
              showMessage(error.response?.data?.message || 'Failed to approve request', 'error');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectId) return;

    setActionLoading(true);
    try {
      await specialPermissionAPI.reject(rejectId, rejectReason);
      showMessage('Request rejected successfully', 'success');
      setShowRejectModal(false);
      setRejectId(null);
      setRejectReason('');
      loadData();
    } catch (error: any) {
      showMessage(error.response?.data?.message || 'Failed to reject request', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectId(id);
    setRejectReason('');
    setShowRejectModal(true);
  };

  // Get unique locations and divisions from items
  const locations = useMemo(() => {
    const locs = new Set(items.map(i => i.location).filter((l): l is string => !!l && l !== '-'));
    return ['All', ...Array.from(locs)];
  }, [items]);

  const divisions = useMemo(() => {
    const divs = new Set(items.map(i => i.division).filter((d): d is string => !!d && d !== '-'));
    return ['All', ...Array.from(divs)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchLocation = locationFilter === 'All' || item.location === locationFilter;
      const matchDivision = divisionFilter === 'All' || item.division === divisionFilter;
      return matchLocation && matchDivision;
    });
  }, [items, locationFilter, divisionFilter]);

  const formatHours = (hours: number): string => {
    if (hours === undefined || hours === null) return '00:00';
    const absHours = Math.abs(hours);
    const hh = String(Math.floor(absHours)).padStart(2, '0');
    const mm = String(Math.round((absHours - Math.floor(absHours)) * 60)).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const formatDate = (dateStr: string): string => {
    try {
      if (!dateStr) return '-';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return { bg: COLORS.greenLight, text: COLORS.green, label: 'APPROVED' };
      case 'REJECTED': return { bg: COLORS.redLight, text: COLORS.red, label: 'REJECTED' };
      default: return { bg: COLORS.yellowLight, text: COLORS.yellow, label: 'PENDING' };
    }
  };

  const exportToCSV = async () => {
    if (filteredItems.length === 0) {
      showMessage('No data to export', 'error');
      return;
    }

    const headers = [
      'S.No', 'Employee ID', 'Employee Name', 'Location', 'Division',
      'Previous Day On-Premises', 'Date', 'Shift', 'Shortage Hours',
      'Reason', 'Status', 'Rejection Reason'
    ];

    const rows = filteredItems.map((item, idx) => [
      (idx + 1).toString(),
      item.employeeId,
      item.employeeName,
      item.location || '-',
      item.division || '-',
      formatHours(item.onPremisesHours || 0),
      formatDate(item.date),
      item.shift || '-',
      formatHours(item.totalHours),
      item.reason.replace(/,/g, ';'),
      item.status,
      item.rejectionReason?.replace(/,/g, ';') || '-'
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const fileName = `special_permissions_${new Date().toISOString().split('T')[0]}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csvContent, 'utf8');
      await Share.open({
        title: 'Export Special Permissions',
        message: 'Special Permissions Report',
        url: `file://${filePath}`,
        type: 'text/csv',
        failOnCancel: false,
      });
    } catch (error: any) {
      if (error.message?.includes('User did not share')) return;
      showMessage('Failed to export data', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Special Permission" showBack={true} />

      {/* Debug Info (remove in production) */}
      {__DEV__ && debugInfo !== '' && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>🔍 {debugInfo}</Text>
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
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value);
                  }}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                  mode="dropdown"
                >
                  <Picker.Item label="All Status" value="All" color={COLORS.dropdownText} />
                  <Picker.Item label="Pending" value="PENDING" color={COLORS.dropdownText} />
                  <Picker.Item label="Approved" value="APPROVED" color={COLORS.dropdownText} />
                  <Picker.Item label="Rejected" value="REJECTED" color={COLORS.dropdownText} />
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Location</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={locationFilter}
                  onValueChange={setLocationFilter}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                  mode="dropdown"
                >
                  <Picker.Item label="All Locations" value="All" color={COLORS.dropdownText} />
                  {locations.filter(l => l !== 'All').map(loc => (
                    <Picker.Item 
                      key={loc} 
                      label={loc} 
                      value={loc} 
                      color={COLORS.dropdownText} 
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.filterItem}>
              <Text style={styles.filterLabel}>Division</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={divisionFilter}
                  onValueChange={setDivisionFilter}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                  mode="dropdown"
                >
                  <Picker.Item label="All Divisions" value="All" color={COLORS.dropdownText} />
                  {divisions.filter(d => d !== 'All').map(div => (
                    <Picker.Item 
                      key={div} 
                      label={div} 
                      value={div} 
                      color={COLORS.dropdownText} 
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity
              onPress={exportToCSV}
              style={styles.exportButton}
            >
              <Icon name="file-download" size={18} color={COLORS.white} />
              <Text style={styles.exportButtonText}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            Showing {filteredItems.length} {filteredItems.length === 1 ? 'request' : 'requests'}
          </Text>
        </View>

        {/* Table */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading requests...</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <IconCommunity name="clock-outline" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>No special permission requests found</Text>
            <Text style={styles.emptySubText}>Try changing your filters or check back later</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { width: 180 }]}>Employee</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Location</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Division</Text>
                  <Text style={[styles.tableHeaderText, { width: 120 }]}>Prev Day On-Premises</Text>
                  <Text style={[styles.tableHeaderText, { width: 110 }]}>Date</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Shift</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Shortage Hours</Text>
                  <Text style={[styles.tableHeaderText, { width: 180 }]}>Reason</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Status</Text>
                  <Text style={[styles.tableHeaderText, { width: 150, textAlign: 'center' }]}>Actions</Text>
                </View>

                {/* Table Body */}
                {filteredItems.map((item, idx) => {
                  const statusColors = getStatusColor(item.status);
                  return (
                    <View key={item._id} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: COLORS.white }]}>
                      <View style={{ width: 180 }}>
                        <Text style={styles.cellText}>
                          {item.employeeName} ({item.employeeId})
                        </Text>
                      </View>
                      <Text style={[styles.cellText, { width: 100 }]}>{item.location || '-'}</Text>
                      <Text style={[styles.cellText, { width: 100 }]}>{item.division || '-'}</Text>
                      <Text style={[styles.cellText, { width: 120 }]}>{formatHours(item.onPremisesHours || 0)}</Text>
                      <Text style={[styles.cellText, { width: 110 }]}>{formatDate(item.date)}</Text>
                      <Text style={[styles.cellText, { width: 100 }]}>{item.shift || '-'}</Text>
                      <Text style={[styles.cellText, { width: 100, fontWeight: '600', color: COLORS.warning }]}>
                        {formatHours(item.totalHours)}
                      </Text>
                      <View style={{ width: 180 }}>
                        <Text style={styles.cellText} numberOfLines={2}>{item.reason}</Text>
                      </View>
                      <View style={{ width: 100 }}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                          <Text style={[styles.statusText, { color: statusColors.text }]}>
                            {statusColors.label}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Actions */}
                      <View style={{ width: 150, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                        {item.status === 'PENDING' ? (
                          <>
                            <TouchableOpacity
                              onPress={() => handleApprove(item._id)}
                              disabled={actionLoading}
                              style={[styles.approveButton, actionLoading && styles.disabledButton]}
                            >
                              <Icon name="check" size={16} color={COLORS.white} />
                              <Text style={styles.buttonText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => openRejectModal(item._id)}
                              disabled={actionLoading}
                              style={[styles.rejectButton, actionLoading && styles.disabledButton]}
                            >
                              <Icon name="close" size={16} color={COLORS.white} />
                              <Text style={styles.buttonText}>Reject</Text>
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={styles.disabledAction}>
                            <Text style={styles.disabledActionText}>—</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Rejection Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Request</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Rejection Reason (Optional)</Text>
                <TextInput
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  placeholder="Enter reason for rejection..."
                  placeholderTextColor={COLORS.gray}
                  multiline
                  numberOfLines={4}
                  style={styles.textArea}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                disabled={actionLoading}
                style={[styles.rejectConfirmButton, actionLoading && styles.disabledButton]}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.rejectConfirmButtonText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Special • Permission • Management • "
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
  debugContainer: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  debugText: {
    fontSize: 11,
    color: '#92400E',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  exportButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
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
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.lightGray,
    textAlign: 'center',
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.green,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  disabledAction: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disabledActionText: {
    color: COLORS.gray,
    fontSize: 12,
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
    maxHeight: '60%',
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
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
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
  rejectConfirmButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.red,
    borderRadius: 8,
  },
  rejectConfirmButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default SpecialPermissionScreen;