import React, { useState, useEffect } from 'react';
import { adminTimesheetAPI, employeeAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import { 
  BarChart3, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Search,
  Building,
  MapPin,
  FolderOpen,
  FileText,
  MoreHorizontal,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';

const AdminTimesheet = () => {
  const [timesheets, setTimesheets] = useState([]);
  const [actionLoading, setActionLoading] = useState({});
  const [filters, setFilters] = useState({
    employeeId: '',
    division: 'All Division',
    location: 'All Locations',
    status: 'All Status',
    week: 'All Weeks',
    project: 'All Projects',
    year: 'All Years',
    fromDate: '',
    toDate: ''
  });

  // Get user role
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.role || '';
  const isProjectManager = role === 'projectmanager' || role === 'project_manager';

  const [hoverStates, setHoverStates] = useState({
    statCards: {},
    refreshButton: false,
    tableRows: {}
  });
  const [projectOptions, setProjectOptions] = useState(["All Projects"]);
  const [weekOptions, setWeekOptions] = useState(["All Weeks"]);
  const [yearOptions, setYearOptions] = useState(["All Years"]);
  const [employeeIdOptions, setEmployeeIdOptions] = useState(['']);
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [allEmployees, setAllEmployees] = useState([]);
  const [rejectDialog, setRejectDialog] = useState({ isOpen: false, timesheetId: null, reason: '' });
  const [messageDialog, setMessageDialog] = useState({ isOpen: false, title: '', message: '', type: 'success' });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await employeeAPI.getTimesheetEmployees();
        if (Array.isArray(res.data)) {
          setAllEmployees(res.data);
        } else if (res.data?.success) {
          setAllEmployees(res.data.data || []);
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define styles as constants
  const glassCard = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    border: '1px solid #e2e8f0'
  };

  const styles = {
    adminTimesheet: {
      padding: '16px',
      backgroundColor: '#f8fafc',
      height: isMobile ? 'auto' : '100vh',
      minHeight: isMobile ? '100vh' : 0,
      display: 'flex',
      flexDirection: 'column',
      overflow: isMobile ? 'visible' : 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    timesheetHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '12px',
      padding: '12px',
      ...glassCard,
      flexShrink: 0
    },
    headerTitle: {
      margin: 0,
      color: '#1a202c',
      fontSize: '20px',
      fontWeight: '700'
    },
    adminInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    adminBadge: {
      backgroundColor: '#4299e1',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '14px',
      fontWeight: '600'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '10px',
      marginBottom: '12px',
      flexShrink: 0
    },
    statCard: {
      padding: '12px',
      ...glassCard,
      transition: 'all 0.2s ease'
    },
    statCardHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    },
    statHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px'
    },
    statIconContainer: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    statTitle: {
      margin: 0,
      color: '#718096',
      fontSize: '11px',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    statNumber: {
      fontSize: '20px',
      fontWeight: '700',
      color: '#2d3748',
      margin: 0
    },
    filtersSection: {
      padding: '12px',
      marginBottom: '12px',
      ...glassCard,
      flexShrink: 0
    },
    sectionHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    },
    sectionTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      margin: 0,
      color: '#2d3748',
      fontSize: '16px',
      fontWeight: '600'
    },
    filtersGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
      marginBottom: '12px'
    },
    filterGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    filterLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      marginBottom: '4px',
      fontWeight: '500',
      color: '#4a5568',
      fontSize: '13px'
    },
    filterInput: {
      padding: '8px 10px',
      border: '1px solid #cbd5e0',
      borderRadius: '6px',
      fontSize: '13px',
      transition: 'all 0.2s ease',
      backgroundColor: 'white'
    },
    filterInputFocus: {
      borderColor: '#4299e1',
      boxShadow: '0 0 0 3px rgba(66, 153, 225, 0.1)'
    },
    actionButtons: {
      display: 'flex',
      gap: '12px',
      alignItems: 'center'
    },
    primaryButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: '#262760',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    },
    primaryButtonHover: {
      backgroundColor: '#1f204d',
      transform: 'translateY(-1px)'
    },
    secondaryButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      backgroundColor: '#262760',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '500',
      fontSize: '14px',
      transition: 'all 0.2s ease'
    },
    secondaryButtonHover: {
      backgroundColor: '#1f204d'
    },
    timesheetsTableSection: {
      padding: '16px',
      ...glassCard,
      flex: isMobile ? 'none' : 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: isMobile ? 'visible' : 'hidden',
      minHeight: 0
    },
    tableHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px',
      flexShrink: 0
    },
    tableContainer: {
      overflowX: 'auto',
      overflowY: isMobile ? 'visible' : 'auto',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      flex: isMobile ? 'none' : 1
    },
    timesheetsTable: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white'
    },
    tableHeaderCell: {
      padding: '12px',
      textAlign: 'left',
      backgroundColor: '#262760',
      fontWeight: '600',
      color: 'white',
      fontSize: '14px',
      borderBottom: '1px solid #e2e8f0',
      borderRight: '1px solid #1f204d',
      position: 'sticky',
      top: 0,
      zIndex: 10
    },
    tableCell: {
      padding: '12px',
      textAlign: 'left',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '14px'
    },
    tableRow: {
      transition: 'all 0.2s ease'
    },
    tableRowHover: {
      backgroundColor: '#f7fafc'
    },
    actions: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    approveBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: '#48bb78',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    rejectBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: '#f56565',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    viewBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      backgroundColor: '#262760',
      color: 'white',
      border: 'none',
      padding: '6px 12px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease'
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      textTransform: 'uppercase'
    },
    approvedBadge: {
      backgroundColor: '#c6f6d5',
      color: '#22543d'
    },
    rejectedBadge: {
      backgroundColor: '#fed7d7',
      color: '#742a2a'
    },
    pendingBadge: {
      backgroundColor: '#feebc8',
      color: '#744210'
    },
    notSubmittedBadge: {
      backgroundColor: '#e2e8f0',
      color: '#4a5568'
    },
    // Modal Styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      maxWidth: '1000px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
    },
    textarea: {
      width: '100%',
      minHeight: '110px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '10px 12px',
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical'
    },
    messageOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '20px'
    },
    messageTitle: {
      margin: 0,
      color: '#1a202c',
      fontSize: '18px',
      fontWeight: '700'
    },
    messageText: {
      color: '#4a5568',
      fontSize: '14px',
      lineHeight: 1.5,
      marginTop: '10px'
    },
    cancelButton: {
      backgroundColor: '#edf2f7',
      color: '#2d3748',
      border: '1px solid #e2e8f0',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid #e2e8f0'
    },
    modalTitle: {
      margin: 0,
      color: '#1a202c',
      fontSize: '20px',
      fontWeight: '600'
    },
    closeButton: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      padding: '8px',
      borderRadius: '6px',
      color: '#718096',
      transition: 'all 0.2s ease'
    },
    detailGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    detailCard: {
      padding: '16px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      backgroundColor: '#f7fafc'
    },
    detailLabel: {
      fontSize: '12px',
      fontWeight: '500',
      color: '#718096',
      textTransform: 'uppercase',
      marginBottom: '4px'
    },
    detailValue: {
      fontSize: '16px',
      fontWeight: '600',
      color: '#2d3748'
    },
    timeEntriesTableSection: {
      marginBottom: '24px'
    },
    timeEntriesTitle: {
      margin: '0 0 16px 0',
      color: '#2d3748',
      fontSize: '18px',
      fontWeight: '600'
    },
    timeEntriesTable: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    timeEntriesHeader: {
      backgroundColor: '#262760',
      fontWeight: '600',
      color: 'white',
      fontSize: '14px',
      textAlign: 'center',
      borderRight: '1px solid #1f204d'
    },
    timeEntriesHeaderCell: {
      padding: '12px',
      borderBottom: '1px solid #e2e8f0',
      borderRight: '1px solid #1f204d'
    },
    timeEntriesCell: {
      padding: '12px',
      textAlign: 'center',
      borderBottom: '1px solid #e2e8f0',
      borderRight: '1px solid #e2e8f0',
      fontSize: '14px'
    },
    totalHoursCell: {
      padding: '12px',
      textAlign: 'center',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '14px',
      fontWeight: '600',
      backgroundColor: '#f7fafc'
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px',
      paddingTop: '16px',
      borderTop: '1px solid #e2e8f0'
    }
  };

  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    totalTimesheets: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalEmployees: 0,
    projectHours: 0
  });

  const formatDuration = (h) => {
    const val = Number(h || 0);
    const totalMinutes = Math.round(val * 60);
    const sign = totalMinutes < 0 ? "-" : "";
    const absMinutes = Math.abs(totalMinutes);
    const hh = String(Math.floor(absMinutes / 60)).padStart(2, "0");
    const mm = String(absMinutes % 60).padStart(2, "0");
    return `${sign}${hh}:${mm}`;
  };

  const statConfigs = [
    { 
      title: 'Total Timesheets', 
      value: stats.totalTimesheets, 
      icon: BarChart3, 
      color: '#4299e1'
    },
    { 
      title: 'Pending Review', 
      value: stats.pending, 
      icon: Clock, 
      color: '#ed8936'
    },
    { 
      title: 'Approved', 
      value: stats.approved, 
      icon: CheckCircle, 
      color: '#48bb78'
    },
    { 
      title: 'Rejected', 
      value: stats.rejected, 
      icon: XCircle, 
      color: '#f56565'
    },
    { 
      title: 'Total Employees', 
      value: stats.totalEmployees, 
      icon: Users, 
      color: '#9f7aea'
    },
    { 
      title: 'Project Hours', 
      value: formatDuration(stats.projectHours), 
      icon: Calendar, 
      color: '#ed64a6'
    }
  ];

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const params = { ...filters };
      
      // If filtering by Not Submitted, we need all timesheets first to compare
      if (filters.status === 'Not Submitted') {
        params.status = 'All Status';
      }

      const res = await adminTimesheetAPI.list(params);
      let data = res.data?.data || [];

      if (filters.year === 'All Years') {
        const uniqueYears = Array.from(new Set(data.map(r => {
          if (!r.submittedDate) return null;
          return new Date(r.submittedDate).getFullYear();
        }).filter(Boolean))).sort().reverse();
        setYearOptions(["All Years", ...uniqueYears]);
      }

      if (filters.year !== 'All Years') {
        data = data.filter(ts => {
          if (!ts.submittedDate) return false;
          return String(new Date(ts.submittedDate).getFullYear()) === String(filters.year);
        });
      }

      // Handle Not Submitted Logic
      if (filters.status === 'Not Submitted') {
        const submittedEmployeeIds = new Set(data.map(r => r.employeeId));
        
        // Filter employees who haven't submitted
        const missingEmployees = allEmployees.filter(emp => {
          // Apply other filters to the employee list
          if (filters.division !== 'All Division' && emp.division !== filters.division) return false;
          if (filters.location !== 'All Locations' && emp.location !== filters.location) return false;
          if (filters.employeeId !== '' && emp.employeeId !== filters.employeeId) return false;
          
          return !submittedEmployeeIds.has(emp.employeeId);
        });

        // Transform into table-compatible format
        data = missingEmployees.map(emp => ({
          _id: `missing-${emp.employeeId}`,
          employeeId: emp.employeeId,
          employeeName: emp.name,
          division: emp.division,
          location: emp.location,
          week: filters.week === 'All Weeks' ? '-' : filters.week,
          status: 'Not Submitted',
          timeEntries: [],
          weeklyTotal: 0,
          submittedDate: null
        }));
      }

      if (filters.employeeId === '') {
        // If Not Submitted, we use data (which is missing employees)
        // If normal, we use data (which is timesheets)
        const uniqueIds = Array.from(new Set(data.map(r => r.employeeId).filter(Boolean))).sort();
        setEmployeeIdOptions(['', ...uniqueIds]);
      }

      setTimesheets(data);
      const setProjects = new Set();
      data.forEach(ts => {
        (ts.timeEntries || []).forEach(te => {
          const typeVal = (te.type || '').toLowerCase();
          const p = (te.project || '').trim();
          const taskVal = (te.task || '').toLowerCase();
          const looksLikeProject = typeVal === 'project' || (
            p && p.toLowerCase() !== 'leave' &&
            !taskVal.includes('leave') && !taskVal.includes('holiday')
          );
          if (looksLikeProject && p) setProjects.add(p);
        });
      });
      
      if (filters.project === 'All Projects') {
        setProjectOptions(["All Projects", ...Array.from(setProjects).sort()]);
      }

      if (filters.week === 'All Weeks') {
        // For Not Submitted, we might not have week info in data if we generated it manually with '-'
        // But usually we don't filter week for Not Submitted unless selected
        if (filters.status !== 'Not Submitted') {
          const uniqueWeeks = Array.from(new Set(data.map(r => r.week).filter(Boolean))).sort().reverse();
          setWeekOptions(["All Weeks", ...uniqueWeeks]);
        }
      }

      const totalTimesheets = data.length;
      const statusCounts = data.reduce((acc, r) => {
        const s = (r.status || '').toLowerCase();
        if (s === 'approved') acc.approved++;
        else if (s === 'rejected') acc.rejected++;
        else if (s === 'pending' || s === 'submitted') acc.pending++;
        else if (s === 'not submitted') acc.notSubmitted++;
        else acc.pending++;
        return acc;
      }, { approved: 0, rejected: 0, pending: 0, notSubmitted: 0 });
      
      const totalEmployees = (() => {
        // Calculate filtered employees from the master list (allEmployees)
        if (allEmployees.length > 0) {
          return allEmployees.filter(emp => {
            if (filters.division !== 'All Division' && emp.division !== filters.division) return false;
            if (filters.location !== 'All Locations' && emp.location !== filters.location) return false;
            if (filters.employeeId !== '' && emp.employeeId !== filters.employeeId) return false;
            return true;
          }).length;
        }
        // Fallback to data if master list not loaded yet
        return new Set(data.map(r => r.employeeId).filter(Boolean)).size;
      })();

      const projectHours = data.reduce((sum, r) => {
        const s = (r.status || '').toLowerCase();
        const includeRow = s === 'approved' || s === 'submitted';
        if (!includeRow) return sum;
        const entries = r.timeEntries || [];
        const projSum = entries.reduce((eSum, te) => {
          const typeVal = (te.type || '').toLowerCase();
          const p = (te.project || '').trim();
          const taskVal = (te.task || '').toLowerCase();
          const isProject = typeVal === 'project' || (
            p && p.toLowerCase() !== 'leave' &&
            !taskVal.includes('leave') && !taskVal.includes('holiday')
          );
          return eSum + (isProject ? Number(te.total || 0) : 0);
        }, 0);
        return sum + projSum;
      }, 0);

      setStats({
        totalTimesheets,
        pending: statusCounts.pending,
        approved: statusCounts.approved,
        rejected: statusCounts.rejected,
        totalEmployees,
        projectHours
      });
    } catch (e) {
      setTimesheets([]);
      setStats({
        totalTimesheets: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        totalEmployees: 0,
        projectHours: 0
      });
      try {
        alert('Failed to load timesheets. Please ensure the server is running.');
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  };

  const updateStatsFromList = (list) => {
    const totalTimesheets = list.length;
    const statusCounts = list.reduce((acc, r) => {
      const s = (r.status || '').toLowerCase();
      if (s === 'approved') acc.approved++;
      else if (s === 'rejected') acc.rejected++;
      else acc.pending++;
      return acc;
    }, { approved: 0, rejected: 0, pending: 0 });
    const totalEmployees = stats.totalEmployees; // Keep existing headcount
    const projectHours = list.reduce((sum, r) => {
      const s = (r.status || '').toLowerCase();
      const includeRow = s === 'approved' || s === 'submitted' || s === 'pending';
      const entries = r.timeEntries || [];
      const projSum = entries.reduce((eSum, te) => {
        const typeVal = (te.type || '').toLowerCase();
        const p = (te.project || '').trim();
        const taskVal = (te.task || '').toLowerCase();
        const isProject = typeVal === 'project' || (
          p && p.toLowerCase() !== 'leave' &&
          !taskVal.includes('leave') && !taskVal.includes('holiday')
        );
        return eSum + (isProject ? Number(te.total || 0) : 0);
      }, 0);
      return sum + projSum;
    }, 0);
    setStats({
      totalTimesheets,
      pending: statusCounts.pending,
      approved: statusCounts.approved,
      rejected: statusCounts.rejected,
      totalEmployees,
      projectHours
    });
  };

  useEffect(() => {
    fetchTimesheets();
  }, []);

  useEffect(() => {
    fetchTimesheets();
  }, [filters, allEmployees]);

  const handleFilterChange = (filterName, value) => {
    // Validation for date range
    if (filterName === 'fromDate' && filters.toDate && value > filters.toDate) {
      alert('From Date cannot be greater than To Date');
      return;
    }
    if (filterName === 'toDate' && filters.fromDate && value < filters.fromDate) {
      alert('To Date cannot be less than From Date');
      return;
    }

    setFilters(prev => ({
      ...prev,
      [filterName]: value,
      ...(['division', 'location', 'week', 'year', 'employeeId'].includes(filterName) ? { project: 'All Projects' } : {})
    }));
  };

  const isFilterApplied = () => {
    return (
      filters.employeeId !== '' ||
      filters.division !== 'All Division' ||
      filters.location !== 'All Locations' ||
      filters.status !== 'All Status' ||
      filters.week !== 'All Weeks' ||
      filters.project !== 'All Projects' ||
      filters.year !== 'All Years' ||
      filters.fromDate !== '' ||
      filters.toDate !== ''
    );
  };

  const handleClearFilters = () => {
    setFilters({
      employeeId: '',
      division: 'All Division',
      location: 'All Locations',
      status: 'All Status',
      week: 'All Weeks',
      project: 'All Projects',
      year: 'All Years',
      fromDate: '',
      toDate: ''
    });
  };

  const handleRefresh = () => {
    fetchTimesheets();
  };

  const handleExport = () => {
    if (!timesheets.length) {
      alert('No data to export');
      return;
    }

    // Group data by employee
    const groupedData = timesheets.reduce((acc, ts) => {
      const empId = ts.employeeId || 'Unknown';
      if (!acc[empId]) {
        acc[empId] = {
          id: empId,
          name: ts.employeeName || 'Unknown',
          division: ts.division || '',
          location: ts.location || '',
          status: ts.status || '',
          projects: {},
          totalHours: 0
        };
      }

      // Aggregate project hours
      (ts.timeEntries || []).forEach(entry => {
        const projName = (entry.project || '').trim();
        const taskName = (entry.task || '').toLowerCase();
        
        // Skip Leave entries
        const isLeave = projName.toLowerCase() === 'leave' || 
                        taskName.includes('leave') || 
                        taskName.includes('holiday');
        
        if (isLeave) return;

        const hours = Number(entry.total || 0);
        acc[empId].projects[projName] = (acc[empId].projects[projName] || 0) + hours;
        acc[empId].totalHours += hours;
      });

      return acc;
    }, {});

    // Define CSV headers
    const headers = [
      'Employee ID',
      'Name',
      'Division',
      'Location',
      'Project Name',
      'Project Hours (HH:MM)',
      'Total Employee Hours (HH:MM)',
      'Status'
    ];

    // Format data rows
    const rows = [];
    Object.values(groupedData).forEach(emp => {
      const projectNames = Object.keys(emp.projects);
      
      if (projectNames.length === 0) {
        rows.push({
          'Employee ID': emp.id,
          'Name': emp.name,
          'Division': emp.division,
          'Location': emp.location,
          'Project Name': 'No Projects',
          'Project Hours': '00:00',
          'Total Employee Hours': formatDuration(emp.totalHours),
          'Status': emp.status
        });
      } else {
        projectNames.forEach((proj, index) => {
          rows.push({
            'Employee ID': emp.id,
            'Name': emp.name,
            'Division': emp.division,
            'Location': emp.location,
            'Project Name': proj,
            'Project Hours': formatDuration(emp.projects[proj]),
            'Total Employee Hours': index === 0 ? formatDuration(emp.totalHours) : '',
            'Status': emp.status
          });
        });
      }
    });

    // Create Excel workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Timesheets Summary');

    // Generate and download Excel file
    XLSX.writeFile(workbook, `timesheets_summary_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const showMessage = (title, message, type = 'success') => {
    setMessageDialog({ isOpen: true, title, message, type });
  };

  const closeMessage = () => {
    setMessageDialog({ isOpen: false, title: '', message: '', type: 'success' });
  };

  const openRejectDialog = (timesheetId) => {
    if (!timesheetId) return;
    setRejectDialog({ isOpen: true, timesheetId, reason: '' });
  };

  const closeRejectDialog = () => {
    setRejectDialog({ isOpen: false, timesheetId: null, reason: '' });
  };

  const handleApprove = async (timesheetId) => {
    setActionLoading(prev => ({ ...prev, [timesheetId]: true }));
    try {
      await adminTimesheetAPI.approve(timesheetId);
      setTimesheets(prev => {
        const next = prev.map(ts => ts._id === timesheetId ? { ...ts, status: 'Approved' } : ts);
        updateStatsFromList(next);
        return next;
      });
      window.dispatchEvent(new Event('refreshTimesheetHistory'));
      showMessage('Success', 'Timesheet approved successfully.', 'success');
    } catch (e) {
      showMessage('Error', 'Approve failed. Please try again.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [timesheetId]: false }));
    }
  };

  const handleReject = (timesheetId) => {
    openRejectDialog(timesheetId);
  };

  const submitReject = async () => {
    const timesheetId = rejectDialog.timesheetId;
    const reason = (rejectDialog.reason || '').trim();

    if (!timesheetId) return;
    if (!reason) {
      showMessage('Validation', 'Please enter rejection reason.', 'warning');
      return;
    }

    setActionLoading(prev => ({ ...prev, [timesheetId]: true }));
    try {
      await adminTimesheetAPI.reject(timesheetId, reason);
      setTimesheets(prev => {
        const next = prev.map(ts => ts._id === timesheetId ? { ...ts, status: 'Rejected', rejectionReason: reason } : ts);
        updateStatsFromList(next);
        return next;
      });
      window.dispatchEvent(new Event('refreshTimesheetHistory'));
      closeRejectDialog();
      showMessage('Rejected', 'Timesheet rejected successfully.', 'success');
    } catch (e) {
      showMessage('Error', 'Reject failed. Please try again.', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [timesheetId]: false }));
    }
  };

  const getTimesheetId = (ts) => {
    if (!ts) return null;
    return ts._id || ts.id || (ts._doc && ts._doc._id) || null;
  };

  const handleView = (timesheetId) => {
    const timesheet = timesheets.find(ts => getTimesheetId(ts) === timesheetId);
    if (timesheet) {
      setSelectedTimesheet(timesheet);
      setShowViewModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowViewModal(false);
    setSelectedTimesheet(null);
  };

  const handleApproveFromModal = () => {
    if (selectedTimesheet) {
      handleApprove(selectedTimesheet._id);
      handleCloseModal();
    }
  };

  const handleRejectFromModal = () => {
    if (selectedTimesheet) {
      const id = selectedTimesheet._id;
      handleCloseModal();
      handleReject(id);
    }
  };

  const handleMouseEnter = (type, id) => {
    setHoverStates(prev => ({
      ...prev,
      [type]: { ...prev[type], [id]: true }
    }));
  };

  const handleMouseLeave = (type, id) => {
    setHoverStates(prev => ({
      ...prev,
      [type]: { ...prev[type], [id]: false }
    }));
  };

  const getStatusBadge = (status) => {
    const baseStyle = styles.statusBadge;
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'approved':
        return { ...baseStyle, ...styles.approvedBadge };
      case 'rejected':
        return { ...baseStyle, ...styles.rejectedBadge };
      case 'pending':
      case 'submitted':
        return { ...baseStyle, ...styles.pendingBadge };
      case 'not submitted':
        return { ...baseStyle, ...styles.notSubmittedBadge };
      default:
        return baseStyle;
    }
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={styles.adminTimesheet}>
      {/* Header */}
      {/* <div style={styles.timesheetHeader}>
        <h1 style={styles.headerTitle}>Timesheet Management</h1>
      </div> */}

      {/* Statistics Cards */}
      <div style={styles.statsGrid}>
        {statConfigs.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div 
              key={stat.title}
              style={{
                ...styles.statCard,
                ...(hoverStates.statCards?.[stat.title] ? styles.statCardHover : {})
              }}
              onMouseEnter={() => handleMouseEnter('statCards', stat.title)}
              onMouseLeave={() => handleMouseLeave('statCards', stat.title)}
            >
              <div style={styles.statHeader}>
                <div style={{...styles.statIconContainer, backgroundColor: `${stat.color}20`}}>
                  <IconComponent size={20} color={stat.color} />
                </div>
              </div>
              <h3 style={styles.statTitle}>{stat.title}</h3>
              <p style={styles.statNumber}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Filters Section */}
      {showFilters && (
      <div style={styles.filtersSection}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>
            <Filter size={20} />
            Timesheet Filters
          </h2>
          <div style={styles.actionButtons}>
            {isFilterApplied() && (
              <button
                style={styles.secondaryButton}
                onClick={handleClearFilters}
              >
                <X size={16} />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div style={styles.filtersGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <Search size={14} />
              Employee ID
            </label>
            <select
              style={styles.filterInput}
              value={filters.employeeId}
              onChange={(e) => handleFilterChange('employeeId', e.target.value)}
            >
              {employeeIdOptions.map(id => (
                <option key={id} value={id}>
                  {id === '' ? 'All Employees' : id}
                </option>
              ))}
            </select>
          </div>
          
          {!isProjectManager && (
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <Building size={14} />
                Division
              </label>
              <select
                value={filters.division}
                onChange={(e) => handleFilterChange('division', e.target.value)}
                style={styles.filterInput}
              >
                <option>All Division</option>
                <option>SDS</option>
                <option>TEKLA</option>
                <option>DAS(Software)</option>
                <option>Mechanical</option>
              </select>
            </div>
          )}

          {!isProjectManager && (
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>
                <MapPin size={14} />
                Location
              </label>
              <select
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                style={styles.filterInput}
              >
                <option>All Locations</option>
                <option>Chennai</option>
                <option>Hosur</option>
              </select>
            </div>
          )}

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FileText size={14} />
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={styles.filterInput}
            >
              <option>All Status</option>
              <option value="Submitted">Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
              <option>Not Submitted</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  <Calendar size={14} />
                  Year
                </label>
                <select
                  style={styles.filterInput}
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div style={styles.filterGroup}>
                <label style={styles.filterLabel}>
                  <Calendar size={14} />
                  Week
                </label>
            <select
              value={filters.week}
              onChange={(e) => handleFilterChange('week', e.target.value)}
              style={styles.filterInput}
            >
              {weekOptions.map(week => (
                <option key={week} value={week}>{week}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <FolderOpen size={14} />
              Project
            </label>
            <select
              value={filters.project}
              onChange={(e) => handleFilterChange('project', e.target.value)}
              style={styles.filterInput}
            >
              {projectOptions.map(p => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <Calendar size={14} />
              From Date
            </label>
            <input
              type="date"
              style={styles.filterInput}
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.filterLabel}>
              <Calendar size={14} />
              To Date
            </label>
            <input
              type="date"
              style={styles.filterInput}
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
            />
          </div>
        </div>
      </div>
      )}

      {/* Timesheets Table */}
      <div style={styles.timesheetsTableSection}>
        <div style={styles.tableHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              <FileText size={20} />
              Submitted Timesheets
            </h2>
            <span style={{color: '#718096', fontSize: '14px', marginLeft: '28px'}}>
              {timesheets.length} records
            </span>
          </div>
          <div style={styles.actionButtons}>
            <button
              style={styles.secondaryButton}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <button 
              style={{
                ...styles.secondaryButton,
                ...(hoverStates.refreshButton?.refresh ? styles.secondaryButtonHover : {}),
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={() => handleMouseEnter('refreshButton', 'refresh')}
              onMouseLeave={() => handleMouseLeave('refreshButton', 'refresh')}
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button 
              style={styles.primaryButton}
              onClick={handleExport}
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.timesheetsTable}>
            <thead>
              <tr>
                <th style={styles.tableHeaderCell}>Employee ID</th>
                <th style={styles.tableHeaderCell}>Name</th>
                <th style={styles.tableHeaderCell}>Division</th>
                <th style={styles.tableHeaderCell}>Location</th>
                <th style={styles.tableHeaderCell}>Week</th>
                <th style={styles.tableHeaderCell}>Projects</th>
                <th style={styles.tableHeaderCell}>Total Hours (HH:MM)</th>
                <th style={styles.tableHeaderCell}>Status</th>
                <th style={styles.tableHeaderCell}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{...styles.tableCell, textAlign: 'center', padding: '40px'}}>
                    <div style={{color: '#718096', fontSize: '16px'}}>
                      No timesheets found
                    </div>
                  </td>
                </tr>
              ) : (
                timesheets.map(timesheet => (
                      <tr 
                    key={getTimesheetId(timesheet) || `${timesheet.employeeId || 'UNKNOWN'}|${timesheet.week || 'UNKNOWN'}`}
                    style={{
                      ...styles.tableRow,
                      ...(hoverStates.tableRows?.[timesheet._id] ? styles.tableRowHover : {})
                    }}
                    onMouseEnter={() => handleMouseEnter('tableRows', timesheet._id)}
                    onMouseLeave={() => handleMouseLeave('tableRows', timesheet._id)}
                  >
                    <td style={styles.tableCell}>
                      <div style={{fontWeight: '500', color: '#4299e1'}}>
                        {timesheet.employeeId || '—'}
                      </div>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{fontWeight: '500'}}>{timesheet.employeeName}</div>
                    </td>
                    <td style={styles.tableCell}>{timesheet.division}</td>
                    <td style={styles.tableCell}>{timesheet.location}</td>
                    <td style={styles.tableCell}>{timesheet.week || '—'}</td>
                    <td style={styles.tableCell}>
                      {(() => {
                        const projects = (timesheet.timeEntries || []).map(entry => entry.project).filter(Boolean);
                        return projects.length ? projects.join(', ') : '—';
                      })()}
                    </td>
                    <td style={styles.tableCell}>
                      <div style={{fontWeight: '600'}}>{formatDuration(timesheet.weeklyTotal || 0)}</div>
                    </td>
                    <td style={styles.tableCell}>
                      <span style={getStatusBadge(timesheet.status)}>
                        {timesheet.status === 'Submitted' ? 'Pending' : (timesheet.status || '—')}
                      </span>
                    </td>
                    <td style={styles.tableCell}>
                      <div style={styles.actions}>
                        <button 
                          style={styles.viewBtn}
                          onClick={() => handleView(getTimesheetId(timesheet))}
                          title="View Details"
                        >
                          <Eye size={12} />
                        </button>
                        {(!['approved','rejected', 'not submitted'].includes((timesheet.status || '').toLowerCase())) && (
                          <>
                            <button 
                              style={styles.rejectBtn}
                              onClick={() => handleReject(getTimesheetId(timesheet))}
                              disabled={!!actionLoading[getTimesheetId(timesheet)]}
                              title="Reject"
                            >
                              {actionLoading[getTimesheetId(timesheet)] ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : (
                                <XCircle size={12} />
                              )}
                            </button>
                            <button 
                              style={styles.approveBtn}
                              onClick={() => handleApprove(getTimesheetId(timesheet))}
                              disabled={!!actionLoading[getTimesheetId(timesheet)]}
                              title="Approve"
                            >
                              {actionLoading[getTimesheetId(timesheet)] ? (
                                <Loader2 className="animate-spin" size={12} />
                              ) : (
                                <CheckCircle size={12} />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Timesheet Modal */}
      {showViewModal && selectedTimesheet && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                Timesheet Details - {selectedTimesheet.employeeName}
              </h2>
              <button 
                style={styles.closeButton}
                onClick={handleCloseModal}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Basic Information Grid */}
            <div style={styles.detailGrid}>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Employee ID</div>
                <div style={styles.detailValue}>{selectedTimesheet.employeeId}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Employee Name</div>
                <div style={styles.detailValue}>{selectedTimesheet.employeeName}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Division</div>
                <div style={styles.detailValue}>{selectedTimesheet.division}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Location</div>
                <div style={styles.detailValue}>{selectedTimesheet.location}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Week</div>
                <div style={styles.detailValue}>{selectedTimesheet.week}</div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Status</div>
                <div>
                  <span style={getStatusBadge(selectedTimesheet.status)}>
                    {selectedTimesheet.status}
                  </span>
                </div>
              </div>
              <div style={styles.detailCard}>
                <div style={styles.detailLabel}>Submitted Date</div>
                <div style={styles.detailValue}>{selectedTimesheet.submittedDate}</div>
              </div>
            </div>

            {/* Time Entries Table */}
            <div style={styles.timeEntriesTableSection}>
              <h3 style={styles.timeEntriesTitle}>Time Entries</h3>
              <div style={styles.tableContainer}>
                <table style={styles.timeEntriesTable}>
                  <thead>
                    <tr>
                      <th style={{...styles.timeEntriesHeaderCell, textAlign: 'left'}}>Projects</th>
                      <th style={{...styles.timeEntriesHeaderCell, textAlign: 'left'}}>Task</th>
                      {shortDays.map(day => (
                        <th key={day} style={styles.timeEntriesHeaderCell}>{day}</th>
                      ))}
                      <th style={styles.timeEntriesHeaderCell}>Total (HH:MM)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTimesheet?.timeEntries || []).map((entry, index) => (
                      <tr key={index}>
                        <td style={{...styles.timeEntriesCell, textAlign: 'left'}}>{entry.project}</td>
                        <td style={{...styles.timeEntriesCell, textAlign: 'left'}}>{entry.task}</td>
                        <td style={styles.timeEntriesCell}>{entry.monday > 0 ? formatDuration(entry.monday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.tuesday > 0 ? formatDuration(entry.tuesday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.wednesday > 0 ? formatDuration(entry.wednesday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.thursday > 0 ? formatDuration(entry.thursday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.friday > 0 ? formatDuration(entry.friday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.saturday > 0 ? formatDuration(entry.saturday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>{entry.sunday > 0 ? formatDuration(entry.sunday) : '-'}</td>
                        <td style={styles.timeEntriesCell}>
                          <div style={{fontWeight: '600'}}>{formatDuration(entry.total)}</div>
                        </td>
                      </tr>
                    ))}
                    {/* Weekly Total Row */}
                    <tr>
                      <td 
                        colSpan="9" 
                        style={{
                          ...styles.totalHoursCell, 
                          textAlign: 'right',
                          fontWeight: '600',
                          backgroundColor: '#f7fafc'
                        }}
                      >
                        Weekly Total:
                      </td>
                      <td style={styles.totalHoursCell}>
                        <div style={{fontWeight: '700', color: '#2d3748'}}>
                          {formatDuration(selectedTimesheet.weeklyTotal)}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Rejection Reason */}
            {selectedTimesheet.status === 'Rejected' && selectedTimesheet.rejectionReason && (
              <div style={{...styles.detailCard, borderColor: '#f56565', backgroundColor: '#fed7d7'}}>
                <div style={{...styles.detailLabel, color: '#742a2a'}}>Rejection Reason</div>
                <div style={{color: '#742a2a', fontSize: '14px'}}>
                  {selectedTimesheet.rejectionReason}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div style={styles.modalActions}>
              <button 
                style={styles.secondaryButton}
                onClick={handleCloseModal}
              >
                Close
              </button>
              {(['submitted','pending'].includes((selectedTimesheet.status || '').toLowerCase())) && (
                <>
                  <button 
                    style={styles.rejectBtn}
                    onClick={handleRejectFromModal}
                    disabled={!!actionLoading[selectedTimesheet._id]}
                  >
                    {actionLoading[selectedTimesheet._id] ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle size={14} />
                        Reject
                      </>
                    )}
                  </button>
                  <button 
                    style={styles.approveBtn}
                    onClick={() => handleApprove(selectedTimesheet._id)}
                    disabled={!!actionLoading[selectedTimesheet._id]}
                  >
                    {actionLoading[selectedTimesheet._id] ? (
                      <>
                        <Loader2 className="animate-spin" size={14} />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} />
                        Approve
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {rejectDialog.isOpen && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: '520px' }}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Reject Timesheet</h2>
              <button
                style={styles.closeButton}
                onClick={closeRejectDialog}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '14px', color: '#4a5568', fontSize: '14px' }}>
              Enter rejection reason
            </div>

            <textarea
              value={rejectDialog.reason}
              onChange={(e) => setRejectDialog(prev => ({ ...prev, reason: e.target.value }))}
              style={styles.textarea}
              placeholder="Type reason..."
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                style={styles.cancelButton}
                onClick={closeRejectDialog}
                disabled={!!actionLoading[rejectDialog.timesheetId]}
              >
                Cancel
              </button>
              <button
                style={{
                  ...styles.rejectBtn,
                  ...((!!actionLoading[rejectDialog.timesheetId] || !(rejectDialog.reason || '').trim()) ? { opacity: 0.6, cursor: 'not-allowed' } : {})
                }}
                onClick={submitReject}
                disabled={!!actionLoading[rejectDialog.timesheetId] || !(rejectDialog.reason || '').trim()}
              >
                {actionLoading[rejectDialog.timesheetId] ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    Reject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {messageDialog.isOpen && (
        <div style={styles.messageOverlay}>
          <div style={{ ...styles.modalContent, maxWidth: '460px' }}>
            <div style={styles.modalHeader}>
              <h2 style={styles.messageTitle}>{messageDialog.title}</h2>
              <button
                style={styles.closeButton}
                onClick={closeMessage}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div style={styles.messageText}>{messageDialog.message}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
              <button style={styles.secondaryButton} onClick={closeMessage}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTimesheet;
