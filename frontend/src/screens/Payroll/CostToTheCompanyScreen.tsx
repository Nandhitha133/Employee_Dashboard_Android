// screens/Payroll/CostToTheCompanyScreen.tsx
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
import { monthlyPayrollAPI, employeeAPI } from '../../services/api';
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

interface MonthlyPayrollRecord {
  _id?: string;
  id?: string;
  employeeId: string;
  employeeName: string;
  salaryMonth?: string;
  totalEarnings?: number;
  pf?: number;
  tax?: number;
  gratuity?: number;
  netSalary?: number;
  ctc?: number;
  location?: string;
  department?: string;
  designation?: string;
  [key: string]: any;
}

interface LocationSummary {
  location: string;
  totalPF: number;
  totalTax: number;
  totalCTC: number;
}

interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  designation: string;
  location: string;
  totalEarnings: number;
  pf: number;
  tax: number;
  gratuity: number;
  netSalary: number;
  ctc: number;
  history: MonthlyPayrollRecord[];
}

interface EmployeeDirectory {
  _id?: string;
  id?: string;
  employeeId: string;
  name?: string;
  employeename?: string;
  designation?: string;
  position?: string;
  role?: string;
  department?: string;
  division?: string;
  location?: string;
  address?: string;
  currentAddress?: string;
}

