// screens/Performance/AppraisalMasterScreen.tsx
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
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import { performanceAPI, employeeAPI } from '../../services/api';
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
  headerBg: '#0A0F2C',
  alternateRow: '#F9FAFB',
  gridBorder: '#D1D5DB',
};

interface AppraisalMatrix {
  id: string;
  category: string;
  ratings: Rating[];
}

interface Rating {
  grade: string;
  companyPerformance: string;
  belowTarget?: string;
  metTarget?: string;
  target1_1?: string;
  target1_25?: string;
  target1_5?: string;
}

interface EnabledColumns {
  belowTarget: boolean;
  metTarget: boolean;
  target1_1: boolean;
  target1_25: boolean;
  target1_5: boolean;
}

const AppraisalMasterScreen = () => {
  const [matrixData, setMatrixData] = useState<AppraisalMatrix[]>([]);
  const [enabledColumns, setEnabledColumns] = useState<EnabledColumns>({
    belowTarget: false,
    metTarget: true,
    target1_1: false,
    target1_25: false,
    target1_5: false,
  });
  const [financialYear, setFinancialYear] = useState('2025-2026');
  const [editFinancialYear, setEditFinancialYear] = useState('2025-2026');
  const financialYears = ['2025-2026', '2026-2027'];
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editMatrixData, setEditMatrixData] = useState<AppraisalMatrix[]>([]);
  const [editEnabledColumns, setEditEnabledColumns] = useState<EnabledColumns>({
    belowTarget: false,
    metTarget: true,
    target1_1: false,
    target1_25: false,
    target1_5: false,
  });
  const [saving, setSaving] = useState(false);
  
  const [designations, setDesignations] = useState<string[]>([]);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [tempSelectedDesignations, setTempSelectedDesignations] = useState<string[]>([]);
  const [disabledDesignations, setDisabledDesignations] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    columnKey: null as keyof EnabledColumns | null,
    columnName: '',
  });
  
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: '',
  });

  useEffect(() => {
    fetchMatrix();
    fetchDesignations();
  }, [financialYear]);

  const fetchDesignations = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      if (response.data) {
        const uniqueDesignations = [...new Set(
          response.data
            .map((emp: any) => emp.designation || emp.role || emp.position)
            .filter(Boolean)
        )].sort();
        setDesignations(uniqueDesignations);
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      setDesignations([
        'Senior Project Manager', 'Project Manager', 'Assistant Project Manager',
        'Team Lead', 'Senior Detailer', 'Checker', 'Modeler',
        'Junior Detailer', 'Trainee'
      ]);
    }
  };

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const response = await performanceAPI.getIncrementMatrix({ financialYear });

      if (response.data) {
        if (response.data.matrix && response.data.matrix.length > 0) {
          setMatrixData(response.data.matrix);
        } else if (Array.isArray(response.data) && response.data.length > 0) {
          setMatrixData(response.data);
        } else {
          // Set default data structure if empty
          setMatrixData([
            {
              id: '1',
              category: '',
              ratings: [
                { grade: 'Exceeds Expectations (ES)', companyPerformance: '' },
                { grade: 'Meets Expectations (ME)', companyPerformance: '' },
                { grade: 'Below Expectations (BE)', companyPerformance: '' }
              ]
            }
          ]);
        }

        if (response.data.enabledColumns) {
          setEnabledColumns(response.data.enabledColumns);
        }
      }
    } catch (error) {
      console.error('Error fetching increment matrix:', error);
      setMatrixData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatrix();
  };

  const handleEditOpen = () => {
    setEditMatrixData(JSON.parse(JSON.stringify(matrixData)));
    setEditEnabledColumns({ ...enabledColumns });
    setEditFinancialYear(financialYear);
    setIsEditMode(true);
  };

  const handleEditClose = () => {
    setIsEditMode(false);
    setEditMatrixData([]);
  };

  const handleEditSave = async () => {
    try {
      setSaving(true);
      await performanceAPI.saveIncrementMatrix({
        matrixData: editMatrixData,
        enabledColumns: editEnabledColumns,
        financialYear: editFinancialYear
      });

      setSuccessModal({ isOpen: true, message: "Increment Matrix Saved Successfully!" });
      setIsEditMode(false);

      if (financialYear !== editFinancialYear) {
        setFinancialYear(editFinancialYear);
      } else {
        setMatrixData(editMatrixData);
        setEnabledColumns(editEnabledColumns);
      }
    } catch (error) {
      console.error('Error saving increment matrix:', error);
      Alert.alert('Error', 'Failed to save increment matrix');
    } finally {
      setSaving(false);
    }
  };

  const toggleEditColumn = (columnKey: keyof EnabledColumns) => {
    const columnNames = {
      belowTarget: 'Below Target',
      metTarget: 'Met Target',
      target1_1: '1.1 X Target',
      target1_25: '1.25 X Target',
      target1_5: '1.5 X Target'
    };

    if (!editEnabledColumns[columnKey]) {
      setConfirmationModal({
        isOpen: true,
        columnKey,
        columnName: columnNames[columnKey]
      });
    } else {
      setEditEnabledColumns(prev => ({
        ...prev,
        [columnKey]: false
      }));
    }
  };

  const confirmEnableEditColumn = () => {
    const { columnKey } = confirmationModal;
    if (columnKey) {
      setEditEnabledColumns({
        belowTarget: false,
        metTarget: false,
        target1_1: false,
        target1_25: false,
        target1_5: false,
        [columnKey]: true
      });
    }
    setConfirmationModal({ isOpen: false, columnKey: null, columnName: '' });
  };

  const handleEditInputChange = (categoryId: string, gradeIndex: number, field: string, value: string) => {
    setEditMatrixData(prevData => prevData.map(category => {
      if (category.id === categoryId) {
        const newRatings = [...category.ratings];
        newRatings[gradeIndex] = { ...newRatings[gradeIndex], [field]: value };
        return { ...category, ratings: newRatings };
      }
      return category;
    }));
  };

  const openDesignationModal = (category: AppraisalMatrix) => {
    setEditingCategoryId(category.id);
    const currentDesignations = category.category
      ? category.category.split(',').map(d => d.trim()).filter(Boolean)
      : [];
    setTempSelectedDesignations(currentDesignations);

    const otherUsed = new Set<string>();
    editMatrixData.forEach(cat => {
      if (cat.id !== category.id && cat.category) {
        const catDesignations = cat.category.split(',').map(d => d.trim()).filter(Boolean);
        catDesignations.forEach(d => otherUsed.add(d));
      }
    });
    setDisabledDesignations(Array.from(otherUsed));
    setSearchTerm('');
    setShowDesignationModal(true);
  };

  const handleDesignationToggle = (designation: string) => {
    if (disabledDesignations.includes(designation)) return;

    setTempSelectedDesignations(prev => {
      if (prev.includes(designation)) {
        return prev.filter(d => d !== designation);
      } else {
        return [...prev, designation];
      }
    });
  };

  const saveDesignations = () => {
    if (editingCategoryId !== null) {
      const newCategoryString = tempSelectedDesignations.join(', ');
      const updatedMatrixData = editMatrixData.map(cat =>
        cat.id === editingCategoryId
          ? { ...cat, category: newCategoryString }
          : cat
      );
      setEditMatrixData(updatedMatrixData);
      setShowDesignationModal(false);
      setEditingCategoryId(null);
    }
  };

  const getGradeDisplay = (grade: string) => {
    if (grade.includes('Exceeds')) return 'Exceeds Expectations (ES)';
    if (grade.includes('Meets')) return 'Meets Expectations (ME)';
    if (grade.includes('Below')) return 'Below Expectations (BE)';
    return grade;
  };

  // Fixed Table Header
  const renderTableHeader = (isEdit: boolean = false) => {
    const activeColumns = isEdit ? editEnabledColumns : enabledColumns;
    
    return (
      <View style={{ 
        flexDirection: 'row', 
        backgroundColor: COLORS.headerBg,
        borderTopWidth: 1,
        borderTopColor: COLORS.gridBorder,
        borderBottomWidth: 2,
        borderBottomColor: COLORS.gridBorder,
      }}>
        <View style={{ width: 140, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Category</Text>
        </View>
        <View style={{ width: 160, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Ratings</Text>
        </View>
        <View style={{ width: 140, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Company Performance</Text>
        </View>
        {activeColumns.metTarget && (
          <View style={{ width: 110, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
            <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Met Target</Text>
          </View>
        )}
        {activeColumns.belowTarget && (
          <View style={{ width: 110, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
            <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Below Target</Text>
          </View>
        )}
        {activeColumns.target1_1 && (
          <View style={{ width: 110, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
            <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>1.1 X Target</Text>
          </View>
        )}
        {activeColumns.target1_25 && (
          <View style={{ width: 110, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
            <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>1.25 X Target</Text>
          </View>
        )}
        {activeColumns.target1_5 && (
          <View style={{ width: 110, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
            <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>1.5 X Target</Text>
          </View>
        )}
      </View>
    );
  };

  // Render Table Row - Groups designations under categories with ratings as rows
  const renderTableRow = (category: AppraisalMatrix, index: number, isEdit: boolean = false) => {
    const data = isEdit ? editMatrixData.find(c => c.id === category.id) || category : category;
    const activeColumns = isEdit ? editEnabledColumns : enabledColumns;
    const designationsList = data.category ? data.category.split(',').map(d => d.trim()).filter(Boolean) : [];
    
    return (
      <React.Fragment key={category.id}>
        {data.ratings.map((rating, ratingIndex) => (
          <View key={`${category.id}-${rating.grade}`} style={{ 
            flexDirection: 'row', 
            backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.alternateRow,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.gridBorder,
            minHeight: 50,
          }}>
            {/* Category Column - Shows designations only on first rating row */}
            {ratingIndex === 0 ? (
              <View style={{ 
                width: 140, 
                paddingVertical: 10, 
                paddingHorizontal: 8, 
                borderRightWidth: 1, 
                borderRightColor: COLORS.gridBorder,
                justifyContent: 'center',
              }}>
                {isEdit ? (
                  <View>
                    <TouchableOpacity
                      onPress={() => openDesignationModal(category)}
                      style={{
                        position: 'absolute',
                        top: 5,
                        left: 5,
                        padding: 4,
                        backgroundColor: COLORS.blue,
                        borderRadius: 4,
                        zIndex: 1,
                      }}
                    >
                      <Icon name="add" size={12} color={COLORS.white} />
                    </TouchableOpacity>
                    <View style={{ marginTop: 20 }}>
                      {designationsList.length > 0 ? (
                        designationsList.map((d, i) => (
                          <Text key={i} style={{ color: COLORS.textPrimary, fontSize: 12, marginVertical: 2 }}>
                            {d}
                          </Text>
                        ))
                      ) : (
                        <Text style={{ color: COLORS.gray, fontStyle: 'italic', fontSize: 12 }}>
                          No designations
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <View>
                    {designationsList.length > 0 ? (
                      designationsList.map((d, i) => (
                        <Text key={i} style={{ color: COLORS.textPrimary, fontSize: 12, marginVertical: 2 }}>
                          {d}
                        </Text>
                      ))
                    ) : (
                      <Text style={{ color: COLORS.gray, fontStyle: 'italic', fontSize: 12 }}>
                        No designations
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <View style={{ 
                width: 140, 
                paddingVertical: 10, 
                paddingHorizontal: 8, 
                borderRightWidth: 1, 
                borderRightColor: COLORS.gridBorder,
                backgroundColor: COLORS.alternateRow,
              }} />
            )}
            
            {/* Ratings Column */}
            <View style={{ 
              width: 160, 
              paddingVertical: 10, 
              paddingHorizontal: 8, 
              borderRightWidth: 1, 
              borderRightColor: COLORS.gridBorder,
              justifyContent: 'center',
            }}>
              <Text style={{ color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' }}>
                {getGradeDisplay(rating.grade)}
              </Text>
            </View>
            
            {/* Company Performance Column */}
            <View style={{ 
              width: 140, 
              paddingVertical: 10, 
              paddingHorizontal: 8, 
              borderRightWidth: 1, 
              borderRightColor: COLORS.gridBorder,
              justifyContent: 'center',
            }}>
              {isEdit ? (
                <TextInput
                  value={rating.companyPerformance || ''}
                  onChangeText={(text) => handleEditInputChange(category.id, ratingIndex, 'companyPerformance', text)}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 4,
                    padding: 6,
                    fontSize: 12,
                    textAlign: 'center',
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                  keyboardType="numeric"
                  placeholder="%"
                />
              ) : (
                <Text style={{ color: COLORS.textPrimary, fontSize: 12, textAlign: 'center', fontWeight: '500' }}>
                  {rating.companyPerformance ? `${rating.companyPerformance}%` : '-'}
                </Text>
              )}
            </View>
            
            {/* Met Target Column */}
            {activeColumns.metTarget && (
              <View style={{ 
                width: 110, 
                paddingVertical: 10, 
                paddingHorizontal: 8, 
                borderRightWidth: 1, 
                borderRightColor: COLORS.gridBorder,
                justifyContent: 'center',
                backgroundColor: '#deebf7',
              }}>
                {isEdit ? (
                  <TextInput
                    value={rating.metTarget || ''}
                    onChangeText={(text) => handleEditInputChange(category.id, ratingIndex, 'metTarget', text)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 4,
                      padding: 6,
                      fontSize: 12,
                      textAlign: 'center',
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    keyboardType="numeric"
                    placeholder="%"
                    editable={activeColumns.metTarget}
                  />
                ) : (
                  <Text style={{ color: COLORS.textPrimary, fontSize: 12, textAlign: 'center' }}>
                    {rating.metTarget ? `${rating.metTarget}%` : '-'}
                  </Text>
                )}
              </View>
            )}
            
            {/* Below Target Column */}
            {activeColumns.belowTarget && (
              <View style={{ 
                width: 110, 
                paddingVertical: 10, 
                paddingHorizontal: 8, 
                borderRightWidth: 1, 
                borderRightColor: COLORS.gridBorder,
                justifyContent: 'center',
                backgroundColor: '#fff2cc',
              }}>
                {isEdit ? (
                  <TextInput
                    value={rating.belowTarget || ''}
                    onChangeText={(text) => handleEditInputChange(category.id, ratingIndex, 'belowTarget', text)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 4,
                      padding: 6,
                      fontSize: 12,
                      textAlign: 'center',
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    keyboardType="numeric"
                    placeholder="%"
                    editable={activeColumns.belowTarget}
                  />
                ) : (
                  <Text style={{ color: COLORS.textPrimary, fontSize: 12, textAlign: 'center' }}>
                    {rating.belowTarget ? `${rating.belowTarget}%` : '-'}
                  </Text>
                )}
              </View>
            )}
            
            {/* 1.1 X Target Column */}
            {activeColumns.target1_1 && (
              <View style={{ 
                width: 110, 
                paddingVertical: 10, 
                paddingHorizontal: 8, 
                borderRightWidth: 1, 
                borderRightColor: COLORS.gridBorder,
                justifyContent: 'center',
                backgroundColor: '#deebf7',
              }}>
                {isEdit ? (
                  <TextInput
                    value={rating.target1_1 || ''}
                    onChangeText={(text) => handleEditInputChange(category.id, ratingIndex, 'target1_1', text)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 4,
                      padding: 6,
                      fontSize: 12,
                      textAlign: 'center',
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    keyboardType="numeric"
                    placeholder="%"
                    editable={activeColumns.target1_1}
                  />
                ) : (
                  <Text style={{ color: COLORS.textPrimary, fontSize: 12, textAlign: 'center' }}>
                    {rating.target1_1 ? `${rating.target1_1}%` : '-'}
                  </Text>
                )}
              </View>
            )}
            
            {/* 1.25 X Target Column */}
            {activeColumns.target1_25 && (
              <View style={{ 
                width: 110, 
                paddingVertical: 10, 
                paddingHorizontal: 8, 
                borderRightWidth: 1, 
                borderRightColor: COLORS.gridBorder,
                justifyContent: 'center',
                backgroundColor: '#fce4d6',
              }}>
                {isEdit ? (
                  <TextInput
                    value={rating.target1_25 || ''}
                    onChangeText={(text) => handleEditInputChange(category.id, ratingIndex, 'target1_25', text)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 4,
                      padding: 6,
                      fontSize: 12,
                      textAlign: 'center',
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    keyboardType="numeric"
                    placeholder="%"
                    editable={activeColumns.target1_25}
                  />
                ) : (
                  <Text style={{ color: COLORS.textPrimary, fontSize: 12, textAlign: 'center' }}>
                    {rating.target1_25 ? `${rating.target1_25}%` : '-'}
                  </Text>
                )}
              </View>
            )}
            
            {/* 1.5 X Target Column */}
            {activeColumns.target1_5 && (
              <View style={{ 
                width: 110, 
                paddingVertical: 10, 
                paddingHorizontal: 8, 
                borderRightWidth: 1, 
                borderRightColor: COLORS.gridBorder,
                justifyContent: 'center',
                backgroundColor: '#e2efda',
              }}>
                {isEdit ? (
                  <TextInput
                    value={rating.target1_5 || ''}
                    onChangeText={(text) => handleEditInputChange(category.id, ratingIndex, 'target1_5', text)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 4,
                      padding: 6,
                      fontSize: 12,
                      textAlign: 'center',
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    keyboardType="numeric"
                    placeholder="%"
                    editable={activeColumns.target1_5}
                  />
                ) : (
                  <Text style={{ color: COLORS.textPrimary, fontSize: 12, textAlign: 'center' }}>
                    {rating.target1_5 ? `${rating.target1_5}%` : '-'}
                  </Text>
                )}
              </View>
            )}
          </View>
        ))}
      </React.Fragment>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <CommonHeader title="Appraisal Master" showBack={true} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 10, color: COLORS.textSecondary }}>Loading...</Text>
        </View>
        <CommonFooter companyName="CALDIM ENGINEERING PVT LTD" marqueeText="Performance Management • Appraisal Master • " />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Appraisal Master" showBack={true} />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Top Controls */}
        <View style={{ 
          backgroundColor: COLORS.white, 
          borderRadius: 12, 
          borderWidth: 1, 
          borderColor: COLORS.border, 
          marginBottom: 16, 
          padding: 16 
        }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', flex: 1 }}>
              <View style={{ width: 150, marginRight: 8, marginBottom: 8 }}>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={financialYear}
                    onValueChange={(value) => setFinancialYear(value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    {financialYears.map(year => (
                      <PickerItem key={year} label={year} value={year} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
            
            <TouchableOpacity
              onPress={handleEditOpen}
              style={{
                backgroundColor: COLORS.primary,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Icon name="edit" size={18} color={COLORS.white} />
              <Text style={{ marginLeft: 4, color: COLORS.white, fontSize: 12 }}>Edit Matrix</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Table */}
        <View style={{ 
          backgroundColor: COLORS.white, 
          borderRadius: 12, 
          borderWidth: 1, 
          borderColor: COLORS.border, 
          overflow: 'hidden' 
        }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              {renderTableHeader(false)}
              {matrixData.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.gray }}>No data available</Text>
                </View>
              ) : (
                matrixData.map((category, idx) => renderTableRow(category, idx, false))
              )}
            </View>
          </ScrollView>
        </View>
      </ScrollView>

      {/* Edit Matrix Modal */}
      <Modal
        visible={isEditMode}
        transparent
        animationType="slide"
        onRequestClose={handleEditClose}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ 
            flex: 1, 
            backgroundColor: COLORS.white, 
            marginTop: 50,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
          }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: 16, 
              borderBottomWidth: 1, 
              borderBottomColor: COLORS.border,
              backgroundColor: COLORS.primary,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.white }}>Edit Increment Matrix</Text>
              <TouchableOpacity onPress={handleEditClose}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 16 }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>
                  Financial Year
                </Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={editFinancialYear}
                    onValueChange={(value) => setEditFinancialYear(value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    {financialYears.map(year => (
                      <PickerItem key={year} label={year} value={year} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={{ 
                backgroundColor: COLORS.white, 
                borderRadius: 12, 
                borderWidth: 1, 
                borderColor: COLORS.border, 
                overflow: 'hidden' 
              }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View>
                    {/* Edit Table Header with Toggle Buttons */}
                    <View style={{ 
                      flexDirection: 'row', 
                      backgroundColor: COLORS.headerBg,
                      borderTopWidth: 1,
                      borderTopColor: COLORS.gridBorder,
                      borderBottomWidth: 2,
                      borderBottomColor: COLORS.gridBorder,
                    }}>
                      <View style={{ width: 140, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Category</Text>
                      </View>
                      <View style={{ width: 160, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Ratings</Text>
                      </View>
                      <View style={{ width: 140, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Company Performance</Text>
                      </View>
                      
                      {/* Met Target Column with Toggle */}
                      <View style={{ width: 110, paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12, marginBottom: 4 }}>Met Target</Text>
                        <TouchableOpacity
                          onPress={() => toggleEditColumn('metTarget')}
                          style={{
                            backgroundColor: editEnabledColumns.metTarget ? COLORS.success : COLORS.gray,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: COLORS.white, fontSize: 10 }}>
                            {editEnabledColumns.metTarget ? 'Enabled' : 'Disabled'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* Below Target Column with Toggle */}
                      <View style={{ width: 110, paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12, marginBottom: 4 }}>Below Target</Text>
                        <TouchableOpacity
                          onPress={() => toggleEditColumn('belowTarget')}
                          style={{
                            backgroundColor: editEnabledColumns.belowTarget ? COLORS.success : COLORS.gray,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: COLORS.white, fontSize: 10 }}>
                            {editEnabledColumns.belowTarget ? 'Enabled' : 'Disabled'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* 1.1 X Target Column with Toggle */}
                      <View style={{ width: 110, paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12, marginBottom: 4 }}>1.1 X Target</Text>
                        <TouchableOpacity
                          onPress={() => toggleEditColumn('target1_1')}
                          style={{
                            backgroundColor: editEnabledColumns.target1_1 ? COLORS.success : COLORS.gray,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: COLORS.white, fontSize: 10 }}>
                            {editEnabledColumns.target1_1 ? 'Enabled' : 'Disabled'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* 1.25 X Target Column with Toggle */}
                      <View style={{ width: 110, paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12, marginBottom: 4 }}>1.25 X Target</Text>
                        <TouchableOpacity
                          onPress={() => toggleEditColumn('target1_25')}
                          style={{
                            backgroundColor: editEnabledColumns.target1_25 ? COLORS.success : COLORS.gray,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: COLORS.white, fontSize: 10 }}>
                            {editEnabledColumns.target1_25 ? 'Enabled' : 'Disabled'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      
                      {/* 1.5 X Target Column with Toggle */}
                      <View style={{ width: 110, paddingVertical: 8, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12, marginBottom: 4 }}>1.5 X Target</Text>
                        <TouchableOpacity
                          onPress={() => toggleEditColumn('target1_5')}
                          style={{
                            backgroundColor: editEnabledColumns.target1_5 ? COLORS.success : COLORS.gray,
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 4,
                          }}
                        >
                          <Text style={{ color: COLORS.white, fontSize: 10 }}>
                            {editEnabledColumns.target1_5 ? 'Enabled' : 'Disabled'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    {/* Edit Table Rows */}
                    {editMatrixData.length === 0 ? (
                      <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.gray }}>No data available</Text>
                      </View>
                    ) : (
                      editMatrixData.map((category, idx) => renderTableRow(category, idx, true))
                    )}
                  </View>
                </ScrollView>
              </View>
            </ScrollView>

            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'flex-end', 
              padding: 16, 
              borderTopWidth: 1, 
              borderTopColor: COLORS.border 
            }}>
              <TouchableOpacity
                onPress={handleEditClose}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: COLORS.gray,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEditSave}
                disabled={saving}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: saving ? COLORS.gray : COLORS.primary,
                  borderRadius: 6,
                }}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Designation Selection Modal */}
      <Modal
        visible={showDesignationModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDesignationModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ 
            backgroundColor: COLORS.white, 
            borderRadius: 12, 
            width: '90%', 
            maxWidth: 400, 
            maxHeight: '80%',
          }}>
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
              backgroundColor: COLORS.primary,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.white }}>Select Designations</Text>
              <TouchableOpacity onPress={() => setShowDesignationModal(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
                <Icon name="search" size={20} color={COLORS.gray} style={{ marginLeft: 8 }} />
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Search designations..."
                  style={{ flex: 1, padding: 12, fontSize: 14, color: COLORS.textPrimary }}
                  placeholderTextColor={COLORS.gray}
                />
              </View>
            </View>

            <ScrollView style={{ padding: 12 }}>
              {designations
                .filter(d => d.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(designation => {
                  const isDisabled = disabledDesignations.includes(designation);
                  return (
                    <TouchableOpacity
                      key={designation}
                      onPress={() => !isDisabled && handleDesignationToggle(designation)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        backgroundColor: tempSelectedDesignations.includes(designation) ? COLORS.indigoLight : COLORS.white,
                        borderRadius: 8,
                        marginBottom: 8,
                        borderWidth: 1,
                        borderColor: isDisabled ? COLORS.border : COLORS.lightGray,
                        opacity: isDisabled ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: COLORS.textPrimary, fontSize: 13 }}>{designation}</Text>
                      {!isDisabled && (
                        <View style={{ 
                          width: 20, 
                          height: 20, 
                          borderRadius: 4, 
                          borderWidth: 2, 
                          borderColor: COLORS.primary,
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: tempSelectedDesignations.includes(designation) ? COLORS.primary : 'transparent',
                        }}>
                          {tempSelectedDesignations.includes(designation) && (
                            <Icon name="check" size={12} color={COLORS.white} />
                          )}
                        </View>
                      )}
                      {isDisabled && (
                        <Text style={{ fontSize: 10, color: COLORS.gray }}>Already used</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>

            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'flex-end', 
              padding: 16, 
              borderTopWidth: 1, 
              borderTopColor: COLORS.border 
            }}>
              <TouchableOpacity
                onPress={() => setShowDesignationModal(false)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  marginRight: 8,
                  borderWidth: 1,
                  borderColor: COLORS.gray,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveDesignations}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  backgroundColor: COLORS.primary,
                  borderRadius: 6,
                }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>
                  Save ({tempSelectedDesignations.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={confirmationModal.isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmationModal({ isOpen: false, columnKey: null, columnName: '' })}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '80%', maxWidth: 320, padding: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 }}>
              Enable Column
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 }}>
              Are you sure you want to enable "{confirmationModal.columnName}" column? Only one column can be enabled at a time.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setConfirmationModal({ isOpen: false, columnKey: null, columnName: '' })}
                style={{ paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.gray }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmEnableEditColumn}
                style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.primary, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.white }}>Enable</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={successModal.isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSuccessModal({ isOpen: false, message: '' })}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, width: '80%', maxWidth: 320, padding: 20, alignItems: 'center' }}>
            <Icon name="check-circle" size={40} color={COLORS.success} />
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginTop: 12, marginBottom: 8 }}>
              Success
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              {successModal.message}
            </Text>
            <TouchableOpacity
              onPress={() => setSuccessModal({ isOpen: false, message: '' })}
              style={{ paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 6 }}
            >
              <Text style={{ color: COLORS.white }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Performance Management • Appraisal Master • "
      />
    </SafeAreaView>
  );
};

export default AppraisalMasterScreen;