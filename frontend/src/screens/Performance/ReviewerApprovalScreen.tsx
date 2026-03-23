// screens/Performance/ReviewerApprovalScreen.tsx
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
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import { performanceAPI } from '../../services/api';
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
  blue: '#3498db',
  green: '#27ae60',
  red: '#e74c3c',
  purple: '#9b59b6',
  orange: '#f39c12',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  blueLight: '#EBF5FF',
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

interface Appraisal {
  id: string;
  empId: string;
  name: string;
  designation: string;
  department: string;
  division: string;
  location: string;
  currentSalary: number;
  incrementPercentage: number;
  incrementCorrectionPercentage: number;
  incrementAmount: number;
  revisedSalary: number;
  selfAppraiseeComments: string;
  managerComments: string;
  reviewerComments: string;
  financialYr: string;
  status: string;
  appraiserRating?: string;
  keyPerformance?: string;
  behaviourManagerComments?: string;
  processManagerComments?: string;
  technicalManagerComments?: string;
  growthManagerComments?: string;
  leadership?: string;
  attitude?: string;
  communication?: string;
  projects?: any[];
  behaviourSelf?: any;
  processSelf?: any;
  technicalSelf?: any;
  growthSelf?: any;
}

const ReviewerApprovalScreen = () => {
  const [employees, setEmployees] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  // Inline Editing State
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Appraisal>>({});

  // Comment Modal State
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [currentCommentEmpId, setCurrentCommentEmpId] = useState<string | null>(null);
  const [tempComment, setTempComment] = useState('');

  // View Details Modal State
  const [viewModalData, setViewModalData] = useState<Appraisal | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Status Popup
  const [statusPopup, setStatusPopup] = useState({
    visible: false,
    type: 'info' as 'success' | 'error' | 'info',
    message: '',
  });

  // Submit Confirm
  const [submitConfirm, setSubmitConfirm] = useState({
    visible: false,
    count: 0,
    ids: [] as string[],
  });

  const getCurrentFinancialYear = () => {
    const today = new Date();
    const yearStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    const yearEnd = String(yearStart + 1).slice(2);
    return `${yearStart}-${yearEnd}`;
  };

  // Fetch data
  useEffect(() => {
    fetchReviewerAppraisals();
  }, []);

  useEffect(() => {
    if (employees.length > 0 && !selectedFinancialYr) {
      const years = Array.from(new Set(employees.map(e => e.financialYr).filter(Boolean)));
      if (years.length > 0) {
        setSelectedFinancialYr(years[0]);
      } else {
        setSelectedFinancialYr(getCurrentFinancialYear());
      }
    }
  }, [employees]);

  const fetchReviewerAppraisals = async () => {
    setLoading(true);
    try {
      const response = await performanceAPI.getReviewerAppraisals();
      const raw = response.data || [];
      const enhanced = raw.map((emp: any) => {
        const current = emp.currentSalary || 0;
        const pct = emp.incrementPercentage || 0;
        const correctionPct = emp.incrementCorrectionPercentage || 0;
        if (current > 0 && (pct !== 0 || correctionPct !== 0)) {
          const { incrementAmount, revisedSalary } = calculateFinancials(
            current,
            pct,
            correctionPct
          );
          return {
            ...emp,
            incrementAmount,
            revisedSalary,
          };
        }
        return emp;
      });
      setEmployees(enhanced);
    } catch (error: any) {
      console.error('Error fetching appraisals:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch appraisals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviewerAppraisals();
  };

  const calculateFinancials = (current: number, pct: number, correctionPct: number) => {
    const currentVal = current || 0;
    const pctVal = pct || 0;
    const correctionPctVal = correctionPct || 0;
    
    const totalPct = pctVal + correctionPctVal;
    const amount = (currentVal * totalPct / 100);
    const revised = currentVal + amount;
    
    return {
      incrementAmount: amount,
      revisedSalary: revised,
    };
  };

  const handleEditClick = (emp: Appraisal) => {
    setEditingRowId(emp.id);
    setEditFormData({ ...emp });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  const handleSaveRow = async () => {
    if (!editingRowId) return;
    
    try {
      const { 
        reviewerComments, 
        incrementPercentage, 
        incrementCorrectionPercentage, 
        incrementAmount, 
        revisedSalary 
      } = editFormData;

      await performanceAPI.updateReviewerAppraisal(editingRowId, {
        reviewerComments,
        incrementPercentage,
        incrementCorrectionPercentage,
        incrementAmount,
        revisedSalary,
      });

      setEmployees(employees.map(emp => 
        emp.id === editingRowId ? { ...emp, ...editFormData } : emp
      ));
      setEditingRowId(null);
      setEditFormData({});
      setStatusPopup({
        visible: true,
        type: 'success',
        message: 'Review saved successfully!',
      });
    } catch (error: any) {
      console.error('Error saving row:', error);
      setStatusPopup({
        visible: true,
        type: 'error',
        message: error.response?.data?.message || 'Failed to save row',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let newData = { ...editFormData, [field]: value };
    
    if (field === 'incrementPercentage' || field === 'incrementCorrectionPercentage') {
      const { incrementAmount, revisedSalary } = calculateFinancials(
        Number(newData.currentSalary) || 0, 
        Number(field === 'incrementPercentage' ? value : newData.incrementPercentage) || 0,
        Number(field === 'incrementCorrectionPercentage' ? value : newData.incrementCorrectionPercentage) || 0
      );
      newData.incrementAmount = incrementAmount;
      newData.revisedSalary = revisedSalary;
    }

    setEditFormData(newData);
  };

  const openCommentModal = (emp: Appraisal) => {
    setCurrentCommentEmpId(emp.id);
    const comment = editingRowId === emp.id ? editFormData.reviewerComments : emp.reviewerComments;
    setTempComment(comment || '');
    setIsCommentModalOpen(true);
  };

  const saveComment = async () => {
    if (!currentCommentEmpId) return;
    
    if (editingRowId === currentCommentEmpId) {
      setEditFormData({ ...editFormData, reviewerComments: tempComment });
      setIsCommentModalOpen(false);
      return;
    }

    try {
      await performanceAPI.updateReviewerAppraisal(currentCommentEmpId, {
        reviewerComments: tempComment,
      });

      setEmployees(employees.map(emp => 
        emp.id === currentCommentEmpId ? { ...emp, reviewerComments: tempComment } : emp
      ));
      setIsCommentModalOpen(false);
      setStatusPopup({
        visible: true,
        type: 'success',
        message: 'Review comments saved successfully!',
      });
    } catch (error: any) {
      console.error('Error saving comment:', error);
      setStatusPopup({
        visible: true,
        type: 'error',
        message: error.response?.data?.message || 'Failed to save comment',
      });
    }
  };

  const handleSubmitToDirector = () => {
    const candidates = selectedRows.length > 0
      ? employees.filter(emp => selectedRows.includes(emp.id))
      : employees;

    const rowsToSubmit = candidates.filter(emp => emp.status === 'APPRAISER_COMPLETED');

    const count = rowsToSubmit.length;
    if (count === 0) {
      setStatusPopup({
        visible: true,
        type: 'info',
        message: 'No pending records to submit.',
      });
      return;
    }

    const ids = rowsToSubmit.map(e => e.id);
    setSubmitConfirm({
      visible: true,
      count,
      ids,
    });
  };

  const confirmSubmitToDirector = async () => {
    if (!submitConfirm.visible || !submitConfirm.ids.length) {
      setSubmitConfirm({ visible: false, count: 0, ids: [] });
      return;
    }
    
    try {
      await performanceAPI.submitToDirector(submitConfirm.ids);
      setStatusPopup({
        visible: true,
        type: 'success',
        message: `${submitConfirm.count} record(s) submitted to Director successfully!`,
      });
      setSubmitConfirm({ visible: false, count: 0, ids: [] });
      fetchReviewerAppraisals();
      setSelectedRows([]);
    } catch (error: any) {
      console.error('Error submitting to Director:', error);
      setStatusPopup({
        visible: true,
        type: 'error',
        message: error.response?.data?.message || 'Failed to submit to Director',
      });
      setSubmitConfirm({ visible: false, count: 0, ids: [] });
    }
  };

  const handleSelectAll = () => {
    const pendingRecords = filteredEmployees
      .filter(emp => emp.status === 'APPRAISER_COMPLETED')
      .map(emp => emp.id);
    
    if (selectedRows.length === pendingRecords.length && pendingRecords.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(pendingRecords);
    }
  };

  const handleSelectRow = (id: string, isEditable: boolean) => {
    if (!isEditable) return;
    
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const getStatusBadge = (status: string): { bg: string; text: string; label: string } => {
    switch (status) {
      case 'Submitted':
      case 'SUBMITTED':
        return { bg: '#FEF3C7', text: '#92400E', label: 'Pending Appraiser' };
      case 'APPRAISER_COMPLETED':
        return { bg: '#FEF3C7', text: '#B45309', label: 'Pending Review' };
      case 'REVIEWER_COMPLETED':
        return { bg: '#D1FAE5', text: '#065F46', label: 'Submitted' };
      case 'DIRECTOR_APPROVED':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Approved' };
      case 'RELEASED':
        return { bg: '#F3E8FF', text: '#7C3AED', label: 'Released' };
      default:
        return { bg: '#F3F4F6', text: '#1F2937', label: status || 'Pending' };
    }
  };

  // Get unique values for filters
  const uniqueDivisions = [...new Set(employees.map(e => e.division).filter(Boolean))].sort();
  const uniqueLocations = [...new Set(employees.map(e => e.location).filter(Boolean))].sort();
  const uniqueYears = [...new Set(employees.map(e => e.financialYr).filter(Boolean))].sort().reverse();

  // If no years from data, add current year
  if (uniqueYears.length === 0) {
    uniqueYears.push(getCurrentFinancialYear());
  }

  const filteredEmployees = employees.filter(emp =>
    (selectedFinancialYr === '' || emp.financialYr === selectedFinancialYr) &&
    (selectedDivision === '' || emp.division === selectedDivision) &&
    (selectedLocation === '' || emp.location === selectedLocation) &&
    (emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     emp.empId?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const StatusPopupComponent = () => (
    <Modal
      visible={statusPopup.visible}
      transparent
      animationType="fade"
      onRequestClose={() => setStatusPopup({ ...statusPopup, visible: false })}
    >
      <View style={styles.popupOverlay}>
        <View style={[styles.popupContainer, getStatusPopupStyle(statusPopup.type)]}>
          <View style={styles.popupIconContainer}>
            {statusPopup.type === 'success' && (
              <Icon name="check-circle" size={32} color={COLORS.success} />
            )}
            {statusPopup.type === 'error' && (
              <Icon name="error" size={32} color={COLORS.error} />
            )}
            {statusPopup.type === 'info' && (
              <Icon name="info" size={32} color={COLORS.info} />
            )}
          </View>
          <Text style={styles.popupTitle}>
            {statusPopup.type === 'success' ? 'Success' : statusPopup.type === 'error' ? 'Error' : 'Information'}
          </Text>
          <Text style={styles.popupMessage}>{statusPopup.message}</Text>
          <TouchableOpacity
            onPress={() => setStatusPopup({ ...statusPopup, visible: false })}
            style={styles.popupButton}
          >
            <Text style={styles.popupButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const getStatusPopupStyle = (type: string) => {
    switch (type) {
      case 'success':
        return { borderTopColor: COLORS.success };
      case 'error':
        return { borderTopColor: COLORS.error };
      default:
        return { borderTopColor: COLORS.info };
    }
  };

  const SubmitConfirmModal = () => (
    <Modal
      visible={submitConfirm.visible}
      transparent
      animationType="fade"
      onRequestClose={() => setSubmitConfirm({ visible: false, count: 0, ids: [] })}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.confirmModalContainer}>
          <View style={styles.confirmModalHeader}>
            <Icon name="check-circle" size={24} color={COLORS.white} />
            <Text style={styles.confirmModalTitle}>Submit to Director</Text>
          </View>
          <View style={styles.confirmModalBody}>
            <Text style={styles.confirmModalText}>
              Submit {submitConfirm.count} record(s) to Director?
            </Text>
          </View>
          <View style={styles.confirmModalFooter}>
            <TouchableOpacity
              onPress={() => setSubmitConfirm({ visible: false, count: 0, ids: [] })}
              style={styles.confirmCancelButton}
            >
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmSubmitToDirector}
              style={styles.confirmSubmitButton}
            >
              <Text style={styles.confirmSubmitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const CommentModal = () => (
    <Modal
      visible={isCommentModalOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setIsCommentModalOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.commentModalContainer}>
          <View style={styles.commentModalHeader}>
            <Icon name="comment" size={20} color={COLORS.white} />
            <Text style={styles.commentModalTitle}>Reviewer Comments</Text>
            <TouchableOpacity onPress={() => setIsCommentModalOpen(false)} style={styles.modalCloseButton}>
              <Icon name="close" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.commentModalBody}>
            <TextInput
              value={tempComment}
              onChangeText={setTempComment}
              placeholder="Enter your comments here..."
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={6}
              style={styles.commentTextArea}
              textAlignVertical="top"
            />
          </View>
          <View style={styles.commentModalFooter}>
            <TouchableOpacity
              onPress={() => setIsCommentModalOpen(false)}
              style={styles.commentCancelButton}
            >
              <Text style={styles.commentCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveComment}
              style={styles.commentSaveButton}
            >
              <Text style={styles.commentSaveText}>Save Comments</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const ViewDetailsModal = () => (
    <Modal
      visible={showViewModal && !!viewModalData}
      transparent
      animationType="slide"
      onRequestClose={() => setShowViewModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.viewModalContainer}>
          <View style={styles.viewModalHeader}>
            <Icon name="person" size={20} color={COLORS.white} />
            <Text style={styles.viewModalTitle}>Employee Appraisal Details</Text>
            <TouchableOpacity onPress={() => setShowViewModal(false)} style={styles.modalCloseButton}>
              <Icon name="close" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.viewModalBody} showsVerticalScrollIndicator={true}>
            {viewModalData && (
              <>
                {/* Employee Info Header */}
                <View style={styles.employeeInfoHeader}>
                  <View style={styles.employeeAvatar}>
                    <Text style={styles.employeeAvatarText}>
                      {viewModalData.name?.charAt(0) || 'E'}
                    </Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{viewModalData.name}</Text>
                    <Text style={styles.employeeDesignation}>
                      {viewModalData.designation} • {viewModalData.department}
                    </Text>
                    <Text style={styles.employeeId}>{viewModalData.empId}</Text>
                  </View>
                </View>

                {/* Self Appraisal */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Icon name="person-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Self Appraisal Detail</Text>
                  </View>
                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionLabel}>Overall Contribution</Text>
                    <Text style={styles.sectionText}>
                      {viewModalData.selfAppraiseeComments || 'No overall comments'}
                    </Text>
                  </View>
                </View>

                {/* Manager Review */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Icon name="star" size={16} color={COLORS.primary} />
                    <Text style={styles.sectionTitle}>Team Appraisal (Manager Review)</Text>
                  </View>
                  
                  <View style={styles.ratingContainer}>
                    <Text style={styles.ratingLabel}>Final Rating Assigned</Text>
                    <Text style={styles.ratingValue}>{viewModalData.appraiserRating || 'Not Rated'}</Text>
                  </View>

                  <View style={styles.sectionContent}>
                    <Text style={styles.sectionLabel}>Manager's General Remarks</Text>
                    <Text style={styles.sectionText}>
                      {viewModalData.managerComments || 'No overall comments from manager'}
                    </Text>
                  </View>
                </View>

                {/* Financial Overview */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <Icon name="attach-money" size={16} color={COLORS.green} />
                    <Text style={styles.sectionTitle}>Financial Overview</Text>
                  </View>
                  <View style={styles.financialGrid}>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Current Salary</Text>
                      <Text style={styles.financialValue}>
                        ₹{(viewModalData.currentSalary || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Increment %</Text>
                      <Text style={styles.financialValue}>
                        {(viewModalData.incrementPercentage || 0) + (viewModalData.incrementCorrectionPercentage || 0)}%
                      </Text>
                    </View>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Increment Amount</Text>
                      <Text style={[styles.financialValue, { color: COLORS.green }]}>
                        ₹{(viewModalData.incrementAmount || 0).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.financialItem}>
                      <Text style={styles.financialLabel}>Revised Salary</Text>
                      <Text style={[styles.financialValue, { color: COLORS.primary, fontWeight: 'bold' }]}>
                        ₹{(viewModalData.revisedSalary || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.viewModalFooter}>
            <TouchableOpacity
              onPress={() => setShowViewModal(false)}
              style={styles.closeModalButton}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Reviewer Approval" showBack={true} />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Top Controls */}
        <View style={styles.topControlsContainer}>
          <View style={styles.controlsRow}>
            {/* Financial Year Selector */}
            <View style={styles.pickerContainer}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedFinancialYr}
                  onValueChange={(value) => setSelectedFinancialYr(value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  {uniqueYears.length > 0 ? (
                    uniqueYears.map((year) => (
                      <PickerItem 
                        key={year} 
                        label={year} 
                        value={year} 
                        color={COLORS.dropdownText} 
                      />
                    ))
                  ) : (
                    <PickerItem label="No Years Available" value="" color={COLORS.dropdownText} />
                  )}
                </Picker>
              </View>
            </View>

            {/* Search Box */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Search employee..."
                placeholderTextColor={COLORS.gray}
                style={styles.searchInput}
              />
            </View>

            {/* Division Selector */}
            <View style={styles.pickerContainer}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedDivision}
                  onValueChange={(value) => setSelectedDivision(value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Divisions" value="" color={COLORS.dropdownText} />
                  {uniqueDivisions.map(div => (
                    <PickerItem key={div} label={div} value={div} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Location Selector */}
            <View style={styles.pickerContainer}>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedLocation}
                  onValueChange={(value) => setSelectedLocation(value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Locations" value="" color={COLORS.dropdownText} />
                  {uniqueLocations.map(loc => (
                    <PickerItem key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <View style={styles.submitButtonContainer}>
            <Text style={styles.selectedCountText}>
              {selectedRows.length > 0 ? `${selectedRows.length} selected` : 'All records'}
            </Text>
            <TouchableOpacity
              onPress={handleSubmitToDirector}
              style={styles.submitButton}
            >
              <Icon name="check-circle" size={16} color={COLORS.white} />
              <Text style={styles.submitButtonText}>Submit to Director</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Table */}
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading...</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <View style={styles.checkboxCell}>
                    <TouchableOpacity onPress={handleSelectAll}>
                      <View style={styles.checkbox}>
                        {selectedRows.length > 0 && selectedRows.length === filteredEmployees.filter(e => e.status === 'APPRAISER_COMPLETED').length && filteredEmployees.filter(e => e.status === 'APPRAISER_COMPLETED').length > 0 && (
                          <View style={styles.checkboxChecked} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.headerText, styles.sNoCell]}>S.No</Text>
                  <Text style={[styles.headerText, styles.empIdCell]}>Employee ID</Text>
                  <Text style={[styles.headerText, styles.nameCell]}>Employee Name</Text>
                  <Text style={[styles.headerText, styles.statusCell]}>Status</Text>
                  <Text style={[styles.headerText, styles.commentsCell]}>Reviewer Comments</Text>
                  <Text style={[styles.headerText, styles.salaryCell]}>Current Salary</Text>
                  <Text style={[styles.headerText, styles.incrementCell]}>Increment %</Text>
                  <Text style={[styles.headerText, styles.correctionCell]}>Correction %</Text>
                  <Text style={[styles.headerText, styles.amountCell]}>Increment Amt</Text>
                  <Text style={[styles.headerText, styles.revisedCell]}>Revised Salary</Text>
                  <Text style={[styles.headerText, styles.actionsCell]}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredEmployees.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={styles.emptyText}>No records found</Text>
                  </View>
                ) : (
                  filteredEmployees.map((emp, index) => {
                    const isEditing = editingRowId === emp.id;
                    const data = isEditing ? editFormData : emp;
                    const isSelected = selectedRows.includes(emp.id);
                    const isEditable = emp.status === 'APPRAISER_COMPLETED';
                    const statusBadge = getStatusBadge(emp.status);

                    return (
                      <View key={emp.id} style={[styles.tableRow, isSelected && styles.selectedRow]}>
                        <View style={styles.checkboxCell}>
                          <TouchableOpacity onPress={() => handleSelectRow(emp.id, isEditable)} disabled={!isEditable}>
                            <View style={[styles.checkbox, !isEditable && styles.checkboxDisabled]}>
                              {isSelected && <View style={styles.checkboxChecked} />}
                            </View>
                          </TouchableOpacity>
                        </View>
                        <Text style={[styles.cellText, styles.sNoCell]}>{index + 1}</Text>
                        <Text style={[styles.cellText, styles.empIdCell, styles.fontMedium]}>{data.empId}</Text>
                        <Text style={[styles.cellText, styles.nameCell]}>{data.name}</Text>
                        <View style={styles.statusCell}>
                          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                            <Text style={[styles.statusText, { color: statusBadge.text }]}>{statusBadge.label}</Text>
                          </View>
                        </View>
                        <View style={styles.commentsCell}>
                          {isEditing ? (
                            <TextInput
                              value={data.reviewerComments || ''}
                              onChangeText={(text) => handleInputChange('reviewerComments', text)}
                              placeholder="Enter comments..."
                              multiline
                              numberOfLines={2}
                              style={styles.commentInput}
                              placeholderTextColor={COLORS.gray}
                            />
                          ) : (
                            <TouchableOpacity onPress={() => isEditable && openCommentModal(emp)}>
                              <Text style={[styles.commentText, !isEditable && styles.disabledText]}>
                                {data.reviewerComments || <Text style={styles.addCommentText}>Add comments...</Text>}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={[styles.cellText, styles.salaryCell, styles.textRight]}>
                          ₹{data.currentSalary?.toLocaleString()}
                        </Text>
                        <View style={styles.incrementCell}>
                          <Text style={styles.cellText}>{data.incrementPercentage}%</Text>
                        </View>
                        <View style={styles.correctionCell}>
                          {isEditing ? (
                            <View style={styles.correctionInputContainer}>
                              <TextInput
                                value={String(data.incrementCorrectionPercentage ?? '')}
                                onChangeText={(text) => handleInputChange('incrementCorrectionPercentage', text)}
                                keyboardType="numeric"
                                style={styles.correctionInput}
                              />
                              <Text style={styles.percentSymbol}>%</Text>
                            </View>
                          ) : (
                            <Text style={[styles.cellText, (data.incrementCorrectionPercentage ?? 0) !== 0 && styles.correctionValue]}>
                              {(data.incrementCorrectionPercentage ?? 0) > 0 ? '+' : ''}{(data.incrementCorrectionPercentage ?? 0)}%
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.cellText, styles.amountCell, styles.textRight, styles.incrementAmount]}>
                          ₹{data.incrementAmount?.toLocaleString()}
                        </Text>
                        <Text style={[styles.cellText, styles.revisedCell, styles.textRight, styles.fontBold]}>
                          ₹{data.revisedSalary?.toLocaleString()}
                        </Text>
                        <View style={styles.actionsCell}>
                          <View style={styles.actionsContainer}>
                            {isEditing ? (
                              <>
                                <TouchableOpacity onPress={handleSaveRow} style={styles.actionButton}>
                                  <Icon name="save" size={18} color={COLORS.green} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={handleCancelEdit} style={styles.actionButton}>
                                  <Icon name="close" size={18} color={COLORS.red} />
                                </TouchableOpacity>
                              </>
                            ) : (
                              <>
                                <TouchableOpacity
                                  onPress={() => {
                                    setViewModalData(emp);
                                    setShowViewModal(true);
                                  }}
                                  style={styles.actionButton}
                                >
                                  <Icon name="visibility" size={18} color={COLORS.gray} />
                                </TouchableOpacity>
                                {isEditable && (
                                  <TouchableOpacity onPress={() => handleEditClick(emp)} style={styles.actionButton}>
                                    <Icon name="edit" size={18} color={COLORS.blue} />
                                  </TouchableOpacity>
                                )}
                              </>
                            )}
                          </View>
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

      {/* Modals */}
      <StatusPopupComponent />
      <SubmitConfirmModal />
      <CommentModal />
      <ViewDetailsModal />

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Reviewer Approval • Performance Management • "
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  topControlsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    padding: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pickerContainer: {
    width: 150,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.dropdownBg,
    overflow: 'hidden',
  },
  picker: {
    height: 45,
    color: COLORS.dropdownText,
  },
  searchContainer: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  searchIcon: {
    marginLeft: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  submitButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  selectedCountText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
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
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  headerText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  checkboxCell: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 10,
    height: 10,
    borderRadius: 2,
    backgroundColor: COLORS.white,
  },
  checkboxDisabled: {
    borderColor: COLORS.gray,
    opacity: 0.5,
  },
  sNoCell: { width: 50, textAlign: 'center' },
  empIdCell: { width: 100 },
  nameCell: { width: 150 },
  statusCell: { width: 130 },
  commentsCell: { width: 150 },
  salaryCell: { width: 100, textAlign: 'right' },
  incrementCell: { width: 80, textAlign: 'center' },
  correctionCell: { width: 100, textAlign: 'center' },
  amountCell: { width: 100, textAlign: 'right' },
  revisedCell: { width: 100, textAlign: 'right' },
  actionsCell: { width: 80, alignItems: 'center' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  selectedRow: {
    backgroundColor: COLORS.indigoLight,
  },
  cellText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  fontMedium: {
    fontWeight: '500',
  },
  fontBold: {
    fontWeight: '600',
  },
  textRight: {
    textAlign: 'right',
    paddingRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 4,
    fontSize: 10,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
    minHeight: 40,
  },
  commentText: {
    fontSize: 10,
    color: COLORS.blue,
    textAlign: 'center',
  },
  addCommentText: {
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  disabledText: {
    color: COLORS.gray,
  },
  correctionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
  },
  correctionInput: {
    flex: 1,
    padding: 6,
    fontSize: 12,
    textAlign: 'right',
    color: COLORS.textPrimary,
  },
  percentSymbol: {
    marginRight: 4,
    color: COLORS.gray,
    fontSize: 10,
  },
  correctionValue: {
    color: COLORS.blue,
    fontWeight: '500',
  },
  incrementAmount: {
    color: COLORS.green,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: COLORS.gray,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: '85%',
    maxWidth: 320,
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 4,
  },
  popupIconContainer: {
    marginBottom: 12,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  popupMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  popupButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  popupButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  confirmModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: '85%',
    maxWidth: 320,
    overflow: 'hidden',
  },
  confirmModalHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmModalTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmModalBody: {
    padding: 20,
  },
  confirmModalText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  confirmModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  confirmCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
  },
  confirmCancelText: {
    color: COLORS.gray,
    fontWeight: '500',
  },
  confirmSubmitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  confirmSubmitText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  commentModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  commentModalHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentModalTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  commentModalBody: {
    padding: 16,
  },
  commentTextArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
    minHeight: 120,
  },
  commentModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  commentCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
  },
  commentCancelText: {
    color: COLORS.gray,
    fontWeight: '500',
  },
  commentSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  commentSaveText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  viewModalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  viewModalHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewModalTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  viewModalBody: {
    padding: 16,
    maxHeight: height - 200,
  },
  viewModalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  closeModalButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  employeeInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  employeeAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.indigoLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.indigo,
  },
  employeeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  employeeDesignation: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  employeeId: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: COLORS.filterBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  sectionContent: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    backgroundColor: COLORS.white,
    padding: 8,
    borderRadius: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  ratingLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.indigo,
  },
  financialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  financialItem: {
    width: '48%',
    backgroundColor: COLORS.white,
    padding: 10,
    borderRadius: 8,
  },
  financialLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
});

export default ReviewerApprovalScreen;