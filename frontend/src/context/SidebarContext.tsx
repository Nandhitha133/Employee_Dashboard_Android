// src/context/SidebarContext.tsx
import React, { createContext, useContext, useState, useRef, useEffect, useMemo } from 'react';
import { Animated, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Define RootStackParamList
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
  LeaveManagementFolder: undefined;
  PayrollManagementFolder: undefined;
  PerformanceManagementFolder: undefined;
  ExitManagementFolder: undefined;
};

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
  hasDropdown?: boolean;
  children?: Module[];
  order?: number;
}

interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  slideAnim: Animated.Value;
  sidebarModules: Module[];
  userRole: string;
  userPermissions: string[];
  closeSidebar: () => void;
  openSidebar: () => void;
}

// Employee-specific modules list (includes all sub-modules shown in the images)
const employeeModulesList = [
  'Home',
  'My Profile',
  'Timesheet',
  'Timesheet History',
  'Attendance Regularization',
  'Employee Attendance',
  'Performance Management',
  'Self Appraisal',
  'Leave Applications',
  'Policy Portal',
  'Salary Slips',
  'Employee Exit Form',
  'Unified Hub Calendar'
];

// Complete modules list for sidebar
const sidebarModulesData: Module[] = [
  // 1. Home
  { 
    name: 'Home', 
    description: 'Go to dashboard', 
    screen: 'Home', 
    icon: 'home', 
    category: 'Main', 
    allowEmployeeRole: true,
    order: 1
  },
  
  // 2. My Profile
  { 
    name: 'My Profile', 
    description: 'View your profile', 
    screen: 'MyProfile', 
    icon: 'person', 
    iconFamily: 'MaterialIcons', 
    category: 'Main', 
    allowEmployeeRole: true,
    order: 2
  },
  
  // 3. Timesheet with submodules
  {
    name: 'Timesheet',
    description: 'Log work hours',
    screen: 'Timesheet',
    icon: 'assignment',
    iconFamily: 'MaterialIcons',
    category: 'Work & Productivity',
    allowEmployeeRole: true,
    hasDropdown: true,
    order: 3,
    children: [
      { 
        name: 'Timesheet', 
        description: 'Log work hours', 
        screen: 'Timesheet', 
        icon: 'assignment', 
        iconFamily: 'MaterialIcons',
        category: 'Work & Productivity',
        allowEmployeeRole: true 
      },
      { 
        name: 'Timesheet History', 
        description: 'View past timesheets', 
        screen: 'TimesheetHistory', 
        icon: 'assignment', 
        iconFamily: 'MaterialIcons',
        category: 'Work & Productivity',
        allowEmployeeRole: true 
      },
      { 
        name: 'Attendance Regularization', 
        description: 'Regularize attendance', 
        screen: 'AttendanceRegularization', 
        icon: 'access-time', 
        iconFamily: 'MaterialIcons',
        category: 'Work & Productivity',
        allowEmployeeRole: true 
      },
    ],
  },
  
  // 4. Employee Attendance
  { 
    name: 'Employee Attendance', 
    description: 'Attendance tracking', 
    screen: 'EmployeeAttendance', 
    icon: 'access-time', 
    iconFamily: 'MaterialIcons', 
    category: 'Work & Productivity', 
    permission: 'attendance_access', 
    showForRoles: ['admin', 'hr', 'manager'],
    allowEmployeeRole: true,
    order: 4
  },
  
  // 5. Attendance Approval
  { 
    name: 'Attendance Approval', 
    description: 'Review and approve attendance', 
    screen: 'AttendanceApproval', 
    icon: 'check-circle', 
    iconFamily: 'MaterialIcons',
    category: 'Work & Productivity',
    permission: 'attendance_access',
    showForRoles: ['admin', 'hr', 'manager', 'projectmanager'],
    order: 5
  },
  
  // 6. Admin Timesheet with submodules
  {
    name: 'Admin Timesheet',
    description: 'Admin Timesheet Management',
    screen: 'AdminTimesheet',
    icon: 'folder',
    iconFamily: 'MaterialCommunityIcons',
    category: 'Work & Productivity',
    permission: 'admin_timesheet_access',
    showForRoles: ['admin', 'hr', 'manager'],
    hasDropdown: true,
    order: 6,
    children: [
      { 
        name: 'Admin Timesheet', 
        description: 'Review and approve timesheets', 
        screen: 'AdminTimesheet', 
        icon: 'assignment', 
        iconFamily: 'MaterialIcons',
        category: 'Work & Productivity',
        showForRoles: ['admin', 'hr', 'manager'] 
      },
      { 
        name: 'Timesheet Summary', 
        description: 'Overview of submissions', 
        screen: 'TimesheetSummary', 
        icon: 'assessment', 
        iconFamily: 'MaterialIcons',
        category: 'Work & Productivity',
        showForRoles: ['admin', 'hr', 'manager'] 
      },
      { 
        name: 'Special Permission', 
        description: 'Approve special attendance permissions', 
        screen: 'SpecialPermission', 
        icon: 'shield-check', 
        iconFamily: 'MaterialCommunityIcons',
        category: 'Work & Productivity',
        permission: 'special_permission',
        showForRoles: ['admin', 'hr', 'manager', 'projectmanager'] 
      },
    ],
  },
  
  // 7. Project Allocation - NOT visible for employees
  { 
    name: 'Project Allocation', 
    description: 'Assign employees to projects', 
    screen: 'ProjectAllocation', 
    icon: 'assignment-ind', 
    iconFamily: 'MaterialIcons',
    category: 'Work & Productivity', 
    showForRoles: ['admin', 'projectmanager', 'manager'],
    allowEmployeeRole: false,
    order: 7
  },
  
  // 8. Performance Management with submodules
  {
    name: 'Performance Management',
    description: 'Performance Management',
    screen: 'PerformanceManagementFolder',
    icon: 'star-border',
    iconFamily: 'MaterialIcons',
    category: 'Performance Management',
    allowEmployeeRole: true,
    hasDropdown: true,
    order: 8,
    children: [
      { 
        name: 'Self Appraisal', 
        description: 'Submit self appraisal', 
        screen: 'SelfAppraisal', 
        icon: 'star-border', 
        iconFamily: 'MaterialIcons', 
        category: 'Performance Management',
        permission: 'self_appraisal',
        allowEmployeeRole: true 
      },
      { 
        name: 'Team Appraisal', 
        description: 'Review team performance', 
        screen: 'TeamAppraisal', 
        icon: 'groups', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'team_appraisal',
        showForRoles: ['admin', 'hr', 'manager', 'projectmanager'] 
      },
      { 
        name: 'Reviewer Approval', 
        description: 'Approve appraisals', 
        screen: 'ReviewerApproval', 
        icon: 'check-circle', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'reviewer_approval',
        showForRoles: ['admin', 'hr', 'manager', 'projectmanager'] 
      },
      { 
        name: 'Director Approval', 
        description: 'Final approval', 
        screen: 'DirectorApproval', 
        icon: 'verified', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'director_approval',
        showForRoles: ['admin', 'hr', 'manager', 'director'] 
      },
      { 
        name: 'Appraisal Workflow', 
        description: 'Track appraisal status', 
        screen: 'AppraisalWorkflow', 
        icon: 'star-border', 
        iconFamily: 'MaterialIcons', 
        category: 'Performance Management',
        permission: 'appraisal_workflow',
        allowEmployeeRole: true 
      },
      { 
        name: 'Appraisal Master', 
        description: 'Manage employee appraisals', 
        screen: 'AppraisalMaster', 
        icon: 'trending-up', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'appraisal_master',
        showForRoles: ['admin', 'hr'] 
      },
      { 
        name: 'Increment Summary', 
        description: 'View increment summary', 
        screen: 'IncrementSummary', 
        icon: 'summarize', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'increment_summary',
        showForRoles: ['admin', 'hr', 'manager'] 
      },
      { 
        name: 'Attendance Summary', 
        description: 'View attendance summary', 
        screen: 'AttendanceSummary', 
        icon: 'clock-check', 
        iconFamily: 'MaterialCommunityIcons',
        category: 'Performance Management',
        permission: 'attendance_summary',
        showForRoles: ['admin', 'hr', 'manager'] 
      },
    ],
  },
  
  // 9. Leave Management with submodules
  {
    name: 'Leave Management',
    description: 'Leave Management',
    screen: 'LeaveManagementFolder',
    icon: 'folder',
    iconFamily: 'MaterialIcons',
    category: 'Leave Management',
    hasDropdown: true,
    order: 9,
    children: [
      { 
        name: 'Leave Summary', 
        description: 'View leave summary', 
        screen: 'LeaveSummary', 
        icon: 'chart-bar', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Leave Management',
        permission: 'leave_view', 
        showForRoles: ['admin', 'hr', 'manager'] 
      },
      { 
        name: 'Regional Holiday', 
        description: 'View regional holidays', 
        screen: 'RegionalHoliday', 
        icon: 'calendar-star', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Leave Management',
        allowEmployeeRole: true 
      },
      { 
        name: 'Leave Balance', 
        description: 'Check leave balance', 
        screen: 'LeaveBalance', 
        icon: 'wallet', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Leave Management',
        permission: 'leave_view',
        allowEmployeeRole: true 
      },
    ],
  },
  
  // 10. Leave Applications
  { 
    name: 'Leave Applications', 
    description: 'Apply & track leaves', 
    screen: 'LeaveApplications', 
    icon: 'assignment', 
    iconFamily: 'MaterialIcons', 
    category: 'Leave Management', 
    permission: 'leave_access', 
    allowEmployeeRole: true,
    order: 10
  },
  
  // 11. Insurance
  { 
    name: 'Insurance', 
    description: 'Manage health & life insurance', 
    screen: 'Insurance', 
    icon: 'shield', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Company & Resources', 
    permission: 'insurance_access', 
    allowEmployeeRole: true,
    order: 11
  },
  
  // 12. Policy Portal
  { 
    name: 'Policy Portal', 
    description: 'Company rules & documents', 
    screen: 'PolicyPortal', 
    icon: 'file-document', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Company & Resources', 
    allowEmployeeRole: true,
    order: 12
  },
  
  // 13. Salary Slips
  { 
    name: 'Salary Slips', 
    description: 'View payslips', 
    screen: 'SalarySlips', 
    icon: 'assignment', 
    iconFamily: 'MaterialIcons', 
    category: 'Finance & Payroll', 
    allowEmployeeRole: true,
    order: 13
  },
  
  // 14. Payroll Management with submodules
  {
    name: 'Payroll Management',
    description: 'Payroll Management',
    screen: 'PayrollManagementFolder',
    icon: 'folder',
    iconFamily: 'MaterialIcons',
    category: 'Finance & Payroll',
    hasDropdown: true,
    order: 14,
    children: [
      { 
        name: 'Payroll Details', 
        description: 'Manage payroll details', 
        screen: 'PayrollDetails', 
        icon: 'receipt', 
        iconFamily: 'MaterialIcons',
        category: 'Finance & Payroll',
        permission: 'payroll_manage', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Cost to the Company', 
        description: 'View CTC', 
        screen: 'CTC', 
        icon: 'currency-inr', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'payroll_view', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Compensation Master', 
        description: 'Manage employee compensation', 
        screen: 'CompensationMaster', 
        icon: 'cog', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'compensation_master', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Loan Summary', 
        description: 'View loans', 
        screen: 'LoanSummary', 
        icon: 'bank', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'loan_view', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Gratuity Summary', 
        description: 'View gratuity', 
        screen: 'GratuitySummary', 
        icon: 'gift', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'gratuity_view', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Monthly Payroll', 
        description: 'Process monthly payroll', 
        screen: 'MonthlyPayroll', 
        icon: 'calendar-month', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'payroll_access', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Marriage Allowance', 
        description: 'Manage marriage allowance claims', 
        screen: 'MarriageAllowance', 
        icon: 'heart', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'marriage_allowance', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'PF & Gratuity Summary', 
        description: 'View PF and gratuity summary', 
        screen: 'PFGratuitySummary', 
        icon: 'file-document-outline', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'payroll_view', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
    ],
  },
  
  // 15. Expenditure Management
  { 
    name: 'Expenditure Management', 
    description: 'Track company expenses', 
    screen: 'Expenditure', 
    icon: 'cash', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Finance & Payroll', 
    permission: 'expenditure_access', 
    showForRoles: ['admin', 'hr', 'finance'],
    order: 15
  },
  
  // 16. Announcements
  { 
    name: 'Announcements', 
    description: 'Manage company announcements', 
    screen: 'Announcements', 
    icon: 'bullhorn', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Company & Resources', 
    permission: 'announcement_manage', 
    showForRoles: ['admin', 'hr', 'manager'],
    order: 16
  },
  
  // 17. Internships
  { 
    name: 'Internships', 
    description: 'Manage interns & references', 
    screen: 'Internships', 
    icon: 'school', 
    iconFamily: 'MaterialIcons',
    category: 'Company & Resources', 
    permission: 'intern_reference', 
    showForRoles: ['admin', 'hr', 'manager'],
    order: 17
  },
  
  // 18. Resume Repository
  { 
    name: 'Resume Repository', 
    description: 'Central resume repository', 
    screen: 'ResumeRepository', 
    icon: 'file-multiple', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Company & Resources', 
    permission: 'resume_access', 
    showForRoles: ['admin', 'hr'],
    order: 18
  },
  
  // 19. Employee Exit Form
  { 
    name: 'Employee Exit Form', 
    description: 'Submit exit form', 
    screen: 'EmployeeExitForm', 
    icon: 'exit-to-app', 
    iconFamily: 'MaterialIcons', 
    category: 'Company & Resources', 
    permission: 'exit_form_access', 
    allowEmployeeRole: true,
    order: 19
  },
  
  // 20. Exit Management with submodule
  {
    name: 'Exit Management',
    description: 'Exit Management',
    screen: 'ExitManagementFolder',
    icon: 'exit-to-app',
    iconFamily: 'MaterialIcons',
    category: 'Company & Resources',
    hasDropdown: true,
    order: 20,
    children: [
      { 
        name: 'Exit Approval', 
        description: 'Review and approve exit forms', 
        screen: 'ExitApproval', 
        icon: 'check-circle', 
        iconFamily: 'MaterialIcons',
        category: 'Company & Resources', 
        permission: 'exit_approval_access', 
        showForRoles: ['admin', 'hr', 'manager'] 
      },
    ],
  },
  
  // 21. Employee Reward Tracker
  { 
    name: 'Employee Reward Tracker', 
    description: 'Track rewards', 
    screen: 'EmployeeRewardTracker', 
    icon: 'trophy', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Company & Resources', 
    permission: 'reward_access', 
    showForRoles: ['admin', 'hr', 'manager'],
    order: 21
  },
  
  // 22. Holiday Allowance
  { 
    name: 'Holiday Allowance', 
    description: 'Manage holiday working allowances', 
    screen: 'HolidaysAllowance', 
    icon: 'beach', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Finance & Payroll',
    permission: 'holiday_allowance', 
    showForRoles: ['admin', 'hr', 'manager'],
    order: 22
  },
  
  // 23. Employee Management
  { 
    name: 'Employee Management', 
    description: 'View and manage employees', 
    screen: 'EmployeeManagement', 
    icon: 'account-group', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Company & Resources', 
    permission: 'employee_access', 
    showForRoles: ['admin', 'hr'],
    order: 23
  },
  
  // 24. User Access
  { 
    name: 'User Access', 
    description: 'Manage user roles & permissions', 
    screen: 'UserAccess', 
    icon: 'lock', 
    iconFamily: 'MaterialIcons',
    category: 'Company & Resources', 
    permission: 'user_access', 
    showForRoles: ['admin'],
    order: 24
  },
  
  // 25. Team Management
  { 
    name: 'Team Management', 
    description: 'Manage teams', 
    screen: 'TeamManagement', 
    icon: 'account-multiple', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Company & Resources', 
    permission: 'team_access', 
    showForRoles: ['admin', 'manager'],
    order: 25
  },
  
  // 26. Edit In and Out Time
  { 
    name: 'Edit In and Out Time', 
    description: 'Modify attendance timings', 
    screen: 'EditInOutTime', 
    icon: 'clock-edit', 
    iconFamily: 'MaterialCommunityIcons',
    category: 'Work & Productivity',
    permission: 'edit_attendance',
    showForRoles: ['admin', 'hr', 'manager'],
    order: 26
  },
  
  // 27. Unified Hub Calendar
  { 
    name: 'Unified Hub Calendar', 
    description: 'View holidays & celebrations', 
    screen: 'UnifiedHubCalendar', 
    icon: 'calendar-today', 
    iconFamily: 'MaterialIcons',
    category: 'Work & Productivity', 
    permission: 'celebration_view',
    allowEmployeeRole: true,
    order: 27
  },

  // Notifications
  { 
    name: 'Notifications', 
    description: 'View notifications', 
    screen: 'Notifications', 
    icon: 'bell', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Notifications', 
    allowEmployeeRole: true,
    order: 99
  },
];

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const slideAnim = useRef(new Animated.Value(-width));

  useEffect(() => {
    if (isSidebarOpen) {
      loadUser();
    }
  }, [isSidebarOpen]);

  const loadUser = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser(userData);
        let role = userData.role?.toLowerCase() || 'employees';
        if (role === 'project_manager') role = 'projectmanager';
        setUserRole(role);
        setUserPermissions(userData.permissions || []);
      } else {
        // Clear state if no user found
        setUser(null);
        setUserRole('');
        setUserPermissions([]);
      }
    } catch (error) {
      console.error('Error loading user for sidebar:', error);
    }
  };

  // Filter children for dropdown modules
  const filterChildren = (children: Module[] | undefined): Module[] => {
    if (!children) return [];
    
    // Admin sees all children
    if (userRole === 'admin') return children;
    
    // For employees, only show children in the employee modules list
    if (userRole === 'employees' || userRole === 'employee') {
      return children.filter(child => employeeModulesList.includes(child.name));
    }
    
    // For other roles (manager, hr, etc.), use existing logic
    return children.filter(child => {
      // Check showForRoles
      if (child.showForRoles && child.showForRoles.length > 0) {
        if (child.showForRoles.includes(userRole)) {
          return true;
        }
        if (userRole === 'employees' && child.allowEmployeeRole) {
          return true;
        }
        return false;
      }
      
      // Check permission
      if (child.permission && !userPermissions.includes(child.permission)) {
        return false;
      }
      
      return true;
    });
  };

  // Filter modules for sidebar based on user role
  const getFilteredModules = useMemo(() => {
    // Admin sees everything
    if (userRole === 'admin') {
      return sidebarModulesData;
    }
    
    // For employees, filter based on employeeModulesList
    if (userRole === 'employees' || userRole === 'employee') {
      const filtered = sidebarModulesData.filter(module => {
        // Always show Notifications
        if (module.category === 'Notifications') {
          return true;
        }
        
        // Check if module is in employee allowed list (excludes Project Allocation)
        if (employeeModulesList.includes(module.name)) {
          return true;
        }
        
        // For dropdown modules, check if they have any visible children
        if (module.hasDropdown && module.children) {
          const hasVisibleChildren = module.children.some(child => 
            employeeModulesList.includes(child.name)
          );
          return hasVisibleChildren;
        }
        
        return false;
      });
      
      // Process dropdown modules to filter children
      return filtered.map(module => {
        if (module.hasDropdown && module.children) {
          return {
            ...module,
            children: filterChildren(module.children)
          };
        }
        return module;
      });
    }
    
    // For other roles (manager, hr, etc.)
    const filtered = sidebarModulesData.filter(module => {
      // Always show Notifications
      if (module.category === 'Notifications') {
        return true;
      }
      
      // Check showForRoles
      if (module.showForRoles && module.showForRoles.length > 0) {
        if (module.showForRoles.includes(userRole)) {
          return true;
        }
        if (userRole === 'employees' && module.allowEmployeeRole) {
          return true;
        }
        return false;
      }
      
      // Check permission
      if (module.permission && !userPermissions.includes(module.permission)) {
        return false;
      }
      
      return true;
    });
    
    return filtered;
  }, [userRole, userPermissions]);

  const toggleSidebar = () => {
    if (isSidebarOpen) {
      Animated.timing(slideAnim.current, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsSidebarOpen(false));
    } else {
      setIsSidebarOpen(true);
      Animated.timing(slideAnim.current, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const closeSidebar = () => {
    if (isSidebarOpen) {
      Animated.timing(slideAnim.current, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsSidebarOpen(false));
    }
  };

  const openSidebar = () => {
    if (!isSidebarOpen) {
      setIsSidebarOpen(true);
      Animated.timing(slideAnim.current, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        isSidebarOpen,
        toggleSidebar,
        slideAnim: slideAnim.current,
        sidebarModules: getFilteredModules,
        userRole,
        userPermissions,
        closeSidebar,
        openSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};