// screens/EmployeeExitFormScreen.tsx
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
  RefreshControl,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { exitFormalityAPI, employeeAPI } from '../services/api';
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
  purpleLight: '#F3E8FF',
  blueLight: '#EBF5FF',
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
};

interface Asset {
  item: string;
  category: string;
  serialNumber: string;
  status: string;
  remarks: string;
  returned?: boolean;
  type?: string;
}

interface EmployeeInfo {
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  joinDate: string;
  email: string;
}

interface FormData {
  _id: string | null;
  proposedLastWorkingDay: string;
  reasonForLeaving: string;
  reasonDetails: string;
  feedback: string;
  suggestions: string;
  assetsToReturn: Asset[];
  status: string;
  currentStage: string;
}

const EmployeeExitFormScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewDetails, setViewDetails] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [declarationChecked, setDeclarationChecked] = useState(false);

  const [employeeInfo, setEmployeeInfo] = useState<EmployeeInfo>({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    joinDate: '',
    email: ''
  });

  const [formData, setFormData] = useState<FormData>({
    _id: null,
    proposedLastWorkingDay: '',
    reasonForLeaving: '',
    reasonDetails: '',
    feedback: '',
    suggestions: '',
    assetsToReturn: [],
    status: 'draft',
    currentStage: 'initiation'
  });

  const reasonsForLeaving = [
    { id: 'better_opportunity', label: 'Better Opportunity', color: 'from-blue-400 to-blue-600' },
    { id: 'career_change', label: 'Career Change', color: 'from-purple-400 to-purple-600' },
    { id: 'career_growth', label: 'Career Growth', color: 'from-green-400 to-green-600' },
    { id: 'personal_reasons', label: 'Personal Reasons', color: 'from-pink-400 to-pink-600' },
    { id: 'health_issues', label: 'Health Issues', color: 'from-red-400 to-red-600' },
    { id: 'relocation', label: 'Relocation', color: 'from-orange-400 to-orange-600' },
    { id: 'dissatisfaction', label: 'Dissatisfaction', color: 'from-yellow-400 to-yellow-600' },
    { id: 'retirement', label: 'Retirement', color: 'from-gray-400 to-gray-600' },
    { id: 'work_culture', label: 'Work Culture', color: 'from-teal-400 to-teal-600' },
    { id: 'team_lead', label: 'Team Lead/Management', color: 'from-cyan-400 to-cyan-600' },
    { id: 'compensation', label: 'Compensation', color: 'from-emerald-400 to-emerald-600' },
    { id: 'other', label: 'Other', color: 'from-indigo-400 to-indigo-600' }
  ];

  const commonAssets = [
    'Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headset', 'Docking Station',
    'Mobile Phone', 'SIM Card', 'ID Card', 'Access Card', 'Office Keys',
    'Drawer Keys', 'Vehicle Keys', 'Corporate Credit Card', 'Uniform',
    'Safety Gear', 'Other'
  ];

  const assetCategories = ['Hardware', 'Software', 'Access', 'Documents', 'Other'];
  const assetStatuses = ['Pending', 'Returned', 'Lost', 'Damaged'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch Employee Profile
      const empRes = await employeeAPI.getMyProfile();
      const emp = empRes.data;
      
      // Map API response to our EmployeeInfo interface
      setEmployeeInfo({
        employeeId: emp.employeeId || emp.id || '',
        employeeName: emp.name || '',
        department: emp.department || '',
        position: emp.position || emp.designation || '',
        joinDate: '', // API doesn't have dateOfJoining
        email: emp.email || ''
      });

      // Fetch Existing Exit Form
      const exitRes = await exitFormalityAPI.getMyExit();
      if (exitRes.data?.data && exitRes.data.data.length > 0) {
        const existingForm = exitRes.data.data[0];
        
        // Transform assets from backend format
        const formattedAssets = (existingForm.assetsToReturn || []).map((asset: any) => {
          const parts = (asset.assetDetails || '').split(' || ');
          if (parts.length <= 1) {
            return {
              item: parts[0] || asset.assetType || '',
              category: 'Hardware',
              serialNumber: '',
              remarks: '',
              status: asset.returned ? 'Returned' : 'Pending',
              returned: asset.returned,
              type: 'custom' 
            };
          }
          
          return {
            item: parts[0] || '',
            category: parts[1] || 'Hardware',
            serialNumber: parts[2] || '',
            remarks: parts[3] || '',
            status: asset.returned ? 'Returned' : 'Pending',
            returned: asset.returned,
            type: 'custom'
          };
        });

        setFormData({
          _id: existingForm._id,
          proposedLastWorkingDay: existingForm.proposedLastWorkingDay ? existingForm.proposedLastWorkingDay.split('T')[0] : '',
          reasonForLeaving: existingForm.reasonForLeaving || '',
          reasonDetails: existingForm.reasonDetails || '',
          feedback: existingForm.feedback || '',
          suggestions: existingForm.suggestions || '',
          assetsToReturn: formattedAssets.length > 0 ? formattedAssets : [],
          status: existingForm.status || 'draft',
          currentStage: existingForm.currentStage || 'initiation'
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load your profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchInitialData();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReasonChange = (reasonId: string) => {
    setFormData(prev => ({ ...prev, reasonForLeaving: reasonId }));
  };

  const handleAssetChange = (index: number, field: string, value: string) => {
    const updatedAssets = [...formData.assetsToReturn];
    updatedAssets[index] = { ...updatedAssets[index], [field]: value };
    setFormData(prev => ({ ...prev, assetsToReturn: updatedAssets }));
  };

  const handleAddAsset = () => {
    // Check if the last asset row is complete
    const assets = formData.assetsToReturn;
    if (assets.length > 0) {
      const lastAsset = assets[assets.length - 1];
      if (!lastAsset.item || !lastAsset.serialNumber) {
        Alert.alert('Warning', 'Please complete the current asset details before adding a new one.');
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      assetsToReturn: [
        ...prev.assetsToReturn,
        { item: '', category: 'Hardware', serialNumber: '', status: 'Pending', remarks: '', type: 'custom' }
      ]
    }));
  };

  const handleRemoveAsset = (index: number) => {
    Alert.alert(
      'Remove Asset',
      'Are you sure you want to remove this asset?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setFormData(prev => ({
              ...prev,
              assetsToReturn: prev.assetsToReturn.filter((_, i) => i !== index)
            }));
          }
        }
      ]
    );
  };

  const handleDeleteDraft = async () => {
    if (!formData._id) return;
    
    setSaving(true);
    try {
      await exitFormalityAPI.remove(formData._id);
      Alert.alert('Success', 'Draft deleted successfully.');
      setDeleteModalOpen(false);
      
      // Reset form
      setFormData({
        _id: null,
        proposedLastWorkingDay: '',
        reasonForLeaving: '',
        reasonDetails: '',
        feedback: '',
        suggestions: '',
        assetsToReturn: [],
        status: 'draft',
        currentStage: 'initiation'
      });
      setDeclarationChecked(false);
    } catch (error: any) {
      console.error('Error deleting draft:', error);
      Alert.alert('Error', `Failed to delete draft: ${error.response?.data?.error || error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (isDraft = true) => {
    if (!isDraft) {
      if (!declarationChecked) {
        Alert.alert('Warning', 'Please accept the declaration before submitting.');
        return;
      }
      if (!formData.proposedLastWorkingDay || !formData.reasonForLeaving) {
        Alert.alert('Warning', 'Please fill in Proposed Last Working Day and Reason for Leaving.');
        return;
      }
    }

    setSaving(true);
    try {
      // Transform assets for backend
      const assetsForBackend = formData.assetsToReturn.map(asset => {
        const itemLower = (asset.item || '').toLowerCase();
        let type = 'other';
        if (itemLower.includes('laptop')) type = 'laptop';
        else if (itemLower.includes('mobile') || itemLower.includes('phone')) type = 'mobile';
        else if (itemLower.includes('access card')) type = 'access_card';
        else if (itemLower.includes('id card')) type = 'id_card';
        else if (itemLower.includes('key')) type = 'keys';
        else if (itemLower.includes('document')) type = 'documents';

        const details = [
          asset.item || '',
          asset.category || 'Hardware',
          asset.serialNumber || '',
          asset.remarks || ''
        ].join(' || ');

        return {
          assetType: type,
          assetDetails: details,
          returned: asset.status === 'Returned'
        };
      });

      const payload = {
        ...formData,
        assetsToReturn: assetsForBackend,
        status: isDraft ? 'draft' : 'submitted'
      };

      if (formData._id) {
        await exitFormalityAPI.updateExit(formData._id, payload);
        if (!isDraft) await exitFormalityAPI.submitExit(formData._id);
      } else {
        const res = await exitFormalityAPI.createExit(payload);
        setFormData(prev => ({ ...prev, _id: res.data.data._id }));
        if (!isDraft) await exitFormalityAPI.submitExit(res.data.data._id);
      }
      
      Alert.alert('Success', isDraft ? 'Saved as draft!' : 'Submitted successfully!');
      if (!isDraft) {
        fetchInitialData();
      } else {
        fetchInitialData();
      }
    } catch (error) {
      console.error('Error saving form:', error);
      Alert.alert('Error', 'Failed to save form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      setFormData(prev => ({ ...prev, proposedLastWorkingDay: `${year}-${month}-${day}` }));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primary }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.white} />
          <Text style={{ marginTop: 12, color: COLORS.white }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show "Under Processing" state if submitted and not viewing details
  if (formData.status === 'submitted' && !viewDetails) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primary }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <CommonHeader title="Exit Form" showBack={true} />
        
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.indigoLight, justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Icon name="schedule" size={40} color={COLORS.indigo} />
            </View>
            
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 8, textAlign: 'center' }}>
              Form Under Processing
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.gray, textAlign: 'center', marginBottom: 20 }}>
              Your exit formalities form has been submitted and is currently under review.
            </Text>

            <View style={{ backgroundColor: COLORS.indigoLight, padding: 16, borderRadius: 12, marginBottom: 24, width: '100%' }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.indigo, textAlign: 'center' }}>
                Next Step: Manager Approval
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.indigo, textAlign: 'center', marginTop: 4 }}>
                You will be notified once the status changes.
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={() => setViewDetails(true)}
              style={{ width: '100%', padding: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginBottom: 12 }}
            >
              <Text style={{ color: COLORS.indigo, fontWeight: '600', textAlign: 'center' }}>View Submitted Form</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ width: '100%', padding: 16, backgroundColor: COLORS.primary, borderRadius: 12 }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '600', textAlign: 'center' }}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <CommonFooter companyName="CALDIM ENGINEERING PVT LTD" marqueeText="Exit Form • Employee Separation • " />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Exit Form" 
        showBack={true}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          style={{ flex: 1, backgroundColor: COLORS.primary }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.white]} tintColor={COLORS.white} />
          }
        >
          {viewDetails && (
            <TouchableOpacity
              onPress={() => setViewDetails(false)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
            >
              <Icon name="arrow-back" size={20} color={COLORS.white} />
              <Text style={{ color: COLORS.white, marginLeft: 8, fontSize: 14 }}>Back to Status</Text>
            </TouchableOpacity>
          )}

          {/* Employee Info Section */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <View style={{ backgroundColor: COLORS.primary, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="person" size={20} color={COLORS.white} />
                <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.white }}>Employee Information</Text>
              </View>
            </View>
            
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                <View style={{ width: '50%', padding: 8 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 2 }}>Employee ID</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{employeeInfo.employeeId}</Text>
                </View>
                <View style={{ width: '50%', padding: 8 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 2 }}>Name</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{employeeInfo.employeeName}</Text>
                </View>
                <View style={{ width: '50%', padding: 8 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 2 }}>Department</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{employeeInfo.department}</Text>
                </View>
                <View style={{ width: '50%', padding: 8 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 2 }}>Position</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{employeeInfo.position}</Text>
                </View>
                <View style={{ width: '50%', padding: 8 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 2 }}>Date of Joining</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{employeeInfo.joinDate || '-'}</Text>
                </View>
                <View style={{ width: '50%', padding: 8 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 2 }}>Email</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{employeeInfo.email}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Separation Details */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <View style={{ backgroundColor: COLORS.primary, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="description" size={20} color={COLORS.white} />
                <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.white }}>Separation Details</Text>
              </View>
            </View>
            
            <View style={{ padding: 16 }}>
              {/* Proposed Last Working Day */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>
                  Proposed Last Working Day <Text style={{ color: COLORS.red }}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => formData.status === 'draft' && setShowDatePicker(true)}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 12,
                    padding: 14,
                    backgroundColor: formData.status === 'draft' ? COLORS.white : COLORS.filterBg,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Icon name="calendar-today" size={20} color={COLORS.gray} />
                  <Text style={{ marginLeft: 8, color: formData.proposedLastWorkingDay ? COLORS.textPrimary : COLORS.gray, flex: 1 }}>
                    {formData.proposedLastWorkingDay ? formatDate(formData.proposedLastWorkingDay) : 'Select date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={formData.proposedLastWorkingDay ? new Date(formData.proposedLastWorkingDay) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                  />
                )}
              </View>

              {/* Reason for Leaving */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>
                  Reason for Leaving <Text style={{ color: COLORS.red }}>*</Text>
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {reasonsForLeaving.map((reason) => (
                    <TouchableOpacity
                      key={reason.id}
                      onPress={() => formData.status === 'draft' && handleReasonChange(reason.id)}
                      disabled={formData.status !== 'draft'}
                      style={{
                        width: '50%',
                        padding: 4,
                        opacity: formData.status !== 'draft' ? 0.7 : 1,
                      }}
                    >
                      <View style={{
                        padding: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: formData.reasonForLeaving === reason.id ? COLORS.indigo : COLORS.border,
                        backgroundColor: formData.reasonForLeaving === reason.id ? COLORS.indigoLight : COLORS.white,
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}>
                        <View style={{
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          borderWidth: 2,
                          borderColor: formData.reasonForLeaving === reason.id ? COLORS.indigo : COLORS.gray,
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginRight: 8,
                        }}>
                          {formData.reasonForLeaving === reason.id && (
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.indigo }} />
                          )}
                        </View>
                        <Text style={{
                          fontSize: 12,
                          color: formData.reasonForLeaving === reason.id ? COLORS.indigo : COLORS.textPrimary,
                          fontWeight: formData.reasonForLeaving === reason.id ? '600' : '400',
                        }}>
                          {reason.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Detailed Reason */}
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>
                  Detailed Reason / Comments
                </Text>
                <TextInput
                  value={formData.reasonDetails}
                  onChangeText={(text) => handleInputChange('reasonDetails', text)}
                  editable={formData.status === 'draft'}
                  placeholder="Please provide more details about your decision..."
                  multiline
                  numberOfLines={3}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 12,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: formData.status === 'draft' ? COLORS.white : COLORS.filterBg,
                    color: COLORS.textPrimary,
                    textAlignVertical: 'top',
                    minHeight: 80,
                  }}
                  placeholderTextColor={COLORS.gray}
                />
              </View>
            </View>
          </View>

          {/* Assets Handover */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: 16, marginBottom: 16, overflow: 'hidden' }}>
            <View style={{ backgroundColor: COLORS.primary, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icon name="check-circle" size={20} color={COLORS.white} />
                <Text style={{ marginLeft: 8, fontSize: 16, fontWeight: '600', color: COLORS.white }}>Assets Handover</Text>
              </View>
              {formData.status === 'draft' && (
                <TouchableOpacity onPress={handleAddAsset} style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                  <Text style={{ color: COLORS.white, fontSize: 12 }}>+ Add Asset</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <ScrollView horizontal style={{ padding: 16 }}>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.filterBg, paddingVertical: 10, paddingHorizontal: 4 }}>
                  <Text style={{ width: 120, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Asset Item</Text>
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Category</Text>
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Serial No.</Text>
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Status</Text>
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Remarks</Text>
                  {formData.status === 'draft' && (
                    <Text style={{ width: 60, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' }}>Action</Text>
                  )}
                </View>

                {/* Table Rows */}
                {formData.assetsToReturn.map((asset, index) => (
                  <View key={index} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                    {/* Asset Item */}
                    <View style={{ width: 120, paddingHorizontal: 2 }}>
                      <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, backgroundColor: COLORS.dropdownBg }}>
                        <Picker
                          selectedValue={asset.item}
                          onValueChange={(value) => handleAssetChange(index, 'item', value)}
                          enabled={formData.status === 'draft'}
                          style={{ height: 40, color: COLORS.dropdownText }}
                          dropdownIconColor={COLORS.primary}
                        >
                          <Picker.Item label="Select Asset" value="" color={COLORS.gray} />
                          {commonAssets.map((opt) => (
                            <Picker.Item key={opt} label={opt} value={opt} color={COLORS.dropdownText} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    {/* Category */}
                    <View style={{ width: 100, paddingHorizontal: 2 }}>
                      <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, backgroundColor: COLORS.dropdownBg }}>
                        <Picker
                          selectedValue={asset.category}
                          onValueChange={(value) => handleAssetChange(index, 'category', value)}
                          enabled={formData.status === 'draft'}
                          style={{ height: 40, color: COLORS.dropdownText }}
                          dropdownIconColor={COLORS.primary}
                        >
                          {assetCategories.map((cat) => (
                            <Picker.Item key={cat} label={cat} value={cat} color={COLORS.dropdownText} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    {/* Serial Number */}
                    <View style={{ width: 100, paddingHorizontal: 2 }}>
                      <TextInput
                        value={asset.serialNumber}
                        onChangeText={(text) => handleAssetChange(index, 'serialNumber', text)}
                        editable={formData.status === 'draft'}
                        placeholder="Serial"
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 12,
                          backgroundColor: formData.status === 'draft' ? COLORS.white : COLORS.filterBg,
                          color: COLORS.textPrimary,
                        }}
                        placeholderTextColor={COLORS.gray}
                      />
                    </View>

                    {/* Status */}
                    <View style={{ width: 100, paddingHorizontal: 2 }}>
                      <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, backgroundColor: COLORS.dropdownBg }}>
                        <Picker
                          selectedValue={asset.status}
                          onValueChange={(value) => handleAssetChange(index, 'status', value)}
                          enabled={formData.status === 'draft'}
                          style={{ height: 40, color: COLORS.dropdownText }}
                          dropdownIconColor={COLORS.primary}
                        >
                          {assetStatuses.map((status) => (
                            <Picker.Item key={status} label={status} value={status} color={COLORS.dropdownText} />
                          ))}
                        </Picker>
                      </View>
                    </View>

                    {/* Remarks */}
                    <View style={{ width: 100, paddingHorizontal: 2 }}>
                      <TextInput
                        value={asset.remarks}
                        onChangeText={(text) => handleAssetChange(index, 'remarks', text)}
                        editable={formData.status === 'draft'}
                        placeholder="Remarks"
                        style={{
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          borderRadius: 6,
                          padding: 8,
                          fontSize: 12,
                          backgroundColor: formData.status === 'draft' ? COLORS.white : COLORS.filterBg,
                          color: COLORS.textPrimary,
                        }}
                        placeholderTextColor={COLORS.gray}
                      />
                    </View>

                    {/* Action */}
                    {formData.status === 'draft' && (
                      <View style={{ width: 60, alignItems: 'center', justifyContent: 'center' }}>
                        <TouchableOpacity onPress={() => handleRemoveAsset(index)}>
                          <Icon name="delete" size={20} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}

                {formData.assetsToReturn.length === 0 && (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.gray, fontSize: 12 }}>No assets listed. Tap "+ Add Asset" to begin your checklist.</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>

          {/* Feedback & Suggestions */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
            <View style={{ width: '50%', paddingRight: 4 }}>
              <View style={{ backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden' }}>
                <View style={{ backgroundColor: COLORS.primary, padding: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.white }}>Experience Feedback</Text>
                </View>
                <View style={{ padding: 12 }}>
                  <TextInput
                    value={formData.feedback}
                    onChangeText={(text) => handleInputChange('feedback', text)}
                    editable={formData.status === 'draft'}
                    placeholder="How was your overall experience working here?"
                    multiline
                    numberOfLines={4}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 12,
                      backgroundColor: formData.status === 'draft' ? COLORS.white : COLORS.filterBg,
                      color: COLORS.textPrimary,
                      textAlignVertical: 'top',
                      minHeight: 80,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>
            </View>

            <View style={{ width: '50%', paddingLeft: 4 }}>
              <View style={{ backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden' }}>
                <View style={{ backgroundColor: COLORS.primary, padding: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.white }}>Suggestions</Text>
                </View>
                <View style={{ padding: 12 }}>
                  <TextInput
                    value={formData.suggestions}
                    onChangeText={(text) => handleInputChange('suggestions', text)}
                    editable={formData.status === 'draft'}
                    placeholder="Any suggestions for us to improve?"
                    multiline
                    numberOfLines={4}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 10,
                      fontSize: 12,
                      backgroundColor: formData.status === 'draft' ? COLORS.white : COLORS.filterBg,
                      color: COLORS.textPrimary,
                      textAlignVertical: 'top',
                      minHeight: 80,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>
            </View>
          </View>
          
          {/* Declaration & Actions */}
          <View style={{ backgroundColor: COLORS.white, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
                <Switch
                  value={declarationChecked}
                  onValueChange={setDeclarationChecked}
                  disabled={formData.status !== 'draft'}
                  trackColor={{ false: COLORS.lightGray, true: COLORS.indigo }}
                  thumbColor={COLORS.white}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>I Accept the Declaration</Text>
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>
                    I hereby declare that I have returned all company assets in my possession and the information provided above is accurate. I understand that any unreturned assets may result in a deduction from my final settlement.
                  </Text>
                </View>
              </View>

              {formData.status === 'draft' && (
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 16 }}>
                  {formData._id && (
                    <TouchableOpacity
                      onPress={() => setDeleteModalOpen(true)}
                      disabled={saving}
                      style={{ marginRight: 'auto', flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Icon name="delete" size={20} color={COLORS.red} />
                      <Text style={{ color: COLORS.red, marginLeft: 4 }}>Delete Draft</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    onPress={() => handleSubmit(true)}
                    disabled={saving}
                    style={{ paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, marginRight: 8 }}
                  >
                    <Text style={{ color: COLORS.textPrimary }}>Save as Draft</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={() => handleSubmit(false)}
                    disabled={saving || !formData.proposedLastWorkingDay || !formData.reasonForLeaving}
                    style={{
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                      backgroundColor: (saving || !formData.proposedLastWorkingDay || !formData.reasonForLeaving) ? COLORS.gray : COLORS.primary,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: COLORS.white, fontWeight: '600' }}>
                      {saving ? 'Submitting...' : 'Submit Exit Form'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '80%', maxWidth: 400, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>Confirm Deletion</Text>
            <Text style={{ fontSize: 14, color: COLORS.gray, marginBottom: 20 }}>
              Are you sure you want to delete this draft? This action cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setDeleteModalOpen(false)}
                disabled={saving}
                style={{ paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.gray }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteDraft}
                disabled={saving}
                style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.red, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.white }}>{saving ? 'Deleting...' : 'Delete'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Exit Form • Employee Separation • "
      />
    </SafeAreaView>
  );
};

export default EmployeeExitFormScreen;