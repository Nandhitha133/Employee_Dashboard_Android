// screens/DashboardScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  Dimensions,
  Modal,
  Alert,
  Animated,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommonFooter from '../components/CommonFooter';
import { useSidebar } from '../context/SidebarContext';

const { width } = Dimensions.get('window');

// Define RootStackParamList with all screen names
type RootStackParamList = {
  Login: undefined;
  Dashboard: { user: User };
  MyProfile: { user: User };
  ProjectAllocation: undefined;
  Insurance: undefined;
  PolicyPortal: undefined;
  Announcements: undefined;
  Internships: undefined;
  EmployeeManagement: undefined;
  UserAccess: undefined;
  TeamManagement: undefined;
  Notifications: undefined;
  Timesheet: undefined;
  TimesheetHistory: undefined;
  AttendanceRegularization: undefined;
  EmployeeAttendance: undefined;
  AttendanceApproval: undefined;
  AdminTimesheet: undefined;
  TimesheetSummary: undefined;
  EditInOutTime: undefined;
  SpecialPermission: undefined;
  LeaveApplications: undefined;
  LeaveSummary: undefined;
  LeaveBalance: undefined;
  SalarySlips: undefined;
  PayrollDetails: undefined;
  CTC: undefined;
  LoanSummary: undefined;
  GratuitySummary: undefined;
  MonthlyPayroll: undefined;
  CompensationMaster: undefined;
  MarriageAllowance: undefined;
  HolidaysAllowance: undefined;
  Expenditure: undefined;
  SelfAppraisal: undefined;
  TeamAppraisal: undefined;
  ReviewerApproval: undefined;
  DirectorApproval: undefined;
  AppraisalWorkflow: undefined;
  AppraisalMaster: undefined;
  IncrementMaster: undefined;
  IncrementSummary: undefined;
  AttendanceSummary: undefined;
  EmployeeRewardTracker: undefined;
  EmployeeExitForm: undefined;
  ExitApproval: undefined;
  ResumeRepository: undefined;
  UnifiedHubCalendar: undefined;
  BankOfResumes: undefined;
  Home: undefined;
  RegionalHoliday: undefined;
  PFGratuitySummary: undefined;
  // Folder screens
  LeaveManagementFolder: undefined;
  PayrollManagementFolder: undefined;
  PerformanceManagementFolder: undefined;
  ExitManagementFolder: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Colors
const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  accent: '#4A148C',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#CCCCCC',
  error: '#FF4444',
  success: '#00C851',
  warning: '#FFA000',
  info: '#2196F3'
};

// User interface
interface User {
  name: string;
  role: string;
  employeeId: string;
  designation: string;
  location: string;
  division?: string;
  email: string;
  phone: string;
  permissions?: string[];
}

// Module interface
interface Module {
  name: string;
  description: string;
  screen: keyof RootStackParamList;
  icon: string;
  iconFamily?: 'MaterialIcons' | 'MaterialCommunityIcons';
  category: string;
  badge?: number;
  permission?: string;
  showForRoles?: string[];
  allowEmployeeRole?: boolean;
  order?: number;
}

// Category Images
const categoryImages: Record<string, string> = {
  'Work & Productivity': 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=1000',
  'Leave Management': 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&q=80&w=1000',
  'Finance & Payroll': 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1000',
  'Company & Resources': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000',
  'Performance Management': 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=1000',
  'default': 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000'
};

