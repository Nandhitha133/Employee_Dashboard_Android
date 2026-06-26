import React, { useState, useRef, useEffect } from 'react';
import { Bars3Icon, BellIcon } from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { employeeAPI, notificationAPI } from '../../services/api';
import NotificationList from '../Notifications/NotificationList';

const Header = ({ onMenuClick }) => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem('user') || '{"name":"John Doe","email":"john.doe@example.com","role":"Employee"}');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const navigate = useNavigate();
  const [profileEmployeeId, setProfileEmployeeId] = useState('');

  // Map routes to page titles
  const getPageTitle = () => {
    const routeTitles = {
      // Top Level & General
      '/dashboard': 'Home',
      '/home': 'Home',
      '/my-profile': 'My Profile',
      '/office-sync': 'Office Sync',
      '/asset-management': 'Asset Management',
      '/user-access': 'User Access',
      '/employee-management': 'Employee Management',
      '/announcements': 'Announcements',
      '/bank-of-resumes': 'Resume Repository',
      '/calendar-master': 'Unified Hub Calendar',
      '/policies': 'Policy Portal',
      '/insurance': 'Insurance',
      '/expenditure-management': 'Expenditure Management',
      '/employee-reward-tracker': 'Employee Reward Tracker',
      '/holidays-allowance': 'Allowance Master',
      '/holidays-allowance/summary': 'Allowance Master Summary',

      // Timesheet Management
      '/timesheet': 'Timesheet',
      '/timesheet/history': 'Timesheet History',
      '/timesheet/regularization': 'Attendance Regularization',
      '/timesheet/attendance': 'Employee Attendance',
      '/timesheet/attendance-approval': 'Attendance Approval',
      '/attendance/edit-time': 'Edit In and Out Time',

      // Admin Timesheet
      '/admin/timesheet': 'Admin Timesheet',
      '/admin/timesheet/approval': 'Timesheet Summary',
      '/admin/special-permissions': 'Special Permission',

      // Leave Management
      '/leave-applications': 'Leave Applications',
      '/leave-management/summary': 'Leave Summary',
      '/leave-management/balance': 'Leave Balance',
      '/leave-management/regional-holidays': 'Regional Holidays',
      '/leave-management/office-holidays': 'Office Holidays',

      // Performance Management
      '/performance/self-appraisal': 'Self Appraisal',
      '/performance/team-appraisal': 'Team Appraisal',
      '/performance/reviewer-approval': 'Reviewer Approval',
      '/performance/director-approval': 'Director Approval',
      '/performance/appraisal-workflow': 'Appraisal Workflow',
      '/performance/increment-master': 'Appraisal Master',
      '/performance/increment-summary': 'Increment Summary',
      '/performance/attendance-summary': 'Attendance Summary',
      '/performance/promotion-history': 'Promotion History',
      '/performance/performance-pay': 'Performance Pay',

      // Payroll Management
      '/salaryslips': 'Salary Slips',
      '/salaryslips/pf-gratuity': 'PF & Gratuity Summary',
      '/payroll/details': 'Payroll Details',
      '/payroll/history': 'Payroll History',
      '/payroll/cost-to-the-company': 'Cost to the Company',
      '/payroll/compensation-master': 'Compensation Master',
      '/payroll/loan-summary': 'Loan Summary',
      '/payroll/gratuity-summary': 'Gratuity Summary',
      '/payroll/monthly': 'Monthly Payroll',
      '/payroll/marriage-allowance': 'Marriage Allowance',

      // Team & Interns
      '/admin/team-management': 'Team Management',
      '/project-allocation': 'Project Allocation',
      '/internship/InternReference': 'Intern Reference',
      '/admin/interns': 'Intern Reference',

      // Exit Management
      '/employee-exit/form': 'Employee Exit Form',
      '/employee-exit/approval': 'Exit Approval',

      // Support Center
      '/support/raise-ticket': 'Caldim Support Center',
      '/support/my-tickets': 'Caldim Support Center',
      '/admin/support/dashboard': 'Caldim Support Center',
      '/admin/support/all-tickets': 'Caldim Support Center',
    };

    if (location.pathname.startsWith('/support/tickets/') || location.pathname.startsWith('/admin/support/tickets/')) {
      return 'Caldim Support Center';
    }

    return routeTitles[location.pathname] || 'Caldim Employee Portal';
  };

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  const getDisplayEmployeeId = () => {
    if (profileEmployeeId) return profileEmployeeId;
    if (!user) return '';
    if (user.employeeId) return user.employeeId;
    if (user.employeeCode) return user.employeeCode;
    if (user.empId) return user.empId;
    return '';
  };

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchProfileEmployeeId = async () => {
      try {
        const res = await employeeAPI.getMyProfile();
        const emp = res.data;
        if (emp && emp.employeeId) {
          setProfileEmployeeId(emp.employeeId);
          const storedUser = JSON.parse(sessionStorage.getItem('user') || '{}');
          const updatedUser = {
            ...storedUser,
            employeeId: emp.employeeId
          };
          sessionStorage.setItem('user', JSON.stringify(updatedUser));
        }
      } catch (e) {
      }
    };
    fetchProfileEmployeeId();
  }, []);

  // Fetch unread notifications count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await notificationAPI.getAll();
        const unread = res.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    };

    fetchUnreadCount();
    // Poll every minute for new notifications
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  // Format date and time for India (Asia/Kolkata)
  const formattedDate = currentTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <>
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow border-b border-indigo-900 w-full">
        <div className="flex items-center px-4 py-3">

          {/* Left Section */}
          <div className="flex-1">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-white hover:text-gray-200 hover:bg-white/10"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate(-1)}
              className="ml-2 p-2 rounded-md text-white hover:text-gray-200 hover:bg-white/10 inline-flex items-center gap-1"
              aria-label="Go Back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="hidden sm:inline text-sm text-white">Back</span>
            </button>
          </div>

          {/* Center Section */}
          <div className="flex-1 text-center">
            <h1 className="text-lg font-black uppercase tracking-wider text-white">{getPageTitle()}</h1>
          </div>

          {/* Right Section */}
          <div className="flex-1 flex justify-end items-center space-x-4">
            {/* Time Display */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm text-white font-bold">{formattedTime}</span>
              <span className="text-xs text-indigo-200">{formattedDate}</span>
            </div>

            {/* Mobile Time Display */}
            <div className="sm:hidden flex flex-col items-end">
              <span className="text-sm text-white font-bold">{formattedTime}</span>
            </div>

            {/* Notification Section */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className={`flex items-center p-2.5 rounded-xl transition-all duration-300 relative group
                  ${unreadCount > 0
                    ? 'bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50'
                    : 'text-white/75 hover:bg-white/10'}`}
                aria-label="Notifications"
              >
                <BellIcon className={`h-6 w-6 transition-transform duration-500 ${unreadCount > 0 ? 'animate-[swing_2s_ease-in-out_infinite] origin-top' : 'group-hover:rotate-12'}`} />

                {unreadCount > 0 && (
                  <>
                    <span className="absolute top-2 right-2 h-3 w-3 bg-rose-500 rounded-full border-2 border-slate-900 z-10"></span>
                    <span className="absolute top-2 right-2 h-3 w-3 bg-rose-400 rounded-full animate-ping opacity-75"></span>
                  </>
                )}
              </button>

              {isNotificationOpen && (
                <NotificationList onClose={() => setIsNotificationOpen(false)} />
              )}
            </div>

            {/* Profile Section */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 text-white font-black">
                  {userInitial}
                </div>
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white text-gray-800 rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-300 text-gray-700 font-medium">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500">{getGreeting()}</p>
                        <p className="font-medium text-gray-800 truncate">{user.name}</p>
                        {getDisplayEmployeeId() && (
                          <p className="text-sm text-gray-600 truncate">
                            Employee ID: {getDisplayEmployeeId()}
                          </p>
                        )}

                      </div>
                    </div>
                  </div>

                  <div className="p-2 border-t border-gray-200">

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <i className="fas fa-sign-out-alt mr-3 w-4 text-center"></i>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </header>
    </>
  );
};

export default Header;
