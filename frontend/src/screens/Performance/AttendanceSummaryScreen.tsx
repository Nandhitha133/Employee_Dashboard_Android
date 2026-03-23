// screens/Performance/AttendanceSummaryScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
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
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
const PickerItem = Picker.Item as any;
import { employeeAPI, attendanceAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';

const { width } = Dimensions.get('window');

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
  dropdownBg: '#FFFFFF',
  dropdownText: '#000000',
};

const FINANCIAL_YEARS = ['2023-24', '2024-25', '2025-26', '2026-27', '2027-28', '2028-29', '2029-30'];

interface Employee {
  employeeId?: string;
  empId?: string;
  id?: string;
  name?: string;
  employeeName?: string;
  division?: string;
  location?: string;
  branch?: string;
}

interface AttendanceSummaryItem {
  employeeId?: string;
  employeeCode?: string;
  yearlyPresent?: number;
  inCount?: number;
  yearlyAbsent?: number;
}

interface AttendanceRow {
  empId: string;
  name: string;
  division: string;
  location: string;
  yearlyPresent: number;
  yearlyAbsent: number;
  yearlyPct: number;
  hasManualRecord: boolean;
}

const getFinancialYearRange = (financialYear: string) => {
  const parts = String(financialYear || '').split('-');
  const startYear = parseInt(parts[0], 10) || new Date().getFullYear();
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end };
};