const DashboardScreen = () => {
  const navigation = useNavigation() as NavigationProp;
  const route = useRoute();
  const routeParams = route.params as { user: User } | undefined;
  
  const [currentTime, setCurrentTime] = useState('');
  const [greeting, setGreeting] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const { isSidebarOpen: sidebarVisible, toggleSidebar } = useSidebar();
  
  // Get user from route params
  const user: User | undefined = routeParams?.user;

  // Normalize role
  let role = user?.role?.toLowerCase() || 'employees';
  if (role === 'project_manager') role = 'projectmanager';
  
  const permissions = user?.permissions || [];

  // Update time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const ampm = hours >= 12 ? 'pm' : 'am';
      const formattedHours = hours % 12 || 12;
      const formattedTime = `${formattedHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
      setCurrentTime(formattedTime);
      
      if (hours < 12) setGreeting('Good Morning');
      else if (hours < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setProfile(user || null);
      setAnnouncements([]);
    } catch (error) {
      console.error("Error fetching dashboard stats", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardStats();
    setRefreshing(false);
  };

  // Complete modules list with all sub-modules flattened - matching the image
  const modules: Module[] = [
    // ========== Work & Productivity ==========
    { name: 'Timesheet', description: 'Log work hours', screen: 'Timesheet', icon: 'clock-outline', iconFamily: 'MaterialCommunityIcons', category: 'Work & Productivity', allowEmployeeRole: true, order: 1 },
    { name: 'Timesheet History', description: 'View past timesheets', screen: 'TimesheetHistory', icon: 'history', iconFamily: 'MaterialIcons', category: 'Work & Productivity', allowEmployeeRole: true, order: 2 },
    { name: 'Attendance Regularization', description: 'Regularize attendance', screen: 'AttendanceRegularization', icon: 'calendar-clock', iconFamily: 'MaterialCommunityIcons', category: 'Work & Productivity', allowEmployeeRole: true, order: 3 },
    { name: 'Employee Attendance', description: 'Attendance tracking', screen: 'EmployeeAttendance', icon: 'clock-outline', iconFamily: 'MaterialCommunityIcons', category: 'Work & Productivity', permission: 'attendance_access', showForRoles: ['admin', 'hr', 'manager'], allowEmployeeRole: true, order: 4 },
    { name: 'Admin Timesheet', description: 'Review and approve timesheets', screen: 'AdminTimesheet', icon: 'assignment', iconFamily: 'MaterialIcons', category: 'Work & Productivity', permission: 'admin_timesheet_access', showForRoles: ['admin', 'hr', 'manager'], order: 5 },
    { name: 'Timesheet Summary', description: 'Overview of submissions', screen: 'TimesheetSummary', icon: 'assessment', iconFamily: 'MaterialIcons', category: 'Work & Productivity', permission: 'admin_timesheet_access', showForRoles: ['admin', 'hr', 'manager'], order: 6 },
    { name: 'Edit In and Out Time', description: 'Modify attendance timings', screen: 'EditInOutTime', icon: 'clock-edit', iconFamily: 'MaterialCommunityIcons', category: 'Work & Productivity', permission: 'edit_attendance', showForRoles: ['admin', 'hr', 'manager'], order: 7 },
    { name: 'Special Permission', description: 'Approve special attendance permissions', screen: 'SpecialPermission', icon: 'shield-check', iconFamily: 'MaterialCommunityIcons', category: 'Work & Productivity', permission: 'special_permission', showForRoles: ['admin', 'hr', 'manager', 'projectmanager'], order: 8 },
    { name: 'Attendance Approval', description: 'Review and approve attendance', screen: 'AttendanceApproval', icon: 'check-circle', iconFamily: 'MaterialIcons', category: 'Work & Productivity', permission: 'attendance_access', showForRoles: ['admin', 'hr', 'manager', 'projectmanager'], order: 9 },
    { name: 'Project Allocation', description: 'Assign employees to projects', screen: 'ProjectAllocation', icon: 'assignment-ind', iconFamily: 'MaterialIcons', category: 'Work & Productivity', showForRoles: ['admin', 'projectmanager', 'manager'], allowEmployeeRole: false, order: 10 },
    { name: 'Unified Hub Calendar', description: 'View holidays & celebrations', screen: 'UnifiedHubCalendar', icon: 'calendar', iconFamily: 'MaterialCommunityIcons', category: 'Work & Productivity', permission: 'celebration_view', allowEmployeeRole: true, order: 11 },
    
    // ========== Leave Management ==========
    { name: 'Leave Summary', description: 'View leave summary', screen: 'LeaveSummary', icon: 'chart-bar', iconFamily: 'MaterialCommunityIcons', category: 'Leave Management', permission: 'leave_view', showForRoles: ['admin', 'hr', 'manager'], order: 12 },
    { name: 'Leave Balance', description: 'Check leave balance', screen: 'LeaveBalance', icon: 'wallet', iconFamily: 'MaterialCommunityIcons', category: 'Leave Management', permission: 'leave_view', allowEmployeeRole: true, order: 13 },
    { name: 'Leave Applications', description: 'Apply & track leaves', screen: 'LeaveApplications', icon: 'calendar-check', iconFamily: 'MaterialCommunityIcons', category: 'Leave Management', permission: 'leave_access', allowEmployeeRole: true, order: 14 },
    { name: 'Regional Holiday', description: 'View regional holidays', screen: 'RegionalHoliday', icon: 'calendar-star', iconFamily: 'MaterialCommunityIcons', category: 'Leave Management', allowEmployeeRole: true, order: 15 },
    
    // ========== Company & Resources ==========
    { name: 'Insurance', description: 'Manage health & life insurance', screen: 'Insurance', icon: 'shield', iconFamily: 'MaterialCommunityIcons', category: 'Company & Resources', permission: 'insurance_access', allowEmployeeRole: true, order: 16 },
    { name: 'Policy Portal', description: 'Company rules & documents', screen: 'PolicyPortal', icon: 'file-document', iconFamily: 'MaterialCommunityIcons', category: 'Company & Resources', allowEmployeeRole: true, order: 17 },
    { name: 'Resume Repository', description: 'Central resume repository', screen: 'ResumeRepository', icon: 'file-multiple', iconFamily: 'MaterialCommunityIcons', category: 'Company & Resources', permission: 'resume_access', showForRoles: ['admin', 'hr'], order: 18 },
    { name: 'Exit Form', description: 'Submit exit form', screen: 'EmployeeExitForm', icon: 'exit-run', iconFamily: 'MaterialCommunityIcons', category: 'Company & Resources', permission: 'exit_form_access', allowEmployeeRole: true, order: 19 },
    { name: 'Exit Approval', description: 'Review and approve exit forms', screen: 'ExitApproval', icon: 'check-circle', iconFamily: 'MaterialIcons', category: 'Company & Resources', permission: 'exit_approval_access', showForRoles: ['admin', 'hr', 'manager'], order: 20 },
    { name: 'Employee Reward Tracker', description: 'Track rewards', screen: 'EmployeeRewardTracker', icon: 'trophy', iconFamily: 'MaterialCommunityIcons', category: 'Company & Resources', permission: 'reward_access', showForRoles: ['admin', 'hr', 'manager'], order: 21 },
    { name: 'Employee Management', description: 'View and manage employees', screen: 'EmployeeManagement', icon: 'account-group', iconFamily: 'MaterialCommunityIcons', category: 'Company & Resources', permission: 'employee_access', showForRoles: ['admin', 'hr'], order: 22 },
    { name: 'User Access', description: 'Manage user roles & permissions', screen: 'UserAccess', icon: 'lock', iconFamily: 'MaterialIcons', category: 'Company & Resources', permission: 'user_access', showForRoles: ['admin'], order: 23 },
    { name: 'Team Management', description: 'Manage teams', screen: 'TeamManagement', icon: 'account-multiple', iconFamily: 'MaterialCommunityIcons', category: 'Company & Resources', permission: 'team_access', showForRoles: ['admin', 'manager'], order: 24 },
    { name: 'Internships', description: 'Manage interns & references', screen: 'Internships', icon: 'school', iconFamily: 'MaterialIcons', category: 'Company & Resources', permission: 'intern_reference', showForRoles: ['admin', 'hr', 'manager'], order: 25 },
    { name: 'Announcements', description: 'Manage company announcements', screen: 'Announcements', icon: 'bullhorn', iconFamily: 'MaterialCommunityIcons', category: 'Company & Resources', permission: 'announcement_manage', showForRoles: ['admin', 'hr', 'manager'], order: 26 },
    
    // ========== Finance & Payroll ==========
    { name: 'Salary Slips', description: 'View payslips', screen: 'SalarySlips', icon: 'file-document-outline', iconFamily: 'MaterialCommunityIcons', category: 'Finance & Payroll', allowEmployeeRole: true, order: 27 },
    { name: 'Payroll Details', description: 'Manage payroll details', screen: 'PayrollDetails', icon: 'receipt', iconFamily: 'MaterialIcons', category: 'Finance & Payroll', permission: 'payroll_manage', showForRoles: ['admin', 'hr', 'finance'], order: 28 },
    { name: 'Compensation Master', description: 'Manage employee compensation', screen: 'CompensationMaster', icon: 'cog', iconFamily: 'MaterialCommunityIcons', category: 'Finance & Payroll', permission: 'compensation_master', showForRoles: ['admin', 'hr', 'finance'], order: 29 },
    { name: 'Cost to the Company', description: 'View CTC', screen: 'CTC', icon: 'currency-inr', iconFamily: 'MaterialCommunityIcons', category: 'Finance & Payroll', permission: 'payroll_view', showForRoles: ['admin', 'hr', 'finance'], order: 30 },
    { name: 'Loan Summary', description: 'View loans', screen: 'LoanSummary', icon: 'bank', iconFamily: 'MaterialCommunityIcons', category: 'Finance & Payroll', permission: 'loan_view', showForRoles: ['admin', 'hr', 'finance'], order: 31 },
    { name: 'Gratuity Summary', description: 'View gratuity', screen: 'GratuitySummary', icon: 'gift', iconFamily: 'MaterialCommunityIcons', category: 'Finance & Payroll', permission: 'gratuity_view', showForRoles: ['admin', 'hr', 'finance'], order: 32 },
    { name: 'Monthly Payroll', description: 'Process monthly payroll', screen: 'MonthlyPayroll', icon: 'calendar-month', iconFamily: 'MaterialCommunityIcons', category: 'Finance & Payroll', permission: 'payroll_access', showForRoles: ['admin', 'hr', 'finance'], order: 33 },
    { name: 'Marriage Allowance', description: 'Manage marriage allowance claims', screen: 'MarriageAllowance', icon: 'heart', iconFamily: 'MaterialCommunityIcons', category: 'Finance & Payroll', permission: 'marriage_allowance', showForRoles: ['admin', 'hr', 'finance'], order: 34 },
    { name: 'Holiday Allowance', description: 'Manage holiday working allowances', screen: 'HolidaysAllowance', icon: 'beach', iconFamily: 'MaterialCommunityIcons', category: 'Finance & Payroll', permission: 'holiday_allowance', showForRoles: ['admin', 'hr', 'manager'], order: 35 },
    { name: 'Expenditure Management', description: 'Track company expenses', screen: 'Expenditure', icon: 'cash', iconFamily: 'MaterialCommunityIcons', category: 'Finance & Payroll', permission: 'expenditure_access', showForRoles: ['admin', 'hr', 'finance'], order: 36 },
    { name: 'PF & Gratuity Summary', description: 'View PF and gratuity summary', screen: 'PFGratuitySummary', icon: 'file-document-outline', iconFamily: 'MaterialCommunityIcons', category: 'Finance & Payroll', permission: 'payroll_view', showForRoles: ['admin', 'hr', 'finance'], order: 37 },
    
    // ========== Performance Management ==========
    { name: 'Self Appraisal', description: 'Submit self appraisal', screen: 'SelfAppraisal', icon: 'star', iconFamily: 'MaterialCommunityIcons', category: 'Performance Management', permission: 'self_appraisal', allowEmployeeRole: true, order: 38 },
    { name: 'Team Appraisal', description: 'Review team performance', screen: 'TeamAppraisal', icon: 'groups', iconFamily: 'MaterialIcons', category: 'Performance Management', permission: 'team_appraisal', showForRoles: ['admin', 'hr', 'manager', 'projectmanager'], order: 39 },
    { name: 'Reviewer Approval', description: 'Approve appraisals', screen: 'ReviewerApproval', icon: 'check-circle', iconFamily: 'MaterialIcons', category: 'Performance Management', permission: 'reviewer_approval', showForRoles: ['admin', 'hr', 'manager', 'projectmanager'], order: 40 },
    { name: 'Director Approval', description: 'Final approval', screen: 'DirectorApproval', icon: 'verified', iconFamily: 'MaterialIcons', category: 'Performance Management', permission: 'director_approval', showForRoles: ['admin', 'hr', 'manager', 'director'], order: 41 },
    { name: 'Appraisal Workflow', description: 'Track appraisal status', screen: 'AppraisalWorkflow', icon: 'timeline', iconFamily: 'MaterialIcons', category: 'Performance Management', permission: 'appraisal_workflow', allowEmployeeRole: true, order: 42 },
    { name: 'Appraisal Master', description: 'Manage employee appraisals', screen: 'AppraisalMaster', icon: 'trending-up', iconFamily: 'MaterialIcons', category: 'Performance Management', permission: 'appraisal_master', showForRoles: ['admin', 'hr'], order: 43 },
    { name: 'Increment Summary', description: 'View increment summary', screen: 'IncrementSummary', icon: 'summarize', iconFamily: 'MaterialIcons', category: 'Performance Management', permission: 'increment_summary', showForRoles: ['admin', 'hr', 'manager'], order: 44 },
    { name: 'Attendance Summary', description: 'View attendance summary', screen: 'AttendanceSummary', icon: 'clock-check', iconFamily: 'MaterialCommunityIcons', category: 'Performance Management', permission: 'attendance_summary', showForRoles: ['admin', 'hr', 'manager'], order: 45 },
    
    // ========== Main ==========
    { name: 'Home', description: 'Go to dashboard', screen: 'Home', icon: 'home', category: 'Main', allowEmployeeRole: true, order: 46 },
    { name: 'My Profile', description: 'View your profile', screen: 'MyProfile', icon: 'account-circle', iconFamily: 'MaterialCommunityIcons', category: 'Main', allowEmployeeRole: true, order: 47 },
    { name: 'Notifications', description: 'View notifications', screen: 'Notifications', icon: 'bell', iconFamily: 'MaterialCommunityIcons', category: 'Notifications', allowEmployeeRole: true, order: 48 },
  ];

  // Filter modules based on user role and permissions
  const getVisibleModules = useMemo(() => {
    let filtered = modules.filter(module => {
      // Admin sees everything
      if (role === 'admin') return true;
      
      // Skip Main and Notifications for main content
      if (module.category === 'Main' || module.category === 'Notifications') return false;
      
      // Check showForRoles
      if (module.showForRoles && module.showForRoles.length > 0) {
        if (module.showForRoles.includes(role)) return true;
        if (role === 'employees' && module.allowEmployeeRole) return true;
        return false;
      }
      
      // Check permission
      if (module.permission && !permissions.includes(module.permission)) return false;
      
      // For employees, check allowEmployeeRole
      if (role === 'employees' && module.allowEmployeeRole !== true) return false;
      
      return true;
    });
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(term) || 
        m.description.toLowerCase().includes(term) ||
        m.category.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [role, permissions, searchTerm]);

  // Group modules by category
  const groupedModules = useMemo(() => {
    return getVisibleModules.reduce((acc: { [key: string]: Module[] }, module: Module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {});
  }, [getVisibleModules]);

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev: any) => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Handle module press
  const handleModulePress = (module: Module) => {
    if (module.screen === 'MyProfile') {
      navigation.navigate('MyProfile', { user: profile || user as User });
    } else if (module.screen === 'Home') {
      // Already on home
    } else {
      navigation.navigate(module.screen as any);
    }
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            try {
              // Clear essential auth data
              await AsyncStorage.multiRemove(['token', 'user']);
              
              // Reset navigation to Login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' as any }],
              });
            } catch (error) {
              console.error('Error during logout:', error);
              // Fallback navigation
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' as any }],
              });
            }
          } 
        }
      ]
    );
  };

  // Category Card Component
  const CategoryCard = ({ category, modules }: { category: string; modules: Module[] }) => {
    const isExpanded = (expandedCategories as any)[category] || false;
    const displayModules = isExpanded ? modules : modules.slice(0, 4);
    const imageUrl = categoryImages[category] || categoryImages.default;

    return (
      <View style={styles.categoryCard}>
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => toggleCategory(category)}
          style={styles.categoryImageContainer}
        >
          <Image 
            source={{ uri: imageUrl }}
            style={styles.categoryImage}
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.categoryGradient}
          />
          <View style={styles.categoryTitleContainer}>
            <Text style={styles.categoryTitle}>{category}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.modulesContainer}>
          {displayModules.map((module: Module, index: number) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleModulePress(module)}
              style={[
                styles.moduleItem,
                index < displayModules.length - 1 && styles.moduleItemBorder
              ]}
            >
              <View style={styles.moduleIconContainer}>
                {module.iconFamily === 'MaterialCommunityIcons' ? (
                  <IconCommunity name={module.icon} size={20} color="#4B5563" />
                ) : (
                  <Icon name={module.icon} size={20} color="#4B5563" />
                )}
              </View>
              <Text style={styles.moduleName}>{module.name}</Text>
              {module.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{module.badge}</Text>
                </View>
              )}
              <Icon name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
          
          {modules.length > 4 && (
            <TouchableOpacity 
              onPress={() => toggleCategory(category)}
              style={styles.showMoreButton}
            >
              <Text style={styles.showMoreText}>
                {isExpanded ? 'Show less' : `+ ${modules.length - 4} more items`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const categories = Object.keys(groupedModules);

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
              <Icon name="menu" size={28} color={COLORS.white} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTime}>{currentTime}</Text>
              <Text style={styles.headerGreeting}>{greeting}, {user.name?.split(' ')[0] || 'Employee'}!</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.headerIcon}>
              <Icon name="account-circle" size={28} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Notifications')} 
              style={styles.headerIcon}
            >
              <View>
                <Icon name="notifications" size={24} color={COLORS.white} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>{announcements.length || 0}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color={COLORS.white} style={styles.searchIcon} />
          <TextInput
            placeholder="Search for tools, forms, or policies..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={styles.searchInput}
            maxLength={30}
          />
          {searchTerm !== '' && (
            <TouchableOpacity onPress={() => setSearchTerm('')}>
              <Icon name="close" size={20} color={COLORS.white} style={styles.searchIcon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        showsVerticalScrollIndicator={false}
        style={styles.mainContent}
        contentContainerStyle={styles.mainContentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {searchTerm ? (
          // Search Results
          <View style={styles.searchResultsContainer}>
            <View style={styles.searchResultsHeader}>
              <Icon name="search" size={20} color="#3B82F6" />
              <Text style={styles.searchResultsTitle}>Search Results</Text>
            </View>
            
            {getVisibleModules.length > 0 ? (
              getVisibleModules.map((module: Module, idx: number) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleModulePress(module)}
                  style={styles.searchResultItem}
                >
                  <View style={styles.searchResultIconContainer}>
                    {module.iconFamily === 'MaterialCommunityIcons' ? (
                      <IconCommunity name={module.icon} size={22} color="#3B82F6" />
                    ) : (
                      <Icon name={module.icon} size={22} color="#3B82F6" />
                    )}
                  </View>
                  <View style={styles.searchResultTextContainer}>
                    <Text style={styles.searchResultName}>{module.name}</Text>
                    <Text style={styles.searchResultDescription}>{module.description}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noResultsContainer}>
                <Icon name="search-off" size={48} color="#9CA3AF" />
                <Text style={styles.noResultsText}>No modules found</Text>
              </View>
            )}
          </View>
        ) : (
          // Categories View
          <View>
            {categories.map((category: string) => (
              <CategoryCard 
                key={category} 
                category={category} 
                modules={groupedModules[category]} 
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Fixed Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Dashboard • Employee Portal • "
      />

      {/* Profile Modal */}
      <Modal
        visible={showProfileModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProfileModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>My Profile</Text>
              <TouchableOpacity onPress={() => setShowProfileModal(false)}>
                <Icon name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.profileAvatarContainer}>
              <View style={styles.modalProfileAvatar}>
                <Text style={styles.modalProfileAvatarText}>{user.name.charAt(0)}</Text>
              </View>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileDesignation}>{user.designation}</Text>
            </View>

            <View style={styles.profileDetailsContainer}>
              <View style={styles.profileDetailItem}>
                <Text style={styles.profileDetailLabel}>Employee ID</Text>
                <Text style={styles.profileDetailValue}>{user.employeeId || 'N/A'}</Text>
              </View>
              <View style={styles.profileDetailItem}>
                <Text style={styles.profileDetailLabel}>Division</Text>
                <Text style={styles.profileDetailValue}>{user.division || 'N/A'}</Text>
              </View>
              <View style={styles.profileDetailItem}>
                <Text style={styles.profileDetailLabel}>Email</Text>
                <Text style={styles.profileDetailValue}>{user.email || 'N/A'}</Text>
              </View>
              <View style={styles.profileDetailItem}>
                <Text style={styles.profileDetailLabel}>Phone</Text>
                <Text style={styles.profileDetailValue}>{user.phone || 'N/A'}</Text>
              </View>
              <View style={styles.profileDetailItem}>
                <Text style={styles.profileDetailLabel}>Location</Text>
                <Text style={styles.profileDetailValue}>{user.location || 'N/A'}</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => {
                setShowProfileModal(false);
                navigation.navigate('MyProfile', { user });
              }}
              style={styles.viewFullProfileButton}
            >
              <Text style={styles.viewFullProfileText}>View Full Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleLogout}
              style={styles.modalLogoutButton}
            >
              <Text style={styles.modalLogoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginRight: 12,
  },
  headerTime: {
    color: COLORS.white,
    fontSize: 14,
    opacity: 0.9,
  },
  headerGreeting: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 16,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchIcon: {
    opacity: 0.7,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: COLORS.white,
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
  },
  mainContentContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  categoryCard: {
    marginBottom: 20,
  },
  categoryImageContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryImage: {
    width: '100%',
    height: 200,
  },
  categoryGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  categoryTitleContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
  },
  categoryTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modulesContainer: {
    marginTop: 12,
    paddingHorizontal: 8,
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  moduleItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  moduleIconContainer: {
    width: 32,
    alignItems: 'center',
  },
  moduleName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '500',
  },
  searchResultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 8,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
  },
  searchResultIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchResultTextContainer: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchResultDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noResultsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  profileAvatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalProfileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalProfileAvatarText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  profileDesignation: {
    fontSize: 14,
    color: '#6B7280',
  },
  profileDetailsContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  profileDetailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  profileDetailLabel: {
    color: '#6B7280',
  },
  profileDetailValue: {
    color: '#1F2937',
    fontWeight: '500',
  },
  viewFullProfileButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  viewFullProfileText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  modalLogoutButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  modalLogoutText: {
    color: '#EF4444',
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default DashboardScreen;