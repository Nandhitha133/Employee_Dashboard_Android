import React, { useEffect, useState } from 'react';
import { leaveAPI } from '../../services/api';
import * as XLSX from 'xlsx';

const LeaveSummary = () => {
  // Get current year and month
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12 for January-December

  const getIsMobile = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  };

  const [isMobile, setIsMobile] = useState(getIsMobile);
  const [showFilters, setShowFilters] = useState(() => !getIsMobile());

  // State for filters
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedLeaveType, setSelectedLeaveType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // State to track if any filter is applied
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  // State for refresh loading
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate years (current year and previous 5 years)
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Months
  const months = [
    { value: 1, name: 'January' },
    { value: 2, name: 'February' },
    { value: 3, name: 'March' },
    { value: 4, name: 'April' },
    { value: 5, name: 'May' },
    { value: 6, name: 'June' },
    { value: 7, name: 'July' },
    { value: 8, name: 'August' },
    { value: 9, name: 'September' },
    { value: 10, name: 'October' },
    { value: 11, name: 'November' },
    { value: 12, name: 'December' }
  ];

  // Locations - Only Hosur and Chennai
  const locations = ['Hosur', 'Chennai'];

  const leaveTypes = ['Casual Leave', 'Sick Leave', 'Privilege Leave', 'Bereavement Leave', 'Regional Holiday'];

  // Status options
  const statusOptions = ['Approved', 'Pending', 'Rejected'];

  const [leaveApplications, setLeaveApplications] = useState([]);
  const [actionLoading, setActionLoading] = useState({});

  const loadLeaves = async () => {
    try {
      const res = await leaveAPI.list();
      const items = Array.isArray(res.data) ? res.data : [];
      const mapped = items.map(l => ({
        id: l._id,
        employeeName: l.employeeName || l.name || '',
        employeeId: l.employeeId || '',
        leaveType: l.leaveType === 'CL'
          ? 'Casual Leave'
          : l.leaveType === 'SL'
            ? 'Sick Leave'
            : l.leaveType === 'PL'
              ? 'Privilege Leave'
              : l.leaveType === 'BEREAVEMENT'
                ? 'Bereavement Leave'
                : l.leaveType === 'REGIONAL_HOLIDAY'
                  ? `Regional Holiday${l.regionalHolidayName ? ` - ${l.regionalHolidayName}` : ''}`
                  : l.leaveType,
        // Keep raw dates for accurate month-overlap filtering
        startDateRaw: l.startDate,
        endDateRaw: l.endDate,
        fromDate: new Date(l.startDate).toLocaleDateString('en-IN'),
        toDate: new Date(l.endDate).toLocaleDateString('en-IN'),
        fromMonth: new Date(l.startDate).getMonth() + 1,
        fromYear: new Date(l.startDate).getFullYear(),
        days: l.totalDays || 0,
        totalLeaveDays: l.totalDays || 0,
        status: l.status || 'Pending',
        location: l.location || l.branch || '—',
        documentUrl: l.documentUrl || ''
      }));
      setLeaveApplications(mapped);
    } catch {
      setLeaveApplications([]);
    }
  };

  useEffect(() => {
    loadLeaves();
    const timer = setInterval(loadLeaves, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 768px)');

    const apply = (matches) => {
      setIsMobile(matches);
      if (!matches) setShowFilters(true);
      if (matches) setShowFilters(false);
    };

    apply(mq.matches);

    const onChange = (e) => apply(e.matches);
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
    else mq.addListener(onChange);

    return () => {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onChange);
      else mq.removeListener(onChange);
    };
  }, []);

  // Check if any filter is applied
  useEffect(() => {
    const isApplied = selectedYear !== 'all' ||
      selectedMonth !== 'all' ||
      selectedEmployeeId !== '' ||
      selectedLeaveType !== 'all' ||
      selectedLocation !== 'all' ||
      selectedStatus !== 'all';
    setIsFilterApplied(isApplied);
  }, [selectedYear, selectedMonth, selectedEmployeeId, selectedLeaveType, selectedLocation, selectedStatus]);

  // Helper: does leave overlap selected month/year?
  const overlapsSelectedMonth = (startISO, endISO, year, month) => {
    if (year === 'all' || month === 'all') return true;
    const leaveStart = new Date(startISO);
    const leaveEnd = new Date(endISO);
    // Month window boundaries
    const windowStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const windowEnd = new Date(year, month, 0, 23, 59, 59, 999);
    return leaveStart <= windowEnd && leaveEnd >= windowStart;
  };

  // Filter leave applications based on all filter criteria
  const filteredApplications = leaveApplications.filter(app => {
    const matchesMonthWindow = overlapsSelectedMonth(app.startDateRaw, app.endDateRaw, selectedYear, selectedMonth);

    const matchesEmployeeId = selectedEmployeeId === '' ||
      (app.employeeId || '').toLowerCase().includes(selectedEmployeeId.toLowerCase());
    const matchesLeaveType = selectedLeaveType === 'all' || app.leaveType === selectedLeaveType;
    const matchesLocation = selectedLocation === 'all' || app.location === selectedLocation;
    const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
    return matchesMonthWindow && matchesEmployeeId && matchesLeaveType && matchesLocation && matchesStatus;
  }).sort((a, b) => {
    // Sort by Employee ID ascending
    const idA = (a.employeeId || '').toString().toLowerCase();
    const idB = (b.employeeId || '').toString().toLowerCase();
    if (idA < idB) return -1;
    if (idA > idB) return 1;
    return 0;
  });

  // Calculate total leave days for filtered applications
  const totalLeaveDays = filteredApplications.reduce((sum, app) => sum + app.days, 0);

  // Handle filter change
  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'year':
        setSelectedYear(value);
        break;
      case 'month':
        setSelectedMonth(value);
        break;
      case 'employeeId':
        setSelectedEmployeeId(value);
        break;
      case 'leaveType':
        setSelectedLeaveType(value);
        break;
      case 'location':
        setSelectedLocation(value);
        break;
      case 'status':
        setSelectedStatus(value);
        break;
      default:
        break;
    }

  };
  // Handle clear all filters
  const handleClearAllFilters = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
    setSelectedEmployeeId('');
    setSelectedLeaveType('all');
    setSelectedLocation('all');
    setSelectedStatus('all');
    setIsFilterApplied(false);
  };

  // Handle refresh (reload data without resetting filters)
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadLeaves();
    setIsRefreshing(false);
  };



  // Handle approve/reject actions
  const handleApprove = async (id) => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: 'approve' }));
      const res = await leaveAPI.updateStatus(id, 'Approved');
      const updated = res.data;
      setLeaveApplications(prev => prev.map(a => a.id === id ? { ...a, status: updated.status } : a));
    } catch {
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleReject = async (id) => {
    try {
      setActionLoading(prev => ({ ...prev, [id]: 'reject' }));
      const res = await leaveAPI.updateStatus(id, 'Rejected');
      const updated = res.data;
      setLeaveApplications(prev => prev.map(a => a.id === id ? { ...a, status: updated.status } : a));
    } catch {
    } finally {
      setActionLoading(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  // Handle Excel download
  const handleDownloadExcel = () => {
    const selectedMonthName = months.find(m => m.value === selectedMonth)?.name || 'All Months';
    const data = filteredApplications.map(app => ({
      'S.No': filteredApplications.indexOf(app) + 1,
      'Employee ID': app.employeeId,
      'Employee Name': app.employeeName,
      'Leave Type': app.leaveType,
      'Start Date': app.fromDate,
      'End Date': app.toDate,
      'Total Leave Days': app.totalLeaveDays,
      'Status': app.status,
      'Location': app.location
    }));

    // Create a new workbook and a worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Adjust column widths
    const colWidths = [
      { wch: 6 },  // S.No
      { wch: 12 }, // Employee ID
      { wch: 20 }, // Employee Name
      { wch: 15 }, // Leave Type
      { wch: 12 }, // Start Date
      { wch: 12 }, // End Date
      { wch: 15 }, // Total Leave Days
      { wch: 12 }, // Status
      { wch: 15 }  // Location
    ];
    ws['!cols'] = colWidths;

    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Leave Summary');

    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `Leave_Summary_${selectedMonthName}_${selectedYear}.xlsx`);
  };

  const containerStyle = {
    padding: isMobile ? '12px' : '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: '#f8f9fa',
    minHeight: '100vh'
  };

  const headerStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  };

  const headerTitleStyle = {
    fontSize: '25px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0'
  };

  const refreshButtonStyle = {
    padding: '10px 20px',
    backgroundColor: '#262760',
    color: 'white',

    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: isMobile ? '14px' : '25px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  };

  // Filters section style - moved to top of table
  const filtersSectionStyle = {
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    padding: isMobile ? '14px' : '20px',
    marginBottom: '20px',
    border: '1px solid #e9ecef',
    position: isMobile ? 'relative' : 'sticky',
    top: isMobile ? undefined : 0,
    zIndex: isMobile ? 'auto' : 100,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  const filtersGridStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px'
  };

  const filterGroupStyle = {
    marginBottom: '0'
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '8px',
    display: 'block',
    color: '#34495e'
  };

  const inputStyle = {
    padding: '10px 12px',
    border: '1px solid #dfe6e9',
    borderRadius: '6px',
    fontSize: '14px',
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#fdfdfd',
    transition: 'border 0.2s'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px'
  };

  // Blue header only - all headers same blue color
  const thStyle = {
    padding: isMobile ? '10px' : '14px',
    textAlign: 'left',
    borderBottom: '2px solid #e9ecef',
    fontWeight: '600',
    fontSize: '14px',
    color: 'white',
    position: isMobile ? 'static' : 'sticky',
    top: isMobile ? undefined : 0,
    backgroundColor: '#262760', // Sidebar blue color for all headers
    zIndex: 10

  };

  const tdStyle = {
    padding: isMobile ? '10px' : '14px',
    borderBottom: '1px solid #e9ecef',
    fontSize: '14px',
    color: '#2c3e50'
  };

  const statusBadgeStyle = (status) => {
    const baseStyle = {
      padding: '5px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    };

    switch (status.toLowerCase()) {
      case 'approved':
        return { ...baseStyle, backgroundColor: '#e7f6ec', color: '#0a5c36' };
      case 'pending':
        return { ...baseStyle, backgroundColor: '#fff8e1', color: '#b36b00' };
      case 'rejected':
        return { ...baseStyle, backgroundColor: '#ffebee', color: '#c62828' };
      default:
        return { ...baseStyle, backgroundColor: '#f5f5f5', color: '#616161' };
    }
  };

  const buttonStyle = {
    padding: '7px 14px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    margin: '0 4px',
    transition: 'all 0.2s'
  };

  const approveButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#27ae60',
    color: 'white'
  };

  const rejectButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#e74c3c',
    color: 'white'
  };

  const downloadButtonStyle = {
    padding: '12px 24px',
    backgroundColor: '#262760',
    color: 'white',

    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s'
  };

  const clearAllButtonStyle = {
    padding: '10px 20px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const totalStyle = {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '6px',
    marginTop: '20px',
    fontSize: '16px',
    fontWeight: '600',
    textAlign: 'right',
    color: '#2c3e50',
    borderLeft: '4px solid #262760'
  };


  const Spinner = ({ color = '#fff' }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" style={{ display: 'inline-block' }}>
      <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" fill="none" opacity="0.25" />
      <path d="M12 2 A10 10 0 0 1 22 12" stroke={color} strokeWidth="3" fill="none">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </path>
    </svg>
  );

  const filterHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'flex-start' : 'center',
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? '10px' : undefined,
    marginBottom: '15px'
  };

  const filterTitleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0'
  };

  const resultsCountStyle = {
    fontSize: '13px',
    color: '#7f8c8d',
    backgroundColor: '#f8f9fa',
    padding: '5px 12px',
    borderRadius: '4px'
  };

  const filterButtonsStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px'
  };

  const mobileToggleFiltersButtonStyle = {
    padding: '10px 12px',
    border: '1px solid #dfe6e9',
    backgroundColor: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '600',
    color: '#2c3e50',
    width: '100%'
  };

  // Table header style with refresh button
  const tableHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: isMobile ? 'stretch' : 'center',
    flexDirection: isMobile ? 'column' : 'row',
    gap: isMobile ? '10px' : undefined,
    marginBottom: '15px'
  };

  const tableTitleStyle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2c3e50',
    margin: '0'
  };

  return (
    <div style={containerStyle}>


      {/* Filters Section - Now at the top of the table */}
      <div style={filtersSectionStyle}>
        <div style={filterHeaderStyle}>
          <h2 style={filterTitleStyle}>Filters</h2>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <div style={resultsCountStyle}>
              {filteredApplications.length} applications found
            </div>
            {isMobile && (
              <button
                type="button"
                style={mobileToggleFiltersButtonStyle}
                onClick={() => setShowFilters(v => !v)}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
            )}
          </div>
        </div>

        {(!isMobile || showFilters) && (
          <div style={filtersGridStyle}>
            <div style={filterGroupStyle}>
              <label style={labelStyle}>Year</label>
              <select
                style={selectStyle}
                value={selectedYear}
                onChange={(e) => handleFilterChange('year', e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">All Years</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div style={filterGroupStyle}>
              <label style={labelStyle}>Month</label>
              <select
                style={selectStyle}
                value={selectedMonth}
                onChange={(e) => handleFilterChange('month', e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">All Months</option>
                {months.map(month => (
                  <option key={month.value} value={month.value}>{month.name}</option>
                ))}
              </select>
            </div>

            <div style={filterGroupStyle}>
              <label style={labelStyle}>Employee ID</label>
              <input
                type="text"
                placeholder="Enter employee ID..."
                style={inputStyle}
                value={selectedEmployeeId}
                onChange={(e) => handleFilterChange('employeeId', e.target.value)}
              />
            </div>

            <div style={filterGroupStyle}>
              <label style={labelStyle}>Leave Type</label>
              <select
                style={selectStyle}
                value={selectedLeaveType}
                onChange={(e) => handleFilterChange('leaveType', e.target.value)}
              >
                <option value="all">All Types</option>
                {leaveTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div style={filterGroupStyle}>
              <label style={labelStyle}>Location</label>
              <select
                style={selectStyle}
                value={selectedLocation}
                onChange={(e) => handleFilterChange('location', e.target.value)}
              >
                <option value="all">All Locations</option>
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>

            <div style={filterGroupStyle}>
              <label style={labelStyle}>Status</label>
              <select
                style={selectStyle}
                value={selectedStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Status</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Show Clear All button only when filters are applied */}
            {isFilterApplied && (
              <div style={{ ...filterGroupStyle, display: 'flex', alignItems: 'flex-end' }}>
                <button
                  style={{ ...clearAllButtonStyle, width: '100%', justifyContent: 'center' }}
                  onClick={handleClearAllFilters}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
                >
                  <span>✕</span> Clear Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Leave Applications Card */}
      <div style={cardStyle}>
        {/* Table Header with Refresh Button and Download Button */}
        <div style={tableHeaderStyle}>
          <button
            style={{
              ...refreshButtonStyle,
              width: isMobile ? '100%' : undefined,
              justifyContent: isMobile ? 'center' : undefined,
              opacity: isRefreshing ? 0.7 : 1,
              cursor: isRefreshing ? 'not-allowed' : 'pointer'
            }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            onMouseOver={(e) => !isRefreshing && (e.target.style.backgroundColor = '#1e2050')}
            onMouseOut={(e) => !isRefreshing && (e.target.style.backgroundColor = '#262760')}

          >
            {isRefreshing ? (
              <>
                <Spinner color="white" /> Refreshing...
              </>
            ) : (
              <>
                <span>↻</span> Refresh
              </>
            )}
          </button>

          <button
            style={{ ...downloadButtonStyle, width: isMobile ? '100%' : undefined }}
            onClick={handleDownloadExcel}
            onMouseOver={(e) => e.target.style.backgroundColor = '#1e2050'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#262760'}

          >
            Download Excel Report
          </button>
        </div>

        {/* Leave Applications Table */}
        <div style={{ overflowX: 'auto', maxHeight: isMobile ? 'none' : '600px', overflowY: isMobile ? 'visible' : 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>S.No</th>
                <th style={thStyle}>Employee ID</th>
                <th style={thStyle}>Employee Name</th>
                <th style={thStyle}>Leave Type</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Start Date</th>
                <th style={thStyle}>End Date</th>
                <th style={thStyle}>Total Leave Days ({selectedYear})</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.length > 0 ? (
                filteredApplications.map((app, index) => (
                  <tr key={app.id}>
                    <td style={tdStyle}>{index + 1}</td>
                    <td style={tdStyle}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: '600',
                        color: '#262760'
                      }}>
                        {app.employeeId}
                      </span>
                    </td>
                    <td style={tdStyle}>{app.employeeName}</td>
                    <td style={tdStyle}>{app.leaveType}</td>
                    <td style={tdStyle}>
                      <span style={{
                        backgroundColor: '#f1f8ff',
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '13px'
                      }}>
                        {app.location}
                      </span>
                    </td>
                    <td style={tdStyle}>{app.fromDate}</td>
                    <td style={tdStyle}>{app.toDate}</td>

                    <td style={tdStyle}>
                      <span style={{
                        fontWeight: 'bold',
                        color: '#27ae60',
                        backgroundColor: '#e7f6ec',
                        padding: '5px 12px',
                        borderRadius: '4px',
                        display: 'inline-block'
                      }}>
                        {app.totalLeaveDays} days
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={statusBadgeStyle(app.status)}>
                        {app.status}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {app.status === 'Pending' && (
                        <div>
                          <button
                            style={{
                              ...approveButtonStyle,
                              opacity: actionLoading[app.id] ? 0.8 : 1,
                              cursor: actionLoading[app.id] ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            disabled={!!actionLoading[app.id]}
                            onClick={() => handleApprove(app.id)}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#219653'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#27ae60'}
                          >
                            {actionLoading[app.id] === 'approve' ? (<><Spinner /><span>Approving...</span></>) : 'Approve'}
                          </button>
                          <button
                            style={{
                              ...rejectButtonStyle,
                              opacity: actionLoading[app.id] ? 0.8 : 1,
                              cursor: actionLoading[app.id] ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            disabled={!!actionLoading[app.id]}
                            onClick={() => handleReject(app.id)}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
                          >
                            {actionLoading[app.id] === 'reject' ? (<><Spinner /><span>Rejecting...</span></>) : 'Reject'}
                          </button>
                        </div>
                      )}
                      {app.status !== 'Pending' && (
                        <span style={{ color: '#95a5a6', fontSize: '13px' }}>Completed</span>
                      )}
                      {app.documentUrl && (
                        <div>
                          <a
                            href={`${(typeof window !== 'undefined' ? (process.env.REACT_APP_API_BASE || 'http://localhost:5003/api').replace('/api','') : '')}${app.documentUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '8px',
                              fontSize: '12px',
                              color: '#262760',
                              fontWeight: '600',
                              textDecoration: 'underline'
                            }}
                          >
                            <span>📄</span> View Medical Certificate
                          </a>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ ...tdStyle, textAlign: 'center', padding: '40px' }}>
                    <div style={{ color: '#7f8c8d', fontSize: '16px' }}>
                      No leave applications found matching your filters.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total Summary */}
        {filteredApplications.length > 0 && (
          <div style={totalStyle}>
            Total Leave Days: {totalLeaveDays} days ({filteredApplications.length} applications)
          </div>
        )}

        {/* Download Excel Button */}

      </div>
    </div>
  );
};

export default LeaveSummary;