const getWorkingDaysBetween = (start: Date, end: Date) => {
  let count = 0;
  const current = new Date(start.getTime());
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const getTotalDaysBetween = (start: Date, end: Date) => {
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};

const AttendanceSummaryScreen = () => {
  const [financialYear, setFinancialYear] = useState(() => {
    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;
    const defaultLabel = `${currentYear}-${String(nextYear).slice(-2)}`;
    if (FINANCIAL_YEARS.includes(defaultLabel)) return defaultLabel;
    return FINANCIAL_YEARS[FINANCIAL_YEARS.length - 1];
  });

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    division: 'all',
    location: 'all',
  });

  const [refreshToken, setRefreshToken] = useState(0);
  const [rowOverrides, setRowOverrides] = useState<Record<string, { yearlyAbsent?: number }>>({});
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});
  const [editMap, setEditMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, [financialYear, refreshToken]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { start, end } = getFinancialYearRange(financialYear);
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);

      const summaryParams = financialYear === '2025-26'
        ? { financialYear }
        : { startDate, endDate, financialYear };

      const [empRes, summaryRes] = await Promise.all([
        employeeAPI.getAllEmployees(),
        attendanceAPI.getSummary(summaryParams),
      ]);

      const empData = Array.isArray(empRes.data) ? empRes.data : [];
      const summaryData = Array.isArray(summaryRes.data?.summary)
        ? summaryRes.data.summary
        : summaryRes.data || [];

      console.log('Attendance Summary Data:', summaryData);
      console.log('Employees Data:', empData);

      setEmployees(empData);
      setAttendanceSummary(summaryData);
    } catch (error: any) {
      console.error('Error loading attendance data:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load attendance data');
      setEmployees([]);
      setAttendanceSummary([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const divisionOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.division) set.add(e.division);
    });
    return Array.from(set).sort();
  }, [employees]);

  const locationOptions = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.location || e.branch) set.add(e.location || e.branch || '');
    });
    return Array.from(set).sort();
  }, [employees]);

  const { workingDaysYear, officeHolidaysYear, rows } = useMemo(() => {
    const range = getFinancialYearRange(financialYear);
    const workingYear = getWorkingDaysBetween(range.start, range.end);
    const totalDaysYear = getTotalDaysBetween(range.start, range.end);
    const officeHolidays = Math.max(0, totalDaysYear - workingYear);

    const attendanceMap: Record<string, { yearlyPresent: number; yearlyAbsent: number; hasManual: boolean }> = {};
    
    attendanceSummary.forEach((item) => {
      const rawId = item.employeeId || item.employeeCode || '';
      const key = String(rawId || '').toLowerCase();
      if (!key) return;
      
      // Get present days
      const present = financialYear === '2025-26'
        ? Number(item.yearlyPresent || 0)
        : Number(item.inCount || 0);
      
      // Get absent days from API if available
      const absent = Number(item.yearlyAbsent || 0);
      
      if (!attendanceMap[key]) {
        attendanceMap[key] = { yearlyPresent: 0, yearlyAbsent: 0, hasManual: false };
      }
      attendanceMap[key].yearlyPresent += present;
      attendanceMap[key].yearlyAbsent += absent;
      
      if (financialYear === '2025-26') {
        attendanceMap[key].hasManual = true;
      }
    });

    const computedRows: AttendanceRow[] = [];
    employees.forEach((emp) => {
      const rawEmpId = emp.employeeId || emp.empId || emp.id || '';
      const empId = rawEmpId ? String(rawEmpId) : '';
      if (!empId) return;

      const key = empId.toLowerCase();
      const attInfo = attendanceMap[key] || { yearlyPresent: 0, yearlyAbsent: 0, hasManual: false };

      let present = attInfo.yearlyPresent;
      let absent = attInfo.yearlyAbsent;
      
      // For older financial years, calculate absent from present
      if (financialYear !== '2025-26') {
        absent = Math.max(0, workingYear - present);
      }
      
      // Ensure present doesn't exceed working days
      present = Math.min(present, workingYear);
      absent = Math.min(absent, workingYear);

      const yearlyPct = workingYear > 0
        ? Math.max(0, Math.min(100, (present / workingYear) * 100))
        : 0;

      computedRows.push({
        empId,
        name: emp.name || emp.employeeName || '',
        division: emp.division || '',
        location: emp.location || emp.branch || '',
        yearlyPresent: present,
        yearlyAbsent: absent,
        yearlyPct,
        hasManualRecord: !!attInfo.hasManual,
      });
    });

    console.log('Computed Rows:', computedRows);

    return {
      workingDaysYear: workingYear,
      officeHolidaysYear: officeHolidays,
      rows: computedRows,
    };
  }, [employees, attendanceSummary, financialYear]);

  const filteredRows = useMemo(() => {
    const adjustedRows = rows.map((row) => {
      const override = rowOverrides[row.empId];

      let present = row.yearlyPresent;
      let absent = row.yearlyAbsent;

      if (financialYear === '2025-26') {
        if (override && typeof override.yearlyAbsent === 'number') {
          const clampedAbsent = Math.max(0, Math.min(workingDaysYear, override.yearlyAbsent));
          absent = clampedAbsent;
          present = workingDaysYear > 0 ? Math.max(0, workingDaysYear - clampedAbsent) : 0;
        }
      }

      const pct = workingDaysYear > 0
        ? Math.max(0, Math.min(100, (present / workingDaysYear) * 100))
        : 0;

      return {
        ...row,
        yearlyPresent: present,
        yearlyAbsent: absent,
        yearlyPct: pct,
      };
    });

    return adjustedRows
      .filter((row) => {
        const search = filters.search.trim().toLowerCase();
        if (search) {
          const combined = `${row.empId} ${row.name}`.toLowerCase();
          if (!combined.includes(search)) return false;
        }
        if (filters.division !== 'all' && row.division !== filters.division) {
          return false;
        }
        if (filters.location !== 'all' && row.location !== filters.location) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const idA = String(a.empId).toLowerCase();
        const idB = String(b.empId).toLowerCase();
        if (idA < idB) return -1;
        if (idA > idB) return 1;
        return 0;
      });
  }, [rows, filters, rowOverrides, workingDaysYear, financialYear]);

  const handleDaysChange = (empId: string, value: string) => {
    if (financialYear !== '2025-26') return;
    
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) && numeric >= 0
      ? Math.min(numeric, workingDaysYear)
      : 0;

    setRowOverrides((prev) => {
      const current = prev[empId] || {};
      return {
        ...prev,
        [empId]: {
          ...current,
          yearlyAbsent: safeValue,
        },
      };
    });
  };

  const handleRefresh = () => {
    setRefreshToken((x) => x + 1);
  };

  const handleEditRow = (empId: string) => {
    if (financialYear !== '2025-26') return;
    setEditMap((prev) => ({ ...prev, [empId]: true }));
  };

  const handleCancelEdit = (empId: string) => {
    setEditMap((prev) => ({ ...prev, [empId]: false }));
    setRowOverrides((prev) => {
      const next = { ...prev };
      delete next[empId];
      return next;
    });
  };

  const handleSaveRow = async (row: AttendanceRow) => {
    if (financialYear !== '2025-26') return;
    const empId = row.empId;
    if (!empId) return;

    setSavingMap((prev) => ({ ...prev, [empId]: true }));
    try {
      await attendanceAPI.saveYearSummary(empId, {
        financialYear,
        yearlyPresent: row.yearlyPresent,
        yearlyAbsent: row.yearlyAbsent,
      });
      Alert.alert('Success', 'Attendance summary saved successfully!');
      // Clear edit mode after save
      setEditMap((prev) => ({ ...prev, [empId]: false }));
      // Refresh data
      loadData();
    } catch (error: any) {
      console.error('Failed to save year summary', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save year summary');
    } finally {
      setSavingMap((prev) => ({ ...prev, [empId]: false }));
    }
  };

  const getStatusLabel = (pct: number) => {
    if (pct >= 95) return { label: 'Excellent', color: '#065F46', bg: '#D1FAE5' };
    if (pct >= 85) return { label: 'Good', color: '#1E40AF', bg: '#DBEAFE' };
    if (pct >= 75) return { label: 'Average', color: '#92400E', bg: '#FEF3C7' };
    if (pct >= 60) return { label: 'Needs Improvement', color: '#9A3412', bg: '#FFEDD5' };
    return { label: 'Critical', color: '#991B1B', bg: '#FEE2E2' };
  };

  const StatsCard = ({ title, value, description, bgColor, textColor }: any) => (
    <View style={[styles.statsCard, { backgroundColor: bgColor }]}>
      <Text style={[styles.statsTitle, { color: textColor }]}>{title}</Text>
      <Text style={[styles.statsValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statsDescription, { color: textColor + 'CC' }]}>{description}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Attendance Summary" showBack={true} />

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
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
            <TextInput
              value={filters.search}
              onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
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
                  selectedValue={financialYear}
                  onValueChange={(value) => setFinancialYear(value)}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  {FINANCIAL_YEARS.map((fy) => (
                    <PickerItem key={fy} label={fy} value={fy} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Division Picker */}
            <View style={styles.pickerContainer}>
              <Text style={styles.filterLabel}>Division</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={filters.division}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, division: value }))}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Divisions" value="all" color={COLORS.dropdownText} />
                  {divisionOptions.map((div) => (
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
                  selectedValue={filters.location}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
                  style={styles.picker}
                  dropdownIconColor={COLORS.primary}
                >
                  <PickerItem label="All Locations" value="all" color={COLORS.dropdownText} />
                  {locationOptions.map((loc) => (
                    <PickerItem key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
              <Icon name="refresh" size={20} color={COLORS.primary} />
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <StatsCard
            title="Financial Year Working Days"
            value={workingDaysYear}
            description="Monday to Friday between FY start and end"
            bgColor="#EEF2FF"
            textColor="#1E3A8A"
          />
          <StatsCard
            title="Office Holidays (Year)"
            value={officeHolidaysYear}
            description="Weekends and other non-working days"
            bgColor="#FFFBEB"
            textColor="#92400E"
          />
          <StatsCard
            title="Employees"
            value={filteredRows.length}
            description="Matching current filters"
            bgColor="#ECFDF5"
            textColor="#065F46"
          />
        </View>

        {/* Table */}
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading attendance summary...</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {/* Table Header - Fixed Column Alignment */}
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerText, styles.headerSNo]}>S.No</Text>
                  <Text style={[styles.headerText, styles.headerEmpId]}>Employee ID</Text>
                  <Text style={[styles.headerText, styles.headerName]}>Employee Name</Text>
                  <Text style={[styles.headerText, styles.headerPresent]}>Present Days</Text>
                  <Text style={[styles.headerText, styles.headerAbsent]}>Absent Days</Text>
                  <Text style={[styles.headerText, styles.headerPct]}>Attendance %</Text>
                  <Text style={[styles.headerText, styles.headerStatus]}>Status</Text>
                  <Text style={[styles.headerText, styles.headerActions]}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredRows.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={styles.emptyText}>No records found</Text>
                  </View>
                ) : (
                  filteredRows.map((row, index) => {
                    const isEditing = editMap[row.empId];
                    const isEditable = financialYear === '2025-26';
                    const status = getStatusLabel(row.yearlyPct);
                    const currentAbsent = rowOverrides[row.empId]?.yearlyAbsent ?? row.yearlyAbsent;

                    return (
                      <View key={`${row.empId}-${index}`} style={[styles.tableRow, index % 2 === 0 && styles.alternateRow]}>
                        <Text style={[styles.cellText, styles.cellSNo]}>{index + 1}</Text>
                        <Text style={[styles.cellText, styles.cellEmpId, styles.fontMedium]}>{row.empId}</Text>
                        <Text style={[styles.cellText, styles.cellName]} numberOfLines={1}>{row.name}</Text>
                        <Text style={[styles.cellText, styles.cellPresent, styles.textRight]}>
                          {row.yearlyPresent}
                        </Text>
                        <View style={styles.cellAbsent}>
                          {isEditing ? (
                            <TextInput
                              value={String(currentAbsent)}
                              onChangeText={(text) => handleDaysChange(row.empId, text)}
                              keyboardType="numeric"
                              style={styles.absentInput}
                              placeholder="0"
                            />
                          ) : (
                            <Text style={[styles.cellText, styles.textRight]}>
                              {currentAbsent}
                            </Text>
                          )}
                        </View>
                        <Text style={[styles.cellText, styles.cellPct, styles.textRight]}>
                          {row.yearlyPct.toFixed(1)}%
                        </Text>
                        <View style={styles.cellStatus}>
                          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                            <Text style={[styles.statusText, { color: status.color }]}>
                              {status.label}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.cellActions}>
                          {isEditable ? (
                            isEditing ? (
                              <View style={styles.actionButtons}>
                                <TouchableOpacity
                                  onPress={() => handleSaveRow(row)}
                                  disabled={savingMap[row.empId]}
                                  style={[styles.actionBtn, styles.saveBtn]}
                                >
                                  <Icon name="save" size={14} color={COLORS.white} />
                                  <Text style={styles.actionBtnText}>
                                    {savingMap[row.empId] ? 'Saving...' : 'Save'}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  onPress={() => handleCancelEdit(row.empId)}
                                  disabled={savingMap[row.empId]}
                                  style={[styles.actionBtn, styles.cancelBtn]}
                                >
                                  <Icon name="close" size={14} color={COLORS.gray} />
                                  <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <TouchableOpacity
                                onPress={() => handleEditRow(row.empId)}
                                style={[styles.actionBtn, styles.editBtn]}
                              >
                                <Icon name="edit" size={14} color={COLORS.primary} />
                                <Text style={styles.editBtnText}>Edit</Text>
                              </TouchableOpacity>
                            )
                          ) : (
                            <Text style={styles.autoText}>Auto</Text>
                          )}
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

      <CommonFooter
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Attendance Summary • Performance Management • "
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
    alignItems: 'flex-end',
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    minWidth: width * 0.28,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statsTitle: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statsDescription: {
    fontSize: 10,
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
  headerSNo: { width: 60, textAlign: 'center' },
  headerEmpId: { width: 110 },
  headerName: { width: 160 },
  headerPresent: { width: 100, textAlign: 'right', paddingRight: 8 },
  headerAbsent: { width: 100, textAlign: 'right', paddingRight: 8 },
  headerPct: { width: 100, textAlign: 'right', paddingRight: 8 },
  headerStatus: { width: 130, textAlign: 'center' },
  headerActions: { width: 130, textAlign: 'center' },
  
  tableRow: {
    flexDirection: 'row',
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
  cellSNo: { width: 60, textAlign: 'center' },
  cellEmpId: { width: 110 },
  cellName: { width: 160 },
  cellPresent: { width: 100, textAlign: 'right', paddingRight: 8 },
  cellAbsent: { width: 100, paddingHorizontal: 4 },
  cellPct: { width: 100, textAlign: 'right', paddingRight: 8 },
  cellStatus: { width: 130, alignItems: 'center' },
  cellActions: { width: 130, alignItems: 'center' },
  
  fontMedium: {
    fontWeight: '500',
  },
  textRight: {
    textAlign: 'right',
  },
  absentInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    textAlign: 'right',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    width: '100%',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  saveBtn: {
    backgroundColor: COLORS.success,
  },
  cancelBtn: {
    backgroundColor: COLORS.lightGray,
  },
  editBtn: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  actionBtnText: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '500',
  },
  cancelBtnText: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '500',
  },
  editBtnText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '500',
  },
  autoText: {
    fontSize: 11,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    color: COLORS.gray,
  },
});

export default AttendanceSummaryScreen;