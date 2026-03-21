// src/utils/modules.ts
import { RootStackParamList } from '../navigation/AppNavigator';

export interface Module {
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

export const modules: Module[] = [
  // 1. Home
  { 
    name: 'Home', 
    description: 'Go to dashboard', 
    screen: 'Dashboard' as any, 
    icon: 'home', 
    category: 'Main', 
    allowEmployeeRole: true,
    order: 1
  },
  
  // 2. My Profile
  { 
    name: 'My Profile', 
    description: 'View your profile', 
    screen: 'MyProfile' as any, 
    icon: 'account-circle', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Main', 
    allowEmployeeRole: true,
    order: 2
  },
  
  // 3. Timesheet with submodules
  {
    name: 'Timesheet',
    description: 'Log work hours',
    screen: 'Timesheet' as any,
    icon: 'clock-outline',
    iconFamily: 'MaterialCommunityIcons',
    category: 'Work & Productivity',
    allowEmployeeRole: true,
    hasDropdown: true,
    order: 3,
    children: [
      { 
        name: 'Timesheet', 
        description: 'Log work hours', 
        screen: 'Timesheet' as any, 
        icon: 'clock-outline', 
        iconFamily: 'MaterialCommunityIcons',
        category: 'Work & Productivity',
        allowEmployeeRole: true 
      },
      { 
        name: 'Timesheet History', 
        description: 'View past timesheets', 
        screen: 'TimesheetHistory' as any, 
        icon: 'history', 
        iconFamily: 'MaterialIcons',
        category: 'Work & Productivity',
        allowEmployeeRole: true 
      },
      { 
        name: 'Attendance Regularization', 
        description: 'Regularize attendance', 
        screen: 'AttendanceRegularization' as any, 
        icon: 'calendar-clock', 
        iconFamily: 'MaterialCommunityIcons',
        category: 'Work & Productivity',
        allowEmployeeRole: true 
      },
    ],
  },
  
  // 4. Employee Attendance
  { 
    name: 'Employee Attendance', 
    description: 'Attendance tracking', 
    screen: 'EmployeeAttendance' as any, 
    icon: 'clock-outline', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Work & Productivity', 
    permission: 'attendance_access', 
    showForRoles: ['admin', 'hr', 'manager'],
    order: 4
  },
  
  // 5. Attendance Approval
  { 
    name: 'Attendance Approval', 
    description: 'Review and approve attendance', 
    screen: 'AttendanceApproval' as any, 
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
    screen: 'AdminTimesheet' as any,
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
        screen: 'AdminTimesheet' as any, 
        icon: 'assignment', 
        iconFamily: 'MaterialIcons',
        category: 'Work & Productivity',
        showForRoles: ['admin', 'hr', 'manager'] 
      },
      { 
        name: 'Timesheet Summary', 
        description: 'Overview of submissions', 
        screen: 'TimesheetSummary' as any, 
        icon: 'assessment', 
        iconFamily: 'MaterialIcons',
        category: 'Work & Productivity',
        showForRoles: ['admin', 'hr', 'manager'] 
      },
      { 
        name: 'Special Permission', 
        description: 'Approve special attendance permissions', 
        screen: 'SpecialPermission' as any, 
        icon: 'shield-check', 
        iconFamily: 'MaterialCommunityIcons',
        category: 'Work & Productivity',
        permission: 'special_permission',
        showForRoles: ['admin', 'hr', 'manager', 'projectmanager'] 
      },
    ],
  },
  
  // 7. Project Allocation
  { 
    name: 'Project Allocation', 
    description: 'Assign employees to projects', 
    screen: 'ProjectAllocation' as any, 
    icon: 'assignment-ind', 
    iconFamily: 'MaterialIcons',
    category: 'Work & Productivity', 
    showForRoles: ['admin', 'projectmanager', 'manager'],
    allowEmployeeRole: true,
    order: 7
  },
  
  // 8. Performance Management with submodules
  {
    name: 'Performance Management',
    description: 'Performance Management',
    screen: 'PerformanceManagementFolder' as any,
    icon: 'star',
    iconFamily: 'MaterialCommunityIcons',
    category: 'Performance Management',
    hasDropdown: true,
    order: 8,
    children: [
      { 
        name: 'Self Appraisal', 
        description: 'Submit self appraisal', 
        screen: 'SelfAppraisal' as any, 
        icon: 'star', 
        iconFamily: 'MaterialCommunityIcons',
        category: 'Performance Management',
        permission: 'self_appraisal',
        allowEmployeeRole: true 
      },
      { 
        name: 'Team Appraisal', 
        description: 'Review team performance', 
        screen: 'TeamAppraisal' as any, 
        icon: 'groups', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'team_appraisal',
        showForRoles: ['admin', 'hr', 'manager', 'projectmanager'] 
      },
      { 
        name: 'Reviewer Approval', 
        description: 'Approve appraisals', 
        screen: 'ReviewerApproval' as any, 
        icon: 'check-circle', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'reviewer_approval',
        showForRoles: ['admin', 'hr', 'manager', 'projectmanager'] 
      },
      { 
        name: 'Director Approval', 
        description: 'Final approval', 
        screen: 'DirectorApproval' as any, 
        icon: 'verified', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'director_approval',
        showForRoles: ['admin', 'hr', 'manager', 'director'] 
      },
      { 
        name: 'Appraisal Workflow', 
        description: 'Track appraisal status', 
        screen: 'AppraisalWorkflow' as any, 
        icon: 'timeline', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'appraisal_workflow',
        allowEmployeeRole: true 
      },
      { 
        name: 'Appraisal Master', 
        description: 'Manage employee appraisals', 
        screen: 'AppraisalMaster' as any, 
        icon: 'trending-up', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'appraisal_master',
        showForRoles: ['admin', 'hr'] 
      },
      { 
        name: 'Increment Summary', 
        description: 'View increment summary', 
        screen: 'IncrementSummary' as any, 
        icon: 'summarize', 
        iconFamily: 'MaterialIcons',
        category: 'Performance Management',
        permission: 'increment_summary',
        showForRoles: ['admin', 'hr', 'manager'] 
      },
      { 
        name: 'Attendance Summary', 
        description: 'View attendance summary', 
        screen: 'AttendanceSummary' as any, 
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
    screen: 'LeaveManagementFolder' as any,
    icon: 'folder',
    iconFamily: 'MaterialIcons',
    category: 'Leave Management',
    hasDropdown: true,
    order: 9,
    children: [
      { 
        name: 'Leave Summary', 
        description: 'View leave summary', 
        screen: 'LeaveSummary' as any, 
        icon: 'chart-bar', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Leave Management',
        permission: 'leave_view', 
        showForRoles: ['admin', 'hr', 'manager'] 
      },
      { 
        name: 'Regional Holiday', 
        description: 'View regional holidays', 
        screen: 'RegionalHoliday' as any, 
        icon: 'calendar-star', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Leave Management',
        allowEmployeeRole: true 
      },
      { 
        name: 'Leave Balance', 
        description: 'Check leave balance', 
        screen: 'LeaveBalance' as any, 
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
    screen: 'LeaveApplications' as any, 
    icon: 'calendar-check', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Leave Management', 
    permission: 'leave_access', 
    allowEmployeeRole: true,
    order: 10
  },
  
  // 11. Insurance
  { 
    name: 'Insurance', 
    description: 'Manage health & life insurance', 
    screen: 'Insurance' as any, 
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
    screen: 'PolicyPortal' as any, 
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
    screen: 'SalarySlips' as any, 
    icon: 'file-document-outline', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Finance & Payroll', 
    allowEmployeeRole: true,
    order: 13
  },
  
  // 14. Payroll Management with submodules
  {
    name: 'Payroll Management',
    description: 'Payroll Management',
    screen: 'PayrollManagementFolder' as any,
    icon: 'folder',
    iconFamily: 'MaterialIcons',
    category: 'Finance & Payroll',
    hasDropdown: true,
    order: 14,
    children: [
      { 
        name: 'Payroll Details', 
        description: 'Manage payroll details', 
        screen: 'PayrollDetails' as any, 
        icon: 'receipt', 
        iconFamily: 'MaterialIcons',
        category: 'Finance & Payroll',
        permission: 'payroll_manage', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Cost to the Company', 
        description: 'View CTC', 
        screen: 'CTC' as any, 
        icon: 'currency-inr', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'payroll_view', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Compensation Master', 
        description: 'Manage employee compensation', 
        screen: 'CompensationMaster' as any, 
        icon: 'cog', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'compensation_master', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Loan Summary', 
        description: 'View loans', 
        screen: 'LoanSummary' as any, 
        icon: 'bank', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'loan_view', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Gratuity Summary', 
        description: 'View gratuity', 
        screen: 'GratuitySummary' as any, 
        icon: 'gift', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'gratuity_view', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Monthly Payroll', 
        description: 'Process monthly payroll', 
        screen: 'MonthlyPayroll' as any, 
        icon: 'calendar-month', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'payroll_access', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'Marriage Allowance', 
        description: 'Manage marriage allowance claims', 
        screen: 'MarriageAllowance' as any, 
        icon: 'heart', 
        iconFamily: 'MaterialCommunityIcons', 
        category: 'Finance & Payroll',
        permission: 'marriage_allowance', 
        showForRoles: ['admin', 'hr', 'finance'] 
      },
      { 
        name: 'PF & Gratuity Summary', 
        description: 'View PF and gratuity summary', 
        screen: 'PFGratuitySummary' as any, 
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
    screen: 'Expenditure' as any, 
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
    screen: 'Announcements' as any, 
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
    screen: 'Internships' as any, 
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
    screen: 'ResumeRepository' as any, 
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
    screen: 'EmployeeExitForm' as any, 
    icon: 'exit-run', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Company & Resources', 
    permission: 'exit_form_access', 
    allowEmployeeRole: true,
    order: 19
  },
  
  // 20. Exit Management with submodule
  {
    name: 'Exit Management',
    description: 'Exit Management',
    screen: 'ExitManagementFolder' as any,
    icon: 'exit-to-app',
    iconFamily: 'MaterialIcons',
    category: 'Company & Resources',
    hasDropdown: true,
    order: 20,
    children: [
      { 
        name: 'Exit Approval', 
        description: 'Review and approve exit forms', 
        screen: 'ExitApproval' as any, 
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
    screen: 'EmployeeRewardTracker' as any, 
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
    screen: 'HolidaysAllowance' as any, 
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
    screen: 'EmployeeManagement' as any, 
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
    screen: 'UserAccess' as any, 
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
    screen: 'TeamManagement' as any, 
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
    screen: 'EditInOutTime' as any, 
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
    screen: 'UnifiedHubCalendar' as any, 
    icon: 'calendar', 
    iconFamily: 'MaterialCommunityIcons',
    category: 'Work & Productivity', 
    permission: 'celebration_view',
    allowEmployeeRole: true,
    order: 27
  },

  // Notifications
  { 
    name: 'Notifications', 
    description: 'View notifications', 
    screen: 'Notifications' as any, 
    icon: 'bell', 
    iconFamily: 'MaterialCommunityIcons', 
    category: 'Notifications', 
    allowEmployeeRole: true,
    order: 99
  },
];

export const filterModules = (items: Module[], role: string, permissions: string[]): Module[] => {
  const normalizedRole = role.toLowerCase();
  
  if (normalizedRole === 'admin') return items;

  return items.filter(item => {
    if (item.category === 'Main' || item.category === 'Notifications') return true;

    if (item.showForRoles && item.showForRoles.length > 0) {
      if (item.showForRoles.includes(normalizedRole)) return true;
      if (normalizedRole === 'employees' && item.allowEmployeeRole) return true;
      return false;
    }

    if (item.permission && !permissions.includes(item.permission)) return false;

    if (normalizedRole === 'employees') return item.allowEmployeeRole === true;

    return true;
  });
};

export const filterChildren = (children: Module[] | undefined, role: string, permissions: string[]): Module[] => {
  if (!children) return [];
  const normalizedRole = role.toLowerCase();
  
  return children.filter(child => {
    if (normalizedRole === 'admin') return true;
    if (child.showForRoles && !child.showForRoles.includes(normalizedRole)) return false;
    if (child.permission && !permissions.includes(child.permission)) return false;
    if (normalizedRole === 'employees' && !child.allowEmployeeRole) return false;
    return true;
  });
};
