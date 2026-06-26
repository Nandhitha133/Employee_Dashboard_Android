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
  AlertCircle,
  XCircle,
  Filter,
  User,
  Star,
  FileText,
  Users,
  BarChart3,
  Code,
  TrendingUp,
  Briefcase,
  Award,
  Maximize2,
  History,
  RotateCcw,
  Target,
  Send,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { APPRAISAL_STAGES, calculateSalaryAnnexure, calculateIncrement } from '../../utils/performanceUtils';
import { performanceAPI, employeeAPI, promotionAPI, payrollAPI } from '../../services/api';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

const getDefaultEffectiveDate = (fy) => {
  if (!fy || !fy.includes('-')) return new Date().toISOString().split('T')[0];
  const parts = fy.split('-');
  const yearStart = parseInt(parts[0], 10);
  if (isNaN(yearStart)) return new Date().toISOString().split('T')[0];
  // Effective date is April 1st of the end of the FY (e.g., FY 2025-26 -> April 1st 2026)
  return `${yearStart + 1}-04-01`;
};

const formatDisplayDate = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Enhanced Rating Stars Component with Labels
const RatingStars = ({ value, onChange, readOnly = false, size = "h-5 w-5", showValue = true }) => {
  const stars = [1, 2, 3, 4, 5];
  const numericValue = Number(value) || 0;

  return (
    <div className="flex items-center space-x-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && onChange(star)}
          className={`${!readOnly ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform focus:outline-none`}
          disabled={readOnly}
        >
          <Star
            className={`${size} ${star <= numericValue
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
              }`}
          />
        </button>
      ))}
      {!readOnly && showValue && (
        <span className="ml-2 text-xs text-gray-500">
          {numericValue ? `${numericValue}/5` : 'Not rated'}
        </span>
      )}
    </div>
  );
};

// Rating Comparison Row Component
const RatingComparisonRow = ({ label, selfValue, managerValue, onReviewerChange, isEditable }) => (
  <div className="py-3 border-b border-gray-100 last:border-0">
    <div className="text-sm font-semibold text-gray-700 mb-2">{label}</div>
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-1 min-w-[140px]">
        <span className="text-[10px] font-semibold text-gray-400 uppercase w-10 shrink-0">Self</span>
        <RatingStars value={selfValue} readOnly={true} size="h-4 w-4" showValue={false} />
        <span className="ml-1 text-xs text-gray-500 font-bold tabular-nums">{selfValue}/5</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-semibold text-indigo-500 uppercase w-14 shrink-0">Manager</span>
        <RatingStars
          value={managerValue}
          onChange={onReviewerChange}
          readOnly={!isEditable}
          size="h-4 w-4"
          showValue={false}
        />
        <span className="ml-1 text-xs text-gray-800 font-black tabular-nums">
          {managerValue ? `${managerValue}/5` : '—'}
        </span>
      </div>
    </div>
  </div>
);

const getReviewerFinancialYearOptions = () => {
  const currentFY = getCurrentFinancialYear();
  const prevFY = getPreviousFinancialYear();
  return [prevFY, currentFY];
};

