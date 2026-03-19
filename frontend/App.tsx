// App.tsx
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

// Import Screens
import Login from './src/screens/Login';
import DashboardScreen from './src/screens/DashboardScreen';
import MyProfileScreen from './src/screens/MyProfileScreen';
import ProjectAllocationScreen from './src/screens/ProjectAllocationScreen';
import SelfAppraisal from './src/screens/Performance/SelfAppraisal';
import TeamAppraisal from './src/screens/Performance/TeamAppraisal';
import ReviewerApprovalScreen from './src/screens/Performance/ReviewerApprovalScreen';
import DirectorApprovalScreen from './src/screens/Performance/DirectorApprovalScreen';

import InsuranceScreen from './src/screens/InsuranceScreen';
import LeaveSummaryScreen from './src/screens/LeaveApplications/LeaveSummaryScreen';
import LeaveBalanceScreen from './src/screens/LeaveApplications/LeaveBalanceScreen';
import LeaveApplicationsScreen from './src/screens/LeaveApplications/LeaveApplicationsScreen';
import TimesheetScreen from './src/screens/Timesheet/TimesheetScreen';
import TimesheetHistoryScreen from './src/screens/Timesheet/TimesheetHistoryScreen';
import AttendanceRegularizationScreen from './src/screens/Timesheet/AttendanceRegularizationScreen';
import AdminTimesheetScreen from './src/screens/AdminTimesheet/AdminTimesheetScreen';
import TimesheetSummaryScreen from './src/screens/AdminTimesheet/TimesheetSummaryScreen'; 
import SalarySlipsScreen from './src/screens/SalarySlips/SalarySlipsScreen';
import ExpenditureManagementScreen from './src/screens/ExpenditureManagement/ExpenditureManagementScreen';
import HolidayAllowanceScreen from './src/screens/HolidayAllowanceScreen';
import EmployeeManagementScreen from './src/screens/EmployeeManagementScreen';
import AnnouncementManagementScreen from './src/screens/AnnouncementManagementScreen';
import TeamManagementScreen from './src/screens/TeamManagementScreen';
import EmployeeRewardTrackerScreen from './src/screens/EmployeeRewardTrackerScreen';
import EmployeeExitFormScreen from './src/screens/EmployeeExitFormScreen';
import PayrollDetailsScreen from './src/screens/Payroll/PayrollDetailsScreen';
import CostToTheCompanyScreen from './src/screens/Payroll/CostToTheCompanyScreen';
import CompensationMasterScreen from './src/screens/Payroll/CompensationMasterScreen';
import LoanSummaryScreen from './src/screens/Payroll/LoanSummaryScreen';
import GratuitySummaryScreen from './src/screens/Payroll/GratuitySummaryScreen';
import MonthlyPayrollScreen from './src/screens/Payroll/MonthlyPayrollScreen';
import InternReferenceScreen from './src/screens/InternReferenceScreen';
import ExitApprovalScreen from './src/screens/ExitApprovalScreen';
import AttendanceApprovalScreen from './src/screens/AttendanceApprovalScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import PolicyPortalScreen from './src/screens/PolicyPortalScreen';
import UserAccessScreen from './src/screens/UserAccessScreen';
import EmployeeAttendanceScreen from './src/screens/EmployeeAttendanceScreen';
import PFGratuitySummaryScreen from './src/screens/SalarySlips/PFGratuitySummaryScreen';

