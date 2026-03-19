// screens/ProjectAllocationScreen.tsx
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { projectAPI, allocationAPI, employeeAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  darkBlue: '#1e2b58',
  lightBlue: '#EBF5FF',
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

interface Project {
  _id: string;
  code: string;
  name: string;
  division: string;
  branch: string;
  startDate: string;
  endDate: string;
  status: string;
  description?: string;
}

interface Allocation {
  _id: string;
  projectCode: string;
  projectName: string;
  projectDivision: string;
  employeeName: string;
  employeeCode: string;
  branch: string;
  status: string;
  startDate: string;
  endDate: string;
  assignedBy: string;
  assignedDate: string;
  role?: string;
}

interface User {
  employeeId?: string;
  name?: string;
  role?: string;
  id?: string;
  _id?: string;
}

const ProjectAllocationScreen = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'projects' | 'allocations' | 'myAllocations'>('projects');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [projects, setProjects] = useState<Project[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [divisions] = useState(['SDS', 'TEKLA', 'DAS(Software)', 'DDS(Manufacturing)', 'Mechanical', 'Electrical', 'HR/Admin', 'Engineering Services']);
  const [branches] = useState(['Hosur', 'Chennai', 'Outside Det.']);
  const [statuses] = useState(['Active', 'Completed']);

  // Filter states
  const [projectFilters, setProjectFilters] = useState({
    division: [] as string[],
    status: [] as string[],
    location: [] as string[]
  });

  const [allocationFilters, setAllocationFilters] = useState({
    division: [] as string[],
    status: [] as string[],
    location: [] as string[]
  });

  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);

  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<Allocation | null>(null);
  const [viewingItem, setViewingItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<{ id: string; type: string; name?: string } | null>(null);
  const [messageModal, setMessageModal] = useState({ title: '', message: '' });
  const [successMessage, setSuccessMessage] = useState('');

  // Form states
  const [projectForm, setProjectForm] = useState({
    name: '',
    division: '',
    branch: '',
    startDate: '',
    endDate: '',
    status: 'Active'
  });

  const [allocationForm, setAllocationForm] = useState({
    division: '',
    projectName: '',
    projectCode: '',
    employeeId: '',
    employeeName: '',
    employeeIds: [] as string[]
  });

  // Picker visibility states
  const [showDivisionPicker, setShowDivisionPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showEmployeePicker, setShowEmployeePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showFilterDivisionPicker, setShowFilterDivisionPicker] = useState(false);
  const [showFilterStatusPicker, setShowFilterStatusPicker] = useState(false);
  const [showFilterLocationPicker, setShowFilterLocationPicker] = useState(false);

  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Loading states
  const [saveLoading, setSaveLoading] = useState(false);

  const isProjectManager = user?.role === 'projectmanager' || user?.role === 'project_manager' || user?.role === 'admin';
  const canEdit = isProjectManager;

  // Helper function to extract data from API responses
  const extractData = (response: any): any[] => {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response.data) {
      if (Array.isArray(response.data)) return response.data;
      if (response.data.data && Array.isArray(response.data.data)) return response.data.data;
    }
    return [];
  };

  useEffect(() => {
    loadUserData();
    loadData();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, []);

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      const userData = userStr ? JSON.parse(userStr) : null;
      setUser(userData);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [projRes, allocRes, empRes] = await Promise.all([
        projectAPI.getProjects(),
        allocationAPI.getAllAllocations(),
        employeeAPI.getAllEmployees(),
      ]);

      setProjects(extractData(projRes));
      setAllocations(extractData(allocRes));
      setEmployees(extractData(empRes));
    } catch (error) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load data from database');
    } finally {
      setLoading(false);
    }
  };

  // Filter functions
  const filterProjects = (projectsList: Project[]) => {
    return projectsList.filter(project => {
      const matchesDivision = projectFilters.division.length === 0 || projectFilters.division.includes(project.division);
      const matchesStatus = projectFilters.status.length === 0 || projectFilters.status.includes(project.status);
      const matchesLocation = projectFilters.location.length === 0 || projectFilters.location.includes(project.branch);
      return matchesDivision && matchesStatus && matchesLocation;
    });
  };

  const filterAllocations = (allocationsList: Allocation[]) => {
    return allocationsList.filter(allocation => {
      const matchesDivision = allocationFilters.division.length === 0 || allocationFilters.division.includes(allocation.projectDivision);
      const matchesStatus = allocationFilters.status.length === 0 || allocationFilters.status.includes(allocation.status);
      const matchesLocation = allocationFilters.location.length === 0 || allocationFilters.location.includes(allocation.branch);
      return matchesDivision && matchesStatus && matchesLocation;
    });
  };

  // Filtered projects based on selected division for allocation modal
  const getFilteredProjectsByDivision = () => {
    if (!allocationForm.division) return [];
    return projects.filter(project =>
      project.division === allocationForm.division && project.status === 'Active'
    );
  };

  // Filtered employees based on selected division for allocation modal
  const getFilteredEmployeesByDivision = () => {
    if (!allocationForm.division) return [];
    return employees.filter(employee => employee.division === allocationForm.division);
  };

  // Calculate current user's allocations
  const myAllocations = allocations.filter(alloc => {
    if (!user) return false;
    const matchesId = (user.id && alloc.employeeCode === user.id) ||
      (user._id && alloc.employeeCode === user._id);
    const matchesEmployeeId = user.employeeId && alloc.employeeCode === user.employeeId;
    const matchesName = user.name && alloc.employeeName?.toLowerCase() === user.name.toLowerCase();
    return matchesId || matchesEmployeeId || matchesName;
  });

  // Filter helpers with location filter
  const getFilteredProjects = () => {
    let filtered = projects;
    if (selectedLocation !== 'All') {
      filtered = filtered.filter(p => p.branch === selectedLocation);
    }
    return filterProjects(filtered);
  };

  const getFilteredAllocations = () => {
    let filtered = allocations;
    if (selectedLocation !== 'All') {
      filtered = filtered.filter(a => a.branch === selectedLocation);
    }
    return filterAllocations(filtered);
  };

  const getMyFilteredAllocations = () => {
    let filtered = myAllocations;
    if (selectedLocation !== 'All') {
      filtered = filtered.filter(a => a.branch === selectedLocation);
    }
    return filterAllocations(filtered);
  };

  // Check if any filters are active
  const hasActiveProjectFilters = Object.values(projectFilters).some(f => f.length > 0);
  const hasActiveAllocationFilters = Object.values(allocationFilters).some(f => f.length > 0);

  // Filter handlers
  const handleProjectFilterChange = (field: keyof typeof projectFilters, value: string) => {
    setProjectFilters(prev => {
      const currentValues = prev[field];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      return { ...prev, [field]: newValues };
    });
  };

  const handleAllocationFilterChange = (field: keyof typeof allocationFilters, value: string) => {
    setAllocationFilters(prev => {
      const currentValues = prev[field];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      return { ...prev, [field]: newValues };
    });
  };

  const clearProjectFilters = () => {
    setProjectFilters({
      division: [],
      status: [],
      location: []
    });
  };

  const clearAllocationFilters = () => {
    setAllocationFilters({
      division: [],
      status: [],
      location: []
    });
  };

  const clearAllFilters = () => {
    clearProjectFilters();
    clearAllocationFilters();
    setSelectedLocation('All');
  };

  // Utility functions
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'active') {
      return { bg: '#10b98120', text: '#10b981' };
    } else if (statusLower === 'completed') {
      return { bg: '#6b728020', text: '#6b7280' };
    } else {
      return { bg: '#f59e0b20', text: '#f59e0b' };
    }
  };

  // Generate project code based on division
  const generateProjectCode = (division: string) => {
    const d = division.toUpperCase();
    let prefix = 'PROJ';
    if (d.includes('SDS')) prefix = 'CDE-SDS';
    else if (d.includes('TEK')) prefix = 'CDE-TEK';
    else if (d.includes('DAS')) prefix = 'CDE-DAS';
    else if (d.includes('DDS')) prefix = 'CDE-DDS';
    else if (d.includes('MEC') || d.includes('MECHANICAL')) prefix = 'CDE-MEC';
    else if (d.includes('ELEC')) prefix = 'CDE-ELEC';
    else if (d.includes('HR')) prefix = 'CDE-HR';
    else if (d.includes('ENG')) prefix = 'CDE-ENG';

    const existingCodes = projects
      .filter(p => p.division === division)
      .map(p => {
        const match = p.code.match(new RegExp(`^${prefix}-(\\d+)$`));
        return match ? parseInt(match[1]) : null;
      })
      .filter((num): num is number => num !== null);

    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 0;
    return `${prefix}-${nextNumber.toString().padStart(3, '0')}`;
  };

  // Modal handlers
  const openViewModal = (item: any) => {
    setViewingItem(item);
    setViewModalOpen(true);
  };

  const openProjectModal = (project?: Project) => {
    if (!canEdit && project) {
      openViewModal({ ...project, type: 'project' });
      return;
    }

    if (!canEdit) {
      setMessageModal({ title: 'Access Denied', message: "You don't have permission to manage projects." });
      setMessageModalOpen(true);
      return;
    }

    if (project) {
      setEditingProject(project);
      setProjectForm({
        name: project.name,
        division: project.division,
        branch: project.branch,
        startDate: project.startDate,
        endDate: project.endDate,
        status: project.status
      });
    } else {
      setEditingProject(null);
      setProjectForm({
        name: '',
        division: '',
        branch: '',
        startDate: '',
        endDate: '',
        status: 'Active'
      });
    }
    setProjectModalOpen(true);
  };

  const openAllocationModal = (allocation?: Allocation) => {
    if (!canEdit && allocation) {
      openViewModal({ ...allocation, type: 'allocation' });
      return;
    }

    if (!canEdit) {
      setMessageModal({ title: 'Access Denied', message: "You don't have permission to manage allocations." });
      setMessageModalOpen(true);
      return;
    }

    if (allocation) {
      setEditingAllocation(allocation);
      setAllocationForm({
        division: allocation.projectDivision,
        projectName: allocation.projectName,
        projectCode: allocation.projectCode,
        employeeId: allocation.employeeCode,
        employeeName: allocation.employeeName,
        employeeIds: [allocation.employeeCode]
      });
    } else {
      setEditingAllocation(null);
      setAllocationForm({
        division: '',
        projectName: '',
        projectCode: '',
        employeeId: '',
        employeeName: '',
        employeeIds: []
      });
    }
    setAllocationModalOpen(true);
  };

  const openDeleteModal = (id: string, type: string, name?: string) => {
    if (!canEdit) {
      setMessageModal({ title: 'Access Denied', message: "You don't have permission to delete." });
      setMessageModalOpen(true);
      return;
    }
    setDeleteItem({ id, type, name });
    setDeleteModalOpen(true);
  };

  const handleProjectSave = async () => {
    if (!projectForm.name || !projectForm.division || !projectForm.branch || !projectForm.startDate || !projectForm.endDate) {
      setMessageModal({ title: 'Missing Fields', message: 'Please fill all required fields.' });
      setMessageModalOpen(true);
      return;
    }

    const start = new Date(projectForm.startDate);
    const end = new Date(projectForm.endDate);
    if (end < start) {
      setMessageModal({ title: 'Invalid Dates', message: 'End Date must be after Start Date.' });
      setMessageModalOpen(true);
      return;
    }

    // Prevent duplicate project
    const duplicateProject = projects.some(p =>
      p.name.toLowerCase() === projectForm.name.toLowerCase() &&
      p.division === projectForm.division &&
      p._id !== editingProject?._id
    );

    if (duplicateProject) {
      setMessageModal({ title: 'Duplicate Project', message: 'A project with the same name and division already exists.' });
      setMessageModalOpen(true);
      return;
    }

    const projectCode = editingProject ? editingProject.code : generateProjectCode(projectForm.division);

    const payload = {
      name: projectForm.name,
      code: projectCode,
      division: projectForm.division,
      branch: projectForm.branch,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate,
      status: projectForm.status,
      description: `${projectForm.name} project`,
    };

    if (editingProject) {
      const keys = ['name', 'division', 'branch', 'startDate', 'endDate', 'status'];
      const unchanged = keys.every(k => String(editingProject[k as keyof Project] || '') === String(payload[k as keyof typeof payload] || ''));
      if (unchanged) {
        setMessageModal({ title: 'No Changes', message: 'No changes detected.' });
        setMessageModalOpen(true);
        return;
      }
    }

    setSaveLoading(true);
    try {
      if (editingProject) {
        await projectAPI.updateProject(editingProject._id, payload);
        setSuccessMessage('Project updated successfully');
      } else {
        await projectAPI.createProject(payload);
        setSuccessMessage('Project created successfully');
      }
      setProjectModalOpen(false);
      await loadData();
      setSuccessModalOpen(true);
    } catch (error: any) {
      console.error('Save error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save project';
      setMessageModal({ title: 'Error', message: errorMessage });
      setMessageModalOpen(true);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const selectedEmployee = employees.find(emp => emp.employeeId === employeeId);
    if (selectedEmployee) {
      setAllocationForm(prev => ({
        ...prev,
        employeeName: selectedEmployee.name,
        employeeId: selectedEmployee.employeeId
      }));
    }
  };

  const addEmployeeToList = () => {
    if (!allocationForm.employeeId) return;
    if (allocationForm.employeeIds.includes(allocationForm.employeeId)) return;
    
    setAllocationForm(prev => ({
      ...prev,
      employeeIds: [...prev.employeeIds, prev.employeeId],
      employeeName: '',
      employeeId: ''
    }));
  };

  const removeEmployeeFromList = (empCode: string) => {
    setAllocationForm(prev => ({
      ...prev,
      employeeIds: prev.employeeIds.filter(code => code !== empCode)
    }));
  };

  const handleAllocate = async () => {
    const hasEmployees = editingAllocation
      ? !!allocationForm.employeeId
      : allocationForm.employeeIds.length > 0;

    if (!allocationForm.division || !allocationForm.projectName || !hasEmployees) {
      setMessageModal({ title: 'Missing Fields', message: 'Please fill all required fields.' });
      setMessageModalOpen(true);
      return;
    }

    const project = projects.find(p =>
      p.name === allocationForm.projectName && p.division === allocationForm.division
    );

    if (!project) {
      setMessageModal({ title: 'Not Found', message: 'Project not found.' });
      setMessageModalOpen(true);
      return;
    }

    const selectedEmployeeIds = allocationForm.employeeIds.length > 0
      ? allocationForm.employeeIds
      : (allocationForm.employeeId ? [allocationForm.employeeId] : []);

    if (selectedEmployeeIds.length === 0) {
      setMessageModal({ title: 'Error', message: 'Please select at least one employee.' });
      setMessageModalOpen(true);
      return;
    }

    if (!editingAllocation) {
      let createdCount = 0;
      let skippedCount = 0;

      for (const empCode of selectedEmployeeIds) {
        const employee = employees.find(e => e.employeeId === empCode);
        if (!employee) {
          skippedCount++;
          continue;
        }

        const isDuplicateAllocation = allocations.some(a =>
          a.projectName.toLowerCase() === project.name.toLowerCase() &&
          a.employeeCode === empCode
        );

        if (isDuplicateAllocation) {
          skippedCount++;
          continue;
        }

        const payload = {
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
          role: ''
        };

        try {
          await allocationAPI.createAllocation(payload);
          createdCount++;
        } catch (error) {
          skippedCount++;
        }
      }

      setAllocationModalOpen(false);
      await loadData();
      setSuccessMessage(`${createdCount} allocation(s) created, ${skippedCount} skipped.`);
      setSuccessModalOpen(true);
      return;
    }

    if (editingAllocation) {
      const dupOnEdit = allocations.some(a =>
        a._id !== editingAllocation._id &&
        a.projectName.toLowerCase() === project.name.toLowerCase() &&
        a.employeeCode === allocationForm.employeeId
      );

      if (dupOnEdit) {
        setMessageModal({ title: 'Duplicate Allocation', message: 'Another allocation for this employee and project already exists.' });
        setMessageModalOpen(true);
        return;
      }
    }

    const employee = employees.find(e => e.employeeId === allocationForm.employeeId);
    if (!employee) {
      setMessageModal({ title: 'Not Found', message: 'Employee not found.' });
      setMessageModalOpen(true);
      return;
    }

    const payload = {
      projectName: project.name,
      projectCode: project.code,
      employeeName: employee.name,
      employeeCode: allocationForm.employeeId,
      startDate: project.startDate,
      endDate: project.endDate,
      branch: project.branch,
      projectDivision: project.division,
      status: 'Active',
      allocatedHours: 40,
      assignedBy: user?.name || 'System',
      assignedDate: new Date().toISOString().split('T')[0],
      role: editingAllocation?.role || ''
    };

    if (editingAllocation) {
      const unchanged =
        editingAllocation.projectName.toLowerCase() === payload.projectName.toLowerCase() &&
        editingAllocation.employeeCode === payload.employeeCode;
      if (unchanged) {
        setMessageModal({ title: 'No Changes', message: 'No changes detected.' });
        setMessageModalOpen(true);
        return;
      }
    }

    setSaveLoading(true);
    try {
      if (editingAllocation) {
        await allocationAPI.updateAllocation(editingAllocation._id, payload);
        setSuccessMessage('Allocation updated successfully');
      } else {
        await allocationAPI.createAllocation(payload);
        setSuccessMessage('Allocation created successfully');
      }
      setAllocationModalOpen(false);
      await loadData();
      setSuccessModalOpen(true);
    } catch (error: any) {
      console.error('Save error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to save allocation';
      setMessageModal({ title: 'Error', message: errorMessage });
      setMessageModalOpen(true);
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;

    setSaveLoading(true);
    try {
      if (deleteItem.type === 'project') {
        await projectAPI.deleteProject(deleteItem.id);
        setSuccessMessage('Project deleted successfully');
      } else {
        await allocationAPI.deleteAllocation(deleteItem.id);
        setSuccessMessage('Allocation deleted successfully');
      }
      setDeleteModalOpen(false);
      await loadData();
      setSuccessModalOpen(true);
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete';
      setMessageModal({ title: 'Error', message: errorMessage });
      setMessageModalOpen(true);
    } finally {
      setSaveLoading(false);
      setDeleteItem(null);
    }
  };

  const FilterChip = ({ label, selected, onPress }: any) => (
    <TouchableOpacity
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        backgroundColor: selected ? COLORS.primary : COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
      }}
      onPress={onPress}
    >
      <Text style={{ fontSize: 12, color: selected ? COLORS.white : COLORS.gray }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Project Allocation" 
        showBack={true}
        rightComponent={
          <TouchableOpacity onPress={onRefresh}>
            <Icon name="refresh" size={24} color={COLORS.white} />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Tabs */}
        <View style={{ flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <TouchableOpacity
            onPress={() => setActiveTab('projects')}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'projects' ? COLORS.primary : 'transparent',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'projects' ? COLORS.primary : COLORS.gray }}>
              Projects ({getFilteredProjects().length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('allocations')}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === 'allocations' ? COLORS.primary : 'transparent',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'allocations' ? COLORS.primary : COLORS.gray }}>
              Allocations ({getFilteredAllocations().length})
            </Text>
          </TouchableOpacity>
          {!canEdit && (
            <TouchableOpacity
              onPress={() => setActiveTab('myAllocations')}
              style={{
                flex: 1,
                paddingVertical: 10,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: activeTab === 'myAllocations' ? COLORS.primary : 'transparent',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: activeTab === 'myAllocations' ? COLORS.primary : COLORS.gray }}>
                My Allocations ({getMyFilteredAllocations().length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Controls */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: showFilters ? COLORS.primary : COLORS.white,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Icon name="filter-list" size={20} color={showFilters ? COLORS.white : COLORS.gray} />
            <Text style={{ marginLeft: 4, color: showFilters ? COLORS.white : COLORS.gray, fontSize: 14 }}>Filters</Text>
            {(hasActiveProjectFilters || hasActiveAllocationFilters) && (
              <View style={{
                marginLeft: 4,
                backgroundColor: COLORS.red,
                width: 16,
                height: 16,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Text style={{ color: COLORS.white, fontSize: 10 }}>!</Text>
              </View>
            )}
          </TouchableOpacity>

          {canEdit && (
            <TouchableOpacity
              onPress={() => activeTab === 'projects' ? openProjectModal() : openAllocationModal()}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: COLORS.primary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              <Icon name="add" size={20} color={COLORS.white} />
              <Text style={{ marginLeft: 4, color: COLORS.white, fontSize: 14 }}>
                {activeTab === 'projects' ? 'Add Project' : 'Allocate'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Location Filter Dropdown */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>Location</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <TouchableOpacity
              onPress={() => setSelectedLocation('All')}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                marginRight: 8,
                marginBottom: 8,
                backgroundColor: selectedLocation === 'All' ? COLORS.primary : COLORS.white,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ color: selectedLocation === 'All' ? COLORS.white : COLORS.gray }}>All</Text>
            </TouchableOpacity>
            {branches.map(branch => (
              <TouchableOpacity
                key={branch}
                onPress={() => setSelectedLocation(branch)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  marginRight: 8,
                  marginBottom: 8,
                  backgroundColor: selectedLocation === branch ? COLORS.primary : COLORS.white,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ color: selectedLocation === branch ? COLORS.white : COLORS.gray }}>{branch}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <View style={{ backgroundColor: COLORS.filterBg, padding: 16, borderRadius: 12, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Advanced Filters</Text>
              <TouchableOpacity onPress={clearAllFilters}>
                <Text style={{ color: COLORS.red, fontSize: 14 }}>Clear All</Text>
              </TouchableOpacity>
            </View>

            {activeTab === 'projects' ? (
              <View>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                  {divisions.map(div => (
                    <FilterChip
                      key={div}
                      label={div}
                      selected={projectFilters.division.includes(div)}
                      onPress={() => handleProjectFilterChange('division', div)}
                    />
                  ))}
                </View>

                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Status</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                  {statuses.map(status => (
                    <FilterChip
                      key={status}
                      label={status}
                      selected={projectFilters.status.includes(status)}
                      onPress={() => handleProjectFilterChange('status', status)}
                    />
                  ))}
                </View>

                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                  {branches.map(loc => (
                    <FilterChip
                      key={loc}
                      label={loc}
                      selected={projectFilters.location.includes(loc)}
                      onPress={() => handleProjectFilterChange('location', loc)}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <View>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                  {divisions.map(div => (
                    <FilterChip
                      key={div}
                      label={div}
                      selected={allocationFilters.division.includes(div)}
                      onPress={() => handleAllocationFilterChange('division', div)}
                    />
                  ))}
                </View>

                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Status</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                  {statuses.map(status => (
                    <FilterChip
                      key={status}
                      label={status}
                      selected={allocationFilters.status.includes(status)}
                      onPress={() => handleAllocationFilterChange('status', status)}
                    />
                  ))}
                </View>

                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                  {branches.map(loc => (
                    <FilterChip
                      key={loc}
                      label={loc}
                      selected={allocationFilters.location.includes(loc)}
                      onPress={() => handleAllocationFilterChange('location', loc)}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Location Filter Indicator */}
        {selectedLocation !== 'All' && (
          <View style={{ backgroundColor: COLORS.lightBlue, padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: COLORS.blue }}>
              📍 Showing data for <Text style={{ fontWeight: '600' }}>{selectedLocation}</Text> location
              <Text onPress={() => setSelectedLocation('All')} style={{ color: COLORS.blue, textDecorationLine: 'underline', marginLeft: 8 }}> Show all</Text>
            </Text>
          </View>
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ marginTop: 12, color: COLORS.textSecondary }}>Loading data from server...</Text>
          </View>
        )}

        {/* Projects Table */}
        {!loading && activeTab === 'projects' && (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <View style={{ backgroundColor: COLORS.filterBg, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>
                {selectedLocation === 'All' ? 'All Projects' : `${selectedLocation} Projects`}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
                {getFilteredProjects().length} project(s) {hasActiveProjectFilters && '• With filters'}
              </Text>
            </View>

            {getFilteredProjects().length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Icon name="business" size={48} color={COLORS.lightGray} />
                <Text style={{ fontSize: 16, color: COLORS.textPrimary, marginTop: 8 }}>No Projects Found</Text>
                <Text style={{ fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 4 }}>
                  {hasActiveProjectFilters ? "No projects match your filters." : "No projects available."}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal>
                <View>
                  {/* Table Header */}
                  <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 4 }}>
                    <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>S.No</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Project Code</Text>
                    <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Project Name</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Division</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Location</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Start Date</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>End Date</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Status</Text>
                    <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                  </View>

                  {/* Table Rows */}
                  {getFilteredProjects().map((item, index) => {
                    const statusColors = getStatusBadge(item.status);
                    return (
                      <View key={item._id} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.filterBg }}>
                        <Text style={{ width: 50, fontSize: 12, textAlign: 'center', color: COLORS.textPrimary }}>{index + 1}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.blue, fontWeight: '500' }}>{item.code}</Text>
                        <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary }}>{item.name}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{item.division}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{item.branch}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{formatDate(item.startDate)}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{formatDate(item.endDate)}</Text>
                        <View style={{ width: 80 }}>
                          <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
                            <Text style={{ fontSize: 11, color: statusColors.text, fontWeight: '500' }}>{item.status}</Text>
                          </View>
                        </View>
                        <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center' }}>
                          <TouchableOpacity onPress={() => openViewModal({ ...item, type: 'project' })} style={{ padding: 4 }}>
                            <Icon name="visibility" size={18} color={COLORS.blue} />
                          </TouchableOpacity>
                          {canEdit && (
                            <>
                              <TouchableOpacity onPress={() => openProjectModal(item)} style={{ padding: 4 }}>
                                <Icon name="edit" size={18} color={COLORS.green} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => openDeleteModal(item._id, 'project', item.name)} style={{ padding: 4 }}>
                                <Icon name="delete" size={18} color={COLORS.red} />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {/* Allocations Table */}
        {!loading && activeTab === 'allocations' && (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <View style={{ backgroundColor: COLORS.filterBg, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>
                {selectedLocation === 'All' ? 'All Allocations' : `${selectedLocation} Allocations`}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
                {getFilteredAllocations().length} allocation(s) {hasActiveAllocationFilters && '• With filters'}
              </Text>
            </View>

            {getFilteredAllocations().length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Icon name="people" size={48} color={COLORS.lightGray} />
                <Text style={{ fontSize: 16, color: COLORS.textPrimary, marginTop: 8 }}>No Allocations Found</Text>
                <Text style={{ fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 4 }}>
                  {hasActiveAllocationFilters ? "No allocations match your filters." : "No allocations available."}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal>
                <View>
                  {/* Table Header */}
                  <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 4 }}>
                    <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>S.No</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Project Code</Text>
                    <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Project Name</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Division</Text>
                    <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee Name</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Emp ID</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Location</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Status</Text>
                    <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                  </View>

                  {/* Table Rows */}
                  {getFilteredAllocations().map((item, index) => {
                    const statusColors = getStatusBadge(item.status);
                    return (
                      <View key={item._id} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.filterBg }}>
                        <Text style={{ width: 50, fontSize: 12, textAlign: 'center', color: COLORS.textPrimary }}>{index + 1}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.blue, fontWeight: '500' }}>{item.projectCode}</Text>
                        <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary }}>{item.projectName}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{item.projectDivision}</Text>
                        <Text style={{ width: 120, fontSize: 12, color: COLORS.textPrimary }}>{item.employeeName}</Text>
                        <Text style={{ width: 80, fontSize: 12, color: COLORS.blue, fontWeight: '500' }}>{item.employeeCode}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{item.branch}</Text>
                        <View style={{ width: 80 }}>
                          <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
                            <Text style={{ fontSize: 11, color: statusColors.text, fontWeight: '500' }}>{item.status}</Text>
                          </View>
                        </View>
                        <View style={{ width: 120, flexDirection: 'row', justifyContent: 'center' }}>
                          <TouchableOpacity onPress={() => openViewModal({ ...item, type: 'allocation' })} style={{ padding: 4 }}>
                            <Icon name="visibility" size={18} color={COLORS.blue} />
                          </TouchableOpacity>
                          {canEdit && (
                            <>
                              <TouchableOpacity onPress={() => openAllocationModal(item)} style={{ padding: 4 }}>
                                <Icon name="edit" size={18} color={COLORS.green} />
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => openDeleteModal(item._id, 'allocation')} style={{ padding: 4 }}>
                                <Icon name="delete" size={18} color={COLORS.red} />
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        )}

        {/* My Allocations Table */}
        {!loading && activeTab === 'myAllocations' && !canEdit && (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }}>
            <View style={{ backgroundColor: COLORS.filterBg, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>
                {selectedLocation === 'All' ? 'My Allocations' : `My ${selectedLocation} Allocations`}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.gray, marginTop: 2 }}>
                {getMyFilteredAllocations().length} allocation(s) {hasActiveAllocationFilters && '• With filters'}
              </Text>
            </View>

            {getMyFilteredAllocations().length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Icon name="assignment" size={48} color={COLORS.lightGray} />
                <Text style={{ fontSize: 16, color: COLORS.textPrimary, marginTop: 8 }}>No Allocations Found</Text>
                <Text style={{ fontSize: 13, color: COLORS.gray, textAlign: 'center', marginTop: 4 }}>
                  {hasActiveAllocationFilters ? "No allocations match your filters." : "You are not allocated to any projects."}
                </Text>
              </View>
            ) : (
              <ScrollView horizontal>
                <View>
                  {/* Table Header */}
                  <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 4 }}>
                    <Text style={{ width: 50, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>S.No</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Project Code</Text>
                    <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Project Name</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Division</Text>
                    <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Location</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Status</Text>
                    <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Duration</Text>
                    <Text style={{ width: 120, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Assigned By</Text>
                    <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                  </View>

                  {/* Table Rows */}
                  {getMyFilteredAllocations().map((item, index) => {
                    const statusColors = getStatusBadge(item.status);
                    return (
                      <View key={item._id} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.filterBg }}>
                        <Text style={{ width: 50, fontSize: 12, textAlign: 'center', color: COLORS.textPrimary }}>{index + 1}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.blue, fontWeight: '500' }}>{item.projectCode}</Text>
                        <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary }}>{item.projectName}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{item.projectDivision}</Text>
                        <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{item.branch}</Text>
                        <View style={{ width: 80 }}>
                          <View style={{ backgroundColor: statusColors.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }}>
                            <Text style={{ fontSize: 11, color: statusColors.text, fontWeight: '500' }}>{item.status}</Text>
                          </View>
                        </View>
                        <Text style={{ width: 150, fontSize: 12, color: COLORS.textSecondary }}>
                          {formatDate(item.startDate)} - {formatDate(item.endDate)}
                        </Text>
                        <Text style={{ width: 120, fontSize: 12, color: COLORS.textSecondary }}>
                          {item.assignedBy || 'System'}{'\n'}<Text style={{ fontSize: 10, color: COLORS.gray }}>{formatDate(item.assignedDate)}</Text>
                        </Text>
                        <View style={{ width: 80, alignItems: 'center' }}>
                          <TouchableOpacity onPress={() => openViewModal({ ...item, type: 'allocation' })} style={{ padding: 4 }}>
                            <Icon name="visibility" size={18} color={COLORS.blue} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Project Allocation • Resource Management • "
      />

      {/* View Modal */}
      <Modal visible={viewModalOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>
                {viewingItem?.type === 'project' ? 'Project Details' : 'Allocation Details'}
              </Text>
              <TouchableOpacity onPress={() => setViewModalOpen(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {viewingItem && (
                <View>
                  {viewingItem.type === 'project' ? (
                    // Project Details
                    <View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Project Code:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.blue, fontWeight: '500' }}>{viewingItem.code}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Project Name:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textPrimary }}>{viewingItem.name}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Division:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary }}>{viewingItem.division}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Location:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary }}>{viewingItem.branch}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Start Date:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary }}>{formatDate(viewingItem.startDate)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>End Date:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary }}>{formatDate(viewingItem.endDate)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Status:</Text>
                        <View style={{ backgroundColor: getStatusBadge(viewingItem.status).bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ fontSize: 12, color: getStatusBadge(viewingItem.status).text, fontWeight: '500' }}>{viewingItem.status}</Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    // Allocation Details
                    <View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Project Code:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.blue, fontWeight: '500' }}>{viewingItem.projectCode}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Project Name:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textPrimary }}>{viewingItem.projectName}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Division:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary }}>{viewingItem.projectDivision}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Employee:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textPrimary }}>{viewingItem.employeeName}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Employee ID:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.blue, fontWeight: '500' }}>{viewingItem.employeeCode}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Location:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary }}>{viewingItem.branch}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Start Date:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary }}>{formatDate(viewingItem.startDate)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>End Date:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary }}>{formatDate(viewingItem.endDate)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Status:</Text>
                        <View style={{ backgroundColor: getStatusBadge(viewingItem.status).bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                          <Text style={{ fontSize: 12, color: getStatusBadge(viewingItem.status).text, fontWeight: '500' }}>{viewingItem.status}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Assigned By:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary }}>{viewingItem.assignedBy || 'System'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                        <Text style={{ width: 100, fontSize: 14, color: COLORS.gray }}>Assigned Date:</Text>
                        <Text style={{ flex: 1, fontSize: 14, color: COLORS.textSecondary }}>{formatDate(viewingItem.assignedDate)}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setViewModalOpen(false)}
                style={{ backgroundColor: COLORS.primary, paddingVertical: 12, borderRadius: 8, alignItems: 'center' }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Project Modal */}
      <Modal visible={projectModalOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>
                {editingProject ? 'Edit Project' : 'Add New Project'}
              </Text>
              <TouchableOpacity onPress={() => setProjectModalOpen(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Project Name */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Project Name *</Text>
                <TextInput
                  value={projectForm.name}
                  onChangeText={(text) => setProjectForm({ ...projectForm, name: text })}
                  placeholder="Enter project name"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                  }}
                />
              </View>

              {/* Division Picker */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division *</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
                  <Picker
                    selectedValue={projectForm.division}
                    onValueChange={(value) => setProjectForm({ ...projectForm, division: value })}
                    style={{ height: 50 }}
                  >
                    <Picker.Item label="Select Division" value="" />
                    {divisions.map(div => (
                      <Picker.Item key={div} label={div} value={div} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Location Picker */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Location *</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
                  <Picker
                    selectedValue={projectForm.branch}
                    onValueChange={(value) => setProjectForm({ ...projectForm, branch: value })}
                    style={{ height: 50 }}
                  >
                    <Picker.Item label="Select Location" value="" />
                    {branches.map(branch => (
                      <Picker.Item key={branch} label={branch} value={branch} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Dates */}
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Start Date *</Text>
                  <TouchableOpacity
                    onPress={() => setShowStartPicker(true)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: projectForm.startDate ? COLORS.textPrimary : COLORS.gray }}>
                      {projectForm.startDate || 'Select Date'}
                    </Text>
                    <Icon name="calendar-today" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>End Date *</Text>
                  <TouchableOpacity
                    onPress={() => setShowEndPicker(true)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: projectForm.endDate ? COLORS.textPrimary : COLORS.gray }}>
                      {projectForm.endDate || 'Select Date'}
                    </Text>
                    <Icon name="calendar-today" size={20} color={COLORS.gray} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Status Picker */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Status</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
                  <Picker
                    selectedValue={projectForm.status}
                    onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}
                    style={{ height: 50 }}
                  >
                    {statuses.map(status => (
                      <Picker.Item key={status} label={status} value={status} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Project Code Preview */}
              {!editingProject && projectForm.division && projectForm.name && (
                <View style={{ backgroundColor: COLORS.lightBlue, padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, color: COLORS.blue }}>
                    <Text style={{ fontWeight: '600' }}>Project Code: </Text>
                    {generateProjectCode(projectForm.division)}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setProjectModalOpen(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, marginRight: 8, borderWidth: 1, borderColor: COLORS.gray, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleProjectSave}
                disabled={saveLoading}
                style={{ 
                  paddingHorizontal: 20, 
                  paddingVertical: 10, 
                  backgroundColor: saveLoading ? COLORS.gray : COLORS.primary, 
                  borderRadius: 6, 
                  flexDirection: 'row', 
                  alignItems: 'center' 
                }}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>{editingProject ? 'Update' : 'Create'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Allocation Modal */}
      <Modal visible={allocationModalOpen} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, backgroundColor: COLORS.white, marginTop: 50, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.white }}>
                {editingAllocation ? 'Edit Allocation' : 'Allocate Resource'}
              </Text>
              <TouchableOpacity onPress={() => setAllocationModalOpen(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {/* Division Picker */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Division *</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
                  <Picker
                    selectedValue={allocationForm.division}
                    onValueChange={(value) => setAllocationForm({
                      division: value,
                      projectName: '',
                      projectCode: '',
                      employeeId: '',
                      employeeName: '',
                      employeeIds: []
                    })}
                    style={{ height: 50 }}
                  >
                    <Picker.Item label="Select Division" value="" />
                    {divisions.map(div => (
                      <Picker.Item key={div} label={div} value={div} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Project Picker */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Project *</Text>
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
                  <Picker
                    selectedValue={allocationForm.projectName}
                    onValueChange={(value) => {
                      const project = projects.find(p => p.name === value);
                      setAllocationForm({
                        ...allocationForm,
                        projectName: value,
                        projectCode: project?.code || ''
                      });
                    }}
                    enabled={!!allocationForm.division}
                    style={{ height: 50 }}
                  >
                    <Picker.Item label={!allocationForm.division ? "Select division first" : "Select Project"} value="" />
                    {getFilteredProjectsByDivision().map(project => (
                      <Picker.Item key={project._id} label={`${project.name} (${project.code})`} value={project.name} />
                    ))}
                  </Picker>
                </View>
                {!allocationForm.division && (
                  <Text style={{ fontSize: 12, color: COLORS.gray, marginTop: 4 }}>Please select a division first</Text>
                )}
              </View>

              {/* Employee Picker */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Employee *</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
                    <Picker
                      selectedValue={allocationForm.employeeId}
                      onValueChange={handleEmployeeSelect}
                      enabled={!!allocationForm.division}
                      style={{ height: 50 }}
                    >
                      <Picker.Item label={!allocationForm.division ? "Select division first" : "Select Employee"} value="" />
                      {getFilteredEmployeesByDivision().map(employee => (
                        <Picker.Item
                          key={employee._id}
                          label={`${employee.name} (${employee.employeeId})`}
                          value={employee.employeeId}
                        />
                      ))}
                    </Picker>
                  </View>
                  {!editingAllocation && (
                    <TouchableOpacity
                      onPress={addEmployeeToList}
                      disabled={!allocationForm.employeeId}
                      style={{
                        backgroundColor: allocationForm.employeeId ? COLORS.primary : COLORS.gray,
                        width: 50,
                        borderRadius: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Icon name="add" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Selected Employees */}
              {allocationForm.employeeIds.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.gray, marginBottom: 4 }}>Selected Employees</Text>
                  {allocationForm.employeeIds.map(code => {
                    const employee = employees.find(e => e.employeeId === code);
                    return (
                      <View key={code} style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: COLORS.filterBg,
                        padding: 8,
                        borderRadius: 6,
                        marginBottom: 4,
                      }}>
                        <Text style={{ fontSize: 13, color: COLORS.textPrimary }}>
                          {employee?.name || 'Employee'} ({code})
                        </Text>
                        <TouchableOpacity onPress={() => removeEmployeeFromList(code)}>
                          <Icon name="close" size={18} color={COLORS.red} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: COLORS.border }}>
              <TouchableOpacity
                onPress={() => setAllocationModalOpen(false)}
                style={{ paddingHorizontal: 20, paddingVertical: 10, marginRight: 8, borderWidth: 1, borderColor: COLORS.gray, borderRadius: 6 }}
              >
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleAllocate}
                disabled={saveLoading}
                style={{ 
                  paddingHorizontal: 20, 
                  paddingVertical: 10, 
                  backgroundColor: saveLoading ? COLORS.gray : COLORS.primary, 
                  borderRadius: 6, 
                  flexDirection: 'row', 
                  alignItems: 'center' 
                }}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>{editingAllocation ? 'Update' : 'Allocate'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Modal */}
      <Modal visible={deleteModalOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 20, width: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 }}>Confirm Delete</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 }}>
              Are you sure you want to delete this {deleteItem?.type}? This action cannot be undone.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setDeleteModalOpen(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 }}
              >
                <Text style={{ color: COLORS.gray, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmDelete}
                disabled={saveLoading}
                style={{ backgroundColor: saveLoading ? COLORS.gray : COLORS.red, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4, flexDirection: 'row', alignItems: 'center' }}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModalOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 20, width: '80%' }}>
            <Icon name="check-circle" size={48} color={COLORS.success} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={{ fontSize: 16, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 20 }}>{successMessage}</Text>
            <TouchableOpacity
              onPress={() => setSuccessModalOpen(false)}
              style={{ backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, alignSelf: 'center' }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Message Modal */}
      <Modal visible={messageModalOpen} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, padding: 20, width: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 12 }}>{messageModal.title}</Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 }}>{messageModal.message}</Text>
            <TouchableOpacity
              onPress={() => setMessageModalOpen(false)}
              style={{ backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, alignSelf: 'flex-end' }}
            >
              <Text style={{ color: COLORS.white, fontWeight: '600' }}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Date Pickers */}
      {showStartPicker && (
        <DateTimePicker
          value={projectForm.startDate ? new Date(projectForm.startDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) {
              const formatted = date.toISOString().split('T')[0];
              setProjectForm({ ...projectForm, startDate: formatted });
            }
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={projectForm.endDate ? new Date(projectForm.endDate) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) {
              const formatted = date.toISOString().split('T')[0];
              setProjectForm({ ...projectForm, endDate: formatted });
            }
          }}
        />
      )}
    </SafeAreaView>
  );
};

export default ProjectAllocationScreen;