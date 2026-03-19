// screens/Payroll/GratuitySummaryScreen.tsx
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
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

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
  greenLight: '#E8F5E9',
  redLight: '#FEE2E2',
  yellowLight: '#FEF3C7',
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

interface Employee {
  _id?: string;
  employeeId: string;
  name: string;
  employeename?: string;
  department?: string;
  division?: string;
  designation?: string;
  location?: string;
}

interface GratuityHistory {
  month: string;
  amount: number;
  date: string;
  status: string;
}

interface GratuityEmployee {
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  location: string;
  totalGratuity: number;
  history: GratuityHistory[];
}

const GratuitySummaryScreen = () => {
  const [gratuityData, setGratuityData] = useState<GratuityEmployee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterDesignation, setFilterDesignation] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');

  // Dropdown options
  const [departments, setDepartments] = useState<string[]>([]);
  const [designations, setDesignations] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Update filter options based on current data
    if (gratuityData.length > 0) {
      const depts = [...new Set(gratuityData.map(item => item.department).filter(Boolean))] as string[];
      const desigs = [...new Set(gratuityData.map(item => item.designation).filter(Boolean))] as string[];
      const locs = [...new Set(gratuityData.map(item => item.location).filter(Boolean))] as string[];
      
      setDepartments(depts);
      setDesignations(desigs);
      setLocations(locs);
    }
  }, [gratuityData]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payrollResponse, employeeResponse] = await Promise.all([
        monthlyPayrollAPI.list(),
        employeeAPI.getAllEmployees()
      ]);

      const records = Array.isArray(payrollResponse.data) ? payrollResponse.data : [];
      const employees = Array.isArray(employeeResponse.data) ? employeeResponse.data : [];

      // Create maps for employee details with proper typing
      const deptMap: Record<string, string> = {};
      const locMap: Record<string, string> = {};
      const desigMap: Record<string, string> = {};
      
      employees.forEach((emp: any) => {
        if (emp.employeeId) {
          deptMap[emp.employeeId] = emp.department || emp.division || 'Unknown';
          locMap[emp.employeeId] = emp.location || 'Unknown';
          desigMap[emp.employeeId] = emp.designation || emp.position || emp.role || 'Unknown';
        }
      });

      // Group by employee
      const grouped: Record<string, GratuityEmployee> = {};
      
      records.forEach((record: any) => {
        const gratuity = Number(record.gratuity || 0);
        
        if (gratuity > 0) {
          if (!grouped[record.employeeId]) {
            grouped[record.employeeId] = {
              employeeId: record.employeeId,
              employeeName: record.employeeName || '',
              designation: record.designation || desigMap[record.employeeId] || 'Unknown',
              department: record.department || deptMap[record.employeeId] || 'Unknown',
              location: record.location || locMap[record.employeeId] || 'Unknown',
              totalGratuity: 0,
              history: []
            };
          }
          grouped[record.employeeId].totalGratuity += gratuity;
          grouped[record.employeeId].history.push({
            month: record.salaryMonth,
            amount: gratuity,
            date: record.createdAt,
            status: record.status || 'Processed'
          });
        }
      });

      // Sort history by month for each employee
      Object.values(grouped).forEach(emp => {
        emp.history.sort((a, b) => b.month.localeCompare(a.month));
      });

      // Convert to array and sort by Employee ID
      const data = Object.values(grouped);
      data.sort((a, b) => a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true }));
      setGratuityData(data);

    } catch (error) {
      console.error('Error loading gratuity data', error);
      Alert.alert('Error', 'Failed to load gratuity data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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

  // Filtered data based on all filters
  const filteredData = gratuityData.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === 'all' || item.department === filterDepartment;
    const matchesDesignation = filterDesignation === 'all' || item.designation === filterDesignation;
    const matchesLocation = filterLocation === 'all' || item.location === filterLocation;
    return matchesSearch && matchesDepartment && matchesDesignation && matchesLocation;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const exportCSV = async () => {
    const header = ['Employee ID', 'Name', 'Designation', 'Department', 'Location', 'Total Gratuity'];
    const rows = filteredData.map(emp => [
      emp.employeeId,
      emp.employeeName,
      emp.designation,
      emp.department,
      emp.location,
      emp.totalGratuity.toFixed(2)
    ]);

    const csv = [header, ...rows].map(row => row.join(',')).join('\n');

    const fileName = `Gratuity_Summary_${Date.now()}.csv`;
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csv, 'utf8');
      
      const shareOptions = {
        title: 'Export Gratuity Summary',
        message: 'Gratuity Summary Report',
        url: `file://${filePath}`,
        type: 'text/csv',
        failOnCancel: false,
      };

      await Share.open(shareOptions);
    } catch (error: any) {
      if (error.message && error.message.includes('User did not share')) {
        return;
      }
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const isFilterApplied = searchTerm || filterDepartment !== 'all' || filterDesignation !== 'all' || filterLocation !== 'all';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Gratuity Summary" 
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Filter Options</Text>
            {isFilterApplied && (
              <TouchableOpacity 
                onPress={() => {
                  setSearchTerm('');
                  setFilterDepartment('all');
                  setFilterDesignation('all');
                  setFilterLocation('all');
                }}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Icon name="clear-all" size={18} color={COLORS.red} />
                <Text style={{ color: COLORS.red, fontSize: 13, marginLeft: 4 }}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ width: '100%' }}>
            {/* Search */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Search Employee</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.filterBg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 }}>
                <Icon name="search" size={20} color={COLORS.gray} />
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Search by name or ID..."
                  placeholderTextColor={COLORS.gray}
                  style={{
                    flex: 1,
                    marginLeft: 8,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: COLORS.textPrimary,
                  }}
                />
                {searchTerm !== '' && (
                  <TouchableOpacity onPress={() => setSearchTerm('')}>
                    <Icon name="close" size={18} color={COLORS.gray} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Department Filter */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Department</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDepartment}
                  onValueChange={(value) => setFilterDepartment(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Departments" value="all" color={COLORS.gray} />
                  {departments.map(dept => (
                    <Picker.Item key={dept} label={dept} value={dept} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Designation Filter */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Designation</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterDesignation}
                  onValueChange={(value) => setFilterDesignation(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Designations" value="all" color={COLORS.gray} />
                  {designations.map(desig => (
                    <Picker.Item key={desig} label={desig} value={desig} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Location Filter */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 6 }}>Location</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filterLocation}
                  onValueChange={(value) => setFilterLocation(value)}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Locations" value="all" color={COLORS.gray} />
                  {locations.map(loc => (
                    <Picker.Item key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Export Button */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
            <TouchableOpacity
              onPress={exportCSV}
              style={{
                backgroundColor: COLORS.gray,
                paddingVertical: 14,
                paddingHorizontal: 20,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Icon name="file-download" size={20} color={COLORS.white} />
              <Text style={{ marginLeft: 6, color: COLORS.white, fontSize: 14, fontWeight: '500' }}>Export CSV</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results Count */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            Showing {filteredData.length} {filteredData.length === 1 ? 'record' : 'records'}
          </Text>
          {isFilterApplied && (
            <Text style={{ fontSize: 12, color: COLORS.blue }}>
              Filters Applied
            </Text>
          )}
        </View>

        {/* Gratuity Table */}
        {loading && !refreshing ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading gratuity data...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 14, paddingHorizontal: 8 }}>
                  <View style={{ width: 30 }} />
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee ID</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Name</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Designation</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Department</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Location</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'right' }}>Total Gratuity (₹)</Text>
                </View>

                {/* Table Rows */}
                {filteredData.length === 0 ? (
                  <View style={{ padding: 50, alignItems: 'center' }}>
                    <Icon name="info-outline" size={40} color={COLORS.gray} />
                    <Text style={{ marginTop: 12, color: COLORS.gray, fontSize: 16 }}>No gratuity records found</Text>
                    <Text style={{ marginTop: 4, color: COLORS.lightGray, fontSize: 13 }}>Try adjusting your filters</Text>
                  </View>
                ) : filteredData.map((emp, idx) => {
                  const isExpanded = expandedRows.has(emp.employeeId);

                  return (
                    <React.Fragment key={emp.employeeId}>
                      {/* Main Row */}
                      <TouchableOpacity
                        onPress={() => toggleRow(emp.employeeId)}
                        style={{ 
                          flexDirection: 'row', 
                          paddingVertical: 12, 
                          paddingHorizontal: 8, 
                          borderBottomWidth: 1, 
                          borderBottomColor: COLORS.border,
                          backgroundColor: isExpanded ? COLORS.blueLight : (idx % 2 === 0 ? COLORS.white : COLORS.filterBg)
                        }}
                      >
                        <View style={{ width: 30, justifyContent: 'center', alignItems: 'center' }}>
                          <Icon 
                            name={isExpanded ? "expand-less" : "expand-more"} 
                            size={18} 
                            color={COLORS.primary} 
                          />
                        </View>
                        <Text style={{ width: 100, fontSize: 13, fontWeight: '500', color: COLORS.textPrimary }}>{emp.employeeId}</Text>
                        <Text style={{ width: 150, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>{emp.employeeName}</Text>
                        <Text style={{ width: 120, fontSize: 13, color: COLORS.textSecondary }}>{emp.designation || '-'}</Text>
                        <Text style={{ width: 120, fontSize: 13, color: COLORS.textSecondary }}>{emp.department}</Text>
                        <Text style={{ width: 100, fontSize: 13, color: COLORS.textSecondary }}>{emp.location}</Text>
                        <Text style={{ width: 150, fontSize: 13, fontWeight: '600', color: COLORS.green, textAlign: 'right' }}>
                          {formatCurrency(emp.totalGratuity)}
                        </Text>
                      </TouchableOpacity>

                      {/* Expanded History */}
                      {isExpanded && (
                        <View style={{ backgroundColor: COLORS.filterBg, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>Monthly History</Text>
                          <ScrollView horizontal>
                            <View>
                              <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 4 }}>
                                <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Month</Text>
                                <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 11 }}>Status</Text>
                                <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 11, textAlign: 'right' }}>Amount</Text>
                              </View>

                              {emp.history.map((record, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                                  <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{record.month}</Text>
                                  <View style={{ width: 80 }}>
                                    <View style={{ 
                                      backgroundColor: record.status === 'Paid' ? COLORS.greenLight : COLORS.yellowLight,
                                      paddingHorizontal: 6,
                                      paddingVertical: 2,
                                      borderRadius: 4,
                                      alignSelf: 'flex-start'
                                    }}>
                                      <Text style={{ 
                                        fontSize: 11, 
                                        color: record.status === 'Paid' ? COLORS.green : COLORS.warning,
                                        fontWeight: '500'
                                      }}>
                                        {record.status}
                                      </Text>
                                    </View>
                                  </View>
                                  <Text style={{ width: 100, fontSize: 12, color: COLORS.textPrimary, textAlign: 'right', fontWeight: '500' }}>
                                    {formatCurrency(record.amount)}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </ScrollView>
                        </View>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Footer Totals */}
                {filteredData.length > 0 && (
                  <View style={{ flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8, borderTopWidth: 2, borderTopColor: COLORS.border, backgroundColor: COLORS.filterBg }}>
                    <View style={{ width: 30 }} />
                    <Text style={{ width: 100, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary }}>Totals</Text>
                    <Text style={{ width: 150 }} />
                    <Text style={{ width: 120 }} />
                    <Text style={{ width: 120 }} />
                    <Text style={{ width: 100 }} />
                    <Text style={{ width: 150, fontSize: 13, fontWeight: '600', color: COLORS.green, textAlign: 'right' }}>
                      {formatCurrency(filteredData.reduce((sum, emp) => sum + emp.totalGratuity, 0))}
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Gratuity Summary • Payroll • "
      />
    </SafeAreaView>
  );
};

export default GratuitySummaryScreen;