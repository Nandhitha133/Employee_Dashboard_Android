// src/navigation/AppNavigator.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/Login';
import DashboardScreen from '../screens/DashboardScreen';
import MyProfileScreen from '../screens/MyProfileScreen';
import ProjectAllocationScreen from '../screens/ProjectAllocationScreen';
import TimesheetScreen from '../screens/Timesheet/TimesheetScreen';
import LeaveApplicationsScreen from '../screens/LeaveApplications/LeaveApplicationsScreen';
import SalarySlipsScreen from '../screens/SalarySlips/SalarySlipsScreen';
import InsuranceScreen from '../screens/InsuranceScreen';
import PolicyPortalScreen from '../screens/PolicyPortalScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import TimesheetHistoryScreen from '../screens/Timesheet/TimesheetHistoryScreen';
import AttendanceRegularizationScreen from '../screens/Timesheet/AttendanceRegularizationScreen';
import EmployeeAttendanceScreen from '../screens/EmployeeAttendanceScreen';
import AttendanceApprovalScreen from '../screens/AttendanceApprovalScreen';
import AdminTimesheetScreen from '../screens/AdminTimesheet/AdminTimesheetScreen';
import TimesheetSummaryScreen from '../screens/AdminTimesheet/TimesheetSummaryScreen';
import SelfAppraisal from '../screens/Performance/SelfAppraisal';
import TeamAppraisal from '../screens/Performance/TeamAppraisal';
import ReviewerApprovalScreen from '../screens/Performance/ReviewerApprovalScreen';
import DirectorApprovalScreen from '../screens/Performance/DirectorApprovalScreen';
import LeaveSummaryScreen from '../screens/LeaveApplications/LeaveSummaryScreen';
import LeaveBalanceScreen from '../screens/LeaveApplications/LeaveBalanceScreen';
import AnnouncementManagementScreen from '../screens/AnnouncementManagementScreen';
import InternReferenceScreen from '../screens/InternReferenceScreen';
import PFGratuitySummaryScreen from '../screens/SalarySlips/PFGratuitySummaryScreen';
import PayrollDetailsScreen from '../screens/Payroll/PayrollDetailsScreen';
import CostToTheCompanyScreen from '../screens/Payroll/CostToTheCompanyScreen';
import CompensationMasterScreen from '../screens/Payroll/CompensationMasterScreen';
import LoanSummaryScreen from '../screens/Payroll/LoanSummaryScreen';
import GratuitySummaryScreen from '../screens/Payroll/GratuitySummaryScreen';
import MonthlyPayrollScreen from '../screens/Payroll/MonthlyPayrollScreen';
import EmployeeRewardTrackerScreen from '../screens/EmployeeRewardTrackerScreen';
import HolidayAllowanceScreen from '../screens/HolidayAllowanceScreen';
import ExitApprovalScreen from '../screens/ExitApprovalScreen';
import EmployeeExitFormScreen from '../screens/EmployeeExitFormScreen';
import EmployeeManagementScreen from '../screens/EmployeeManagementScreen';
import UserAccessScreen from '../screens/UserAccessScreen';
import TeamManagementScreen from '../screens/TeamManagementScreen';
import ExpenditureManagementScreen from '../screens/ExpenditureManagement/ExpenditureManagementScreen';
import RegionalHolidayScreen from '../screens/LeaveApplications/RegionalHolidayScreen';
import MarriageAllowanceScreen from '../screens/Payroll/MarriageAllowanceScreen';
import AppraisalMasterScreen from '../screens/Performance/AppraisalMasterScreen';
import AppraisalWorkflowScreen from '../screens/Performance/AppraisalWorkflowScreen';
import AttendanceSummaryScreen from '../screens/Performance/AttendanceSummaryScreen';
import IncrementSummaryScreen from '../screens/Performance/IncrementSummaryScreen';
import ResumeRepositoryScreen from '../screens/ResumeRepositoryScreen';
import UnifiedHubCalendarScreen from '../screens/UnifiedHubCalendarScreen';
import EditInOutTimeScreen from '../screens/AdminTimesheet/EditInOutTimeScreen';
import SpecialPermissionScreen from '../screens/AdminTimesheet/SpecialPermissionScreen';
// Define user type
export interface User {
  name: string;
  role: string;
  employeeId: string;
  designation: string;
  location: string;
  email?: string;
  phone?: string;
  [key: string]: any;
}

