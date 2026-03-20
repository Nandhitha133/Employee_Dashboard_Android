// screens/UserAccessScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { authAPI, employeeAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const { width, height } = Dimensions.get('window');

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
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  filterBg: '#F9FAFB',
  red: '#EF4444',
  redLight: '#FEE2E2',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  blue: '#3B82F6',
  blueLight: '#EBF5FF',
  green: '#10B981',
  greenLight: '#E8F5E9',
  purple: '#9B59B6',
  purpleLight: '#F3E8FF',
  yellow: '#F59E0B',
  yellowLight: '#FEF3C7',
  dropdownText: '#000000',
  dropdownBg: '#FFFFFF',
  darkBlue: '#262760',
  shadow: '#000000',
};

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  lastLogin?: string;
  employeeId?: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  name: string;
  division?: string;
  location?: string;
  designation?: string;
  email?: string;
}

interface FormData {
  name: string;
  email: string;
  role: string;
  password?: string;
  confirmPassword?: string;
  employeeId: string;
  permissions: string[];
}

const UserAccessScreen = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeMap, setEmployeeMap] = useState<Record<string, Employee>>({});
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    role: '',
    employeeId: '',
    division: '',
    location: '',
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: '',
    employeeId: '',
    permissions: [],
  });

  const availablePermissions = [
    'dashboard', 'timesheet_access', 'attendance_access', 'leave_access',
    'employee_access', 'payroll_access', 'expenditure_access', 'announcement_manage',
    'exit_access', 'reward_access', 'appraisal_access', 'project_allocation',
    'insurance_access', 'policy_access', 'user_access'
  ];

  const roleOptions = ['admin', 'projectmanager', 'employees'];
  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    projectmanager: 'Reporting Manager',
    employees: 'Employee',
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return { bg: COLORS.purpleLight, text: COLORS.purple };
      case 'projectmanager': return { bg: COLORS.blueLight, text: COLORS.blue };
      case 'employees': return { bg: COLORS.greenLight, text: COLORS.green };
      default: return { bg: COLORS.lightGray, text: COLORS.gray };
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
  }, []);

  useEffect(() => {
    filterUsers();
    setCurrentPage(1);
  }, [users, filters, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getAllUsers();
      const userData: User[] = (response.data || []).map((user: any) => ({
        _id: user._id || user.id,
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'employees',
        permissions: user.permissions || [],
        lastLogin: user.lastLogin,
        employeeId: user.employeeId,
      }));
      setUsers(userData);
      setAllUsers(userData);
      setFilteredUsers(userData);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'You do not have permission to view user access.');
        setUsers([]);
        setAllUsers([]);
        setFilteredUsers([]);
      } else {
        Alert.alert('Error', 'Failed to load users');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      const empList: Employee[] = (Array.isArray(response.data) ? response.data : []).map((emp: any) => ({
        _id: emp._id || emp.id,
        employeeId: emp.employeeId || emp.displayId || '',
        name: emp.name || emp.employeename || '',
        division: emp.division || '',
        location: emp.location || emp.branch || '',
        designation: emp.designation || '',
        email: emp.email || '',
      }));
      setEmployees(empList);
      
      const map: Record<string, Employee> = {};
      empList.forEach(emp => {
        if (emp._id) map[emp._id] = emp;
        if (emp.employeeId) map[emp.employeeId] = emp;
        if (emp.email) map[emp.email] = emp;
      });
      setEmployeeMap(map);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const getEmployeeForUser = (user: User): Employee | null => {
    const candidates = [user.employeeId, user._id, user.email];
    for (const candidate of candidates) {
      if (candidate && employeeMap[candidate]) {
        return employeeMap[candidate];
      }
    }
    const found = employees.find(e => 
      e.employeeId === user.employeeId || 
      e.email === user.email ||
      e.name === user.name
    );
    return found || null;
  };

  const getDisplayEmployeeId = (user: User): string => {
    const emp = getEmployeeForUser(user);
    if (emp?.employeeId) return emp.employeeId;
    return user.employeeId || '—';
  };

  const getDisplayEmployeeName = (user: User): string => {
    const emp = getEmployeeForUser(user);
    if (emp?.name) return emp.name;
    return user.name || '—';
  };

  const getRoleLabel = (role: string): string => {
    return roleLabels[role] || role;
  };

  const filterUsers = () => {
    let filtered = [...users];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(user => {
        const emp = getEmployeeForUser(user);
        const name = user.name?.toLowerCase() || '';
        const email = user.email?.toLowerCase() || '';
        const empId = getDisplayEmployeeId(user).toLowerCase();
        const role = getRoleLabel(user.role).toLowerCase();
        const division = emp?.division?.toLowerCase() || '';
        const location = emp?.location?.toLowerCase() || '';
        
        return name.includes(q) || email.includes(q) || empId.includes(q) || 
               role.includes(q) || division.includes(q) || location.includes(q);
      });
    }

    if (filters.name) {
      filtered = filtered.filter(user => user.name === filters.name);
    }
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }
    if (filters.employeeId) {
      filtered = filtered.filter(user => getDisplayEmployeeId(user) === filters.employeeId);
    }
    if (filters.division) {
      filtered = filtered.filter(user => {
        const emp = getEmployeeForUser(user);
        return emp?.division === filters.division;
      });
    }
    if (filters.location) {
      filtered = filtered.filter(user => {
        const emp = getEmployeeForUser(user);
        return emp?.location === filters.location;
      });
    }

    filtered.sort((a, b) => {
      const idA = getDisplayEmployeeId(a);
      const idB = getDisplayEmployeeId(b);
      return idA.localeCompare(idB, undefined, { numeric: true });
    });

    setFilteredUsers(filtered);
  };

  const clearFilters = () => {
    setFilters({
      name: '',
      role: '',
      employeeId: '',
      division: '',
      location: '',
    });
    setSearchQuery('');
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      confirmPassword: '',
      employeeId: getDisplayEmployeeId(user),
      permissions: user.permissions || [],
    });
    setShowFormModal(true);
  };

  const handleView = (user: User) => {
    setViewingUser(user);
    setShowViewModal(true);
  };

  const handleDelete = (user: User) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await authAPI.deleteUser(user._id);
              Alert.alert('Success', 'User deleted successfully');
              fetchUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (!editingUser && (!formData.password || formData.password !== formData.confirmPassword)) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      const payload: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        permissions: formData.permissions,
        employeeId: formData.employeeId,
      };
      if (!editingUser && formData.password) {
        payload.password = formData.password;
      }

      if (editingUser) {
        await authAPI.updateUser(editingUser._id, payload);
        Alert.alert('Success', 'User updated successfully');
      } else {
        await authAPI.createUser(payload);
        Alert.alert('Success', 'User created successfully');
      }
      setShowFormModal(false);
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: '',
        password: '',
        confirmPassword: '',
        employeeId: '',
        permissions: [],
      });
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to save user');
    }
  };

  const formatLastLogin = (dateString?: string): string => {
    if (!dateString) return 'Never logged in';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      if (diffHours < 24) return `${diffHours} hour ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Date error';
    }
  };

  const exportCSV = async (exportAll: boolean = false) => {
    const dataToExport = exportAll ? allUsers : filteredUsers;
    const headers = ['Name', 'Employee ID', 'Email', 'Role', 'Division', 'Location', 'Last Login', 'Permissions'];
    const rows = dataToExport.map(user => {
      const emp = getEmployeeForUser(user);
      return [
        user.name,
        getDisplayEmployeeId(user),
        user.email,
        getRoleLabel(user.role),
        emp?.division || '',
        emp?.location || '',
        formatLastLogin(user.lastLogin),
        (user.permissions || []).join(', '),
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const fileName = exportAll ? 'all_users.csv' : 'filtered_users.csv';
    const filePath = Platform.OS === 'android'
      ? `${RNFS.CachesDirectoryPath}/${fileName}`
      : `${RNFS.DocumentDirectoryPath}/${fileName}`;

    try {
      await RNFS.writeFile(filePath, csv, 'utf8');
      await Share.open({
        title: 'Export Users',
        message: 'User Access Report',
        url: `file://${filePath}`,
        type: 'text/csv',
        failOnCancel: false,
      });
    } catch (error: any) {
      if (error.message?.includes('User did not share')) return;
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const uniqueNames = useMemo(() => [...new Set(users.map(u => u.name).filter(Boolean))], [users]);
  const uniqueEmployeeIds = useMemo(() => {
    const ids = new Set<string>();
    users.forEach(u => {
      const id = getDisplayEmployeeId(u);
      if (id !== '—') ids.add(id);
    });
    return Array.from(ids).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [users]);
  const uniqueDivisions = useMemo(() => {
    const divisions = new Set<string>();
    users.forEach(u => {
      const emp = getEmployeeForUser(u);
      if (emp?.division) divisions.add(emp.division);
    });
    return Array.from(divisions).sort();
  }, [users]);
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    users.forEach(u => {
      const emp = getEmployeeForUser(u);
      if (emp?.location) locations.add(emp.location);
    });
    return Array.from(locations).sort();
  }, [users]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const paginate = (page: number) => setCurrentPage(page);

  const isFilterApplied = filters.name || filters.role || filters.employeeId || filters.division || filters.location || searchQuery;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="User Access Control" showBack={true} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchUsers} colors={[COLORS.primary]} />
        }
      >
        {/* Header Actions */}
        <View style={styles.headerActions}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search users..."
              placeholderTextColor={COLORS.gray}
              style={styles.searchInput}
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close" size={18} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={[styles.actionButton, (showFilters || isFilterApplied) && styles.activeFilterButton]}
            >
              <Icon name="filter-list" size={18} color={showFilters || isFilterApplied ? COLORS.white : COLORS.gray} />
              <Text style={[styles.actionButtonText, (showFilters || isFilterApplied) && styles.activeButtonText]}>Filter</Text>
              {isFilterApplied && <View style={styles.filterBadge} />}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => exportCSV(false)} style={[styles.actionButton, styles.exportButton]}>
              <Icon name="file-download" size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setEditingUser(null);
                setFormData({
                  name: '',
                  email: '',
                  role: '',
                  password: '',
                  confirmPassword: '',
                  employeeId: '',
                  permissions: [],
                });
                setShowFormModal(true);
              }}
              style={[styles.actionButton, styles.addButton]}
            >
              <Icon name="add" size={18} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Add User</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Name</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={filters.name}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, name: value }))}
                      style={styles.picker}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="All Names" value="" color={COLORS.textPrimary} />
                      {uniqueNames.map(name => (
                        <Picker.Item key={name} label={name} value={name} color={COLORS.textPrimary} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Role</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={filters.role}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, role: value }))}
                      style={styles.picker}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="All Roles" value="" color={COLORS.textPrimary} />
                      {roleOptions.map(role => (
                        <Picker.Item key={role} label={getRoleLabel(role)} value={role} color={COLORS.textPrimary} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Employee ID</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={filters.employeeId}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, employeeId: value }))}
                      style={styles.picker}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="All IDs" value="" color={COLORS.textPrimary} />
                      {uniqueEmployeeIds.map(id => (
                        <Picker.Item key={id} label={id} value={id} color={COLORS.textPrimary} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Division</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={filters.division}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, division: value }))}
                      style={styles.picker}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="All Divisions" value="" color={COLORS.textPrimary} />
                      {uniqueDivisions.map(div => (
                        <Picker.Item key={div} label={div} value={div} color={COLORS.textPrimary} />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={styles.filterItem}>
                  <Text style={styles.filterLabel}>Location</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={filters.location}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
                      style={styles.picker}
                      dropdownIconColor={COLORS.primary}
                    >
                      <Picker.Item label="All Locations" value="" color={COLORS.textPrimary} />
                      {uniqueLocations.map(loc => (
                        <Picker.Item key={loc} label={loc} value={loc} color={COLORS.textPrimary} />
                      ))}
                    </Picker>
                  </View>
                </View>

                {isFilterApplied && (
                  <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
                    <Icon name="clear-all" size={18} color={COLORS.red} />
                    <Text style={styles.clearFiltersText}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Results Count */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredUsers.length)} of {filteredUsers.length} results
          </Text>
        </View>

        {/* Users Table */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading users...</Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderText, { width: 60 }]}>S.No</Text>
                  <Text style={[styles.tableHeaderText, { width: 150 }]}>Employee Name</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Employee ID</Text>
                  <Text style={[styles.tableHeaderText, { width: 120 }]}>Role</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Division</Text>
                  <Text style={[styles.tableHeaderText, { width: 100 }]}>Location</Text>
                  <Text style={[styles.tableHeaderText, { width: 120 }]}>Last Login</Text>
                  <Text style={[styles.tableHeaderText, { width: 120, textAlign: 'center' }]}>Actions</Text>
                </View>

                {currentItems.length === 0 ? (
                  <View style={styles.noRecordsContainer}>
                    <IconCommunity name="account-off" size={48} color={COLORS.gray} />
                    <Text style={styles.noRecordsText}>No users found</Text>
                    <Text style={styles.noRecordsSubText}>Try adjusting your filters or add a new user</Text>
                  </View>
                ) : currentItems.map((user, idx) => {
                  const emp = getEmployeeForUser(user);
                  const roleColors = getRoleColor(user.role);
                  return (
                    <View key={user._id} style={[styles.tableRow, idx % 2 === 0 && { backgroundColor: COLORS.white }]}>
                      <Text style={[styles.cellText, { width: 60 }]}>{indexOfFirstItem + idx + 1}</Text>
                      <View style={{ width: 150 }}>
                        <Text style={styles.employeeNameText}>{getDisplayEmployeeName(user)}</Text>
                        <Text style={styles.employeeEmailText}>{user.email}</Text>
                      </View>
                      <Text style={[styles.cellText, { width: 100 }]}>{getDisplayEmployeeId(user)}</Text>
                      <View style={{ width: 120 }}>
                        <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
                          <Text style={[styles.roleBadgeText, { color: roleColors.text }]}>
                            {getRoleLabel(user.role)}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.cellText, { width: 100 }]}>{emp?.division || '—'}</Text>
                      <Text style={[styles.cellText, { width: 100 }]}>{emp?.location || '—'}</Text>
                      <Text style={[styles.cellText, { width: 120 }]}>{formatLastLogin(user.lastLogin)}</Text>
                      
                      <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity onPress={() => handleView(user)} style={[styles.actionIcon, { backgroundColor: COLORS.blueLight }]}>
                          <Icon name="visibility" size={18} color={COLORS.blue} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleEdit(user)} style={[styles.actionIcon, { backgroundColor: COLORS.indigoLight }]}>
                          <Icon name="edit" size={18} color={COLORS.indigo} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(user)} style={[styles.actionIcon, { backgroundColor: COLORS.redLight }]}>
                          <Icon name="delete" size={18} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Pagination */}
        {filteredUsers.length > 0 && (
          <View style={styles.paginationContainer}>
            <TouchableOpacity
              onPress={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              style={[styles.paginationButton, currentPage === 1 && styles.paginationButtonDisabled]}
            >
              <Icon name="chevron-left" size={20} color={currentPage === 1 ? COLORS.gray : COLORS.textPrimary} />
            </TouchableOpacity>
            
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <TouchableOpacity
                  key={pageNum}
                  onPress={() => paginate(pageNum)}
                  style={[
                    styles.paginationButton,
                    styles.paginationNumberButton,
                    currentPage === pageNum && styles.paginationActiveButton,
                  ]}
                >
                  <Text style={[styles.paginationNumber, currentPage === pageNum && styles.paginationActiveNumber]}>
                    {pageNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
            
            <TouchableOpacity
              onPress={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={[styles.paginationButton, currentPage === totalPages && styles.paginationButtonDisabled]}
            >
              <Icon name="chevron-right" size={20} color={currentPage === totalPages ? COLORS.gray : COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Add/Edit User Modal */}
      <Modal
        visible={showFormModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFormModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingUser ? 'Edit User' : 'Add New User'}</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter full name"
                  style={styles.formInput}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email *</Text>
                <TextInput
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  placeholder="Enter email address"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.formInput}
                  placeholderTextColor={COLORS.gray}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Role *</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.role}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="Select Role" value="" color={COLORS.gray} />
                    {roleOptions.map(role => (
                      <Picker.Item key={role} label={getRoleLabel(role)} value={role} color={COLORS.textPrimary} />
                    ))}
                  </Picker>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Employee ID</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.employeeId}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, employeeId: value }))}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="Select Employee" value="" color={COLORS.gray} />
                    {employees.map(emp => (
                      <Picker.Item 
                        key={emp._id} 
                        label={`${emp.employeeId} - ${emp.name}`} 
                        value={emp.employeeId}
                        color={COLORS.textPrimary}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {!editingUser && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Password *</Text>
                    <TextInput
                      value={formData.password}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
                      placeholder="Enter password"
                      secureTextEntry
                      style={styles.formInput}
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Confirm Password *</Text>
                    <TextInput
                      value={formData.confirmPassword}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, confirmPassword: text }))}
                      placeholder="Confirm password"
                      secureTextEntry
                      style={styles.formInput}
                      placeholderTextColor={COLORS.gray}
                    />
                  </View>
                </>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Permissions</Text>
                <View style={styles.permissionsContainer}>
                  {availablePermissions.map(perm => (
                    <TouchableOpacity
                      key={perm}
                      onPress={() => {
                        setFormData(prev => ({
                          ...prev,
                          permissions: prev.permissions.includes(perm)
                            ? prev.permissions.filter(p => p !== perm)
                            : [...prev.permissions, perm]
                        }));
                      }}
                      style={[
                        styles.permissionChip,
                        formData.permissions.includes(perm) && styles.permissionChipActive,
                      ]}
                    >
                      <Text style={[
                        styles.permissionChipText,
                        formData.permissions.includes(perm) && styles.permissionChipTextActive,
                      ]}>
                        {perm.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowFormModal(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmit}
                style={styles.submitButton}
              >
                <Text style={styles.submitButtonText}>{editingUser ? 'Update' : 'Create'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View User Modal */}
      <Modal
        visible={showViewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.viewModalContent}>
            <View style={styles.viewModalHeader}>
              <Text style={styles.viewModalTitle}>User Details</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            {viewingUser && (
              <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={true}>
                <View style={styles.userAvatarContainer}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {getDisplayEmployeeName(viewingUser).charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.userName}>{getDisplayEmployeeName(viewingUser)}</Text>
                  <Text style={styles.userEmployeeId}>{getDisplayEmployeeId(viewingUser)}</Text>
                </View>

                <View style={styles.detailsGrid}>
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>Role</Text>
                    <Text style={styles.detailValue}>{getRoleLabel(viewingUser.role)}</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{viewingUser.email}</Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>Division</Text>
                    <Text style={styles.detailValue}>
                      {getEmployeeForUser(viewingUser)?.division || '—'}
                    </Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>
                      {getEmployeeForUser(viewingUser)?.location || '—'}
                    </Text>
                  </View>

                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>Last Login</Text>
                    <Text style={styles.detailValue}>{formatLastLogin(viewingUser.lastLogin)}</Text>
                  </View>
                </View>

                <View style={styles.permissionsSection}>
                  <Text style={styles.permissionsTitle}>Permissions</Text>
                  <View style={styles.permissionsGrid}>
                    {viewingUser.permissions?.map((perm, idx) => (
                      <View key={idx} style={styles.permissionBadge}>
                        <Text style={styles.permissionBadgeText}>
                          {perm.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ))}
                    {(!viewingUser.permissions || viewingUser.permissions.length === 0) && (
                      <Text style={styles.noPermissionsText}>No permissions assigned</Text>
                    )}
                  </View>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => setShowViewModal(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="User • Access • Control • "
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  headerActions: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  activeFilterButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  exportButton: {
    backgroundColor: COLORS.gray,
    borderColor: COLORS.gray,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },
  activeButtonText: {
    color: COLORS.white,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.red,
  },
  filtersPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  filterItem: {
    minWidth: 160,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 6,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    minWidth: 160,
  },
  picker: {
    height: 48,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.redLight,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  clearFiltersText: {
    fontSize: 13,
    color: COLORS.red,
    fontWeight: '500',
  },
  resultsContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
  },
  noRecordsContainer: {
    padding: 50,
    alignItems: 'center',
  },
  noRecordsText: {
    marginTop: 12,
    color: COLORS.gray,
    fontSize: 16,
  },
  noRecordsSubText: {
    marginTop: 4,
    color: COLORS.lightGray,
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  cellText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  employeeNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  employeeEmailText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionIcon: {
    padding: 6,
    borderRadius: 20,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  paginationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationNumberButton: {
    width: 36,
  },
  paginationActiveButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  paginationNumber: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  paginationActiveNumber: {
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    backgroundColor: COLORS.white,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalBody: {
    padding: 16,
    maxHeight: height - 150,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  permissionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.filterBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  permissionChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  permissionChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  permissionChipTextActive: {
    color: COLORS.white,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.gray,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  submitButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  submitButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  viewModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    padding: 20,
    alignSelf: 'center',
    maxHeight: '80%',
  },
  viewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  userEmployeeId: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  detailCard: {
    width: '48%',
    backgroundColor: COLORS.filterBg,
    borderRadius: 12,
    padding: 12,
  },
  detailLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  permissionsSection: {
    marginBottom: 20,
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  permissionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionBadge: {
    backgroundColor: COLORS.indigoLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  permissionBadgeText: {
    fontSize: 12,
    color: COLORS.indigo,
  },
  noPermissionsText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    padding: 14,    
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default UserAccessScreen;