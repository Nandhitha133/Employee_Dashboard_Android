// screens/Performance/AppraisalWorkflowScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  TextInput,
  RefreshControl,
  Dimensions,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import { employeeAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  redLight: '#FEE2E2',
};

const FINANCIAL_YEARS = ['2023-24', '2024-25', '2025-26'];

interface Employee {
  id: string;
  employeeId: string;
  name: string;
  appraiser?: string;
  reviewer?: string;
  director?: string;
  division?: string;
  designation?: string;
  location?: string;
}

interface WorkflowRow {
  id: string;
  financialYr: string;
  empId: string;
  name: string;
  appraiser: string;
  reviewer: string;
  director: string;
  division: string;
  designation: string;
  location: string;
}

interface UserOption {
  name: string;
  label: string;
}

const AppraisalWorkflowScreen = () => {
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('2025-26');
  const [searchQuery, setSearchQuery] = useState('');
  const [appraiserOptions, setAppraiserOptions] = useState<UserOption[]>([]);
  const [reviewerOptions, setReviewerOptions] = useState<UserOption[]>([]);
  const [directorOptions, setDirectorOptions] = useState<UserOption[]>([]);
  
  const [rows, setRows] = useState<WorkflowRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});

  // Modal state for dropdown
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<{
    rowId: string;
    field: string;
    currentValue: string;
    options: UserOption[];
    title: string;
  } | null>(null);

  // Filter Options
  const [divisionOptions, setDivisionOptions] = useState<string[]>([]);
  const [designationOptions, setDesignationOptions] = useState<string[]>([]);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);
  
  const [filters, setFilters] = useState({
    division: '',
    designation: '',
    location: ''
  });

  useEffect(() => {
    fetchWorkflowUsers();
  }, []);

  useEffect(() => {
    filterRows();
  }, [filters, rows, searchQuery]);

  const fetchWorkflowUsers = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getAllEmployees();
      const employees: Employee[] = (response.data as any) || [];
      
      // Populate rows with fetched employees
      const formattedRows: WorkflowRow[] = employees.map((emp, index) => ({
        id: emp.id || (emp as any)._id || `row-${index}`,
        financialYr: selectedFinancialYear,
        empId: emp.employeeId || '',
        name: emp.name || '',
        appraiser: emp.appraiser || '',
        reviewer: emp.reviewer || '',
        director: emp.director || '',
        division: emp.division || '',
        designation: emp.designation || '',
        location: emp.location || ''
      }));

      // Sort by Employee ID
      formattedRows.sort((a, b) => {
        const idA = a.empId || '';
        const idB = b.empId || '';
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });

      setRows(formattedRows);
      setFilteredRows(formattedRows);
      
      // Get unique filter options
      const divisions = [...new Set(employees.map(e => e.division).filter((x): x is string => !!x))].sort();
      const designations = [...new Set(employees.map(e => e.designation).filter((x): x is string => !!x))].sort();
      const locations = [...new Set(employees.map(e => e.location).filter((x): x is string => !!x))].sort();
      
      setDivisionOptions(divisions);
      setDesignationOptions(designations);
      setLocationOptions(locations);

      // Get appraiser options based on designations
      const appraiserDesignations = [
        'GENERAL MANAGER (GM)',
        'GENERAL MANAGER GM',
        'MANAGING DIRECTOR (MD)',
        'MANAGING DIRECTOR MD',
        'SR PROJECT MANAGER'
      ];
      setAppraiserOptions(getFilteredOptions(employees, appraiserDesignations));

      // Get reviewer options
      const reviewerDesignations = ['GENERAL MANAGER (GM)', 'GENERAL MANAGER GM'];
      setReviewerOptions(getFilteredOptions(employees, reviewerDesignations));

      // Get director options
      const directorDesignations = ['MANAGING DIRECTOR (MD)', 'MANAGING DIRECTOR MD'];
      setDirectorOptions(getFilteredOptions(employees, directorDesignations));

    } catch (error: any) {
      console.error("Error fetching employees:", error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch employees');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFilteredOptions = (employees: Employee[], designations: string[]): UserOption[] => {
    const filtered = employees
      .filter(emp => {
        const designation = (emp.designation || '').trim().toUpperCase();
        return designations.some(d => designation.includes(d));
      })
      .map(emp => ({
        name: emp.name,
        label: `${emp.name} (${emp.employeeId})`
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    
    // Remove duplicates by name
    const uniqueMap = new Map();
    filtered.forEach(item => {
      if (!uniqueMap.has(item.name)) {
        uniqueMap.set(item.name, item);
      }
    });
    
    return Array.from(uniqueMap.values());
  };

  const filterRows = () => {
    let result = [...rows];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(row => 
        (row.empId && row.empId.toLowerCase().includes(query)) || 
        (row.name && row.name.toLowerCase().includes(query))
      );
    }

    if (filters.division) {
      result = result.filter(row => row.division === filters.division);
    }
    if (filters.designation) {
      result = result.filter(row => row.designation === filters.designation);
    }
    if (filters.location) {
      result = result.filter(row => row.location === filters.location);
    }
    
    setFilteredRows(result);
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      division: '',
      designation: '',
      location: ''
    });
    setSearchQuery('');
  };

  const openDropdownModal = (rowId: string, field: string, currentValue: string, options: UserOption[], title: string) => {
    setModalData({
      rowId,
      field,
      currentValue,
      options,
      title
    });
    setModalVisible(true);
  };

  const handleModalSelect = (value: string) => {
    if (modalData) {
      handleDropdownChange(modalData.rowId, modalData.field, value);
      setModalVisible(false);
      setModalData(null);
    }
  };

  const handleDropdownChange = (id: string, field: string, value: string) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSave = async (id: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;

    setSavingMap(prev => ({ ...prev, [id]: true }));
    
    try {
      const dataToSave = { 
        appraiser: row.appraiser,
        reviewer: row.reviewer,
        director: row.director
      };
      
      await employeeAPI.updateEmployee(id, dataToSave);
      
      Alert.alert('Success', `Workflow saved for ${row.name} successfully!`);
    } catch (error: any) {
      console.error("Error saving workflow:", error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save workflow');
    } finally {
      setSavingMap(prev => ({ ...prev, [id]: false }));
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkflowUsers();
  };

  const hasActiveFilters = filters.division || filters.designation || filters.location || searchQuery;

  const getDisplayValue = (value: string, options: UserOption[]) => {
    if (!value) return 'Select';
    const option = options.find(opt => opt.name === value);
    return option ? option.label : value;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Appraisal Workflow" showBack={true} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Filters Section */}
        <View style={styles.filtersContainer}>
          {/* Search Box */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by ID or Name..."
              placeholderTextColor={COLORS.gray}
              style={styles.searchInput}
            />
          </View>

          <View style={styles.filterRow}>
            {/* Division Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.filterLabel}>Division</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={filters.division}
                  onValueChange={(value) => handleFilterChange('division', value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Divisions" value="" color={COLORS.dropdownText} />
                  {divisionOptions.map((div, index) => (
                    <PickerItem key={`${div}-${index}`} label={div} value={div} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Designation Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.filterLabel}>Designation</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={filters.designation}
                  onValueChange={(value) => handleFilterChange('designation', value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Designations" value="" color={COLORS.dropdownText} />
                  {designationOptions.map((des, index) => (
                    <PickerItem key={`${des}-${index}`} label={des} value={des} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Location Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.filterLabel}>Location</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={filters.location}
                  onValueChange={(value) => handleFilterChange('location', value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Locations" value="" color={COLORS.dropdownText} />
                  {locationOptions.map((loc, index) => (
                    <PickerItem key={`${loc}-${index}`} label={loc} value={loc} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
              <Icon name="clear" size={16} color={COLORS.red} />
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Table */}
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading workflow data...</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerText, styles.headerSNo]}>S.No</Text>
                  <Text style={[styles.headerText, styles.headerEmpId]}>Employee ID</Text>
                  <Text style={[styles.headerText, styles.headerName]}>Employee Name</Text>
                  <Text style={[styles.headerText, styles.headerAppraiser]}>Appraiser</Text>
                  <Text style={[styles.headerText, styles.headerReviewer]}>Reviewer</Text>
                  <Text style={[styles.headerText, styles.headerDirector]}>Director</Text>
                  <Text style={[styles.headerText, styles.headerActions]}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredRows.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={styles.emptyText}>No records found</Text>
                  </View>
                ) : (
                  filteredRows.map((row, index) => (
                    <View key={`${row.id}-${index}`} style={[styles.tableRow, index % 2 === 0 && styles.alternateRow]}>
                      <Text style={[styles.cellText, styles.cellSNo]}>{index + 1}</Text>
                      <Text style={[styles.cellText, styles.cellEmpId, styles.fontMedium]}>{row.empId}</Text>
                      <Text style={[styles.cellText, styles.cellName]} numberOfLines={1}>{row.name}</Text>
                      
                      {/* Appraiser Button */}
                      <View style={styles.cellAppraiser}>
                        <TouchableOpacity
                          style={styles.dropdownButton}
                          onPress={() => openDropdownModal(row.id, 'appraiser', row.appraiser, appraiserOptions, 'Select Appraiser')}
                        >
                          <Text 
                            style={[styles.dropdownButtonText, !row.appraiser && styles.placeholderText]}
                            numberOfLines={1}
                          >
                            {getDisplayValue(row.appraiser, appraiserOptions)}
                          </Text>
                          <Icon name="arrow-drop-down" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                      </View>

                      {/* Reviewer Button */}
                      <View style={styles.cellReviewer}>
                        <TouchableOpacity
                          style={styles.dropdownButton}
                          onPress={() => openDropdownModal(row.id, 'reviewer', row.reviewer, reviewerOptions, 'Select Reviewer')}
                        >
                          <Text 
                            style={[styles.dropdownButtonText, !row.reviewer && styles.placeholderText]}
                            numberOfLines={1}
                          >
                            {getDisplayValue(row.reviewer, reviewerOptions)}
                          </Text>
                          <Icon name="arrow-drop-down" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                      </View>

                      {/* Director Button */}
                      <View style={styles.cellDirector}>
                        <TouchableOpacity
                          style={styles.dropdownButton}
                          onPress={() => openDropdownModal(row.id, 'director', row.director, directorOptions, 'Select Director')}
                        >
                          <Text 
                            style={[styles.dropdownButtonText, !row.director && styles.placeholderText]}
                            numberOfLines={1}
                          >
                            {getDisplayValue(row.director, directorOptions)}
                          </Text>
                          <Icon name="arrow-drop-down" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                      </View>

                      {/* Actions */}
                      <View style={styles.cellActions}>
                        <TouchableOpacity
                          onPress={() => handleSave(row.id)}
                          disabled={savingMap[row.id]}
                          style={[styles.saveButton, savingMap[row.id] && styles.saveButtonDisabled]}
                        >
                          <Icon name="save" size={16} color={COLORS.white} />
                          <Text style={styles.saveButtonText}>
                            {savingMap[row.id] ? 'Saving...' : 'Save'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>

            {/* Footer Summary */}
            <View style={styles.footerSummary}>
              <Text style={styles.footerText}>
                Showing {filteredRows.length} of {rows.length} employees
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Custom Dropdown Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalData?.title || 'Select Option'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleModalSelect('')}
              >
                <Text style={styles.modalOptionText}>Clear Selection</Text>
                {modalData?.currentValue === '' && (
                  <Icon name="check" size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
              
              {modalData?.options.map((option, index) => (
                <TouchableOpacity
                  key={`${option.name}-${index}`}
                  style={styles.modalOption}
                  onPress={() => handleModalSelect(option.name)}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={styles.modalOptionText}>{option.label}</Text>
                    {modalData?.currentValue === option.name && (
                      <Icon name="check" size={18} color={COLORS.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Performance Management • Appraisal Workflow • "
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  filtersContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    marginBottom: 12,
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  pickerContainer: {
    flex: 1,
    minWidth: 120,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginBottom: 4,
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
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.redLight,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  clearFiltersText: {
    fontSize: 12,
    color: COLORS.red,
    fontWeight: '500',
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
    paddingHorizontal: 8,
  },
  headerText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  headerSNo: { width: 50, textAlign: 'center' },
  headerEmpId: { width: 100 },
  headerName: { width: 150 },
  headerAppraiser: { width: 200 },
  headerReviewer: { width: 200 },
  headerDirector: { width: 200 },
  headerActions: { width: 90, textAlign: 'center' },
  
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
    minHeight: 55,
  },
  alternateRow: {
    backgroundColor: COLORS.filterBg,
  },
  cellText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  cellSNo: { width: 50, textAlign: 'center' },
  cellEmpId: { width: 100 },
  cellName: { width: 150 },
  cellAppraiser: { width: 200, justifyContent: 'center' },
  cellReviewer: { width: 200, justifyContent: 'center' },
  cellDirector: { width: 200, justifyContent: 'center' },
  cellActions: { width: 90, alignItems: 'center', justifyContent: 'center' },
  
  fontMedium: {
    fontWeight: '500',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: 38,
  },
  dropdownButtonText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  placeholderText: {
    color: COLORS.gray,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '500',
  },
  footerSummary: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: COLORS.filterBg,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  modalCancelButton: {
    backgroundColor: COLORS.lightGray,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.gray,
    fontWeight: '500',
  },
});

export default AppraisalWorkflowScreen;