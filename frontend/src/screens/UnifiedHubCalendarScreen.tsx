// screens/UnifiedHubCalendarScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Dimensions,
  StatusBar,
  FlatList,
  Animated,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { leaveAPI, celebrationAPI } from '../services/api';
import LinearGradient from 'react-native-linear-gradient';
import Confetti from 'react-native-confetti';

const { width } = Dimensions.get('window');

// Enhanced color palette
const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  accent: '#4A148C',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#CCCCCC',
  error: '#FF4444',
  success: '#00C851',
  warning: '#FFA000',
  info: '#2196F3',
  birthday: '#FF6B6B',
  anniversary: '#4ECDC4',
  holiday: '#FF9F1C',
  leave: '#6C5CE7',
  background: '#F8F9FF',
  cardBg: '#FFFFFF',
  textPrimary: '#2D3436',
  textSecondary: '#636E72',
  border: '#E9ECEF',
};

// Holiday Calendar 2026 data
const HOLIDAYS_2026 = [
  { date: '01-Jan-26', day: 'THURSDAY', occasion: 'NEW YEAR' },
  { date: '15-Jan-26', day: 'THURSDAY', occasion: 'THAI PONGAL' },
  { date: '16-Jan-26', day: 'FRIDAY', occasion: 'MATTU PONGAL' },
  { date: '26-Jan-26', day: 'MONDAY', occasion: 'REPUBLIC DAY' },
  { date: '14-Apr-26', day: 'TUESDAY', occasion: 'TAMIL NEW YEAR' },
  { date: '01-May-26', day: 'FRIDAY', occasion: 'LABOUR DAY' },
  { date: '14-Sep-26', day: 'MONDAY', occasion: 'VINAYAGAR CHATHURTHI' },
  { date: '02-Oct-26', day: 'FRIDAY', occasion: 'GANDHI JAYANTHI' },
  { date: '19-Oct-26', day: 'MONDAY', occasion: 'AYUDHA POOJA' },
];

// Day headers
const DAYS = [
  { name: 'SUN', color: '#FF6B6B' },
  { name: 'MON', color: '#4A90E2' },
  { name: 'TUE', color: '#50C878' },
  { name: 'WED', color: '#FFB347' },
  { name: 'THU', color: '#9B59B6' },
  { name: 'FRI', color: '#3498DB' },
  { name: 'SAT', color: '#E67E22' },
];

// Interfaces
interface Celebration {
  _id?: string;
  eventType: 'Birthday' | 'Work Anniversary';
  employeeName: string;
  employeeId: string;
  eventDate: string;
  division?: string;
  location?: string;
  department?: string;
  designation?: string;
  isWished?: boolean;
}

interface Leave {
  _id?: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  status: string;
  dayType?: string;
  reason?: string;
}

interface WishHistory {
  _id: string;
  eventType: 'Birthday' | 'Work Anniversary';
  senderName: string;
  receiverName: string;
  receiverEmployeeId: string;
  message: string;
  replyMessage?: string;
  replyDate?: string;
  date: string;
}

interface WishStats {
  birthdayWishesSent: number;
  anniversaryWishesSent: number;
  wishHistory: WishHistory[];
  currentUserEmployeeId?: string;
}

interface HolidayItem {
  name: string;
  date: Date | null;
  detail: string;
}

interface LeaveItem {
  name: string;
  date: Date | null;
  detail: string;
}

interface CelebrationItem {
  name: string;
  date: Date | null;
  detail: string;
  division?: string;
  location?: string;
  employeeId?: string;
  department?: string;
  designation?: string;
  isWished?: boolean;
}

type FilteredListItem = HolidayItem | LeaveItem | CelebrationItem;

