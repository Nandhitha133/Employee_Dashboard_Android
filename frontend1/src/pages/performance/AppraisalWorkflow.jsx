import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  Trash2, 
  Search, 
  Plus, 
  X, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Filter,
  UserCheck,
  ChevronDown
} from 'lucide-react';
import { employeeAPI } from '../../services/api';

const getPreviousFinancialYearLabel = () => {
  const now = new Date();
  const currentStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const prevStartYear = currentStartYear - 1;
  const prevEndYear = String(prevStartYear + 1).slice(2);
  return `${prevStartYear}-${prevEndYear}`;
};

const AppraisalWorkflow = () => {
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('2024-25');
  
  const financialYearOptions = ['2024-25', '2025-26'];

  const handleFinancialYearChange = (e) => {
    setSelectedFinancialYear(e.target.value);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [allEmployees, setAllEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  
  // Custom options state to persist people added via "Add more..." for the session
  const [customOptions, setCustomOptions] = useState({
    appraiser: [],
    reviewer: [],
    director: []
  });

  const [filters, setFilters] = useState({
    division: '',
    designation: '',
    location: ''
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [roleToExtend, setRoleToExtend] = useState(null); // 'appraiser', 'reviewer', or 'director'
  const [modalSearch, setModalSearch] = useState('');
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filter List Options
  const [divisionOptions, setDivisionOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await employeeAPI.getAllEmployees();
      const employees = response.data || [];
      setAllEmployees(employees);
      
      const formattedRows = employees.map(emp => ({
        id: emp._id,
        empId: emp.employeeId,
        name: emp.name,
        appraiser: emp.appraiser || '', 
        reviewer: emp.reviewer || '', 
        director: emp.director || '',
        division: emp.division || '',
        designation: emp.designation || '',
        location: emp.location || ''
      }));

      formattedRows.sort((a, b) => {
        const idA = a.empId || '';
        const idB = b.empId || '';
        return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
      });

      setRows(formattedRows);
      
      // Setup master filter lists
      setDivisionOptions([...new Set(employees.map(e => e.division).filter(Boolean))].sort());
      setDesignationOptions([...new Set(employees.map(e => e.designation).filter(Boolean))].sort());
      setLocationOptions([...new Set(employees.map(e => e.location).filter(Boolean))].sort());

    } catch (error) {
      console.error("Error fetching employees:", error);
      showNotification('error', "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Base Logic for generating role dropdowns
  const appraiserDesignations = ['GENERAL MANAGER (GM)', 'GENERAL MANAGER GM', 'MANAGING DIRECTOR (MD)', 'MANAGING DIRECTOR MD', 'SR PROJECT MANAGER'];
  const reviewerDesignations = ['GENERAL MANAGER (GM)', 'GENERAL MANAGER GM'];
  const directorDesignations = ['MANAGING DIRECTOR (MD)', 'MANAGING DIRECTOR MD'];

  const getFilteredOptions = (roleKey, designationList) => {
    const list = designationList.map(d => d.trim().toUpperCase());
    
    // 1. People by Designation
    const byDesignation = allEmployees.filter(emp => {
      const d = (emp.designation || emp.role || emp.position || '').trim().toUpperCase();
      return list.includes(d);
    });

    // 2. People currently assigned to someone else
    const currentAssignments = new Set(rows.map(r => r[roleKey]).filter(Boolean));
    const byAssignment = allEmployees.filter(emp => currentAssignments.has(emp.name));

    // 3. Custom session additions
    const byCustom = customOptions[roleKey];

    // Merge and deduplicate
    const combined = [...byDesignation, ...byAssignment, ...byCustom];
    const unique = Array.from(new Map(combined.map(item => [item._id || item.employeeId, item])).values());
    
    return unique
      .map(emp => ({
        name: emp.name,
        label: `${emp.name} (${emp.employeeId})`
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const appraiserOptions = useMemo(() => getFilteredOptions('appraiser', appraiserDesignations), [allEmployees, rows, customOptions.appraiser]);
  const reviewerOptions = useMemo(() => getFilteredOptions('reviewer', reviewerDesignations), [allEmployees, rows, customOptions.reviewer]);
  const directorOptions = useMemo(() => getFilteredOptions('director', directorDesignations), [allEmployees, rows, customOptions.director]);

  const filteredRows = useMemo(() => {
    let result = rows;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r => r.empId?.toLowerCase().includes(q) || r.name?.toLowerCase().includes(q));
    }
    if (filters.division) result = result.filter(r => r.division === filters.division);
    if (filters.designation) result = result.filter(r => r.designation === filters.designation);
    if (filters.location) result = result.filter(r => r.location === filters.location);
    return result;
  }, [rows, searchQuery, filters]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleDropdownChange = (id, field, value) => {
    if (value === 'ADD_MORE_ACTION') {
      setRoleToExtend(field);
      setIsAddModalOpen(true);
      return;
    }
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSave = async (id) => {
    try {
      const row = rows.find(r => r.id === id);
      const dataToSave = { 
        appraiser: row.appraiser,
        reviewer: row.reviewer,
        director: row.director
      };
      await employeeAPI.updateEmployee(id, dataToSave);
      showNotification('success', `Workflow updated for ${row.name}`);
    } catch (error) {
      showNotification('error', "Failed to save workflow");
    }
  };

  const handleClear = async (id) => {
    const row = rows.find(r => r.id === id);
    if (!window.confirm(`Clear appraisal workflow for ${row.name}?`)) return;
    
    try {
      const clearData = { appraiser: '', reviewer: '', director: '' };
      await employeeAPI.updateEmployee(id, clearData);
      setRows(rows.map(r => r.id === id ? { ...r, ...clearData } : r));
      showNotification('success', `Cleared workflow for ${row.name}`);
    } catch (error) {
      showNotification('error', "Failed to clear workflow");
    }
  };

  const handleAddCustomEmployee = (emp) => {
    setCustomOptions(prev => ({
      ...prev,
      [roleToExtend]: [...(prev[roleToExtend] || []), emp]
    }));
    setIsAddModalOpen(false);
    setModalSearch('');
    showNotification('success', `${emp.name} added to the ${roleToExtend} list`);
  };

  const modalResults = useMemo(() => {
    if (!modalSearch) return [];
    return allEmployees.filter(e => 
      e.name?.toLowerCase().includes(modalSearch.toLowerCase()) || 
      e.employeeId?.toLowerCase().includes(modalSearch.toLowerCase())
    ).slice(0, 8);
  }, [modalSearch, allEmployees]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans animate-in fade-in duration-500">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center">
              <UserCheck className="mr-3 h-8 w-8 text-indigo-600" />
              Appraisal Workflow Manager
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Assign and manage appraisal chains for all employees</p>
          </div>
          
          <div className="flex items-center space-x-3">
             <div className="hidden sm:flex flex-col items-end mr-4">
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Financial Year</span>
               <div className="relative">
                 <select
                    value={selectedFinancialYear}
                    onChange={handleFinancialYearChange}
                    className="appearance-none bg-indigo-50 border-none text-indigo-700 text-sm font-black py-1 pl-3 pr-8 rounded-lg cursor-pointer focus:ring-2 focus:ring-indigo-300 transition-all outline-none"
                 >
                   {financialYearOptions.map(year => (
                     <option key={year} value={year}>{year}</option>
                   ))}
                 </select>
                 <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-500 pointer-events-none" />
               </div>
             </div>
          </div>
        </div>

        {/* Global Search & Filters */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-end gap-5">
          <div className="flex-1 min-w-[300px]">
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Search Scope</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find employee by ID or Name..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium border transition-all"
              />
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-none">
            {[
              { id: 'division', label: 'Division', options: divisionOptions },
              { id: 'designation', label: 'Designation', options: designationOptions },
              { id: 'location', label: 'Site / Location', options: locationOptions }
            ].map(filter => (
              <div key={filter.id} className="min-w-[160px]">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">{filter.label}</label>
                <div className="relative">
                  <select
                    value={filters[filter.id]}
                    onChange={(e) => handleFilterChange(filter.id, e.target.value)}
                    className="w-full appearance-none pl-4 pr-10 py-3 bg-slate-50 border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 border transition-all font-medium"
                  >
                    <option value="">All Areas</option>
                    {filter.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            ))}
          </div>

          {(filters.division || filters.designation || filters.location || searchQuery) && (
            <button 
                onClick={() => { setFilters({ division: '', designation: '', location: '' }); setSearchQuery(''); }}
                className="mb-1 text-xs font-bold text-red-500 hover:text-red-600 uppercase tracking-wider h-10 px-4 transition-colors"
            >
                Reset
            </button>
          )}
        </div>

        {/* Workflow Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative min-h-[500px]">
          {loading && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] z-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent" />
            </div>
          )}

          <div className="overflow-auto max-h-[calc(100vh-400px)] scrollbar-thin scrollbar-thumb-indigo-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">ID / Name</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Appraiser</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Reviewer</th>
                  <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Director</th>
                  <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs">
                          {row.name.substring(0, 1)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{row.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{row.empId}</div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Appraiser Dropdown */}
                    <td className="px-4 py-4 min-w-[220px]">
                      <select 
                        className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={row.appraiser}
                        onChange={(e) => handleDropdownChange(row.id, 'appraiser', e.target.value)}
                      >
                        <option value="">Select Appraiser</option>
                        {appraiserOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.label}</option>)}
                        <option value="ADD_MORE_ACTION" className="text-indigo-600 font-black decoration-indigo-600">+ Add to the list...</option>
                      </select>
                    </td>

                    {/* Reviewer Dropdown */}
                    <td className="px-4 py-4 min-w-[220px]">
                      <select 
                        className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={row.reviewer}
                        onChange={(e) => handleDropdownChange(row.id, 'reviewer', e.target.value)}
                      >
                        <option value="">Select Reviewer</option>
                        {reviewerOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.label}</option>)}
                        <option value="ADD_MORE_ACTION" className="text-indigo-600 font-black">+ Add to the list...</option>
                      </select>
                    </td>

                    {/* Director Dropdown */}
                    <td className="px-4 py-4 min-w-[220px]">
                      <select 
                        className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                        value={row.director}
                        onChange={(e) => handleDropdownChange(row.id, 'director', e.target.value)}
                      >
                        <option value="">Select Director</option>
                        {directorOptions.map(opt => <option key={opt.name} value={opt.name}>{opt.label}</option>)}
                        <option value="ADD_MORE_ACTION" className="text-indigo-600 font-black">+ Add to the list...</option>
                      </select>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex justify-center items-center space-x-2">
                        <button 
                          onClick={() => handleSave(row.id)}
                          className="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          title="Save Changes"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button 
                           onClick={() => handleClear(row.id)}
                           className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all group-hover:block"
                           title="Clear Assignment"
                        >
                           <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredRows.length === 0 && !loading && (
             <div className="flex flex-col items-center justify-center py-24 text-slate-400">
               <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                 <Search className="h-10 w-10 opacity-20" />
               </div>
               <p className="text-lg font-bold">No results found</p>
               <p className="text-xs">Adjust your search or filter keywords</p>
             </div>
          )}
        </div>
      </div>

      {/* Add Custom Role Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
            <div className="px-8 py-6 bg-indigo-600 flex justify-between items-center text-white">
              <div>
                <h3 className="text-xl font-black tracking-tight">Expand {roleToExtend} List</h3>
                <p className="text-indigo-100 text-xs mt-0.5 font-bold uppercase tracking-widest italic opacity-80">Manual Entry Override</p>
              </div>
              <button 
                onClick={() => { setIsAddModalOpen(false); setModalSearch(''); }}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Search All Employees</label>
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium border"
                    placeholder="Search by ID or Name..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                  />
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
                {modalResults.length > 0 ? (
                  modalResults.map(emp => (
                    <button
                      key={emp._id}
                      onClick={() => handleAddCustomEmployee(emp)}
                      className="w-full flex items-center p-3 hover:bg-indigo-50 rounded-2xl transition-all border border-transparent hover:border-indigo-100 group text-left"
                    >
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-indigo-700 mr-4 group-hover:bg-white transition-colors capitalize">
                        {emp.name?.substring(0, 1)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{emp.employeeId} • {emp.designation}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                    </button>
                  ))
                ) : (
                  modalSearch && <div className="text-center py-10 text-slate-400 font-medium">No results matched your search</div>
                )}
                {!modalSearch && <div className="text-center py-10 text-slate-300 italic text-sm">Type to begin searching...</div>}
              </div>
            </div>

            <div className="px-8 py-4 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-[110] flex items-center px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-500 border-l-4 ${notification.type === 'success' ? 'bg-white border-green-500 text-slate-900' : 'bg-white border-red-500 text-slate-900'}`}>
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-6 w-6 text-green-500 mr-3" />
          ) : (
            <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
          )}
          <span className="font-bold text-sm tracking-tight">{notification.message}</span>
        </div>
      )}

    </div>
  );
};

export default AppraisalWorkflow;
