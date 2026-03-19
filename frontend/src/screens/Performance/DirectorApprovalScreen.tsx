// screens/Performance/DirectorApprovalScreen.tsx
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { performanceAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';

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
  currentSalary: number;
  incrementPercentage: number;
  incrementCorrectionPercentage: number;
  incrementAmount: number;
  revisedSalary: number;
  selfAppraiseeComments: string;
  managerComments: string;
  reviewerComments: string;
  directorComments: string;
  financialYr: string;
  status?: string;
}

const DirectorApprovalScreen = () => {
  const [employees, setEmployees] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState('2025-26');
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

  // Financial Years
  const financialYears = ['2023-24', '2024-25', '2025-26', '2026-27', '2027-28'];

  // Fetch data
  useEffect(() => {
    fetchDirectorAppraisals();
  }, []);

  const fetchDirectorAppraisals = async () => {
    setLoading(true);
    try {
      const response = await performanceAPI.getDirectorAppraisals();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error fetching appraisals:', error);
      // Silent fail as in original
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDirectorAppraisals();
  };

  const calculateFinancials = (current: number, pct: number, correctionPct: number) => {
    const currentVal = current || 0;
    const pctVal = pct || 0;
    const correctionPctVal = correctionPct || 0;
    
    // Total percentage = Base Increment % + Correction %
    const totalPct = pctVal + correctionPctVal;
    const amount = (currentVal * totalPct / 100);
    const revised = currentVal + amount;
    
    return {
      incrementAmount: amount,
      revisedSalary: revised
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
      await performanceAPI.updateDirectorAppraisal(editingRowId, editFormData);
      setEmployees(employees.map(emp => 
        emp.id === editingRowId ? { ...emp, ...editFormData } : emp
      ));
      setEditingRowId(null);
      setEditFormData({});
      Alert.alert('Success', 'Row saved successfully!');
    } catch (error) {
      console.error('Error saving row:', error);
      Alert.alert('Error', 'Failed to save changes');
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
    const comment = editingRowId === emp.id ? editFormData.directorComments : emp.directorComments;
    setTempComment(comment || '');
    setIsCommentModalOpen(true);
  };

  const saveComment = async () => {
    if (!currentCommentEmpId) return;
    
    try {
      const updatedData = { directorComments: tempComment };
      await performanceAPI.updateDirectorAppraisal(currentCommentEmpId, updatedData);

      if (editingRowId === currentCommentEmpId) {
        setEditFormData({ ...editFormData, directorComments: tempComment });
      } else {
        setEmployees(employees.map(emp => 
          emp.id === currentCommentEmpId ? { ...emp, directorComments: tempComment } : emp
        ));
      }
      setIsCommentModalOpen(false);
    } catch (error) {
      console.error('Error saving comment:', error);
      Alert.alert('Error', 'Failed to save comment');
    }
  };

  const handleApproveRelease = (emp: Appraisal) => {
    Alert.alert(
      'Release Letter',
      `Are you sure you want to approve and release the letter for ${emp.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          onPress: async () => {
            try {
              await performanceAPI.updateDirectorAppraisal(emp.id, { status: 'Released' });
              setEmployees(employees.map(e => 
                e.id === emp.id ? { ...e, status: 'Released' } : e
              ));
              Alert.alert('Success', `Appraisal letter released for ${emp.name}!`);
            } catch (error) {
              console.error('Error releasing letter:', error);
              Alert.alert('Error', 'Failed to release letter');
            }
          }
        }
      ]
    );
  };

  const handleBulkApprove = async () => {
    const rowsToSubmit = selectedRows.length > 0 
      ? employees.filter(emp => selectedRows.includes(emp.id))
      : employees;
      
    const count = rowsToSubmit.length;
    if (count === 0) {
      Alert.alert('Info', 'No records to approve.');
      return;
    }

    Alert.alert(
      'Release Letters',
      `Approve and Release Letters for ${count} employee(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          onPress: async () => {
            try {
              await Promise.all(rowsToSubmit.map(emp => 
                performanceAPI.updateDirectorAppraisal(emp.id, { status: 'Released' })
              ));
              
              setEmployees(employees.map(emp => 
                (selectedRows.length === 0 || selectedRows.includes(emp.id)) 
                  ? { ...emp, status: 'Released' } 
                  : emp
              ));
              Alert.alert('Success', `${count} letters released successfully!`);
              setSelectedRows([]);
            } catch (error) {
              console.error('Error releasing letters:', error);
              Alert.alert('Error', 'Failed to release letters');
            }
          }
        }
      ]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === filteredEmployees.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredEmployees.map(emp => emp.id));
    }
  };

  const handleSelectRow = (id: string) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // Filter employees
  const filteredEmployees = employees.filter(emp => 
    emp.financialYr === selectedFinancialYr &&
    (emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     emp.empId?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Director Approval" 
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
        {/* Top Controls */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1 }}>
              {/* Financial Year Selector */}
              <View style={{ width: 150, marginRight: 8, marginBottom: 8 }}>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={selectedFinancialYr}
                    onValueChange={(value) => setSelectedFinancialYr(value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    {financialYears.map(year => (
                      <Picker.Item key={year} label={year} value={year} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Search Box */}
              <View style={{ flex: 1, minWidth: 200, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.white }}>
                  <Icon name="search" size={20} color={COLORS.gray} style={{ marginLeft: 8 }} />
                  <TextInput
                    value={searchTerm}
                    onChangeText={setSearchTerm}
                    placeholder="Search employee..."
                    style={{
                      flex: 1,
                      padding: 12,
                      fontSize: 14,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
              </View>
            </View>

            {/* Bulk Action Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ marginRight: 8, color: COLORS.gray, fontSize: 12 }}>
                {selectedRows.length > 0 ? `${selectedRows.length} selected` : 'All records'}
              </Text>
              <TouchableOpacity
                onPress={handleBulkApprove}
                style={{
                  backgroundColor: COLORS.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Icon name="send" size={18} color={COLORS.white} />
                <Text style={{ marginLeft: 4, color: COLORS.white, fontSize: 12 }}>Release Letters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Table */}
        {loading && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 4 }}>
                  <View style={{ width: 40, alignItems: 'center' }}>
                    <TouchableOpacity onPress={handleSelectAll}>
                      <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: COLORS.white, justifyContent: 'center', alignItems: 'center' }}>
                        {selectedRows.length === filteredEmployees.length && filteredEmployees.length > 0 && (
                          <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS.white }} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>S.No</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Employee ID</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Employee Name</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Director Comments</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Current Salary</Text>
                  <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Increment %</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Correction %</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Increment Amt</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Revised Salary</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredEmployees.map((emp, index) => {
                  const isEditing = editingRowId === emp.id;
                  const data = isEditing ? editFormData : emp;
                  const isSelected = selectedRows.includes(emp.id);
                  const isReleased = emp.status === 'Released';

                  // Safe values with defaults
                  const incrementCorrectionPercentage = data.incrementCorrectionPercentage ?? 0;
                  const incrementPercentage = data.incrementPercentage ?? 0;
                  const currentSalary = data.currentSalary ?? 0;
                  const incrementAmount = data.incrementAmount ?? 0;
                  const revisedSalary = data.revisedSalary ?? 0;

                  return (
                    <View key={emp.id} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: isSelected ? COLORS.indigoLight : COLORS.white }}>
                      {/* Checkbox */}
                      <View style={{ width: 40, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => handleSelectRow(emp.id)}>
                          <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}>
                            {isSelected && (
                              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: COLORS.primary }} />
                            )}
                          </View>
                        </TouchableOpacity>
                      </View>

                      <Text style={{ width: 50, fontSize: 12, textAlign: 'center', color: COLORS.textPrimary }}>{index + 1}</Text>
                      <Text style={{ width: 100, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{emp.empId}</Text>
                      <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary }}>{emp.name}</Text>
                      
                      {/* Director Comments */}
                      <View style={{ width: 120, paddingHorizontal: 2 }}>
                        {isEditing ? (
                          <TextInput
                            value={data.directorComments || ''}
                            onChangeText={(text) => handleInputChange('directorComments', text)}
                            placeholder="Enter comments"
                            multiline
                            numberOfLines={2}
                            style={{
                              borderWidth: 1,
                              borderColor: COLORS.border,
                              borderRadius: 4,
                              padding: 4,
                              fontSize: 10,
                              backgroundColor: COLORS.white,
                              color: COLORS.textPrimary,
                              minHeight: 40,
                            }}
                            placeholderTextColor={COLORS.gray}
                          />
                        ) : (
                          <TouchableOpacity onPress={() => openCommentModal(emp)}>
                            <Text style={{ fontSize: 10, color: COLORS.blue, textAlign: 'center' }} numberOfLines={2}>
                              {emp.directorComments || <Text style={{ color: COLORS.gray, fontStyle: 'italic' }}>Add comments...</Text>}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <Text style={{ width: 100, fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' }}>₹{currentSalary.toLocaleString()}</Text>
                      
                      {/* Increment % */}
                      <View style={{ width: 80, paddingHorizontal: 2 }}>
                        {isEditing ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 4 }}>
                            <TextInput
                              value={String(incrementPercentage || '')}
                              onChangeText={(text) => handleInputChange('incrementPercentage', text)}
                              keyboardType="numeric"
                              style={{
                                flex: 1,
                                padding: 6,
                                fontSize: 12,
                                textAlign: 'right',
                                color: COLORS.textPrimary,
                              }}
                            />
                            <Text style={{ marginRight: 4, color: COLORS.gray, fontSize: 10 }}>%</Text>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 12, textAlign: 'center' }}>{incrementPercentage}%</Text>
                        )}
                      </View>

                      {/* Correction % */}
                      <View style={{ width: 100, paddingHorizontal: 2 }}>
                        {isEditing ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 4 }}>
                            <TextInput
                              value={String(incrementCorrectionPercentage || '')}
                              onChangeText={(text) => handleInputChange('incrementCorrectionPercentage', text)}
                              keyboardType="numeric"
                              style={{
                                flex: 1,
                                padding: 6,
                                fontSize: 12,
                                textAlign: 'right',
                                color: COLORS.textPrimary,
                              }}
                            />
                            <Text style={{ marginRight: 4, color: COLORS.gray, fontSize: 10 }}>%</Text>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 12, textAlign: 'center', color: incrementCorrectionPercentage !== 0 ? COLORS.blue : COLORS.textPrimary }}>
                            {incrementCorrectionPercentage > 0 ? '+' : ''}{incrementCorrectionPercentage}%
                          </Text>
                        )}
                      </View>

                      <Text style={{ width: 100, fontSize: 12, color: COLORS.green, textAlign: 'right', fontWeight: '500' }}>
                        ₹{incrementAmount.toLocaleString()}
                      </Text>
                      
                      <Text style={{ width: 100, fontSize: 12, color: COLORS.textPrimary, textAlign: 'right', fontWeight: '600' }}>
                        ₹{revisedSalary.toLocaleString()}
                      </Text>

                      {/* Actions */}
                      <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center' }}>
                        {isEditing ? (
                          <>
                            <TouchableOpacity onPress={handleSaveRow} style={{ padding: 6 }}>
                              <Icon name="save" size={18} color={COLORS.green} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleCancelEdit} style={{ padding: 6 }}>
                              <Icon name="close" size={18} color={COLORS.red} />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            <TouchableOpacity onPress={() => setViewModalData(emp)} style={{ padding: 6 }}>
                              <Icon name="visibility" size={18} color={COLORS.gray} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleEditClick(emp)} style={{ padding: 6 }}>
                              <Icon name="edit" size={18} color={COLORS.blue} />
                            </TouchableOpacity>
                            {!isReleased ? (
                              <TouchableOpacity onPress={() => handleApproveRelease(emp)} style={{ padding: 6 }}>
                                <Icon name="check-circle" size={18} color={COLORS.green} />
                              </TouchableOpacity>
                            ) : (
                              <View style={{ padding: 6 }}>
                                <Icon name="check-circle" size={18} color={COLORS.green} />
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}

                {filteredEmployees.length === 0 && (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.gray }}>No records found</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Comment Modal */}
      <Modal
        visible={isCommentModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCommentModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '90%', maxWidth: 400, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>Director Comments</Text>
              <TouchableOpacity onPress={() => setIsCommentModalOpen(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={tempComment}
              onChangeText={setTempComment}
              placeholder="Enter your comments here..."
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

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setIsCommentModalOpen(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.gray }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveComment}
                style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.primary, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.white }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Details Modal */}
      <Modal
        visible={!!viewModalData}
        transparent
        animationType="slide"
        onRequestClose={() => setViewModalData(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>Appraisal Details</Text>
              <TouchableOpacity onPress={() => setViewModalData(null)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {viewModalData && (
              <ScrollView style={{ padding: 16 }}>
                {/* Employee Info */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                  <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.indigoLight, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.indigo }}>
                      {viewModalData.name.charAt(0)}
                    </Text>
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>{viewModalData.name}</Text>
                    <Text style={{ fontSize: 12, color: COLORS.gray }}>{viewModalData.designation} • {viewModalData.department}</Text>
                  </View>
                </View>

                {/* Comments Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                  <View style={{ width: '50%', padding: 4 }}>
                    <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.gray, marginBottom: 4 }}>Self Appraisal</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textPrimary, fontStyle: 'italic' }}>
                        {viewModalData.selfAppraiseeComments || 'No comments'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ width: '50%', padding: 4 }}>
                    <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.gray, marginBottom: 4 }}>Manager Review</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textPrimary, fontStyle: 'italic' }}>
                        {viewModalData.managerComments || 'No comments'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ width: '50%', padding: 4 }}>
                    <View style={{ backgroundColor: COLORS.blueLight, borderRadius: 8, padding: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.blue, marginBottom: 4 }}>Reviewer Comments</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textPrimary, fontStyle: 'italic' }}>
                        {viewModalData.reviewerComments || 'No comments'}
                      </Text>
                    </View>
                  </View>

                  <View style={{ width: '50%', padding: 4 }}>
                    <View style={{ backgroundColor: COLORS.indigoLight, borderRadius: 8, padding: 12 }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.indigo, marginBottom: 4 }}>Director Comments</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textPrimary, fontStyle: 'italic' }}>
                        {viewModalData.directorComments || 'No comments'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Financial Summary */}
                <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12, marginTop: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>Financial Overview</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, color: COLORS.gray }}>Current Salary</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.textPrimary }}>₹{(viewModalData.currentSalary || 0).toLocaleString()}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, color: COLORS.gray }}>Increment</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.green }}>
                        {(viewModalData.incrementPercentage || 0) + (viewModalData.incrementCorrectionPercentage || 0)}%
                      </Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, color: COLORS.gray }}>Increment Amount</Text>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.green }}>₹{(viewModalData.incrementAmount || 0).toLocaleString()}</Text>
                    </View>
                    <View style={{ width: '50%', marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, color: COLORS.gray }}>Revised Salary</Text>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary }}>₹{(viewModalData.revisedSalary || 0).toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setViewModalData(null)}
                style={{ padding: 12, backgroundColor: COLORS.primary, borderRadius: 8, alignItems: 'center' }}
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
        marqueeText="Director Approval • Performance Management • "
      />
    </SafeAreaView>
  );
};

export default DirectorApprovalScreen;