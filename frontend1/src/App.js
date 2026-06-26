// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UserAccess from "./pages/UserAccess";
import MyProfile from "./pages/MyProfile";
import EmployeeManagement from "./pages/EmployeeManagement";

// Timesheet Pages
import Timesheet from "./pages/timesheet/Timesheet";
import TimesheetHistory from "./pages/timesheet/TimesheetHistory";
import EmployeeAttendance from "./pages/timesheet/EmployeeAttendance";
import AttendanceRegularization from "./pages/timesheet/AttendanceRegularization";
import AttendanceApproval from "./pages/timesheet/AttendanceApproval";

// Project Allocation Pages
import ProjectAllocation from './pages/project-allocation/ProjectAllocation';

// Leave Application Pages
import LeaveApplications from './pages/leaveapplications/LeaveApplications';

//Leave Management Pages 
import LeaveSummary from './pages/leavemanagement/LeaveSummary';
import LeaveBalance from './pages/leavemanagement/LeaveBalance';
import RegionalHolidays from './pages/leavemanagement/RegionalHolidays';
import OfficeHolidays from './pages/leavemanagement/OfficeHolidays';

// Admin Timesheet Pages
import AdminTimesheet from './pages/admin-timesheet/AdminTimesheet';
import TimesheetSummary from './pages/admin-timesheet/TimesheetSummary';
import AdminSpecialPermission from './pages/special-permission/AdminSpecialPermission';

// Insurance & Policy Pages
import InsuranceManagement from './pages/insurance/InsuranceManagement';
import PolicyPortal from './pages/PolicyPortal';
import TeamManagement from './pages/admin/TeamManagement';

import SalarySlips from "./pages/salaryslips/SalarySlips";
import PFGratuitySummary from "./pages/salaryslips/PFGratuitySummary";
import ExpenditureManagement from "./pages/expenditure/ExpenditureManagement"
import EmployeeRewardTracker from "./pages/rewards/EmployeeRewardTracker";
import BankRepository from "./pages/bankrepository/BankRepository";

// Payroll
import PayrollDetails from "./pages/payroll/PayrollDetails";
import PayrollHistory from "./pages/payroll/PayrollHistory";
import CompensationMaster from "./pages/payroll/CompensationMaster";
import CostToTheCompany from "./pages/payroll/CostToTheCompany";
import LoanSummary from "./pages/payroll/LoanSummary";
import GratuitySummary from "./pages/payroll/GratuitySummary";
import MonthlyPayroll from "./pages/payroll/MonthlyPayroll";
import MarriageAllowance from "./pages/payroll/MarriageAllowance";
import AnnouncementManagement from "./pages/announcements/AnnouncementManagement";
import InternReference from "./pages/internship/InternReference";
import AssetManagement from "./pages/assets/AssetManagement";
import OfficeSync from "./pages/officesync/OfficeSync";

// Exit Management
import ExitForm from "./pages/EmployeeExitForms";
import ExitApproval from "./pages/ExitApprovals";
import HolidaysAllowance from "./pages/HolidaysAllowance";
import HolidaysAllowanceSummary from "./pages/HolidaysAllowanceSummary";
import EditInAndOutTime from "./pages/attendance/EditInAndOutTime";

//performance Management
import SelfAppraisal from "./pages/performance/SelfAppraisal";
import TeamAppraisal from "./pages/performance/TeamAppraisal";
import AppraisalWorkflow from "./pages/performance/AppraisalWorkflow";
import ReviewerApproval from "./pages/performance/ReviewerApproval";
import DirectorApproval from "./pages/performance/DirectorApproval";
import PerformancePay from "./pages/performance/PerformancePay";
import AppraisalMaster from "./pages/performance/AppraisalMaster";
import IncrementSummary from "./pages/performance/IncrementSummary";
import AttendanceSummary from "./pages/performance/AttendanceSummary";
import PromotionHistory from "./pages/performance/PromotionHistory";
import CalendarMaster from "./pages/calendar/CalendarMaster";

// Support Center
import RaiseTicket from "./pages/support-center/RaiseTicket";
import MyTickets from "./pages/support-center/MyTickets";
import TicketDetails from "./pages/support-center/TicketDetails";
import SupportDashboard from "./pages/support-center/SupportDashboard";
import AllTickets from "./pages/support-center/AllTickets";



