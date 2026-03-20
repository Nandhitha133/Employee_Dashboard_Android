// screens/ResumeRepositoryScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Linking,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { resumeAPI, BASE_URL } from '../services/resumeAPI';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  filterBg: '#F9FAFB',
  red: '#EF4444',
  redLight: '#FEE2E2',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  indigoDark: '#262760',
  blue: '#3B82F6',
  blueLight: '#EBF5FF',
  green: '#10B981',
  greenLight: '#E8F5E9',
  purple: '#9B59B6',
  purpleLight: '#F3E8FF',
  pink: '#EC4899',
  pinkLight: '#FCE7F3',
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  shadow: '#000000',
};

interface Resume {
  _id: string;
  candidateName: string;
  email: string;
  phone: string;
  division: string;
  experience: number;
  resumeType: string;
  remarks?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FormData {
  candidateName: string;
  email: string;
  phone: string;
  division: string;
  experience: string;
  resumeType: string;
  remarks: string;
  file: any;
}

const divisions = ['SDS', 'TEKLA', 'DAS(Software)', 'Mechanical', 'Electrical'];
const resumeTypes = ['Employee Resume', 'Hiring Resume'];

const ResumeRepositoryScreen = () => {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');

  // Search and filters
  const [search, setSearch] = useState('');
  const [filterDivision, setFilterDivision] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState<FormData>({
    candidateName: '',
    email: '',
    phone: '',
    division: '',
    experience: '',
    resumeType: '',
    remarks: '',
    file: null,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Load resumes on mount and when filters change
  useEffect(() => {
    loadResumes();
  }, [filterDivision, filterType, search]);

  const loadResumes = async () => {
    try {
      setLoading(true);
      setError('');
      setDebugInfo('Loading resumes...');
      
      const params: any = {};
      if (filterDivision && filterDivision !== 'All') params.division = filterDivision;
      if (filterType && filterType !== 'All') params.resumeType = filterType;
      if (search) params.search = search;
      
      console.log('📡 Fetching resumes with params:', params);
      
      const res = await resumeAPI.list(params);
      console.log('✅ API Response:', res.data);
      
      // Handle different response structures
      let list: Resume[] = [];
      const responseData = res.data as any;
      
      if (responseData?.data && Array.isArray(responseData.data)) {
        list = responseData.data;
      } else if (Array.isArray(responseData)) {
        list = responseData;
      } else if (responseData?.resumes && Array.isArray(responseData.resumes)) {
        list = responseData.resumes;
      } else {
        list = [];
      }
      
      setResumes(list);
      setDebugInfo(`✅ Loaded ${list.length} resumes`);
      
      if (list.length === 0) {
        setDebugInfo('No resumes found. Try adjusting filters or add new resumes.');
      }
    } catch (err: any) {
      console.error('❌ Error loading resumes:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load resumes';
      setError(errorMsg);
      setDebugInfo(`❌ Error: ${errorMsg}`);
      setResumes([]);
      
      // Show alert for network issues
      if (err.message?.includes('Network Error')) {
        Alert.alert('Network Error', 'Please check your internet connection and server status.');
      } else if (err.response?.status === 401) {
        Alert.alert('Authentication Error', 'Please login again.');
      } else if (err.response?.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to view resumes.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadResumes();
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.candidateName.trim()) errors.candidateName = 'Candidate Name is required';
    if (!form.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      errors.email = 'Invalid email';
    }
    if (!form.phone.trim()) {
      errors.phone = 'Phone Number is required';
    } else if (!/^\d{10}$/.test(form.phone)) {
      errors.phone = 'Phone must be 10 digits';
    }
    if (!form.division) errors.division = 'Division is required';
    if (form.experience === '' || form.experience === null) {
      errors.experience = 'Experience is required';
    } else if (Number(form.experience) < 0) {
      errors.experience = 'Experience cannot be negative';
    }
    if (!form.resumeType) errors.resumeType = 'Resume Type is required';
    if (!editingId && !form.file) {
      errors.file = 'Resume file is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFileSelect = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });
      if (result[0]) {
        const file = result[0];
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        if (!allowedTypes.includes(file.type || '')) {
          setFormErrors(prev => ({ ...prev, file: 'Only PDF, DOC, and DOCX files are allowed' }));
          return;
        }
        
        if ((file.size || 0) > 5 * 1024 * 1024) {
          setFormErrors(prev => ({ ...prev, file: 'File size must be less than 5MB' }));
          return;
        }
        
        setFormErrors(prev => ({ ...prev, file: '' }));
        setForm(prev => ({ ...prev, file }));
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled
      } else {
        console.error('Error picking file:', err);
        Alert.alert('Error', 'Failed to select file');
      }
    }
  };

  const resetForm = () => {
    setForm({
      candidateName: '',
      email: '',
      phone: '',
      division: '',
      experience: '',
      resumeType: '',
      remarks: '',
      file: null,
    });
    setFormErrors({});
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (resume: Resume) => {
    setEditingId(resume._id);
    setForm({
      candidateName: resume.candidateName || '',
      email: resume.email || '',
      phone: resume.phone || '',
      division: resume.division || '',
      experience: resume.experience != null ? String(resume.experience) : '',
      resumeType: resume.resumeType || '',
      remarks: resume.remarks || '',
      file: null,
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('candidateName', form.candidateName.trim());
      formData.append('email', form.email.trim());
      formData.append('phone', form.phone.trim());
      formData.append('division', form.division);
      formData.append('experience', String(form.experience || 0));
      formData.append('resumeType', form.resumeType);
      if (form.remarks) formData.append('remarks', form.remarks);
      if (form.file) {
        formData.append('file', {
          uri: form.file.uri,
          type: form.file.type,
          name: form.file.name,
        } as any);
      }

      console.log('📤 Submitting resume:', { editingId, formData });

      if (editingId) {
        await resumeAPI.update(editingId, formData);
        Alert.alert('Success', 'Resume updated successfully');
      } else {
        await resumeAPI.create(formData);
        Alert.alert('Success', 'Resume added successfully');
      }

      setShowFormModal(false);
      resetForm();
      loadResumes();
    } catch (err: any) {
      console.error('❌ Error saving resume:', err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save resume';
      setError(errorMsg);
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (resume: Resume) => {
    Alert.alert(
      'Delete Resume',
      `Are you sure you want to delete resume for ${resume.candidateName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await resumeAPI.remove(resume._id);
              Alert.alert('Success', 'Resume deleted successfully');
              loadResumes();
            } catch (err: any) {
              console.error('❌ Error deleting resume:', err);
              Alert.alert('Error', err.response?.data?.message || 'Failed to delete resume');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleView = (resume: Resume) => {
    if (!resume.filePath) {
      Alert.alert('Error', 'No file attached');
      return;
    }
    const url = `${BASE_URL}${resume.filePath}`;
    console.log('📄 Opening file:', url);
    Linking.openURL(url).catch((err) => {
      console.error('❌ Error opening file:', err);
      Alert.alert('Error', 'Cannot open this file');
    });
  };

  const handleDownload = async (resume: Resume) => {
    if (!resume.filePath) {
      Alert.alert('Error', 'No file attached');
      return;
    }
    
    try {
      const url = `${BASE_URL}${resume.filePath}`;
      const fileName = `${resume.candidateName || 'resume'}_${Date.now()}.pdf`;
      const filePath = Platform.OS === 'android'
        ? `${RNFS.CachesDirectoryPath}/${fileName}`
        : `${RNFS.DocumentDirectoryPath}/${fileName}`;

      console.log('📥 Downloading from:', url);
      
      const download = await RNFS.downloadFile({
        fromUrl: url,
        toFile: filePath,
        progress: (res) => {
          const percent = (res.bytesWritten / res.contentLength) * 100;
          console.log(`Download progress: ${percent.toFixed(0)}%`);
        },
      }).promise;

      if (download.statusCode === 200) {
        await Share.open({
          title: 'Download Resume',
          message: 'Resume file',
          url: `file://${filePath}`,
          type: 'application/pdf',
          failOnCancel: false,
        });
        Alert.alert('Success', 'File downloaded successfully');
      } else {
        Alert.alert('Error', `Failed to download file: Status ${download.statusCode}`);
      }
    } catch (error: any) {
      console.error('❌ Error downloading file:', error);
      if (error.message?.includes('User did not share')) {
        return;
      }
      Alert.alert('Error', 'Failed to download file');
    }
  };

  const filteredResumes = useMemo(() => resumes, [resumes]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  // Render each resume item in FlatList for better performance
  const renderResumeItem = ({ item, index }: { item: Resume; index: number }) => (
    <View style={[styles.tableRow, index % 2 === 0 && { backgroundColor: COLORS.white }]}>
      <Text style={[styles.cellText, { width: 60 }]}>{index + 1}</Text>
      <View style={{ width: 150 }}>
        <Text style={styles.employeeNameText}>{item.candidateName}</Text>
      </View>
      <Text style={[styles.cellText, { width: 180 }]} numberOfLines={1}>{item.email}</Text>
      <Text style={[styles.cellText, { width: 100 }]}>{item.division}</Text>
      <View style={{ width: 130 }}>
        <View style={[styles.typeBadge, { backgroundColor: item.resumeType === 'Employee Resume' ? COLORS.indigoLight : COLORS.pinkLight }]}>
          <Text style={[styles.typeBadgeText, { color: item.resumeType === 'Employee Resume' ? COLORS.indigo : COLORS.pink }]}>
            {item.resumeType}
          </Text>
        </View>
      </View>
      <Text style={[styles.cellText, { width: 100, textAlign: 'right' }]}>{item.experience}</Text>
      <Text style={[styles.cellText, { width: 110 }]}>{formatDate(item.createdAt)}</Text>
      
      {/* Actions */}
      <View style={{ width: 160, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={() => {
          setSelectedResume(item);
          setShowViewModal(true);
        }} style={[styles.actionIcon, { backgroundColor: COLORS.indigoLight }]}>
          <Icon name="visibility" size={18} color={COLORS.indigo} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDownload(item)} style={[styles.actionIcon, { backgroundColor: COLORS.blueLight }]}>
          <Icon name="file-download" size={18} color={COLORS.blue} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openEditModal(item)} style={[styles.actionIcon, { backgroundColor: COLORS.greenLight }]}>
          <Icon name="edit" size={18} color={COLORS.green} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)} style={[styles.actionIcon, { backgroundColor: COLORS.redLight }]}>
          <Icon name="delete" size={18} color={COLORS.red} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Resume Repository" showBack={true} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Debug Info (remove in production) */}
        {__DEV__ && debugInfo && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>🔍 {debugInfo}</Text>
          </View>
        )}

        {/* Header Actions */}
        <View style={styles.headerActions}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by candidate name..."
              placeholderTextColor={COLORS.gray}
              style={styles.searchInput}
            />
            {search !== '' && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="close" size={18} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={[styles.actionButton, (showFilters || (filterDivision !== 'All' || filterType !== 'All')) && styles.activeFilterButton]}
            >
              <Icon name="filter-list" size={18} color={showFilters || (filterDivision !== 'All' || filterType !== 'All') ? COLORS.white : COLORS.gray} />
              <Text style={[styles.actionButtonText, (showFilters || (filterDivision !== 'All' || filterType !== 'All')) && styles.activeButtonText]}>Filter</Text>
              {(filterDivision !== 'All' || filterType !== 'All') && <View style={styles.filterBadge} />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={openAddModal}
              style={[styles.actionButton, styles.addButton]}
            >
              <Icon name="add" size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Add Resume</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Error Message */}
        {error !== '' && (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <View style={styles.filterRow}>
              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Division</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={filterDivision}
                    onValueChange={setFilterDivision}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Divisions" value="All" color={COLORS.textPrimary} />
                    {divisions.map(div => (
                      <Picker.Item key={div} label={div} value={div} color={COLORS.textPrimary} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.filterItem}>
                <Text style={styles.filterLabel}>Resume Type</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={filterType}
                    onValueChange={setFilterType}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Types" value="All" color={COLORS.textPrimary} />
                    {resumeTypes.map(type => (
                      <Picker.Item key={type} label={type} value={type} color={COLORS.textPrimary} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            Showing {filteredResumes.length} {filteredResumes.length === 1 ? 'resume' : 'resumes'}
          </Text>
        </View>

        {/* Resumes Table */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading resumes...</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { width: 60 }]}>S.No</Text>
                  <Text style={[styles.tableHeaderText, { width: 150 }]}>Candidate Name</Text>
                  <Text style={[styles.tableHeaderText, { width: 180 }]}>Email</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Division</Text>
                  <Text style={[styles.tableHeaderText, { width: 130 }]}>Resume Type</Text>
                  <Text style={[styles.tableHeaderText, { width: 100, textAlign: 'right' }]}>Exp (Yrs)</Text>
                  <Text style={[styles.tableHeaderText, { width: 110 }]}>Uploaded Date</Text>
                  <Text style={[styles.tableHeaderText, { width: 160, textAlign: 'center' }]}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredResumes.length === 0 ? (
                  <View style={styles.noRecordsContainer}>
                    <IconCommunity name="file-document-outline" size={48} color={COLORS.gray} />
                    <Text style={styles.noRecordsText}>No resumes found</Text>
                    <Text style={styles.noRecordsSubText}>Try adjusting your filters or add a new resume</Text>
                    <TouchableOpacity 
                      onPress={openAddModal}
                      style={styles.addResumeButton}
                    >
                      <Icon name="add" size={16} color={COLORS.white} />
                      <Text style={styles.addResumeButtonText}>Add New Resume</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  filteredResumes.map((resume, idx) => renderResumeItem({ item: resume, index: idx }))
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Resume Modal - keep same as before */}
      <Modal
        visible={showFormModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowFormModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Resume' : 'Add Resume'}</Text>
              <TouchableOpacity onPress={() => {
                setShowFormModal(false);
                resetForm();
              }}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Candidate Name *</Text>
                <TextInput
                  value={form.candidateName}
                  onChangeText={(text) => setForm(prev => ({ ...prev, candidateName: text }))}
                  placeholder="Enter candidate name"
                  style={[styles.formInput, formErrors.candidateName && styles.inputError]}
                  placeholderTextColor={COLORS.gray}
                />
                {formErrors.candidateName && <Text style={styles.errorText}>{formErrors.candidateName}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  value={form.email}
                  onChangeText={(text) => setForm(prev => ({ ...prev, email: text }))}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.formInput, formErrors.email && styles.inputError]}
                  placeholderTextColor={COLORS.gray}
                />
                {formErrors.email && <Text style={styles.errorText}>{formErrors.email}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Phone Number *</Text>
                <TextInput
                  value={form.phone}
                  onChangeText={(text) => setForm(prev => ({ ...prev, phone: text.replace(/[^0-9]/g, '').slice(0, 10) }))}
                  placeholder="Enter 10-digit phone number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  style={[styles.formInput, formErrors.phone && styles.inputError]}
                  placeholderTextColor={COLORS.gray}
                />
                {formErrors.phone && <Text style={styles.errorText}>{formErrors.phone}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Division *</Text>
                <View style={[styles.pickerWrapper, formErrors.division && styles.inputError]}>
                  <Picker
                    selectedValue={form.division}
                    onValueChange={(value) => setForm(prev => ({ ...prev, division: value }))}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="Select Division" value="" color={COLORS.gray} />
                    {divisions.map(div => (
                      <Picker.Item key={div} label={div} value={div} color={COLORS.textPrimary} />
                    ))}
                  </Picker>
                </View>
                {formErrors.division && <Text style={styles.errorText}>{formErrors.division}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Experience (Years) *</Text>
                <TextInput
                  value={form.experience}
                  onChangeText={(text) => setForm(prev => ({ ...prev, experience: text }))}
                  placeholder="Enter years of experience"
                  keyboardType="numeric"
                  style={[styles.formInput, formErrors.experience && styles.inputError]}
                  placeholderTextColor={COLORS.gray}
                />
                {formErrors.experience && <Text style={styles.errorText}>{formErrors.experience}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Resume Type *</Text>
                <View style={[styles.pickerWrapper, formErrors.resumeType && styles.inputError]}>
                  <Picker
                    selectedValue={form.resumeType}
                    onValueChange={(value) => setForm(prev => ({ ...prev, resumeType: value }))}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="Select Resume Type" value="" color={COLORS.gray} />
                    {resumeTypes.map(type => (
                      <Picker.Item key={type} label={type} value={type} color={COLORS.textPrimary} />
                    ))}
                  </Picker>
                </View>
                {formErrors.resumeType && <Text style={styles.errorText}>{formErrors.resumeType}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Upload Resume {editingId ? '(leave blank to keep existing)' : '*'}</Text>
                <TouchableOpacity onPress={handleFileSelect} style={styles.fileButton}>
                  <Icon name="cloud-upload" size={20} color={COLORS.info} />
                  <Text style={styles.fileButtonText}>
                    {form.file ? form.file.name : 'Choose file'}
                  </Text>
                </TouchableOpacity>
                {formErrors.file && <Text style={styles.errorText}>{formErrors.file}</Text>}
                <Text style={styles.fileHint}>Allowed: PDF, DOC, DOCX. Max size 5MB</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Remarks (Optional)</Text>
                <TextInput
                  value={form.remarks}
                  onChangeText={(text) => setForm(prev => ({ ...prev, remarks: text }))}
                  placeholder="Enter any remarks"
                  multiline
                  numberOfLines={3}
                  style={[styles.formInput, styles.textArea]}
                  placeholderTextColor={COLORS.gray}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => {
                  setShowFormModal(false);
                  resetForm();
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={loading}
                style={[styles.submitButton, loading && { backgroundColor: COLORS.gray }]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>{editingId ? 'Update' : 'Save'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Resume Modal - keep same as before */}
      <Modal
        visible={showViewModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowViewModal(false);
          setSelectedResume(null);
        }}
      >
        <View style={styles.viewModalOverlay}>
          <View style={styles.viewModalContent}>
            <View style={styles.viewModalHeader}>
              <View style={styles.viewModalAvatar}>
                <Text style={styles.viewModalAvatarText}>
                  {selectedResume ? getInitials(selectedResume.candidateName) : '?'}
                </Text>
              </View>
              <View style={styles.viewModalTitleContainer}>
                <Text style={styles.viewModalTitle}>
                  {selectedResume?.candidateName}
                </Text>
                <Text style={styles.viewModalSubtitle}>
                  {selectedResume?.resumeType} • {selectedResume?.division}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setShowViewModal(false);
                setSelectedResume(null);
              }} style={styles.viewModalClose}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {selectedResume && (
              <ScrollView style={styles.viewModalBody}>
                <View style={styles.viewModalGrid}>
                  <View style={[styles.viewModalCard, { backgroundColor: COLORS.indigoLight }]}>
                    <Text style={styles.viewModalCardLabel}>Email</Text>
                    <Text style={styles.viewModalCardValue}>{selectedResume.email}</Text>
                  </View>
                  <View style={[styles.viewModalCard, { backgroundColor: COLORS.pinkLight }]}>
                    <Text style={styles.viewModalCardLabel}>Phone</Text>
                    <Text style={styles.viewModalCardValue}>{selectedResume.phone}</Text>
                  </View>
                  <View style={[styles.viewModalCard, { backgroundColor: COLORS.purpleLight }]}>
                    <Text style={styles.viewModalCardLabel}>Experience</Text>
                    <Text style={styles.viewModalCardValue}>{selectedResume.experience} years</Text>
                  </View>
                  <View style={[styles.viewModalCard, { backgroundColor: COLORS.emeraldLight }]}>
                    <Text style={styles.viewModalCardLabel}>Uploaded</Text>
                    <Text style={styles.viewModalCardValue}>{formatDate(selectedResume.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.viewModalRemarksCard}>
                  <Text style={styles.viewModalRemarksLabel}>Remarks</Text>
                  <Text style={styles.viewModalRemarksValue}>
                    {selectedResume.remarks || 'No remarks added.'}
                  </Text>
                </View>

                <View style={styles.viewModalTags}>
                  <View style={[styles.tag, { backgroundColor: selectedResume.resumeType === 'Employee Resume' ? COLORS.indigoLight : COLORS.pinkLight }]}>
                    <Text style={[styles.tagText, { color: selectedResume.resumeType === 'Employee Resume' ? COLORS.indigo : COLORS.pink }]}>
                      {selectedResume.resumeType}
                    </Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: COLORS.gray + '20' }]}>
                    <Text style={styles.tagText}>{selectedResume.division}</Text>
                  </View>
                </View>

                <View style={styles.viewModalActions}>
                  <TouchableOpacity onPress={() => handleView(selectedResume)} style={[styles.viewModalButton, styles.viewButton]}>
                    <Icon name="visibility" size={18} color={COLORS.white} />
                    <Text style={styles.viewModalButtonText}>Open Resume</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDownload(selectedResume)} style={[styles.viewModalButton, styles.downloadButton]}>
                    <Icon name="file-download" size={18} color={COLORS.indigo} />
                    <Text style={[styles.viewModalButtonText, { color: COLORS.indigo }]}>Download</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => {
                setShowViewModal(false);
                setSelectedResume(null);
              }}
              style={styles.viewModalCloseButton}
            >
              <Text style={styles.viewModalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Resume Repository • Company & Resources • "
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  debugContainer: {
    backgroundColor: '#FEF3C7',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  debugText: {
    fontSize: 11,
    color: '#92400E',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  headerActions: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },
  activeButtonText: {
    color: COLORS.white,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.redLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  filtersPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  filterItem: {
    minWidth: 160,
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
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    minWidth: 160,
  },
  picker: {
    height: 48,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
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
  addResumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  addResumeButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
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
  employeeNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionIcon: {
    padding: 6,
    borderRadius: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
    maxHeight: height - 150,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.filterBg,
  },
  fileButtonText: {
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.info,
  },
  fileHint: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 4,
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
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  viewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
  },
  viewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  viewModalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.indigo,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  viewModalAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  viewModalTitleContainer: {
    flex: 1,
  },
  viewModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  viewModalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  viewModalClose: {
    padding: 4,
  },
  viewModalBody: {
    maxHeight: 400,
  },
  viewModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  viewModalCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 12,
  },
  viewModalCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  viewModalCardValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  viewModalRemarksCard: {
    backgroundColor: COLORS.filterBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  viewModalRemarksLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  viewModalRemarksValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  viewModalTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  viewModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  viewModalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  viewButton: {
    backgroundColor: COLORS.indigo,
  },
  downloadButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.indigo,
  },
  viewModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  viewModalCloseButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  viewModalCloseButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default ResumeRepositoryScreen;