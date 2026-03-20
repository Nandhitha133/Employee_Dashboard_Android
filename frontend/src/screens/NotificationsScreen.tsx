// screens/NotificationsScreen.tsx
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
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { notificationAPI } from '../services/api';
import CommonFooter from '../components/CommonFooter';

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  accent: '#4A148C',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#CCCCCC',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E9ECEF',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  unreadBg: '#EEF2FF',
  lightBg: '#F3F4F6',
};

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, unread, read
  const [selectedType, setSelectedType] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    // Animate when notifications load
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [notifications]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await notificationAPI.getAll();
      setNotifications(response.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markAsRead = async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      Alert.alert('Error', 'Failed to mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const deleteNotification = async (id: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationAPI.delete(id);
              setNotifications(prev => prev.filter(n => n._id !== id));
              Alert.alert('Success', 'Notification deleted');
            } catch (error) {
              console.error('Error deleting notification:', error);
              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  const deleteAllNotifications = async () => {
    Alert.alert(
      'Delete All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete all notifications one by one since deleteAll might not exist
              const deletePromises = notifications.map(n => notificationAPI.delete(n._id));
              await Promise.all(deletePromises);
              setNotifications([]);
              Alert.alert('Success', 'All notifications deleted');
            } catch (error) {
              console.error('Error deleting all notifications:', error);
              Alert.alert('Error', 'Failed to delete notifications');
            }
          },
        },
      ]
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'LOGIN':
        return { icon: 'login', color: COLORS.info, bg: '#EBF5FF' };
      case 'TIMESHEET_SUBMIT':
        return { icon: 'clock-outline', color: COLORS.warning, bg: '#FEF3C7' };
      case 'TIMESHEET_APPROVED':
        return { icon: 'check-circle', color: COLORS.success, bg: '#E8F5E9' };
      case 'TIMESHEET_REJECTED':
        return { icon: 'close-circle', color: COLORS.error, bg: '#FEE2E2' };
      case 'LEAVE_APPLY':
        return { icon: 'calendar', color: COLORS.info, bg: '#EBF5FF' };
      case 'LEAVE_APPROVED':
        return { icon: 'check-circle', color: COLORS.success, bg: '#E8F5E9' };
      case 'LEAVE_REJECTED':
        return { icon: 'close-circle', color: COLORS.error, bg: '#FEE2E2' };
      case 'EXIT_SUBMIT':
        return { icon: 'exit-run', color: COLORS.warning, bg: '#FEF3C7' };
      case 'EXIT_APPROVED':
        return { icon: 'check-circle', color: COLORS.success, bg: '#E8F5E9' };
      case 'EXIT_REJECTED':
        return { icon: 'close-circle', color: COLORS.error, bg: '#FEE2E2' };
      case 'SPECIAL_PERMISSION_SUBMIT':
        return { icon: 'shield-check', color: COLORS.info, bg: '#EBF5FF' };
      case 'SPECIAL_PERMISSION_APPROVED':
        return { icon: 'check-circle', color: COLORS.success, bg: '#E8F5E9' };
      case 'SPECIAL_PERMISSION_REJECTED':
        return { icon: 'close-circle', color: COLORS.error, bg: '#FEE2E2' };
      default:
        return { icon: 'bell', color: COLORS.gray, bg: '#F3F4F6' };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    if (selectedFilter === 'unread' && notification.isRead) return false;
    if (selectedFilter === 'read' && !notification.isRead) return false;
    if (selectedType !== 'all' && notification.type !== selectedType) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const notificationTypes = ['all', ...new Set(notifications.map(n => n.type))];

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce((groups, notification) => {
    const date = new Date(notification.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(notification);
    return groups;
  }, {} as Record<string, NotificationItem[]>);

  const getTypeLabel = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
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
            <IconCommunity name="bell" size={24} color={COLORS.white} />
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.filterButton}>
            <Icon name="filter-list" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statsItem}>
          <IconCommunity name="bell" size={20} color={COLORS.info} />
          <Text style={styles.statsNumber}>{notifications.length}</Text>
          <Text style={styles.statsLabel}>Total</Text>
        </View>
        <View style={styles.statsDivider} />
        <View style={styles.statsItem}>
          <IconCommunity name="bell-ring" size={20} color={COLORS.warning} />
          <Text style={styles.statsNumber}>{unreadCount}</Text>
          <Text style={styles.statsLabel}>Unread</Text>
        </View>
        <View style={styles.statsDivider} />
        <TouchableOpacity onPress={markAllAsRead} style={styles.statsItem}>
          <Icon name="done-all" size={20} color={COLORS.success} />
          <Text style={styles.statsLabel}>Mark All Read</Text>
        </TouchableOpacity>
        {notifications.length > 0 && (
          <>
            <View style={styles.statsDivider} />
            <TouchableOpacity onPress={deleteAllNotifications} style={styles.statsItem}>
              <Icon name="delete-sweep" size={20} color={COLORS.error} />
              <Text style={styles.statsLabel}>Clear All</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Main Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loaderText}>Loading notifications...</Text>
            </View>
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconCommunity name="bell-off-outline" size={80} color={COLORS.lightGray} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyText}>
                {selectedFilter !== 'all' || selectedType !== 'all'
                  ? 'Try changing your filters'
                  : 'You\'re all caught up!'}
              </Text>
            </View>
          ) : (
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
                <View key={date} style={styles.dateSection}>
                  <View style={styles.dateHeader}>
                    <View style={styles.dateLine} />
                    <Text style={styles.dateText}>{date}</Text>
                    <View style={styles.dateLine} />
                  </View>
                  
                  {dateNotifications.map((notification) => {
                    const { icon, color, bg } = getIcon(notification.type);
                    return (
                      <TouchableOpacity
                        key={notification._id}
                        onPress={() => !notification.isRead && markAsRead(notification._id)}
                        style={[
                          styles.notificationCard,
                          !notification.isRead && styles.unreadCard,
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.notificationIcon, { backgroundColor: bg }]}>
                          <IconCommunity name={icon} size={24} color={color} />
                        </View>
                        
                        <View style={styles.notificationContent}>
                          <View style={styles.notificationHeader}>
                            <Text style={styles.notificationTitle}>
                              {notification.title}
                            </Text>
                            {!notification.isRead && <View style={styles.unreadDot} />}
                          </View>
                          
                          <Text style={styles.notificationMessage}>
                            {notification.message}
                          </Text>
                          
                          <View style={styles.notificationFooter}>
                            <View style={styles.typeBadge}>
                              <Text style={styles.typeText}>
                                {getTypeLabel(notification.type)}
                              </Text>
                            </View>
                            <Text style={styles.notificationTime}>
                              {formatDate(notification.createdAt)}
                            </Text>
                          </View>
                        </View>
                        
                        <TouchableOpacity
                          onPress={() => deleteNotification(notification._id)}
                          style={styles.deleteButton}
                        >
                          <Icon name="delete-outline" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Notifications</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Icon name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Status Filter */}
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity
                  onPress={() => setSelectedFilter('all')}
                  style={[
                    styles.filterChip,
                    selectedFilter === 'all' && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 'all' && styles.filterChipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedFilter('unread')}
                  style={[
                    styles.filterChip,
                    selectedFilter === 'unread' && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 'unread' && styles.filterChipTextActive,
                    ]}
                  >
                    Unread ({unreadCount})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setSelectedFilter('read')}
                  style={[
                    styles.filterChip,
                    selectedFilter === 'read' && styles.filterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedFilter === 'read' && styles.filterChipTextActive,
                    ]}
                  >
                    Read
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Type Filter */}
              <Text style={styles.filterSectionTitle}>Type</Text>
              <View style={styles.filterButtons}>
                {notificationTypes.slice(0, 10).map(type => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setSelectedType(type)}
                    style={[
                      styles.filterChip,
                      selectedType === type && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedType === type && styles.filterChipTextActive,
                      ]}
                    >
                      {type === 'all' ? 'All' : getTypeLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedFilter('all');
                  setSelectedType('all');
                }}
                style={styles.resetButton}
              >
                <Text style={styles.resetButtonText}>Reset Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowFilterModal(false)}
                style={styles.applyButton}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Notifications • Stay Updated • "
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
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
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: -20,
    marginBottom: 16,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statsNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statsLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  statsDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 30,
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
    alignItems: 'center',
    padding: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginHorizontal: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unreadCard: {
    backgroundColor: COLORS.unreadBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.info,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.info,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeBadge: {
    backgroundColor: COLORS.lightBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  notificationTime: {
    fontSize: 11,
    color: COLORS.lightGray,
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  modalBody: {
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.lightBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.info,
    borderColor: COLORS.info,
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.lightBg,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.info,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
});

export default NotificationsScreen;