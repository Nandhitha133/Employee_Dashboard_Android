// screens/Performance/IncrementSummaryScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import { performanceAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

interface IncrementRecord {
  id: string;
  empId: string;
  name: string;
  designation: string;
  division: string;
  location: string;
  currentSalary: number;
  revisedSalary: number;
  incrementAmount: number;
  incrementPercentage: number;
  financialYear: string;
  status: string;
  effectiveDate: string;
}

const IncrementSummaryScreen = () => {
  const [records, setRecords] = useState<IncrementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState('2025-26');
  
  // Statistics
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [totalIncrementAmount, setTotalIncrementAmount] = useState(0);
  const [avgIncrementPercentage, setAvgIncrementPercentage] = useState(0);

  const financialYears = ['2023-24', '2024-25', '2025-26', '2026-27', '2027-28'];

  const mapStatus = (status: string): string => {
    if (!status) return 'Pending';
    if (status === 'DIRECTOR_APPROVED') return 'Approved';
    if (status === 'Released' || status === 'RELEASED') return 'Released';
    return 'Pending';
  };

  const deriveEffectiveDate = (financialYear: string, updatedAt: string): string => {
    if (updatedAt) {
      const d = new Date(updatedAt);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    if (financialYear && financialYear.includes('-')) {
      const parts = financialYear.split(/[-/]/);
      const yearStart = parseInt(parts[0], 10);
      if (!isNaN(yearStart)) {
        const d = new Date(yearStart, 3, 1);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return '-';
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await performanceAPI.getIncrementSummary({});
      
      let data = [];
      if (response.data && Array.isArray(response.data)) {
        data = response.data;
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (response.data && response.data.records && Array.isArray(response.data.records)) {
        data = response.data.records;
      }
      
      if (data.length === 0) {
        setRecords([]);
        updateStatistics([]);
        setLoading(false);
        return;
      }
      
      const mapped: IncrementRecord[] = data.map((item: any, index: number) => {
        const status = mapStatus(item.status);
        let fYear = item.financialYr || item.financialYear || '';
        if (fYear && fYear.length === 7 && fYear.indexOf('-') === 4) {
          const parts = fYear.split('-');
          if (parts[1].length === 2) {
            fYear = `${parts[0]}-20${parts[1]}`;
          }
        }

        return {
          id: item.id || `temp-${index}`,
          empId: item.empId || item.employeeId || item.employeeCode || '',
          name: item.name || item.employeeName || item.fullName || '',
          designation: item.designation || item.role || item.position || '',
          division: item.division || item.department || '',
          location: item.location || item.branch || item.office || '',
          currentSalary: Number(item.currentSalary || item.currentCTC || item.basicSalary || 0),
          revisedSalary: Number(item.revisedSalary || item.newCTC || item.revisedCTC || 0),
          incrementAmount: Number(item.incrementAmount || item.incrementValue || 0),
          incrementPercentage: Number(item.incrementPercentage || item.incrementPercent || 0),
          financialYear: fYear || '2025-2026',
          status,
          effectiveDate: deriveEffectiveDate(item.financialYr || item.financialYear, item.updatedAt),
        };
      });
      
      setRecords(mapped);
      updateStatistics(mapped);
      
    } catch (error) {
      console.error('Failed to load increment summary:', error);
      Alert.alert('Error', 'Failed to load increment summary records');
      setRecords([]);
      updateStatistics([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateStatistics = (data: IncrementRecord[]) => {
    const total = data.length;
    const totalInc = data.reduce((sum, item) => sum + (item.incrementAmount || 0), 0);
    const avgInc = total > 0 
      ? data.reduce((sum, item) => sum + (item.incrementPercentage || 0), 0) / total 
      : 0;
    
    setTotalEmployees(total);
    setTotalIncrementAmount(totalInc);
    setAvgIncrementPercentage(avgInc);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getFilteredRecords = () => {
    let filtered = records.filter(record => record.financialYear === selectedFinancialYr);
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        (item.name?.toLowerCase() || '').includes(term) ||
        (item.empId?.toLowerCase() || '').includes(term)
      );
    }
    
    return filtered;
  };

  const handleSearch = (text: string) => {
    setSearchTerm(text);
    const filtered = getFilteredRecords();
    updateStatistics(filtered);
  };

  const getStatusColor = (status: string): { bg: string; text: string } => {
    switch (status) {
      case 'Released':
        return { bg: '#D1FAE5', text: '#065F46' };
      case 'Approved':
        return { bg: '#DBEAFE', text: '#1E40AF' };
      case 'Pending':
        return { bg: '#FEF3C7', text: '#92400E' };
      default:
        return { bg: '#F3F4F6', text: '#1F2937' };
    }
  };

  const handleDownloadLetter = async (row: IncrementRecord) => {
    Alert.alert('Release Letter', `Download letter for ${row.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Download', onPress: () => Alert.alert('Info', 'PDF generation feature coming soon') },
    ]);
  };

  const filteredRecords = getFilteredRecords();

  // Stats Card Component
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
      
      <CommonHeader title="Increment Summary" showBack={true} />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Filters Section - Matches Attendance Summary */}
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
            <TextInput
              value={searchTerm}
              onChangeText={handleSearch}
              placeholder="Search by name or ID..."
              placeholderTextColor={COLORS.gray}
              style={styles.searchInput}
            />
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
                  {financialYears.map((year) => (
                    <PickerItem key={year} label={year} value={year} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Icon name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards - Styled like Attendance Summary */}
        <View style={styles.statsRow}>
          <StatsCard
            title="Total Employees"
            value={totalEmployees}
            description="Employees with increment"
            bgColor="#EEF2FF"
            textColor="#1E3A8A"
            icon="people"
          />
          <StatsCard
            title="Total Increment Amount"
            value={`₹${totalIncrementAmount.toLocaleString()}`}
            description="Total increment value"
            bgColor="#ECFDF5"
            textColor="#065F46"
            icon="trending-up"
          />
          <StatsCard
            title="Avg Increment %"
            value={`${avgIncrementPercentage.toFixed(2)}%`}
            description="Average increment percentage"
            bgColor="#FFFBEB"
            textColor="#92400E"
            icon="percent"
          />
        </View>

        {/* Table */}
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading increment summary...</Text>
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
                  <Text style={[styles.headerText, styles.headerCurrent]}>Current Salary</Text>
                  <Text style={[styles.headerText, styles.headerRevised]}>Revised Salary</Text>
                  <Text style={[styles.headerText, styles.headerAmount]}>Increment Amt</Text>
                  <Text style={[styles.headerText, styles.headerPct]}>Increment %</Text>
                  <Text style={[styles.headerText, styles.headerDate]}>Effective Date</Text>
                  <Text style={[styles.headerText, styles.headerStatus]}>Status</Text>
                  <Text style={[styles.headerText, styles.headerLetter]}>Letter</Text>
                </View>

                {/* Table Rows */}
                {filteredRecords.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={styles.emptyText}>No records found</Text>
                  </View>
                ) : (
                  filteredRecords.map((row, index) => {
                    const statusColors = getStatusColor(row.status);
                    
                    return (
                      <View 
                        key={row.id} 
                        style={[styles.tableRow, index % 2 === 0 && styles.alternateRow]}
                      >
                        <Text style={[styles.cellText, styles.cellSNo]}>{index + 1}</Text>
                        <Text style={[styles.cellText, styles.cellEmpId, styles.fontMedium]}>{row.empId}</Text>
                        <Text style={[styles.cellText, styles.cellName]} numberOfLines={1}>{row.name}</Text>
                        <Text style={[styles.cellText, styles.cellCurrent, styles.textRight]}>
                          ₹{row.currentSalary.toLocaleString()}
                        </Text>
                        <Text style={[styles.cellText, styles.cellRevised, styles.textRight, styles.fontBold, { color: COLORS.primary }]}>
                          ₹{row.revisedSalary.toLocaleString()}
                        </Text>
                        <Text style={[styles.cellText, styles.cellAmount, styles.textRight, styles.incrementAmount]}>
                          +₹{row.incrementAmount.toLocaleString()}
                        </Text>
                        <Text style={[styles.cellText, styles.cellPct, styles.textCenter]}>
                          {row.incrementPercentage}%
                        </Text>
                        <Text style={[styles.cellText, styles.cellDate, styles.textCenter, { fontSize: 11, color: COLORS.textSecondary }]}>
                          {row.effectiveDate}
                        </Text>
                        <View style={styles.cellStatus}>
                          <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
                            <Text style={[styles.statusText, { color: statusColors.text }]}>
                              {row.status}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.cellLetter}>
                          {(row.status === 'Approved' || row.status === 'Released') ? (
                            <TouchableOpacity
                              onPress={() => handleDownloadLetter(row)}
                              style={styles.letterButton}
                            >
                              <Icon name="download" size={12} color={COLORS.white} />
                              <Text style={styles.letterButtonText}>Letter</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.pendingText}>Pending</Text>
                          )}
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
                Showing {filteredRecords.length} of {records.length} records
              </Text>
              <Text style={styles.footerText}>
                Total Inc: ₹{totalIncrementAmount.toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Performance Management • Increment Summary • "
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
    alignItems: 'flex-end' as const,
  },
  pickerContainer: {
    flex: 1,
    minWidth: 150,
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
  refreshButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    gap: 4,
    marginBottom: 8,
  },
  refreshButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500' as const,
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
  headerEmpId: { width: 100 },
  headerName: { width: 150 },
  headerCurrent: { width: 100, textAlign: 'right' as const, paddingRight: 8 },
  headerRevised: { width: 100, textAlign: 'right' as const, paddingRight: 8 },
  headerAmount: { width: 100, textAlign: 'right' as const, paddingRight: 8 },
  headerPct: { width: 80, textAlign: 'center' as const },
  headerDate: { width: 100, textAlign: 'center' as const },
  headerStatus: { width: 100, textAlign: 'center' as const },
  headerLetter: { width: 80, textAlign: 'center' as const },
  
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
  cellEmpId: { width: 100 },
  cellName: { width: 150 },
  cellCurrent: { width: 100 },
  cellRevised: { width: 100 },
  cellAmount: { width: 100 },
  cellPct: { width: 80 },
  cellDate: { width: 100 },
  cellStatus: { width: 100, alignItems: 'center' as const },
  cellLetter: { width: 80, alignItems: 'center' as const },
  
  fontMedium: {
    fontWeight: '500' as const,
  },
  fontBold: {
    fontWeight: '600' as const,
  },
  textRight: {
    textAlign: 'right' as const,
    paddingRight: 8,
  },
  textCenter: {
    textAlign: 'center' as const,
  },
  incrementAmount: {
    color: COLORS.green,
    fontWeight: '500' as const,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center' as const,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  letterButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
  },
  letterButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  pendingText: {
    color: COLORS.gray,
    fontSize: 11,
    fontStyle: 'italic' as const,
  },
  footerSummary: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    backgroundColor: COLORS.filterBg,
    paddingVertical: 12,
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
};

export default IncrementSummaryScreen;