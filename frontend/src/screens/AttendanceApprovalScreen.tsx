// screens/AttendanceApprovalScreen.tsx
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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { attendanceApprovalAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';

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
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  blueLight: '#EBF5FF',
  greenLight: '#E8F5E9',
  redLight: '#FEE2E2',
  yellowLight: '#FEF3C7',
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

interface AttendanceRequest {
  _id: string;
  employeeName: string;
  employeeId: string;
  location?: string;
  inTime: string;
  outTime: string;
  workDurationSeconds?: number;
  status: string;
  updatedAt?: string;
  reviewedAt?: string;
  submittedAt?: string;
  createdAt?: string;
}

interface ConfirmAction {
  id: string;
  type: 'approve' | 'reject';
}

const AttendanceApprovalScreen = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<AttendanceRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [locationFilter, setLocationFilter] = useState('');
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await attendanceApprovalAPI.list(
        statusFilter ? { status: statusFilter } : undefined
      );
      const list = Array.isArray(res.data?.requests) ? res.data.requests : [];
      
      // Group by employee and date to get the latest request
      const grouped = (() => {
        const map = new Map();
        for (const r of list) {
          const dateKey = new Date(r.inTime).toISOString().split('T')[0];
          const key = `${r.employeeId}|${dateKey}`;
          const currentUpdated = new Date(r.updatedAt || r.reviewedAt || r.submittedAt || r.createdAt || 0).getTime();
          const existing = map.get(key);
          const existingUpdated = existing ? new Date(existing.updatedAt || existing.reviewedAt || existing.submittedAt || existing.createdAt || 0).getTime() : -1;
          if (!existing || currentUpdated >= existingUpdated) {
            map.set(key, r);
          }
        }
        return Array.from(map.values());
      })();
      
      setRequests(grouped);
    } catch (error: any) {
      setRequests([]);
      const msg = error.response?.data?.message || 'Failed to load requests';
      showMessage(msg, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const approve = async (id: string) => {
    setUpdatingIds((prev) => [...prev, id]);
    setRequests((prev) =>
      prev.map((r) => (r._id === id ? { ...r, status: 'Approved' } : r))
    );
    try {
      await attendanceApprovalAPI.approve(id);
      showMessage('Request approved', 'success');
      await load();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to approve request';
      showMessage(msg, 'error');
      await load();
    } finally {
      setUpdatingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const reject = async (id: string) => {
    setUpdatingIds((prev) => [...prev, id]);
    setRequests((prev) =>
      prev.map((r) => (r._id === id ? { ...r, status: 'Rejected' } : r))
    );
    try {
      await attendanceApprovalAPI.reject(id, '');
      showMessage('Request rejected', 'success');
      await load();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to reject request';
      showMessage(msg, 'error');
      await load();
    } finally {
      setUpdatingIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch {
      return iso;
    }
  };

  const formatHours = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.round((secs % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Pending':
        return { backgroundColor: COLORS.yellowLight, color: COLORS.warning };
      case 'Approved':
        return { backgroundColor: COLORS.greenLight, color: COLORS.green };
      case 'Rejected':
        return { backgroundColor: COLORS.redLight, color: COLORS.red };
      default:
        return { backgroundColor: COLORS.filterBg, color: COLORS.gray };
    }
  };

  const uniqueLocations = [...new Set(requests.map((r) => r.location).filter(Boolean))];
  
  const filteredRequests = requests.filter((r) => {
    if (!locationFilter) return true;
    return r.location === locationFilter;
  });

  const isFilterApplied = statusFilter !== '' || locationFilter !== '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Attendance Approval" 
        showBack={true}
      />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Message Banner */}
        {message !== '' && (
          <View style={{ 
            marginBottom: 16, 
            padding: 12, 
            borderRadius: 8,
            backgroundColor: messageType === 'success' ? COLORS.greenLight : 
                           messageType === 'error' ? COLORS.redLight : COLORS.blueLight,
            borderWidth: 1,
            borderColor: messageType === 'success' ? COLORS.green :
                        messageType === 'error' ? COLORS.red : COLORS.blue,
          }}>
            <Text style={{ 
              color: messageType === 'success' ? COLORS.green :
                     messageType === 'error' ? COLORS.red : COLORS.blue,
              fontWeight: '500'
            }}>
              {message}
            </Text>
          </View>
        )}

        {/* Filters Section */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Filters</Text>
            {isFilterApplied && (
              <TouchableOpacity 
                onPress={() => {
                  setStatusFilter('');
                  setLocationFilter('');
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Icon name="clear-all" size={18} color={COLORS.red} />
                <Text style={{ color: COLORS.red, fontSize: 13, marginLeft: 4 }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ width: '100%' }}>
            {/* Location Filter */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={locationFilter}
                  onValueChange={(value) => setLocationFilter(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Locations" value="" color={COLORS.gray} />
                  {uniqueLocations.map((loc) => (
                    <Picker.Item key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Status Filter */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Status</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={statusFilter}
                  onValueChange={(value) => setStatusFilter(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  {statusOptions.map(opt => (
                    <Picker.Item key={opt.value} label={opt.label} value={opt.value} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Refresh Button */}
            <TouchableOpacity
              onPress={load}
              disabled={loading}
              style={{
                backgroundColor: COLORS.filterBg,
                paddingVertical: 12,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Icon name="refresh" size={18} color={COLORS.primary} />
              <Text style={{ marginLeft: 8, color: COLORS.primary, fontSize: 14 }}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            Showing {filteredRequests.length} {filteredRequests.length === 1 ? 'record' : 'records'}
          </Text>
          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ marginLeft: 8, color: COLORS.primary, fontSize: 12 }}>Loading...</Text>
            </View>
          )}
        </View>

        {/* Attendance Requests Table */}
        {loading && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading attendance requests...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 8 }}>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee Name</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee ID</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Location</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>IN</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>OUT</Text>
                  <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Hours</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Status</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredRequests.length === 0 ? (
                  <View style={{ padding: 50, alignItems: 'center' }}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={{ marginTop: 12, color: COLORS.gray, fontSize: 16 }}>No attendance requests found</Text>
                    <Text style={{ marginTop: 4, color: COLORS.lightGray, fontSize: 13 }}>Try adjusting your filters</Text>
                  </View>
                ) : filteredRequests.map((r, index) => {
                  const isUpdating = updatingIds.includes(r._id);
                  const statusStyle = getStatusBadgeStyle(r.status);

                  return (
                    <View key={r._id} style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.filterBg }}>
                      <Text style={{ width: 120, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{r.employeeName}</Text>
                      <Text style={{ width: 100, fontSize: 13, color: COLORS.textSecondary }}>{r.employeeId}</Text>
                      <Text style={{ width: 100, fontSize: 13, color: COLORS.textSecondary }}>{r.location || '-'}</Text>
                      <Text style={{ width: 100, fontSize: 13, color: COLORS.textSecondary }}>{formatDateTime(r.inTime)}</Text>
                      <Text style={{ width: 100, fontSize: 13, color: COLORS.textSecondary }}>{formatDateTime(r.outTime)}</Text>
                      <Text style={{ width: 80, fontSize: 13, color: COLORS.textSecondary }}>{formatHours(Number(r.workDurationSeconds || 0))}</Text>
                      
                      {/* Status Badge */}
                      <View style={{ width: 100, alignItems: 'center' }}>
                        <View style={{ 
                          backgroundColor: statusStyle.backgroundColor,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 12,
                        }}>
                          <Text style={{ fontSize: 11, color: statusStyle.color, fontWeight: '500' }}>
                            {r.status}
                          </Text>
                        </View>
                      </View>

                      {/* Actions */}
                      <View style={{ width: 150, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                        {r.status === 'Pending' && !isUpdating ? (
                          <>
                            <TouchableOpacity
                              onPress={() => setConfirmAction({ id: r._id, type: 'approve' })}
                              style={{ padding: 6, backgroundColor: COLORS.greenLight, borderRadius: 20 }}
                            >
                              <Icon name="check" size={18} color={COLORS.green} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => setConfirmAction({ id: r._id, type: 'reject' })}
                              style={{ padding: 6, backgroundColor: COLORS.redLight, borderRadius: 20 }}
                            >
                              <Icon name="close" size={18} color={COLORS.red} />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <Text style={{ fontSize: 12, color: COLORS.gray }}>Completed</Text>
                        )}
                        {isUpdating && (
                          <ActivityIndicator size="small" color={COLORS.primary} />
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

      {/* Confirmation Modal */}
      <Modal
        visible={confirmAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmAction(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 400, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>
                {confirmAction?.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </Text>
              <TouchableOpacity onPress={() => setConfirmAction(null)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 }}>
              {confirmAction?.type === 'approve' 
                ? 'Are you sure you want to approve this request?' 
                : 'Are you sure you want to reject this request?'}
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setConfirmAction(null)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 6,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: COLORS.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const id = confirmAction?.id;
                  const type = confirmAction?.type;
                  setConfirmAction(null);
                  if (id && type) {
                    if (type === 'approve') {
                      await approve(id);
                    } else {
                      await reject(id);
                    }
                  }
                }}
                style={{
                  backgroundColor: confirmAction?.type === 'approve' ? COLORS.green : COLORS.red,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Attendance Approval • Work & Productivity • "
      />
    </SafeAreaView>
  );
};

export default AttendanceApprovalScreen;