export type RootStackParamList = {
  Login: undefined;
  Dashboard: { user: User };
  MyProfile: { user: User };
  ProjectAllocation: undefined;
  Timesheet: { initialDate?: string };
  LeaveApplications: undefined;
  SalarySlips: undefined;
  Insurance: undefined;
  PolicyPortal: undefined;
  Notifications: undefined;
  TimesheetHistory: undefined;
  AttendanceRegularization: undefined;
  EmployeeAttendance: undefined;
  AttendanceApproval: undefined;
  AdminTimesheet: undefined;
  TimesheetSummary: undefined;
  SelfAppraisal: undefined;
  TeamAppraisal: undefined;
  ReviewerApproval: undefined;
  DirectorApproval: undefined;
  LeaveSummary: undefined;
  LeaveBalance: undefined;
  Announcements: undefined;
  Internships: undefined;
  PFGratuitySummary: undefined;
  PayrollDetails: undefined;
  CompensationMaster: undefined;
  LoanSummary: undefined;
  GratuitySummary: undefined;
  MonthlyPayroll: undefined;
  EmployeeRewardTracker: undefined;
  HolidaysAllowance: undefined;
  ExitApproval: undefined;
  EmployeeExitForm: undefined;
  EmployeeManagement: undefined;
  UserAccess: undefined;
  TeamManagement: undefined;
  Expenditure: undefined;
  CTC: undefined;
  RegionalHoliday: undefined;
  MarriageAllowance: undefined;
  AppraisalMaster: undefined;
  AppraisalWorkflow: undefined;
  AttendanceSummary: undefined;
  IncrementSummary: undefined;
  ResumeRepository: undefined;
  UnifiedHubCalendar: undefined;
  EditInOutTime: undefined;
  SpecialPermission: undefined;
  [key: string]: undefined | object;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="MyProfile" component={MyProfileScreen} />
        <Stack.Screen name="ProjectAllocation" component={ProjectAllocationScreen} />
        <Stack.Screen name="Timesheet" component={TimesheetScreen} />
        <Stack.Screen name="LeaveApplications" component={LeaveApplicationsScreen} />
        <Stack.Screen name="SalarySlips" component={SalarySlipsScreen} />
        <Stack.Screen name="Insurance" component={InsuranceScreen} />
        <Stack.Screen name="PolicyPortal" component={PolicyPortalScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="TimesheetHistory" component={TimesheetHistoryScreen} />
        <Stack.Screen name="AttendanceRegularization" component={AttendanceRegularizationScreen} />
        <Stack.Screen name="EmployeeAttendance" component={EmployeeAttendanceScreen} />
        <Stack.Screen name="AttendanceApproval" component={AttendanceApprovalScreen} />
        <Stack.Screen name="AdminTimesheet" component={AdminTimesheetScreen} />
        <Stack.Screen name="TimesheetSummary" component={TimesheetSummaryScreen} />
        <Stack.Screen name="SelfAppraisal" component={SelfAppraisal} />
        <Stack.Screen name="TeamAppraisal" component={TeamAppraisal} />
        <Stack.Screen name="ReviewerApproval" component={ReviewerApprovalScreen} />
        <Stack.Screen name="DirectorApproval" component={DirectorApprovalScreen} />
        <Stack.Screen name="LeaveSummary" component={LeaveSummaryScreen} />
        <Stack.Screen name="LeaveBalance" component={LeaveBalanceScreen} />
        <Stack.Screen name="Announcements" component={AnnouncementManagementScreen} />
        <Stack.Screen name="Internships" component={InternReferenceScreen} />
        <Stack.Screen name="PFGratuitySummary" component={PFGratuitySummaryScreen} />
        <Stack.Screen name="PayrollDetails" component={PayrollDetailsScreen} />
        <Stack.Screen name="CTC" component={CostToTheCompanyScreen} />
        <Stack.Screen name="CompensationMaster" component={CompensationMasterScreen} />
        <Stack.Screen name="LoanSummary" component={LoanSummaryScreen} />
        <Stack.Screen name="GratuitySummary" component={GratuitySummaryScreen} />
        <Stack.Screen name="MonthlyPayroll" component={MonthlyPayrollScreen} />
        <Stack.Screen name="EmployeeRewardTracker" component={EmployeeRewardTrackerScreen} />
        <Stack.Screen name="HolidaysAllowance" component={HolidayAllowanceScreen} />
        <Stack.Screen name="ExitApproval" component={ExitApprovalScreen} />
        <Stack.Screen name="EmployeeExitForm" component={EmployeeExitFormScreen} />
        <Stack.Screen name="Expenditure" component={ExpenditureManagementScreen} />
        <Stack.Screen name="EmployeeManagement" component={EmployeeManagementScreen} />
        <Stack.Screen name="UserAccess" component={UserAccessScreen} />
        <Stack.Screen name="TeamManagement" component={TeamManagementScreen} />
        <Stack.Screen name="RegionalHoliday" component={RegionalHolidayScreen} />
        <Stack.Screen name="MarriageAllowance" component={MarriageAllowanceScreen} />
        <Stack.Screen name="AppraisalMaster" component={AppraisalMasterScreen} />
        <Stack.Screen name="AppraisalWorkflow" component={AppraisalWorkflowScreen} />
        <Stack.Screen name="AttendanceSummary" component={AttendanceSummaryScreen} />
        <Stack.Screen name="IncrementSummary" component={IncrementSummaryScreen} />
        <Stack.Screen name="ResumeRepository" component={ResumeRepositoryScreen} />
        <Stack.Screen name="UnifiedHubCalendar" component={UnifiedHubCalendarScreen} />
        <Stack.Screen name="EditInOutTime" component={EditInOutTimeScreen} />
        <Stack.Screen name="SpecialPermission" component={SpecialPermissionScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;