function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* ---------------- Timesheet Management ---------------- */}
            <Route
              path="timesheet"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]} allowEmployeeRole>
                  <Timesheet />
                </ProtectedRoute>
              }
            />
            <Route
              path="timesheet/history"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]} allowEmployeeRole>
                  <TimesheetHistory />
                </ProtectedRoute>
              }
            />

            <Route
              path="timesheet/attendance"
              element={
                <ProtectedRoute requiredPermissions={["attendance_access"]}>
                  <EmployeeAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="timesheet/regularization"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]} allowEmployeeRole>
                  <AttendanceRegularization />
                </ProtectedRoute>
              }
            />
            <Route
              path="timesheet/attendance-approval"
              element={
                <ProtectedRoute requiredPermissions={["attendance_access"]} roles={["admin", "hr", "manager", "projectmanager", "project_manager"]}>
                  <AttendanceApproval />
                </ProtectedRoute>
              }
            />

            <Route
              path="attendance/edit-time"
              element={
                <ProtectedRoute requiredPermissions={["edit_attendance"]} roles={["admin", "hr", "manager", "projectmanager", "project_manager"]}>
                  <EditInAndOutTime />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Admin Timesheet ---------------- */}
            <Route
              path="admin/timesheet"
              element={
                <ProtectedRoute requiredPermissions={["admin_timesheet_access", "admin_timesheet"]} roles={["admin", "projectmanager", "project_manager"]}>
                  <AdminTimesheet />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/timesheet/approval"
              element={
                <ProtectedRoute requiredPermissions={["admin_timesheet_access", "timesheet_summary"]} roles={["admin", "hr", "manager", "projectmanager", "project_manager"]}>
                  <TimesheetSummary />
                </ProtectedRoute>
              }
            />

            {/* Special Permission Approval */}
            <Route
              path="admin/special-permissions"
              element={
                <ProtectedRoute requiredPermissions={["admin_timesheet_access", "special_permission"]} roles={["admin", "hr", "manager", "projectmanager", "project_manager"]}>
                  <AdminSpecialPermission />
                </ProtectedRoute>
              }
            />


            <Route
              path="admin/interns"
              element={
                <ProtectedRoute requiredPermissions={["intern_reference"]} roles={["admin", "hr", "manager"]}>
                  <InternReference />
                </ProtectedRoute>
              }
            />


            {/* ---------------- Exit Management ---------------- */}
            <Route
              path="employee-exit/form"
              element={
                <ProtectedRoute
                  requiredPermissions={["exit_form_access"]}
                  allowEmployeeRole
                  roles={["employees", "projectmanager", "project_manager"]}
                >
                  <ExitForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="employee-exit/approval"
              element={
                <ProtectedRoute
                  requiredPermissions={["exit_access", "exit_approval_access"]}
                  roles={["admin", "hr", "manager"]}
                >
                  <ExitApproval />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Project Allocation ---------------- */}
            <Route
              path="project-allocation"
              element={
                <ProtectedRoute requiredPermissions={["project_access"]} roles={["admin", "projectmanager", "project_manager"]}>
                  <ProjectAllocation />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Insurance & Policy ---------------- */}
            <Route
              path="insurance"
              element={
                <ProtectedRoute requiredPermissions={["insurance_access"]}>
                  <InsuranceManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="policies"
              element={
                <ProtectedRoute requiredPermissions={["policy_portal"]} allowEmployeeRole>
                  <PolicyPortal />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Salary Slips - ADDED ---------------- */}
            <Route
              path="salaryslips"
              element={
                <ProtectedRoute
                  requiredPermissions={["salary_slips"]}
                  roles={["admin", "hr", "employees", "projectmanager", "project_manager"]}
                  allowEmployeeRole
                >
                  <SalarySlips />
                </ProtectedRoute>
              }
            />

            <Route
              path="salaryslips/pf-gratuity"
              element={
                <ProtectedRoute
                  requiredPermissions={["salary_slips"]}
                  roles={["admin", "hr", "employees", "projectmanager", "project_manager"]}
                  allowEmployeeRole
                >
                  <PFGratuitySummary />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Expenditure Management ---------------- */}
            <Route
              path="expenditure-management"
              element={
                <ProtectedRoute
                  requiredPermissions={["expenditure_access"]}
                  roles={["admin", "hr", "finance"]}
                >
                  <ExpenditureManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="bank-of-resumes"
              element={
                <ProtectedRoute
                  requiredPermissions={["resume_access"]}
                  roles={["admin", "hr"]}
                >
                  <BankRepository />
                </ProtectedRoute>
              }
            />

            {/* ---------------- LEAVE MANAGEMENT MODULES (NO DASHBOARD) ---------------- */}

            {/* Leave Summary */}
            <Route
              path="leave-management/summary"
              element={
                <ProtectedRoute
                  requiredPermissions={["leave_group_access", "leave_summary"]}
                  roles={["admin", "hr", "manager", "projectmanager", "project_manager"]}
                >
                  <LeaveSummary />
                </ProtectedRoute>
              }
            />

            {/* Leave Balance */}
            <Route
              path="leave-management/balance"
              element={
                <ProtectedRoute
                  requiredPermissions={["leave_group_access", "leave_balance"]}
                  roles={["admin", "hr", "manager", "employees"]}
                  allowEmployeeRole
                >
                  <LeaveBalance />
                </ProtectedRoute>
              }
            />

            {/* Regional Holidays */}
            <Route
              path="leave-management/regional-holidays"
              element={
                <ProtectedRoute requiredPermissions={["leave_group_access", "leave_summary"]} roles={["admin", "hr"]}>
                  <RegionalHolidays />
                </ProtectedRoute>
              }
            />

            {/* Office Holidays */}
            <Route
              path="leave-management/office-holidays"
              element={
                <ProtectedRoute requiredPermissions={["leave_group_access", "leave_summary"]} roles={["admin", "hr"]}>
                  <OfficeHolidays />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Leave Application ---------------- */}
            <Route
              path="leave-applications"
              element={
                <ProtectedRoute
                  requiredPermissions={["leave_access"]}
                  roles={["employees", "projectmanager", "project_manager"]}
                  allowEmployeeRole
                >
                  <LeaveApplications />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Employee Reward Tracker ---------------- */}
            <Route
              path="employee-reward-tracker"
              element={
                <ProtectedRoute
                  requiredPermissions={["reward_access"]}
                  roles={["admin", "hr", "manager"]}
                >
                  <EmployeeRewardTracker />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Holidays Allowance ---------------- */}
            <Route
              path="holidays-allowance"
              element={
                <ProtectedRoute
                  requiredPermissions={["holiday_allowance"]}
                  roles={["admin", "hr", "manager"]}
                  allowEmployeeRole
                >
                  <HolidaysAllowance />
                </ProtectedRoute>
              }
            />
            <Route
              path="holidays-allowance/summary"
              element={
                <ProtectedRoute
                  requiredPermissions={["holiday_allowance"]}
                  roles={["admin", "hr", "manager"]}
                  allowEmployeeRole
                >
                  <HolidaysAllowanceSummary />
                </ProtectedRoute>
              }
            />

            {/* PAYROLL */}
            <Route
              path="payroll/details"
              element={
                <ProtectedRoute requiredPermissions={["payroll_access", "payroll_details"]} roles={["admin", "hr", "finance"]}>
                  <PayrollDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/history"
              element={
                <ProtectedRoute requiredPermissions={["payroll_access"]} roles={["admin", "hr", "finance", "manager", "projectmanager", "project_manager", "director", "employees"]} allowEmployeeRole>
                  <PayrollHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/compensation-master"
              element={
                <ProtectedRoute requiredPermissions={["payroll_access", "compensation_master"]} roles={["admin", "hr", "finance"]}>
                  <CompensationMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/cost-to-the-company"
              element={
                <ProtectedRoute requiredPermissions={["payroll_access", "cost_to_company"]} roles={["admin", "hr", "finance"]}>
                  <CostToTheCompany />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/loan-summary"
              element={
                <ProtectedRoute requiredPermissions={["payroll_access", "loan_summary"]} roles={["admin", "hr", "finance"]}>
                  <LoanSummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/gratuity-summary"
              element={
                <ProtectedRoute requiredPermissions={["payroll_access", "gratuity_summary"]} roles={["admin", "hr", "finance"]}>
                  <GratuitySummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/monthly"
              element={
                <ProtectedRoute requiredPermissions={["payroll_access", "monthly_payroll"]} roles={["admin", "hr", "finance"]}>
                  <MonthlyPayroll />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/marriage-allowance"
              element={
                <ProtectedRoute requiredPermissions={["payroll_access", "marriage_allowance"]} roles={["admin", "hr", "finance"]}>
                  <MarriageAllowance />
                </ProtectedRoute>
              }
            />



            {/* ---------------- User & Employee Management ---------------- */}
            <Route
              path="my-profile"
              element={
                <ProtectedRoute>
                  <MyProfile />
                </ProtectedRoute>
              }
            />

            <Route
              path="user-access"
              element={
                <ProtectedRoute requiredPermissions={["user_access"]} roles={["admin"]}>
                  <UserAccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="employee-management"
              element={
                <ProtectedRoute requiredPermissions={["employee_access"]}>
                  <EmployeeManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="performance/promotion-history"
              element={
                <ProtectedRoute requiredPermissions={["self_appraisal"]} roles={["admin", "hr", "employees"]} allowEmployeeRole>
                  <PromotionHistory />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Team Management ---------------- */}
            <Route
              path="admin/team-management"
              element={
                <ProtectedRoute requiredPermissions={["employee_access"]}>
                  <TeamManagement />
                </ProtectedRoute>
              }
            />


            {/* ---------------- Performance Management ---------------- */}
            <Route
              path="performance/self-appraisal"
              element={
                <ProtectedRoute requiredPermissions={["self_appraisal"]} allowEmployeeRole>
                  <SelfAppraisal />
                </ProtectedRoute>
              }
            />
            <Route
              path="performance/team-appraisal"
              element={
                <ProtectedRoute requiredPermissions={["performance_access", "team_appraisal"]} roles={["admin", "hr", "manager", "projectmanager", "project_manager"]}>
                  <TeamAppraisal />
                </ProtectedRoute>
              }
            />
            <Route
              path="performance/reviewer-approval"
              element={
                <ProtectedRoute requiredPermissions={["performance_access", "reviewer_approval"]} roles={["admin", "hr", "manager", "projectmanager", "project_manager"]}>
                  <ReviewerApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="performance/director-approval"
              element={
                <ProtectedRoute requiredPermissions={["performance_access", "director_approval"]} roles={["admin", "hr", "manager", "director"]}>
                  <DirectorApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="performance/performance-pay"
              element={
                <ProtectedRoute requiredPermissions={["performance_pay"]} allowEmployeeRole>
                  <PerformancePay />
                </ProtectedRoute>
              }
            />
            <Route
              path="performance/appraisal-workflow"
              element={
                <ProtectedRoute requiredPermissions={["performance_access", "appraisal_workflow"]} allowEmployeeRole>
                  <AppraisalWorkflow />
                </ProtectedRoute>
              }
            />
            <Route
              path="performance/increment-master"
              element={
                <ProtectedRoute requiredPermissions={["performance_access", "appraisal_master"]} roles={["admin", "hr"]}>
                  <AppraisalMaster />
                </ProtectedRoute>
              }
            />
            <Route
              path="performance/increment-summary"
              element={
                <ProtectedRoute requiredPermissions={["performance_access", "increment_summary"]} roles={["admin", "hr", "manager"]}>
                  <IncrementSummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="performance/attendance-summary"
              element={
                <ProtectedRoute requiredPermissions={["performance_access", "attendance_summary"]} roles={["admin", "hr", "manager"]}>
                  <AttendanceSummary />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Announcements ---------------- */}
            <Route
              path="announcements"
              element={
                <ProtectedRoute requiredPermissions={["announcement_manage"]} roles={["admin", "hr", "manager"]}>
                  <AnnouncementManagement />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Asset Management ---------------- */}
            <Route
              path="asset-management"
              element={
                <ProtectedRoute allowEmployeeRole>
                  <AssetManagement />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Office Sync ---------------- */}
            <Route
              path="office-sync"
              element={
                <ProtectedRoute requiredPermissions={["office_sync_access"]} allowEmployeeRole>
                  <OfficeSync />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Unified Hub Calendar ---------------- */}
            <Route
              path="calendar-master"
              element={
                <ProtectedRoute allowEmployeeRole>
                  <CalendarMaster />
                </ProtectedRoute>
              }
            />


            {/* ---------------- Support Center ---------------- */}
            <Route
              path="support/raise-ticket"
              element={
                <ProtectedRoute requiredPermissions={["raise_ticket_access"]} allowEmployeeRole>
                  <RaiseTicket />
                </ProtectedRoute>
              }
            />
            <Route
              path="support/my-tickets"
              element={
                <ProtectedRoute requiredPermissions={["my_tickets_access"]} allowEmployeeRole>
                  <MyTickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="support/tickets/:id"
              element={
                <ProtectedRoute requiredPermissions={["my_tickets_access"]} allowEmployeeRole>
                  <TicketDetails />
                </ProtectedRoute>
              }
            />

            {/* Admin Support Routes */}
            <Route
              path="admin/support/dashboard"
              element={
                <ProtectedRoute requiredPermissions={["support_dashboard_access"]} roles={["admin", "hr"]}>
                  <SupportDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/support/all-tickets"
              element={
                <ProtectedRoute requiredPermissions={["support_dashboard_access"]} roles={["admin", "hr"]}>
                  <AllTickets />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/support/tickets/:id"
              element={
                <ProtectedRoute requiredPermissions={["support_dashboard_access"]} roles={["admin", "hr"]}>
                  <TicketDetails />
                </ProtectedRoute>
              }
            />

          </Route>
        </Routes>
      </div>
    </Router>
  );
}
export default App;
