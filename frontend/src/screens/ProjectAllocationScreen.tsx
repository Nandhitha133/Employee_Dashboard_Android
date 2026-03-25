// screens/ProjectAllocationScreen.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Dimensions,
  RefreshControl,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import { projectAPI, allocationAPI, employeeAPI } from '../services/api';

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
  indigoDark: '#262760',
  blue: '#3B82F6',
  blueLight: '#EBF5FF',
  green: '#10B981',
  greenLight: '#E8F5E9',
  purple: '#9B59B6',
  purpleLight: '#F3E8FF',
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
};

interface Project {
  _id: string;
  name: string;
  code: string;
  division: string;
  branch: string;
  startDate: string;
  endDate: string;
  status: string;
  description?: string;
}

interface Allocation {
  _id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  employeeName: string;
  employeeCode: string;
  startDate: string;
  endDate: string;
  branch: string;
  projectDivision: string;
  status: string;
  assignedBy: string;
  assignedDate: string;
  role?: string;
}

interface Employee {
  _id: string;
  name: string;
  employeeId: string;
  division?: string;
  location?: string;
  email?: string;
  phone?: string;
  designation?: string;
}

const divisions = ['SDS', 'TEKLA', 'DAS(Software)', 'DDS(Manufacturing)', 'Mechanical', 'Electrical', 'HR/Admin', 'Engineering Services'];
const branches = ['Hosur', 'Chennai'];
const statuses = ['Active', 'Completed'];

const PAGE_SIZE = 20; // Number of items per page

const ProjectAllocationScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'projects' | 'allocations' | 'myAllocations'>('projects');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Pagination states
  const [projectsPage, setProjectsPage] = useState(1);
  const [allocationsPage, setAllocationsPage] = useState(1);
  const [myAllocationsPage, setMyAllocationsPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [filterDivision, setFilterDivision] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [search, setSearch] = useState('');
  
  // Project filters
  const [projectFilters, setProjectFilters] = useState({
    projectCode: [] as string[],
    projectName: [] as string[],
    division: [] as string[],
    location: [] as string[],
    status: [] as string[],
  });
  
  // Allocation filters
  const [allocationFilters, setAllocationFilters] = useState({
    projectCode: [] as string[],
    projectName: [] as string[],
    employeeId: [] as string[],
    division: [] as string[],
    location: [] as string[],
    status: [] as string[],
  });
  
  // Modal states
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  
  // Form states
  const [projectForm, setProjectForm] = useState({
    name: '',
    division: '',
    branch: '',
    startDate: new Date(),
    endDate: new Date(),
    status: 'Active',
  });
  const [allocationForm, setAllocationForm] = useState({
    projectId: '',
    projectName: '',
    employeeIds: [] as string[],
    selectedEmployeeId: '',
    selectedEmployeeName: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  // Dropdown states for forms
  const [showProjectSelectDropdown, setShowProjectSelectDropdown] = useState(false);
  const [showEmployeeSelectDropdown, setShowEmployeeSelectDropdown] = useState(false);
  const [showDivisionSelectDropdown, setShowDivisionSelectDropdown] = useState(false);
  const [showLocationSelectDropdown, setShowLocationSelectDropdown] = useState(false);
  const [showStatusSelectDropdown, setShowStatusSelectDropdown] = useState(false);
  
  // Get user from storage
  useEffect(() => {
    loadUser();
  }, []);
  
  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {};
    }, [])
  );
  
  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [projRes, allocRes, empRes] = await Promise.all([
        projectAPI.getProjects(),
        allocationAPI.getAllAllocations(),
        employeeAPI.getAllEmployees(),
      ]);
      
      setProjects(Array.isArray(projRes.data) ? projRes.data : []);
      setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
      
      const employeesData = Array.isArray(empRes.data) ? empRes.data.map((emp: any) => ({
        _id: emp._id || emp.id,
        name: emp.name || emp.employeeName || '',
        employeeId: emp.employeeId || emp.empId || '',
        division: emp.division || emp.department,
        location: emp.location || emp.branch,
        email: emp.email,
        phone: emp.phone,
        designation: emp.designation,
      })) : [];
      
      setEmployees(employeesData);
      
      // Reset pagination
      setProjectsPage(1);
      setAllocationsPage(1);
      setMyAllocationsPage(1);
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load data from database. Please refresh.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  
  const isProjectManager = user?.role === 'projectmanager' || user?.role === 'project_manager' || user?.role === 'admin';
  const canEdit = isProjectManager;
  
  // Get current user's allocations
  const myAllocations = useMemo(() => {
    if (!user) return [];
    return allocations.filter(alloc => 
      String(alloc.employeeCode).trim() === String(user.employeeId).trim()
    );
  }, [user, allocations]);
  
  // Filter functions for projects
  const getFilteredProjects = useMemo(() => {
    let filtered = [...projects];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p => 
        (p.name?.toLowerCase().includes(searchLower) || false) || 
        (p.code?.toLowerCase().includes(searchLower) || false)
      );
    }
    
    // Apply location filter
    if (selectedLocation !== 'All') {
      filtered = filtered.filter(p => p.branch === selectedLocation);
    }
    
    // Apply division filter
    if (filterDivision !== 'All') {
      filtered = filtered.filter(p => p.division === filterDivision);
    }
    
    // Apply status filter
    if (filterStatus !== 'All') {
      filtered = filtered.filter(p => p.status === filterStatus);
    }
    
    // Apply multi-select filters
    filtered = filtered.filter(project => {
      const matchesCode = projectFilters.projectCode.length === 0 || projectFilters.projectCode.includes(project.code);
      const matchesName = projectFilters.projectName.length === 0 || projectFilters.projectName.includes(project.name);
      const matchesDivision = projectFilters.division.length === 0 || projectFilters.division.includes(project.division);
      const matchesLocation = projectFilters.location.length === 0 || projectFilters.location.includes(project.branch);
      const matchesStatus = projectFilters.status.length === 0 || projectFilters.status.includes(project.status);
      return matchesCode && matchesName && matchesDivision && matchesLocation && matchesStatus;
    });
    
    return filtered;
  }, [projects, search, selectedLocation, filterDivision, filterStatus, projectFilters]);
  
  // Filter functions for allocations
  const getFilteredAllocations = useMemo(() => {
    let filtered = [...allocations];
    
    // Apply location filter
    if (selectedLocation !== 'All') {
      filtered = filtered.filter(a => a.branch === selectedLocation);
    }
    
    // Apply multi-select filters
    filtered = filtered.filter(allocation => {
      const matchesCode = allocationFilters.projectCode.length === 0 || allocationFilters.projectCode.includes(allocation.projectCode);
      const matchesName = allocationFilters.projectName.length === 0 || allocationFilters.projectName.includes(allocation.projectName);
      const matchesEmployeeId = allocationFilters.employeeId.length === 0 || allocationFilters.employeeId.includes(allocation.employeeCode);
      const matchesDivision = allocationFilters.division.length === 0 || allocationFilters.division.includes(allocation.projectDivision);
      const matchesLocation = allocationFilters.location.length === 0 || allocationFilters.location.includes(allocation.branch);
      const matchesStatus = allocationFilters.status.length === 0 || allocationFilters.status.includes(allocation.status);
      return matchesCode && matchesName && matchesEmployeeId && matchesDivision && matchesLocation && matchesStatus;
    });
    
    return filtered;
  }, [allocations, selectedLocation, allocationFilters]);
  
  const getMyFilteredAllocations = useMemo(() => {
    let filtered = [...myAllocations];
    
    if (selectedLocation !== 'All') {
      filtered = filtered.filter(a => a.branch === selectedLocation);
    }
    
    return filtered;
  }, [myAllocations, selectedLocation]);
  
  // Paginated data
  const paginatedProjects = useMemo(() => {
    return getFilteredProjects.slice(0, projectsPage * PAGE_SIZE);
  }, [getFilteredProjects, projectsPage]);
  
  const paginatedAllocations = useMemo(() => {
    return getFilteredAllocations.slice(0, allocationsPage * PAGE_SIZE);
  }, [getFilteredAllocations, allocationsPage]);
  
  const paginatedMyAllocations = useMemo(() => {
    return getMyFilteredAllocations.slice(0, myAllocationsPage * PAGE_SIZE);
  }, [getMyFilteredAllocations, myAllocationsPage]);
  
  const hasMoreProjects = paginatedProjects.length < getFilteredProjects.length;
  const hasMoreAllocations = paginatedAllocations.length < getFilteredAllocations.length;
  const hasMoreMyAllocations = paginatedMyAllocations.length < getMyFilteredAllocations.length;
  
  // Load more data
  const loadMoreProjects = () => {
    if (!loadingMore && hasMoreProjects) {
      setLoadingMore(true);
      setTimeout(() => {
        setProjectsPage(prev => prev + 1);
        setLoadingMore(false);
      }, 500);
    }
  };
  
  const loadMoreAllocations = () => {
    if (!loadingMore && hasMoreAllocations) {
      setLoadingMore(true);
      setTimeout(() => {
        setAllocationsPage(prev => prev + 1);
        setLoadingMore(false);
      }, 500);
    }
  };
  
  const loadMoreMyAllocations = () => {
    if (!loadingMore && hasMoreMyAllocations) {
      setLoadingMore(true);
      setTimeout(() => {
        setMyAllocationsPage(prev => prev + 1);
        setLoadingMore(false);
      }, 500);
    }
  };
  
  // Helper functions
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  const getStatusBadge = (status: string) => {
    const isActive = status?.toLowerCase() === 'active';
    return {
      bg: isActive ? COLORS.emeraldLight : COLORS.lightGray,
      text: isActive ? COLORS.emerald : COLORS.gray,
    };
  };
  
  const generateProjectCode = (division: string) => {
    const d = division?.trim().toUpperCase() || '';
    let prefix = 'PROJ';
    if (d.includes('SDS')) prefix = 'CDE-SDS';
    else if (d.includes('TEK')) prefix = 'CDE-TEK';
    else if (d.includes('DAS')) prefix = 'CDE-DAS';
    else if (d.includes('DDS')) prefix = 'CDE-DDS';
    else if (d.includes('MEC')) prefix = 'CDE-MEC';
    else if (d.includes('ELEC')) prefix = 'CDE-ELEC';
    else if (d.includes('HR')) prefix = 'CDE-HR';
    else if (d.includes('ENG')) prefix = 'CDE-ENG';
    
    const existingCodes = projects
      .filter(p => p.division === division)
      .map(p => {
        const match = p.code?.match(new RegExp(`^${prefix}-(\\d+)$`));
        return match ? parseInt(match[1]) : null;
      })
      .filter((num): num is number => num !== null && !isNaN(num));
    
    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };
  
  // Filter handlers
  const clearAllFilters = () => {
    setProjectFilters({
      projectCode: [],
      projectName: [],
      division: [],
      location: [],
      status: [],
    });
    setAllocationFilters({
      projectCode: [],
      projectName: [],
      employeeId: [],
      division: [],
      location: [],
      status: [],
    });
    setSelectedLocation('All');
    setFilterDivision('All');
    setFilterStatus('All');
    setSearch('');
  };
  
  const hasActiveFilters = () => {
    const hasProjectFilters = Object.values(projectFilters).some(f => f.length > 0);
    const hasAllocationFilters = Object.values(allocationFilters).some(f => f.length > 0);
    return (
      hasProjectFilters ||
      hasAllocationFilters ||
      selectedLocation !== 'All' ||
      filterDivision !== 'All' ||
      filterStatus !== 'All' ||
      search !== ''
    );
  };
  
  // Validation
  const validateProjectForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!projectForm.name?.trim()) errors.name = 'Project Name is required';
    if (!projectForm.division) errors.division = 'Division is required';
    if (!projectForm.branch) errors.branch = 'Location is required';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Modal handlers
  const openProjectModal = (project: Project | null = null) => {
    if (!canEdit && project) {
      openViewModal(project, 'project');
      return;
    }
    
    if (!canEdit) {
      Alert.alert('Access Denied', "You don't have permission to manage projects.");
      return;
    }
    
    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name || '',
        division: project.division || '',
        branch: project.branch || '',
        startDate: project.startDate ? new Date(project.startDate) : new Date(),
        endDate: project.endDate ? new Date(project.endDate) : new Date(),
        status: project.status || 'Active',
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        name: '',
        division: '',
        branch: '',
        startDate: new Date(),
        endDate: new Date(),
        status: 'Active',
      });
    }
    setFormErrors({});
    setShowProjectModal(true);
  };
  
  const handleProjectSave = async () => {
    if (!validateProjectForm()) return;
    
    if (projectForm.endDate < projectForm.startDate) {
      Alert.alert('Invalid Dates', 'End Date must be on or after Start Date.');
      return;
    }
    
    const projectCode = editingProject ? editingProject.code : generateProjectCode(projectForm.division);
    
    const payload = {
      name: projectForm.name,
      code: projectCode,
      division: projectForm.division,
      branch: projectForm.branch,
      startDate: projectForm.startDate.toISOString().split('T')[0],
      endDate: projectForm.endDate.toISOString().split('T')[0],
      status: projectForm.status,
      description: `${projectForm.name} project`,
    };
    
    try {
      setLoading(true);
      if (editingProject && editingProject._id) {
        await projectAPI.updateProject(editingProject._id, payload);
      } else {
        await projectAPI.createProject(payload);
      }
      await loadData();
      setShowProjectModal(false);
      Alert.alert('Success', editingProject ? 'Project updated successfully.' : 'Project created successfully.');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };
  
  const deleteProject = (project: Project) => {
    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${project.name}"? This will also remove all associated allocations.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await projectAPI.deleteProject(project._id);
              await loadData();
              Alert.alert('Success', 'Project deleted successfully.');
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to delete project');
            }
          },
        },
      ]
    );
  };
  
  const openAllocationModal = (allocation: Allocation | null = null) => {
    if (!canEdit && allocation) {
      openViewModal(allocation, 'allocation');
      return;
    }
    
    if (!canEdit) {
      Alert.alert('Access Denied', "You don't have permission to manage allocations.");
      return;
    }
    
    if (allocation) {
      setEditingAllocation(allocation);
      setAllocationForm({
        projectId: allocation.projectId,
        projectName: allocation.projectName,
        employeeIds: [allocation.employeeCode],
        selectedEmployeeId: allocation.employeeCode,
        selectedEmployeeName: allocation.employeeName,
      });
    } else {
      setEditingAllocation(null);
      setAllocationForm({
        projectId: '',
        projectName: '',
        employeeIds: [],
        selectedEmployeeId: '',
        selectedEmployeeName: '',
      });
    }
    setShowAllocationModal(true);
  };
  
  const handleAllocate = async () => {
    const selectedEmployeeIds = allocationForm.employeeIds.length > 0
      ? allocationForm.employeeIds
      : (allocationForm.selectedEmployeeId ? [allocationForm.selectedEmployeeId] : []);
    
    if (!allocationForm.projectId || selectedEmployeeIds.length === 0) {
      Alert.alert('Missing Fields', 'Please select a project and at least one employee.');
      return;
    }
    
    const project = projects.find(p => p._id === allocationForm.projectId);
    if (!project) {
      Alert.alert('Not Found', 'Project not found.');
      return;
    }
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const empCode of selectedEmployeeIds) {
      const employee = employees.find(e => e.employeeId === empCode);
      if (!employee) {
        skippedCount++;
        continue;
      }
      
      const isDuplicate = allocations.some(a =>
        a.projectId === project._id &&
        a.employeeCode === empCode
      );
      
      if (isDuplicate) {
        skippedCount++;
        continue;
      }
      
      const payload = {
        projectId: project._id,
        projectName: project.name,
        projectCode: project.code,
        employeeName: employee.name,
        employeeCode: empCode,
        startDate: project.startDate,
        endDate: project.endDate,
        branch: project.branch,
        projectDivision: project.division,
        status: 'Active',
        allocatedHours: 40,
        assignedBy: user?.name || 'System',
        assignedDate: new Date().toISOString().split('T')[0],
        role: '',
      };
      
      try {
        await allocationAPI.createAllocation(payload);
        createdCount++;
      } catch (error) {
        skippedCount++;
      }
    }
    
    await loadData();
    setShowAllocationModal(false);
    Alert.alert('Success', `${createdCount} allocation(s) created, ${skippedCount} skipped.`);
  };
  
  const deleteAllocation = (allocation: Allocation) => {
    Alert.alert(
      'Delete Allocation',
      `Are you sure you want to remove ${allocation.employeeName} from ${allocation.projectName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await allocationAPI.deleteAllocation(allocation._id);
              await loadData();
              Alert.alert('Success', 'Allocation deleted successfully.');
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to delete allocation');
            }
          },
        },
      ]
    );
  };
  
  const openViewModal = (item: any, type: string) => {
    setViewingItem({ ...item, type });
    setShowViewModal(true);
  };
  
  const addEmployeeToList = () => {
    if (!allocationForm.selectedEmployeeId) return;
    if (allocationForm.employeeIds.includes(allocationForm.selectedEmployeeId)) return;
    setAllocationForm(prev => ({
      ...prev,
      employeeIds: [...prev.employeeIds, prev.selectedEmployeeId],
      selectedEmployeeId: '',
      selectedEmployeeName: '',
    }));
  };
  
  const removeEmployeeFromList = (employeeCode: string) => {
    setAllocationForm(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.filter(code => code !== employeeCode),
    }));
  };
  
  const getInitials = (name: string): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };
  
  const getActiveProjectsSorted = () => {
    return projects
      .filter(p => p.status?.toLowerCase() === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  
  const getAllEmployeesSorted = () => {
    return [...employees].sort((a, b) => a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true }));
  };
  
  // Render project item with memoization
  const renderProjectItem = useCallback(({ item, index }: { item: Project; index: number }) => (
    <View style={[styles.tableRow, index % 2 === 0 && { backgroundColor: COLORS.white }]}>
      <Text style={[styles.cellText, { width: 100 }]} numberOfLines={1}>{item.code || '-'}</Text>
      <Text style={[styles.cellText, { width: 150, fontWeight: '500' }]} numberOfLines={1}>{item.name || '-'}</Text>
      <Text style={[styles.cellText, { width: 100 }]} numberOfLines={1}>{item.division || '-'}</Text>
      <Text style={[styles.cellText, { width: 80 }]} numberOfLines={1}>{item.branch || '-'}</Text>
      <Text style={[styles.cellText, { width: 100 }]} numberOfLines={1}>{formatDate(item.startDate)}</Text>
      <Text style={[styles.cellText, { width: 100 }]} numberOfLines={1}>{formatDate(item.endDate)}</Text>
      <View style={{ width: 80 }}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(item.status).bg }]}>
          <Text style={[styles.statusText, { color: getStatusBadge(item.status).text }]}>{item.status || '-'}</Text>
        </View>
      </View>
      <View style={{ width: 130, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={() => openViewModal(item, 'project')} style={[styles.actionIcon, { backgroundColor: COLORS.indigoLight }]}>
          <Icon name="visibility" size={18} color={COLORS.indigo} />
        </TouchableOpacity>
        {canEdit && (
          <>
            <TouchableOpacity onPress={() => openProjectModal(item)} style={[styles.actionIcon, { backgroundColor: COLORS.greenLight }]}>
              <Icon name="edit" size={18} color={COLORS.green} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteProject(item)} style={[styles.actionIcon, { backgroundColor: COLORS.redLight }]}>
              <Icon name="delete" size={18} color={COLORS.red} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  ), [canEdit]);
  
  // Render allocation item with memoization
  const renderAllocationItem = useCallback(({ item, index }: { item: Allocation; index: number }) => (
    <View style={[styles.tableRow, index % 2 === 0 && { backgroundColor: COLORS.white }]}>
      <Text style={[styles.cellText, { width: 100 }]} numberOfLines={1}>{item.projectCode || '-'}</Text>
      <Text style={[styles.cellText, { width: 150 }]} numberOfLines={1}>{item.projectName || '-'}</Text>
      <Text style={[styles.cellText, { width: 100 }]} numberOfLines={1}>{item.projectDivision || '-'}</Text>
      <Text style={[styles.cellText, { width: 130 }]} numberOfLines={1}>{item.employeeName || '-'}</Text>
      <Text style={[styles.cellText, { width: 100 }]} numberOfLines={1}>{item.employeeCode || '-'}</Text>
      <Text style={[styles.cellText, { width: 80 }]} numberOfLines={1}>{item.branch || '-'}</Text>
      <View style={{ width: 80 }}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(item.status).bg }]}>
          <Text style={[styles.statusText, { color: getStatusBadge(item.status).text }]}>{item.status || '-'}</Text>
        </View>
      </View>
      <View style={{ width: 130, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={() => openViewModal(item, 'allocation')} style={[styles.actionIcon, { backgroundColor: COLORS.indigoLight }]}>
          <Icon name="visibility" size={18} color={COLORS.indigo} />
        </TouchableOpacity>
        {canEdit && (
          <>
            <TouchableOpacity onPress={() => openAllocationModal(item)} style={[styles.actionIcon, { backgroundColor: COLORS.greenLight }]}>
              <Icon name="edit" size={18} color={COLORS.green} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteAllocation(item)} style={[styles.actionIcon, { backgroundColor: COLORS.redLight }]}>
              <Icon name="delete" size={18} color={COLORS.red} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  ), [canEdit]);
  
  // Render my allocation item with memoization
  const renderMyAllocationItem = useCallback(({ item, index }: { item: Allocation; index: number }) => (
    <View style={[styles.tableRow, index % 2 === 0 && { backgroundColor: COLORS.white }]}>
      <Text style={[styles.cellText, { width: 100 }]} numberOfLines={1}>{item.projectCode || '-'}</Text>
      <Text style={[styles.cellText, { width: 150 }]} numberOfLines={1}>{item.projectName || '-'}</Text>
      <Text style={[styles.cellText, { width: 100 }]} numberOfLines={1}>{item.projectDivision || '-'}</Text>
      <Text style={[styles.cellText, { width: 80 }]} numberOfLines={1}>{item.branch || '-'}</Text>
      <View style={{ width: 80 }}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(item.status).bg }]}>
          <Text style={[styles.statusText, { color: getStatusBadge(item.status).text }]}>{item.status || '-'}</Text>
        </View>
      </View>
      <Text style={[styles.cellText, { width: 170 }]} numberOfLines={1}>
        {formatDate(item.startDate)} to {formatDate(item.endDate)}
      </Text>
      <Text style={[styles.cellText, { width: 120 }]} numberOfLines={1}>{item.assignedBy || '-'}</Text>
      <View style={{ width: 80, alignItems: 'center' }}>
        <TouchableOpacity onPress={() => openViewModal(item, 'allocation')} style={[styles.actionIcon, { backgroundColor: COLORS.indigoLight }]}>
          <Icon name="visibility" size={18} color={COLORS.indigo} />
        </TouchableOpacity>
      </View>
    </View>
  ), []);
  
  // Footer component for load more
  const renderFooter = useCallback((hasMore: boolean, onLoadMore: () => void) => {
    if (!hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  }, []);
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <CommonHeader title="Project Allocation" showBack={true} />
      
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading data...</Text>
          </View>
        ) : (
          <>
            {/* Header Actions */}
            <View style={styles.headerActions}>
              <View style={styles.searchContainer}>
                <Icon name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search by project name or code..."
                  placeholderTextColor={COLORS.gray}
                  style={styles.searchInput}
                />
                {search !== '' && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Icon name="close" size={18} color={COLORS.gray} />
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  onPress={() => setShowFilters(!showFilters)}
                  style={[styles.actionButton, (showFilters || hasActiveFilters()) && styles.activeFilterButton]}
                >
                  <Icon name="filter-list" size={18} color={showFilters || hasActiveFilters() ? COLORS.white : COLORS.gray} />
                  <Text style={[styles.actionButtonText, (showFilters || hasActiveFilters()) && styles.activeButtonText]}>Filter</Text>
                  {hasActiveFilters() && <View style={styles.filterBadge} />}
                </TouchableOpacity>
                
                {canEdit && (
                  <TouchableOpacity
                    onPress={() => activeTab === 'projects' ? openProjectModal(null) : openAllocationModal(null)}
                    style={[styles.actionButton, styles.addButton]}
                  >
                    <Icon name="add" size={18} color={COLORS.white} />
                    <Text style={styles.actionButtonText}>
                      {activeTab === 'projects' ? 'Add Project' : 'Allocate'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {/* Tab Bar */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('projects');
                  setProjectsPage(1);
                }}
                style={[styles.tab, activeTab === 'projects' && styles.activeTab]}
              >
                <Icon name="business" size={20} color={activeTab === 'projects' ? COLORS.primary : COLORS.gray} />
                <Text style={[styles.tabText, activeTab === 'projects' && styles.activeTabText]}>Projects</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => {
                  setActiveTab('allocations');
                  setAllocationsPage(1);
                }}
                style={[styles.tab, activeTab === 'allocations' && styles.activeTab]}
              >
                <Icon name="people" size={20} color={activeTab === 'allocations' ? COLORS.primary : COLORS.gray} />
                <Text style={[styles.tabText, activeTab === 'allocations' && styles.activeTabText]}>Allocations</Text>
              </TouchableOpacity>
              
              {!canEdit && (
                <TouchableOpacity
                  onPress={() => {
                    setActiveTab('myAllocations');
                    setMyAllocationsPage(1);
                  }}
                  style={[styles.tab, activeTab === 'myAllocations' && styles.activeTab]}
                >
                  <Icon name="person" size={20} color={activeTab === 'myAllocations' ? COLORS.primary : COLORS.gray} />
                  <Text style={[styles.tabText, activeTab === 'myAllocations' && styles.activeTabText]}>My Allocations</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Filters Panel */}
            {showFilters && (
              <View style={styles.filtersPanel}>
                <View style={styles.filterHeader}>
                  <Text style={styles.filterTitle}>Filters</Text>
                  {hasActiveFilters() && (
                    <TouchableOpacity onPress={clearAllFilters}>
                      <Text style={styles.clearAllText}>Clear All</Text>
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.filterRow}>
                  <View style={styles.filterItem}>
                    <Text style={styles.filterLabel}>Location</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={selectedLocation}
                        onValueChange={setSelectedLocation}
                        style={styles.picker}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="All Locations" value="All" />
                        {branches.map(branch => (
                          <Picker.Item key={branch} label={branch} value={branch} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  
                  <View style={styles.filterItem}>
                    <Text style={styles.filterLabel}>Division</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={filterDivision}
                        onValueChange={setFilterDivision}
                        style={styles.picker}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="All Divisions" value="All" />
                        {divisions.map(div => (
                          <Picker.Item key={div} label={div} value={div} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  
                  <View style={styles.filterItem}>
                    <Text style={styles.filterLabel}>Status</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={filterStatus}
                        onValueChange={setFilterStatus}
                        style={styles.picker}
                        dropdownIconColor={COLORS.primary}
                      >
                        <Picker.Item label="All Status" value="All" />
                        {statuses.map(status => (
                          <Picker.Item key={status} label={status} value={status} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                </View>
              </View>
            )}
            
            {/* Location Info */}
            {selectedLocation !== 'All' && (
              <View style={styles.locationInfo}>
                <Icon name="location-on" size={16} color={COLORS.info} />
                <Text style={styles.locationInfoText}>
                  Showing data for <Text style={styles.locationInfoBold}>{selectedLocation}</Text> location
                </Text>
                <TouchableOpacity onPress={() => setSelectedLocation('All')}>
                  <Text style={styles.showAllText}>Show all</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Results Count */}
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsText}>
                Showing {activeTab === 'projects' ? paginatedProjects.length : activeTab === 'allocations' ? paginatedAllocations.length : paginatedMyAllocations.length}{' '}
                out of {activeTab === 'projects' ? getFilteredProjects.length : activeTab === 'allocations' ? getFilteredAllocations.length : getMyFilteredAllocations.length}{' '}
                {activeTab === 'projects' ? 'project(s)' : 'allocation(s)'}
                {hasActiveFilters() && ' • Filtered'}
              </Text>
            </View>
            
            {/* Table */}
            <View style={styles.tableContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  {/* Table Header */}
                  <View style={styles.tableHeader}>
                    {activeTab === 'projects' && (
                      <>
                        <Text style={[styles.tableHeaderText, { width: 100 }]}>Code</Text>
                        <Text style={[styles.tableHeaderText, { width: 150 }]}>Project Name</Text>
                        <Text style={[styles.tableHeaderText, { width: 100 }]}>Division</Text>
                        <Text style={[styles.tableHeaderText, { width: 80 }]}>Location</Text>
                        <Text style={[styles.tableHeaderText, { width: 100 }]}>Start Date</Text>
                        <Text style={[styles.tableHeaderText, { width: 100 }]}>End Date</Text>
                        <Text style={[styles.tableHeaderText, { width: 80 }]}>Status</Text>
                        <Text style={[styles.tableHeaderText, { width: 130, textAlign: 'center' }]}>Actions</Text>
                      </>
                    )}
                    {activeTab === 'allocations' && (
                      <>
                        <Text style={[styles.tableHeaderText, { width: 100 }]}>Proj Code</Text>
                        <Text style={[styles.tableHeaderText, { width: 150 }]}>Project Name</Text>
                        <Text style={[styles.tableHeaderText, { width: 100 }]}>Division</Text>
                        <Text style={[styles.tableHeaderText, { width: 130 }]}>Employee</Text>
                        <Text style={[styles.tableHeaderText, { width: 100 }]}>Emp ID</Text>
                        <Text style={[styles.tableHeaderText, { width: 80 }]}>Location</Text>
                        <Text style={[styles.tableHeaderText, { width: 80 }]}>Status</Text>
                        <Text style={[styles.tableHeaderText, { width: 130, textAlign: 'center' }]}>Actions</Text>
                      </>
                    )}
                    {activeTab === 'myAllocations' && (
                      <>
                        <Text style={[styles.tableHeaderText, { width: 100 }]}>Proj Code</Text>
                        <Text style={[styles.tableHeaderText, { width: 150 }]}>Project Name</Text>
                        <Text style={[styles.tableHeaderText, { width: 100 }]}>Division</Text>
                        <Text style={[styles.tableHeaderText, { width: 80 }]}>Location</Text>
                        <Text style={[styles.tableHeaderText, { width: 80 }]}>Status</Text>
                        <Text style={[styles.tableHeaderText, { width: 170 }]}>Duration</Text>
                        <Text style={[styles.tableHeaderText, { width: 120 }]}>Assigned By</Text>
                        <Text style={[styles.tableHeaderText, { width: 80, textAlign: 'center' }]}>Actions</Text>
                      </>
                    )}
                  </View>
                  
                  {/* Table Body with Pagination */}
                  {activeTab === 'projects' && (
                    <FlatList
                      data={paginatedProjects}
                      keyExtractor={(item) => item._id}
                      renderItem={renderProjectItem}
                      ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                          <Icon name="business" size={48} color={COLORS.gray} />
                          <Text style={styles.emptyText}>No projects found</Text>
                          {hasActiveFilters() && (
                            <TouchableOpacity onPress={clearAllFilters} style={styles.clearFiltersButton}>
                              <Text style={styles.clearFiltersText}>Clear all filters</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      }
                      ListFooterComponent={() => renderFooter(hasMoreProjects, loadMoreProjects)}
                      onEndReached={loadMoreProjects}
                      onEndReachedThreshold={0.5}
                      scrollEnabled={false}
                      initialNumToRender={10}
                      maxToRenderPerBatch={10}
                      windowSize={5}
                      removeClippedSubviews={true}
                    />
                  )}
                  
                  {activeTab === 'allocations' && (
                    <FlatList
                      data={paginatedAllocations}
                      keyExtractor={(item) => item._id}
                      renderItem={renderAllocationItem}
                      ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                          <Icon name="people" size={48} color={COLORS.gray} />
                          <Text style={styles.emptyText}>No allocations found</Text>
                          {hasActiveFilters() && (
                            <TouchableOpacity onPress={clearAllFilters} style={styles.clearFiltersButton}>
                              <Text style={styles.clearFiltersText}>Clear all filters</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      }
                      ListFooterComponent={() => renderFooter(hasMoreAllocations, loadMoreAllocations)}
                      onEndReached={loadMoreAllocations}
                      onEndReachedThreshold={0.5}
                      scrollEnabled={false}
                      initialNumToRender={10}
                      maxToRenderPerBatch={10}
                      windowSize={5}
                      removeClippedSubviews={true}
                    />
                  )}
                  
                  {activeTab === 'myAllocations' && !canEdit && (
                    <FlatList
                      data={paginatedMyAllocations}
                      keyExtractor={(item) => item._id}
                      renderItem={renderMyAllocationItem}
                      ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                          <Icon name="person" size={48} color={COLORS.gray} />
                          <Text style={styles.emptyText}>No allocations found</Text>
                          <Text style={styles.emptySubText}>You are not currently allocated to any projects.</Text>
                        </View>
                      }
                      ListFooterComponent={() => renderFooter(hasMoreMyAllocations, loadMoreMyAllocations)}
                      onEndReached={loadMoreMyAllocations}
                      onEndReachedThreshold={0.5}
                      scrollEnabled={false}
                      initialNumToRender={10}
                      maxToRenderPerBatch={10}
                      windowSize={5}
                      removeClippedSubviews={true}
                    />
                  )}
                </View>
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>
      
      {/* Add/Edit Project Modal */}
      <Modal
        visible={showProjectModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowProjectModal(false);
          setEditingProject(null);
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProject ? 'Edit Project' : 'Add New Project'}</Text>
              <TouchableOpacity onPress={() => {
                setShowProjectModal(false);
                setEditingProject(null);
              }}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Division *</Text>
                <View style={[styles.pickerWrapper, formErrors.division && styles.inputError]}>
                  <Picker
                    selectedValue={projectForm.division || ''}
                    onValueChange={(value) => setProjectForm(prev => ({ ...prev, division: value }))}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                    enabled={!editingProject}
                  >
                    <Picker.Item label="Select Division" value="" />
                    {divisions.map(div => (
                      <Picker.Item key={div} label={div} value={div} />
                    ))}
                  </Picker>
                </View>
                {formErrors.division && <Text style={styles.errorText}>{formErrors.division}</Text>}
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Project Name *</Text>
                <TextInput
                  value={projectForm.name}
                  onChangeText={(text) => setProjectForm(prev => ({ ...prev, name: text }))}
                  placeholder="Enter project name"
                  style={[styles.formInput, formErrors.name && styles.inputError]}
                  placeholderTextColor={COLORS.gray}
                />
                {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Location *</Text>
                <View style={[styles.pickerWrapper, formErrors.branch && styles.inputError]}>
                  <Picker
                    selectedValue={projectForm.branch || ''}
                    onValueChange={(value) => setProjectForm(prev => ({ ...prev, branch: value }))}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    <Picker.Item label="Select Location" value="" />
                    {branches.map(branch => (
                      <Picker.Item key={branch} label={branch} value={branch} />
                    ))}
                  </Picker>
                </View>
                {formErrors.branch && <Text style={styles.errorText}>{formErrors.branch}</Text>}
              </View>
              
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.formLabel}>Start Date *</Text>
                  <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.dateButton}>
                    <Text>{projectForm.startDate.toLocaleDateString()}</Text>
                    <Icon name="calendar-today" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>End Date *</Text>
                  <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.dateButton}>
                    <Text>{projectForm.endDate.toLocaleDateString()}</Text>
                    <Icon name="calendar-today" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
              </View>
              
              {showStartDatePicker && (
                <DateTimePicker
                  value={projectForm.startDate}
                  mode="date"
                  onChange={(event, date) => {
                    setShowStartDatePicker(false);
                    if (date) setProjectForm(prev => ({ ...prev, startDate: date }));
                  }}
                />
              )}
              {showEndDatePicker && (
                <DateTimePicker
                  value={projectForm.endDate}
                  mode="date"
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) setProjectForm(prev => ({ ...prev, endDate: date }));
                  }}
                />
              )}
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Status</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={projectForm.status}
                    onValueChange={(value) => setProjectForm(prev => ({ ...prev, status: value }))}
                    style={styles.picker}
                    dropdownIconColor={COLORS.primary}
                  >
                    {statuses.map(status => (
                      <Picker.Item key={status} label={status} value={status} />
                    ))}
                  </Picker>
                </View>
              </View>
              
              {!editingProject && projectForm.division && projectForm.name && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    <Text style={styles.infoLabel}>Project Code:</Text> {generateProjectCode(projectForm.division)}
                  </Text>
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => {
                  setShowProjectModal(false);
                  setEditingProject(null);
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleProjectSave}
                disabled={loading}
                style={[styles.submitButton, loading && { backgroundColor: COLORS.gray }]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>{editingProject ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Add/Edit Allocation Modal */}
      <Modal
        visible={showAllocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowAllocationModal(false);
          setEditingAllocation(null);
        }}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingAllocation ? 'Edit Allocation' : 'Allocate Resource'}</Text>
              <TouchableOpacity onPress={() => {
                setShowAllocationModal(false);
                setEditingAllocation(null);
              }}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Project *</Text>
                <TouchableOpacity
                  onPress={() => setShowProjectSelectDropdown(!showProjectSelectDropdown)}
                  style={styles.dropdownButton}
                >
                  <Text style={styles.dropdownText}>
                    {allocationForm.projectName || 'Select Project'}
                  </Text>
                  <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
                </TouchableOpacity>
                {showProjectSelectDropdown && (
                  <View style={styles.dropdownList}>
                    {getActiveProjectsSorted().map(project => (
                      <TouchableOpacity
                        key={project._id}
                        onPress={() => {
                          setAllocationForm({
                            ...allocationForm,
                            projectId: project._id,
                            projectName: `${project.name} (${project.code})`,
                          });
                          setShowProjectSelectDropdown(false);
                        }}
                        style={styles.dropdownItem}
                      >
                        <Text>{project.name} ({project.code})</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Employee *</Text>
                <View style={styles.employeeRow}>
                  <TouchableOpacity
                    onPress={() => setShowEmployeeSelectDropdown(!showEmployeeSelectDropdown)}
                    style={[styles.dropdownButton, { flex: 1 }]}
                  >
                    <Text style={styles.dropdownText}>
                      {allocationForm.selectedEmployeeName || 'Select Employee'}
                    </Text>
                    <Icon name="arrow-drop-down" size={24} color={COLORS.gray} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={addEmployeeToList}
                    disabled={!allocationForm.selectedEmployeeId}
                    style={[styles.addButtonSmall, !allocationForm.selectedEmployeeId && styles.addButtonDisabled]}
                  >
                    <Text style={styles.addButtonSmallText}>Add</Text>
                  </TouchableOpacity>
                </View>
                {showEmployeeSelectDropdown && (
                  <View style={styles.dropdownList}>
                    {getAllEmployeesSorted().map(emp => (
                      <TouchableOpacity
                        key={emp.employeeId}
                        onPress={() => {
                          setAllocationForm({
                            ...allocationForm,
                            selectedEmployeeId: emp.employeeId,
                            selectedEmployeeName: `${emp.name} (${emp.employeeId})`,
                          });
                          setShowEmployeeSelectDropdown(false);
                        }}
                        style={styles.dropdownItem}
                      >
                        <Text>{emp.name} ({emp.employeeId})</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {allocationForm.employeeIds.length > 0 && (
                  <View style={styles.selectedEmployees}>
                    {allocationForm.employeeIds.map(code => {
                      const emp = employees.find(e => e.employeeId === code);
                      return (
                        <View key={code} style={styles.selectedEmployee}>
                          <Text style={styles.selectedEmployeeText}>
                            {emp?.name || 'Employee'} ({code})
                          </Text>
                          <TouchableOpacity onPress={() => removeEmployeeFromList(code)}>
                            <Icon name="close" size={18} color={COLORS.red} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => {
                  setShowAllocationModal(false);
                  setEditingAllocation(null);
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAllocate}
                disabled={loading}
                style={[styles.submitButton, loading && { backgroundColor: COLORS.gray }]}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.submitButtonText}>{editingAllocation ? 'Update' : 'Allocate'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      
      {/* View Modal */}
      <Modal
        visible={showViewModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowViewModal(false);
          setViewingItem(null);
        }}
      >
        <View style={styles.viewModalOverlay}>
          <View style={styles.viewModalContent}>
            <View style={styles.viewModalHeader}>
              <View style={styles.viewModalAvatar}>
                <Text style={styles.viewModalAvatarText}>
                  {viewingItem ? getInitials(viewingItem.name || viewingItem.projectName) : '?'}
                </Text>
              </View>
              <View style={styles.viewModalTitleContainer}>
                <Text style={styles.viewModalTitle}>
                  {viewingItem?.type === 'project' ? viewingItem?.name : viewingItem?.projectName}
                </Text>
                <Text style={styles.viewModalSubtitle}>
                  {viewingItem?.code || viewingItem?.projectCode} • {viewingItem?.division || viewingItem?.projectDivision}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setShowViewModal(false);
                setViewingItem(null);
              }} style={styles.viewModalClose}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
            
            {viewingItem && (
              <ScrollView style={styles.viewModalBody}>
                <View style={styles.viewModalGrid}>
                  {viewingItem.type === 'project' ? (
                    <>
                      <View style={[styles.viewModalCard, { backgroundColor: COLORS.indigoLight }]}>
                        <Text style={styles.viewModalCardLabel}>Project Code</Text>
                        <Text style={styles.viewModalCardValue}>{viewingItem.code || '-'}</Text>
                      </View>
                      <View style={[styles.viewModalCard, { backgroundColor: COLORS.emeraldLight }]}>
                        <Text style={styles.viewModalCardLabel}>Division</Text>
                        <Text style={styles.viewModalCardValue}>{viewingItem.division || '-'}</Text>
                      </View>
                      <View style={[styles.viewModalCard, { backgroundColor: COLORS.purpleLight }]}>
                        <Text style={styles.viewModalCardLabel}>Location</Text>
                        <Text style={styles.viewModalCardValue}>{viewingItem.branch || '-'}</Text>
                      </View>
                      <View style={[styles.viewModalCard, { backgroundColor: COLORS.blueLight }]}>
                        <Text style={styles.viewModalCardLabel}>Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(viewingItem.status).bg, alignSelf: 'flex-start' }]}>
                          <Text style={[styles.statusText, { color: getStatusBadge(viewingItem.status).text }]}>
                            {viewingItem.status || '-'}
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={[styles.viewModalCard, { backgroundColor: COLORS.indigoLight }]}>
                        <Text style={styles.viewModalCardLabel}>Project Code</Text>
                        <Text style={styles.viewModalCardValue}>{viewingItem.projectCode || '-'}</Text>
                      </View>
                      <View style={[styles.viewModalCard, { backgroundColor: COLORS.emeraldLight }]}>
                        <Text style={styles.viewModalCardLabel}>Employee Name</Text>
                        <Text style={styles.viewModalCardValue}>{viewingItem.employeeName || '-'}</Text>
                      </View>
                      <View style={[styles.viewModalCard, { backgroundColor: COLORS.purpleLight }]}>
                        <Text style={styles.viewModalCardLabel}>Employee ID</Text>
                        <Text style={styles.viewModalCardValue}>{viewingItem.employeeCode || '-'}</Text>
                      </View>
                      <View style={[styles.viewModalCard, { backgroundColor: COLORS.blueLight }]}>
                        <Text style={styles.viewModalCardLabel}>Status</Text>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusBadge(viewingItem.status).bg, alignSelf: 'flex-start' }]}>
                          <Text style={[styles.statusText, { color: getStatusBadge(viewingItem.status).text }]}>
                            {viewingItem.status || '-'}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </View>
                
                <View style={styles.viewModalRemarksCard}>
                  <Text style={styles.viewModalRemarksLabel}>Project Duration</Text>
                  <Text style={styles.viewModalRemarksValue}>
                    {formatDate(viewingItem.startDate)} to {formatDate(viewingItem.endDate)}
                  </Text>
                </View>
                
                {viewingItem.type !== 'project' && (
                  <View style={styles.viewModalRemarksCard}>
                    <Text style={styles.viewModalRemarksLabel}>Assigned By</Text>
                    <Text style={styles.viewModalRemarksValue}>
                      {viewingItem.assignedBy || '-'} • {formatDate(viewingItem.assignedDate)}
                    </Text>
                  </View>
                )}
                
                <View style={styles.viewModalTags}>
                  <View style={[styles.tag, { backgroundColor: viewingItem.status === 'Active' ? COLORS.emeraldLight : COLORS.lightGray }]}>
                    <Text style={[styles.tagText, { color: viewingItem.status === 'Active' ? COLORS.emerald : COLORS.gray }]}>
                      {viewingItem.status || '-'}
                    </Text>
                  </View>
                  <View style={[styles.tag, { backgroundColor: COLORS.gray + '20' }]}>
                    <Text style={styles.tagText}>{viewingItem.branch || viewingItem.location || '-'}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
            
            <TouchableOpacity
              onPress={() => {
                setShowViewModal(false);
                setViewingItem(null);
              }}
              style={styles.viewModalCloseButton}
            >
              <Text style={styles.viewModalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Project Allocation • Work & Productivity • "
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
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
  addButton: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  addButtonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonSmallText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  addButtonDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.5,
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 4,
  },
  activeTab: {
    backgroundColor: COLORS.indigoLight,
  },
  tabText: {
    fontSize: 14,
    marginLeft: 8,
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.indigo,
    fontWeight: '600',
  },
  filtersPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  clearAllText: {
    color: COLORS.blue,
    fontSize: 14,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  filterItem: {
    flex: 1,
    minWidth: 160,
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
  },
  picker: {
    height: 48,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
  },
  locationInfoText: {
    fontSize: 12,
    color: COLORS.info,
    marginLeft: 8,
    flex: 1,
  },
  locationInfoBold: {
    fontWeight: '600',
  },
  showAllText: {
    fontSize: 12,
    color: COLORS.blue,
    fontWeight: '500',
  },
  resultsContainer: {
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 13,
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
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 12,
    paddingHorizontal: 8,
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
    paddingHorizontal: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionIcon: {
    padding: 6,
    borderRadius: 20,
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  emptySubText: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.lightGray,
  },
  clearFiltersButton: {
    marginTop: 16,
    padding: 10,
  },
  clearFiltersText: {
    fontSize: 14,
    color: COLORS.blue,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
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
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
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
  inputError: {
    borderColor: COLORS.error,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: COLORS.white,
  },
  dropdownText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  employeeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectedEmployees: {
    marginTop: 12,
  },
  selectedEmployee: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedEmployeeText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  infoBox: {
    backgroundColor: COLORS.indigoLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.indigo,
  },
  infoLabel: {
    fontWeight: '600',
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
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
  viewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
  },
  viewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  viewModalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.indigo,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  viewModalAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  viewModalTitleContainer: {
    flex: 1,
  },
  viewModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  viewModalSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  viewModalClose: {
    padding: 4,
  },
  viewModalBody: {
    maxHeight: 400,
  },
  viewModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  viewModalCard: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 12,
    padding: 12,
  },
  viewModalCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  viewModalCardValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  viewModalRemarksCard: {
    backgroundColor: COLORS.filterBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  viewModalRemarksLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  viewModalRemarksValue: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  viewModalTags: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  viewModalCloseButton: {
    backgroundColor: COLORS.primary,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  viewModalCloseButtonText: {
    color: COLORS.white,
    fontWeight: '600',
  },
});

export default ProjectAllocationScreen;