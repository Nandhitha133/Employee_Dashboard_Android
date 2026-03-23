// screens/Performance/TeamAppraisal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';
import { performanceAPI } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Colors
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

// Types
type RootStackParamList = {
  TeamAppraisal: undefined;
  Dashboard: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TeamAppraisal'>;

interface Employee {
  id: number;
  financialYr: string;
  empId: string;
  name: string;
  designation: string;
  department: string;
  division: string;
  location: string;
  selfAppraiseeComments: string;
  managerComments: string;
  status: string;
}

const TeamAppraisal = () => {
  const navigation = useNavigation<NavigationProp>();
  
  // State for employees list
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // State for search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  // State for modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Get unique filter options
  const uniqueYears = [...new Set(employees.map(e => e.financialYr).filter(Boolean))].sort().reverse();
  const uniqueDivisions = [...new Set(employees.map(e => e.division).filter(Boolean))].sort();
  const uniqueLocations = [...new Set(employees.map(e => e.location).filter(Boolean))].sort();

  // Fetch employees on mount
  useEffect(() => {
    fetchTeamAppraisals();
  }, []);

  // Filter employees when search or filters change
  useEffect(() => {
    let filtered = [...employees];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.name.toLowerCase().includes(term) ||
        emp.empId.toLowerCase().includes(term)
      );
    }
    
    if (selectedFinancialYr) {
      filtered = filtered.filter(emp => emp.financialYr === selectedFinancialYr);
    }
    
    if (selectedDivision) {
      filtered = filtered.filter(emp => emp.division === selectedDivision);
    }
    
    if (selectedLocation) {
      filtered = filtered.filter(emp => emp.location === selectedLocation);
    }
    
    setFilteredEmployees(filtered);
  }, [searchTerm, selectedFinancialYr, selectedDivision, selectedLocation, employees]);

  const fetchTeamAppraisals = async () => {
    try {
      setLoading(true);
      const response = await performanceAPI.getTeamAppraisals();
      // Handle response data properly
      const data = response.data || [];
      setEmployees(data);
      
      // Set default financial year if available
      if (data.length > 0 && !selectedFinancialYr) {
        const years = [...new Set(data.map((e: Employee) => e.financialYr).filter(Boolean))];
        if (years.length > 0) {
          setSelectedFinancialYr(years[0]);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch team appraisals', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch team appraisals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeamAppraisals();
  };

  const handleView = (emp: Employee) => {
    setSelectedEmployee(emp);
    setModalVisible(true);
  };

  const handleEdit = (emp: Employee) => {
    Alert.alert('Edit', `Edit ${emp.name}`);
    // Navigate to edit screen or open edit modal
  };

  const getStatusBadge = (status: string): { bg: string; text: string; label: string } => {
    switch (status) {
      case 'APPRAISER_COMPLETED':
        return { bg: '#D1FAE5', text: '#065F46', label: 'Completed' };
      case 'Submitted':
      case 'SUBMITTED':
        return { bg: '#DBEAFE', text: '#1E40AF', label: 'Submitted' };
      default:
        return { bg: '#FEF3C7', text: '#92400E', label: 'Pending' };
    }
  };

  const StatsCard = ({ title, value, description, bgColor, textColor, icon }: any) => (
    <View style={[styles.statsCard, { backgroundColor: bgColor }]}>
      <View style={styles.statsCardHeader}>
        <View style={[styles.statsIconContainer, { backgroundColor: textColor + '20' }]}>
          <Icon name={icon} size={24} color={textColor} />
        </View>
      </View>
      <Text style={[styles.statsValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statsTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.statsDescription, { color: textColor + 'CC' }]}>{description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Team Appraisal" showBack={true} />

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
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search by name or ID..."
              placeholderTextColor={COLORS.gray}
              style={styles.searchInput}
            />
            {searchTerm !== '' && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Icon name="close" size={18} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            {/* Financial Year Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.filterLabel}>Financial Year</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedFinancialYr}
                  onValueChange={(value) => setSelectedFinancialYr(value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Years" value="" color={COLORS.dropdownText} />
                  {uniqueYears.map((year) => (
                    <PickerItem key={year} label={year} value={year} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Division Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.filterLabel}>Division</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedDivision}
                  onValueChange={(value) => setSelectedDivision(value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Divisions" value="" color={COLORS.dropdownText} />
                  {uniqueDivisions.map((div) => (
                    <PickerItem key={div} label={div} value={div} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Location Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.filterLabel}>Location</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={selectedLocation}
                  onValueChange={(value) => setSelectedLocation(value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Locations" value="" color={COLORS.dropdownText} />
                  {uniqueLocations.map((loc) => (
                    <PickerItem key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <StatsCard
            title="Total Employees"
            value={filteredEmployees.length}
            description="Team members"
            bgColor="#EEF2FF"
            textColor="#1E3A8A"
            icon="people"
          />
          <StatsCard
            title="Pending Reviews"
            value={filteredEmployees.filter(e => e.status !== 'APPRAISER_COMPLETED' && e.status !== 'SUBMITTED').length}
            description="Awaiting review"
            bgColor="#FFFBEB"
            textColor="#92400E"
            icon="pending-actions"
          />
          <StatsCard
            title="Completed"
            value={filteredEmployees.filter(e => e.status === 'APPRAISER_COMPLETED' || e.status === 'SUBMITTED').length}
            description="Reviews completed"
            bgColor="#ECFDF5"
            textColor="#065F46"
            icon="check-circle"
          />
        </View>

        {/* Table */}
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading team appraisals...</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerText, styles.headerSNo]}>S.No</Text>
                  <Text style={[styles.headerText, styles.headerYear]}>FY</Text>
                  <Text style={[styles.headerText, styles.headerEmpId]}>Employee ID</Text>
                  <Text style={[styles.headerText, styles.headerName]}>Employee Name</Text>
                  <Text style={[styles.headerText, styles.headerSelf]}>Self Comments</Text>
                  <Text style={[styles.headerText, styles.headerManager]}>Manager Comments</Text>
                  <Text style={[styles.headerText, styles.headerStatus]}>Status</Text>
                  <Text style={[styles.headerText, styles.headerActions]}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredEmployees.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={styles.emptyText}>No records found</Text>
                  </View>
                ) : (
                  filteredEmployees.map((item, index) => {
                    const statusBadge = getStatusBadge(item.status);
                    
                    return (
                      <View key={item.id} style={[styles.tableRow, index % 2 === 0 && styles.alternateRow]}>
                        <Text style={[styles.cellText, styles.cellSNo]}>{index + 1}</Text>
                        <Text style={[styles.cellText, styles.cellYear, styles.fontMedium]}>{item.financialYr}</Text>
                        <Text style={[styles.cellText, styles.cellEmpId]}>{item.empId}</Text>
                        <Text style={[styles.cellText, styles.cellName]} numberOfLines={1}>{item.name}</Text>
                        <Text style={[styles.cellText, styles.cellSelf]} numberOfLines={2}>
                          {item.selfAppraiseeComments || '-'}
                        </Text>
                        <Text style={[styles.cellText, styles.cellManager]} numberOfLines={2}>
                          {item.managerComments || '-'}
                        </Text>
                        <View style={styles.cellStatus}>
                          <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
                            <Text style={[styles.statusText, { color: statusBadge.text }]}>
                              {statusBadge.label}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.cellActions}>
                          <TouchableOpacity
                            onPress={() => handleView(item)}
                            style={styles.actionButton}
                          >
                            <Icon name="visibility" size={18} color={COLORS.gray} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleEdit(item)}
                            style={styles.actionButton}
                          >
                            <Icon name="edit" size={18} color={COLORS.blue} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </ScrollView>

            {/* Footer Summary */}
            <View style={styles.footerSummary}>
              <Text style={styles.footerText}>
                Showing {filteredEmployees.length} of {employees.length} employees
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* View Details Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Icon name="person" size={20} color={COLORS.white} />
              <Text style={styles.modalTitle}>Employee Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {selectedEmployee && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.employeeInfoHeader}>
                  <View style={styles.employeeAvatar}>
                    <Text style={styles.employeeAvatarText}>
                      {selectedEmployee.name?.charAt(0) || 'E'}
                    </Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{selectedEmployee.name}</Text>
                    <Text style={styles.employeeDesignation}>
                      {selectedEmployee.designation} • {selectedEmployee.department}
                    </Text>
                    <Text style={styles.employeeId}>{selectedEmployee.empId}</Text>
                  </View>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Financial Year</Text>
                  <Text style={styles.detailValue}>{selectedEmployee.financialYr}</Text>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Division</Text>
                  <Text style={styles.detailValue}>{selectedEmployee.division || '-'}</Text>
                </View>

                <View style={styles.detailCard}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{selectedEmployee.location || '-'}</Text>
                </View>

                <View style={styles.commentCard}>
                  <Text style={styles.commentCardTitle}>Self Appraisal Comments</Text>
                  <Text style={styles.commentText}>
                    {selectedEmployee.selfAppraiseeComments || 'No comments provided'}
                  </Text>
                </View>

                <View style={styles.commentCard}>
                  <Text style={styles.commentCardTitle}>Manager Comments</Text>
                  <Text style={styles.commentText}>
                    {selectedEmployee.managerComments || 'No comments yet'}
                  </Text>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeModalButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Performance Management • Team Appraisal • "
      />
    </SafeAreaView>
  );
};

const styles = {
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  pickerContainer: {
    flex: 1,
    minWidth: 120,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.dropdownBg,
    overflow: 'hidden' as const,
  },
  picker: {
    height: 45,
    color: COLORS.dropdownText,
  },
  statsRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    minWidth: SCREEN_WIDTH * 0.28,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsCardHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    marginBottom: 12,
  },
  statsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    marginBottom: 4,
  },
  statsTitle: {
    fontSize: 11,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  statsDescription: {
    fontSize: 10,
  },
  loaderContainer: {
    padding: 40,
    alignItems: 'center' as const,
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
    overflow: 'hidden' as const,
  },
  tableHeader: {
    flexDirection: 'row' as const,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerText: {
    color: COLORS.white,
    fontWeight: '600' as const,
    fontSize: 12,
  },
  headerSNo: { width: 50, textAlign: 'center' as const },
  headerYear: { width: 70, textAlign: 'center' as const },
  headerEmpId: { width: 100 },
  headerName: { width: 130 },
  headerSelf: { width: 150 },
  headerManager: { width: 150 },
  headerStatus: { width: 100, textAlign: 'center' as const },
  headerActions: { width: 80, textAlign: 'center' as const },
  
  tableRow: {
    flexDirection: 'row' as const,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  alternateRow: {
    backgroundColor: COLORS.filterBg,
  },
  cellText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  cellSNo: { width: 50, textAlign: 'center' as const },
  cellYear: { width: 70, textAlign: 'center' as const },
  cellEmpId: { width: 100 },
  cellName: { width: 130 },
  cellSelf: { width: 150 },
  cellManager: { width: 150 },
  cellStatus: { width: 100, alignItems: 'center' as const },
  cellActions: { width: 80, flexDirection: 'row' as const, justifyContent: 'center' as const, gap: 8 },
  
  fontMedium: {
    fontWeight: '500' as const,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center' as const,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  actionButton: {
    padding: 4,
  },
  footerSummary: {
    flexDirection: 'row' as const,
    justifyContent: 'flex-end' as const,
    alignItems: 'center' as const,
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
    alignItems: 'center' as const,
  },
  emptyText: {
    marginTop: 12,
    color: COLORS.gray,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    overflow: 'hidden' as const,
  },
  modalHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  modalTitle: {
    flex: 1,
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  closeModalButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  closeModalButtonText: {
    color: COLORS.white,
    fontWeight: '600' as const,
  },
  employeeInfoHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
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
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  employeeAvatarText: {
    fontSize: 20,
    fontWeight: 'bold' as const,
    color: COLORS.indigo,
  },
  employeeInfo: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600' as const,
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
  detailCard: {
    backgroundColor: COLORS.filterBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: COLORS.textPrimary,
  },
  commentCard: {
    backgroundColor: COLORS.filterBg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  commentCardTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.primary,
    marginBottom: 8,
  },
  commentText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
};

export default TeamAppraisal;