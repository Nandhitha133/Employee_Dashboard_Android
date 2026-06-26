import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, Eye, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { promotionAPI } from '../../services/api';

const getFinancialYearFromDate = (dateValue) => {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  const startYear = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const endTwo = String(startYear + 1).slice(2);
  return `${startYear}-${endTwo}`;
};

const formatDate = (dateValue) => {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy}`;
};

const PromotionHistory = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewRow, setViewRow] = useState(null);

  const pageSize = 10;

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await promotionAPI.getPromotionHistory();
        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        setRows(list);
      } catch (e) {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const financialYears = useMemo(() => {
    const years = Array.from(
      new Set(
        rows
          .map((r) => getFinancialYearFromDate(r.effectiveDate))
          .filter(Boolean)
      )
    );
    years.sort((a, b) => b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' }));
    return years;
  }, [rows]);

  useEffect(() => {
    if (!selectedFinancialYr && financialYears.length) {
      setSelectedFinancialYr(financialYears[0]);
    }
  }, [financialYears, selectedFinancialYr]);

  const divisions = useMemo(() => {
    const list = Array.from(new Set(rows.map((r) => String(r.division || '').trim()).filter(Boolean)));
    list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    return list;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows
      .filter((r) => {
        const fy = getFinancialYearFromDate(r.effectiveDate);
        if (selectedFinancialYr && fy !== selectedFinancialYr) return false;
        if (selectedDivision && String(r.division || '').trim() !== selectedDivision) return false;
        if (!q) return true;
        const name = String(r.employeeName || '').toLowerCase();
        const id = String(r.employeeId || '').toLowerCase();
        return name.includes(q) || id.includes(q);
      })
      .sort((a, b) => {
        const ad = new Date(a.effectiveDate).getTime();
        const bd = new Date(b.effectiveDate).getTime();
        if (bd !== ad) return bd - ad;
        const ac = new Date(a.createdAt).getTime();
        const bc = new Date(b.createdAt).getTime();
        return bc - ac;
      });
  }, [rows, searchTerm, selectedDivision, selectedFinancialYr]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pagedRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedDivision, selectedFinancialYr]);

  const exportToExcel = () => {
    const data = filteredRows.map((r, idx) => ({
      'S.No': idx + 1,
      'Employee ID': r.employeeId || '',
      'Employee Name': r.employeeName || '',
      'Old Designation': r.oldDesignation || '',
      'New Designation': r.newDesignation || '',
      'Effective Date': formatDate(r.effectiveDate),
      'Promoted By': r.promotedBy || '',
      'Division': r.division || '',
      'Remarks': r.remarks || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Promotion History');
    XLSX.writeFile(wb, `promotion_history_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = String(user.role || '').toLowerCase();
  const isEmployee = role === 'employee' || role === 'employees';

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
      <div className="max-w-[98%] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={selectedFinancialYr}
              onChange={(e) => setSelectedFinancialYr(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border"
            >
              <option value="">All FY</option>
              {financialYears.map((fy) => (
                <option key={fy} value={fy}>
                  {fy}
                </option>
              ))}
            </select>

            {!isEmployee && (
              <>
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="block w-44 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border"
                >
                  <option value="">All Divisions</option>
                  {divisions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by Employee ID / Name..."
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] w-72"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{filteredRows.length} record(s)</span>
            <button
              onClick={exportToExcel}
              className="flex items-center px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050] transition-colors shadow-sm"
              disabled={filteredRows.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export to Excel
            </button>
          </div>
        </div>

        <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-10 shadow-md">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Old Designation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">New Designation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Effective Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Promoted By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Remarks</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pagedRows.map((r, idx) => (
                  <tr key={r._id || `${r.employeeId}-${idx}`} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{(safePage - 1) * pageSize + idx + 1}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{r.employeeId}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{r.employeeName}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{r.oldDesignation}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{r.newDesignation}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(r.effectiveDate)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{r.promotedBy}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 max-w-[260px] truncate" title={r.remarks || ''}>
                      {r.remarks || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <button
                        onClick={() => setViewRow(r)}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && pagedRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-gray-500">
                      No promotion history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Page {safePage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-md border bg-white text-sm disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
            >
              Prev
            </button>
            <button
              className="px-3 py-2 rounded-md border bg-white text-sm disabled:opacity-50"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {viewRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold">Promotion Details</h3>
              <button onClick={() => setViewRow(null)} className="text-white hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Employee ID</div>
                  <div className="text-sm text-gray-900 font-medium">{viewRow.employeeId}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Employee Name</div>
                  <div className="text-sm text-gray-900 font-medium">{viewRow.employeeName}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Old Designation</div>
                  <div className="text-sm text-gray-900">{viewRow.oldDesignation}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">New Designation</div>
                  <div className="text-sm text-gray-900">{viewRow.newDesignation}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Effective Date</div>
                  <div className="text-sm text-gray-900">{formatDate(viewRow.effectiveDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Promoted By</div>
                  <div className="text-sm text-gray-900">{viewRow.promotedBy}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Division</div>
                  <div className="text-sm text-gray-900">{viewRow.division || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Created At</div>
                  <div className="text-sm text-gray-900">{formatDate(viewRow.createdAt)}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Remarks</div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">{viewRow.remarks || '-'}</div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={() => setViewRow(null)}
                className="px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionHistory;
