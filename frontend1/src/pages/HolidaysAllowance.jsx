import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { employeeAPI, holidayAllowanceAPI, payrollAPI } from '../services/api';
import { 
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DevicePhoneMobileIcon,
  CalendarDaysIcon,
  MapPinIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const HolidaysAllowance = () => {
  const navigate = useNavigate();

  // Filters
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Data
  const [employees, setEmployees] = useState([]); // All employees
  const [tableData, setTableData] = useState([]); // Merged data for table
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  
  // Popup state
  const [popupConfig, setPopupConfig] = useState({ isOpen: false, message: '', isError: false });

  // Constants
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  useEffect(() => {
    // Initial load of employees to get locations
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedLocation && selectedMonth && selectedYear) {
      loadData();
    }
  }, [selectedLocation, selectedMonth, selectedYear]);

  const fetchInitialData = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      const emps = response.data || [];
      // Extract unique locations
      const locs = [...new Set(emps.map(e => e.location).filter(Boolean))];
      setLocations(locs);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const calculatePerDayAmount = (grossSalary, year, month) => {
    if (!grossSalary) {
      return 0;
    }
    const daysInMonth = new Date(year, month, 0).getDate();
    if (!daysInMonth) {
      return 0;
    }
    const amount = Math.round(grossSalary / daysInMonth);
    return amount > 1500 ? 1500 : amount;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [empResponse, payrollResponse] = await Promise.all([
        employeeAPI.getAllEmployees(),
        payrollAPI.list()
      ]);

      let filteredEmps = empResponse.data || [];
      const payrolls = Array.isArray(payrollResponse.data) ? payrollResponse.data : [];

      const payrollMap = new Map();
      payrolls.forEach((p) => {
        const empId = p.employeeId;
        if (!empId) return;
        if (!payrollMap.has(empId)) {
          payrollMap.set(empId, p);
        }
      });

      const params = {
        month: selectedMonth,
        year: selectedYear,
      };

      // We fetch all records for the month/year to ensure we have the saved data
      // even if the employee's current location has changed.
      let savedRecords = [];
      try {
        const savedRes = await holidayAllowanceAPI.list(params);
        if (savedRes && savedRes.data) {
          savedRecords = savedRes.data.data || savedRes.data;
        }
      } catch (err) {
        console.error("Error fetching saved holiday allowances:", err);
      }

      if (selectedLocation) {
        filteredEmps = filteredEmps.filter(e => e.location === selectedLocation);
      }

      const savedMap = new Map();
      savedRecords.forEach(item => {
        if (item && item.employeeId) {
          savedMap.set(item.employeeId, item);
        }
      });

      const merged = filteredEmps.map((emp, index) => {
        const payroll = payrollMap.get(emp.employeeId);
        const grossFromPayroll =
          payroll && (payroll.totalEarnings || payroll.netSalary || payroll.ctc || 0);
        const gross = grossFromPayroll || emp.totalEarnings || emp.netSalary || emp.ctc || 0;
        const saved = savedMap.get(emp.employeeId);
        const defaultPerDay = calculatePerDayAmount(gross, selectedYear, selectedMonth);
        
        // Force the 1500 limit even if data was saved previously with a higher value
        let perDayAmount = saved?.perDayAmount ?? defaultPerDay;
        if (perDayAmount > 1500) perDayAmount = 1500;

        const holidayDays = saved?.holidayDays ?? 0;
        const holidayTotal = Math.round(holidayDays * perDayAmount);

        const shiftAllottedAmount = saved?.shiftAllottedAmount ?? 50;
        const shiftDays = saved?.shiftDays ?? 0;
        const shiftTotal = Math.round(shiftAllottedAmount * shiftDays);

        const totalAmount = holidayTotal + shiftTotal;

        return {
          id: emp._id, // Employee DB ID
          sNo: index + 1,
          employeeId: emp.employeeId,
          employeeName: emp.name || emp.employeename,
          division: saved?.division || emp.division || payroll?.division || '-',
          location: saved?.location || payroll?.location || emp.location || '-',
          bankName: saved?.bankName || emp.bankName || payroll?.bankName || '-',
          ifsc: saved?.ifsc || saved?.ifscCode || emp.ifsc || payroll?.ifscCode || '-',
          accountNumber:
            saved?.bankAccount ||
            saved?.accountNumber ||
            payroll?.accountNumber ||
            emp.bankAccount ||
            emp.bankDetails?.accountNumber ||
            '-',
          grossSalary: saved?.grossSalary ?? gross,
          
          // Holiday Working Fields
          holidayDays: holidayDays,
          perDayAmount: perDayAmount,
          holidayTotal: holidayTotal,

          // Shift Allowance Fields
          shiftAllottedAmount: shiftAllottedAmount,
          shiftDays: shiftDays,
          shiftTotal: shiftTotal,
          
          // Food Allowance Fields
          foodDays: saved?.foodDays ?? 0,
          foodAllottedAmount: saved?.foodAllottedAmount ?? 75,
          foodTotal: Math.round((saved?.foodDays ?? 0) * (saved?.foodAllottedAmount ?? 75)),

          // Combined Total
          totalAmount: holidayTotal + shiftTotal + Math.round((saved?.foodDays ?? 0) * (saved?.foodAllottedAmount ?? 75)),
          
          status: saved ? 'Saved' : 'Draft'
        };
      });

      // Sort by employeeId sequentially
      merged.sort((a, b) => {
        return a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true, sensitivity: 'base' });
      });

      // Re-assign S.No after sorting
      const sortedWithSNo = merged.map((item, idx) => ({
        ...item,
        sNo: idx + 1
      }));

      setTableData(sortedWithSNo);

    } catch (error) {
      console.error("Error loading data:", error);
      const msg = error.response?.data?.message || error.message || "Unknown error";
      setPopupConfig({ isOpen: true, message: `Failed to load data: ${msg}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (index, field, value) => {
    const newData = [...tableData];
    const row = newData[index];

    const recalcTotals = () => {
      row.holidayTotal = Math.round((row.holidayDays || 0) * (row.perDayAmount || 0));
      row.shiftTotal = Math.round((row.shiftAllottedAmount || 0) * (row.shiftDays || 0));
      row.foodTotal = Math.round((row.foodDays || 0) * (row.foodAllottedAmount || 0));
      row.totalAmount = row.holidayTotal + row.shiftTotal + row.foodTotal;
    };

    if (field === 'holidayDays') {
      const days = parseFloat(value) || 0;
      row.holidayDays = days;
      recalcTotals();
    } else if (field === 'perDayAmount') {
      let amount = parseFloat(value) || 0;
      if (amount > 1500) amount = 1500;
      row.perDayAmount = amount;
      recalcTotals();
    } else if (field === 'shiftAllottedAmount') {
      const amount = parseFloat(value) || 0;
      row.shiftAllottedAmount = amount;
      recalcTotals();
    } else if (field === 'shiftDays') {
      const days = parseFloat(value) || 0;
      row.shiftDays = days;
      recalcTotals();
    } else if (field === 'foodDays') {
      const days = parseFloat(value) || 0;
      row.foodDays = days;
      recalcTotals();
    } else if (field === 'foodAllottedAmount') {
      const amount = parseFloat(value) || 0;
      row.foodAllottedAmount = amount;
      recalcTotals();
    }

    setTableData(newData);
  };

  const saveData = async () => {
    try {
      const payload = {
        month: selectedMonth,
        year: selectedYear,
        allowances: tableData.map(row => ({
          employeeId: row.employeeId,
          employeeName: row.employeeName,
          location: row.location,
          accountNumber: row.accountNumber,
          grossSalary: row.grossSalary,
          holidayDays: row.holidayDays,
          perDayAmount: row.perDayAmount,
          holidayTotal: row.holidayTotal,
          shiftAllottedAmount: row.shiftAllottedAmount,
          shiftDays: row.shiftDays,
          shiftTotal: row.shiftTotal,
          foodDays: row.foodDays,
          foodAllottedAmount: row.foodAllottedAmount,
          foodTotal: row.foodTotal,
          totalAmount: row.totalAmount
        }))
      };

      const res = await holidayAllowanceAPI.saveBulk(payload);
      const message = res?.data?.message || 'Holiday allowances saved successfully';
      setPopupConfig({ isOpen: true, message, isError: false });
      
    } catch (error) {
      console.error("Error saving data:", error);
      setPopupConfig({ isOpen: true, message: "Failed to save data", isError: true });
    }
  };

  const handleViewSummary = () => {
    const params = new URLSearchParams();
    if (selectedLocation) {
      params.set('location', selectedLocation);
    }
    params.set('month', String(selectedMonth));
    params.set('year', String(selectedYear));
    navigate(`/holidays-allowance/summary?${params.toString()}`);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen relative">
      <style>{`
        /* Remove arrows/spinners from number inputs */
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Custom Popup Modal */}
      {popupConfig.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col items-center text-center">
            {popupConfig.isError ? (
              <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
            ) : (
              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
            )}
            <h3 className="text-xl font-black text-gray-900 mb-2">{popupConfig.isError ? 'Error' : 'Success'}</h3>
            <p className="text-gray-600 font-medium mb-8">{popupConfig.message}</p>
            <button 
              onClick={() => setPopupConfig({ isOpen: false, message: '', isError: false })}
              className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all transform hover:scale-[1.02] shadow-md ${popupConfig.isError ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 'bg-[#1e2050] hover:bg-[#262760] shadow-indigo-200'}`}
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Allowance Master</h1>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-center">
        {/* Location */}
        <div className="flex items-center bg-white border rounded-md px-3 py-2 w-64">
          <MapPinIcon className="h-5 w-5 text-[#1e2050] mr-2" />
          <select 
            className="w-full outline-none text-gray-700 bg-transparent"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            <option value="">Select Location</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div className="flex items-center bg-white border rounded-md px-3 py-2 w-48">
          <CalendarDaysIcon className="h-5 w-5 text-[#1e2050] mr-2" />
          <select 
            className="w-full outline-none text-gray-700 bg-transparent"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="flex items-center bg-white border rounded-md px-2 py-2">
          <button 
            onClick={() => setSelectedYear(selectedYear - 1)}
            className="p-1 hover:bg-gray-100 rounded text-[#1e2050]"
          >
            &lt;
          </button>
          <span className="mx-3 font-medium text-gray-700">{selectedYear}</span>
          <button 
            onClick={() => setSelectedYear(selectedYear + 1)}
            className="p-1 hover:bg-gray-100 rounded text-[#1e2050]"
          >
            &gt;
          </button>
        </div>

        {/* Buttons */}
        <button 
          onClick={loadData}
          className="flex items-center bg-[#1e2050] text-white px-4 py-2 rounded-md hover:bg-[#262760] transition-colors"
        >
          <ArrowPathIcon className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Load Employees
        </button>

        <button 
          onClick={saveData}
          className="flex items-center bg-[#1e2050] text-white px-4 py-2 rounded-md hover:bg-[#262760] transition-colors"
        >
          <DevicePhoneMobileIcon className="h-5 w-5 mr-2" /> {/* Using generic icon as 'Save' */}
          Save Data
        </button>

        <button 
          onClick={handleViewSummary}
          className="flex items-center bg-[#1e2050] text-white px-4 py-2 rounded-md hover:bg-[#262760] transition-colors"
        >
          <UserGroupIcon className="h-5 w-5 mr-2" />
          View Summary
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Table Header Title */}
        

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-white uppercase bg-[#1e2050]">
              <tr>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">S.No</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Employee ID</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Employee Name</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Division</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Location</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Bank Name</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">IFSC</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Account Number</th>
                <th rowSpan="2" className="px-4 py-3 border-r border-gray-500">Gross Salary</th>
                <th colSpan="3" className="px-4 py-2 text-center border-r border-gray-500 border-b border-gray-500">
                  Holiday Working
                </th>
                <th colSpan="3" className="px-4 py-2 text-center border-r border-gray-500 border-b border-gray-500">
                  Shift Allowance
                </th>
                <th colSpan="3" className="px-4 py-2 text-center border-r border-gray-500 border-b border-gray-500">
                  Food Allowance
                </th>
                <th rowSpan="2" className="px-4 py-3">Total Amount</th>
              </tr>
              <tr>
                <th className="px-4 py-2 border-r border-gray-500 text-center">No. of Days</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">Per Day Amount</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">Total</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">Allotted Amount</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">No. of Days</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">Total</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">No. of Days</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">Allotted Amount</th>
                <th className="px-4 py-2 border-r border-gray-500 text-center">Total</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 ? (
                <tr>
                  <td colSpan="15" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-4xl mb-2">📋</span>
                      <p>Select location and click "Load Employees" to load data</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tableData.map((row, index) => (
                  <tr key={row.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-4 py-3 border-r">{row.sNo}</td>
                    <td className="px-4 py-3 border-r font-medium text-gray-900">{row.employeeId}</td>
                    <td className="px-4 py-3 border-r">{row.employeeName}</td>
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="text"
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050]"
                        value={row.division}
                        onChange={(e) => handleInputChange(index, 'division', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="text"
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050]"
                        value={row.location}
                        onChange={(e) => handleInputChange(index, 'location', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 border-r">{row.bankName}</td>
                    <td className="px-4 py-3 border-r font-mono">{row.ifsc}</td>
                    <td className="px-4 py-3 border-r font-mono">{row.accountNumber}</td>
                    <td className="px-4 py-3 border-r text-right">{row.grossSalary?.toLocaleString()}</td>
                    
                    {/* Holiday Working Inputs */}
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="number" 
                        min="0"
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050] text-center"
                        value={row.holidayDays}
                        onChange={(e) => handleInputChange(index, 'holidayDays', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="number"
                        min="0" 
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050] text-right"
                        value={row.perDayAmount}
                        onChange={(e) => handleInputChange(index, 'perDayAmount', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 border-r text-right font-medium text-gray-700 bg-gray-50">
                      {row.holidayTotal?.toLocaleString()}
                    </td>

                    {/* Shift Allowance Inputs */}
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050] text-right"
                        value={row.shiftAllottedAmount}
                        onChange={(e) => handleInputChange(index, 'shiftAllottedAmount', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050] text-center"
                        value={row.shiftDays}
                        onChange={(e) => handleInputChange(index, 'shiftDays', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 border-r text-right font-medium text-gray-700 bg-gray-50">
                      {row.shiftTotal?.toLocaleString()}
                    </td>

                    {/* Food Allowance Inputs */}
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="number" 
                        min="0"
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050] text-center"
                        value={row.foodDays}
                        onChange={(e) => handleInputChange(index, 'foodDays', e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-2 border-r">
                      <input 
                        type="number"
                        min="0" 
                        className="w-full px-2 py-1 border rounded focus:ring-[#1e2050] focus:border-[#1e2050] text-right"
                        value={row.foodAllottedAmount}
                        onChange={(e) => handleInputChange(index, 'foodAllottedAmount', e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 border-r text-right font-medium text-gray-700 bg-gray-50">
                      {row.foodTotal?.toLocaleString()}
                    </td>
                    
                    {/* Final Total */}
                    <td className="px-4 py-3 text-right font-bold text-[#1e2050]">
                      {row.totalAmount?.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HolidaysAllowance;