const ReviewerApproval = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFinancialYr, setSelectedFinancialYr] = useState(getCurrentFinancialYear());
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [activeReviewerTab, setActiveReviewerTab] = useState('pending');
  const [statusPopup, setStatusPopup] = useState({
    isOpen: false,
    status: 'info',
    message: ''
  });
  const [submitConfirm, setSubmitConfirm] = useState({
    isOpen: false,
    count: 0,
    ids: []
  });

  // Inline Editing State
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [performancePayDrafts, setPerformancePayDrafts] = useState({});
  const performancePaySaveTimersRef = useRef({});

  // Comment Modal State
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [currentCommentEmpId, setCurrentCommentEmpId] = useState(null);
  const [tempComment, setTempComment] = useState('');

  // View Details Modal State
  const [viewModalData, setViewModalData] = useState(null);
  const [employeeDirectory, setEmployeeDirectory] = useState([]);
  const [promotionModal, setPromotionModal] = useState({ open: false, emp: null });
  const [designationOptions, setDesignationOptions] = useState([]);
  const [promotionForm, setPromotionForm] = useState({
    newDesignation: '',
    effectiveDate: '',
    remarks: ''
  });

  const [zoomModal, setZoomModal] = useState({
    isOpen: false,
    title: '',
    value: '',
    onSave: null
  });

  const openZoomedTextArea = (title, value, onSave) => {
    setZoomModal({
      isOpen: true,
      title,
      value,
      onSave
    });
  };

  // Dynamic Attributes State
  const [masterAttributes, setMasterAttributes] = useState({});
  const [enabledSections, setEnabledSections] = useState({});
  const [isAttrModalOpen, setIsAttrModalOpen] = useState(false);
  const [activeAttrTab, setActiveAttrTab] = useState('technical'); // technical, behaviour, process, growth

  const getAttributeLabel = (section, key) => {
    const item = masterAttributes[section]?.find(i => i.key === key);
    if (item) return item.label;
    // Fallback normalization
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getEnabledItems = (sectionKey) => {
    const enabledMap = enabledSections?.[sectionKey] || {};
    const masterList = masterAttributes?.[sectionKey] || [];
    return masterList.filter(attr => enabledMap[attr.key]);
  };

  // Fetch master attributes once
  useEffect(() => {
    performanceAPI.getMasterAttributes().then(res => setMasterAttributes(res.data)).catch(err => console.error("Error fetching master attributes", err));
  }, []);

  // Fetch data when tab changes
  useEffect(() => {
    fetchReviewerAppraisals(activeReviewerTab);
  }, [activeReviewerTab]);
  useEffect(() => {
    // When viewing or editing an employee, fetch their designation's attribute config
    const emp = editingRowId ? editFormData : viewModalData;
    if (!emp?.designation) return;

    performanceAPI.getAttributes(emp.designation)
      .then(res => setEnabledSections(res.data.sections || {}))
      .catch(err => console.error("Error fetching designation attributes", err));
  }, [editingRowId, viewModalData?.id]);

  useEffect(() => {
    employeeAPI.getAllEmployees()
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        setEmployeeDirectory(list);
        const options = Array.from(new Set(list.map(e => e.designation || e.role || e.position).filter(Boolean))).sort((a, b) => a.localeCompare(b));
        setDesignationOptions(options);
      })
      .catch(() => {
        setEmployeeDirectory([]);
        setDesignationOptions([]);
      });
  }, []);

  const uniqueYears = useMemo(() => {
    return getReviewerFinancialYearOptions();
  }, []);

  useEffect(() => {
    if (!uniqueYears.length) return;
    if (!selectedFinancialYr || !uniqueYears.includes(selectedFinancialYr)) {
      setSelectedFinancialYr(uniqueYears[0]);
    }
  }, [uniqueYears, selectedFinancialYr]);

  const fetchReviewerAppraisals = async (tab = activeReviewerTab) => {
    setLoading(true);
    try {
      const response = await performanceAPI.getReviewerAppraisals({ tab });
      const raw = response.data || [];

      // Fetch FY24-25 snapshot data for true historical currentGross
      const payrollRes = await payrollAPI.getSnapshotsList('24-25');
      const allSnapshots = Array.isArray(payrollRes.data?.data) ? payrollRes.data.data : [];

      const enhanced = await Promise.all(raw.map(async emp => {
        const empId = emp.employeeId || emp.empId;
        const snapshot = allSnapshots.find(p => String(p.employeeId).toLowerCase() === String(empId).toLowerCase());
        
        // Use FY24-25 totalEarnings as the base Gross, fallback to what's in appraisal
        const currentGross = snapshot ? Number(snapshot.totalEarnings || 0) : (Number(emp.currentSalary || 0));
        const currentCTC = snapshot ? Number(snapshot.ctc || 0) : calculateSalaryAnnexure(currentGross).ctc;
        
        // Store currentGross for later use in edits
        emp.currentGross = currentGross;

        let pct = 0;
        const correctionPct = Number(emp.incrementCorrectionPercentage || 0);
        const rating = (emp.managerReview?.performanceRating || emp.appraiserRating || '').split(' ')[0];
        try {
          if (emp.financialYr && emp.designation && rating) {
            const calcRes = await performanceAPI.calculateIncrementFromMatrix({
              financialYear: emp.financialYr,
              designation: emp.designation,
              rating
            });
            if (calcRes.data && calcRes.data.success) {
              pct = Number(calcRes.data.percentage || 0);
            }
          }
        } catch (e) {
          console.error("Failed to suggest increment from matrix", e);
          pct = 0;
        }

        const { incrementAmount, revisedSalary } = calculateFinancials(
          currentGross,
          pct,
          correctionPct
        );

        return {
          ...emp,
          currentSalary: currentCTC,
          incrementPercentage: pct,
          incrementAmount,
          revisedSalary,
          // Map promotion fields to flat state for UI
          promotionRecommendedByReviewer: emp.promotion?.recommended || false,
          promotionRemarksReviewer: emp.promotion?.remarksReviewer || '',
          newDesignation: emp.promotion?.newDesignation || '',
          promotionEffectiveDate: emp.promotion?.effectiveDate || ''
        };
      }));
      setEmployees(enhanced);
    } catch (error) {
      console.error('Error fetching appraisals:', error);
      alert('Failed to fetch appraisals');
    } finally {
      setLoading(false);
    }
  };

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

  const handleEditClick = async (emp) => {
    try {
      // Automatic status transition on open (submitted -> managerInProgress)
      const res = await performanceAPI.openReviewerAppraisal(emp.id);

      const effectiveDate = emp.effectiveDate || getDefaultEffectiveDate(emp.financialYr || emp.financialYear || selectedFinancialYr);
      const editData = {
        ...emp,
        status: res.data?.status || emp.status,
        effectiveDate,
        promotionRecommendedByReviewer: emp.promotion?.recommended || false,
        promotionRemarksReviewer: emp.promotion?.remarksReviewer || '',
        newDesignation: emp.promotion?.newDesignation || '',
        promotionEffectiveDate: emp.promotion?.effectiveDate || '',
        newPromotionRemarkReviewer: ''
      };

      setEditingRowId(emp.id);
      const processedData = calculateAutoFields(editData);
      setEditFormData(processedData);
      setViewModalData(processedData);
    } catch (error) {
      console.error('Failed to open record:', error);
      // Fallback: still open the modal even if API transition fails (might already be in-progress)
      setViewModalData(emp);
    }
  };

  const handleInlineEditClick = async (emp) => {
    try {
      const res = await performanceAPI.openReviewerAppraisal(emp.id);

      const effectiveDate = emp.effectiveDate || getDefaultEffectiveDate(emp.financialYr || emp.financialYear || selectedFinancialYr);
      const editData = {
        ...emp,
        status: res.data?.status || emp.status,
        effectiveDate,
        promotionRecommendedByReviewer: emp.promotion?.recommended || false,
        promotionRemarksReviewer: emp.promotion?.remarksReviewer || '',
        newDesignation: emp.promotion?.newDesignation || '',
        promotionEffectiveDate: emp.promotion?.effectiveDate || '',
        newPromotionRemarkReviewer: ''
      };

      setEditingRowId(emp.id);
      setEditFormData(calculateAutoFields(editData));
    } catch (error) {
      console.error('Failed to open record for inline edit:', error);
      setEditingRowId(emp.id);
      setEditFormData(calculateAutoFields(emp));
    }
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  const handleSaveRow = async () => {
    try {
      const {
        reviewerComments,
        managerComments,
        appraiserRating,
        incrementPercentage,
        incrementCorrectionPercentage,
        incrementAmount,
        revisedSalary,
        performancePay,
        promotionRecommendedByReviewer,
        promotionRemarksReviewer,
        newDesignation
      } = editFormData;

      const rounded = calculateFinancials(
        editFormData.currentSalary,
        incrementPercentage,
        incrementCorrectionPercentage
      );

      await performanceAPI.updateReviewerAppraisal(editingRowId, {
        reviewerComments,
        incrementPercentage,
        incrementCorrectionPercentage,
        incrementAmount: rounded.incrementAmount,
        revisedSalary: rounded.revisedSalary,
        performancePay,
        // Wrap promotion into object for backend
        promotion: {
          recommended: promotionRecommendedByReviewer,
          remarksReviewer: promotionRemarksReviewer,
          newDesignation: newDesignation,
          effectiveDate: editFormData.promotionEffectiveDate
        },
        // Include the ratings
        behaviourManagerRatings: editFormData.behaviourManagerRatings,
        processManagerRatings: editFormData.processManagerRatings,
        technicalManagerRatings: editFormData.technicalManagerRatings,
        growthManagerRatings: editFormData.growthManagerRatings,
        effectiveDate: editFormData.effectiveDate,
        keyPerformance: editFormData.keyPerformance,
        leadership: editFormData.leadership,
        attitude: editFormData.attitude,
        communication: editFormData.communication,
        managerComments,
        appraiserRating
      });

      // Reload the data from backend to get updated history or manually construct it for optimism
      fetchReviewerAppraisals();

      setEditingRowId(null);
      setEditFormData({});
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: 'Review saved successfully!'
      });
    } catch (error) {
      console.error('Error saving row:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to save row. Please try again.'
      });
    }
  };

  const handleInputChange = (field, value) => {
    let newData = { ...editFormData, [field]: value };

    if (field === 'incrementPercentage' || field === 'incrementCorrectionPercentage') {
      const { incrementAmount, revisedSalary } = calculateFinancials(
        newData.currentGross || (newData.currentSalary - 1114),
        newData.incrementPercentage || 0,
        newData.incrementCorrectionPercentage || 0
      );
      newData.incrementAmount = incrementAmount;
      newData.revisedSalary = revisedSalary;
    }

    setEditFormData(newData);
  };

  const getMatrixIncrement = (designation, rating) => {
    const d = String(designation || '').toLowerCase();
    const r = String(rating || '').split(' (')[0]; // Extract ES, ME, BE from "ES (4.5/5)"

    // Category 1: Admin, Sr/Asst PM, Branch Mgr
    if (d.includes('admin manager') || d.includes('asst project manager') || d.includes('sr project manager') || d.includes('branch manager')) {
      if (r === 'ES') return 8;
      if (r === 'ME') return 4;
      if (r === 'BE') return 2;
    }

    // Category 2: Project Co-Ordinator, Team Lead
    if (d.includes('project co-ordinator') || d.includes('team lead')) {
      if (r === 'ES') return 10;
      if (r === 'ME') return 5;
      if (r === 'BE') return 3;
    }

    // Category 3: Sys Eng, Sr Eng, IT Admin, Soft Dev
    if (d.includes('system engineer') || d.includes('sr.engineer') || d.includes('it admin') || d.includes('software developer')) {
      if (r === 'ES') return 12;
      if (r === 'ME') return 8;
      if (r === 'BE') return 5;
    }

    // Category 4: Detailer, Jr Eng, Modeler, Office Asst, Trainee
    if (d.includes('detailer') || d.includes('jr.engineer') || d.includes('modeler') || d.includes('office assistant') || d.includes('trainee')) {
      if (r === 'ES') return 15;
      if (r === 'ME') return 10;
      if (r === 'BE') return 5;
    }

    return 0; // Default
  };

  const calculateAutoFields = (data) => {
    let newData = { ...data };
    // Update Financials with current increment % and correction %
    const { incrementAmount, revisedSalary } = calculateFinancials(
      newData.currentGross || (newData.currentSalary - 1114),
      newData.incrementPercentage,
      newData.incrementCorrectionPercentage || 0
    );
    newData.incrementAmount = incrementAmount;
    newData.revisedSalary = revisedSalary;

    return newData;
  };

  const handleRatingChange = (category, field, value) => {
    const mapKey = `${category}ManagerRatings`;
    let newData = {
      ...editFormData,
      [mapKey]: {
        ...(editFormData[mapKey] || {}),
        [field]: value
      }
    };

    // Ratings are qualitative only; do not auto-calculate increment from them
    newData = calculateAutoFields(newData);
    setEditFormData(newData);
  };

  const handleOpenPromotion = (emp) => {
    const isEditing = editingRowId === emp.id;
    const data = isEditing ? editFormData : emp;

    setPromotionModal({ open: true, emp });
    setPromotionForm({
      newDesignation: data.newDesignation || emp.designation || '',
      effectiveDate: data.promotionEffectiveDate || emp.promotion?.effectiveDate || getDefaultEffectiveDate(emp.financialYr || selectedFinancialYr),
      remarks: data.promotionRemarksReviewer || ''
    });
  };

  const handleSavePromotion = () => {
    const { newDesignation, effectiveDate, remarks } = promotionForm;

    if (!newDesignation) {
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Please select a new designation.'
      });
      return;
    }

    const updateData = {
      promotionRecommendedByReviewer: true,
      newDesignation,
      promotionEffectiveDate: effectiveDate,
      promotionRemarksReviewer: remarks,
      promotionStatus: 'recommended'
    };

    if (editingRowId === promotionModal.emp.id) {
      setEditFormData(prev => ({ ...prev, ...updateData }));
    } else {
      setEmployees(prev => prev.map(e => e.id === promotionModal.emp.id ? { ...e, ...updateData } : e));
      // Auto-enter edit mode to allow saving the changes
      handleEditClick(promotionModal.emp);
      setEditFormData(prev => ({ ...prev, ...updateData }));
    }

    setPromotionModal({ open: false, emp: null });
  };

  const handleRemovePromotion = () => {
    const updateData = {
      promotionRecommendedByReviewer: false,
      newDesignation: '',
      promotionRemarksReviewer: '',
      promotionStatus: 'none'
    };

    if (editingRowId === promotionModal.emp.id) {
      setEditFormData(prev => ({ ...prev, ...updateData }));
    } else {
      setEmployees(prev => prev.map(e => e.id === promotionModal.emp.id ? { ...e, ...updateData } : e));
    }
    setPromotionModal({ open: false, emp: null });
  };

  useEffect(() => {
    const emp = editingRowId ? editFormData : viewModalData;
    if (!emp?.designation) return;

    performanceAPI.getAttributes(emp.designation)
      .then(res => setEnabledSections(res.data.sections || {}))
      .catch(err => console.error("Error fetching designation attributes", err));
  }, [editingRowId, viewModalData?.id]);

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
        await performanceAPI.updateReviewerAppraisal(id, { performancePay: numeric });
      } catch (error) {
        console.error('Failed to save performance pay', error);
        setStatusPopup({
          isOpen: true,
          status: 'error',
          message: 'Failed to save Performance Pay. Please try again.'
        });
      }
    }, 600);
  };

  const openCommentModal = (emp) => {
    setCurrentCommentEmpId(emp.id);
    const comment = editingRowId === emp.id ? editFormData.reviewerComments : emp.reviewerComments;
    setTempComment(comment || '');
    setIsCommentModalOpen(true);
  };

  const saveComment = async () => {
    if (editingRowId === currentCommentEmpId) {
      setEditFormData({ ...editFormData, reviewerComments: tempComment });
      setIsCommentModalOpen(false);
      return;
    }

    try {
      await performanceAPI.updateReviewerAppraisal(currentCommentEmpId, {
        reviewerComments: tempComment
      });

      setEmployees(employees.map(emp =>
        emp.id === currentCommentEmpId ? { ...emp, reviewerComments: tempComment } : emp
      ));
      setIsCommentModalOpen(false);
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: 'Review comments saved successfully!'
      });
    } catch (error) {
      console.error('Error saving comment:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to save comment. Please try again.'
      });
    }
  };

  const handleSubmitToDirector = () => {
    if (selectedRows.length === 0) {
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: 'Please select one or more records to submit to Director.'
      });
      return;
    }

    const candidates = employees.filter(emp => selectedRows.includes(emp.id));
    // Valid for submission if it has passed the appraiser stage OR was pushed back specifically to reviewer
    const rowsToSubmit = candidates.filter(emp =>
      ['reviewerPending', 'reviewerInProgress', 'directorPushedBack'].includes(emp.status) ||
      emp.promotionStatus === 'sentBack'
    );

    const unreviewed = rowsToSubmit.filter(emp => !emp.reviewerComments || emp.reviewerComments.trim() === '');
    if (unreviewed.length > 0) {
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: `Please add reviewer comments for all selected records before submitting (${unreviewed.length} pending).`
      });
      return;
    }

    const count = rowsToSubmit.length;
    if (count === 0) {
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: 'No eligible records found in your selection.'
      });
      return;
    }

    const ids = rowsToSubmit.map(e => e.id);
    setSubmitConfirm({
      isOpen: true,
      count,
      ids
    });
  };

  const confirmSubmitToDirector = async () => {
    if (!submitConfirm.isOpen || !submitConfirm.ids.length) {
      setSubmitConfirm({ isOpen: false, count: 0, ids: [] });
      return;
    }
    try {
      await performanceAPI.reviewerSubmitToDirector(submitConfirm.ids);
      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: `${submitConfirm.count} record(s) submitted to Director successfully!`
      });
      setSubmitConfirm({ isOpen: false, count: 0, ids: [] });
      fetchReviewerAppraisals();
      setSelectedRows([]);
    } catch (error) {
      console.error('Error submitting to Director:', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to submit to Director. Please try again.'
      });
      setSubmitConfirm({ isOpen: false, count: 0, ids: [] });
    }
  };

  const handleSingleSubmitToDirector = async (empId) => {
    try {
      // Basic check: we need reviewer comments
      const emp = editFormData.id === empId ? editFormData : employees.find(e => e.id === empId);
      if (!emp || !emp.reviewerComments || emp.reviewerComments.trim() === '') {
        setStatusPopup({
          isOpen: true,
          status: 'error',
          message: 'Please add reviewer comments before submitting.'
        });
        return;
      }

      // First save if it's currently being edited
      if (editingRowId === empId) {
        await handleSaveRow();
      }

      await performanceAPI.reviewerSubmitToDirector([empId]);

      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: 'Record submitted to Director successfully!'
      });

      setViewModalData(null);
      setEditingRowId(null);
      fetchReviewerAppraisals();
    } catch (error) {
      console.error('Submission failed', error);
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: 'Failed to submit to Director.'
      });
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pendingRecords = filteredEmployees
        .filter(emp =>
          ['reviewerPending', 'reviewerInProgress', 'directorPushedBack', 'managerApproved'].includes(emp.status) ||
          emp.promotionStatus === 'sentBack'
        )
        .map(emp => emp.id);
      setSelectedRows(pendingRecords);
    } else {
      setSelectedRows([]);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'submitted': return 'Pending Review';
      case 'managerInProgress': return 'Under Review';
      case 'reviewerPending':
      case 'managerApproved': return 'Reviewer Pending';
      case 'reviewerInProgress': return 'Reviewer Working';
      case 'reviewerApproved': return 'Ready for Director';
      case 'directorInProgress': return 'Under Director Review';
      case 'directorPushedBack': return 'Returned for Correction';
      case 'directorApproved': return 'Approved';
      case 'released': return 'Completed';
      case 'accepted_pending_effect': return 'Accepted';
      case 'effective': return 'Completed';
      default: return status;
    }
  };

  const getStatusBadge = (status) => {
    const label = getStatusLabel(status);
    switch (status) {
      case 'submitted':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{label}</span>;
      case 'managerInProgress':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">{label}</span>;
      case 'reviewerPending':
      case 'managerApproved':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 animate-pulse">{label}</span>;
      case 'reviewerInProgress':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">{label}</span>;
      case 'reviewerApproved':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 font-black">{label}</span>;
      case 'directorPushedBack':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 animate-bounce">{label}</span>;
      case 'directorApproved':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{label}</span>;
      case 'released':
      case 'effective':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800">{label}</span>;
      case 'accepted_pending_effect':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-800">{label}</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{label}</span>;
    }
  };

  const getPromotionStatusBadge = (emp) => {
    const promoStatus = emp.promotionStatus;
    switch (promoStatus) {
      case 'recommended':
        return <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700 uppercase tracking-wider border border-blue-200 shadow-sm">Recommended</span>;
      case 'pendingDirector':
        return <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 uppercase tracking-wider border border-amber-200 shadow-sm">Pending Director</span>;
      case 'approved':
        return <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-green-100 text-green-700 uppercase tracking-wider border border-green-200 shadow-sm">Approved</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-red-100 text-red-700 uppercase tracking-wider border border-red-200 shadow-sm">Rejected</span>;
      case 'sentBack':
        return (
          <div className="flex flex-col items-center gap-1">
            <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-orange-100 text-orange-700 uppercase tracking-wider border border-orange-200 shadow-sm">Returned by Director</span>
            {emp.promotionRemarksDirector && (
              <div className="mt-1 max-w-[150px] p-2 bg-orange-50 border border-orange-100 rounded text-[9px] text-orange-800 leading-tight italic shadow-sm relative group cursor-help">
                <span className="font-bold flex items-center gap-1 mb-1">
                  <MessageSquare className="h-2 w-2" /> Director's Note:
                </span>
                <span className="line-clamp-3 group-hover:line-clamp-none transition-all duration-300">
                  {emp.promotionRemarksDirector}
                </span>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const handleSelectRow = (id) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const getDivisionValue = (emp) => String(emp?.division || '').trim();
  const getLocationValue = (emp) => String(emp?.location || emp?.branch || '').trim();

  const uniqueDivisions = useMemo(() => [...new Set(employees.map(getDivisionValue).filter(Boolean))].sort(), [employees]);
  const uniqueDesignations = useMemo(() => [...new Set(employees.map(e => (e.designation || '').trim()).filter(Boolean))].sort(), [employees]);
  const uniqueLocations = useMemo(() => [...new Set(employees.map(getLocationValue).filter(Boolean))].sort(), [employees]);
  const REVIEWER_PENDING_STATUSES = ['reviewerPending', 'reviewerInProgress', 'directorPushedBack', 'managerApproved'];
  const REVIEWER_COMPLETED_STATUSES = ['reviewerApproved', 'directorInProgress', 'directorApproved', 'released', 'Released Letter', 'accepted_pending_effect'];

  const filteredEmployees = useMemo(() => {
    return employees
      .filter(emp =>
        (emp.financialYr === selectedFinancialYr) &&
        (selectedDivision === '' || getDivisionValue(emp) === selectedDivision) &&
        (selectedDesignation === '' || (emp.designation || '').trim() === selectedDesignation) &&
        (selectedLocation === '' || getLocationValue(emp) === selectedLocation) &&
        (emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.empId.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (activeReviewerTab === 'pending'
          ? REVIEWER_PENDING_STATUSES.includes(emp.status)
          : REVIEWER_COMPLETED_STATUSES.includes(emp.status))
      )
      .sort((a, b) => {
        const getPrio = (x) => {
          const s = String(x.status || '').trim();
          if (['reviewerPending', 'reviewerInProgress', 'directorPushedBack', 'managerApproved'].includes(s) || x.promotionStatus === 'sentBack') return 1;
          if (['reviewerApproved', 'directorInProgress'].includes(s)) return 2;
          if (['directorApproved'].includes(s)) return 3;
          if (['Released Letter', 'released', 'Accepted', 'accepted_pending_effect', 'effective', 'COMPLETED'].includes(s)) return 4;
          return 5;
        };
        const pa = getPrio(a);
        const pb = getPrio(b);
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name);
      });
  }, [employees, selectedFinancialYr, selectedDivision, selectedDesignation, selectedLocation, searchTerm, activeReviewerTab]);
  
  const totals = useMemo(() => {
    return filteredEmployees.reduce((acc, current) => {
      acc.incrementAmount += Number(current.incrementAmount || 0);
      acc.performancePay += Number(current.performancePay || 0);
      acc.currentSalary += Number(current.currentSalary || 0);
      acc.revisedSalary += Number(current.revisedSalary || 0);
      return acc;
    }, { incrementAmount: 0, performancePay: 0, currentSalary: 0, revisedSalary: 0 });
  }, [filteredEmployees]);

  const exportToExcel = () => {
    const data = filteredEmployees.map((emp, index) => ({
      'S.No': index + 1,
      'Employee ID': emp.empId,
      'Name': emp.name,
      'Designation': emp.designation,
      'Division': emp.division,
      'Final Rating': emp.appraiserRating || 'Not Rated',
      'Current Salary': emp.currentSalary,
      'Increment %': emp.incrementPercentage,
      'Correction %': emp.incrementCorrectionPercentage,
      'Increment Amount': emp.incrementAmount,
      'Revised Salary': emp.revisedSalary,
      'Performance Pay': emp.performancePay,
      'Reviewer Comments': emp.reviewerComments || 'No comments',
      'Promotion Recommended': emp.promotionRecommendedByReviewer ? 'Yes' : 'No',
      'Recommended Designation': emp.newDesignation || 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reviewer Approval");
    
    // Auto-size columns
    const maxWidths = {};
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        const val = String(row[key]);
        maxWidths[key] = Math.max(maxWidths[key] || 10, val.length + 2);
      });
    });
    worksheet['!cols'] = Object.keys(maxWidths).map(key => ({ wch: maxWidths[key] }));

    XLSX.writeFile(workbook, `Reviewer_Approval_${selectedFinancialYr}_${activeReviewerTab}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text(`Reviewer Approval Report - FY ${selectedFinancialYr}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 22);
    doc.text(`Tab: ${activeReviewerTab.toUpperCase()}`, 14, 27);

    const tableColumn = [
      "S.No", "ID", "Name", "Rating", "Current", "Inc %", "Amount", "Revised", "Perf Pay", "Status"
    ];
    const tableRows = filteredEmployees.map((emp, index) => [
      index + 1,
      emp.empId,
      emp.name,
      emp.appraiserRating || '-',
      emp.currentSalary.toLocaleString('en-IN'),
      `${emp.incrementPercentage + (emp.incrementCorrectionPercentage || 0)}%`,
      emp.incrementAmount.toLocaleString('en-IN'),
      emp.revisedSalary.toLocaleString('en-IN'),
      emp.performancePay.toLocaleString('en-IN'),
      getStatusLabel(emp.status)
    ]);

    // Add totals row to PDF
    tableRows.push([
      { content: 'TOTALS', colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: totals.currentSalary.toLocaleString('en-IN'), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: '-', styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'center' } },
      { content: totals.incrementAmount.toLocaleString('en-IN'), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: totals.revisedSalary.toLocaleString('en-IN'), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: totals.performancePay.toLocaleString('en-IN'), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } },
      { content: '', styles: { fillColor: [240, 240, 240] } }
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 32,
      theme: 'grid',
      headStyles: { fillColor: [38, 39, 96] },
      styles: { fontSize: 8, cellPadding: 2 }
    });

    doc.save(`Reviewer_Approval_${selectedFinancialYr}_${activeReviewerTab}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
      <div className="max-w-[98%] mx-auto">

        {/* Top Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Financial Year Selector */}
            <select
              value={selectedFinancialYr}
              onChange={(e) => setSelectedFinancialYr(e.target.value)}
              className="block w-48 pl-3 pr-10 py-2 border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border"
            >
              {getReviewerFinancialYearOptions().map(year => (
                <option key={year} value={year}>
                  {year === getCurrentFinancialYear() ? `${year} (Current)` : year}
                </option>
              ))}
            </select>

            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Division Selector */}
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border"
            >
              <option value="">All Divisions</option>
              {uniqueDivisions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>

            {/* Designation Selector */}
            <select
              value={selectedDesignation}
              onChange={(e) => setSelectedDesignation(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border"
            >
              <option value="">All Designations</option>
              {uniqueDesignations.map(des => (
                <option key={des} value={des}>{des}</option>
              ))}
            </select>

            {/* Location Selector */}
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="block w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm bg-white border"
            >
              <option value="">All Locations</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500 font-medium whitespace-nowrap">
              {selectedRows.length} selected
            </span>
            <button
              onClick={handleSubmitToDirector}
              disabled={selectedFinancialYr !== getCurrentFinancialYear() || selectedRows.length === 0}
              className={`flex items-center px-4 py-2 text-white rounded-md transition-all shadow-sm ${selectedFinancialYr === getCurrentFinancialYear() && selectedRows.length > 0 ? 'bg-[#262760] hover:bg-[#1e2050]' : 'bg-gray-300 cursor-not-allowed'}`}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit to Director
            </button>

            {/* Export Buttons */}
            <div className="flex items-center space-x-2 border-l pl-4 border-gray-200">
              <button
                onClick={exportToExcel}
                className="flex items-center px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-all text-xs font-bold"
                title="Download Excel"
              >
                <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                Excel
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center px-3 py-2 bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-all text-xs font-bold"
                title="Download PDF"
              >
                <FileText className="h-4 w-4 mr-1.5" />
                PDF
              </button>
            </div>
          </div>
        </div>

        {selectedFinancialYr !== getCurrentFinancialYear() && (
          <div className="mb-6 bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <div className="bg-orange-100 p-2 rounded-full">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-orange-900 font-black uppercase text-[11px] tracking-widest">Historical View Only</p>
              <p className="text-sm text-orange-800 font-medium">Appraisal period for <strong>FY {selectedFinancialYr}</strong> has ended. Please select the current financial year to manage appraisals.</p>
            </div>
          </div>
        )}

        {/* Pending / Completed Tab Toggle */}
        <div className="inline-flex mb-4 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => { setActiveReviewerTab('pending'); setSelectedRows([]); }}
            className={`px-6 py-2.5 text-sm font-semibold transition-all ${
              activeReviewerTab === 'pending'
                ? 'bg-[#262760] text-white shadow-inner'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Pending
            {activeReviewerTab === 'pending' && filteredEmployees.length > 0 && (
              <span className="ml-1">{filteredEmployees.length}</span>
            )}
          </button>
          <button
            onClick={() => { setActiveReviewerTab('completed'); setSelectedRows([]); }}
            className={`px-6 py-2.5 text-sm font-semibold transition-all ${
              activeReviewerTab === 'completed'
                ? 'bg-[#262760] text-white shadow-inner'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Completed
            {activeReviewerTab === 'completed' && filteredEmployees.length > 0 && (
              <span className="ml-1">{filteredEmployees.length}</span>
            )}
          </button>
        </div>

        {/* Table */}
        <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-10 shadow-md">
                {/* Summary Row above Header */}
                <tr className="bg-indigo-50 border-b border-indigo-100 font-bold">
                  <th colSpan={5} className="px-4 py-2.5 text-right text-indigo-900 uppercase tracking-wider text-[10px]">
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
                  <th colSpan={4} className="bg-indigo-50"></th>
                </tr>
                <tr className="bg-[#262760]">
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#262760] focus:ring-[#262760]"
                      checked={selectedRows.length > 0 && selectedRows.length === filteredEmployees.filter(e => ['reviewerPending', 'reviewerInProgress', 'directorPushedBack', 'managerApproved'].includes(e.status) || e.promotionStatus === 'sentBack').length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Name</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Final Rating</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Current Salary</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Increment %</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Increment Correction %</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Increment Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Revised Salary</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Performance Pay</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Reviewer Comments</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Recommend Promotion</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp, index) => {
                  const isEditing = editingRowId === emp.id;
                  const data = isEditing ? editFormData : emp;
                  const isSelected = selectedRows.includes(emp.id);
                  const isEditable =
                    ['reviewerPending', 'reviewerInProgress', 'directorPushedBack', 'managerApproved'].includes(emp.status);
                  const canShowPromotionOption = emp.promotionEligible === true || emp.appraiserRating === 'ES' || emp.appraiserRating === 'ME';
                  const isPromotionRecommended = isEditing ? editFormData.promotionRecommendedByReviewer : emp.promotionRecommendedByReviewer;
                  const performancePayValue =
                    performancePayDrafts[emp.id] !== undefined
                      ? performancePayDrafts[emp.id]
                      : String(Number(data.performancePay || 0));

                  return (
                    <tr key={emp.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-indigo-50' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-[#262760] focus:ring-[#262760] disabled:opacity-50"
                          checked={isSelected}
                          onChange={() => isEditable && emp.employeeStatus === 'Active' && handleSelectRow(emp.id)}
                          disabled={!isEditable || emp.employeeStatus !== 'Active'}
                        />
                      </td>
                      {/* S.No */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                      {/* Employee ID */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{data.empId}</td>
                      {/* Employee Name */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span>{data.name}</span>
                          {emp.employeeStatus && emp.employeeStatus !== 'Active' && (
                            <span className={`text-[10px] font-bold uppercase mt-0.5 ${emp.employeeStatus === 'Exited' ? 'text-red-500' : 'text-orange-500'}`}>
                              {emp.employeeStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Final Rating */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${String(data.appraiserRating || '').includes('ES') ? 'bg-green-100 text-green-700' :
                          String(data.appraiserRating || '').includes('ME') ? 'bg-blue-100 text-blue-700' :
                            String(data.appraiserRating || '').includes('BE') ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                          }`}>
                          {data.appraiserRating || 'Not Rated'}
                        </span>
                      </td>
                      {/* Current Salary */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {Number(emp.currentSalary || 0).toLocaleString('en-IN')}
                      </td>
                      {/* Increment % */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-medium">
                        {emp.incrementPercentage || 0}%
                      </td>
                      {/* Increment Correction % (editable) */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              className="w-16 border border-gray-300 rounded p-1 text-center shadow-sm focus:ring-[#262760] focus:border-[#262760]"
                              value={data.incrementCorrectionPercentage || ''}
                              onChange={(e) => handleInputChange('incrementCorrectionPercentage', e.target.value)}
                            />
                            <span className="ml-1">%</span>
                          </div>
                        ) : (
                          <span className={`${emp.incrementCorrectionPercentage !== 0 ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                            {emp.incrementCorrectionPercentage > 0 ? '+' : ''}{emp.incrementCorrectionPercentage}%
                          </span>
                        )}
                      </td>
                      {/* Increment Amount */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium text-green-600">
                        {Number(data.incrementAmount || 0).toLocaleString('en-IN')}
                      </td>
                      {/* Revised Salary */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                        {Number(data.revisedSalary || 0).toLocaleString('en-IN')}
                      </td>
                      {/* Performance Pay (editable) */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-20 border border-gray-300 rounded p-1 text-right shadow-sm focus:ring-[#262760] focus:border-[#262760]"
                            value={data.performancePay || ''}
                            onChange={(e) => handleInputChange('performancePay', e.target.value)}
                          />
                        ) : (
                          Number(emp.performancePay || 0).toLocaleString('en-IN')
                        )}
                      </td>
                      {/* Reviewer Comments (editable) */}
                      <td className="px-4 py-4 text-center max-w-[200px]">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <textarea
                              rows={2}
                              className="w-40 border border-gray-300 rounded p-1 text-xs shadow-sm focus:ring-[#262760] focus:border-[#262760] resize-none"
                              value={data.reviewerComments || ''}
                              onChange={(e) => handleInputChange('reviewerComments', e.target.value)}
                              placeholder="Add comments..."
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-700 line-clamp-2">
                            {emp.reviewerComments || <span className="text-gray-400 italic">No comments</span>}
                          </span>
                        )}
                      </td>
                      {/* Recommend Promotion */}
                      <td className="px-4 py-4 text-center text-sm text-gray-900 border-l border-r border-gray-100 max-w-[160px]">
                        {isEditing ? (
                          <div className="flex flex-col items-center gap-1">
                             <button
                               onClick={() => handleOpenPromotion(emp)}
                               className="bg-purple-50 text-purple-700 hover:bg-purple-100 px-3 py-1 rounded text-xs font-semibold whitespace-nowrap border border-purple-200 transition-colors"
                             >
                               {data.promotionRecommendedByReviewer ? 'Edit Promotion' : 'Suggest Promotion'}
                             </button>
                             {data.promotionRecommendedByReviewer && (
                                <span className="text-[10px] text-gray-500 leading-tight">
                                  {data.newDesignation}
                                </span>
                             )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 items-center">
                             {data.promotionRecommendedByReviewer ? (
                               <div className="flex flex-col items-center">
                                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">Recommended</span>
                                  {data.newDesignation && (
                                    <span className="text-[10px] text-gray-500 mt-1 leading-tight text-center" title={`${emp.designation} ➔ ${data.newDesignation}`}>
                                      <span className="line-through opacity-70">{emp.designation}</span> <br/>⬇<br/> <span className="font-bold text-gray-700">{data.newDesignation}</span>
                                    </span>
                                  )}
                               </div>
                             ) : (
                               <span className="text-xs text-gray-400 italic">No</span>
                             )}
                          </div>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getStatusBadge(emp.status)}
                          {getPromotionStatusBadge(emp)}
                          {emp.status === 'directorPushedBack' && emp.pushBack?.reason && (
                            <div className="mt-1 px-2 py-1 bg-red-50 border border-red-200 rounded text-[10px] text-red-700 font-bold max-w-[120px] truncate" title={emp.pushBack.reason}>
                              ⚠ Director Comment: {emp.pushBack.reason}
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center items-center space-x-2">
                          <button
                            className="flex items-center space-x-1 bg-white text-gray-700 px-3 py-1.5 rounded text-xs hover:bg-gray-50 transition-all shadow-sm border border-gray-200"
                            onClick={() => { setViewModalData(emp); setEditingRowId(null); }}
                          >
                            <Eye className="h-4 w-4 text-gray-500" />
                            <span>View</span>
                          </button>

                          {isEditable && !isEditing && (
                            <button
                              disabled={emp.employeeStatus !== 'Active'}
                              className={`flex items-center space-x-1 px-3 py-1.5 rounded text-xs transition-all shadow-sm ${
                                emp.employeeStatus === 'Active'
                                  ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200'
                                  : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                              }`}
                              onClick={() => handleInlineEditClick(emp)}
                              title={emp.employeeStatus !== 'Active' ? 'Cannot edit inactive or exited employee' : ''}
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit</span>
                            </button>
                          )}

                          {isEditing && (
                            <>
                              <button
                                className="flex items-center space-x-1 bg-emerald-600 text-white px-2 py-1.5 rounded text-xs hover:bg-emerald-700 transition-all shadow-sm"
                                onClick={() => handleSaveRow()}
                                title="Save Draft"
                              >
                                <Save className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="flex items-center space-x-1 bg-[#262760] text-white px-2 py-1.5 rounded text-xs hover:bg-[#1e2050] transition-all shadow-sm"
                                onClick={() => handleSingleSubmitToDirector(emp.id)}
                                title="Submit to Director"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Submit</span>
                              </button>
                              <button
                                className="flex items-center space-x-1 bg-white text-red-600 px-2 py-1.5 rounded text-xs hover:bg-red-50 transition-all shadow-sm border border-red-200"
                                onClick={() => handleCancelEdit()}
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
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

      <StatusPopup
        isOpen={statusPopup.isOpen}
        onClose={() => setStatusPopup({ ...statusPopup, isOpen: false })}
        status={statusPopup.status}
        message={statusPopup.message}
      />

      {submitConfirm.isOpen && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 bg-[#262760] text-white flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              <h3 className="text-lg font-semibold">Submit to Director</h3>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">
                Submit {submitConfirm.count} record(s) to Director?
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setSubmitConfirm({ isOpen: false, count: 0, ids: [] })}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmSubmitToDirector}
                className="px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050] text-sm font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviewer Comment Modal */}
      {isCommentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Reviewer Comments
              </h3>
              <button onClick={() => setIsCommentModalOpen(false)} className="text-white hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <textarea
                className="w-full h-32 border border-gray-300 rounded-md p-3 focus:ring-[#262760] focus:border-[#262760] resize-none"
                placeholder="Enter your comments here..."
                value={tempComment}
                onChange={(e) => setTempComment(e.target.value)}
              />
              <div className="mt-4 flex justify-end space-x-3">
                <button
                  onClick={() => setIsCommentModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveComment}
                  className="px-4 py-2 bg-[#262760] text-white rounded-md hover:bg-[#1e2050]"
                >
                  Save Comments
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Recommendation Modal */}
      {promotionModal.open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-purple-100">
            <div className="px-6 py-4 bg-gradient-to-r from-[#262760] to-purple-800 text-white flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Recommend Promotion
              </h3>
              <button onClick={() => setPromotionModal({ open: false, emp: null })} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-xl border border-purple-100 mb-2">
                <div className="h-10 w-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                  {promotionModal.emp.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">{promotionModal.emp.name}</p>
                  <p className="text-xs text-purple-600 font-semibold">{promotionModal.emp.designation}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">New Designation</label>
                <select
                  className="w-full border-2 border-gray-100 rounded-xl p-2.5 focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all text-sm font-medium"
                  value={promotionForm.newDesignation}
                  onChange={(e) => setPromotionForm({ ...promotionForm, newDesignation: e.target.value })}
                >
                  <option value="">Select Designation...</option>
                  {designationOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Effective Date</label>
                <input
                  type="date"
                  className="w-full border-2 border-gray-100 rounded-xl p-2.5 focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all text-sm font-medium"
                  value={promotionForm.effectiveDate}
                  onChange={(e) => setPromotionForm({ ...promotionForm, effectiveDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reviewer Remarks</label>
                <textarea
                  className="w-full h-24 border-2 border-gray-100 rounded-xl p-3 focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all text-sm resize-none"
                  placeholder="Why are you recommending this promotion?"
                  value={promotionForm.remarks}
                  onChange={(e) => setPromotionForm({ ...promotionForm, remarks: e.target.value })}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center">
              {promotionModal.emp.promotionRecommendedByReviewer && (
                <button
                  onClick={handleRemovePromotion}
                  className="text-red-600 text-xs font-bold hover:underline"
                >
                  Remove Recommendation
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button
                  onClick={() => setPromotionModal({ open: false, emp: null })}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePromotion}
                  className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] text-xs font-bold shadow-lg shadow-indigo-200 transition-all"
                >
                  Save Recommendation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      <ReviewerViewModal 
        selectedEmployee={viewModalData}
        onClose={() => setViewModalData(null)}
        hasCompensationAccess={true}
      />

      {/* Zoom Area Modal */}
      {zoomModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-200">
            <div className="px-6 py-4 bg-[#262760] text-white flex justify-between items-center">
              <h3 className="text-xl font-bold flex items-center">
                <Maximize2 className="h-5 w-5 mr-3" />
                {zoomModal.title}
              </h3>
              <button onClick={() => setZoomModal({ ...zoomModal, isOpen: false })} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-8">
              <textarea
                className="w-full h-80 border-2 border-gray-200 rounded-xl p-5 focus:ring-4 focus:ring-indigo-100 focus:border-[#262760] resize-none text-lg transition-all"
                value={zoomModal.value}
                onChange={(e) => setZoomModal({ ...zoomModal, value: e.target.value })}
                placeholder={`Enter ${zoomModal.title.toLowerCase()}...`}
              />
              <div className="mt-8 flex justify-end space-x-4">
                <button
                  onClick={() => setZoomModal({ ...zoomModal, isOpen: false })}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    zoomModal.onSave(zoomModal.value);
                    setZoomModal({ ...zoomModal, isOpen: false });
                  }}
                  className="px-8 py-3 bg-[#262760] text-white rounded-xl hover:shadow-lg hover:shadow-[#262760]/20 font-bold transition-all"
                >
                  Apply Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewerApproval;
