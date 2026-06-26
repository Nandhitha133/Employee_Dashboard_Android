import ReviewerViewModal from '../../components/ReviewerViewModal';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  Eye,
  Edit,
  Trash2,
  Save,
  X,
  MessageSquare,
  CheckCircle,
  User,
  Send,
  FileText,
  AlertCircle,
  XCircle,
  TrendingUp,
  RotateCcw,
  Trophy
} from 'lucide-react';
import { APPRAISAL_STAGES, calculateSalaryAnnexure, calculateCurrentSalaryAnnexure } from '../../utils/performanceUtils';
import { performanceAPI, employeeAPI, payrollAPI } from '../../services/api';
import { getAbsoluteSignatureUrl } from '../../utils/signatureUtils';


const StatusPopup = ({ isOpen, onClose, status, message }) => {
  if (!isOpen) return null;

  const config = {
    success: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-50",
      border: "border-green-200",
      title: "Success"
    },
    error: {
      icon: XCircle,
      color: "text-red-500",
      bg: "bg-red-50",
      border: "border-red-200",
      title: "Error"
    },
    info: {
      icon: AlertCircle,
      color: "text-blue-500",
      bg: "bg-blue-50",
      border: "border-blue-200",
      title: "Information"
    }
  };

  const { icon: Icon, color, bg, border, title } = config[status] || config.info;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-40" onClick={onClose}></div>
        </div>
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div className={`inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full border-2 ${border}`}>
          <div className={`${bg} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-white ${color} sm:mx-0 sm:h-10 sm:w-10 shadow-sm`}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className={`text-lg leading-6 font-bold ${color}`}>
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-600 font-medium">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none sm:ml-3 sm:w-auto sm:text-sm transition-colors ${status === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#262760] hover:bg-[#1e2050]'}`}
              onClick={onClose}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const getCurrentFinancialYear = () => {
  const today = new Date();
  const month = today.getMonth(); // 0-indexed (3 = April)
  const year = today.getFullYear();

  // The actual current financial year start
  let yearStart = month >= 3 ? year : year - 1;

  // During Appraisal Season (April, May, June), default to the completed financial year
  // as that is what most users will be processing.
  if (month >= 3 && month <= 5) {
    yearStart -= 1;
  }

  const yearEnd = String(yearStart + 1).slice(2);
  return `${yearStart}-${yearEnd}`;
};

const getPreviousFinancialYear = () => {
  const current = getCurrentFinancialYear();
  const startYear = parseInt(current.split('-')[0], 10);
  const prevStart = startYear - 1;
  const prevEnd = String(prevStart + 1).slice(2);
  return `${prevStart}-${prevEnd}`;
};

