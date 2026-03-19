// screens/AnnouncementManagementScreen.tsx
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
  TextInput,
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { authAPI, Announcement as ApiAnnouncement } from '../services/api';
import { Picker } from '@react-native-picker/picker';
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
  darkBlue: '#1e2b58',
  lightBlue: '#EBF5FF',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC',
  selectedBg: '#E6F0FF',
  dropdownBg: '#FFFFFF',
  dropdownText: '#000000',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  amber: '#F59E0B',
  amberLight: '#FFFBEB',
  yellow: '#FBBF24',
  yellowLight: '#FEF3C7',
};

// Local interface that matches your API structure
interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
  // Additional fields for UI state (not sent to API)
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

interface AnnouncementForm {
  title: string;
  message: string;
  date: string; // API uses 'date' field
}

const AnnouncementManagementScreen = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  const [form, setForm] = useState<AnnouncementForm>({
    title: '',
    message: '',
    date: ''
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await authAPI.announcement.getAll();
      
      // Handle different response structures
      let apiData: ApiAnnouncement[] = [];
      if (response.data) {
        apiData = response.data;
      } else if (Array.isArray(response)) {
        apiData = response;
      }
      
      // Transform API data to match our Announcement interface
      const transformedData: Announcement[] = apiData.map((item: any) => ({
        id: item.id || item._id || '',
        title: item.title || '',
        message: item.message || '',
        date: item.date || '',
        // For UI purposes (you can derive these from date if needed)
        isActive: true,
        startDate: item.date,
        endDate: item.date,
      }));
      
      setAnnouncements(transformedData);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showNotification('Failed to load announcements', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnouncements();
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return;
    }
    if (!form.message.trim()) {
      Alert.alert('Validation Error', 'Message is required');
      return;
    }

    setSubmitting(true);
    try {
      // Prepare data for API - matches the ApiAnnouncement structure
      const apiData = {
        title: form.title,
        message: form.message,
        date: form.date || new Date().toISOString(),
      };

      if (editingId) {
        await authAPI.announcement.update(editingId, apiData);
        showNotification('Announcement updated successfully', 'success');
      } else {
        await authAPI.announcement.create(apiData);
        showNotification('Announcement published successfully', 'success');
      }
      
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error('Error saving announcement:', error);
      showNotification('Error saving announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setForm({
      title: announcement.title || '',
      message: announcement.message || '',
      date: announcement.date || ''
    });
    setEditingId(announcement.id);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Announcement',
      'Are you sure you want to delete this announcement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await authAPI.announcement.delete(id);
              fetchAnnouncements();
              showNotification('Announcement deleted successfully', 'success');
            } catch (error) {
              console.error('Error deleting announcement:', error);
              showNotification('Error deleting announcement', 'error');
            }
          }
        }
      ]
    );
  };

  // Remove toggleActive since API doesn't support isActive
  // const toggleActive = ... (removed)

  const resetForm = () => {
    setForm({
      title: '',
      message: '',
      date: ''
    });
    setEditingId(null);
  };

  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      setForm({ ...form, date: `${year}-${month}-${day}` });
    }
  };

  const renderNotification = () => {
    if (!notification.visible) return null;
    
    const bgColor = notification.type === 'success' ? COLORS.green : COLORS.red;
    
    return (
      <View style={{ position: 'absolute', top: 60, left: 20, right: 20, zIndex: 1000 }}>
        <View style={{ backgroundColor: bgColor, borderRadius: 8, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}>
          <Icon name={notification.type === 'success' ? 'check-circle' : 'error'} size={20} color={COLORS.white} />
          <Text style={{ color: COLORS.white, marginLeft: 8, flex: 1 }}>{notification.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Announcement Management" 
        showBack={true}
      />

      {renderNotification()}

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Form Section */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 }}>
            {editingId ? 'Edit Announcement' : 'Create New Announcement'}
          </Text>

          {/* Title Input */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>Title *</Text>
            <TextInput
              value={form.title}
              onChangeText={(text) => setForm({ ...form, title: text })}
              placeholder="Enter announcement title"
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                backgroundColor: COLORS.white,
                color: COLORS.textPrimary,
              }}
              placeholderTextColor={COLORS.gray}
            />
          </View>

          {/* Message Input */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>Message *</Text>
            <TextInput
              value={form.message}
              onChangeText={(text) => setForm({ ...form, message: text })}
              placeholder="Enter announcement message"
              multiline
              numberOfLines={4}
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                backgroundColor: COLORS.white,
                color: COLORS.textPrimary,
                textAlignVertical: 'top',
                minHeight: 100,
              }}
              placeholderTextColor={COLORS.gray}
            />
          </View>

          {/* Date Input */}
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>Date</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                padding: 12,
                backgroundColor: COLORS.white,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Icon name="date-range" size={20} color={COLORS.gray} />
              <Text style={{ marginLeft: 8, color: form.date ? COLORS.textPrimary : COLORS.gray, flex: 1 }}>
                {form.date ? formatDateForDisplay(form.date) : 'Select date'}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={form.date ? new Date(form.date) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
              />
            )}
          </View>

          {/* Form Buttons */}
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={{
                backgroundColor: submitting ? COLORS.gray : COLORS.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
                marginRight: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={{ marginLeft: 8, color: COLORS.white, fontWeight: '600' }}>Saving...</Text>
                </>
              ) : (
                <>
                  <Icon name={editingId ? 'update' : 'add'} size={20} color={COLORS.white} />
                  <Text style={{ marginLeft: 8, color: COLORS.white, fontWeight: '600' }}>
                    {editingId ? 'Update Announcement' : 'Publish Announcement'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity
                onPress={resetForm}
                style={{
                  backgroundColor: COLORS.white,
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancel Edit</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Existing Announcements */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: COLORS.primary, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.white }}>
              Existing Announcements ({announcements.length})
            </Text>
          </View>

          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading announcements...</Text>
            </View>
          ) : announcements.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Icon name="announcement" size={64} color={COLORS.lightGray} />
              <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontWeight: '500' }}>
                No announcements yet
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 8 }}>
                Create your first announcement!
              </Text>
            </View>
          ) : (
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 4 }}>
                  <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>S.No</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Title</Text>
                  <Text style={{ width: 250, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Message</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Date</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {announcements.map((item, index) => {
                  const itemId = item.id;
                  return (
                    <View key={itemId || index} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                      <Text style={{ width: 50, fontSize: 12, textAlign: 'center', color: COLORS.textPrimary }}>{index + 1}</Text>
                      <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{item.title || '-'}</Text>
                      <Text style={{ width: 250, fontSize: 12, color: COLORS.textSecondary }} numberOfLines={2}>{item.message || '-'}</Text>
                      <Text style={{ width: 120, fontSize: 12, color: COLORS.textSecondary }}>{formatDateForDisplay(item.date)}</Text>
                      
                      {/* Actions */}
                      <View style={{ width: 150, flexDirection: 'row', justifyContent: 'center' }}>
                        <TouchableOpacity onPress={() => handleEdit(item)} style={{ padding: 6, backgroundColor: COLORS.lightBlue, borderRadius: 4, marginHorizontal: 2 }}>
                          <Icon name="edit" size={18} color={COLORS.blue} />
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => handleDelete(itemId)} style={{ padding: 6, backgroundColor: '#FEE2E2', borderRadius: 4, marginHorizontal: 2 }}>
                          <Icon name="delete" size={18} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Announcement Management • Notifications • "
      />
    </SafeAreaView>
  );
};

export default AnnouncementManagementScreen;