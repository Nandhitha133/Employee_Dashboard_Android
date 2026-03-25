// screens/AdminTimesheet/TimesheetSummaryScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { adminTimesheetAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import CommonFooter from '../../components/CommonFooter';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  pink: '#ec4899',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC',
  gridBorder: '#D1D5DB',
  headerBg: '#1E3A8A',
  alternateRow: '#F9FAFB'
};

// Define interfaces for type safety
interface TimeEntry {
  project: string;
  task: string;
  total?: number;
  type?: string;
}

interface Timesheet {
  _id: string;
  employeeId: string;
  employeeName: string;
  week: string;
  submittedDate?: string;
  weeklyTotal?: number;
  status: string;
  timeEntries: TimeEntry[];
}

interface SummaryResponse {
  totalHours: number;
  totalEmployees: string[];
  totalProjects: string[][];
}

interface SummaryData {
  totalHours: number;
  totalEmployees: number;
  totalProjects: number;
  averageHoursPerEmployee: number;
  monthlyData: Array<{ month: string; hours: number; employees: number }>;
  projectEmployeeSummary: Array<{ project: string; employeeId: string; employeeName: string; totalHours: number }>;
}

const TimesheetSummaryScreen = () => {
  const [filters, setFilters] = useState({
    year: new Date().getFullYear().toString(),
    employee: 'All Employees',
    project: 'All Projects'
  });

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [availableEmployees, setAvailableEmployees] = useState<string[]>(['All Employees']);
  const [availableProjects, setAvailableProjects] = useState<string[]>(['All Projects']);
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  useEffect(() => {
    loadOptions();
  }, [filters.year]);

  const loadOptions = async () => {
    try {
      const res = await adminTimesheetAPI.list({
        employeeId: '',
        division: 'All Division',
        location: 'All Locations',
        status: 'All Status',
        project: 'All Projects'
      });
      const rows: Timesheet[] = res.data?.data || [];
      const filteredRows = rows.filter((r: Timesheet) => {
        const s = (r.status || '').toLowerCase();
        const includeStatus = s === 'submitted' || s === 'approved';
        const yearMatch = (r.week || '').startsWith(filters.year);
        return includeStatus && yearMatch;
      });
      
      const empSet = new Set<string>();
      const projSet = new Set<string>();
      
      filteredRows.forEach((r: Timesheet) => {
        if (r.employeeName) empSet.add(r.employeeName);
        (r.timeEntries || []).forEach((te: TimeEntry) => {
          const p = (te.project || '').trim();
          const taskVal = (te.task || '').toLowerCase();
          if (p && p.toLowerCase() !== 'leave' && !taskVal.includes('holiday') && !taskVal.includes('leave')) {
            projSet.add(p);
          }
        });
      });
      
      setAvailableEmployees(['All Employees', ...Array.from(empSet).sort()]);
      setAvailableProjects(['All Projects', ...Array.from(projSet).sort()]);
    } catch (error) {
      console.error('Error loading options:', error);
      setAvailableEmployees(['All Employees']);
      setAvailableProjects(['All Projects']);
    }
  };

  const formatHours = (hours: number): string => {
    const val = Number(hours || 0);
    const totalMinutes = Math.round(val * 60);
    const sign = totalMinutes < 0 ? '-' : '';
    const absMinutes = Math.abs(totalMinutes);
    const hh = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const mm = String(absMinutes % 60).padStart(2, '0');
    return `${sign}${hh}:${mm}`;
  };

  const handleFilterChange = (filterName: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const handleLoadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const summaryRes = await adminTimesheetAPI.summary({
        year: filters.year,
        employee: filters.employee,
        project: filters.project
      });
      const summary: SummaryResponse = summaryRes.data?.summary || { 
        totalHours: 0, 
        totalEmployees: [], 
        totalProjects: [] 
      };

      const listRes = await adminTimesheetAPI.list({
        employeeId: '',
        division: 'All Division',
        location: 'All Locations',
        status: 'All Status',
        project: filters.project
      });
      let rows: Timesheet[] = listRes.data?.data || [];

      rows = rows.filter((r: Timesheet) => {
        const yearMatch = (r.week || '').startsWith(filters.year);
        const empMatch = (filters.employee === 'All Employees') || (r.employeeName === filters.employee);
        const projMatch = (filters.project === 'All Projects') || 
          ((r.timeEntries || []).some((te: TimeEntry) => (te.project || '').trim() === filters.project));
        return yearMatch && empMatch && projMatch;
      });

      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthlyMap = new Map<string, { month: string; hours: number; employees: number }>(
        monthNames.map(m => [m, { month: m, hours: 0, employees: 0 }])
      );
      const employeesPerMonth = new Map<string, Set<string>>(
        monthNames.map(m => [m, new Set<string>()])
      );

      rows.forEach((r: Timesheet) => {
        const d = r.submittedDate ? new Date(r.submittedDate) : null;
        const m = d ? monthNames[d.getMonth()] : null;
        if (m) {
          const v = monthlyMap.get(m);
          if (v) {
            v.hours += Number(r.weeklyTotal || 0);
            monthlyMap.set(m, v);
            const set = employeesPerMonth.get(m);
            if (set && r.employeeId) set.add(r.employeeId);
          }
        }
      });
      
      monthNames.forEach(m => {
        const v = monthlyMap.get(m);
        if (v) {
          v.employees = (employeesPerMonth.get(m) || new Set()).size;
          monthlyMap.set(m, v);
        }
      });

      const projectEmpMap = new Map<string, number>();
      const projectEmpDetails = new Map<string, { project: string; employeeId: string; employeeName: string }>();
      
      rows.forEach((r: Timesheet) => {
        (r.timeEntries || []).forEach((te: TimeEntry) => {
          if (te.project && r.employeeId && r.employeeName) {
            const key = `${te.project}||${r.employeeId}||${r.employeeName}`;
            const prev = projectEmpMap.get(key) || 0;
            projectEmpMap.set(key, prev + Number(te.total || 0));
            projectEmpDetails.set(key, {
              project: te.project,
              employeeId: r.employeeId,
              employeeName: r.employeeName
            });
          }
        });
      });
      
      const projectEmployeeSummary = Array.from(projectEmpMap.entries()).map(([key, totalHours]) => {
        const details = projectEmpDetails.get(key);
        return {
          project: details?.project || '',
          employeeId: details?.employeeId || '',
          employeeName: details?.employeeName || '',
          totalHours
        };
      });

      const totalEmployeesCount = Array.isArray(summary.totalEmployees) ? summary.totalEmployees.length : 0;
      let totalProjectsCount = 0;
      if (Array.isArray(summary.totalProjects)) {
        const flat = new Set<string>();
        summary.totalProjects.forEach((v: any) => {
          if (Array.isArray(v)) v.forEach((p: string) => flat.add(p));
          else if (v) flat.add(v);
        });
        totalProjectsCount = flat.size;
      }

      const averageHoursPerEmployee = totalEmployeesCount > 0 ? Number(summary.totalHours || 0) / totalEmployeesCount : 0;

      setSummaryData({
        totalHours: Number(summary.totalHours || 0),
        totalEmployees: totalEmployeesCount,
        totalProjects: totalProjectsCount,
        averageHoursPerEmployee: Number(averageHoursPerEmployee.toFixed(1)),
        monthlyData: Array.from(monthlyMap.values()),
        projectEmployeeSummary
      });
    } catch (error) {
      console.error('Error loading summary:', error);
      setSummaryData({
        totalHours: 0,
        totalEmployees: 0,
        totalProjects: 0,
        averageHoursPerEmployee: 0,
        monthlyData: [],
        projectEmployeeSummary: []
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleExportToExcel = () => {
    Alert.alert('Info', 'Export functionality would be implemented here');
  };

  const maxMonthlyHours = (summaryData?.monthlyData || []).reduce(
    (max, m) => Math.max(max, Number(m.hours || 0)),
    0
  );

  // Stats Cards Component
  const renderStatsCards = () => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 }}>
      <View style={{ width: '50%', padding: 4 }}>
        <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: COLORS.primary, elevation: 2, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
          <Text style={{ fontSize: 13, color: COLORS.gray, marginBottom: 8 }}>Total Hours</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary }}>{formatHours(summaryData?.totalHours || 0)}</Text>
        </View>
      </View>
      <View style={{ width: '50%', padding: 4 }}>
        <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: COLORS.green, elevation: 2, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
          <Text style={{ fontSize: 13, color: COLORS.gray, marginBottom: 8 }}>Total Employees</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary }}>{summaryData?.totalEmployees || 0}</Text>
        </View>
      </View>
      <View style={{ width: '50%', padding: 4 }}>
        <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: COLORS.blue, elevation: 2, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
          <Text style={{ fontSize: 13, color: COLORS.gray, marginBottom: 8 }}>Total Projects</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary }}>{summaryData?.totalProjects || 0}</Text>
        </View>
      </View>
      <View style={{ width: '50%', padding: 4 }}>
        <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: COLORS.purple, elevation: 2, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}>
          <Text style={{ fontSize: 13, color: COLORS.gray, marginBottom: 8 }}>Avg Hours/Employee</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.textPrimary }}>{summaryData?.averageHoursPerEmployee || 0}</Text>
        </View>
      </View>
    </View>
  );

  // Monthly Chart Component
  const renderMonthlyChart = () => (
    <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 }}>Monthly Hours Distribution</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 10 }}>
          {(summaryData?.monthlyData || []).map((monthData, index) => (
            <View key={monthData.month} style={{ alignItems: 'center', marginHorizontal: 8 }}>
              <View style={{ height: 100, width: 40, backgroundColor: COLORS.filterBg, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' }}>
                <View style={{
                  height: maxMonthlyHours > 0 ? Math.min((Number(monthData.hours || 0) / maxMonthlyHours) * 100, 100) : 0,
                  backgroundColor: COLORS.primary,
                  width: '100%',
                  borderRadius: 4,
                }} />
              </View>
              <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 8 }}>{monthData.month}</Text>
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 2 }}>{formatHours(monthData.hours)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  // Project-wise Employee Summary Table - Fixed for full text visibility
  const renderProjectEmployeeTable = () => (
    <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 16 }}>Project-wise Employee Summary</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={{ borderWidth: 1, borderColor: COLORS.gridBorder, backgroundColor: COLORS.white }}>
          {/* Table Header */}
          <View style={{ flexDirection: 'row', backgroundColor: COLORS.headerBg }}>
            <View style={{ width: 200, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
              <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>PROJECT</Text>
            </View>
            <View style={{ width: 120, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
              <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>EMPLOYEE ID</Text>
            </View>
            <View style={{ width: 150, paddingVertical: 12, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder }}>
              <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>EMPLOYEE NAME</Text>
            </View>
            <View style={{ width: 120, paddingVertical: 12, paddingHorizontal: 8 }}>
              <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>TOTAL HOURS</Text>
            </View>
          </View>

          {/* Table Rows */}
          {(summaryData?.projectEmployeeSummary || []).length === 0 ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <Text style={{ color: COLORS.gray, fontSize: 14 }}>No data available</Text>
            </View>
          ) : (
            (summaryData?.projectEmployeeSummary || []).map((item, index) => (
              <View key={index} style={{ 
                flexDirection: 'row', 
                backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.alternateRow,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.gridBorder,
                minHeight: 50,
              }}>
                <View style={{ width: 200, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, color: COLORS.textPrimary }} numberOfLines={2}>{item.project}</Text>
                </View>
                <View style={{ width: 120, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, color: COLORS.blue, fontWeight: '500' }}>{item.employeeId}</Text>
                </View>
                <View style={{ width: 150, paddingVertical: 10, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: COLORS.gridBorder, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, color: COLORS.textPrimary }} numberOfLines={1}>{item.employeeName}</Text>
                </View>
                <View style={{ width: 120, paddingVertical: 10, paddingHorizontal: 8, justifyContent: 'center' }}>
                  <Text style={{ fontSize: 13, color: COLORS.green, fontWeight: '600' }}>{formatHours(item.totalHours)}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Timesheet Summary" showBack={true} />

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={true}
        >
          {/* Filters */}
          <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 }}>Summary Filters</Text>

            {/* Year Filter */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Year</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden' }}>
                <Picker
                  selectedValue={filters.year}
                  onValueChange={(value) => handleFilterChange('year', value)}
                  style={{ height: 50, color: COLORS.textPrimary }}
                  dropdownIconColor={COLORS.primary}
                >
                  {years.map(year => (
                    <Picker.Item key={year} label={year} value={year} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Employee Filter */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Employee</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden' }}>
                <Picker
                  selectedValue={filters.employee}
                  onValueChange={(value) => handleFilterChange('employee', value)}
                  style={{ height: 50, color: COLORS.textPrimary }}
                  dropdownIconColor={COLORS.primary}
                >
                  {availableEmployees.map(name => (
                    <Picker.Item key={name} label={name} value={name} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Project Filter */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 }}>Project</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, overflow: 'hidden' }}>
                <Picker
                  selectedValue={filters.project}
                  onValueChange={(value) => handleFilterChange('project', value)}
                  style={{ height: 50, color: COLORS.textPrimary }}
                  dropdownIconColor={COLORS.primary}
                >
                  {availableProjects.map(p => (
                    <Picker.Item key={p} label={p} value={p} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <TouchableOpacity
                onPress={handleLoadSummary}
                disabled={loading}
                style={{
                  flex: 1,
                  backgroundColor: loading ? COLORS.gray : COLORS.primary,
                  paddingVertical: 14,
                  marginRight: 4,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '600' }}>
                    Load Summary
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleExportToExcel}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.primary,
                  paddingVertical: 14,
                  marginLeft: 4,
                  borderRadius: 8,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
              >
                <Icon name="file-download" size={18} color={COLORS.white} />
                <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '600', marginLeft: 6 }}>Export</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Summary Content */}
          {loading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 12, color: COLORS.textSecondary, fontSize: 14 }}>Loading summary...</Text>
            </View>
          ) : summaryData ? (
            <View>
              {/* Stats Cards */}
              {renderStatsCards()}

              {/* Monthly Chart */}
              {renderMonthlyChart()}

              {/* Project-wise Employee Summary Table */}
              {renderProjectEmployeeTable()}
            </View>
          ) : (
            <View style={{ padding: 50, alignItems: 'center', backgroundColor: COLORS.white, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border }}>
              <Icon name="bar-chart" size={80} color={COLORS.lightGray} />
              <Text style={{ fontSize: 18, color: COLORS.textSecondary, marginTop: 20, fontWeight: '500' }}>
                No data loaded yet
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.gray, marginTop: 10, textAlign: 'center', paddingHorizontal: 20 }}>
                Use the filters above and click "Load Summary" to view data
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Admin Dashboard • Timesheet Summary • "
      />
    </SafeAreaView>
  );
};

export default TimesheetSummaryScreen;