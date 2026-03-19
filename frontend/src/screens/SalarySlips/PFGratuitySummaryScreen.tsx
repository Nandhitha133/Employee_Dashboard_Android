// screens/SalarySlips/PFGratuitySummaryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { monthlyPayrollAPI, employeeAPI } from '../../services/api';
import CommonHeader from '../../components/CommonHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  pink: '#ec4899',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC'
};

interface SummaryRow {
  month: string;
  year: number;
  pf: number;
  gratuity: number;
  hasData: boolean;
}

interface Totals {
  pf: number;
  gratuity: number;
}

const PFGratuitySummaryScreen = () => {
  const [financialYear, setFinancialYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [summaryData, setSummaryData] = useState<SummaryRow[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [totals, setTotals] = useState<Totals>({ pf: 0, gratuity: 0 });

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (financialYear && employeeId) {
      fetchSummary();
    }
  }, [financialYear, employeeId]);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : {};
      
      if (!user?.id) {
        // Navigate to login
        return;
      }
      
      try {
        const me = await employeeAPI.getMyProfile();
        const empId = me?.data?.employeeId || user.employeeId || user.username || user.id;
        setEmployeeId(empId);
      } catch (err) {
        const fallbackId = user.employeeId || user.username || user.id;
        setEmployeeId(fallbackId);
      }
      
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = -2; i <= 1; i++) {
        const year = currentYear + i;
        years.push(`${year}-${year + 1}`);
      }
      setAvailableYears(years);
      
      // Default to current financial year
      const currentMonth = new Date().getMonth(); // 0-11
      const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      setFinancialYear(`${startYear}-${startYear + 1}`);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      let employeeRecords = [];
      try {
        // Try optimized endpoint first
        const response = await monthlyPayrollAPI.getEmployeeHistory(employeeId);
        employeeRecords = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      } catch (err: any) {
        // If 404 (endpoint not found or API issue), fallback to legacy method (list all & filter)
        if (err.response && (err.response.status === 404 || err.response.status === 500)) {
          console.warn("Optimized history endpoint failed, falling back to client-side filtering.");
          const response = await monthlyPayrollAPI.list({});
          const allRecords = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
          employeeRecords = allRecords.filter((r: any) => String(r.employeeId) === String(employeeId));
        } else {
          throw err;
        }
      }
      
      const yearStart = parseInt(financialYear.split('-')[0]);
      const yearEnd = parseInt(financialYear.split('-')[1]);
      
      // Define months order for Financial Year (April to March)
      const fyMonths = [
        { name: 'April', num: 4, year: yearStart },
        { name: 'May', num: 5, year: yearStart },
        { name: 'June', num: 6, year: yearStart },
        { name: 'July', num: 7, year: yearStart },
        { name: 'August', num: 8, year: yearStart },
        { name: 'September', num: 9, year: yearStart },
        { name: 'October', num: 10, year: yearStart },
        { name: 'November', num: 11, year: yearStart },
        { name: 'December', num: 12, year: yearStart },
        { name: 'January', num: 1, year: yearEnd },
        { name: 'February', num: 2, year: yearEnd },
        { name: 'March', num: 3, year: yearEnd },
      ];

      let totalPF = 0;
      let totalGratuity = 0;

      const data: SummaryRow[] = fyMonths.map(m => {
        const formattedMonth = `${m.year}-${String(m.num).padStart(2, '0')}`;
        const record = employeeRecords.find((r: any) => r.salaryMonth === formattedMonth);
        
        const pf = record ? Number(record.pf || 0) : 0;
        const gratuity = record ? Number(record.gratuity || 0) : 0;
        
        totalPF += pf;
        totalGratuity += gratuity;

        return {
          month: m.name,
          year: m.year,
          pf,
          gratuity,
          hasData: !!record
        };
      });

      setSummaryData(data);
      setTotals({ pf: totalPF, gratuity: totalGratuity });

    } catch (error) {
      console.error("Error fetching summary:", error);
      Alert.alert('Error', 'Failed to load summary data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Table Header
  const renderTableHeader = () => (
    <View style={{ 
      flexDirection: 'row', 
      backgroundColor: COLORS.primary, 
      paddingVertical: 12, 
      paddingHorizontal: 4,
    }}>
      <Text style={{ width: 120, color: COLORS.white, fontWeight: '700', fontSize: 12, paddingLeft: 4 }}>Month / Year</Text>
      <Text style={{ width: 100, color: COLORS.white, fontWeight: '700', fontSize: 12, textAlign: 'right', paddingRight: 8 }}>PF (₹)</Text>
      <Text style={{ width: 100, color: COLORS.white, fontWeight: '700', fontSize: 12, textAlign: 'right', paddingRight: 8 }}>Gratuity (₹)</Text>
      <Text style={{ width: 80, color: COLORS.white, fontWeight: '700', fontSize: 12, textAlign: 'center' }}>Status</Text>
    </View>
  );

  // Table Row
  const renderTableRow = (row: SummaryRow, index: number) => (
    <View key={index} style={{ 
      flexDirection: 'row', 
      backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.filterBg,
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      alignItems: 'center',
    }}>
      <Text style={{ width: 120, fontSize: 13, color: COLORS.textPrimary, fontWeight: '500' }}>
        {row.month} {row.year}
      </Text>
      <Text style={{ width: 100, fontSize: 13, color: row.hasData ? COLORS.primary : COLORS.gray, fontWeight: row.hasData ? '600' : '400', textAlign: 'right' }}>
        {row.hasData ? `₹${row.pf.toLocaleString('en-IN')}` : '-'}
      </Text>
      <Text style={{ width: 100, fontSize: 13, color: row.hasData ? COLORS.orange : COLORS.gray, fontWeight: row.hasData ? '600' : '400', textAlign: 'right' }}>
        {row.hasData ? `₹${row.gratuity.toLocaleString('en-IN')}` : '-'}
      </Text>
      <View style={{ width: 80, alignItems: 'center' }}>
        {row.hasData ? (
          <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, color: '#065F46', fontWeight: '600' }}>Processed</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '500' }}>Pending</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="PF & Gratuity Summary" showBack={true} />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
      >
        {/* Header with Year Selector */}
        <View style={{ backgroundColor: COLORS.white, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Annual Summary</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: COLORS.gray, marginRight: 8 }}>FY:</Text>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, minWidth: 120 }}>
                <Picker
                  selectedValue={financialYear}
                  onValueChange={(value: string) => setFinancialYear(value)}
                  style={{ height: 40 }}
                >
                  {availableYears.map(year => (
                    <Picker.Item key={year} label={year} value={year} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Totals */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>Total PF</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.primary }}>₹{totals.pf.toLocaleString('en-IN')}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>Total Gratuity</Text>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.orange }}>₹{totals.gratuity.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Summary Table */}
        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 16, fontSize: 14, color: COLORS.textSecondary }}>Loading summary data...</Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                {renderTableHeader()}
                <View>
                  {summaryData.map((row, index) => renderTableRow(row, index))}
                  
                  {/* Total Row */}
                  <View style={{ 
                    flexDirection: 'row', 
                    backgroundColor: '#F3F4F6',
                    paddingVertical: 14,
                    paddingHorizontal: 4,
                    borderTopWidth: 2,
                    borderTopColor: COLORS.border,
                  }}>
                    <Text style={{ width: 120, fontSize: 14, color: COLORS.textPrimary, fontWeight: 'bold' }}>Total</Text>
                    <Text style={{ width: 100, fontSize: 14, color: COLORS.primary, fontWeight: 'bold', textAlign: 'right' }}>
                      ₹{totals.pf.toLocaleString('en-IN')}
                    </Text>
                    <Text style={{ width: 100, fontSize: 14, color: COLORS.orange, fontWeight: 'bold', textAlign: 'right' }}>
                      ₹{totals.gratuity.toLocaleString('en-IN')}
                    </Text>
                    <View style={{ width: 80 }} />
                  </View>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="PF • Gratuity • Summary • "
      />
    </SafeAreaView>
  );
};

export default PFGratuitySummaryScreen;