const UnifiedHubCalendarScreen = () => {
  const navigation = useNavigation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<{
    leaves: Leave[];
    balance: any;
    celebrations: Celebration[];
    wishStats: WishStats | null;
  }>({
    leaves: [],
    balance: null,
    celebrations: [],
    wishStats: null,
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForWish, setSelectedEmployeeForWish] = useState<CelebrationItem | null>(null);
  const [isWishModalOpen, setIsWishModalOpen] = useState(false);
  const [replyingToWish, setReplyingToWish] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showHistoryPanel, setShowHistoryPanel] = useState<'Birthday' | 'Anniversary' | null>(null);
  const [wishMessage, setWishMessage] = useState('');
  const [sendingWish, setSendingWish] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDateDetails, setShowDateDetails] = useState(false);
  const [dateEvents, setDateEvents] = useState<any[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const confettiRef = useRef<Confetti>(null);

  useEffect(() => {
    fetchUnifiedData();
  }, [currentDate]);

  // Confetti trigger function
  const triggerConfetti = () => {
    if (confettiRef.current) {
      confettiRef.current.startConfetti();
      
      // Animate the celebration indicator
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }).start(() => {
            if (confettiRef.current) {
              confettiRef.current.stopConfetti();
            }
          });
        }, 3000);
      });
    }
  };

  const fetchUnifiedData = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const [leavesRes, balanceRes, celebRes, statsRes] = await Promise.all([
        leaveAPI.myLeaves().catch(() => ({ data: [] })),
        leaveAPI.myBalance().catch(() => ({ data: null })),
        celebrationAPI.getCalendar({ month, year }).catch(() => ({ data: [] })),
        celebrationAPI.getWishStats({ month, year }).catch(() => ({ data: null }))
      ]);

      setData({
        leaves: Array.isArray(leavesRes.data) ? leavesRes.data : [],
        balance: balanceRes?.data || null,
        celebrations: Array.isArray(celebRes.data) ? celebRes.data : [],
        wishStats: statsRes?.data || null
      });
    } catch (error) {
      console.error("Error fetching unified calendar data:", error);
      Alert.alert('Error', 'Failed to load calendar data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUnifiedData();
  };

  const changeMonth = (increment: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return days;
  };

  const parseDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr === 'REGIONAL') return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    const months: { [key: string]: number } = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return new Date(2000 + parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
  };

  const isSameDay = (d1: Date, d2: Date): boolean => {
    return d1 && d2 &&
      d1.getDate() === d2.getDate() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getFullYear() === d2.getFullYear();
  };

  interface DayEvent {
    type: 'holiday' | 'leave' | 'birthday' | 'anniversary';
    title: string;
    color: string;
    icon: string;
    iconFamily?: 'MaterialIcons' | 'MaterialCommunityIcons';
    data?: any;
  }

  const getDayEvents = (date: Date | null): DayEvent[] => {
    if (!date) return [];
    const events: DayEvent[] = [];

    // 1. Holiday
    const holiday = HOLIDAYS_2026.find(h => {
      const parsedDate = parseDate(h.date);
      return parsedDate && isSameDay(parsedDate, date);
    });
    if (holiday) {
      events.push({
        type: 'holiday',
        title: holiday.occasion,
        color: COLORS.holiday,
        icon: 'home',
        iconFamily: 'MaterialCommunityIcons'
      });
    }

    // 2. Personal Leave
    const leave = data.leaves.find(l => {
      if (l.status !== 'Approved') return false;
      const startDate = new Date(l.startDate).setHours(0, 0, 0, 0);
      const endDate = new Date(l.endDate).setHours(23, 59, 59, 999);
      const currentDateTime = date.setHours(12, 0, 0, 0);
      return currentDateTime >= startDate && currentDateTime <= endDate;
    });
    if (leave) {
      events.push({
        type: 'leave',
        title: `${leave.leaveType} Leave`,
        color: COLORS.leave,
        icon: 'airplane-takeoff',
        iconFamily: 'MaterialCommunityIcons',
        data: leave
      });
    }

    // 3. Celebrations
    const celebs = data.celebrations.filter(c => isSameDay(new Date(c.eventDate), date));
    celebs.forEach(c => {
      if (c.eventType === 'Birthday') {
        events.push({
          type: 'birthday',
          title: c.employeeName,
          color: COLORS.birthday,
          icon: 'cake',
          iconFamily: 'MaterialCommunityIcons',
          data: c
        });
      } else {
        events.push({
          type: 'anniversary',
          title: c.employeeName,
          color: COLORS.anniversary,
          icon: 'party-popper',
          iconFamily: 'MaterialCommunityIcons',
          data: c
        });
      }
    });

    return events;
  };

  const handleDayPress = (date: Date, events: DayEvent[]) => {
    setSelectedDate(date);
    setDateEvents(events);
    setShowDateDetails(true);
    
    // Trigger confetti if it's a celebration day
    if (events.some(e => e.type === 'birthday' || e.type === 'anniversary')) {
      triggerConfetti();
    }
  };

  const getFilteredList = (category: string | null): FilteredListItem[] => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    if (!category) return [];

    switch (category) {
      case 'Holidays':
        return HOLIDAYS_2026.filter(h => {
          const d = parseDate(h.date);
          return d && d.getMonth() === month && d.getFullYear() === year;
        }).map(h => ({
          name: h.occasion,
          date: parseDate(h.date),
          detail: h.day
        }));

      case 'My Leaves':
        return data.leaves.filter(l => {
          const start = new Date(l.startDate);
          return l.status === 'Approved' && start.getMonth() === month && start.getFullYear() === year;
        }).map(l => ({
          name: `${l.leaveType} Leave`,
          date: new Date(l.startDate),
          detail: `${l.dayType || 'Full Day'}`
        }));

      case 'Birthdays':
        return data.celebrations
          .filter(c => c.eventType === 'Birthday')
          .sort((a, b) => new Date(a.eventDate).getDate() - new Date(b.eventDate).getDate())
          .map(c => ({
            name: c.employeeName,
            date: new Date(c.eventDate),
            detail: '🎂 Birthday',
            division: c.division,
            location: c.location,
            employeeId: c.employeeId,
            department: c.department,
            designation: c.designation || 'Employee',
            isWished: c.isWished
          }));

      case 'Anniversaries':
        return data.celebrations
          .filter(c => c.eventType === 'Work Anniversary')
          .sort((a, b) => new Date(a.eventDate).getDate() - new Date(b.eventDate).getDate())
          .map(c => ({
            name: c.employeeName,
            date: new Date(c.eventDate),
            detail: '🎊 Work Anniversary',
            division: c.division,
            location: c.location,
            employeeId: c.employeeId,
            department: c.department,
            designation: c.designation || 'Employee',
            isWished: c.isWished
          }));

      default:
        return [];
    }
  };

  const submitReply = async (wishId: string) => {
    if (!replyText.trim()) return;
    try {
      await celebrationAPI.replyWish(wishId, { replyMessage: replyText });
      setReplyingToWish(null);
      setReplyText('');
      fetchUnifiedData();
      Alert.alert('Success', 'Reply sent successfully');
    } catch (error) {
      console.error("Error replying to wish:", error);
      Alert.alert('Error', 'Failed to send reply');
    }
  };

  const sendWish = async () => {
    if (!selectedEmployeeForWish || !wishMessage.trim()) return;
    
    try {
      setSendingWish(true);
      await celebrationAPI.sendWish({
        receiverEmployeeId: selectedEmployeeForWish.employeeId,
        message: wishMessage,
        eventType: selectedCategory === 'Birthdays' ? 'Birthday' : 'Work Anniversary'
      });
      
      setIsWishModalOpen(false);
      setSelectedEmployeeForWish(null);
      setWishMessage('');
      fetchUnifiedData();
      Alert.alert('Success', 'Wish sent successfully');
      
      // Trigger confetti when wish is sent
      triggerConfetti();
    } catch (error) {
      console.error("Error sending wish:", error);
      Alert.alert('Error', 'Failed to send wish');
    } finally {
      setSendingWish(false);
    }
  };

  const days = getDaysInMonth(currentDate);

  // Type guard
  const isCelebrationItem = (item: FilteredListItem): item is CelebrationItem => {
    return 'isWished' in item;
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Confetti Component */}
      <Confetti
        ref={confettiRef}
        confettiCount={100}
        timeout={3}
        untilStopped={true}
        duration={3000}
        colors={['#FF6B6B', '#4ECDC4', '#FF9F1C', '#6C5CE7', '#FFB347', '#9B59B6']}
      />

      {/* Celebration Animation Overlay */}
      <Animated.View
        style={[
          styles.celebrationOverlay,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
        pointerEvents="none"
      >
        <View style={styles.celebrationContent}>
          <IconCommunity name="party-popper" size={60} color={COLORS.white} />
          <Text style={styles.celebrationText}>Celebration Time! 🎉</Text>
        </View>
      </Animated.View>
      
      {/* Header */}
      <LinearGradient 
        colors={[COLORS.primary, COLORS.secondary]} 
        start={{x: 0, y: 0}} 
        end={{x: 1, y: 0}}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-back-ios" size={20} color={COLORS.white} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <IconCommunity name="calendar-month" size={24} color={COLORS.white} />
            <Text style={styles.headerTitle}>Unified Hub Calendar</Text>
          </View>
          <TouchableOpacity style={styles.headerRight}>
            <Icon name="more-vert" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.content}>

          {/* Stats Cards */}
          <View style={styles.statsContainer}>
            <TouchableOpacity
              onPress={() => setShowHistoryPanel('Birthday')}
              style={styles.statCard}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FF8E8E']}
                style={styles.statCardGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
              >
                <View style={styles.statIconContainer}>
                  <IconCommunity name="cake" size={28} color={COLORS.white} />
                </View>
                <Text style={styles.statNumber}>{data.wishStats?.birthdayWishesSent || 0}</Text>
                <Text style={styles.statLabel}>Birthday Wishes</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowHistoryPanel('Anniversary')}
              style={styles.statCard}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#4ECDC4', '#45B7AA']}
                style={styles.statCardGradient}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
              >
                <View style={styles.statIconContainer}>
                  <IconCommunity name="party-popper" size={28} color={COLORS.white} />
                </View>
                <Text style={styles.statNumber}>{data.wishStats?.anniversaryWishesSent || 0}</Text>
                <Text style={styles.statLabel}>Anniversary Wishes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* History Panel */}
          {(showHistoryPanel === 'Birthday' || showHistoryPanel === 'Anniversary') && (
            <View style={styles.historyPanel}>
              <LinearGradient
                colors={['#F8F9FF', '#FFFFFF']}
                style={styles.historyPanelGradient}
              >
                <View style={styles.historyHeader}>
                  <View style={styles.historyTitleContainer}>
                    {showHistoryPanel === 'Birthday' ? (
                      <IconCommunity name="cake" size={20} color={COLORS.birthday} />
                    ) : (
                      <IconCommunity name="party-popper" size={20} color={COLORS.anniversary} />
                    )}
                    <Text style={styles.historyTitle}>
                      {showHistoryPanel === 'Birthday' ? 'Birthday Wishes Sent' : 'Anniversary Wishes Sent'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowHistoryPanel(null)} style={styles.closeButton}>
                    <Icon name="close" size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <FlatList
                  data={data.wishStats?.wishHistory?.filter(w => 
                    w.eventType === (showHistoryPanel === 'Birthday' ? 'Birthday' : 'Work Anniversary')
                  )}
                  keyExtractor={(item, index) => item._id || index.toString()}
                  renderItem={({ item: wish }) => (
                    <View style={styles.historyItem}>
                      <View style={styles.historyItemHeader}>
                        <View style={styles.historySenderInfo}>
                          <View style={styles.senderAvatar}>
                            <Text style={styles.senderAvatarText}>
                              {wish.senderName.charAt(0)}
                            </Text>
                          </View>
                          <View>
                            <Text style={styles.historySenderName}>{wish.senderName}</Text>
                            <Text style={styles.historyDate}>
                              {new Date(wish.date).toLocaleDateString()} • {new Date(wish.date).toLocaleTimeString()}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.wishBubble}>
                        <Text style={styles.wishText}>"{wish.message}"</Text>
                      </View>
                      
                      <Text style={styles.historyReceiver}>
                        to <Text style={styles.receiverName}>{wish.receiverName}</Text>
                      </Text>
                      
                      {wish.replyMessage && (
                        <View style={styles.replyContainer}>
                          <View style={styles.replyHeader}>
                            <Icon name="reply" size={12} color={COLORS.info} />
                            <Text style={styles.replyLabel}>Reply from {wish.receiverName}</Text>
                          </View>
                          <Text style={styles.replyText}>{wish.replyMessage}</Text>
                          {wish.replyDate && (
                            <Text style={styles.replyDate}>
                              {new Date(wish.replyDate).toLocaleString()}
                            </Text>
                          )}
                        </View>
                      )}

                      {!wish.replyMessage && wish.receiverEmployeeId === data.wishStats?.currentUserEmployeeId && (
                        <View style={styles.replyAction}>
                          {replyingToWish === wish._id ? (
                            <View style={styles.replyInputContainer}>
                              <TextInput
                                style={styles.replyInput}
                                value={replyText}
                                onChangeText={setReplyText}
                                placeholder="Type your reply..."
                                multiline
                                placeholderTextColor={COLORS.lightGray}
                              />
                              <View style={styles.replyButtons}>
                                <TouchableOpacity
                                  onPress={() => setReplyingToWish(null)}
                                  style={styles.cancelButton}
                                >
                                  <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => submitReply(wish._id)}
                                  style={styles.sendButton}
                                >
                                  <Text style={styles.sendButtonText}>Send</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => setReplyingToWish(wish._id)}
                              style={styles.replyButton}
                            >
                              <Icon name="reply" size={14} color={COLORS.info} />
                              <Text style={styles.replyButtonText}>Reply</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyHistory}>
                      <IconCommunity name="heart-outline" size={48} color={COLORS.lightGray} />
                      <Text style={styles.emptyHistoryText}>No wishes sent yet</Text>
                    </View>
                  }
                  showsVerticalScrollIndicator={false}
                />
              </LinearGradient>
            </View>
          )}

          {/* Calendar Card */}
          <View style={styles.calendarCard}>
            {/* Month Navigator */}
            <View style={styles.monthNavigator}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavButton}>
                <Icon name="chevron-left" size={24} color={COLORS.primary} />
              </TouchableOpacity>
              
              <View style={styles.monthDisplay}>
                <Text style={styles.monthText}>
                  {currentDate.toLocaleString('default', { month: 'long' })}
                </Text>
                <Text style={styles.yearText}>{currentDate.getFullYear()}</Text>
              </View>
              
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavButton}>
                <Icon name="chevron-right" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            {/* Today Button */}
            <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
              <Icon name="today" size={16} color={COLORS.white} />
              <Text style={styles.todayButtonText}>Today</Text>
            </TouchableOpacity>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {DAYS.map(day => (
                <Text key={day.name} style={[styles.dayHeader, { color: day.color }]}>
                  {day.name}
                </Text>
              ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarGrid}>
              {days.map((date, idx) => {
                if (!date) return <View key={`empty-${idx}`} style={styles.emptyDay} />;

                const events = getDayEvents(date);
                const isToday = isSameDay(date, new Date());
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;

                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    onPress={() => handleDayPress(date, events)}
                    style={[
                      styles.dayCell,
                      isToday && styles.todayCell,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.dayNumber,
                      isToday && styles.todayNumber,
                      isWeekend && !isToday && styles.weekendNumber,
                    ]}>
                      {date.getDate()}
                    </Text>
                    
                    {/* Event Indicators */}
                    <View style={styles.eventIndicators}>
                      {events.map((event, index) => (
                        <View
                          key={index}
                          style={[
                            styles.eventIndicator,
                            { backgroundColor: event.color }
                          ]}
                        />
                      ))}
                    </View>

                    {/* Event Count Badge */}
                    {events.length > 0 && (
                      <View style={[styles.eventCountBadge, { backgroundColor: events[0].color }]}>
                        <Text style={styles.eventCountText}>{events.length}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Legend Grid */}
          <View style={styles.legendCard}>
            <Text style={styles.legendTitle}>Quick Filters</Text>
            <View style={styles.legendGrid}>
              <TouchableOpacity
                style={[styles.legendItem, { backgroundColor: '#FFF5F5' }]}
                onPress={() => {
                  setSelectedCategory('Holidays');
                  setShowModal(true);
                }}
              >
                <View style={[styles.legendIcon, { backgroundColor: COLORS.holiday }]}>
                  <IconCommunity name="home" size={20} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.legendLabel}>Holidays</Text>
                  <Text style={styles.legendCount}>
                    {getFilteredList('Holidays').length} this month
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.legendItem, { backgroundColor: '#F0F4FF' }]}
                onPress={() => {
                  setSelectedCategory('My Leaves');
                  setShowModal(true);
                }}
              >
                <View style={[styles.legendIcon, { backgroundColor: COLORS.leave }]}>
                  <IconCommunity name="airplane-takeoff" size={20} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.legendLabel}>My Leaves</Text>
                  <Text style={styles.legendCount}>
                    {getFilteredList('My Leaves').length} this month
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.legendItem, { backgroundColor: '#FFF0F0' }]}
                onPress={() => {
                  setSelectedCategory('Birthdays');
                  setShowModal(true);
                }}
              >
                <View style={[styles.legendIcon, { backgroundColor: COLORS.birthday }]}>
                  <IconCommunity name="cake" size={20} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.legendLabel}>Birthdays</Text>
                  <Text style={styles.legendCount}>
                    {getFilteredList('Birthdays').length} this month
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.legendItem, { backgroundColor: '#F0FFF4' }]}
                onPress={() => {
                  setSelectedCategory('Anniversaries');
                  setShowModal(true);
                }}
              >
                <View style={[styles.legendIcon, { backgroundColor: COLORS.anniversary }]}>
                  <IconCommunity name="party-popper" size={20} color={COLORS.white} />
                </View>
                <View>
                  <Text style={styles.legendLabel}>Anniversaries</Text>
                  <Text style={styles.legendCount}>
                    {getFilteredList('Anniversaries').length} this month
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.quickStatsContainer}>
            <TouchableOpacity
              onPress={() => {
                setSelectedCategory('Birthdays');
                setShowModal(true);
              }}
              style={styles.quickStatCard}
            >
              <View style={[styles.quickStatIcon, { backgroundColor: '#FFE5E5' }]}>
                <IconCommunity name="cake" size={24} color={COLORS.birthday} />
              </View>
              <View>
                <Text style={styles.quickStatValue}>
                  {data.celebrations.filter(c => c.eventType === 'Birthday').length}
                </Text>
                <Text style={styles.quickStatLabel}>Birthdays</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setSelectedCategory('Anniversaries');
                setShowModal(true);
              }}
              style={styles.quickStatCard}
            >
              <View style={[styles.quickStatIcon, { backgroundColor: '#E5FFF5' }]}>
                <IconCommunity name="party-popper" size={24} color={COLORS.anniversary} />
              </View>
              <View>
                <Text style={styles.quickStatValue}>
                  {data.celebrations.filter(c => c.eventType === 'Work Anniversary').length}
                </Text>
                <Text style={styles.quickStatLabel}>Anniversaries</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Day Details Modal */}
      <Modal
        visible={showDateDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateDetails(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dayModalContent}>
            <View style={styles.dayModalHeader}>
              <View>
                <Text style={styles.dayModalDate}>
                  {selectedDate && formatDate(selectedDate)}
                </Text>
                <Text style={styles.dayModalEventCount}>
                  {dateEvents.length} {dateEvents.length === 1 ? 'Event' : 'Events'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDateDetails(false)} style={styles.modalCloseButton}>
                <Icon name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dayModalBody}>
              {dateEvents.map((event, index) => (
                <View key={index} style={[styles.dayEventItem, { borderLeftColor: event.color }]}>
                  <View style={[styles.dayEventIcon, { backgroundColor: event.color }]}>
                    {event.iconFamily === 'MaterialCommunityIcons' ? (
                      <IconCommunity name={event.icon} size={20} color={COLORS.white} />
                    ) : (
                      <Icon name={event.icon} size={20} color={COLORS.white} />
                    )}
                  </View>
                  <View style={styles.dayEventInfo}>
                    <Text style={styles.dayEventTitle}>{event.title}</Text>
                    <Text style={styles.dayEventType}>
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </Text>
                    {event.type === 'birthday' && !event.data?.isWished && (
                      <TouchableOpacity
                        style={styles.dayEventWishButton}
                        onPress={() => {
                          setShowDateDetails(false);
                          setSelectedEmployeeForWish({
                            name: event.data.employeeName,
                            employeeId: event.data.employeeId,
                            designation: event.data.designation,
                            isWished: event.data.isWished
                          } as CelebrationItem);
                          setWishMessage('');
                          setIsWishModalOpen(true);
                        }}
                      >
                        <Icon name="favorite" size={14} color={COLORS.white} />
                        <Text style={styles.dayEventWishText}>Send Wish</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient 
              colors={[COLORS.primary, COLORS.secondary]} 
              style={styles.modalHeader}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
            >
              <Text style={styles.modalTitle}>{selectedCategory}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalCloseButton}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </LinearGradient>

            <FlatList
              data={getFilteredList(selectedCategory)}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <View style={styles.modalItem}>
                  <View style={styles.modalItemLeft}>
                    <View style={styles.modalItemDate}>
                      <Text style={styles.modalItemDay}>
                        {item.date ? item.date.getDate() : ''}
                      </Text>
                    </View>
                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      <Text style={styles.modalItemDetail}>
                        {item.date ? item.date.toLocaleString('default', { month: 'short' }) : ''} • {item.detail}
                      </Text>
                      {isCelebrationItem(item) && (item.division || item.location) && (
                        <View style={styles.modalItemTags}>
                          {item.division && (
                            <View style={styles.tag}>
                              <Text style={styles.tagText}>{item.division}</Text>
                            </View>
                          )}
                          {item.location && (
                            <View style={[styles.tag, styles.locationTag]}>
                              <Text style={styles.tagText}>{item.location}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.modalItemRight}>
                    {(selectedCategory === 'Birthdays' || selectedCategory === 'Anniversaries') && 
                     isCelebrationItem(item) && (
                      <TouchableOpacity
                        onPress={() => {
                          if (item.isWished) return;
                          setShowModal(false);
                          setSelectedEmployeeForWish(item);
                          setWishMessage('');
                          setIsWishModalOpen(true);
                        }}
                        style={[
                          styles.wishButton,
                          item.isWished && styles.wishedButton
                        ]}
                        disabled={item.isWished}
                      >
                        <Text style={[
                          styles.wishButtonText,
                          item.isWished && styles.wishedButtonText
                        ]}>
                          {item.isWished ? 'Wished!' : 'Wish'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.noEvents}>
                  <IconCommunity name="calendar-blank" size={48} color={COLORS.lightGray} />
                  <Text style={styles.noEventsText}>No events found this month.</Text>
                </View>
              }
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.modalButton}>
                <Text style={styles.modalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Wish Modal */}
      <Modal
        visible={isWishModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsWishModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.wishModalContent}>
            <View style={styles.wishModalHeader}>
              <Text style={styles.wishModalTitle}>
                Send {selectedCategory === 'Birthdays' ? 'Birthday' : 'Anniversary'} Wish
              </Text>
              <TouchableOpacity onPress={() => setIsWishModalOpen(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {selectedEmployeeForWish && (
              <View style={styles.wishModalBody}>
                <View style={styles.wishEmployeeInfo}>
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.secondary]}
                    style={styles.wishEmployeeAvatar}
                  >
                    <Text style={styles.wishEmployeeAvatarText}>
                      {selectedEmployeeForWish.name.charAt(0)}
                    </Text>
                  </LinearGradient>
                  <View style={styles.wishEmployeeDetails}>
                    <Text style={styles.wishEmployeeName}>{selectedEmployeeForWish.name}</Text>
                    <Text style={styles.wishEmployeeDesignation}>
                      {selectedEmployeeForWish.designation}
                    </Text>
                  </View>
                </View>

                <TextInput
                  style={styles.wishInput}
                  placeholder="Type your wish message..."
                  placeholderTextColor={COLORS.lightGray}
                  value={wishMessage}
                  onChangeText={setWishMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <View style={styles.wishModalButtons}>
                  <TouchableOpacity
                    onPress={() => setIsWishModalOpen(false)}
                    style={styles.wishCancelButton}
                  >
                    <Text style={styles.wishCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={sendWish}
                    style={[
                      styles.wishSendButton,
                      (!wishMessage.trim() || sendingWish) && styles.wishSendButtonDisabled
                    ]}
                    disabled={!wishMessage.trim() || sendingWish}
                  >
                    {sendingWish ? (
                      <ActivityIndicator size="small" color={COLORS.white} />
                    ) : (
                      <Text style={styles.wishSendButtonText}>Send Wish</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading Calendar...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(106, 90, 205, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  celebrationContent: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
  },
  celebrationText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 30,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  statCardGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyPanel: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 400,
  },
  historyPanelGradient: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyItemHeader: {
    marginBottom: 12,
  },
  historySenderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  senderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  historySenderName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  wishBubble: {
    backgroundColor: '#F0F4FF',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  wishText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  historyReceiver: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  receiverName: {
    fontWeight: '600',
    color: COLORS.primary,
  },
  replyContainer: {
    backgroundColor: '#F8F9FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  replyLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.info,
    textTransform: 'uppercase',
  },
  replyText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  replyDate: {
    fontSize: 9,
    color: COLORS.textSecondary,
  },
  replyAction: {
    marginTop: 8,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
  },
  replyButtonText: {
    fontSize: 11,
    color: COLORS.info,
    fontWeight: '600',
  },
  replyInputContainer: {
    marginTop: 8,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    backgroundColor: COLORS.white,
    marginBottom: 8,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  replyButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.info,
  },
  sendButtonText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 32,
  },
  emptyHistoryText: {
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  calendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthDisplay: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  yearText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.info,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    alignSelf: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  todayButtonText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '600',
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: (width - 72) / 7,
    height: (width - 72) / 7,
    margin: 2,
  },
  dayCell: {
    width: (width - 72) / 7,
    height: (width - 72) / 7,
    margin: 2,
    borderRadius: 16,
    padding: 4,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  todayCell: {
    backgroundColor: COLORS.info,
    borderColor: COLORS.info,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  todayNumber: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  weekendNumber: {
    color: COLORS.error,
  },
  eventIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 2,
  },
  eventIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventCountBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventCountText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  legendCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
  },
  legendIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  legendCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  quickStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  quickStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dayModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '70%',
  },
  dayModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayModalDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  dayModalEventCount: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  dayModalBody: {
    padding: 20,
    maxHeight: 400,
  },
  dayEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#F8F9FF',
    borderRadius: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  dayEventIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayEventInfo: {
    flex: 1,
  },
  dayEventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dayEventType: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dayEventWishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.birthday,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  dayEventWishText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalList: {
    padding: 20,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  modalItemLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  modalItemDate: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.info,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalItemDay: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalItemDetail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalItemTags: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  locationTag: {
    backgroundColor: '#F3F4F6',
  },
  tagText: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.info,
  },
  modalItemRight: {
    marginLeft: 8,
  },
  wishButton: {
    backgroundColor: COLORS.birthday,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  wishedButton: {
    backgroundColor: '#D1FAE5',
  },
  wishButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
  },
  wishedButtonText: {
    color: COLORS.success,
  },
  noEvents: {
    alignItems: 'center',
    padding: 32,
  },
  noEventsText: {
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalButton: {
    backgroundColor: COLORS.info,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  wishModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 30,
    margin: 20,
    padding: 20,
  },
  wishModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  wishModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  wishModalBody: {
    gap: 20,
  },
  wishEmployeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F8F9FF',
    padding: 16,
    borderRadius: 20,
  },
  wishEmployeeAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishEmployeeAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  wishEmployeeDetails: {
    flex: 1,
  },
  wishEmployeeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  wishEmployeeDesignation: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  wishInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    minHeight: 120,
    backgroundColor: '#F8F9FF',
    color: COLORS.textPrimary,
  },
  wishModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  wishCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  wishCancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  wishSendButton: {
    flex: 2,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.birthday,
    alignItems: 'center',
  },
  wishSendButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  wishSendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
    elevation: 9998,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default UnifiedHubCalendarScreen;