const CostToTheCompanyScreen = () => {
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterDesignation, setFilterDesignation] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<LocationSummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [employeeDirectory, setEmployeeDirectory] = useState<EmployeeDirectory[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Years for dropdown
  const years = [2023, 2024, 2025, 2026];
  
  // Months
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  // Locations
  const locations = [
    { value: '', label: 'All Locations' },
    { value: 'Chennai', label: 'Chennai' },
    { value: 'Hosur', label: 'Hosur' }
  ];

  useEffect(() => {
    const init = async () => {
      const emps = await fetchFilterOptions();
      fetchCTCSummary(emps);
    };
    init();
  }, []);

  useEffect(() => {
    if (!employeeDirectory.length) return;

    let filteredData = employeeDirectory;
    if (filterDepartment) {
      filteredData = filteredData.filter(e => (e.department || e.division) === filterDepartment);
    }

    const uniqueDesigs = [...new Set(filteredData.map(e => e.designation || e.position).filter(Boolean))] as string[];
    setDesignations(uniqueDesigs);

    // If currently selected designation is not in the new list, clear it
    if (filterDesignation && !uniqueDesigs.includes(filterDesignation)) {
      setFilterDesignation('');
    }
  }, [filterDepartment, employeeDirectory]);

  useEffect(() => {
    if (!employeeDirectory.length) return;

    let filteredData = employeeDirectory;
    if (filterDesignation) {
      filteredData = filteredData.filter(e => (e.designation || e.position) === filterDesignation);
    }

    const uniqueDepts = [...new Set(filteredData.map(e => e.department || e.division).filter(Boolean))] as string[];
    setDepartments(uniqueDepts);

    // If currently selected department is not in the new list, clear it
    if (filterDepartment && !uniqueDepts.includes(filterDepartment)) {
      setFilterDepartment('');
    }
  }, [filterDesignation, employeeDirectory]);

  const transformEmployee = (emp: any): EmployeeDirectory => ({
    _id: emp._id,
    id: emp.id,
    employeeId: emp.employeeId || '',
    name: emp.name || '',
    employeename: emp.employeename || '',
    designation: emp.designation || '',
    position: emp.position || '',
    role: emp.role || '',
    department: emp.department || '',
    division: emp.division || '',
    location: emp.location || '',
    address: emp.address || '',
    currentAddress: emp.currentAddress || '',
  });

  const fetchFilterOptions = async () => {
    try {
      const res = await employeeAPI.getAllEmployees();
      const data = Array.isArray(res.data) ? res.data : [];
      
      const transformedData = data.map(transformEmployee);
      
      const uniqueDepts = [...new Set(transformedData.map(e => e.department || e.division).filter(Boolean))] as string[];
      
      setDepartments(uniqueDepts);
      setEmployeeDirectory(transformedData);
      return transformedData;
    } catch (error) {
      console.error("Error fetching filter options", error);
      return [];
    }
  };

  const fetchCTCSummary = async (empDir: EmployeeDirectory[] | null = null) => {
    try {
      setLoading(true);
      
      let params: any = {};
      if (year && month) {
        const monthStr = String(month).padStart(2, "0");
        params.month = `${year}-${monthStr}`;
      }

      const res = await monthlyPayrollAPI.list(params);
      let records = Array.isArray(res.data) ? res.data : [];

      // Use passed directory or state
      const dir = empDir || employeeDirectory;
      
      // Enrich records with employee details (Location, Dept, Desig)
      records = records.map(r => {
        // If the record already has these fields, keep them, otherwise lookup
        const emp = dir.find(e => String(e.employeeId || '').toLowerCase() === String(r.employeeId || '').toLowerCase());
        return {
          ...r,
          location: r.location || emp?.location || emp?.address || "Unknown",
          department: r.department || emp?.department || emp?.division || "Unknown",
          designation: r.designation || emp?.designation || emp?.position || "Unknown"
        };
      });

      // Filter by Year if selected but Month is not
      if (year && !month) {
        records = records.filter(r => r.salaryMonth?.startsWith(`${year}-`));
      }
      // Filter by Month if selected but Year is not
      if (!year && month) {
        const monthStr = String(month).padStart(2, "0");
        records = records.filter(r => r.salaryMonth?.endsWith(`-${monthStr}`));
      }

      if (location) {
        records = records.filter((r) => (r.location || "").toLowerCase() === location.toLowerCase());
      }
      if (filterDepartment) {
        records = records.filter((r) => (r.department || "") === filterDepartment);
      }
      if (filterDesignation) {
        records = records.filter((r) => (r.designation || "") === filterDesignation);
      }

      // Group by location for summary
      const group = new Map<string, LocationSummary>();
      for (const r of records) {
        const loc = r.location || "Unknown";
        const pf = Number(r.pf || 0);
        const tax = Number(r.tax || 0);
        const gratuity = Number(r.gratuity || 0);
        const totalEarnings = Number(r.totalEarnings || 0);
        const ctc = r.ctc != null ? Number(r.ctc || 0) : totalEarnings + gratuity;
        
        if (!group.has(loc)) {
          group.set(loc, { location: loc, totalPF: 0, totalTax: 0, totalCTC: 0 });
        }
        const agg = group.get(loc)!;
        agg.totalPF += pf;
        agg.totalTax += tax;
        agg.totalCTC += ctc;
      }
      setSummary(Array.from(group.values()));

      // Aggregate employees
      const empMap = new Map<string, EmployeeSummary>();
      for (const r of records) {
        const empId = r.employeeId;
        const totalEarnings = Number(r.totalEarnings || 0);
        const pf = Number(r.pf || 0);
        const tax = Number(r.tax || 0);
        const gratuity = Number(r.gratuity || 0);
        const netSalary = Number(r.netSalary || 0);
        const ctc = r.ctc != null ? Number(r.ctc || 0) : totalEarnings + gratuity;

        if (!empMap.has(empId)) {
          empMap.set(empId, {
            employeeId: empId,
            employeeName: r.employeeName || '',
            designation: r.designation || '',
            location: r.location || '',
            totalEarnings: 0,
            pf: 0,
            tax: 0,
            gratuity: 0,
            netSalary: 0,
            ctc: 0,
            history: []
          });
        }
        const agg = empMap.get(empId)!;
        agg.totalEarnings += totalEarnings;
        agg.pf += pf;
        agg.tax += tax;
        agg.gratuity += gratuity;
        agg.netSalary += netSalary;
        agg.ctc += ctc;
        agg.history.push(r);
      }
      
      const sortedEmployees = Array.from(empMap.values()).sort((a, b) => {
        return (a.employeeId || "").localeCompare(b.employeeId || "", undefined, { numeric: true });
      });
      setEmployees(sortedEmployees);
    } catch (error) {
      console.error("Error fetching CTC summary", error);
      Alert.alert('Error', 'Failed to load CTC summary');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchCTCSummary();
  };

  const handleClearFilters = () => {
    setMonth('');
    setYear('');
    setLocation('');
    setFilterDepartment('');
    setFilterDesignation('');
    fetchCTCSummary();
  };

  const toggleRow = (employeeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const isFilterApplied = year || month || location || filterDepartment || filterDesignation;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Cost to Company" 
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
        {/* Filters Section */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Filters</Text>
            {isFilterApplied && (
              <TouchableOpacity onPress={handleClearFilters}>
                <Text style={{ color: COLORS.red }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {/* Year Selector */}
            <View style={{ width: '50%', padding: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Year</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={year}
                  onValueChange={(value) => setYear(value)}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Years" value="" color={COLORS.gray} />
                  {years.map(y => (
                    <Picker.Item key={y} label={y.toString()} value={y.toString()} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Month Selector */}
            <View style={{ width: '50%', padding: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Month</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={month}
                  onValueChange={(value) => setMonth(value)}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Months" value="" color={COLORS.gray} />
                  {months.map(m => (
                    <Picker.Item key={m.value} label={m.label} value={m.value.toString()} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Location Selector */}
            <View style={{ width: '50%', padding: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={location}
                  onValueChange={(value) => setLocation(value)}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  {locations.map(loc => (
                    <Picker.Item key={loc.value} label={loc.label} value={loc.value} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Department Selector */}
            <View style={{ width: '50%', padding: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Department</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDepartment}
                  onValueChange={(value) => setFilterDepartment(value)}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Departments" value="" color={COLORS.gray} />
                  {departments.map(dept => (
                    <Picker.Item key={dept} label={dept} value={dept} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Designation Selector */}
            <View style={{ width: '50%', padding: 4 }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Designation</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDesignation}
                  onValueChange={(value) => setFilterDesignation(value)}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Designations" value="" color={COLORS.gray} />
                  {designations.map(desig => (
                    <Picker.Item key={desig} label={desig} value={desig} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Apply Button */}
            <View style={{ width: '50%', padding: 4 }}>
              <TouchableOpacity
                onPress={() => fetchCTCSummary()}
                style={{
                  backgroundColor: COLORS.primary,
                  padding: 12,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 20,
                }}
              >
                <Icon name="filter-list" size={18} color={COLORS.white} />
                <Text style={{ marginLeft: 4, color: COLORS.white, fontSize: 12 }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Summary Table - Location wise */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, overflow: 'hidden' }}>
          <View style={{ backgroundColor: COLORS.primary, padding: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.white }}>Location Summary</Text>
          </View>

          {loading && !refreshing ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading...</Text>
            </View>
          ) : (
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.filterBg, paddingVertical: 10, paddingHorizontal: 4 }}>
                  <Text style={{ width: 120, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Location</Text>
                  <Text style={{ width: 120, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>Total PF (₹)</Text>
                  <Text style={{ width: 120, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>Total Tax (₹)</Text>
                  <Text style={{ width: 120, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>Total CTC (₹)</Text>
                </View>

                {/* Table Rows */}
                {summary.map((row, index) => (
                  <View key={index} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                    <Text style={{ width: 120, fontSize: 12, color: COLORS.textPrimary }}>{row.location}</Text>
                    <Text style={{ width: 120, fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(row.totalPF)}</Text>
                    <Text style={{ width: 120, fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(row.totalTax)}</Text>
                    <Text style={{ width: 120, fontSize: 12, color: COLORS.blue, fontWeight: '600', textAlign: 'right' }}>{formatCurrency(row.totalCTC)}</Text>
                  </View>
                ))}

                {summary.length === 0 && !loading && (
                  <View style={{ padding: 30, alignItems: 'center' }}>
                    <Text style={{ color: COLORS.gray }}>No data available. Please select filters and click Apply.</Text>
                  </View>
                )}

                {/* Summary Footer */}
                {summary.length > 0 && (
                  <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4, borderTopWidth: 2, borderTopColor: COLORS.border, backgroundColor: COLORS.filterBg }}>
                    <Text style={{ width: 120, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Total</Text>
                    <Text style={{ width: 120, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>
                      {formatCurrency(summary.reduce((sum, row) => sum + row.totalPF, 0))}
                    </Text>
                    <Text style={{ width: 120, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>
                      {formatCurrency(summary.reduce((sum, row) => sum + row.totalTax, 0))}
                    </Text>
                    <Text style={{ width: 120, fontSize: 12, fontWeight: '600', color: COLORS.green, textAlign: 'right' }}>
                      {formatCurrency(summary.reduce((sum, row) => sum + row.totalCTC, 0))}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>

        {/* Employee Details Table */}
        {employees.length > 0 && (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <View style={{ backgroundColor: COLORS.primary, padding: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.white }}>Employee Details</Text>
            </View>

            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.filterBg, paddingVertical: 10, paddingHorizontal: 4 }}>
                  <View style={{ width: 30 }} />
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Employee ID</Text>
                  <Text style={{ width: 150, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Employee</Text>
                  <Text style={{ width: 120, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Designation</Text>
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Location</Text>
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>Earnings</Text>
                  <Text style={{ width: 80, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>PF</Text>
                  <Text style={{ width: 80, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>Tax</Text>
                  <Text style={{ width: 80, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>Gratuity</Text>
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>Net Salary</Text>
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>CTC</Text>
                </View>

                {/* Table Rows */}
                {employees.map((e) => {
                  const isExpanded = expandedRows.has(e.employeeId);

                  return (
                    <React.Fragment key={e.employeeId}>
                      <TouchableOpacity
                        onPress={() => toggleRow(e.employeeId)}
                        style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: isExpanded ? COLORS.blueLight : COLORS.white }}
                      >
                        <View style={{ width: 30, justifyContent: 'center', alignItems: 'center' }}>
                          <Icon 
                            name={isExpanded ? "expand-less" : "expand-more"} 
                            size={18} 
                            color={COLORS.gray} 
                          />
                        </View>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{e.employeeId}</Text>
                        <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary }}>{e.employeeName}</Text>
                        <Text style={{ width: 120, fontSize: 12, color: COLORS.textSecondary }}>{e.designation || '-'}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{e.location || '-'}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(e.totalEarnings)}</Text>
                        <Text style={{ width: 80, fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(e.pf)}</Text>
                        <Text style={{ width: 80, fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(e.tax)}</Text>
                        <Text style={{ width: 80, fontSize: 12, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(e.gratuity)}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.blue, textAlign: 'right', fontWeight: '500' }}>{formatCurrency(e.netSalary)}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.green, textAlign: 'right', fontWeight: '600' }}>{formatCurrency(e.ctc)}</Text>
                      </TouchableOpacity>

                      {/* Expanded History */}
                      {isExpanded && (
                        <View style={{ backgroundColor: COLORS.filterBg, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>Monthly History</Text>
                          <ScrollView horizontal>
                            <View>
                              <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 4 }}>
                                <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Month</Text>
                                <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>Earnings</Text>
                                <Text style={{ width: 60, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>PF</Text>
                                <Text style={{ width: 60, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>Tax</Text>
                                <Text style={{ width: 70, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>Gratuity</Text>
                                <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>Net Salary</Text>
                                <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>CTC</Text>
                              </View>

                              {e.history.map((record, idx) => {
                                const rTotalEarnings = Number(record.totalEarnings || 0);
                                const rPf = Number(record.pf || 0);
                                const rTax = Number(record.tax || 0);
                                const rGratuity = Number(record.gratuity || 0);
                                const rNetSalary = Number(record.netSalary || 0);
                                const rCtc = record.ctc != null ? Number(record.ctc || 0) : rTotalEarnings + rGratuity;
                                
                                return (
                                  <View key={idx} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                                    <Text style={{ width: 100, fontSize: 11, color: COLORS.textSecondary }}>{record.salaryMonth}</Text>
                                    <Text style={{ width: 80, fontSize: 11, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(rTotalEarnings)}</Text>
                                    <Text style={{ width: 60, fontSize: 11, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(rPf)}</Text>
                                    <Text style={{ width: 60, fontSize: 11, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(rTax)}</Text>
                                    <Text style={{ width: 70, fontSize: 11, color: COLORS.textPrimary, textAlign: 'right' }}>{formatCurrency(rGratuity)}</Text>
                                    <Text style={{ width: 80, fontSize: 11, color: COLORS.blue, textAlign: 'right' }}>{formatCurrency(rNetSalary)}</Text>
                                    <Text style={{ width: 80, fontSize: 11, color: COLORS.green, textAlign: 'right', fontWeight: '500' }}>{formatCurrency(rCtc)}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          </ScrollView>
                        </View>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Footer Totals */}
                <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 4, borderTopWidth: 2, borderTopColor: COLORS.border, backgroundColor: COLORS.filterBg }}>
                  <View style={{ width: 30 }} />
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary }}>Totals</Text>
                  <Text style={{ width: 150, fontSize: 12 }} />
                  <Text style={{ width: 120, fontSize: 12 }} />
                  <Text style={{ width: 100, fontSize: 12 }} />
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>
                    {formatCurrency(employees.reduce((sum, e) => sum + Number(e.totalEarnings || 0), 0))}
                  </Text>
                  <Text style={{ width: 80, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>
                    {formatCurrency(employees.reduce((sum, e) => sum + Number(e.pf || 0), 0))}
                  </Text>
                  <Text style={{ width: 80, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>
                    {formatCurrency(employees.reduce((sum, e) => sum + Number(e.tax || 0), 0))}
                  </Text>
                  <Text style={{ width: 80, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' }}>
                    {formatCurrency(employees.reduce((sum, e) => sum + Number(e.gratuity || 0), 0))}
                  </Text>
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.blue, textAlign: 'right' }}>
                    {formatCurrency(employees.reduce((sum, e) => sum + Number(e.netSalary || 0), 0))}
                  </Text>
                  <Text style={{ width: 100, fontSize: 12, fontWeight: '600', color: COLORS.green, textAlign: 'right' }}>
                    {formatCurrency(employees.reduce((sum, e) => sum + Number(e.ctc || 0), 0))}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Cost to Company • CTC • "
      />
    </SafeAreaView>
  );
};

export default CostToTheCompanyScreen;