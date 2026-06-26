import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { conferenceBookingAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#f8fafc',
  secondary: '#4F1A6F',
  white: '#FFFFFF',
  gray: '#64748b',
  lightGray: '#e2e8f0',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  darkBlue: '#ffffff',
  cardBg: '#ffffff',
  textMuted: '#64748b',
  blocked: '#475569',
};

export default function OfficeSyncScreen() {
  const navigation = useNavigation();

  // User info
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAccessBlocked, setIsAccessBlocked] = useState<boolean>(false);
  const [isPrivileged, setIsPrivileged] = useState<boolean>(false);

  // States
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dateTabs, setDateTabs] = useState<any[]>([]);

  // Modals
  const [bookingModalVisible, setBookingModalVisible] = useState<boolean>(false);
  const [blockModalVisible, setBlockModalVisible] = useState<boolean>(false);
  const [conflictModalVisible, setConflictModalVisible] = useState<boolean>(false);
  const [conflictAlternatives, setConflictAlternatives] = useState<any[]>([]);

  // Form states
  const [title, setTitle] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('10:00');
  const [reason, setReason] = useState<string>('');

  // Pulse animation state
  const pulseAnim = useRef(new Animated.Value(0.6)).current;

  // Time options (09:00 to 18:00 half-hour blocks)
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', 
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', 
    '17:00', '17:30', '18:00'
  ];

  // Set date tabs (next 7 days)
  useEffect(() => {
    const tabs = [];
    const daysName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthsName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateString = d.toISOString().split('T')[0];
      tabs.push({
        dateString,
        dayName: daysName[d.getDay()],
        dayNum: d.getDate(),
        monthName: monthsName[d.getMonth()]
      });
    }
    setDateTabs(tabs);
  }, []);

  // Fetch current user and check access rules
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('user');
        if (userDataStr) {
          const u = JSON.parse(userDataStr);
          setCurrentUser(u);

          const role = u.role?.toLowerCase() || 'employees';
          const isPriv = ['admin', 'hr', 'director'].includes(role);
          setIsPrivileged(isPriv);

          if (!isPriv) {
            const matchesLoc = u.location?.toLowerCase() === 'hosur';
            const matchesDiv = ['sds', 'tekla', 'das'].includes((u.division || '').toLowerCase());
            if (!matchesLoc || !matchesDiv) {
              setIsAccessBlocked(true);
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  // Room status pulse animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.6,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, []);

  // Fetch bookings for the selected date
  const fetchBookings = async () => {
    if (isAccessBlocked) return;
    setLoading(true);
    try {
      const res = await conferenceBookingAPI.getAll({ date: selectedDate });
      setBookings(res.data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [selectedDate, isAccessBlocked]);

  // Compute live room availability details
  const getRoomLiveState = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate !== todayStr) {
      return { status: 'Schedule View', color: COLORS.info, text: `Schedule for ${selectedDate}` };
    }

    const now = new Date();
    const currentHourStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    // 1. Check Lunch break auto-block
    if (currentHourStr >= '13:00' && currentHourStr <= '13:45') {
      return { status: 'Lunch Break', color: COLORS.warning, text: 'Room Auto-Blocked for Lunch (13:00 - 13:45)' };
    }

    // 2. Check current bookings
    const activeBooking = bookings.find(b => {
      if (b.status === 'Cancelled' || b.status === 'Rejected') return false;
      return currentHourStr >= b.startTime && currentHourStr <= b.endTime;
    });

    if (activeBooking) {
      if (activeBooking.status === 'Blocked') {
        return { 
          status: 'Maintenance', 
          color: COLORS.blocked, 
          text: `Blocked: ${activeBooking.title || 'Reserved'}` 
        };
      }
      return { 
        status: 'Occupied', 
        color: COLORS.error, 
        text: `Occupied: ${activeBooking.title} (by ${activeBooking.bookedByName})` 
      };
    }

    // 3. Find next booking today
    const futureBookings = bookings
      .filter(b => b.status !== 'Cancelled' && b.status !== 'Rejected' && b.startTime > currentHourStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (futureBookings.length > 0) {
      return { 
        status: 'Available', 
        color: COLORS.success, 
        text: `Available • Next Booking: ${futureBookings[0].startTime} (${futureBookings[0].title})` 
      };
    }

    return { status: 'Available', color: COLORS.success, text: 'Available for reservation today' };
  };

  const roomState = getRoomLiveState();

  // Create standard booking
  const handleCreateBooking = async () => {
    if (!title) {
      Alert.alert('Validation Error', 'Please enter a booking title.');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Validation Error', 'Start time must be before end time.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        date: selectedDate,
        startTime,
        endTime,
        reason,
        location: 'Hosur'
      };

      await conferenceBookingAPI.create(payload);
      Alert.alert('Success', 'Conference room booked successfully!');
      setBookingModalVisible(false);
      resetForm();
      fetchBookings();
    } catch (err: any) {
      if (err.response?.data?.conflict) {
        setConflictAlternatives(err.response.data.alternatives || []);
        setConflictModalVisible(true);
      } else {
        Alert.alert('Booking Failed', err.response?.data?.message || 'Error occurred while saving booking.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Block slots (Admin only)
  const handleBlockSlot = async () => {
    if (!title) {
      Alert.alert('Validation Error', 'Please enter a reservation/block title.');
      return;
    }

    if (startTime >= endTime) {
      Alert.alert('Validation Error', 'Start time must be before end time.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title,
        date: selectedDate,
        startTime,
        endTime,
        reason,
        location: 'Hosur'
      };

      await conferenceBookingAPI.block(payload);
      Alert.alert('Success', 'Time slot blocked successfully!');
      setBlockModalVisible(false);
      resetForm();
      fetchBookings();
    } catch (err: any) {
      Alert.alert('Operation Failed', err.response?.data?.message || 'Could not block time slot.');
    } finally {
      setLoading(false);
    }
  };

  // Admin Approve / Reject actions
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await conferenceBookingAPI.updateStatus(id, { status: newStatus });
      Alert.alert('Updated', `Booking is now ${newStatus}`);
      fetchBookings();
    } catch (err) {
      Alert.alert('Error', 'Failed to update booking status.');
    }
  };

  // Delete booking slot
  const handleDeleteBooking = async (id: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to cancel/delete this booking?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await conferenceBookingAPI.delete(id);
              Alert.alert('Deleted', 'Booking removed successfully.');
              fetchBookings();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete booking.');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setTitle('');
    setStartTime('09:00');
    setEndTime('10:00');
    setReason('');
  };

  if (isAccessBlocked) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <CommonHeader title="Office Sync" backgroundColor="#4F1A6F" />
        <View style={styles.restrictedContainer}>
          <Icon name="block" size={64} color={COLORS.error} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedMessage}>
            Office Sync conference room booking is currently limited to the Hosur office location and the SDS, TEKLA, or DAS Software divisions.
          </Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
        <CommonFooter />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CommonHeader title="Office Sync" backgroundColor="#4F1A6F" />

      {/* ROOM METADATA & LIVE STATUS BANNERS */}
      <View style={styles.infoCard}>
        <View style={styles.headerRow}>
          <Icon name="meeting-room" size={24} color="#FFF" />
          <Text style={styles.roomName}>Swaminathan Conference Room</Text>
        </View>
        <Text style={styles.roomSpecs}>Cap: 12-15 Seats • TV Display • Whiteboard • Hosur Branch</Text>

        <View style={[styles.statusBox, { backgroundColor: roomState.color }]}>
          <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
          <Text style={styles.statusText}>{roomState.status.toUpperCase()}: {roomState.text}</Text>
        </View>
      </View>

      {/* DATE TABS SELECTION */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {dateTabs.map((t) => {
            const isActive = selectedDate === t.dateString;
            return (
              <TouchableOpacity
                key={t.dateString}
                style={[styles.dateTab, isActive && styles.activeDateTab]}
                onPress={() => setSelectedDate(t.dateString)}
              >
                <Text style={[styles.tabDayName, isActive && styles.activeTabColor]}>{t.dayName}</Text>
                <Text style={[styles.tabDayNum, isActive && styles.activeTabColor]}>{t.dayNum}</Text>
                <Text style={[styles.tabMonthName, isActive && styles.activeTabColor]}>{t.monthName}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* BOOKINGS LIST */}
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Schedules & Reservations</Text>
        {loading ? (
          <ActivityIndicator size="large" color={COLORS.info} style={{ marginTop: 20 }} />
        ) : bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="event-busy" size={48} color={COLORS.gray} />
            <Text style={styles.emptyText}>No reservations scheduled for this day.</Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const isOwner = currentUser && booking.bookedBy === currentUser.employeeId;
            let statusColor = COLORS.warning;
            if (booking.status === 'Approved') statusColor = COLORS.success;
            if (booking.status === 'Blocked') statusColor = COLORS.blocked;
            if (booking.status === 'Rejected' || booking.status === 'Cancelled') statusColor = COLORS.error;

            return (
              <View key={booking._id} style={styles.bookingCard}>
                <View style={styles.bookingHeader}>
                  <Text style={styles.bookingTime}>{booking.startTime} - {booking.endTime}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.statusBadgeText}>{booking.status}</Text>
                  </View>
                </View>

                <Text style={styles.bookingTitle}>{booking.title}</Text>
                <Text style={styles.bookingUser}>Booked by: {booking.bookedByName || 'Unknown'} ({booking.division || 'All'})</Text>
                {booking.reason ? <Text style={styles.bookingReason}>Reason: {booking.reason}</Text> : null}
                {booking.adminComments ? <Text style={styles.adminNotes}>Comments: {booking.adminComments}</Text> : null}

                {/* USER ACTIONS */}
                <View style={styles.actionsRow}>
                  {/* Approve/Reject for Admin/HR if Pending */}
                  {isPrivileged && booking.status === 'Pending' && (
                    <>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.approveBtn]} 
                        onPress={() => handleUpdateStatus(booking._id, 'Approved')}
                      >
                        <Icon name="check" size={16} color="#FFF" />
                        <Text style={styles.btnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, styles.rejectBtn]} 
                        onPress={() => handleUpdateStatus(booking._id, 'Rejected')}
                      >
                        <Icon name="close" size={16} color="#FFF" />
                        <Text style={styles.btnText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {/* Owner or Admin can delete */}
                  {(isOwner || isPrivileged) && (
                    <TouchableOpacity 
                      style={[styles.actionBtn, styles.deleteBtn]} 
                      onPress={() => handleDeleteBooking(booking._id)}
                    >
                      <Icon name="delete" size={16} color="#FFF" />
                      <Text style={styles.btnText}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FLOATING ACTION ACTION BAR */}
      <View style={styles.floatingActions}>
        <TouchableOpacity style={styles.reserveBtn} onPress={() => setBookingModalVisible(true)}>
          <Icon name="add-circle" size={20} color="#FFF" />
          <Text style={styles.reserveBtnText}>Book Room</Text>
        </TouchableOpacity>

        {isPrivileged && (
          <TouchableOpacity style={styles.blockBtnFloating} onPress={() => setBlockModalVisible(true)}>
            <Icon name="lock" size={20} color="#FFF" />
            <Text style={styles.blockBtnTextFloating}>Block Slot</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* BOOK ROOM MODAL */}
      <Modal visible={bookingModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Book Conference Room</Text>
            <Text style={styles.modalSub}>{selectedDate}</Text>

            <TextInput 
              style={styles.input} 
              placeholder="Booking Title / Event Name"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.timeRow}>
              <View style={styles.pickerBox}>
                <Text style={styles.pickerLabel}>Start Time</Text>
                <View style={styles.inputPicker}>
                  <Picker
                    selectedValue={startTime}
                    onValueChange={setStartTime}
                    style={{ color: '#0f172a' }}
                    dropdownIconColor="#4F1A6F"
                  >
                    {timeSlots.map(t => <Picker.Item key={t} label={t} value={t} />)}
                  </Picker>
                </View>
              </View>

              <View style={styles.pickerBox}>
                <Text style={styles.pickerLabel}>End Time</Text>
                <View style={styles.inputPicker}>
                  <Picker
                    selectedValue={endTime}
                    onValueChange={setEndTime}
                    style={{ color: '#0f172a' }}
                    dropdownIconColor="#4F1A6F"
                  >
                    {timeSlots.map(t => <Picker.Item key={t} label={t} value={t} />)}
                  </Picker>
                </View>
              </View>
            </View>

            <TextInput 
              style={[styles.input, { height: 80 }]} 
              placeholder="Reason for meeting (Optional)"
              placeholderTextColor="#64748B"
              multiline
              value={reason}
              onChangeText={setReason}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setBookingModalVisible(false); resetForm(); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateBooking}>
                <Text style={styles.submitText}>Save Booking</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BLOCK SLOT MODAL */}
      <Modal visible={blockModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Block Conference Room</Text>
            <Text style={styles.modalSub}>{selectedDate}</Text>

            <TextInput 
              style={styles.input} 
              placeholder="Block Reason (e.g. Lunch Break, Maintenance)"
              placeholderTextColor="#64748B"
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.timeRow}>
              <View style={styles.pickerBox}>
                <Text style={styles.pickerLabel}>Start Time</Text>
                <View style={styles.inputPicker}>
                  <Picker
                    selectedValue={startTime}
                    onValueChange={setStartTime}
                    style={{ color: '#0f172a' }}
                    dropdownIconColor="#4F1A6F"
                  >
                    {timeSlots.map(t => <Picker.Item key={t} label={t} value={t} />)}
                  </Picker>
                </View>
              </View>

              <View style={styles.pickerBox}>
                <Text style={styles.pickerLabel}>End Time</Text>
                <View style={styles.inputPicker}>
                  <Picker
                    selectedValue={endTime}
                    onValueChange={setEndTime}
                    style={{ color: '#0f172a' }}
                    dropdownIconColor="#4F1A6F"
                  >
                    {timeSlots.map(t => <Picker.Item key={t} label={t} value={t} />)}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setBlockModalVisible(false); resetForm(); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: COLORS.blocked }]} onPress={handleBlockSlot}>
                <Text style={styles.submitText}>Block Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CONFLICT ALTERNATIVES MODAL */}
      <Modal visible={conflictModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.conflictCard}>
            <Icon name="warning" size={48} color={COLORS.warning} />
            <Text style={styles.conflictTitle}>Time Slot Conflict!</Text>
            <Text style={styles.conflictMsg}>The room is already reserved. Below are available slots for {selectedDate}:</Text>

            <ScrollView style={{ maxHeight: 200, marginVertical: 12 }}>
              {conflictAlternatives.length === 0 ? (
                <Text style={styles.noAltText}>No slots available today.</Text>
              ) : (
                conflictAlternatives.map((alt, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.altSlot}
                    onPress={() => {
                      setStartTime(alt.start);
                      setEndTime(alt.end);
                      setConflictModalVisible(false);
                    }}
                  >
                    <Text style={styles.altText}>{alt.start} - {alt.end}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <TouchableOpacity 
              style={styles.conflictCloseBtn} 
              onPress={() => setConflictModalVisible(false)}
            >
              <Text style={styles.conflictCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CommonFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  restrictedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  restrictedTitle: {
    color: '#1e293b',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  restrictedMessage: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backBtn: {
    backgroundColor: COLORS.info,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#4F1A6F',
    margin: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4F1A6F',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  roomName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  roomSpecs: {
    color: '#E2E8F0',
    fontSize: 12,
    marginBottom: 12,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  statusText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tabsContainer: {
    height: 76,
    marginBottom: 10,
    paddingHorizontal: 8,
  },
  dateTab: {
    width: 68,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeDateTab: {
    backgroundColor: '#4F1A6F',
    borderColor: '#4F1A6F',
  },
  tabDayName: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  tabDayNum: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabMonthName: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  activeTabColor: {
    color: '#FFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: COLORS.textMuted,
    marginTop: 10,
  },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bookingTime: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bookingTitle: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bookingUser: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  bookingReason: {
    color: '#334155',
    fontSize: 12,
  },
  adminNotes: {
    color: COLORS.warning,
    fontSize: 12,
    marginTop: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },
  approveBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
  },
  deleteBtn: {
    backgroundColor: COLORS.gray,
  },
  btnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 3,
  },
  floatingActions: {
    position: 'absolute',
    bottom: 85,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  reserveBtn: {
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  reserveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  blockBtnFloating: {
    backgroundColor: COLORS.blocked,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  blockBtnTextFloating: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    width: '90%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSub: {
    color: COLORS.secondary,
    fontSize: 12,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    color: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pickerBox: {
    width: '48%',
  },
  pickerLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  inputPicker: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelText: {
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  conflictCard: {
    backgroundColor: '#ffffff',
    width: '85%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.warning,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  conflictTitle: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
  },
  conflictMsg: {
    color: COLORS.textMuted,
    textAlign: 'center',
    marginVertical: 8,
    fontSize: 13,
  },
  altSlot: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    width: 200,
    alignItems: 'center',
  },
  altText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  noAltText: {
    color: COLORS.error,
    fontSize: 13,
  },
  conflictCloseBtn: {
    marginTop: 16,
    backgroundColor: COLORS.gray,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  conflictCloseText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