const formatDisplayDate = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DirectorApproval = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState(getCurrentFinancialYear());
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedDesignation, setSelectedDesignation] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedRows, setSelectedRows] = useState([]);
  const [statusPopup, setStatusPopup] = useState({
    isOpen: false,
    status: 'info',
    message: ''
  });
  const [releaseConfirm, setReleaseConfirm] = useState({
    isOpen: false,
    count: 0,
    ids: [],
    type: 'approve' // 'approve' or 'release'
  });

  const [revokeConfirm, setRevokeConfirm] = useState({
    isOpen: false,
    id: null,
    reason: ''
  });

  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [performancePayDrafts, setPerformancePayDrafts] = useState({});
  const performancePaySaveTimersRef = useRef({});

  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [currentCommentEmpId, setCurrentCommentEmpId] = useState(null);
  const [tempComment, setTempComment] = useState('');
  const [viewModalData, setViewModalData] = useState(null);
  const [showReleaseLetter, setShowReleaseLetter] = useState(false);
  const [letterData, setLetterData] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    fetchDirectorAppraisals(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (!selectedFinancialYr) {
      setSelectedFinancialYr(getCurrentFinancialYear());
    }
  }, [selectedFinancialYr]);

  const calculateFinancials = (currentGross, pct, correctionPct) => {
    const grossVal = parseFloat(currentGross) || 0;
    const pctVal = parseFloat(pct) || 0;
    const correctionPctVal = parseFloat(correctionPct) || 0;
    const totalPct = pctVal + correctionPctVal;
    
    const targetRevisedGross = Math.round(grossVal * (1 + totalPct / 100));
    const incrementAmount = targetRevisedGross - grossVal;
    
    // Use shared calculation logic for Revised CTC
    const salaries = calculateSalaryAnnexure(targetRevisedGross);

    return {
      incrementAmount,
      revisedSalary: salaries.ctc
    };
  };

  const fetchDirectorAppraisals = async (tab = activeTab) => {
    setLoading(true);
    try {
      const response = await performanceAPI.getDirectorAppraisals({ tab });
      const raw = response.data || [];

      // Fetch snapshot data from FY24-25 as Ground Truth for "Current" salary
      const payrollRes = await payrollAPI.getSnapshotsList('24-25');
      const allSnapshotPayrolls = Array.isArray(payrollRes.data?.data) ? payrollRes.data.data : [];

      const enhanced = raw.map(emp => {
        const empId = emp.employeeId || emp.empId;
        const snapshot = allSnapshotPayrolls.find(p => String(p.employeeId).toLowerCase() === String(empId).toLowerCase());
        
        // Use FY24-25 totalEarnings as the base Gross
        const currentGross = snapshot ? Number(snapshot.totalEarnings || 0) : (Number(emp.currentSalary || 0));
        
        // Use FY24-25 CTC as the base Current Salary for display
        const currentCTC = snapshot ? Number(snapshot.ctc || 0) : calculateSalaryAnnexure(currentGross).ctc;
        const currentNet = snapshot ? Number(snapshot.netSalary || 0) : calculateSalaryAnnexure(currentGross).net;

        const financials = calculateFinancials(currentGross, emp.incrementPercentage, emp.incrementCorrectionPercentage);

        return {
          ...emp,
          currentSalary: currentCTC,
          currentGross,
          currentNet,
          incrementAmount: financials.incrementAmount,
          revisedSalary: financials.revisedSalary
        };
      });

      setEmployees(enhanced);
    } catch (error) {
      console.error('Error fetching appraisals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (emp) => {
    setEditingRowId(emp.id);
    setEditFormData({ ...emp });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  const handleSaveRow = async () => {
    try {
      await performanceAPI.updateDirectorAppraisal(editingRowId, editFormData);
      setEmployees(employees.map(emp =>
        emp.id === editingRowId ? editFormData : emp
      ));
      setEditingRowId(null);
      setEditFormData({});
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: 'Row saved successfully!'
      });
    } catch (error) {
      console.error('Error saving row:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to save changes'
      });
    }
  };

  const handleInputChange = (field, value) => {
    let newData = { ...editFormData, [field]: value };
    if (field === 'incrementPercentage' || field === 'incrementCorrectionPercentage') {
      const { incrementAmount, revisedSalary } = calculateFinancials(
        newData.currentGross || (newData.currentSalary - 1114),
        field === 'incrementPercentage' ? value : newData.incrementPercentage,
        field === 'incrementCorrectionPercentage' ? value : newData.incrementCorrectionPercentage
      );
      newData.incrementAmount = incrementAmount;
      newData.revisedSalary = revisedSalary;
    }
    setEditFormData(newData);
  };

  const handlePerformancePayChange = (id, rawValue) => {
    const raw = String(rawValue ?? '');
    setPerformancePayDrafts((prev) => ({ ...prev, [id]: raw }));
    const numeric = raw.trim() === '' ? 0 : Number(raw);
    const shouldSave = raw.trim() === '' || Number.isFinite(numeric);

    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, performancePay: shouldSave ? numeric : emp.performancePay } : emp))
    );

    if (editingRowId === id) {
      setEditFormData((prev) => ({ ...prev, performancePay: shouldSave ? numeric : prev.performancePay }));
    }

    if (!shouldSave) return;

    if (performancePaySaveTimersRef.current[id]) {
      clearTimeout(performancePaySaveTimersRef.current[id]);
    }

    performancePaySaveTimersRef.current[id] = setTimeout(async () => {
      try {
        await performanceAPI.updateDirectorAppraisal(id, { performancePay: numeric });
      } catch (error) {
        console.error('Failed to save performance pay', error);
      }
    }, 600);
  };

  const openCommentModal = (emp) => {
    setCurrentCommentEmpId(emp.id);
    const comment = editingRowId === emp.id ? editFormData.directorComments : emp.directorComments;
    setTempComment(comment || '');
    setIsCommentModalOpen(true);
  };

  const saveComment = async () => {
    try {
      const updatedData = { directorComments: tempComment };
      await performanceAPI.updateDirectorAppraisal(currentCommentEmpId, updatedData);

      if (editingRowId === currentCommentEmpId) {
        setEditFormData({ ...editFormData, directorComments: tempComment });
      } else {
        setEmployees(employees.map(emp =>
          emp.id === currentCommentEmpId ? { ...emp, directorComments: tempComment } : emp
        ));
      }
      setIsCommentModalOpen(false);
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: 'Director comments saved successfully!'
      });
    } catch (error) {
      console.error('Error saving comment:', error);
    }
  };

  const handlePreviewLetter = async (emp) => {
    try {
      let employeeDetails = {};
      const idToFetch = emp.employeeMongoId || (emp.employeeId && emp.employeeId.length === 24 ? emp.employeeId : null);
      if (idToFetch) {
        const res = await employeeAPI.getEmployeeById(idToFetch);
        employeeDetails = res.data;
      } else {
        employeeDetails = { ...emp };
      }
      const financialYear = emp.financialYr || selectedFinancialYr || getPreviousFinancialYear();
      const today = new Date();
      const letterDate = formatDisplayDate(today);
      const employeeIdValue = employeeDetails.employeeId || employeeDetails.empId || emp.empId || emp.employeeId;

      let salaryOld = { basic: 0, hra: 0, special: 0, net: 0, empPF: 0, gross: 0, employerPF: 0, gratuity: 0, ctc: 0 };
      let salaryNew = { basic: 0, hra: 0, special: 0, net: 0, empPF: 0, gross: 0, employerPF: 0, gratuity: 0, ctc: 0 };
      const baseSnapshotCtc = Number(emp.currentSalary || 0);
      const revisedSnapshotCtc = Number(emp.revisedSalary || 0);
      const incrementAmount = revisedSnapshotCtc - baseSnapshotCtc;
      const totalPct = Number(emp.incrementPercentage || 0) + Number(emp.incrementCorrectionPercentage || 0);



      try {
        if (employeeIdValue) {
          // "Current" column: prioritize snapshot from appraisal object
          if (emp.releaseSalarySnapshot && Object.keys(emp.releaseSalarySnapshot).length > 0) {
            salaryOld = calculateCurrentSalaryAnnexure(emp.releaseSalarySnapshot);
          } else {
            const fySnapshotRes = await payrollAPI.getSnapshot('24-25', employeeIdValue);
            const fySnapshot = fySnapshotRes.data?.data;
            salaryOld = fySnapshot
              ? calculateCurrentSalaryAnnexure(fySnapshot)
              : calculateSalaryAnnexure(emp.currentGross || emp.currentSalary || 0);
          }

          // "Revised" column: prioritize snapshot from appraisal object
          if (emp.releaseRevisedSnapshot && Object.keys(emp.releaseRevisedSnapshot).length > 0) {
            salaryNew = calculateCurrentSalaryAnnexure(emp.releaseRevisedSnapshot);
          } else {
            // Fallback: try production Payroll table
            const payrollRes = await payrollAPI.getByEmployeeId(employeeIdValue);
            const pr = payrollRes.data;
            if (pr && Number(pr.totalEarnings || 0) > 0) {
              const newGross    = Number(pr.totalEarnings || 0);
              const newBasic    = Number(pr.basicDA || 0);
              const newHra      = Number(pr.hra || 0);
              const newSpecial  = Number(pr.specialAllowance || 0);
              const newEmpPF    = Number(pr.employeePfContribution || 0);
              const newEmrPF    = Number(pr.employerPfContribution || 0);
              const newEsi      = Number(pr.esi || 0);
              const newNet      = newBasic + newHra + newSpecial;
              const newGratuity = Number(pr.gratuity || Math.round(newBasic * 0.0486));
              const newCtc      = Number(pr.ctc || (newGross + newGratuity));
              salaryNew = {
                basic: newBasic, hra: newHra, special: newSpecial,
                net: newNet, empPF: newEmpPF, employeePfContribution: newEmpPF,
                gross: newGross, employerPF: newEmrPF, employerPfContribution: newEmrPF,
                esi: newEsi, gratuity: newGratuity, ctc: newCtc,
              };
            } else {
              // Final Fallback: recalculate from current base + increment %
              const incrementBase = salaryOld.gross || emp.currentGross || baseSnapshotCtc;
              const targetRevisedGross = Math.round(incrementBase * (1 + totalPct / 100));
              salaryNew = calculateSalaryAnnexure(targetRevisedGross, {
                employeePfContribution: salaryOld.employeePfContribution,
                employerPfContribution: salaryOld.employerPfContribution,
                esi: salaryOld.esi
              });
            }
          }
        }
      } catch (err) {
        console.error("Salary prep error:", err);
        const fallbackBase = emp.currentGross || baseSnapshotCtc;
        salaryOld = calculateSalaryAnnexure(fallbackBase);
        const targetRevisedGross = Math.round(salaryOld.gross * (1 + totalPct / 100));
        salaryNew = calculateSalaryAnnexure(targetRevisedGross, {
          employeePfContribution: salaryOld.employeePfContribution,
          employerPfContribution: salaryOld.employerPfContribution,
          esi: salaryOld.esi
        });
      }





      const data = {
        date: letterDate,
        employeeName: employeeDetails.name || employeeDetails.fullName || emp.name,
        employeeId: employeeIdValue || 'EMP-001',
        designation: employeeDetails.designation || employeeDetails.role || emp.designation,
        location: employeeDetails.location || employeeDetails.branch || emp.location || 'Chennai',
        financialYear: financialYear,
        effectiveDate: '1st April 2026',
        incrementPercentage: totalPct,
        incrementAmount,
        performancePay: Number(emp.performancePay || 0),
        salary: {
          old: salaryOld,
          new: salaryNew
        },
        promotion: {
          recommended: emp.promotionRecommendedByReviewer || (emp.promotion?.recommended),
          newDesignation: emp.newDesignation || emp.promotion?.newDesignation || '',
          oldDesignation: employeeDetails.designation || employeeDetails.role || emp.designation,
          effectiveDate: emp.promotionEffectiveDate || emp.promotion?.effectiveDate || emp.effectiveDate || '1st April 2026'
        },
        status: emp.status
      };
      setLetterData(data);
      setShowReleaseLetter(true);
    } catch (error) {
      console.error('Error preparing letter', error);
    }
  };

  const handleApproveAction = (emp) => {
    setReleaseConfirm({ isOpen: true, count: 1, ids: [emp.id], type: 'approve' });
  };

  const handleReleaseAction = (emp) => {
    setReleaseConfirm({ isOpen: true, count: 1, ids: [emp.id], type: 'release' });
  };

  const handleRevokeAction = (emp) => {
    setRevokeConfirm({ isOpen: true, id: emp.id, reason: '' });
  };

  const confirmRevoke = async () => {
    if (!revokeConfirm.reason.trim()) {
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Please provide a reason for revoking the appraisal.'
      });
      return;
    }
    try {
      setLoading(true);
      await performanceAPI.revokeAppraisal(revokeConfirm.id, revokeConfirm.reason);
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: 'Appraisal safely revoked. A new version has been created for the employee.'
      });
      fetchDirectorAppraisals();
    } catch (error) {
      console.error('Error revoking appraisal:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: error.response?.data?.message || 'Failed to revoke appraisal'
      });
    } finally {
      setLoading(false);
      setRevokeConfirm({ isOpen: false, id: null, reason: '' });
    }
  };

  const handleBulkApprove = () => {
    if (selectedRows.length === 0) {
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: 'Please select one or more records to release letters.'
      });
      return;
    }
    const rowsToSubmit = employees.filter(emp => selectedRows.includes(emp.id) && (emp.status === 'directorApproved' || emp.status === 'DIRECTOR_APPROVED' || emp.status === 'reviewerApproved'));
    const unreviewed = rowsToSubmit.filter(emp => !emp.directorComments || emp.directorComments.trim() === '');
    if (unreviewed.length > 0) {
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: `Please add director comments for all selected records before releasing (${unreviewed.length} pending).`
      });
      return;
    }
    const count = rowsToSubmit.length;
    if (count === 0) {
      setStatusPopup({ isOpen: true, status: 'info', message: 'No eligible records found in your selection.' });
      return;
    }
    setReleaseConfirm({ isOpen: true, count, ids: rowsToSubmit.map(e => e.id), type: 'release' });
  };

  const confirmRelease = async () => {
    try {
      const newStatus = releaseConfirm.type === 'approve' ? 'directorApproved' : 'released';

      if (releaseConfirm.type === 'approve') {
        await Promise.all(releaseConfirm.ids.map(id => performanceAPI.directorApprove(id)));
      } else {
        await performanceAPI.directorRelease(releaseConfirm.ids);
      }

      setEmployees(employees.map(emp => releaseConfirm.ids.includes(emp.id) ? { ...emp, status: newStatus } : emp));

      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: releaseConfirm.type === 'approve' ? `${releaseConfirm.count} appraisal(s) approved!` : `${releaseConfirm.count} appraisal(s) released!`
      });
      setSelectedRows([]);
    } catch (error) {
      console.error('Error in director action:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: error.response?.data?.message || 'Failed to process director action'
      });
    } finally {
      setReleaseConfirm({ isOpen: false, count: 0, ids: [], type: 'approve' });
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(filteredEmployees.filter(emp => !['Released Letter', 'Released', 'RELEASED', 'Accepted'].includes(emp.status)).map(emp => emp.id));
    } else {
      setSelectedRows([]);
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const PENDING_STATUSES = ['reviewerApproved', 'directorInProgress', 'directorPushedBack', 'directorApproved', 'DIRECTOR_APPROVED'];
  const COMPLETED_STATUSES = ['released', 'Released Letter', 'RELEASED', 'accepted_pending_effect', 'accepted', 'Accepted', 'effective', 'COMPLETED'];

  const divisions = ['All', ...new Set(employees.map(emp => emp.division).filter(Boolean))];
  const designations = ['All', ...new Set(employees.map(emp => emp.designation).filter(Boolean))];
  const locations = ['All', ...new Set(employees.map(emp => emp.location || emp.branch).filter(Boolean))];
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp =>
      (emp.financialYr === selectedFinancialYr) &&
      (selectedDivision === 'All' || emp.division === selectedDivision) &&
      (selectedDesignation === 'All' || (emp.designation || '').trim() === selectedDesignation) &&
      (selectedLocation === 'All' || (emp.location || emp.branch || '').trim() === selectedLocation) &&
      (emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.empId.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (activeTab === 'pending'
        ? PENDING_STATUSES.includes(emp.status)
        : COMPLETED_STATUSES.includes(emp.status))
    );
  }, [employees, selectedFinancialYr, selectedDivision, selectedDesignation, selectedLocation, searchTerm, activeTab]);

  const totals = useMemo(() => {
    return filteredEmployees.reduce((acc, current) => {
      acc.incrementAmount += Number(current.incrementAmount || 0);
      acc.performancePay += Number(current.performancePay || 0);
      acc.currentSalary += Number(current.currentSalary || 0);
      acc.revisedSalary += Number(current.revisedSalary || 0);
      return acc;
    }, { incrementAmount: 0, performancePay: 0, currentSalary: 0, revisedSalary: 0 });
  }, [filteredEmployees]);

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
      <div className="max-w-[98%] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center space-x-4">
            <select value={selectedFinancialYr} onChange={(e) => setSelectedFinancialYr(e.target.value)} className="block w-48 pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border">
              <option value={getCurrentFinancialYear()}>{getCurrentFinancialYear()} (Current)</option>
              <option value={getPreviousFinancialYear()}>{getPreviousFinancialYear()}</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Search employee..." className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <select value={selectedDivision} onChange={(e) => setSelectedDivision(e.target.value)} className="block w-48 pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border">
              <option value="All">All Divisions</option>
              {divisions.filter(d => d !== 'All').map(div => <option key={div} value={div}>{div}</option>)}
            </select>
            <select value={selectedDesignation} onChange={(e) => setSelectedDesignation(e.target.value)} className="block w-48 pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border text-sm">
              <option value="All">All Designations</option>
              {designations.filter(d => d !== 'All').map(des => <option key={des} value={des}>{des}</option>)}
            </select>
            <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} className="block w-48 pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border">
              <option value="All">All Locations</option>
              {locations.filter(l => l !== 'All').map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">{selectedRows.length} selected</span>
            <button onClick={handleBulkApprove} className="flex items-center px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050] transition-colors shadow-sm">
              <Send className="h-4 w-4 mr-2" />
              Release Letters
            </button>
          </div>
        </div>

        {/* Pending / Completed Tab Toggle */}
        <div className="inline-flex mb-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => { setActiveTab('pending'); setSelectedRows([]); }}
            className={`px-6 py-2.5 text-sm font-semibold transition-all ${activeTab === 'pending'
              ? 'bg-[#262760] text-white shadow-inner'
              : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            Pending
            {activeTab === 'pending' && filteredEmployees.length > 0 && (
              <span className="ml-1">{filteredEmployees.length}</span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('completed'); setSelectedRows([]); }}
            className={`px-6 py-2.5 text-sm font-semibold transition-all ${activeTab === 'completed'
              ? 'bg-[#262760] text-white shadow-inner'
              : 'text-gray-500 hover:bg-gray-50'
              }`}
          >
            Completed
            {activeTab === 'completed' && filteredEmployees.length > 0 && (
              <span className="ml-1">{filteredEmployees.length}</span>
            )}
          </button>
        </div>

        <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
          {loading ? <div className="p-8 text-center text-gray-500">Loading...</div> : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-10 shadow-md text-white uppercase text-xs font-medium">
                {/* Summary Row above Header */}
                <tr className="bg-indigo-50 border-b border-indigo-100 font-bold">
                  <th colSpan={4} className="px-4 py-2.5 text-right text-indigo-900 uppercase tracking-wider text-[10px]">
                    Total Current Salary:
                  </th>
                  <th className="px-4 py-2.5 text-right text-indigo-900 text-sm font-black tabular-nums border-r border-indigo-100">
                    {totals.currentSalary.toLocaleString('en-IN')}
                  </th>
                  <th colSpan={2} className="px-4 py-2.5 text-right text-indigo-900 uppercase tracking-wider text-[10px]">
                    Combined Page Sum:
                  </th>
                  <th className="px-4 py-2.5 text-right text-emerald-700 text-sm font-black tabular-nums bg-emerald-100/50 shadow-sm border-x border-emerald-200/30">
                    {totals.incrementAmount.toLocaleString('en-IN')}
                  </th>
                  <th className="px-4 py-2.5 text-right text-indigo-900 text-sm font-black tabular-nums border-r border-indigo-100">
                    {totals.revisedSalary.toLocaleString('en-IN')}
                  </th>
                  <th className="px-4 py-2.5 text-right text-indigo-900 text-sm font-black tabular-nums border-r border-indigo-100">
                    {totals.performancePay.toLocaleString('en-IN')}
                  </th>
                  <th colSpan={5} className="bg-indigo-50"></th>
                </tr>
                <tr className="bg-[#262760]">
                  <th className="px-4 py-3"><input type="checkbox" onChange={handleSelectAll} checked={selectedRows.length > 0 && selectedRows.length === filteredEmployees.filter(e => !COMPLETED_STATUSES.includes(e.status)).length} className="rounded border-gray-300" /></th>
                  <th className="px-4 py-3 text-left">S.No</th>
                  <th className="px-4 py-3 text-left">Employee ID</th>
                  <th className="px-4 py-3 text-left">Employee Name</th>
                  <th className="px-4 py-3 text-right">Current Salary</th>
                  <th className="px-4 py-3 text-center">Increment %</th>
                  <th className="px-4 py-3 text-center">Increment Correction %</th>
                  <th className="px-4 py-3 text-right">Increment Amount</th>
                  <th className="px-4 py-3 text-right">Revised Salary</th>
                  <th className="px-4 py-3 text-right">Performance Pay</th>
                  <th className="px-4 py-3 text-center">Reviewer Comments</th>
                  <th className="px-4 py-3 text-center">Recommend Promotion</th>
                  <th className="px-4 py-3 text-center">Director Comments</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp, index) => {
                  const isEditing = editingRowId === emp.id;
                  const data = isEditing ? editFormData : emp;
                  const isReleased = COMPLETED_STATUSES.includes(emp.status || '');
                  const isAccepted = ['accepted', 'Accepted', 'accepted_pending_effect', 'effective', 'COMPLETED'].includes(emp.status || '');
                  const isRowLocked = isReleased || emp.status === 'directorApproved' || emp.status === 'DIRECTOR_APPROVED';

                  return (
                    <tr key={emp.id} className={`hover:bg-gray-50 ${selectedRows.includes(emp.id) ? 'bg-indigo-50' : ''}`}>
                      {/* Checkbox */}
                      <td className="px-4 py-4 text-center">
                        {!isReleased && (
                          <input type="checkbox" checked={selectedRows.includes(emp.id)} onChange={() => handleSelectRow(emp.id)} className="rounded border-gray-300 text-[#262760]" />
                        )}
                      </td>
                      {/* S.No */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      {/* Employee ID */}
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">{data.empId}</td>
                      {/* Employee Name */}
                      <td className="px-4 py-4 text-sm text-gray-900">{data.name}</td>
                      {/* Current Salary */}
                      <td className="px-4 py-4 text-sm text-right font-medium">₹{Number(data.currentSalary || 0).toLocaleString('en-IN')}</td>
                      {/* Increment % */}
                      <td className="px-4 py-4 text-sm text-center">{data.incrementPercentage}%</td>
                      {/* Increment Correction % (editable) */}
                      <td className="px-4 py-4 text-sm text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center">
                            <input type="number" className="w-16 px-2 py-1 border rounded text-center" value={data.incrementCorrectionPercentage} onChange={(e) => handleInputChange('incrementCorrectionPercentage', e.target.value)} />
                            <span className="ml-1">%</span>
                          </div>
                        ) : (
                          <span className={data.incrementCorrectionPercentage !== 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}>{data.incrementCorrectionPercentage}%</span>
                        )}
                      </td>
                      {/* Increment Amount */}
                      <td className="px-4 py-4 text-sm text-right text-green-600 font-medium whitespace-nowrap">₹{Number(data.incrementAmount || 0).toLocaleString('en-IN')}</td>
                      {/* Revised Salary */}
                      <td className="px-4 py-4 text-sm text-right font-bold whitespace-nowrap">₹{Number(data.revisedSalary || 0).toLocaleString('en-IN')}</td>
                      {/* Performance Pay */}
                      <td className="px-4 py-4 text-sm text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-24 px-2 py-1 border rounded text-right focus:ring-[#262760] focus:border-[#262760]"
                            value={performancePayDrafts[emp.id] !== undefined ? performancePayDrafts[emp.id] : Number(data.performancePay || 0)}
                            onChange={(e) => handlePerformancePayChange(emp.id, e.target.value)}
                          />
                        ) : (
                          <span className="font-medium">₹{Number(data.performancePay || 0).toLocaleString('en-IN')}</span>
                        )}
                      </td>
                      {/* Reviewer Comments (read-only) */}
                      <td className="px-4 py-4 text-center max-w-[180px]">
                        <span className="text-xs text-gray-700 line-clamp-2">
                          {data.reviewerComments || <span className="text-gray-400 italic">No comments</span>}
                        </span>
                      </td>
                      {/* Recommend Promotion */}
                      <td className="px-4 py-4 text-center text-sm text-gray-900 border-l border-r border-gray-100 max-w-[160px]">
                        <div className="flex flex-col gap-1 items-center">
                          {emp.promotionRecommendedByReviewer ? (
                            <div className="flex flex-col items-center">
                              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Recommended</span>
                              {emp.newDesignation && (
                                <span className="text-[10px] text-gray-500 mt-1 leading-tight text-center" title={`${emp.designation} ➔ ${emp.newDesignation}`}>
                                  <span className="line-through opacity-70">{emp.designation}</span> <br />⬇<br /> <span className="font-bold text-gray-700">{emp.newDesignation}</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No</span>
                          )}
                        </div>
                      </td>
                      {/* Director Comments (editable) */}
                      <td className="px-4 py-4 text-center max-w-[200px]">
                        {isEditing ? (
                          <textarea className="w-40 border border-gray-300 rounded p-1 text-xs resize-none focus:ring-[#262760] focus:border-[#262760]" rows={2} value={data.directorComments || ''} onChange={(e) => handleInputChange('directorComments', e.target.value)} placeholder="Add comments..." />
                        ) : (
                          <div className="text-xs text-gray-700 max-w-[180px] line-clamp-2 mx-auto cursor-pointer hover:text-[#262760]" onClick={() => !isReleased && openCommentModal(emp)}>
                            {data.directorComments || <span className="text-gray-400 italic">Add comments...</span>}
                          </div>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        {(() => {
                          const s = emp.status || '';
                          const labelMap = {
                            reviewerApproved: 'Pending Review',
                            directorInProgress: 'In Review',
                            directorApproved: 'Approved',
                            DIRECTOR_APPROVED: 'Approved',
                            released: 'Released',
                            'Released Letter': 'Released',
                            accepted_pending_effect: 'Accepted',
                            directorPushedBack: 'Pushed Back',
                          };
                          const colorMap = {
                            reviewerApproved: 'bg-orange-100 text-orange-800 animate-pulse',
                            directorInProgress: 'bg-indigo-100 text-indigo-800',
                            directorApproved: 'bg-green-100 text-green-800',
                            DIRECTOR_APPROVED: 'bg-green-100 text-green-800',
                            released: 'bg-teal-100 text-teal-800',
                            'Released Letter': 'bg-teal-100 text-teal-800',
                            accepted_pending_effect: 'bg-purple-100 text-purple-800',
                            directorPushedBack: 'bg-red-100 text-red-800',
                          };
                          const label = labelMap[s] || s;
                          const color = colorMap[s] || 'bg-gray-100 text-gray-700';
                          return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{label}</span>;
                        })()}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center space-x-2">
                          {isEditing ? (
                            <>
                              <button onClick={handleSaveRow} className="text-green-600 hover:text-green-900"><Save className="h-5 w-5" /></button>
                              <button onClick={handleCancelEdit} className="text-red-600 hover:text-red-900"><X className="h-5 w-5" /></button>
                            </>
                          ) : (
                            <>
                              <button className="text-gray-400 hover:text-gray-600" onClick={() => setViewModalData(emp)}><Eye className="h-5 w-5" /></button>
                              <button onClick={() => handlePreviewLetter(emp)} className="text-[#262760] hover:text-[#1e2050]"><FileText className="h-5 w-5" /></button>
                              {!isRowLocked && <button onClick={() => handleEditClick(emp)} className="text-blue-600 hover:text-blue-900"><Edit className="h-4 w-4" /></button>}
                              {isRowLocked ? (
                                <span className={isReleased ? 'hidden' : 'text-green-600'}><CheckCircle className="h-5 w-5 fill-green-100" /></span>
                              ) : (
                                <button onClick={() => handleApproveAction(emp)} className="text-green-600 hover:text-green-900"><CheckCircle className="h-5 w-5" /></button>
                              )}
                              {!isReleased && (emp.status === 'directorApproved' || emp.status === 'DIRECTOR_APPROVED') && (
                                <button onClick={() => handleReleaseAction(emp)} className="text-orange-500 hover:text-orange-700" title="Release Letter"><Send className="h-5 w-5" /></button>
                              )}
                              {isRowLocked && !isAccepted && (
                                <button onClick={() => handleRevokeAction(emp)} className="text-red-500 hover:text-red-700 ml-1" title="Revoke Appraisal">
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals and Popups */}
      <StatusPopup isOpen={statusPopup.isOpen} onClose={() => setStatusPopup({ ...statusPopup, isOpen: false })} {...statusPopup} />

      {releaseConfirm.isOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className={`px-6 py-4 ${releaseConfirm.type === 'approve' ? 'bg-[#262760]' : 'bg-orange-600'} text-white font-bold`}>
              {releaseConfirm.type === 'approve' ? 'Approve Appraisal' : 'Release Letter'}
            </div>
            <div className="p-6">
              <p className="text-gray-700">{releaseConfirm.type === 'approve' ? `Approve ${releaseConfirm.count} records?` : `Release letters for ${releaseConfirm.count} records?`}</p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button onClick={() => setReleaseConfirm({ isOpen: false, count: 0, ids: [], type: 'approve' })} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={confirmRelease} className={`px-4 py-2 text-white rounded ${releaseConfirm.type === 'approve' ? 'bg-[#262760]' : 'bg-orange-600'}`}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {revokeConfirm.isOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border-2 border-red-500">
            <div className="px-6 py-4 bg-red-600 text-white font-bold flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" /> Revoke Appraisal
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-4 whitespace-normal font-medium leading-relaxed">
                Are you sure you want to revoke this appraisal?
              </p>
              <div className="bg-red-50 p-3 rounded text-sm text-red-800 mb-4 border border-red-100">
                <ul className="list-disc pl-4 space-y-1 font-medium">
                  <li>Unlocks the appraisal.</li>
                  <li>Creates a new version.</li>
                  <li>Marks this one as REVOKED (and revokes payroll history if any).</li>
                </ul>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
                <textarea
                  className="w-full h-24 border border-gray-300 rounded p-2 focus:ring-red-500 focus:border-red-500 text-sm"
                  value={revokeConfirm.reason}
                  onChange={(e) => setRevokeConfirm({ ...revokeConfirm, reason: e.target.value })}
                  placeholder="Mandatory reason for revocation..."
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button onClick={() => setRevokeConfirm({ isOpen: false, id: null, reason: '' })} className="px-4 py-2 border border-gray-300 rounded bg-white text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={confirmRevoke} className="px-4 py-2 text-white rounded bg-red-600 hover:bg-red-700 flex items-center font-medium">
                <RotateCcw className="w-4 h-4 mr-2" /> Confirm Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {isCommentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#262760] text-white flex justify-between items-center font-bold">
              Director Comments
              <button onClick={() => setIsCommentModalOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 text-right">
              <textarea className="w-full h-32 border rounded p-3 resize-none" value={tempComment} onChange={(e) => setTempComment(e.target.value)} />
              <div className="mt-4 flex justify-end space-x-3">
                <button onClick={() => setIsCommentModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button>
                <button onClick={saveComment} className="px-4 py-2 bg-[#262760] text-white rounded">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewModalData && (
        <ReviewerViewModal
          selectedEmployee={viewModalData}
          onClose={() => setViewModalData(null)}
          formatDisplayDate={formatDisplayDate}
          hasCompensationAccess={true}
        />
      )}

      {showReleaseLetter && letterData && (
        <div className="fixed inset-0 bg-black/80 z-[70] backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white z-20 shrink-0">
              <h2 className="text-xl font-bold text-gray-800">Release Letter Preview</h2>
              <button
                onClick={() => {
                  setShowReleaseLetter(false);
                  setLetterData(null);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 md:p-8 bg-gray-100 overflow-auto flex flex-col items-center gap-8 flex-grow">
              <div id="release-letter-page-1" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                  <img src="/images/steel-logo.png" alt="" className="w-[500px] opacity-[0.05] grayscale" />
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                  <div className="w-full flex h-32 relative overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none">
                        <path d="M0,0 L400,0 L340,128 L0,128 Z" fill="#1e2b58" />
                        <path d="M400,0 L430,0 L370,128 L340,128 Z" fill="#f37021" />
                      </svg>
                    </div>

                    <div className="relative w-[60%] flex items-center pl-2 pr-12 z-10">
                      <div className="flex items-center gap-4">
                        <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ display: 'block' }} />
                        <div className="text-white">
                          <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
                          <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2 z-10">
                      <div className="flex items-center mb-2">
                        <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-start justify-end text-right">
                        <span className="text-sm font-semibold text-gray-700 w-64 leading-tight">No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-12 py-6 flex-grow">
                    <div className="flex justify-between mb-6">
                      <div />
                      <div className="text-gray-700">Date: <span className="font-bold">{letterData.date}</span></div>
                    </div>

                    <div className="mb-6">
                      <div className="font-bold text-gray-800 mb-4">To:</div>
                      <div className="inline-block min-w-[300px]">
                        <div className="grid grid-cols-[120px_1fr] gap-y-1">
                          <div className="text-gray-500 font-medium">Name</div>
                          <div className="text-gray-900 font-bold">: {letterData.employeeName}</div>

                          <div className="text-gray-500 font-medium">Employee ID</div>
                          <div className="text-gray-900 font-bold">: {letterData.employeeId}</div>

                          <div className="text-gray-500 font-medium">Designation</div>
                          <div className="text-gray-900 font-bold">: {letterData.designation}</div>

                          <div className="text-gray-500 font-medium">Location</div>
                          <div className="text-gray-900 font-bold">: {letterData.location}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-8 text-center">
                      <div className="font-bold text-xl underline decoration-1 underline-offset-4">PERFORMANCE APPRAISAL LETTER</div>
                    </div>

                    <div className="mb-6">
                      <div className="mb-4">Dear <span className="font-semibold">{letterData.employeeName}</span>,</div>
                      <p className="text-justify text-[14px] leading-6 mb-4">
                        The Performance Review for the financial year {letterData.financialYear} has been completed.
                      </p>
                      <p className="text-justify text-[14px] leading-6 mb-4">
                        We are pleased to inform you that based on the available benchmarks in the industry and your performance appraisal, we have revised your compensation effective {letterData.effectiveDate}.
                      </p>
                      <p className="text-justify text-[14px] leading-6 mb-4">
                        Details are provided in the attached Annexure. We draw your attention to the fact that your compensation is personal to you. As this information is confidential, we expect you to refrain from sharing the same with your colleagues. I take this opportunity to thank you for the contribution made by you during the year of review and wish you success for the year ahead.
                      </p>
                      {Number(letterData.performancePay || 0) > 0 && (
                        <div className="text-justify text-[14px] leading-6 mb-4">
                          <p>
                            In addition, you have been awarded a Performance Pay of ₹{Number(letterData.performancePay || 0).toLocaleString('en-IN')} based on company and individual performance.
                          </p>
                          <p className="mt-4">
                            This amount will be credited in the month of June2026 provided you are in company payroll.
                          </p>
                          <p className="mt-4">
                            If you are in a notice period ,You will not be eligible for the performance pay reciept.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mb-8 text-justify text-[14px] leading-6">
                      <p>We look forward to your continued dedication and commitment to the organization.</p>
                      <p className="mt-4">All other terms and conditions of your employment remain unchanged.</p>
                    </div>

                    <div className="mt-12 flex justify-end">
                      <div className="text-right relative">
                        <div className="mb-2 text-sm text-gray-700 font-bold font-bitsumishi">For CALDIM ENGINEERING PRIVATE LIMITED</div>
                        <div className="mt-8 flex flex-col items-end min-h-[80px]">
                          <img 
                            src={getAbsoluteSignatureUrl(letterData.location)} 
                            alt="Authorized Signatory" 
                            className="h-16 mb-2 object-contain" 
                            crossOrigin="anonymous" 
                          />

                          <div className="font-bold">Authorized Signatory</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-24 relative mt-auto overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                        <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                        <path d="M350,0 L794,0 L794,96 L290,96 Z" fill="#1e2b58" />
                      </svg>
                    </div>

                    <div className="relative z-10 w-full h-full flex items-center justify-end pr-10 pt-4">
                      <div className="text-white text-right">
                        <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                        <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div id="release-letter-page-2" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                  <img src="/images/steel-logo.png" alt="" className="w-[500px] opacity-[0.05] grayscale" />
                </div>

                <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                  <div className="w-full flex h-32 relative overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none">
                        <path d="M0,0 L400,0 L340,128 L0,128 Z" fill="#1e2b58" />
                        <path d="M400,0 L430,0 L370,128 L340,128 Z" fill="#f37021" />
                      </svg>
                    </div>

                    <div className="relative w-[60%] flex items-center pl-2 pr-12 z-10">
                      <div className="flex items-center gap-4">
                        <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ display: 'block' }} />
                        <div className="text-white">
                          <h1 className="text-3xl font-bold leading-none tracking-wide">CALDIM</h1>
                          <p className="text-[10px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2 z-10">
                      <div className="flex items-center mb-2">
                        <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex items-start justify-end text-right">
                        <span className="text-sm font-semibold text-gray-700 w-64 leading-tight">No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</span>
                        <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-12 py-4 flex-grow">
                    <div className="mb-4 text-center">
                      <div className="font-bold text-xl underline decoration-1 underline-offset-4">ANNEXURE - SALARY REVISION DETAILS</div>
                    </div>

                    <div className="mb-4">
                      <p className="text-[14px] leading-6 mb-4">
                        Name: <span className="font-semibold">{letterData.employeeName}</span><br />
                        Employee ID: <span className="font-semibold">{letterData.employeeId}</span>
                      </p>
                      <p className="text-[14px] leading-6 mb-4">
                        Revised compensation details with effect from <span className="font-semibold">{letterData.effectiveDate}</span>:
                      </p>
                    </div>

                    <div className="mb-4">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                          <tr className="bg-[#1e2b58] text-white">
                            <th className="border border-gray-300 px-4 py-2 text-left w-1/3">Salary Component</th>
                            <th className="border border-gray-300 px-4 py-2 text-right w-1/3">Current (Monthly)</th>
                            <th className="border border-gray-300 px-4 py-2 text-right w-1/3">Revised (Monthly)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'Basic Salary', key: 'basic' },
                            { label: 'HRA', key: 'hra' },
                            { label: 'Special Allowance', key: 'special' },
                            { label: 'Net Salary (Take Home)', key: 'net', isBold: true },
                            { label: 'Employee PF Contribution', key: 'empPF' },
                            { label: 'Gross Salary', key: 'gross', isBold: true },
                            { label: 'Employer PF Contribution', key: 'employerPF' },
                            { label: 'Gratuity', key: 'gratuity' },
                            { label: 'CTC', key: 'ctc', isBold: true, isTotal: true }
                          ].map((row, index) => (
                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className={`border border-gray-300 px-4 py-2 ${row.isBold ? 'font-bold' : ''}`}>{row.label}</td>
                              <td className={`border border-gray-300 px-4 py-2 text-right ${row.isBold ? 'font-bold' : ''}`}>
                                {letterData.salary.old[row.key]?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`border border-gray-300 px-4 py-2 text-right ${row.isBold ? 'font-bold' : ''}`}>
                                {letterData.salary.new[row.key]?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-4 text-[13px] text-gray-800 leading-relaxed">
                      <div className="mb-4">
                        <p className="font-bold underline mb-1">Notes:</p>
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Professional Tax (PT): ₹1,250 (deducted every six months) in addition to regular statutory deductions.</li>
                          <li>Your revised salary will be subject to applicable statutory deductions, including Tax Deducted at Source (TDS) under the Income Tax Act, 1961, as amended from time to time, and any other statutory obligations.</li>
                        </ul>
                      </div>

                      <div className="mb-4">
                        <p>I accept the above offer described in this letter.</p>
                      </div>

                      <div className="mt-4">
                        <p className="font-bold underline mb-2">Employee Declaration:</p>
                        <p className="mb-8 text-justify">
                          I have read and understood the terms stated in this Annexure and agree to abide by them during my employment with Caldim Engineering Pvt Ltd.
                        </p>

                        <div className="flex justify-between items-end mt-8 px-4">
                          <div className="font-bold">Signature: ______________________</div>
                          <div className="font-bold">Date: __________________</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-24 relative mt-auto overflow-hidden">
                    <div className="absolute inset-0 z-0">
                      <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                        <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                        <path d="M350,0 L794,0 L794,96 L290,96 Z" fill="#1e2b58" />
                      </svg>
                    </div>

                    <div className="relative z-10 w-full h-full flex items-center justify-end pr-10 pt-4">
                      <div className="text-white text-right">
                        <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                        <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page 3: Promotion Letter (Conditional) */}
              {letterData.promotion?.recommended && (letterData.status === 'released' || letterData.status === 'RELEASED' || letterData.status === 'Released Letter' || letterData.status === 'accepted' || letterData.status === 'accepted_pending_effect') && letterData.promotion?.newDesignation && (
                <div id="release-letter-page-3" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col mt-8 break-before-page">
                  {/* Decorative Background */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <img src="/images/steel-logo.png" alt="" className="w-[500px] opacity-[0.04] grayscale" crossOrigin="anonymous" style={{ display: 'block' }} />
                    <div className="w-[500px] h-[500px] border-[40px] border-purple-50 rounded-full opacity-20 absolute -top-20 -right-20"></div>
                    <div className="w-[300px] h-[300px] border-[20px] border-indigo-50 rounded-full opacity-20 absolute -bottom-10 -left-10"></div>
                  </div>

                  <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                    <div className="w-full flex h-32 relative overflow-hidden">
                      <div className="absolute inset-0 z-0">
                        <svg width="100%" height="100%" viewBox="0 0 794 128" preserveAspectRatio="none">
                          <path d="M0,0 L480,0 L410,128 L0,128 Z" fill="#1e2b58" />
                          <path d="M480,0 L510,0 L440,128 L410,128 Z" fill="#f37021" />
                        </svg>
                      </div>

                      <div className="relative w-[60%] flex items-center pl-2 pr-12 z-10">
                        <div className="flex items-center gap-4">
                          <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" crossOrigin="anonymous" style={{ display: 'block' }} />
                          <div className="text-white font-bitsumishi">
                            <h1 className="text-5xl font-bold leading-none tracking-[0.05em]">CALDIM</h1>
                            <p className="text-[9px] tracking-[0.18em] mt-1 text-orange-400 font-semibold uppercase">ENGINEERING PRIVATE LIMITED</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2 z-10">
                        <div className="flex items-center mb-2">
                          <span className="font-bold text-gray-800 mr-3 text-lg">044-47860455</span>
                          <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex items-start justify-end text-right">
                          <span className="text-sm font-semibold text-gray-700 w-64 leading-tight">No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</span>
                          <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-16 pt-6 pb-10 flex-grow flex flex-col">
                      <div className="text-right text-sm text-gray-800 font-medium">Date: <span className="font-bold">{letterData.date}</span></div>

                      <div className="w-full flex justify-center mt-12">
                        <div className="h-16 w-16 bg-[#1e2b58] rounded-xl shadow-lg border-2 border-indigo-100 flex items-center justify-center">
                          <Trophy className="h-8 w-8 text-yellow-400" />
                        </div>
                      </div>

                      <div className="mt-10 text-center w-full">
                        <h2 className="text-[22px] font-black tracking-[0.25em] text-[#1e2b58] uppercase underline underline-offset-8 decoration-2">
                          CERTIFICATE OF PROMOTION
                        </h2>
                      </div>

                      <div className="mt-10 w-full max-w-[620px] mx-auto space-y-7 text-[14px] leading-7 text-gray-800 text-left">
                        <p>Dear <span className="font-black text-gray-900 uppercase">{letterData.employeeName}</span>,</p>

                        <p>
                          You have been promoted as <span className="font-black text-[#1e2b58] bg-blue-50 px-2 py-1 rounded">"{letterData.promotion.newDesignation}"</span> in recognition of your consistent performance, dedication, and valuable contributions to the organization.
                        </p>

                        <p>
                          The promotion will be effective from <span className="font-black text-gray-900">{formatDisplayDate(letterData.promotion.effectiveDate)}</span>.
                        </p>

                        <p>
                          We congratulate you on this achievement and wish you continued success in your new role.
                        </p>
                      </div>

                      <div className="mt-auto pt-20 flex justify-end">
                        <div className="w-[380px] text-right">
                          <p className="text-[11px] text-gray-600 font-bold uppercase tracking-wide mb-3 font-bitsumishi">FOR CALDIM ENGINEERING PRIVATE LIMITED</p>
                          <div className="min-h-[90px] flex items-center justify-end">
                            <img 
                              src={getAbsoluteSignatureUrl(letterData.location)} 
                              alt="Authorized Signatory" 
                              className="h-20 object-contain" 
                              crossOrigin="anonymous" 
                              style={{ display: 'block' }} 
                            />

                          </div>
                          <p className="font-black text-gray-900 text-[13px] mt-1">Authorized Signatory</p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-24 relative mt-auto overflow-hidden">
                      <div className="absolute inset-0 z-0">
                        <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                          <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                          <path d="M350,0 L794,0 L794,96 L290,96 Z" fill="#1e2b58" />
                        </svg>
                      </div>

                      <div className="relative z-10 w-full h-full flex items-center justify-end pr-10 pt-4">
                        <div className="text-white text-right">
                          <div className="text-sm font-medium tracking-wide">Website : www.caldimengg.com</div>
                          <div className="text-sm font-medium tracking-wide mt-1">CIN U74999TN2016PTC110683</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DirectorApproval;
