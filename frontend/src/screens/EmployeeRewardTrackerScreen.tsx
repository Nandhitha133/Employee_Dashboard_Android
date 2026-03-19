// screens/EmployeeRewardTrackerScreen.tsx
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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';

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
  purpleLight: '#F3E8FF',
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
  lightBlue: '#EBF5FF', 
};

interface Employee {
  _id?: string;
  id?: string;
  employeeId: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  designation?: string;
  division?: string;
  department?: string;
  location?: string;
  branch?: string;
}

interface Reward {
  _id?: string;
  id?: string;
  month: string;
  year: string;
  employeeName: string;
  employeeId: string;
  designation: string;
  division: string;
  nominatedBy: string;
  achievement: string;
}

const EmployeeRewardTrackerScreen = () => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [filteredRewards, setFilteredRewards] = useState<Reward[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filters, setFilters] = useState({
    month: '',
    year: '',
    employee: '',
    designation: '',
    division: '',
    location: '',
    nominatedBy: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const API_BASE_URL = 'https://employee-react-main.onrender.com'; // Your Render URL

  // Predefined nominators
  const predefinedNominators = ['Arunkumar.P', 'Arunkumar.D', 'Harishankar', 'Gopinath'];

  // Helper function to get employee name
  const getEmployeeName = (employee: Employee): string => {
    if (employee.first_name && employee.last_name) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    if (employee.name) return employee.name;
    if (employee.email) return employee.email;
    return 'Unknown Employee';
  };

  // Get token from AsyncStorage
  const getToken = async (): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = async (): Promise<boolean> => {
    const token = await getToken();
    return !!token;
  };

  // Fetch employees and rewards data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = await getToken();
      
      if (!token) {
        // Handle navigation to login - you'll need to implement navigation
        console.log('No token found, redirect to login');
        return;
      }

      // Fetch employees
      try {
        const employeesResponse = await fetch(`${API_BASE_URL}/api/employees`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          const employeesList = employeesData.employees || employeesData;
          setEmployees(Array.isArray(employeesList) ? employeesList : []);
        } else {
          console.error('Failed to fetch employees');
          setEmployees([]);
        }
      } catch (err) {
        console.error('Error fetching employees:', err);
      }
      
      // Fetch rewards
      try {
        const rewardsResponse = await fetch(`${API_BASE_URL}/api/rewards`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (rewardsResponse.ok) {
          const rewardsData = await rewardsResponse.json();
          const rewardsList = rewardsData.rewards || rewardsData;
          setRewards(Array.isArray(rewardsList) ? rewardsList : []);
          setFilteredRewards(Array.isArray(rewardsList) ? rewardsList : []);
        } else {
          console.error('Failed to fetch rewards');
          setError('Failed to load rewards data');
          setRewards([]);
          setFilteredRewards([]);
        }
      } catch (err) {
        console.error('Error fetching rewards:', err);
        setError('Network error: Please check your connection');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Network error: Please check your connection');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  useEffect(() => {
    filterRewards();
  }, [filters, rewards]);

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const filterRewards = () => {
    let result = [...rewards];

    if (filters.month) {
      result = result.filter(reward => reward.month === filters.month);
    }

    if (filters.year) {
      result = result.filter(reward => reward.year === filters.year);
    }

    if (filters.employee) {
      result = result.filter(reward => reward.employeeName === filters.employee);
    }

    if (filters.designation) {
      result = result.filter(reward => reward.designation === filters.designation);
    }

    if (filters.division) {
      result = result.filter(reward => reward.division === filters.division);
    }

    if (filters.location) {
      result = result.filter(reward => {
        const employee = employees.find(e => e.employeeId === reward.employeeId);
        const location = employee ? (employee.location || employee.branch) : '';
        return location === filters.location;
      });
    }

    if (filters.nominatedBy) {
      result = result.filter(reward => reward.nominatedBy === filters.nominatedBy);
    }

    setFilteredRewards(result);
  };

  const clearFilters = () => {
    setFilters({
      month: '',
      year: '',
      employee: '',
      designation: '',
      division: '',
      location: '',
      nominatedBy: ''
    });
  };

  const handleEmployeeChange = (selectedEmployeeId: string) => {
    const selectedEmployee = employees.find(emp => emp.employeeId === selectedEmployeeId);
    
    if (selectedEmployee && editingReward) {
      setEditingReward({
        ...editingReward,
        employeeName: getEmployeeName(selectedEmployee),
        employeeId: selectedEmployee.employeeId,
        designation: selectedEmployee.designation || '',
        division: selectedEmployee.division || selectedEmployee.department || ''
      });
    }
  };

  const handleSubmit = async () => {
    if (!editingReward) return;
    
    const token = await getToken();
    if (!token) {
      Alert.alert('Error', 'Not authenticated');
      return;
    }

    try {
      setLoading(true);
      const url = editingReward._id ? 
        `${API_BASE_URL}/api/rewards/${editingReward._id}` : 
        `${API_BASE_URL}/api/rewards`;
      
      const method = editingReward._id ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingReward)
      });
      
      if (response.ok) {
        setSuccess(editingReward._id ? 'Reward updated successfully' : 'Reward added successfully');
        
        // Refresh rewards list
        await fetchData();

        setShowAddModal(false);
        setEditingReward(null);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save reward');
        setTimeout(() => setError(''), 3000);
      }
    } catch (error) {
      console.error('Error saving reward:', error);
      setError('Network error: Please try again');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (reward: Reward) => {
    setEditingReward(reward);
    setShowAddModal(true);
  };

  const handleDelete = (id?: string) => {
    if (!id) return;
    
    Alert.alert(
      'Delete Reward',
      'Are you sure you want to delete this reward?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const token = await getToken();
            if (!token) {
              Alert.alert('Error', 'Not authenticated');
              return;
            }

            try {
              setLoading(true);
              const response = await fetch(`${API_BASE_URL}/api/rewards/${id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });
              
              if (response.ok) {
                await fetchData();
                setSuccess('Reward deleted successfully');
                setTimeout(() => setSuccess(''), 3000);
              } else {
                setError('Failed to delete reward');
                setTimeout(() => setError(''), 3000);
              }
            } catch (error) {
              console.error('Error deleting reward:', error);
              setError('Network error: Please try again');
              setTimeout(() => setError(''), 3000);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleView = (reward: Reward) => {
    setEditingReward(reward);
    setShowViewModal(true);
  };

  const handleAddNew = () => {
    const currentDate = new Date();
    setEditingReward({
      month: currentDate.toLocaleString('default', { month: 'long' }),
      year: currentDate.getFullYear().toString(),
      employeeName: '',
      employeeId: '',
      designation: '',
      division: '',
      nominatedBy: '',
      achievement: ''
    });
    setShowAddModal(true);
  };

  // Get unique values for filters
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 5}, (_, i) => (currentYear - 2 + i).toString());
  
  // Get unique values from employees and rewards
  const designations = [...new Set([
    ...employees.map(emp => emp.designation).filter(Boolean),
    ...rewards.map(reward => reward.designation).filter(Boolean)
  ])].sort() as string[];
  
  const divisions = [...new Set([
    ...employees.map(emp => emp.division || emp.department).filter(Boolean),
    ...rewards.map(reward => reward.division).filter(Boolean)
  ])].sort() as string[];
  
  const locations = ['Chennai', 'Hosur'];
  const nominators = predefinedNominators;

  const isFilterApplied = Object.values(filters).some(value => value !== '');

  const renderNotification = () => {
    if (error) {
      return (
        <View style={{ backgroundColor: COLORS.error + '20', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="error" size={20} color={COLORS.error} />
          <Text style={{ color: COLORS.error, marginLeft: 8, flex: 1 }}>{error}</Text>
          <TouchableOpacity onPress={() => setError('')}>
            <Icon name="close" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      );
    }
    
    if (success) {
      return (
        <View style={{ backgroundColor: COLORS.success + '20', padding: 12, borderRadius: 8, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
          <Icon name="check-circle" size={20} color={COLORS.success} />
          <Text style={{ color: COLORS.success, marginLeft: 8, flex: 1 }}>{success}</Text>
          <TouchableOpacity onPress={() => setSuccess('')}>
            <Icon name="close" size={20} color={COLORS.success} />
          </TouchableOpacity>
        </View>
      );
    }
    
    return null;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <CommonHeader title="Reward Tracker" showBack={true} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading...</Text>
        </View>
        <CommonFooter companyName="CALDIM ENGINEERING PVT LTD" marqueeText="Reward Tracker • Recognition • " />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Reward Tracker" 
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
        {renderNotification()}

        {/* Header with Actions */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>
              Employee Reward & Recognition Tracker
            </Text>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={{
                backgroundColor: showFilters || isFilterApplied ? COLORS.lightBlue : COLORS.white,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginRight: 8,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Icon name="filter-list" size={18} color={showFilters || isFilterApplied ? COLORS.blue : COLORS.gray} />
              <Text style={{ marginLeft: 4, color: showFilters || isFilterApplied ? COLORS.blue : COLORS.gray }}>Filters</Text>
              {isFilterApplied && (
                <View style={{ marginLeft: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: COLORS.white, fontSize: 10 }}>!</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={clearFilters}
              style={{
                backgroundColor: COLORS.white,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginRight: 8,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Icon name="clear" size={18} color={COLORS.gray} />
              <Text style={{ marginLeft: 4, color: COLORS.gray }}>Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAddNew}
              style={{
                backgroundColor: COLORS.primary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Icon name="add" size={18} color={COLORS.white} />
              <Text style={{ marginLeft: 4, color: COLORS.white }}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters Section */}
        {showFilters && (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 }}>Filter Rewards</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {/* Month Filter */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Month</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={filters.month}
                    onValueChange={(value) => handleFilterChange('month', value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Months" value="" color={COLORS.gray} />
                    {months.map(month => (
                      <Picker.Item key={month} label={month} value={month} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Year Filter */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Year</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={filters.year}
                    onValueChange={(value) => handleFilterChange('year', value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Years" value="" color={COLORS.gray} />
                    {years.map(year => (
                      <Picker.Item key={year} label={year} value={year} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Employee Filter */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={filters.employee}
                    onValueChange={(value) => handleFilterChange('employee', value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Employees" value="" color={COLORS.gray} />
                    {employees.map(emp => (
                      <Picker.Item key={emp.employeeId} label={getEmployeeName(emp)} value={getEmployeeName(emp)} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Designation Filter */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Designation</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={filters.designation}
                    onValueChange={(value) => handleFilterChange('designation', value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Designations" value="" color={COLORS.gray} />
                    {designations.map(des => (
                      <Picker.Item key={des} label={des} value={des} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Division Filter */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={filters.division}
                    onValueChange={(value) => handleFilterChange('division', value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Divisions" value="" color={COLORS.gray} />
                    {divisions.map(div => (
                      <Picker.Item key={div} label={div} value={div} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Location Filter */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={filters.location}
                    onValueChange={(value) => handleFilterChange('location', value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Locations" value="" color={COLORS.gray} />
                    {locations.map(loc => (
                      <Picker.Item key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Nominated By Filter */}
              <View style={{ width: '50%', padding: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Nominated By</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                  <Picker
                    selectedValue={filters.nominatedBy}
                    onValueChange={(value) => handleFilterChange('nominatedBy', value)}
                    style={{ height: 45, color: COLORS.dropdownText }}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="All Nominators" value="" color={COLORS.gray} />
                    {nominators.map(nom => (
                      <Picker.Item key={nom} label={nom} value={nom} color={COLORS.dropdownText} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Results Count */}
        <View style={{ backgroundColor: COLORS.filterBg, padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
            Showing <Text style={{ fontWeight: '600', color: COLORS.textPrimary }}>{filteredRewards.length}</Text> rewards
          </Text>
        </View>

        {/* Rewards Table */}
        {filteredRewards.length === 0 ? (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 40, alignItems: 'center' }}>
            <Icon name="card-giftcard" size={64} color={COLORS.lightGray} />
            <Text style={{ fontSize: 16, color: COLORS.textSecondary, marginTop: 16, fontWeight: '500' }}>
              {rewards.length === 0 ? 'No rewards found' : 'No rewards match your filters'}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 8 }}>
              {rewards.length === 0 ? 'Add your first reward!' : 'Try adjusting your filters'}
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <ScrollView horizontal>
              <View>
                {/* Table Header */}
                <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 4 }}>
                  <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>S.No</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Month/Year</Text>
                  <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Employee Name</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Employee ID</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Designation</Text>
                  <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Division</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Nominated By</Text>
                  <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                </View>

                {/* Table Rows */}
                {filteredRewards.map((reward, index) => (
                  <View key={reward._id || reward.id || index} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                    <Text style={{ width: 50, fontSize: 12, textAlign: 'center', color: COLORS.textPrimary }}>{index + 1}</Text>
                    <Text style={{ width: 120, fontSize: 12, color: COLORS.textPrimary }}>{reward.month} {reward.year}</Text>
                    <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{reward.employeeName}</Text>
                    <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{reward.employeeId}</Text>
                    <Text style={{ width: 120, fontSize: 12, color: COLORS.textSecondary }}>{reward.designation}</Text>
                    <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{reward.division}</Text>
                    <Text style={{ width: 120, fontSize: 12, color: COLORS.textSecondary }}>{reward.nominatedBy}</Text>
                    
                    {/* Actions */}
                    <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center' }}>
                      <TouchableOpacity onPress={() => handleView(reward)} style={{ padding: 6, backgroundColor: COLORS.indigoLight, borderRadius: 4, marginHorizontal: 2 }}>
                        <Icon name="visibility" size={18} color={COLORS.indigo} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleEdit(reward)} style={{ padding: 6, backgroundColor: COLORS.green + '20', borderRadius: 4, marginHorizontal: 2 }}>
                        <Icon name="edit" size={18} color={COLORS.green} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(reward._id || reward.id)} style={{ padding: 6, backgroundColor: COLORS.red + '20', borderRadius: 4, marginHorizontal: 2 }}>
                        <Icon name="delete" size={18} color={COLORS.red} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit Reward Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
            <View style={{ backgroundColor: COLORS.white, borderRadius: 12, margin: 20, maxHeight: '80%' }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>
                  {editingReward?._id ? 'Edit Reward' : 'Add New Reward'}
                </Text>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Icon name="close" size={24} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 16 }}>
                {/* Month */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Month *</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={editingReward?.month}
                      onValueChange={(value) => setEditingReward(prev => prev ? {...prev, month: value} : null)}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                    >
                      {months.map(month => (
                        <Picker.Item key={month} label={month} value={month} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Year */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Year *</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={editingReward?.year}
                      onValueChange={(value) => setEditingReward(prev => prev ? {...prev, year: value} : null)}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                    >
                      {years.map(year => (
                        <Picker.Item key={year} label={year} value={year} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Employee Selection */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee Name *</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={editingReward?.employeeId}
                      onValueChange={handleEmployeeChange}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select Employee" value="" color={COLORS.gray} />
                      {employees.map(emp => (
                        <Picker.Item key={emp.employeeId} label={getEmployeeName(emp)} value={emp.employeeId} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Employee ID (Read Only) */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee ID</Text>
                  <TextInput
                    value={editingReward?.employeeId}
                    editable={false}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.filterBg,
                      color: COLORS.textSecondary,
                    }}
                  />
                </View>

                {/* Designation (Read Only) */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Designation</Text>
                  <TextInput
                    value={editingReward?.designation}
                    editable={false}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.filterBg,
                      color: COLORS.textSecondary,
                    }}
                  />
                </View>

                {/* Division (Read Only) */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division</Text>
                  <TextInput
                    value={editingReward?.division}
                    editable={false}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.filterBg,
                      color: COLORS.textSecondary,
                    }}
                  />
                </View>

                {/* Nominated By */}
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Nominated By *</Text>
                  <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                    <Picker
                      selectedValue={editingReward?.nominatedBy}
                      onValueChange={(value) => setEditingReward(prev => prev ? {...prev, nominatedBy: value} : null)}
                      style={{ height: 50, color: COLORS.dropdownText }}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="Select Nominator" value="" color={COLORS.gray} />
                      {nominators.map(nom => (
                        <Picker.Item key={nom} label={nom} value={nom} color={COLORS.dropdownText} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {/* Achievement */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Key Achievement / Justification *</Text>
                  <TextInput
                    value={editingReward?.achievement}
                    onChangeText={(text) => setEditingReward(prev => prev ? {...prev, achievement: text} : null)}
                    placeholder="Describe the achievement or justification..."
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
                </View>
              </ScrollView>

              {/* Footer Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.gray, borderRadius: 6, marginRight: 8 }}
                >
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: loading ? COLORS.gray : COLORS.primary, borderRadius: 6 }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={{ color: COLORS.white, fontWeight: '600' }}>
                      {editingReward?._id ? 'Update' : 'Add'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* View Reward Modal */}
      <Modal
        visible={showViewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, margin: 20 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.textPrimary }}>Reward Details</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={{ padding: 16 }}>
              {/* Employee Info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: COLORS.white }}>
                    {editingReward?.employeeName?.charAt(0) || 'E'}
                  </Text>
                </View>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>{editingReward?.employeeName}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.gray }}>{editingReward?.designation} • {editingReward?.division}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.gray }}>Employee ID: {editingReward?.employeeId}</Text>
                </View>
              </View>

              {/* Recognition Period */}
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: COLORS.blueLight, padding: 12, borderRadius: 8, marginRight: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.blue, marginBottom: 4 }}>Recognition Period</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.blue }}>{editingReward?.month} {editingReward?.year}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: COLORS.purpleLight, padding: 12, borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.purple, marginBottom: 4 }}>Nominated By</Text>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.purple }}>{editingReward?.nominatedBy}</Text>
                </View>
              </View>

              {/* Achievement */}
              <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, paddingVertical: 16, marginBottom: 16 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>Key Achievement / Justification</Text>
                <Text style={{ fontSize: 14, color: COLORS.textPrimary, fontStyle: 'italic' }}>
                  "{editingReward?.achievement}"
                </Text>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setShowViewModal(false)}
                style={{ paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 6 }}
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
        marqueeText="Reward Tracker • Recognition • "
      />
    </SafeAreaView>
  );
};

export default EmployeeRewardTrackerScreen;