// Define Root Stack Param List
export type RootStackParamList = {
  // Auth
  Login: undefined;
  
  // Main
  Dashboard: { user: any };
  Notifications: undefined;
  
  // Work & Productivity
  Timesheet: undefined;
  TimesheetHistory: undefined;
  AttendanceRegularization: undefined;
  EmployeeAttendance: undefined;
  AdminTimesheet: undefined;
  TimesheetSummary: undefined;
  ProjectAllocation: undefined;
  ExitApproval: undefined;
  // Leave Management
  LeaveSummary: undefined;
  LeaveBalance: undefined;
  LeaveApplications: undefined;
  
  // Finance & Payroll
  SalarySlips: undefined;
  PayrollDetails: undefined;
  CTC: undefined;
  LoanSummary: undefined;
  GratuitySummary: undefined;
  MonthlyPayroll: undefined;
  Expenditure: undefined;
  CostToTheCompany: undefined;
  CompensationMaster: undefined;
  AttendanceApproval: undefined;
  // Company & Resources
  Insurance: undefined;
  Policies: undefined;
  ExitForm: undefined;
  Rewards: undefined;
  EmployeeManagement: undefined;
  UserAccess: undefined;
  TeamManagement: undefined;
  Internships: undefined;
  Announcements: undefined;
  
  
  // Performance Management
  SelfAppraisal: undefined;
  TeamAppraisal: undefined;
  ReviewerApproval: undefined;
  DirectorApproval: undefined;
  AppraisalWorkflow: undefined;
  IncrementMaster: undefined;
  IncrementSummary: undefined;
  HolidaysAllowance: undefined;
  TimeSheetHistory: undefined;
  
  // Profile
  MyProfile: { user?: any };
  
  // Reward Tracker
  EmployeeRewardTracker: undefined;
  
  // Exit Form
  EmployeeExitForm: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor="#1E3A8A"
          translucent={true}
        />
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Login"
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#F9FAFB' }
            }}
          >
            {/* Auth Screen */}
            <Stack.Screen name="Login" component={Login} />
            
            {/* Main Dashboard */}
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            
            {/* Profile Screen */}
            <Stack.Screen name="MyProfile" component={MyProfileScreen} />
            
            {/* Project Allocation Screen */}
            <Stack.Screen name="ProjectAllocation" component={ProjectAllocationScreen} />
            <Stack.Screen name="SelfAppraisal" component={SelfAppraisal} />
            <Stack.Screen name="TeamAppraisal" component={TeamAppraisal} />
            <Stack.Screen name="ReviewerApproval" component={ReviewerApprovalScreen} />
            <Stack.Screen name="DirectorApproval" component={DirectorApprovalScreen} />
           
            <Stack.Screen name="Insurance" component={InsuranceScreen} />
            <Stack.Screen name="LeaveSummary" component={LeaveSummaryScreen} />
            <Stack.Screen name="LeaveBalance" component={LeaveBalanceScreen} />
            <Stack.Screen name="LeaveApplications" component={LeaveApplicationsScreen} />
            <Stack.Screen name="Timesheet" component={TimesheetScreen} />
            <Stack.Screen name="TimesheetHistory" component={TimesheetHistoryScreen} />
            <Stack.Screen name="AttendanceRegularization" component={AttendanceRegularizationScreen} />
            <Stack.Screen name="AdminTimesheet" component={AdminTimesheetScreen} />
            <Stack.Screen name="TimesheetSummary" component={TimesheetSummaryScreen} />
            <Stack.Screen name="TimeSheetHistory" component={TimesheetHistoryScreen} />
            <Stack.Screen name="SalarySlips" component={SalarySlipsScreen} />  
            <Stack.Screen name="Expenditure" component={ExpenditureManagementScreen} />
            <Stack.Screen name="HolidaysAllowance" component={HolidayAllowanceScreen} />
            <Stack.Screen name="EmployeeManagement" component={EmployeeManagementScreen} />
            <Stack.Screen name="Announcements" component={AnnouncementManagementScreen} />
            <Stack.Screen name="TeamManagement" component={TeamManagementScreen} />
            <Stack.Screen name="EmployeeRewardTracker" component={EmployeeRewardTrackerScreen} />
            <Stack.Screen name="EmployeeExitForm" component={EmployeeExitFormScreen} />
            <Stack.Screen name="PayrollDetails" component={PayrollDetailsScreen} />
            <Stack.Screen name="CTC" component={CostToTheCompanyScreen} />
            <Stack.Screen name="CompensationMaster" component={CompensationMasterScreen} />
            <Stack.Screen name="LoanSummary" component={LoanSummaryScreen} />
            <Stack.Screen name="GratuitySummary" component={GratuitySummaryScreen} />
            <Stack.Screen name="MonthlyPayroll" component={MonthlyPayrollScreen} />
            <Stack.Screen name="Internships" component={InternReferenceScreen} />
            <Stack.Screen name="ExitApproval" component={ExitApprovalScreen} />
            <Stack.Screen name="AttendanceApproval" component={AttendanceApprovalScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            
            <Stack.Screen name="UserAccess" component={UserAccessScreen} />
            <Stack.Screen name="EmployeeAttendance" component={EmployeeAttendanceScreen} />
            
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;