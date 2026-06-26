import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { monthlyPayrollAPI, employeeAPI } from '../../services/api';

const PFGratuitySummary = () => {
  const navigate = useNavigate();
  const [financialYear, setFinancialYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [summaryData, setSummaryData] = useState([]);
  const [availableYears, setAvailableYears] = useState([]);
  const [totals, setTotals] = useState({ pf: 0, gratuity: 0 });

  useEffect(() => {
    const init = async () => {
      const user = JSON.parse(sessionStorage.getItem('user') || '{}');
      if (!user?.id) {
        navigate('/login');
        return;
      }
      try {
        const me = await employeeAPI.getMyProfile();
        const empId = me?.data?.employeeId || user.employeeId || user.username || user.id;
        setEmployeeId(empId);
      } catch (err) {
        const fallbackId = user.employeeId || user.username || user.id;
        setEmployeeId(fallbackId);
      }
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let i = -2; i <= 1; i++) {
        const year = currentYear + i;
        years.push(`${year}-${year + 1}`);
      }
      setAvailableYears(years);
      // Default to current financial year
      const currentMonth = new Date().getMonth(); // 0-11
      const startYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      setFinancialYear(`${startYear}-${startYear + 1}`);
    };
    init();
  }, [navigate]);

  useEffect(() => {
    if (financialYear && employeeId) {
      fetchSummary();
    }
  }, [financialYear, employeeId]);

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      let employeeRecords = [];
      try {
        // Try optimized endpoint first
        const response = await monthlyPayrollAPI.getEmployeeHistory(employeeId);
        employeeRecords = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
      } catch (err) {
        // If 404 (endpoint not found or API issue), fallback to legacy method (list all & filter)
        if (err.response && (err.response.status === 404 || err.response.status === 500)) {
           console.warn("Optimized history endpoint failed, falling back to client-side filtering.");
           const response = await monthlyPayrollAPI.list({});
           const allRecords = Array.isArray(response?.data) ? response.data : (Array.isArray(response) ? response : []);
           employeeRecords = allRecords.filter(r => String(r.employeeId).toLowerCase() === String(employeeId).toLowerCase());
        } else {
           throw err;
        }
      }
      
      const yearStart = parseInt(financialYear.split('-')[0]);
      const yearEnd = parseInt(financialYear.split('-')[1]);
      
      // Define months order for Financial Year (April to March)
      const fyMonths = [
        { name: 'April', num: 4, year: yearStart },
        { name: 'May', num: 5, year: yearStart },
        { name: 'June', num: 6, year: yearStart },
        { name: 'July', num: 7, year: yearStart },
        { name: 'August', num: 8, year: yearStart },
        { name: 'September', num: 9, year: yearStart },
        { name: 'October', num: 10, year: yearStart },
        { name: 'November', num: 11, year: yearStart },
        { name: 'December', num: 12, year: yearStart },
        { name: 'January', num: 1, year: yearEnd },
        { name: 'February', num: 2, year: yearEnd },
        { name: 'March', num: 3, year: yearEnd },
      ];

      let totalPF = 0;
      let totalGratuity = 0;

      const data = fyMonths.map(m => {
        const formattedMonth = `${m.year}-${String(m.num).padStart(2, '0')}`;
        const record = employeeRecords.find(r => r.salaryMonth === formattedMonth);
        
        const pf = record ? Number(record.pf || 0) : 0;
        const gratuity = record ? Number(record.gratuity || 0) : 0;
        
        totalPF += pf;
        totalGratuity += gratuity;

        return {
          month: m.name,
          year: m.year,
          pf,
          gratuity,
          hasData: !!record
        };
      });

      setSummaryData(data);
      setTotals({ pf: totalPF, gratuity: totalGratuity });

    } catch (error) {
      console.error("Error fetching summary:", error);
      alert('Failed to load summary data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate('/salaryslips');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleGoBack}
              className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-[#1e2b58]">PF & Gratuity Summary</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Financial Year:</span>
            <select
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760] text-sm font-medium"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
             <div>
               <h2 className="text-lg font-semibold text-gray-800">Annual Summary</h2>
               <p className="text-sm text-gray-500">Breakdown of Provident Fund and Gratuity for FY {financialYear}</p>
             </div>
             <div className="flex gap-6">
               <div className="text-right">
                 <p className="text-xs text-gray-500 uppercase font-semibold">Total PF</p>
                 <p className="text-xl font-bold text-[#262760]">₹{totals.pf.toLocaleString('en-IN')}</p>
               </div>
               <div className="text-right">
                 <p className="text-xs text-gray-500 uppercase font-semibold">Total Gratuity</p>
                 <p className="text-xl font-bold text-[#f37021]">₹{totals.gratuity.toLocaleString('en-IN')}</p>
               </div>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#1e2b58]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Month / Year</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">PF Contribution (₹)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Gratuity (₹)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                      <div className="flex justify-center items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#262760]"></div>
                        Loading data...
                      </div>
                    </td>
                  </tr>
                ) : (
                  summaryData.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.month} {row.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right font-mono">
                        {row.hasData ? row.pf.toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right font-mono">
                        {row.hasData ? row.gratuity.toLocaleString('en-IN') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {row.hasData ? (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Processed
                          </span>
                        ) : (
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-500">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
                {!isLoading && (
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Total
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#262760] text-right font-mono">
                      ₹{totals.pf.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#f37021] text-right font-mono">
                      ₹{totals.gratuity.toLocaleString('en-IN')}
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PFGratuitySummary;