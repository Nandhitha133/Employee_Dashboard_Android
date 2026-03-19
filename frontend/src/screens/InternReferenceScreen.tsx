// screens/InternReferenceScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { internAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import Share from 'react-native-share';
import { generatePDF } from 'react-native-html-to-pdf';

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
  teal: '#14B8A6',
  tealLight: '#CCFBF1',
  pink: '#EC4899',
  pinkLight: '#FCE7F3',
  cyan: '#06B6D4',
  cyanLight: '#CFFAFE',
};

interface Intern {
  _id?: string;
  id?: string;
  fullName: string;
  collegeName: string;
  degree: string;
  department: string;
  internshipType: string;
  mentor: string;
  referenceNote?: string;
  startDate: string;
  endDate: string;
  status: string;
  contactEmail: string;
  contactPhone: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

interface FormData {
  fullName: string;
  collegeName: string;
  degree: string;
  department: string;
  internshipType: string;
  mentor: string;
  referenceNote: string;
  startDate: string;
  endDate: string;
  status: string;
  contactEmail: string;
  contactPhone: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
}

interface Errors {
  [key: string]: string;
}

const InternReferenceScreen = () => {
  const [interns, setInterns] = useState<Intern[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewIntern, setViewIntern] = useState<Intern | null>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const [form, setForm] = useState<FormData>({
    fullName: '',
    collegeName: '',
    degree: '',
    department: '',
    internshipType: 'Internship',
    mentor: '',
    referenceNote: '',
    startDate: '',
    endDate: '',
    status: 'Completed',
    contactEmail: '',
    contactPhone: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });

  const [errors, setErrors] = useState<Errors>({});

  // Filter options
  const internshipTypes = [
    'Internship',
    'Inplant Training',
    'Project Internship',
    'Summer Internship',
    'Winter Internship'
  ];

  const statusOptions = ['Completed', 'Ongoing', 'Terminated'];

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await internAPI.getAll();

      // Handle different response formats
      let internsData: Intern[] = [];

      if (Array.isArray(response.data)) {
        internsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        internsData = response.data.data;
      } else if (Array.isArray(response)) {
        internsData = response;
      } else if (response && response.data && typeof response.data === 'object') {
        internsData = [response.data as Intern];
      }

      setInterns(internsData);
    } catch (error) {
      console.error('Error loading interns:', error);
      showMessage('Failed to load intern data', 'error');
      setInterns([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 3000);
  };

  

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const validateForm = (): boolean => {
    const newErrors: Errors = {};

    if (!form.fullName.trim()) newErrors.fullName = 'Full Name is required';
    if (!form.collegeName.trim()) newErrors.collegeName = 'College Name is required';
    if (!form.degree.trim()) newErrors.degree = 'Degree is required';
    if (!form.department.trim()) newErrors.department = 'Department is required';
    if (!form.mentor.trim()) newErrors.mentor = 'Mentor is required';
    if (!form.bankName.trim()) newErrors.bankName = 'Bank Name is required';

    if (!form.accountNumber.trim()) {
      newErrors.accountNumber = 'Account Number is required';
    } else if (!/^\d+$/.test(form.accountNumber)) {
      newErrors.accountNumber = 'Account Number must contain only digits';
    }

    if (!form.ifscCode.trim()) newErrors.ifscCode = 'IFSC Code is required';

    if (!form.contactEmail.trim()) {
      newErrors.contactEmail = 'Contact Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format';
    }

    if (!form.contactPhone.trim()) {
      newErrors.contactPhone = 'Contact Phone is required';
    } else if (!/^\d{10}$/.test(form.contactPhone)) {
      newErrors.contactPhone = 'Phone must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showMessage('Please fix the errors in the form', 'error');
      return;
    }

    try {
      const internData: Intern = {
        ...form,
        startDate: form.startDate || new Date().toISOString().split('T')[0],
        endDate: form.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };

      if (editingId) {
        await internAPI.update(editingId, internData);
        showMessage('Intern details updated successfully!', 'success');
      } else {
        await internAPI.create(internData);
        showMessage('Intern added successfully!', 'success');
      }

      loadData();
      resetForm();
      setShowModal(false);
    } catch (error: any) {
      console.error('Error saving intern:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to save intern details';
      showMessage(errorMessage, 'error');
    }
  };

  const handleEdit = (intern: Intern) => {
    setEditingId(intern._id || intern.id || null);
    setForm({
      fullName: intern.fullName || '',
      collegeName: intern.collegeName || '',
      degree: intern.degree || '',
      department: intern.department || '',
      internshipType: intern.internshipType || 'Internship',
      mentor: intern.mentor || '',
      referenceNote: intern.referenceNote || '',
      startDate: intern.startDate ? new Date(intern.startDate).toISOString().split('T')[0] : '',
      endDate: intern.endDate ? new Date(intern.endDate).toISOString().split('T')[0] : '',
      status: intern.status || 'Completed',
      contactEmail: intern.contactEmail || '',
      contactPhone: intern.contactPhone || '',
      bankName: intern.bankName || '',
      accountNumber: intern.accountNumber || '',
      ifscCode: intern.ifscCode || ''
    });
    setShowModal(true);
  };

  const handleDelete = (intern: Intern) => {
    Alert.alert(
      'Delete Intern',
      `Are you sure you want to delete ${intern.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const id = intern._id || intern.id;
              if (!id) return;
              await internAPI.remove(id);
              showMessage('Intern deleted successfully!', 'success');
              loadData();
            } catch (error) {
              console.error('Error deleting intern:', error);
              showMessage('Failed to delete intern', 'error');
            }
          }
        }
      ]
    );
  };

  const handleView = (intern: Intern) => {
    setViewIntern(intern);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setForm({
      fullName: '',
      collegeName: '',
      degree: '',
      department: '',
      internshipType: 'Internship',
      mentor: '',
      referenceNote: '',
      startDate: '',
      endDate: '',
      status: 'Completed',
      contactEmail: '',
      contactPhone: '',
      bankName: '',
      accountNumber: '',
      ifscCode: ''
    });
    setEditingId(null);
    setErrors({});
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Filter interns
  const safeInterns = Array.isArray(interns) ? interns : [];

  const filteredInterns = safeInterns.filter(intern => {
    if (!intern) return false;

    const matchesSearch = searchTerm === '' ||
      (intern.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (intern.collegeName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (intern.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (intern.mentor?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesFilter = filterType === 'all' || intern.internshipType === filterType;
    const matchesStatus = filterStatus === 'all' || intern.status === filterStatus;

    return matchesSearch && matchesFilter && matchesStatus;
  });

  const handleDownloadPDF = async () => {
    if (filteredInterns.length === 0) {
      showMessage('No records available to download', 'error');
      return;
    }

    try {
      // Create HTML content for PDF
      let htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { color: #262760; font-size: 24px; margin-bottom: 5px; }
              .date { color: #666; font-size: 12px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #262760; color: white; padding: 10px; text-align: left; font-size: 12px; }
              td { padding: 8px 10px; border-bottom: 1px solid #ddd; font-size: 11px; }
              tr:nth-child(even) { background-color: #f9f9f9; }
            </style>
          </head>
          <body>
            <h1>Intern Reference List</h1>
            <div class="date">Generated on: ${new Date().toLocaleDateString()}</div>
            <table>
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Full Name</th>
                  <th>Degree</th>
                  <th>Internship Type</th>
                  <th>Company Mentor</th>
                  <th>Contact No</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
      `;

      filteredInterns.forEach((intern, index) => {
        htmlContent += `
          <tr>
            <td>${index + 1}</td>
            <td>${intern.fullName || 'N/A'}</td>
            <td>${intern.degree || 'N/A'}</td>
            <td>${intern.internshipType || 'N/A'}</td>
            <td>${intern.mentor || 'N/A'}</td>
            <td>${intern.contactPhone || 'N/A'}</td>
            <td>${intern.status || 'N/A'}</td>
          </tr>
        `;
      });

      htmlContent += `
              </tbody>
            </table>
          </body>
        </html>
      `;

      const options = {
        html: htmlContent,
        fileName: `intern_reference_list_${Date.now()}`,
        directory: 'Documents',
      };

      const file = await generatePDF(options);
      
      const shareOptions = {
        title: 'Export Intern List',
        message: 'Intern Reference List',
        url: `file://${file.filePath}`,
        type: 'application/pdf',
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      console.error('Error generating PDF:', error);
      showMessage('Failed to generate PDF', 'error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return COLORS.green;
      case 'Ongoing': return COLORS.warning;
      case 'Terminated': return COLORS.red;
      default: return COLORS.gray;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'Completed': return COLORS.greenLight;
      case 'Ongoing': return COLORS.yellowLight;
      case 'Terminated': return COLORS.redLight;
      default: return COLORS.filterBg;
    }
  };

  const isFilterApplied = searchTerm || filterType !== 'all' || filterStatus !== 'all';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Intern Reference" 
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

        {/* Search and Filter Section */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Search & Filters</Text>
            {isFilterApplied && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterStatus('all');
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Icon name="clear-all" size={18} color={COLORS.red} />
                <Text style={{ color: COLORS.red, fontSize: 13, marginLeft: 4 }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Input */}
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.filterBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
              <Icon name="search" size={20} color={COLORS.gray} />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search by name, college, department, or mentor..."
                placeholderTextColor={COLORS.gray}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: COLORS.textPrimary,
                }}
              />
              {searchTerm !== '' && (
                <TouchableOpacity onPress={() => setSearchTerm('')}>
                  <Icon name="close" size={18} color={COLORS.gray} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter Row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Type</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterType}
                  onValueChange={(value) => setFilterType(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Types" value="all" color={COLORS.gray} />
                  {internshipTypes.map(type => (
                    <Picker.Item key={type} label={type} value={type} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Status</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterStatus}
                  onValueChange={(value) => setFilterStatus(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Status" value="all" color={COLORS.gray} />
                  {statusOptions.map(status => (
                    <Picker.Item key={status} label={status} value={status} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={handleDownloadPDF}
            style={{
              flex: 1,
              backgroundColor: COLORS.gray,
              paddingVertical: 14,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <Icon name="file-download" size={20} color={COLORS.white} />
            <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 14, fontWeight: '500' }}>Download PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openAddModal}
            style={{
              flex: 1,
              backgroundColor: COLORS.primary,
              paddingVertical: 14,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="add" size={20} color={COLORS.white} />
            <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 14, fontWeight: '500' }}>Add New Intern</Text>
          </TouchableOpacity>
        </View>

        {/* Results Count */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            Showing {filteredInterns.length} {filteredInterns.length === 1 ? 'record' : 'records'}
          </Text>
          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={{ marginLeft: 8, color: COLORS.primary, fontSize: 12 }}>Loading...</Text>
            </View>
          )}
        </View>

        {/* Interns Table */}
        {loading && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading intern data...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 8 }}>
                  <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>S.No</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Full Name</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Degree</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Internship Type</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Company Mentor</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Contact No</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Account No</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Status</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredInterns.length === 0 ? (
                  <View style={{ padding: 50, alignItems: 'center' }}>
                    <IconCommunity name="account-group" size={48} color={COLORS.gray} />
                    <Text style={{ marginTop: 12, color: COLORS.gray, fontSize: 16 }}>No interns found</Text>
                    <Text style={{ marginTop: 4, color: COLORS.lightGray, fontSize: 13 }}>Add your first intern using the button above!</Text>
                  </View>
                ) : filteredInterns.map((intern, index) => (
                  <View key={intern._id || intern.id || index} style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.filterBg }}>
                    <Text style={{ width: 50, fontSize: 13, color: COLORS.textPrimary }}>{index + 1}</Text>
                    <Text style={{ width: 150, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{intern.fullName || 'N/A'}</Text>
                    <Text style={{ width: 120, fontSize: 13, color: COLORS.textSecondary }}>{intern.degree || 'N/A'}</Text>
                    <Text style={{ width: 120, fontSize: 13, color: COLORS.textSecondary }}>{intern.internshipType || 'N/A'}</Text>
                    <Text style={{ width: 120, fontSize: 13, color: COLORS.textSecondary }}>{intern.mentor || 'N/A'}</Text>
                    <Text style={{ width: 100, fontSize: 13, color: COLORS.textSecondary }}>{intern.contactPhone || 'N/A'}</Text>
                    <Text style={{ width: 150, fontSize: 13, color: COLORS.textSecondary }}>{intern.accountNumber || 'N/A'}</Text>
                    
                    {/* Status Badge */}
                    <View style={{ width: 100, alignItems: 'center' }}>
                      <View style={{ 
                        backgroundColor: getStatusBgColor(intern.status || ''),
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}>
                        <Text style={{ fontSize: 11, color: getStatusColor(intern.status || ''), fontWeight: '500' }}>
                          {intern.status || 'N/A'}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={{ width: 150, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' }}>
                      <TouchableOpacity onPress={() => handleView(intern)} style={{ padding: 6, backgroundColor: '#14B8A620', borderRadius: 20 }}>
                        <Icon name="visibility" size={18} color={COLORS.teal} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEdit(intern)} style={{ padding: 6, backgroundColor: COLORS.blueLight, borderRadius: 20 }}>
                        <Icon name="edit" size={18} color={COLORS.blue} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(intern)} style={{ padding: 6, backgroundColor: COLORS.redLight, borderRadius: 20 }}>
                        <Icon name="delete" size={18} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconCommunity name="school" size={24} color={COLORS.white} />
                <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: '600', color: COLORS.white }}>
                  {editingId ? 'Edit Intern Details' : 'Add New Intern'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={true}>
              {/* Personal Information */}
              <View style={{ backgroundColor: COLORS.blueLight, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="person" size={20} color={COLORS.blue} />
                  <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.blue }}>Personal Information</Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Full Name *</Text>
                  <TextInput
                    value={form.fullName}
                    onChangeText={(text) => {
                      setForm({ ...form, fullName: text });
                      if (errors.fullName) setErrors({ ...errors, fullName: '' });
                    }}
                    placeholder="Enter full name"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.fullName ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  {errors.fullName && <Text style={{ color: COLORS.red, fontSize: 12, marginTop: 2 }}>{errors.fullName}</Text>}
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>College Name *</Text>
                  <TextInput
                    value={form.collegeName}
                    onChangeText={(text) => {
                      setForm({ ...form, collegeName: text });
                      if (errors.collegeName) setErrors({ ...errors, collegeName: '' });
                    }}
                    placeholder="Enter college name"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.collegeName ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  {errors.collegeName && <Text style={{ color: COLORS.red, fontSize: 12, marginTop: 2 }}>{errors.collegeName}</Text>}
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Degree *</Text>
                    <TextInput
                      value={form.degree}
                      onChangeText={(text) => {
                        setForm({ ...form, degree: text });
                        if (errors.degree) setErrors({ ...errors, degree: '' });
                      }}
                      placeholder="e.g., B.Tech, B.Sc"
                      style={{
                        borderWidth: 1,
                        borderColor: errors.degree ? COLORS.red : COLORS.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 14,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                      }}
                      placeholderTextColor={COLORS.gray}
                    />
                    {errors.degree && <Text style={{ color: COLORS.red, fontSize: 12, marginTop: 2 }}>{errors.degree}</Text>}
                  </View>

                  <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Department *</Text>
                    <TextInput
                      value={form.department}
                      onChangeText={(text) => {
                        setForm({ ...form, department: text });
                        if (errors.department) setErrors({ ...errors, department: '' });
                      }}
                      placeholder="e.g., Computer Science"
                      style={{
                        borderWidth: 1,
                        borderColor: errors.department ? COLORS.red : COLORS.border,
                        borderRadius: 8,
                        padding: 12,
                        fontSize: 14,
                        backgroundColor: COLORS.white,
                        color: COLORS.textPrimary,
                      }}
                      placeholderTextColor={COLORS.gray}
                    />
                    {errors.department && <Text style={{ color: COLORS.red, fontSize: 12, marginTop: 2 }}>{errors.department}</Text>}
                  </View>
                </View>
              </View>

              {/* Contact Information */}
              <View style={{ backgroundColor: COLORS.purple, padding: 16, borderRadius: 8, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="phone" size={20} color={COLORS.white} />
                  <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.white }}>Contact Information</Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.white, marginBottom: 4 }}>Contact Email *</Text>
                  <TextInput
                    value={form.contactEmail}
                    onChangeText={(text) => {
                      setForm({ ...form, contactEmail: text });
                      if (errors.contactEmail) setErrors({ ...errors, contactEmail: '' });
                    }}
                    placeholder="student@college.edu"
                    keyboardType="email-address"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.contactEmail ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  {errors.contactEmail && <Text style={{ color: COLORS.red, fontSize: 12, marginTop: 2 }}>{errors.contactEmail}</Text>}
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.white, marginBottom: 4 }}>Contact Phone *</Text>
                  <TextInput
                    value={form.contactPhone}
                    onChangeText={(text) => {
                      const value = text.replace(/[^0-9]/g, '').slice(0, 10);
                      setForm({ ...form, contactPhone: value });
                      if (errors.contactPhone) setErrors({ ...errors, contactPhone: '' });
                    }}
                    placeholder="10-digit mobile number"
                    keyboardType="numeric"
                    maxLength={10}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.contactPhone ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <Text style={{ fontSize: 11, color: COLORS.white, marginTop: 2 }}>{form.contactPhone.length}/10 digits</Text>
                  {errors.contactPhone && <Text style={{ color: COLORS.red, fontSize: 12, marginTop: 2 }}>{errors.contactPhone}</Text>}
                </View>
              </View>

              {/* Internship Details */}
              <View style={{ backgroundColor: COLORS.indigoLight, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="work" size={20} color={COLORS.indigo} />
                  <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.indigo }}>Internship Details</Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Internship Type</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={form.internshipType}
                      onValueChange={(value) => setForm({ ...form, internshipType: value })}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.indigo}
                    >
                      {internshipTypes.map(type => (
                        <Picker.Item key={type} label={type} value={type} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Company Mentor *</Text>
                  <TextInput
                    value={form.mentor}
                    onChangeText={(text) => {
                      setForm({ ...form, mentor: text });
                      if (errors.mentor) setErrors({ ...errors, mentor: '' });
                    }}
                    placeholder="Enter mentor name"
                    style={{
                      borderWidth: 1,
                      borderColor: errors.mentor ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  {errors.mentor && <Text style={{ color: COLORS.red, fontSize: 12, marginTop: 2 }}>{errors.mentor}</Text>}
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Status</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={form.status}
                      onValueChange={(value) => setForm({ ...form, status: value })}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.indigo}
                    >
                      {statusOptions.map(status => (
                        <Picker.Item key={status} label={status} value={status} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Duration */}
              <View style={{ backgroundColor: COLORS.cyanLight, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="date-range" size={20} color={COLORS.cyan} />
                  <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.cyan }}>Duration & Dates</Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <View style={{ width: '50%', paddingRight: 4, marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Start Date</Text>
                    <TextInput
                      value={form.startDate}
                      onChangeText={(text) => setForm({ ...form, startDate: text })}
                      placeholder="YYYY-MM-DD"
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

                  <View style={{ width: '50%', paddingLeft: 4, marginBottom: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>End Date</Text>
                    <TextInput
                      value={form.endDate}
                      onChangeText={(text) => setForm({ ...form, endDate: text })}
                      placeholder="YYYY-MM-DD"
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
                </View>
              </View>

              {/* Bank Details */}
              <View style={{ backgroundColor: COLORS.tealLight, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="account-balance" size={20} color={COLORS.teal} />
                  <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.teal }}>Bank Details</Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Bank Name *</Text>
                  <TextInput
                    value={form.bankName}
                    onChangeText={(text) => {
                      const value = text.slice(0, 25);
                      setForm({ ...form, bankName: value });
                      if (errors.bankName) setErrors({ ...errors, bankName: '' });
                    }}
                    placeholder="e.g., HDFC Bank"
                    maxLength={25}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.bankName ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{form.bankName.length}/25 characters</Text>
                  {errors.bankName && <Text style={{ color: COLORS.red, fontSize: 12, marginTop: 2 }}>{errors.bankName}</Text>}
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Account Number *</Text>
                  <TextInput
                    value={form.accountNumber}
                    onChangeText={(text) => {
                      const value = text.replace(/[^0-9]/g, '').slice(0, 18);
                      setForm({ ...form, accountNumber: value });
                      if (errors.accountNumber) setErrors({ ...errors, accountNumber: '' });
                    }}
                    placeholder="Enter account number"
                    keyboardType="numeric"
                    maxLength={18}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.accountNumber ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{form.accountNumber.length}/18 digits</Text>
                  {errors.accountNumber && <Text style={{ color: COLORS.red, fontSize: 12, marginTop: 2 }}>{errors.accountNumber}</Text>}
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>IFSC Code *</Text>
                  <TextInput
                    value={form.ifscCode}
                    onChangeText={(text) => {
                      const value = text.toUpperCase().slice(0, 11);
                      setForm({ ...form, ifscCode: value });
                      if (errors.ifscCode) setErrors({ ...errors, ifscCode: '' });
                    }}
                    placeholder="Enter IFSC code"
                    maxLength={11}
                    style={{
                      borderWidth: 1,
                      borderColor: errors.ifscCode ? COLORS.red : COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                  <Text style={{ fontSize: 11, color: COLORS.gray, marginTop: 2 }}>{form.ifscCode.length}/11 characters</Text>
                  {errors.ifscCode && <Text style={{ color: COLORS.red, fontSize: 12, marginTop: 2 }}>{errors.ifscCode}</Text>}
                </View>
              </View>

              {/* Reference Notes */}
              <View style={{ backgroundColor: COLORS.pinkLight, borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="note" size={20} color={COLORS.pink} />
                  <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.pink }}>Reference Notes</Text>
                </View>

                <TextInput
                  value={form.referenceNote}
                  onChangeText={(text) => setForm({ ...form, referenceNote: text })}
                  placeholder="Enter any notes, feedback, or remarks about the intern..."
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
            </ScrollView>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setShowModal(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.gray, borderRadius: 6, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 6, flexDirection: 'row', alignItems: 'center' }}
              >
                <Icon name="check" size={18} color={COLORS.white} />
                <Text style={{ marginLeft: 6, color: COLORS.white, fontWeight: '600' }}>
                  {editingId ? 'Update Intern' : 'Save Intern'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Modal */}
      <Modal
        visible={showViewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 500, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <IconCommunity name="account-circle" size={24} color={COLORS.primary} />
                <Text style={{ marginLeft: 8, fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>Intern Details</Text>
              </View>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {viewIntern && (
              <ScrollView style={{ maxHeight: 500 }}>
                {/* Identity */}
                <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.gray, marginBottom: 8 }}>Identity</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Full Name</Text>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{viewIntern.fullName || '-'}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Degree</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewIntern.degree || '-'}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>Department</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewIntern.department || '-'}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.gray }}>College Name</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewIntern.collegeName || '-'}</Text>
                    </View>
                  </View>
                </View>

                {/* Internship Info */}
                <View style={{ backgroundColor: COLORS.blueLight, borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.blue, marginBottom: 8 }}>Internship Info</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.blue }}>Type</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewIntern.internshipType || '-'}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.blue }}>Mentor</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewIntern.mentor || '-'}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.blue }}>Duration</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textPrimary }}>
                        {viewIntern.startDate ? new Date(viewIntern.startDate).toLocaleDateString() : 'N/A'} - {viewIntern.endDate ? new Date(viewIntern.endDate).toLocaleDateString() : 'N/A'}
                      </Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.blue }}>Status</Text>
                      <View style={{ 
                        backgroundColor: getStatusBgColor(viewIntern.status || ''),
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        alignSelf: 'flex-start',
                        marginTop: 2
                      }}>
                        <Text style={{ fontSize: 11, color: getStatusColor(viewIntern.status || ''), fontWeight: '500' }}>
                          {viewIntern.status || '-'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Contact */}
                <View style={{ backgroundColor: COLORS.purple, padding: 16, borderRadius: 8, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.white, marginBottom: 8 }}>Contact</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.white }}>Email</Text>
                      <Text style={{ fontSize: 13, color: COLORS.white, fontWeight: '500' }}>{viewIntern.contactEmail || '-'}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.white }}>Phone</Text>
                      <Text style={{ fontSize: 13, color: COLORS.white, fontWeight: '500' }}>{viewIntern.contactPhone || '-'}</Text>
                    </View>
                  </View>
                </View>

                {/* Bank Details */}
                <View style={{ backgroundColor: COLORS.tealLight, borderRadius: 8, padding: 16, marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.teal, marginBottom: 8 }}>Bank Details</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '100%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.teal }}>Bank Name</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewIntern.bankName || '-'}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.teal }}>Account No</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewIntern.accountNumber || '-'}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, color: COLORS.teal }}>IFSC Code</Text>
                      <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>{viewIntern.ifscCode || '-'}</Text>
                    </View>
                  </View>
                </View>

                {/* Remarks */}
                {viewIntern.referenceNote && (
                  <View style={{ backgroundColor: COLORS.pinkLight, borderRadius: 8, padding: 16 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.pink, marginBottom: 8 }}>Remarks</Text>
                    <Text style={{ fontSize: 13, color: COLORS.textPrimary, backgroundColor: COLORS.white, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.pinkLight }}>
                      {viewIntern.referenceNote}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowViewModal(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Intern Reference • Training • "
      />
    </SafeAreaView>
  );
};

export default InternReferenceScreen;
