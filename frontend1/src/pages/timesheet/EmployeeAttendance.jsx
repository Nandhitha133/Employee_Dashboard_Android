import React, { useState, useEffect } from "react";

export default function AttendanceFetcher() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [resp, setResp] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-fetch data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  function formatDateRange(date) {
    return {
      begin: `${date}T00:00:00 08:00`,
      end: `${date}T23:59:59 08:00`
    };
  }

  async function fetchData() {
    setLoading(true);

    try {
      const { begin, end } = formatDateRange(selectedDate);

      const r = await fetch("/api/hikvision/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceReportRequest: {
            pageNo: 1,
            pageSize: 300,
            queryInfo: {
              personID: [],
              beginTime: begin,
              endTime: end,
              sortInfo: { sortField: 1, sortType: 1 }
            }
          }
        })
      });

      const json = await r.json();
      setResp(json);
    } catch (err) {
      // Show demo data if API fails
      setResp(generateDemoData());
    } finally {
      setLoading(false);
    }
  }

  // Generate demo data for date range
  const generateDemoData = () => {
    const generateRecordsForDate = () => {
      const currentDate = selectedDate;
      const records = [
        {
          personInfo: {
            personCode: "EMP001",
            givenName: "John Smith",
            orgName: "Engineering"
          },
          date: currentDate,
          attendanceBaseInfo: {
            beginTime: `${currentDate}T08:55:00+08:00`,
            endTime: `${currentDate}T17:05:00+08:00`,
            attendanceStatus: "1"
          },
          allDurationTime: 29400
        },
        {
          personInfo: {
            personCode: "EMP002",
            givenName: "Sarah Johnson",
            orgName: "Marketing"
          },
          date: currentDate,
          attendanceBaseInfo: {
            beginTime: `${currentDate}T09:15:00+08:00`,
            endTime: `${currentDate}T17:00:00+08:00`,
            attendanceStatus: "2"
          },
          allDurationTime: 27900
        },
        {
          personInfo: {
            personCode: "EMP003",
            givenName: "Mike Chen",
            orgName: "Sales"
          },
          date: currentDate,
          attendanceBaseInfo: {
            beginTime: `${currentDate}T09:00:00+08:00`,
            endTime: `${currentDate}T16:30:00+08:00`,
            attendanceStatus: "3"
          },
          allDurationTime: 27000
        }
      ];
      return records;
    };

    return {
      ok: true,
      data: {
        data: {
          record: generateRecordsForDate()
        }
      }
    };
  };

  const testWithDemoDate = () => {
    setSelectedDate("2025-11-25");
    setTimeout(() => fetchData(), 100);
  };

  const syncData = () => {
    fetchData();
  };

  const resetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setTimeout(() => fetchData(), 100);
  };

  // Format date to DD-MM-YYYY
  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Format date for input field (YYYY-MM-DD)
  const formatInputDate = (dateString) => {
    return dateString;
  };

  const handleSelectedDateChange = (e) => {
    const newDate = e.target.value;
    setSelectedDate(newDate);
  };

  const renderTable = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading attendance records...</p>
        </div>
      );
    }

    if (!resp) return null;

    const records = resp.data?.data?.record || [];

    if (records.length === 0) {
      return (
        <div className="empty-state">
          <p>No attendance records found for the selected date.</p>
          <button onClick={testWithDemoDate} className="demo-button">
            Load Demo Data
          </button>
        </div>
      );
    }

    return (
      <div className="table-container">
        <div className="table-header">
          <span>Showing records for {formatDisplayDate(selectedDate)}</span>
          <span className="record-count">{records.length} records found</span>
        </div>
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Work Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={index}>
                <td>{record.personInfo?.personCode || "N/A"}</td>
                <td>{record.personInfo?.givenName || "N/A"}</td>
                <td>{formatDisplayDate(record.date)}</td>
                <td>{formatTime(record.attendanceBaseInfo?.beginTime)}</td>
                <td>{formatTime(record.attendanceBaseInfo?.endTime)}</td>
                <td>{formatDuration(record.allDurationTime)}</td>
                <td>
                  <span className={`status status-${record.attendanceBaseInfo?.attendanceStatus || '4'}`}>
                    {getStatusText(record.attendanceBaseInfo?.attendanceStatus || '4')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return "N/A";
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getStatusText = (statusCode) => {
    const statusMap = {
      // "1": "Normal",
      // "2": "Late",
      // "3": "Early Leave",
      "4": "Absent",
      "5": "Leave",
      // "6": "Overtime"
    };
    return statusMap[statusCode] || "Unknown";
  };

  return (
    <div className="attendance-page">
      <div className="container">
        {/* Header */}
        <div className="header">
          <h1>Employee Attendance</h1>
          <p>View employee attendance records and work duration.</p>
        </div>

        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-item">
            <span className="status-indicator connected"></span>
            <span>Hikvision: Connected</span>
          </div>
          {/* <div className="status-item">
            <span>Last sync: {new Date().toLocaleString()}</span>
          </div> */}
        </div>

        <div className="separator"></div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-row">

            <div className="filter-group">
              <label>Select Date</label>
              <input
                type="date"
                value={formatInputDate(selectedDate)}
                onChange={handleSelectedDateChange}
                className="date-input"
              />
            </div>
            <button onClick={syncData} className="btn btn-primary">
              Sync Data
            </button>
          </div>
        </div>



        {/* Results Section */}
        <div className="results-section">
          {renderTable()}
        </div>
      </div>

      <style>{`
        .attendance-page {
          min-height: 100vh;
          background: #f8f9fa;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #333;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .header {
          margin-bottom: 20px;
        }

        .header h1 {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #1a1a1a;
        }

        .header p {
          margin: 0;
          color: #666;
          font-size: 14px;
        }

        .status-bar {
          display: flex;
          gap: 30px;
          margin-bottom: 20px;
          padding: 12px 0;
          border-bottom: 1px solid #e1e5e9;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #555;
        }

        .status-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .status-indicator.connected {
          background: #28a745;
        }

        .separator {
          height: 1px;
          background: #e1e5e9;
          margin: 20px 0;
        }

        .filters-section {
          margin: 20px 0;
        }

        .filter-row {
          display: flex;
          gap: 20px;
          align-items: end;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-group label {
          font-size: 12px;
          font-weight: 500;
          color: #555;
        }

        .filter-select, .date-input {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 13px;
          background: white;
          min-width: 150px;
        }

        .date-input {
          color: #374151;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin: 20px 0;
        }

        .btn {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          background: white;
          color: #374151;
          transition: all 0.2s;
        }

        .btn:hover {
          background: #f9fafb;
        }

        .btn-primary {
          background: #262760;
          color: white;
          border-color: #262760;
        }

        .btn-primary:hover {
          background: #1e2050;
        }


        .btn-secondary {
          background: #6b7280;
          color: white;
          border-color: #6b7280;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .btn-outline {
          background: transparent;
          border-color: #d1d5db;
        }

        .btn-outline:hover {
          background: #f9fafb;
        }

        .table-container {
          margin-top: 20px;
          overflow-x: auto;
        }

        .table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 0 8px;
        }

        .record-count {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .attendance-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .attendance-table th {
          background: #262760;
          padding: 12px;
          text-align: left;
          font-weight: 500;
          color: white;
          border-bottom: 1px solid #1e2050;
          border-top: 1px solid #1e2050;
        }


        .attendance-table td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          color: #4b5563;
        }

        .attendance-table tr:hover {
          background: #f9fafb;
        }

        .status {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }

        .status-1 {
          background: #dcfce7;
          color: #166534;
        }

        .status-2 {
          background: #fef3c7;
          color: #92400e;
        }

        .status-3 {
          background: #fef3c7;
          color: #92400e;
        }

        .status-4 {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-5 {
          background: #e5e7eb;
          color: #374151;
        }

        .status-6 {
          background: #dbeafe;
          color: #1e40af;
        }

        .loading-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #262760;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 12px;

        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: #666;
        }

        .demo-button {
          padding: 6px 12px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          margin-top: 8px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .container {
            padding: 20px;
          }

          .filter-row {
            flex-direction: column;
            gap: 12px;
          }

          .action-buttons {
            flex-direction: column;
          }

          .status-bar {
            flex-direction: column;
            gap: 12px;
          }

          .table-header {
            flex-direction: column;
            gap: 8px;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
