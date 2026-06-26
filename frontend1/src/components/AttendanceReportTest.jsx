import React, { useState } from 'react';
import { hikCentralAPI } from '../services/api';
import useNotification from '../hooks/useNotification';

const AttendanceReportTest = () => {
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const { showNotification } = useNotification();

  const fetchAttendanceReport = async () => {
    setLoading(true);
    try {
      const response = await hikCentralAPI.getAttendanceReport();
      if (response.data.success) {
        setAttendanceData(response.data);
        showNotification('Attendance report fetched successfully!', 'success');
      } else {
        showNotification('Error: ' + (response.data.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      showNotification('Error fetching attendance report: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Attendance Report Test</h2>
      
      <button
        onClick={fetchAttendanceReport}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Fetching...
          </>
        ) : (
          'Fetch Attendance Report'
        )}
      </button>

      {attendanceData && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Results:</h3>
          <div className="space-y-2">
            <p><strong>Status:</strong> {attendanceData.success ? 'Success' : 'Failed'}</p>
            <p><strong>Message:</strong> {attendanceData.message}</p>
            <p><strong>Total Records:</strong> {attendanceData.total || 0}</p>
            <p><strong>Page No:</strong> {attendanceData.pageNo || 1}</p>
            <p><strong>Page Size:</strong> {attendanceData.pageSize || 100}</p>
            <p><strong>API Endpoint:</strong> {attendanceData.apiEndpoint}</p>
            
            {attendanceData.attendance && attendanceData.attendance.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Sample Records:</h4>
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full table-auto">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left text-xs">Employee ID</th>
                        <th className="px-2 py-1 text-left text-xs">Name</th>
                        <th className="px-2 py-1 text-left text-xs">Time</th>
                        <th className="px-2 py-1 text-left text-xs">Direction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.attendance.slice(0, 10).map((record, index) => (
                        <tr key={index} className="border-b">
                          <td className="px-2 py-1 text-xs">{record.employeeId}</td>
                          <td className="px-2 py-1 text-xs">{record.employeeName}</td>
                          <td className="px-2 py-1 text-xs">{new Date(record.punchTime).toLocaleString()}</td>
                          <td className="px-2 py-1 text-xs">
                            <span className={`px-1 py-0.5 rounded text-xs ${
                              record.direction === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {record.direction}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {attendanceData.attendance.length > 10 && (
                    <p className="text-xs text-gray-500 mt-2">Showing first 10 of {attendanceData.attendance.length} records</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceReportTest;