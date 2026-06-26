import React, { useState, useEffect } from 'react';
import WorkflowTracker from '../../components/Performance/WorkflowTracker';
import { getWorkflowForUser, APPRAISAL_STAGES, calculateSalaryAnnexure, calculateCurrentSalaryAnnexure } from '../../utils/performanceUtils';
import { performanceAPI, employeeAPI, leaveAPI, payrollAPI, attendanceAPI, promotionAPI } from '../../services/api';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Save,
  Send,
  Plus,
  Trash2,
  Award,
  FileText,
  AlertCircle,
  Edit,
  Eye,
  Download,
  X,
  ChevronLeft,
  CheckCircle,
  XCircle,
  Calendar,
  CheckCircle2,
  Trophy,
  Users,
  Code,
  TrendingUp,
  Building2,
  Star,
  BarChart3,
  Target,
  Lightbulb,
  History,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import PromotionPage from './PromotionPage';
import { getAbsoluteSignatureUrl } from '../../utils/signatureUtils';



// Colorful Modal Component
const Modal = ({ isOpen, onClose, title, children, icon: Icon, colorTheme = "blue", maxWidth = "max-w-lg" }) => {
  if (!isOpen) return null;

  const themeColors = {
    blue: "from-[#262760] to-[#1e2050]",
    purple: "from-purple-600 to-indigo-600",
    green: "from-emerald-500 to-teal-600",
    red: "from-red-500 to-rose-600",
    orange: "from-orange-500 to-red-600",
    teal: "from-teal-500 to-cyan-600"
  };

  const headerGradient = themeColors[colorTheme] || themeColors.blue;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-900 opacity-60 backdrop-blur-sm" onClick={onClose}></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div className={`inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:w-full border border-gray-100 ${maxWidth}`}>

          {/* Colorful Header */}
          <div className={`bg-gradient-to-r ${headerGradient} px-4 py-4 sm:px-6 flex justify-between items-center`}>
            <div className="flex items-center space-x-3">
              {Icon && <div className="bg-white/20 p-2 rounded-full"><Icon className="h-6 w-6 text-white" /></div>}
              <h3 className="text-lg leading-6 font-bold text-white" id="modal-title">
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="bg-white/10 rounded-full p-1 text-white hover:bg-white/20 focus:outline-none transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="mt-2">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Rating Component
const RatingStars = ({ value, onChange, readOnly = false }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="flex items-center space-x-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readOnly && onChange(star)}
          className={`${!readOnly ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          disabled={readOnly}
        >
          <Star
            className={`h-5 w-5 ${star <= value
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
              }`}
          />
        </button>
      ))}
      {!readOnly && (
        <span className="ml-2 text-sm text-gray-500">
          {value ? `${value}/5` : 'Not rated'}
        </span>
      )}
    </div>
  );
};

// New Colorful Popup for Notifications
const StatusPopup = ({ isOpen, onClose, status, message }) => {
  if (!isOpen) return null;

  const config = {
    success: {
      icon: CheckCircle,
      color: "text-green-500",
      bg: "bg-green-50",
      border: "border-green-200",
      title: "Success!"
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
                <h3 className={`text-lg leading-6 font-bold ${color}`} id="modal-title">
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
              Okay, Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const getFinancialYearRange = (financialYear) => {
  const parts = String(financialYear || '').split('-');
  const startYear = parseInt(parts[0], 10) || new Date().getFullYear();
  const start = new Date(startYear, 3, 1);
  const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
  return { start, end };
};

const getWorkingDaysBetween = (start, end) => {
  let count = 0;
  const current = new Date(start.getTime());
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const formatDisplayDate = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const deriveEffectiveDateForAppraisal = (financialYear, updatedAt, effectiveDateField) => {
  if (effectiveDateField) {
    const d = new Date(effectiveDateField);
    if (!Number.isNaN(d.getTime())) return formatDisplayDate(d);
  }
  if (updatedAt) {
    const d = new Date(updatedAt);
    if (!Number.isNaN(d.getTime())) return formatDisplayDate(d);
  }
  if (financialYear && String(financialYear).includes('-')) {
    const parts = String(financialYear).split(/[-/]/);
    const yearStart = parseInt(parts[0], 10);
    if (!Number.isNaN(yearStart)) {
      const d = new Date(yearStart, 3, 1);
      return formatDisplayDate(d);
    }
  }
  return '';
};

const getCurrentFinancialYearLabel = () => {
  const now = new Date();
  // Appraisals for FY 2025-26 are typically submitted in April 2026.
  // We consider the financial year to switch for appraisal purposes in May.
  const year = now.getMonth() >= 4 ? now.getFullYear() : now.getFullYear() - 1;
  const nextYear = year + 1;
  return `${year}-${String(nextYear).slice(-2)}`;
};

const getPreviousFinancialYearLabel = () => {
  const current = getCurrentFinancialYearLabel();
  const parts = String(current || '').split('-');
  const startYear = parseInt(parts[0], 10);
  if (Number.isNaN(startYear)) return '';
  const prevStart = startYear - 1;
  return `${prevStart}-${String(startYear).slice(-2)}`;
};

const getOpenFinancialYearLabel = () => {
  return getCurrentFinancialYearLabel();
};

const getNewAppraisalFinancialYearOptions = () => {
  const current = getCurrentFinancialYearLabel();
  const prev = getPreviousFinancialYearLabel();
  return [current, prev];
};

const isEditableStatus = (statusValue) => {
  const v = String(statusValue || "Draft").toLowerCase().trim();
  return v === "" || v === "draft";
};

// Generic function to map technical/process keys to human-readable labels
const getAttributeLabel = (masterAttributes, section, key) => {
  const item = masterAttributes[section]?.find(i => i.key === key);
  if (item) return item.label;
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

// Clean, single-source status mapping
const getStatusLabel = (status) => {
  if (!status) return 'Draft';
  const s = status.toLowerCase();
  switch (s) {
    case "submitted":
      return "Pending with Manager";
    case "managerinprogress":
      return "Under Review by Manager";
    case "reviewerpending":
    case "managerapproved":
      return "Pending with Reviewer";
    case "reviewerinprogress":
      return "Under Review by Reviewer";
    case "reviewerapproved":
      return "Pending with Director";
    case "directorinprogress":
      return "Under Review by Director";
    case "directorpushedback":
      return "Returned for Correction";
    case "directorapproved":
      return "Approved";
    case "released":
      return "Awaiting Your Acceptance";
    case "accepted_pending_effect":
      return "Accepted";
    case "effective":
      return "Completed";
    default:
      return "Draft";
  }
};


const SelfAppraisal = () => {

  // View State: 'list' or 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [viewData, setViewData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal & Popup States
  const [showNewAppraisalModal, setShowNewAppraisalModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [showBehaviourModal, setShowBehaviourModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showTechnicalModal, setShowTechnicalModal] = useState(false);
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [showReleaseLetter, setShowReleaseLetter] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, id: null });
  const [statusPopup, setStatusPopup] = useState({ isOpen: false, status: 'info', message: '' });

  // Form State
  const [formData, setFormData] = useState({
    year: '',
    division: '',
    projects: [],
    overallContribution: '',
    status: 'draft',
    behaviourBased: { comments: '' },
    processAdherence: { comments: '' },
    technicalBased: { comments: '' },
    growthBased: { comments: '', careerGoals: '' },
    behaviourManagerRatings: {},
    processManagerRatings: {},
    technicalManagerRatings: {},
    growthManagerRatings: {}
  });

  const [currentProject, setCurrentProject] = useState({ id: null, name: '', contribution: '' });
  const [letterData, setLetterData] = useState(null);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const [employeeInfo, setEmployeeInfo] = useState({
    name: user.name || user.employeeName || 'Employee',
    employeeId: user.employeeId || user.empId || user.id || '',
    designation: user.designation || user.role || user.position || '',
    department: user.department || '',
    division: user.division || '',
    location: user.location || user.branch || '',
    ...user
  });

  useEffect(() => {
    const fetchFreshProfile = async () => {
      try {
        const res = await employeeAPI.getMyProfile();
        if (res.data) {
          setEmployeeInfo(prev => ({
            ...prev,
            ...res.data,
            name: res.data.name || res.data.fullName || prev.name,
            designation: res.data.designation || prev.designation,
            division: res.data.division || prev.division,
            department: res.data.department || prev.department
          }));
        }
      } catch (error) {
        console.error("Failed to fetch fresh profile in SelfAppraisal", error);
      }
    };
    fetchFreshProfile();
  }, []);

  const fetchAppraisals = async () => {
    setLoading(true);
    try {
      const response = await performanceAPI.getMySelfAppraisals();
      const raw = response.data || [];

      // Fetch snapshot for current user
      let snapshot = null;
      try {
        const snapRes = await payrollAPI.getSnapshot('24-25', employeeInfo.employeeId || employeeInfo.empId);
        snapshot = snapRes.data?.data;
      } catch (e) {
        console.warn("No snapshot for current user", e);
      }

      const enhanced = raw.map(app => ({
        ...app,
        currentSalary: snapshot ? snapshot.ctc : (app.currentSalary || app.salary),
        currentGross: snapshot ? snapshot.totalEarnings : app.currentGross
      }));

      setAppraisals(enhanced);
    } catch (error) {
      console.error("Failed to fetch appraisals", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppraisals();
  }, []);

  const employeeInitials = (employeeInfo.name || '')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  // Attribute Configuration State
  const [enabledSections, setEnabledSections] = useState({
    selfAppraisal: true,
    knowledgeSharing: true,
    knowledgeSubItems: {},
    processAdherence: true,
    processSubItems: {},
    technicalAssessment: true,
    technicalSubItems: {},
    growthAssessment: true,
    growthSubItems: {}
  });

  const [masterAttributes, setMasterAttributes] = useState({
    knowledgeSubItems: [],
    processSubItems: [],
    technicalSubItems: [],
    growthSubItems: []
  });

  const [appraisals, setAppraisals] = useState([]);
  const [loading, setLoading] = useState(false);

  const getStageFromStatus = (status) => {
    const s = String(status || 'draft').toLowerCase().trim();
    switch (s) {
      case 'draft':
        return 'appraisee';

      case 'submitted':
      case 'managerinprogress':
        return 'appraiser';

      case 'reviewerpending':
      case 'reviewerinprogress':
      case 'directorpushedback':
      case 'managerapproved':
        return 'reviewer';

      case 'reviewerapproved':
      case 'directorinprogress':
      case 'directorapproved':
        return 'director';

      case 'released':
      case 'effective':
      case 'effective':
        return 'release';

      default:
        return 'appraisee';
    }
  };


  const getEffectiveAcceptanceStatus = (appraisal) => {
    if (!appraisal) return null;
    if (appraisal.employeeAcceptanceStatus) return appraisal.employeeAcceptanceStatus;
    const status = appraisal.status || '';
    if (['released', 'effective'].includes(status)) return 'ACCEPTED';
    return 'PENDING';
  };

  const userFlowConfig = getWorkflowForUser(employeeInfo.department, employeeInfo.designation);
  const userFlow = APPRAISAL_STAGES.map(stage => {
    let label = stage.label;
    if (stage.id === 'release' && (viewData?.status === 'released' || viewData?.status === 'effective')) {
      label = 'Released Letter';
    }
    if (userFlowConfig && userFlowConfig[stage.id]) {
      return { ...stage, label, description: userFlowConfig[stage.id] };
    }
    return { ...stage, label };
  });

  const currentStageId = getStageFromStatus(formData.status);




  const [autoDownload, setAutoDownload] = useState(false);
  const [newAppraisalYear, setNewAppraisalYear] = useState('2025-26');
  const [newAppraisalDivision, setNewAppraisalDivision] = useState(employeeInfo.division || '');
  const [newAppraisalAttendance, setNewAppraisalAttendance] = useState({
    workingDays: 0,
    presentDays: 0,
    absentDays: 0,
    officeHoliday: 0,
    regionalHoliday: 0,
    attendancePct: 0,
    loading: false,
  });

  useEffect(() => {
    const fetchMasterAttrs = async () => {
      try {
        const res = await performanceAPI.getMasterAttributes();
        if (res.data) {
          setMasterAttributes({
            knowledgeSubItems: res.data.knowledgeSubItems || [],
            processSubItems: res.data.processSubItems || [],
            technicalSubItems: res.data.technicalSubItems || [],
            growthSubItems: res.data.growthSubItems || []
          });
        }
      } catch (err) {
        console.error("Failed to fetch master attributes", err);
      }
    };
    fetchMasterAttrs();
  }, []);

  useEffect(() => {
    const fetchDesignationAttributes = async () => {
      if (!employeeInfo.designation) return;
      try {
        const response = await performanceAPI.getAttributes(employeeInfo.designation);
        if (response.data && response.data.sections) {
          setEnabledSections({
            selfAppraisal: response.data.sections.selfAppraisal ?? true,
            knowledgeSharing: response.data.sections.knowledgeSharing ?? true,
            knowledgeSubItems: response.data.sections.knowledgeSubItems || {},
            processAdherence: response.data.sections.processAdherence ?? true,
            processSubItems: response.data.sections.processSubItems || {},
            technicalAssessment: response.data.sections.technicalAssessment ?? true,
            technicalSubItems: response.data.sections.technicalSubItems || {},
            growthAssessment: response.data.sections.growthAssessment ?? true,
            growthSubItems: response.data.sections.growthSubItems || {}
          });
        }
      } catch (error) {
        console.error("Error fetching designation attributes", error);
      }
    };
    fetchDesignationAttributes();
  }, [employeeInfo.designation]);

  useEffect(() => {
    if (employeeInfo.division) {
      setNewAppraisalDivision(employeeInfo.division);
    }
  }, [employeeInfo.division]);

  useEffect(() => {
    if (showNewAppraisalModal) {
      setNewAppraisalYear(getOpenFinancialYearLabel());
    }
  }, [showNewAppraisalModal]);

  // --- Handlers ---

  const startNewAppraisal = async () => {
    if (!enabledSections.selfAppraisal) {
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: 'Self appraisal is not enabled for your designation.'
      });
      return;
    }

    const fy = String(newAppraisalYear || '').trim();
    const existing = appraisals.find((a) => String(a.year || '').trim() === fy);
    if (existing) {
      if (!isEditableStatus(existing.status)) {
        setStatusPopup({
          isOpen: true,
          status: 'info',
          message: `Already you applied appraisal for FY ${fy}.`
        });
        return;
      }
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: `Appraisal for FY ${fy} already exists. Opening it.`
      });
      await handleEditAppraisal(existing);
      return;
    }

    const openFy = getOpenFinancialYearLabel();
    if (fy !== openFy) {
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: `You cannot create new appraisal for FY ${fy}. Only FY ${openFy} is open now.`
      });
      return;
    }

    // Initialize dynamic ratings based on master attributes
    const initialBehaviour = { comments: '' };
    masterAttributes.knowledgeSubItems.forEach(attr => initialBehaviour[attr.key] = 0);

    const initialProcess = { comments: '' };
    masterAttributes.processSubItems.forEach(attr => initialProcess[attr.key] = 0);

    const initialTechnical = { comments: '' };
    masterAttributes.technicalSubItems.forEach(attr => initialTechnical[attr.key] = 0);

    const initialGrowth = { comments: '', careerGoals: '' };
    masterAttributes.growthSubItems.forEach(attr => initialGrowth[attr.key] = 0);

    setFormData({
      year: newAppraisalYear,
      division: newAppraisalDivision,
      projects: [],
      overallContribution: '',
      status: 'draft',
      behaviourBased: initialBehaviour,
      processAdherence: initialProcess,
      technicalBased: initialTechnical,
      growthBased: initialGrowth
    });
    setIsReadOnly(false);
    setViewMode('edit');
  };


  const loadAttendanceData = async (fy) => {
    // Strongly prioritize the string employeeId over Mongo _id
    const employeeId =
      employeeInfo.employeeId || employeeInfo.empId || employeeInfo.id || '';

    if (!fy || !employeeId) {
      setNewAppraisalAttendance({
        workingDays: 0,
        presentDays: 0,
        absentDays: 0,
        officeHoliday: 0,
        regionalHoliday: 0,
        attendancePct: 0,
        loading: false,
      });
      return;
    }

    try {
      setNewAppraisalAttendance((prev) => ({ ...prev, loading: true }));
      const range = getFinancialYearRange(fy);
      const joinDate = employeeInfo.dateOfJoining ? new Date(employeeInfo.dateOfJoining) : null;
      let effectiveStart = range.start;
      if (joinDate && !Number.isNaN(joinDate.getTime()) && joinDate > range.start) {
        effectiveStart = joinDate;
      }

      // Use 'today' if the FY is the current one, similar to AttendanceSummary
      const now = new Date();
      const isCurrentFy = (fy === getCurrentFinancialYearLabel());
      const effectiveEnd = isCurrentFy ? now : range.end;

      const workingDays = getWorkingDaysBetween(effectiveStart, effectiveEnd);

      let present = 0;
      let absent = 0;
      let pct = 0;
      let office = 0;
      let regional = 0;
      let savedPct = null;

      try {
        const yearRes = await attendanceAPI.getYearSummary(employeeId, {
          financialYear: fy,
        });
        const doc = yearRes.data && yearRes.data.data;
        if (doc) {
          present = Number(doc.yearlyPresent || 0);
          absent = Number(doc.yearlyAbsent || 0);
          office = Number(doc.officeHoliday || 0);
          regional = Number(doc.regionalHoliday || 0);
          savedPct = typeof doc.yearlyPct === 'number' ? doc.yearlyPct : null;
        }
      } catch (e) {
        console.error("No saved year summary found, falling back to defaults", e);
      }

      if (workingDays > 0) {
        if (present > 0 && absent === 0) {
          absent = Math.max(0, workingDays - present - office - regional);
        }
        if (savedPct !== null) {
          pct = savedPct;
        } else {
          // Match AttendanceSummary.jsx denominator logic:
          const denom = Math.max(0, workingDays - office - regional);
          pct = denom > 0 ? Math.max(0, Math.min(100, (present / denom) * 100)) : 0;
        }
      }

      setNewAppraisalAttendance({
        workingDays,
        presentDays: present,
        absentDays: absent,
        officeHoliday: office,
        regionalHoliday: regional,
        attendancePct: pct,
        loading: false,
      });
    } catch {
      setNewAppraisalAttendance((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadAttendanceData(newAppraisalYear);
  }, [newAppraisalYear, employeeInfo.employeeId, employeeInfo.empId, employeeInfo.id]);

  const handleViewAppraisal = async (appraisal) => {
    try {
      const id = appraisal._id || appraisal.id;
      if (!id) throw new Error("Appraisal ID not found");
      const response = await performanceAPI.getSelfAppraisalById(id);
      let data = response.data;

      // Enhance with payroll data for accurate salary display if released
      if (['released', 'effective'].includes(data.status)) {
        try {
          const fySnapshotRes = await payrollAPI.getSnapshot('24-25', employeeInfo.employeeId || employeeInfo.empId);
          const fySnapshot = fySnapshotRes.data?.data;
          if (fySnapshot) {
            data.currentGross = fySnapshot.totalEarnings;
          }
        } catch (pErr) {
          console.error("FY snapshot fetch error in view", pErr);
        }
      }

      setViewData(data);
      setShowViewModal(true);
    } catch (error) {
      console.error("Failed to fetch appraisal details", error);
      setViewData(appraisal);
      setShowViewModal(true);
    }
  };

  const handleEditAppraisal = async (appraisal) => {
    if (!enabledSections.selfAppraisal) {
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: 'Self appraisal is not enabled for your designation.'
      });
      return;
    }
    try {
      const id = appraisal._id || appraisal.id;
      if (!id) throw new Error("Appraisal ID not found");
      const response = await performanceAPI.getSelfAppraisalById(id);
      let data = response.data;

      // Enhance with payroll data for accurate salary display if released
      if (['released', 'effective'].includes(data.status)) {
        try {
          const fySnapshotRes = await payrollAPI.getSnapshot('24-25', employeeInfo.employeeId || employeeInfo.empId);
          const fySnapshot = fySnapshotRes.data?.data;
          if (fySnapshot) {
            data.currentGross = fySnapshot.totalEarnings;
          }
        } catch (pErr) {
          console.error("FY snapshot fetch error in edit", pErr);
        }
      }

      const statusValue = data?.status ?? appraisal.status;
      setFormData({
        division: data.division || 'Software',
        ...data
      });
      setIsReadOnly(!isEditableStatus(statusValue));
      setViewMode('edit');

      // Load attendance for the existing appraisal's year
      if (response.data.year) {
        loadAttendanceData(response.data.year);
      }
    } catch (error) {
      console.error("Failed to fetch appraisal details", error);
      setFormData({
        ...formData,
        division: appraisal.division || formData.division || 'Software',
        ...appraisal
      });
      setIsReadOnly(!isEditableStatus(appraisal.status));
      setViewMode('edit');
      if (appraisal.year) {
        loadAttendanceData(appraisal.year);
      }
    }
  };

  const handleDeleteAppraisal = (id) => {
    setDeleteConfirmation({ isOpen: true, id });
  };

  const confirmDeleteAppraisal = async () => {
    const id = deleteConfirmation.id;
    if (!id) return;

    try {
      await performanceAPI.deleteSelfAppraisal(id);
      fetchAppraisals();
      setStatusPopup({ isOpen: true, status: 'success', message: 'Appraisal deleted successfully.' });
    } catch (error) {
      console.error("Failed to delete appraisal", error);
      const errorMsg = error.response?.data?.message || 'Failed to delete appraisal.';
      setStatusPopup({ isOpen: true, status: 'error', message: errorMsg });
    }
    setDeleteConfirmation({ isOpen: false, id: null });
  };

  const updateAcceptanceStatus = async (appraisalId, newStatus) => {
    if (!appraisalId) return;

    try {
      const payload = {
        employeeAcceptanceStatus: newStatus,
        status: newStatus === 'ACCEPTED' ? 'effective' : 'released'
      };
      if (newStatus === 'ACCEPTED') {
        payload.finalStatus = 'COMPLETED';
      }

      await performanceAPI.updateSelfAppraisal(appraisalId, payload);
      await fetchAppraisals();

      const message =
        newStatus === 'ACCEPTED'
          ? 'Appraisal accepted successfully.'
          : 'Appraisal marked as not accepted. HR/Admin will review.';

      setStatusPopup({
        isOpen: true,
        status: 'success',
        message
      });
      setShowReleaseLetter(false);
    } catch (error) {
      console.error("Failed to update appraisal acceptance", error);
      const errorMsg =
        error.response?.data?.message ||
        (newStatus === 'ACCEPTED'
          ? 'Failed to accept appraisal.'
          : 'Failed to update acceptance.');
      setStatusPopup({ isOpen: true, status: 'error', message: errorMsg });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setLoading(true);
      const elementIds = ['release-letter-page-1', 'release-letter-page-2'];
      if (letterData.isPromotionRecommended) {
        elementIds.push('release-letter-page-3');
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;

      for (let i = 0; i < elementIds.length; i++) {
        const element = document.getElementById(elementIds[i]);
        if (!element) continue;

        const canvas = await html2canvas(element, {
          scale: 3, // Higher scale for text clarity
          useCORS: true,
          logging: false,
          allowTaint: true
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      // Open in browser's built-in PDF viewer — works on all devices without a PDF reader
      const blobUrl = pdf.output('bloburl');
      const newTab = window.open(blobUrl, '_blank');
      if (!newTab) {
        // Fallback: if popup was blocked, download directly
        const fileName = `Release_Letter_${letterData.employeeName.replace(/\s+/g, '_')}_${letterData.financialYear}.pdf`;
        pdf.save(fileName);
      }
      setStatusPopup({ isOpen: true, status: 'success', message: 'PDF opened in a new tab. Use your browser\'s Save button to download.' });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      setStatusPopup({ isOpen: true, status: 'error', message: 'Failed to generate PDF. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLetter = async (partialAppraisal) => {
    try {
      setLoading(true);
      const id = partialAppraisal._id || partialAppraisal.id;
      const appraisalRes = await performanceAPI.getSelfAppraisalById(id);
      const appraisal = appraisalRes.data;

      let employeeDetails = {};

      try {
        if (appraisal.employeeId) {
          const res = await employeeAPI.getEmployeeById(appraisal.employeeId);
          employeeDetails = res.data;
        } else {
          // Fallback to current user profile if no specific employee ID in appraisal
          const res = await employeeAPI.getMyProfile();
          employeeDetails = res.data;
        }
      } catch (err) {
        console.error("Failed to fetch fresh employee details, using available info", err);
        employeeDetails = { ...employeeInfo, ...appraisal };
      }

      const financialYear = appraisal.year || getCurrentFinancialYearLabel();

      const today = new Date();
      const letterDate = formatDisplayDate(today);

      const employeeIdValue =
        employeeDetails.employeeId ||
        employeeDetails.empId ||
        appraisal.empId ||
        employeeInfo.employeeId ||
        appraisal.employeeId;

      let approvedPromotion = null;
      let isPromotionRecommended = false;

      // PROMOTION FIX: Check current appraisal first, then history
      if (appraisal.promotion?.recommended && appraisal.promotion?.newDesignation) {
        approvedPromotion = {
          newDesignation: String(appraisal.promotion.newDesignation || '').trim(),
          effectiveDate: appraisal.promotion.effectiveDate ? formatDisplayDate(appraisal.promotion.effectiveDate) : formatDisplayDate(new Date())
        };
        isPromotionRecommended = true;
      } else {
        try {
          const promoRes = await promotionAPI.getMyLatestApprovedPromotion();
          const promo = promoRes.data?.data || null;
          if (promo && String(promo.status || '').toLowerCase() === 'approved' && promo.newDesignation) {
            approvedPromotion = {
              newDesignation: String(promo.newDesignation || '').trim(),
              effectiveDate: formatDisplayDate(promo.effectiveDate)
            };
            isPromotionRecommended = true;
          }
        } catch (err) {
          approvedPromotion = null;
        }
      }

      // Start with immutable snapshots captured at release time, if available
      const hasSnapshotValues = (snapshot) => {
        if (!snapshot || typeof snapshot !== 'object') return false;
        return Object.values(snapshot).some((v) => Number(v || 0) > 0);
      };

      const snapshotOld = appraisal?.releaseSalarySnapshot || null;
      const snapshotNew = appraisal?.releaseRevisedSnapshot || null;
      const hasOldSnapshot = hasSnapshotValues(snapshotOld);
      const hasNewSnapshot = hasSnapshotValues(snapshotNew);

      const baseCtc = Number(appraisal.currentSalary || appraisal.salary || appraisal.releaseSalarySnapshot?.ctc || appraisal.currentSalarySnapshot || employeeDetails.ctc || 0);
      const totalPct = Number(appraisal.incrementPercentage || 0) + Number(appraisal.incrementCorrectionPercentage || 0);
      let revisedCtc = Number(appraisal.releaseRevisedSnapshot?.ctc || appraisal.revisedSalary || 0);

      // Safety check: If revised is lower than current, recalculate based on percentage
      if (revisedCtc < baseCtc && totalPct > 0) {
        revisedCtc = Math.round(baseCtc * (1 + totalPct / 100));
      }
      // Guarantee revised is not less than current
      if (revisedCtc < baseCtc) revisedCtc = baseCtc;

      let salaryOld = { basic: 0, hra: 0, special: 0, net: 0, empPF: 0, gross: 0, employerPF: 0, gratuity: 0, ctc: 0 };
      try {
        if (employeeIdValue) {
          // Fetch from FY24-25 snapshot for "Current" column
          const fySnapshotRes = await payrollAPI.getSnapshot('24-25', employeeIdValue);
          const fySnapshot = fySnapshotRes.data?.data;

          if (fySnapshot) {
            salaryOld = calculateCurrentSalaryAnnexure(fySnapshot);
          } else {
            salaryOld = calculateSalaryAnnexure(appraisal.currentGross || baseCtc);
          }
        } else {
          salaryOld = calculateSalaryAnnexure(appraisal.currentGross || baseCtc);
        }
      } catch (err) {
        console.error("Salary prep error:", err);
        salaryOld = calculateSalaryAnnexure(appraisal.currentGross || baseCtc);
      }

      // ── Revised (Monthly): read directly from the payrolls table ──────────
      let salaryNew;
      try {
        const payrollRes = await payrollAPI.getByEmployeeId(employeeIdValue);
        const pr = payrollRes.data;
        if (pr && Number(pr.totalEarnings || 0) > 0) {
          // Use the live payrolls record — this is the ground truth
          const newGross = Number(pr.totalEarnings || 0);
          const newBasic = Number(pr.basicDA || 0);
          const newHra = Number(pr.hra || 0);
          const newSpecial = Number(pr.specialAllowance || 0);
          const newEmpPF = Number(pr.employeePfContribution || 0);
          const newEmrPF = Number(pr.employerPfContribution || 0);
          const newEsi = Number(pr.esi || 0);
          const newVolunteerPF = Number(pr.volunteerPF || 0);
          // Net Salary = (Basic + HRA + Special) - Volunteer PF
          const newNet = (newBasic + newHra + newSpecial) - newVolunteerPF;
          const newGratuity = Number(pr.gratuity || Math.round(newBasic * 0.0486));
          const newCtc = Number(pr.ctc || (newGross + newGratuity));
          salaryNew = {
            basic: newBasic,
            hra: newHra,
            special: newSpecial,
            net: newNet,
            empPF: newEmpPF,
            employeePfContribution: newEmpPF,
            gross: newGross,
            employerPF: newEmrPF,
            employerPfContribution: newEmrPF,
            esi: newEsi,
            volunteerPF: newVolunteerPF,
            gratuity: newGratuity,
            ctc: newCtc,
          };
        } else {
          // Fallback: recalculate from FY24-25 gross + increment %
          const incrementBase = salaryOld.gross || appraisal.currentGross || baseCtc;
          const targetRevisedGross = Math.round(incrementBase * (1 + totalPct / 100));
          salaryNew = calculateSalaryAnnexure(targetRevisedGross);
        }
      } catch (payrollErr) {
        console.error('Failed to fetch payroll for revised column:', payrollErr);
        const incrementBase = salaryOld.gross || appraisal.currentGross || baseCtc;
        const targetRevisedGross = Math.round(incrementBase * (1 + totalPct / 100));
        salaryNew = calculateSalaryAnnexure(targetRevisedGross);
      }

      const incrementAmount = Math.max(0, (salaryNew.ctc || revisedCtc) - baseCtc);

      const data = {
        date: letterDate,
        employeeName: employeeDetails.name || employeeDetails.fullName || employeeInfo.name,
        employeeId: employeeIdValue || 'EMP-001',
        designation: employeeDetails.designation || employeeDetails.role || employeeInfo.designation,
        location: employeeDetails.location || employeeDetails.branch || employeeInfo.location || 'Chennai',
        financialYear: financialYear,
        effectiveDate: '1st April 2026',
        performanceRating: (appraisal.managerReview?.performanceRating || appraisal.appraiserRating || ''),
        incrementPercentage: totalPct,
        incrementAmount,
        appraisalId: appraisal._id || appraisal.id,
        appraisalStatus: appraisal.status || '',
        employeeAcceptanceStatus: appraisal.employeeAcceptanceStatus || null,
        performancePay: Number(appraisal.performancePay || 0),
        promotion: approvedPromotion,
        isPromotionRecommended,
        salary: {
          old: salaryOld,
          new: salaryNew
        }
      };

      setLetterData(data);
      setShowReleaseLetter(true);
    } catch (error) {
      console.error("Error preparing letter", error);
      setStatusPopup({ isOpen: true, status: 'error', message: "Failed to prepare release letter." });
    } finally {
      setLoading(false);
    }
  };

  const downloadReleaseLetter = async () => {
    try {
      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      const page1 = document.getElementById('release-letter-page-1');
      const page2 = document.getElementById('release-letter-page-2');
      const page3 = document.getElementById('release-letter-page-3');
      const includePage3 = Boolean(letterData?.promotion?.newDesignation);

      console.log('Generating letter for location:', letterData?.location);

      if (!page1 || !page2) {
        setStatusPopup({ isOpen: true, status: 'error', message: "Template not found." });
        return;
      }
      if (includePage3 && !page3) {
        setStatusPopup({ isOpen: true, status: 'error', message: "Promotion certificate template not found." });
        return;
      }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;

      // Helper function to capture element with high fidelity
      const captureElement = async (element) => {
        // Create a clone to render off-screen but fully visible
        const clone = element.cloneNode(true);

        // Reset styles on clone to ensure it renders at full A4 size
        clone.style.cssText = `
          position: fixed; 
          top: 0; 
          left: 0; 
          width: 794px; 
          min-height: 1123px; 
          z-index: -9999; 
          background-color: white;
          transform: none;
          margin: 0;
          padding: 0;
          overflow: visible;
        `;

        document.body.appendChild(clone);

        try {
          // Use html2canvas on the clone
          const canvas = await html2canvas(clone, {
            scale: 2, // Higher scale for crisp text
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 794,
            windowWidth: 794,
            onclone: (clonedDoc) => {
              // Ensure all images in the clone are loaded (optional double check)
              const images = clonedDoc.getElementsByTagName('img');
              for (let img of images) {
                img.crossOrigin = "Anonymous";
              }
            }
          });
          return canvas;
        } finally {
          // Clean up
          if (document.body.contains(clone)) {
            document.body.removeChild(clone);
          }
        }
      };

      // Capture Page 1
      const canvas1 = await captureElement(page1);
      const imgData1 = canvas1.toDataURL('image/jpeg', 1.0);
      pdf.addImage(imgData1, 'JPEG', 0, 0, imgWidth, pageHeight);

      // Capture Page 2
      pdf.addPage();
      const canvas2 = await captureElement(page2);
      const imgData2 = canvas2.toDataURL('image/jpeg', 1.0);
      pdf.addImage(imgData2, 'JPEG', 0, 0, imgWidth, pageHeight);

      if (includePage3) {
        pdf.addPage();
        const canvas3 = await captureElement(page3);
        const imgData3 = canvas3.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData3, 'JPEG', 0, 0, imgWidth, pageHeight);
      }

      // Open PDF in browser's built-in viewer (works without any external PDF reader)
      const blobUrl = pdf.output('bloburl');
      const newTab = window.open(blobUrl, '_blank');
      if (!newTab) {
        // Fallback: if browser blocked the popup, trigger a direct download
        pdf.save(`Release_Letter_${letterData.employeeId}.pdf`);
      }
    } catch (error) {
      console.error("PDF Generation failed", error);
      setStatusPopup({ isOpen: true, status: 'error', message: "Failed to generate PDF." });
    }
  };

  const handleDownloadPdf = async (appraisal) => {
    // Just trigger the preparation and preview
    await handleDownloadLetter(appraisal);
    setAutoDownload(true);
  };

  useEffect(() => {
    if (showReleaseLetter && letterData && autoDownload) {
      (async () => {
        try {
          await downloadReleaseLetter();
        } finally {
          setAutoDownload(false);
          setShowReleaseLetter(false);
        }
      })();
    }
  }, [showReleaseLetter, letterData, autoDownload]);


  // Project Modal Handlers
  const openAddProjectModal = () => {
    setCurrentProject({ id: null, name: '', contribution: '' });
    setShowProjectModal(true);
  };

  const openEditProjectModal = (project) => {
    setCurrentProject(project);
    setShowProjectModal(true);
  };

  const saveProject = () => {
    if (currentProject.id) {
      // Update existing
      const updatedProjects = formData.projects.map(p =>
        p.id === currentProject.id ? currentProject : p
      );
      setFormData({ ...formData, projects: updatedProjects });
    } else {
      // Add new
      const newProject = { ...currentProject, id: Date.now() };
      setFormData({ ...formData, projects: [...formData.projects, newProject] });
    }
    setShowProjectModal(false);
  };

  const removeProject = (id) => {
    if (window.confirm('Remove this project?')) {
      setFormData({
        ...formData,
        projects: formData.projects.filter(p => p.id !== id)
      });
    }
  };

  // Overall Contribution Handlers
  const saveOverallContribution = (value) => {
    setFormData({ ...formData, overallContribution: value });
    setShowContributionModal(false);
  };

  // Category Handlers
  const updateBehaviourRating = (field, value) => {
    setFormData({
      ...formData,
      behaviourBased: {
        ...formData.behaviourBased,
        [field]: value
      }
    });
  };

  const updateTechnicalRating = (field, value) => {
    setFormData({
      ...formData,
      technicalBased: {
        ...formData.technicalBased,
        [field]: value
      }
    });
  };

  const updateGrowthRating = (field, value) => {
    setFormData({
      ...formData,
      growthBased: {
        ...formData.growthBased,
        [field]: value
      }
    });
  };

  const updateProcessRating = (field, value) => {
    setFormData({
      ...formData,
      processAdherence: {
        ...formData.processAdherence,
        [field]: value
      }
    });
  };



  const handleSubmit = async (action) => {
    if (isReadOnly) {
      setStatusPopup({
        isOpen: true,
        status: 'info',
        message: 'This appraisal is submitted and cannot be edited.'
      });
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);

      if (action === 'Submit') {
        const missingFields = [];

        if (!formData.division || !formData.division.trim()) {
          missingFields.push('Division');
        }
        if (enabledSections.knowledgeSharing && (!formData.behaviourBased?.comments || !formData.behaviourBased.comments.trim())) {
          missingFields.push('Knowledge Sharing - Appraisee Comments');
        }
        if (enabledSections.processAdherence && (!formData.processAdherence?.comments || !formData.processAdherence.comments.trim())) {
          missingFields.push('Process Adherence - Appraisee Comments');
        }
        if (enabledSections.technicalAssessment && (!formData.technicalBased?.comments || !formData.technicalBased.comments.trim())) {
          missingFields.push('Technical Based - Appraisee Comments');
        }
        if (enabledSections.growthAssessment && (!formData.growthBased?.comments || !formData.growthBased.comments.trim())) {
          missingFields.push('Growth Based - Appraisee Comments');
        }

        if (missingFields.length > 0) {
          setStatusPopup({
            isOpen: true,
            status: 'error',
            message: `Please fill required fields: ${missingFields.join(', ')}.`
          });
          setIsSubmitting(false);
          return;
        }
      }

      const payload = {
        ...formData,
        status: action === 'Submit' ? 'submitted' : 'draft'
      };

      const appraisalId = formData._id || formData.id;
      if (appraisalId) {
        await performanceAPI.updateSelfAppraisal(appraisalId, payload);
      } else {
        await performanceAPI.createSelfAppraisal(payload);
      }

      setStatusPopup({
        isOpen: true,
        status: 'success',
        message: `Self appraisal ${action === 'Submit' ? 'submitted' : 'saved'} successfully!`
      });
      setIsSubmitting(false);
      fetchAppraisals();
      setViewMode('list');
    } catch (error) {
      setIsSubmitting(false);
      console.error("Failed to save appraisal", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to save appraisal. Please try again.";
      setStatusPopup({
        isOpen: true,
        status: 'error',
        message: errorMsg
      });
    }
  };

  // --- Render Views ---

  if (viewMode === 'list') {
    const openFy = getOpenFinancialYearLabel();
    const openFyExisting = appraisals.find((a) => String(a.year || '').trim() === String(openFy).trim());
    const isOpenFyLocked = Boolean(openFyExisting && !isEditableStatus(openFyExisting.status));

    const activePromotion = appraisals.find(a =>
      (String(a.status || '').toLowerCase().includes('released')) &&
      a.promotion?.recommended &&
      (!a.employeeAcceptanceStatus || a.employeeAcceptanceStatus === 'PENDING')
    );

    return (
      <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
        <div className="w-full mx-auto">
          {activePromotion && (
            <div className="mb-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 text-white flex items-center justify-between shadow-2xl animate-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-6">
                <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/20 shadow-inner">
                  <Trophy className="h-10 w-10 text-yellow-300 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="font-black text-3xl tracking-tight leading-none">Victory! 🏆</h4>
                    <span className="px-3 py-1 bg-yellow-400 text-purple-900 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm">Promotion Pending Acceptance</span>
                  </div>
                  <p className="text-purple-100 text-lg font-medium">You have been promoted to <span className="font-black text-white underline decoration-2 decoration-yellow-300 underline-offset-4">{activePromotion.promotion?.newDesignation}</span>. Please review and accept your release letter below.</p>
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="h-20 w-20 opacity-20 border-8 border-white rounded-full"></div>
              </div>
            </div>
          )}
          <div className="flex justify-between items-center mb-6">
            {enabledSections.selfAppraisal ? (
              <button
                onClick={() => {
                  if (isOpenFyLocked) {
                    setStatusPopup({
                      isOpen: true,
                      status: 'info',
                      message: `Already you applied appraisal for FY ${openFy}.`
                    });
                    return;
                  }
                  setShowNewAppraisalModal(true);
                }}
                disabled={isOpenFyLocked || loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-semibold rounded-full text-white bg-gradient-to-r from-[#262760] to-indigo-600 focus:outline-none ${(isOpenFyLocked || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:from-[#1e2050] hover:to-[#262760]'}`}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Appraisal
              </button>
            ) : (
              <div className="text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm">
                Self appraisal is disabled for your designation.
              </div>
            )}
          </div>

          <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading appraisals...</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#262760] sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">FY</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Appraiser Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                    <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Letter</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {appraisals.map((appraisal) => {
                    const status = (appraisal.status || 'draft').toLowerCase();
                    const isDraft = status === 'draft';
                    const isReleased = ['released', 'effective'].includes(status);

                    return (
                      <tr key={appraisal._id || appraisal.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {appraisal.year}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {appraisal.appraiser || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${status === 'directorpushedback' ? 'bg-red-100 text-red-800' :
                              isReleased ? 'bg-green-100 text-green-800' :
                                status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                  isDraft ? 'bg-gray-100 text-gray-800' :
                                    'bg-indigo-100 text-indigo-800'}`}>
                            {getStatusLabel(appraisal.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex justify-center space-x-3">
                            {isDraft ? (
                              <>
                                <button
                                  onClick={() => handleEditAppraisal(appraisal)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Edit"
                                >
                                  <Edit className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAppraisal(appraisal._id || appraisal.id)}
                                  className="text-red-500 hover:text-red-700 p-1"
                                  title="Delete"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleViewAppraisal(appraisal)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                                title="View"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {isReleased ? (
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => handleDownloadLetter(appraisal)}
                                className="text-[#262760] hover:text-[#1e2050] p-1"
                                title="Preview Letter"
                              >
                                <FileText className="h-5 w-5" />
                              </button>
                              {(appraisal.employeeAcceptanceStatus === 'ACCEPTED' || ['effective'].includes(status)) && (
                                <button
                                  onClick={() => handleDownloadPdf(appraisal)}
                                  className="text-emerald-600 hover:text-emerald-800 p-1"
                                  title="Download PDF"
                                >
                                  <Download className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs italic">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <Modal
          isOpen={showNewAppraisalModal}
          onClose={() => setShowNewAppraisalModal(false)}
          title="Start New Self Appraisal"
          icon={Award}
          colorTheme="purple"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-[#262760] to-indigo-600 rounded-2xl p-4 text-white flex items-center shadow-md">
                <div className="flex-shrink-0 mr-4">
                  <div className="h-12 w-12 rounded-full bg-white/15 flex items-center justify-center text-lg font-bold">
                    {employeeInitials}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-indigo-100 mb-1">
                    Employee
                  </div>
                  <div className="text-base font-semibold">
                    {employeeInfo.name || employeeInfo.employeeName || 'Employee'}
                  </div>
                  <div className="text-[11px] text-indigo-100 mt-1">
                    ID: {employeeInfo.employeeId || employeeInfo.empId || '-'}
                  </div>
                  <div className="text-[11px] text-indigo-100 mt-1">
                    Designation: {employeeInfo.designation || employeeInfo.role || employeeInfo.position || '-'}
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 uppercase mb-1">
                    New Appraisal Draft
                  </div>
                  <p className="text-sm text-gray-600">
                    A fresh self appraisal will be created for you. You can add projects,
                    ratings and comments in the next screen.
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Status: Draft
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Step 1 of 2
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="text-[11px] font-semibold text-gray-500 uppercase mb-2">
                  Appraisal Settings
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Financial Year
                    </label>
                    <select
                      value={newAppraisalYear}
                      onChange={(e) => setNewAppraisalYear(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm font-semibold text-[#262760]"
                    >
                      {getNewAppraisalFinancialYearOptions().filter(Boolean).map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">
                      Division <span className="text-red-500">*</span>
                    </label>
                    {!employeeInfo.division ? (
                      <select
                        value={newAppraisalDivision}
                        onChange={(e) => setNewAppraisalDivision(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] text-sm font-semibold text-[#262760]"
                      >
                        <option value="">Select Division</option>
                        <option value="SDS">SDS Division</option>
                        <option value="Tekla">Tekla Division</option>
                      </select>
                    ) : (
                      <div className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-[#262760]">
                        {employeeInfo.division}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-blue-100 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase">
                    Attendance Snapshot
                  </span>
                  <span className="text-[11px] text-gray-400">
                    FY {newAppraisalYear}
                  </span>
                </div>
                {newAppraisalAttendance.loading ? (
                  <div className="text-sm text-gray-500 mt-2">Loading attendance...</div>
                ) : (
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between text-green-600">
                      <span>Present Days</span>
                      <span className="font-semibold">{newAppraisalAttendance.presentDays}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Absent Days</span>
                      <span className="font-semibold">{newAppraisalAttendance.absentDays}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-100 pt-2 font-bold text-[#262760]">
                      <span>Attendance %</span>
                      <span>
                        {newAppraisalAttendance.attendancePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-dashed border-gray-200">
              <div className="flex items-center space-x-2 text-[11px] text-gray-500">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>Next: Fill self appraisal details and submit to appraiser</span>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowNewAppraisalModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-full hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!newAppraisalDivision || !newAppraisalDivision.trim()) {
                      setStatusPopup({
                        isOpen: true,
                        status: 'error',
                        message: 'Please select Division before creating self appraisal.',
                      });
                      return;
                    }
                    setShowNewAppraisalModal(false);
                    startNewAppraisal();
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-full shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Appraisal
                </button>
              </div>
            </div>
          </div>
        </Modal>

        {/* View Appraisal Modal */}
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Appraisal Details - FY ${viewData?.year || ''}`}
          icon={Eye}
          colorTheme="blue"
          maxWidth="max-w-6xl"
        >
          {viewData && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
              {/* Workflow Status Tracker */}
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Approval Status</h4>
                <WorkflowTracker
                  currentStageId={getStageFromStatus(viewData.status)}
                  userFlow={userFlow}
                />
              </div>

              {/* Increment Summary Section - Visible only after Letter Release */}
              {['released', 'effective'].includes(viewData.status) && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Increment Summary
                  </h3>
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-5 border border-green-100 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                        <p className="text-sm font-medium text-gray-500 mb-1">Current Salary</p>
                        <p className="text-xl font-bold text-gray-700">
                          ₹{((viewData.revisedSalary || 0) - (viewData.incrementAmount || 0)).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                        <p className="text-sm font-medium text-gray-500 mb-1">Increment %</p>
                        <p className="text-xl font-bold text-green-600">
                          {((viewData.incrementPercentage || 0) + (viewData.incrementCorrectionPercentage || 0)).toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-green-100 shadow-sm">
                        <p className="text-sm font-medium text-gray-500 mb-1">Revised Salary</p>
                        <p className="text-xl font-bold text-[#262760]">
                          ₹{(calculateSalaryAnnexure((viewData.currentGross || (viewData.revisedSalary - viewData.incrementAmount)) * (1 + ((viewData.incrementPercentage || 0) + (viewData.incrementCorrectionPercentage || 0)) / 100)).ctc || viewData.revisedSalary || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {enabledSections.selfAppraisal && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-[#262760]" />
                    Key Projects
                  </h3>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    {viewData.projects && viewData.projects.length > 0 ? (
                      <div className="divide-y divide-gray-200">
                        {viewData.projects.map((project, index) => (
                          <div key={index} className="p-4 hover:bg-white transition-colors">
                            <h4 className="font-bold text-[#262760] text-lg mb-2">{index + 1}. {project.name}</h4>
                            <div className="bg-white p-3 rounded border border-gray-100 shadow-sm">
                              <p className="text-gray-700 whitespace-pre-wrap">{project.contribution}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="p-4 text-gray-500 italic">No projects recorded.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Behaviour Based Section */}
              {enabledSections.knowledgeSharing && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-purple-600" />
                    Knowledge Sharing Assessment
                  </h3>
                  <div className="bg-purple-50 rounded-lg p-5 border border-purple-100 shadow-sm">
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      {masterAttributes.knowledgeSubItems.map((attr) => {
                        const isEnabled = enabledSections.knowledgeSubItems?.[attr.key];
                        const selfVal = viewData.behaviourBased?.[attr.key] || 0;
                        const mgrVal = viewData.behaviourManagerRatings?.[attr.key] || viewData[`behaviour${attr.key.charAt(0).toUpperCase() + attr.key.slice(1)}Manager`] || 0;
                        if (!isEnabled && selfVal === 0 && mgrVal === 0) return null;

                        const isReleased = ['released', 'accepted', 'effective', 'completed'].includes(String(viewData.status || '').toLowerCase());

                        return (
                          <div key={attr.key}>
                            <span className="font-semibold">{attr.label}:</span>
                            <span className="ml-1 text-gray-700">Self {selfVal}/5</span>
                            {isReleased && (
                              <span className="ml-2 text-indigo-600 font-medium">Manager {mgrVal}/5</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {viewData.behaviourBased?.comments && (
                      <div className="mt-2 p-3 bg-white rounded border border-purple-100">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                        <p className="text-sm text-gray-700 italic">"{viewData.behaviourBased.comments}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Process Adherence Section */}
              {enabledSections.processAdherence && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-orange-600" />
                    Process Adherence
                  </h3>
                  <div className="bg-orange-50 rounded-lg p-5 border border-orange-100 shadow-sm">
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      {masterAttributes.processSubItems.map((attr) => {
                        const isEnabled = enabledSections.processSubItems?.[attr.key];
                        const selfVal = viewData.processAdherence?.[attr.key] || 0;
                        const mgrVal = viewData.processManagerRatings?.[attr.key] || viewData[`process${attr.key.charAt(0).toUpperCase() + attr.key.slice(1)}Manager`] || 0;
                        if (!isEnabled && selfVal === 0 && mgrVal === 0) return null;

                        const isReleased = ['released', 'accepted', 'effective', 'completed'].includes(String(viewData.status || '').toLowerCase());

                        return (
                          <div key={attr.key}>
                            <span className="font-semibold">{attr.label}:</span>
                            <span className="ml-1 text-gray-700">Self {selfVal}/5</span>
                            {isReleased && (
                              <span className="ml-2 text-orange-600 font-medium">Manager {mgrVal}/5</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {viewData.processAdherence?.comments && (
                      <div className="mt-2 p-3 bg-white rounded border border-orange-100">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                        <p className="text-sm text-gray-700 italic">"{viewData.processAdherence.comments}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Technical Based Section */}
              {enabledSections.technicalAssessment && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <Code className="h-5 w-5 mr-2 text-blue-600" />
                    Technical Based Assessment
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-5 border border-blue-100 shadow-sm">
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      {masterAttributes.technicalSubItems.map((attr) => {
                        const isEnabled = enabledSections.technicalSubItems?.[attr.key];
                        const selfVal = viewData.technicalBased?.[attr.key] || 0;
                        const mgrVal = viewData.technicalManagerRatings?.[attr.key] || viewData[`technical${attr.key.charAt(0).toUpperCase() + attr.key.slice(1)}Manager`] || 0;
                        if (!isEnabled && selfVal === 0 && mgrVal === 0) return null;

                        const isReleased = ['released', 'accepted', 'effective', 'completed'].includes(String(viewData.status || '').toLowerCase());

                        return (
                          <div key={attr.key}>
                            <span className="font-semibold">{attr.label}:</span>
                            <span className="ml-1 text-gray-700">Self {selfVal}/5</span>
                            {isReleased && (
                              <span className="ml-2 text-blue-600 font-medium">Manager {mgrVal}/5</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {viewData.technicalBased?.comments && (
                      <div className="mt-2 p-3 bg-white rounded border border-blue-100">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                        <p className="text-sm text-gray-700 italic">"{viewData.technicalBased.comments}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Growth Based Section */}
              {enabledSections.growthAssessment && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Growth Based Assessment
                  </h3>
                  <div className="bg-green-50 rounded-lg p-5 border border-green-100 shadow-sm">
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      {masterAttributes.growthSubItems.map((attr) => {
                        const isEnabled = enabledSections.growthSubItems?.[attr.key];
                        const selfVal = viewData.growthBased?.[attr.key] || 0;
                        const mgrVal = viewData.growthManagerRatings?.[attr.key] || viewData[`growth${attr.key.charAt(0).toUpperCase() + attr.key.slice(1)}Manager`] || 0;
                        if (!isEnabled && selfVal === 0 && mgrVal === 0) return null;

                        const isReleased = ['released', 'accepted', 'effective', 'completed'].includes(String(viewData.status || '').toLowerCase());

                        return (
                          <div key={attr.key}>
                            <span className="font-semibold">{attr.label}:</span>
                            <span className="ml-1 text-gray-700">Self {selfVal}/5</span>
                            {isReleased && (
                              <span className="ml-2 text-emerald-600 font-medium">Manager {mgrVal}/5</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {viewData.growthBased?.careerGoals && (
                      <div className="mt-2">
                        <span className="font-semibold">Career Goals:</span>
                        <p className="text-gray-700 mt-1">{viewData.growthBased.careerGoals}</p>
                      </div>
                    )}
                    {viewData.growthBased?.comments && (
                      <div className="mt-2 p-3 bg-white rounded border border-green-100">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                        <p className="text-sm text-gray-700 italic">"{viewData.growthBased.comments}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}


              {/* Overall Contribution Section */}
              {enabledSections.selfAppraisal && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-purple-600" />
                    Overall Contribution
                  </h3>
                  <div className="bg-purple-50 rounded-lg p-5 border border-purple-100 shadow-sm">
                    {viewData.overallContribution ? (
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base">
                        {viewData.overallContribution}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic">No overall contribution summary provided.</p>
                    )}
                  </div>
                </div>
              )}

              {viewData.managerComments && ['released', 'accepted', 'effective', 'completed'].includes(String(viewData.status || '').toLowerCase()) && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Manager Comments <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full uppercase tracking-wider">Released via Letter</span>
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-5 border border-blue-100 shadow-sm transition-all hover:shadow-md">
                    <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-base italic">
                      "{viewData.managerComments}"
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-6 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm"
                  onClick={() => setShowViewModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </Modal>

        {showReleaseLetter && letterData && (
          <div className="fixed inset-0 bg-black/80 z-50 backdrop-blur-sm flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col relative overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-white z-20 shrink-0">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-gray-800">Release Letter Preview</h2>
                  <button
                    onClick={downloadReleaseLetter}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[#1e8a44] text-white rounded-lg hover:bg-[#166534] transition-all text-sm font-black shadow-md disabled:opacity-50"
                  >
                    {loading ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download Official PDF
                  </button>
                </div>
                <button
                  onClick={() => setShowReleaseLetter(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 md:p-8 bg-gray-100 overflow-auto flex flex-col items-center gap-8 flex-grow">

                <div id="release-letter-page-1" className="bg-white relative min-h-[1120px] w-[794px] shadow-lg flex-shrink-0 flex flex-col">
                  {/* Background Logo */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <img
                      src="/images/steel-logo.png"
                      alt=""
                      className="w-[500px] opacity-[0.05] grayscale"
                    />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                    {/* Header */}
                    <div className="w-full flex h-32 relative overflow-hidden">
                      {/* SVG Background for Header */}
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

                      {/* Right Part: Address */}
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

                    {/* Body */}
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
                          Details are provided in the attached Annexure.

                          We draw your attention to the fact that your compensation is personal to you.

                          As this information is confidential, we expect you to refrain from sharing the same with your colleagues.

                          I take this opportunity to thank you for the contribution made by you during the year of review and wish you success for the year ahead.
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
                        <p>
                          We look forward to your continued dedication and commitment to the organization.
                        </p>
                        <p className="mt-4">
                          All other terms and conditions of your employment remain unchanged.
                        </p>
                      </div>

                      {/* Signatory */}
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

                    {/* Footer */}
                    <div className="w-full h-24 relative mt-auto overflow-hidden">
                      {/* SVG Background for Footer */}
                      <div className="absolute inset-0 z-0">
                        <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                          {/* Orange Bar */}
                          <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                          {/* Blue Shape */}
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
                  {/* Background Logo */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                    <img
                      src="/images/steel-logo.png"
                      alt=""
                      className="w-[500px] opacity-[0.05] grayscale"
                    />
                  </div>

                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                    {/* Header */}
                    <div className="w-full flex h-32 relative overflow-hidden">
                      {/* SVG Background for Header */}
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

                      {/* Right Part: Address */}
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

                    {/* Body */}
                    <div className="px-12 py-4 flex-grow">
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-[14px] leading-6">
                          <div>
                            <span className="font-bold">Performance Rating:</span>{' '}
                            <span className="font-bold">{letterData.performanceRating || '-'}</span>
                          </div>
                          <div>
                            <span className="font-bold">Increment %:</span>{' '}
                            <span className="font-bold">{Number(letterData.incrementPercentage || 0)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className="mb-4 text-center">
                        <div className="font-bold text-xl underline decoration-1 underline-offset-4">ANNEXURE - SALARY REVISION DETAILS</div>
                      </div>

                      <div className="mb-4">
                        <p className="text-[14px] leading-6 mb-4">
                          Name: <span className="font-bold text-black uppercase">{letterData.employeeName}</span><br />
                          Employee ID: <span className="font-bold text-black uppercase">{letterData.employeeId}</span>
                        </p>
                        <p className="text-[14px] leading-6 mb-4">
                          Revised compensation details with effect from <span className="font-bold">{letterData.effectiveDate}</span>:
                        </p>
                      </div>

                      {/* Salary Table */}
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

                      {/* Notes and Declaration */}
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

                    {/* Footer */}
                    <div className="w-full h-24 relative mt-auto overflow-hidden">
                      {/* SVG Background for Footer */}
                      <div className="absolute inset-0 z-0">
                        <svg width="100%" height="100%" viewBox="0 0 794 96" preserveAspectRatio="none">
                          {/* Orange Bar */}
                          <rect x="0" y="84" width="350" height="12" fill="#f37021" />
                          {/* Blue Shape */}
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

                {letterData?.isPromotionRecommended && (
                  <PromotionPage data={letterData} />
                )}
              </div>
              {/* Acceptance Controls */}
              {(String(letterData.appraisalStatus || '').toLowerCase() === 'released' || String(letterData.appraisalStatus || '').toLowerCase() === 'released letter') &&
                (!letterData.employeeAcceptanceStatus || letterData.employeeAcceptanceStatus === 'PENDING') && (
                  <div className="px-8 pb-6 pt-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-b-lg shrink-0 z-20">
                    <div className="text-sm font-medium text-gray-800">
                      Do you accept this appraisal?
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setShowReleaseLetter(false)}
                        className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-6 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (letterData.appraisalId) {
                            await updateAcceptanceStatus(letterData.appraisalId, 'ACCEPTED');
                          }
                        }}
                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-8 py-2 bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all shadow-md hover:shadow-lg"
                      >
                        Accept Appraisal
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={deleteConfirmation.isOpen}
          onClose={() => setDeleteConfirmation({ isOpen: false, id: null })}
          title="Delete Appraisal"
          icon={Trash2}
          colorTheme="red"
          maxWidth="max-w-md"
        >
          <div className="p-4">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-center text-gray-900 mb-2">Are you sure?</h3>
            <p className="text-sm text-center text-gray-500 mb-6">
              Do you really want to delete this appraisal? This process cannot be undone.
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setDeleteConfirmation({ isOpen: false, id: null })}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAppraisal}
                className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>

        {/* Status Popup */}
        <StatusPopup
          isOpen={statusPopup.isOpen}
          onClose={() => setStatusPopup({ ...statusPopup, isOpen: false })}
          status={statusPopup.status}
          message={statusPopup.message}
        />
      </div>
    );
  }

  // Edit View
  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setViewMode('list')}
                className="mr-4 flex items-center text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="h-6 w-6" />
                <span className="ml-2">Back</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <WorkflowTracker currentStageId={currentStageId} userFlow={userFlow} />

        {/* Attendance Snapshot Card */}
        <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Calendar className="h-6 w-6 mr-2 text-blue-600" />
              Attendance Snapshot
            </h2>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase tracking-wider">
              FY {formData.year || formData.financialYear || newAppraisalYear}
            </span>
          </div>

          {newAppraisalAttendance.loading ? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 rounded-lg p-4 border border-green-100 flex items-center">
                <div className="bg-green-100 p-3 rounded-lg mr-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-600 uppercase tracking-wider">Present Days</p>
                  <p className="text-2xl font-bold text-green-700">{newAppraisalAttendance.presentDays}</p>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4 border border-red-100 flex items-center">
                <div className="bg-red-100 p-3 rounded-lg mr-4">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Absent Days</p>
                  <p className="text-2xl font-bold text-red-700">{newAppraisalAttendance.absentDays}</p>
                </div>
              </div>

              <div className="bg-[#262760]/5 rounded-lg p-4 border border-[#262760]/10 flex items-center">
                <div className="bg-[#262760]/10 p-3 rounded-lg mr-4">
                  <Trophy className="h-6 w-6 text-[#262760]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-[#262760] uppercase tracking-wider">Attendance %</p>
                  <p className="text-2xl font-bold text-[#262760]">{newAppraisalAttendance.attendancePct.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Increment Summary - Only shown if released */}
        {['released', 'effective'].includes(formData.status) && (
          <div className="mt-6 bg-emerald-50 rounded-xl shadow-sm border border-emerald-200 p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <TrendingUp className="h-24 w-24 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-emerald-900 flex items-center mb-6 relative z-10">
              <TrendingUp className="h-6 w-6 mr-2 text-emerald-600" />
              Increment Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div className="bg-white rounded-lg p-5 border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Current Salary</p>
                <p className="text-2xl font-black text-gray-900">
                  ₹ {(Number(formData.currentSalary || 0)).toLocaleString('en-IN')}
                </p>
              </div>

              <div className="bg-white rounded-lg p-5 border border-emerald-100 shadow-sm transition-all hover:shadow-md">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Increment %</p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-black text-emerald-600">
                    {((Number(formData.incrementPercentage || 0)) + (Number(formData.incrementCorrectionPercentage || 0))).toFixed(1)}%
                  </p>
                  {Number(formData.incrementCorrectionPercentage || 0) !== 0 && (
                    <span className="ml-2 text-xs font-medium text-emerald-500">
                      ({Number(formData.incrementPercentage || 0)}% + {Number(formData.incrementCorrectionPercentage || 0)}% corr.)
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg p-5 border border-emerald-100 shadow-sm transition-all hover:shadow-md border-l-4 border-l-[#262760]">
                <p className="text-xs font-bold text-[#262760] uppercase tracking-wider mb-2">Revised Salary</p>
                <p className="text-2xl font-black text-[#262760]">
                  ₹ {(calculateSalaryAnnexure((formData.currentGross || (formData.revisedSalary - (formData.incrementAmount || 0))) * (1 + ((formData.incrementPercentage || 0) + (formData.incrementCorrectionPercentage || 0)) / 100)).ctc || Number(formData.revisedSalary || 0)).toLocaleString('en-IN')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Projects Section */}
        {enabledSections.selfAppraisal && (
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Key Projects</h2>
              {!isReadOnly && (
                <button
                  onClick={openAddProjectModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Project
                </button>
              )}
            </div>

            <div className="space-y-4">
              {formData.projects.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No projects added yet.</p>
              ) : (
                formData.projects.map((project, index) => (
                  <div key={project.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{index + 1}. {project.name}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{project.contribution}</p>
                    </div>
                    {!isReadOnly && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditProjectModal(project)}
                          className="text-[#262760] hover:text-[#1e2050] p-1"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeProject(project.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Behaviour Based Section */}
        {enabledSections.knowledgeSharing && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Users className="h-6 w-6 mr-2 text-purple-600" />
                Knowledge Sharing Assessment
              </h2>
              {!isReadOnly && (
                <button
                  onClick={() => setShowBehaviourModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {Object.values(formData.behaviourBased).some(v => v !== 0 && v !== '') ? 'Edit Ratings' : 'Add Ratings'}
                </button>
              )}
            </div>

            <div className="bg-purple-50 rounded-lg p-5 border border-purple-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {masterAttributes.knowledgeSubItems.map((attr) => {
                  const isEnabled = enabledSections.knowledgeSubItems?.[attr.key];
                  const val = formData.behaviourBased?.[attr.key] || 0;
                  if (!isEnabled && val === 0) return null;
                  return (
                    <div key={attr.key} className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">{attr.label}:</span>
                      <RatingStars value={val} onChange={() => { }} readOnly={true} />
                    </div>
                  );
                })}
              </div>
              {formData.behaviourBased.comments && (
                <div className="mt-4 p-3 bg-white rounded border border-purple-100">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                  <p className="text-sm text-gray-700 italic">"{formData.behaviourBased.comments}"</p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Process Adherence Section */}
        {enabledSections.processAdherence && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 mr-2 text-orange-600" />
                Process Adherence
              </h2>
              {!isReadOnly && (
                <button
                  onClick={() => setShowProcessModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {Object.values(formData.processAdherence).some(v => v !== 0 && v !== '') ? 'Edit Ratings' : 'Add Ratings'}
                </button>
              )}
            </div>

            <div className="bg-orange-50 rounded-lg p-5 border border-orange-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {masterAttributes.processSubItems.map((attr) => {
                  const isEnabled = enabledSections.processSubItems?.[attr.key];
                  const val = formData.processAdherence?.[attr.key] || 0;
                  if (!isEnabled && val === 0) return null;
                  return (
                    <div key={attr.key} className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">{attr.label}:</span>
                      <RatingStars value={val} onChange={() => { }} readOnly={true} />
                    </div>
                  );
                })}
              </div>
              {formData.processAdherence.comments && (
                <div className="mt-4 p-3 bg-white rounded border border-orange-100">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                  <p className="text-sm text-gray-700 italic">"{formData.processAdherence.comments}"</p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Technical Based Section */}
        {enabledSections.technicalAssessment && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <Code className="h-6 w-6 mr-2 text-blue-600" />
                Technical Based Assessment
              </h2>
              {!isReadOnly && (
                <button
                  onClick={() => setShowTechnicalModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {Object.values(formData.technicalBased).some(v => v !== 0 && v !== '') ? 'Edit Ratings' : 'Add Ratings'}
                </button>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-5 border border-blue-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {masterAttributes.technicalSubItems.map((attr) => {
                  const isEnabled = enabledSections.technicalSubItems?.[attr.key];
                  const val = formData.technicalBased?.[attr.key] || 0;
                  if (!isEnabled && val === 0) return null;
                  return (
                    <div key={attr.key} className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">{attr.label}:</span>
                      <RatingStars value={val} onChange={() => { }} readOnly={true} />
                    </div>
                  );
                })}
              </div>
              {formData.technicalBased.comments && (
                <div className="mt-4 p-3 bg-white rounded border border-blue-100">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                  <p className="text-sm text-gray-700 italic">"{formData.technicalBased.comments}"</p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Growth Based Section */}
        {enabledSections.growthAssessment && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
                Growth Based Assessment
              </h2>
              {!isReadOnly && (
                <button
                  onClick={() => setShowGrowthModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {Object.values(formData.growthBased).some(v => v !== 0 && v !== '') ? 'Edit Ratings' : 'Add Ratings'}
                </button>
              )}
            </div>

            <div className="bg-green-50 rounded-lg p-5 border border-green-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {masterAttributes.growthSubItems.map((attr) => {
                  const isEnabled = enabledSections.growthSubItems?.[attr.key];
                  const val = formData.growthBased?.[attr.key] || 0;
                  if (!isEnabled && val === 0) return null;
                  return (
                    <div key={attr.key} className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">{attr.label}:</span>
                      <RatingStars value={val} onChange={() => { }} readOnly={true} />
                    </div>
                  );
                })}
              </div>
              {formData.growthBased.careerGoals && (
                <div className="mt-3">
                  <span className="font-medium text-gray-700">Career Goals:</span>
                  <p className="text-sm text-gray-700 mt-1">{formData.growthBased.careerGoals}</p>
                </div>
              )}
              {formData.growthBased.comments && (
                <div className="mt-3 p-3 bg-white rounded border border-green-100">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Appraisee Comments</p>
                  <p className="text-sm text-gray-700 italic">"{formData.growthBased.comments}"</p>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Overall Contribution Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Overall Contribution</h2>
            {!isReadOnly && (
              <button
                onClick={() => setShowContributionModal(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <FileText className="h-4 w-4 mr-2" />
                {formData.overallContribution ? 'Edit Contribution' : 'Add Contribution'}
              </button>
            )}
          </div>

          {formData.overallContribution ? (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{formData.overallContribution}</p>
            </div>
          ) : (
            <p className="text-gray-500 italic">No overall contribution summary added yet.</p>
          )}
        </div>

        {/* Action Buttons */}
        {!isReadOnly && (
          <div className="mt-8 flex justify-end space-x-3">
            <button
              onClick={() => handleSubmit('Save')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </button>
            <button
              onClick={() => handleSubmit('Submit')}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050]"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit
            </button>
          </div>
        )}
      </div>

      {/* Project Modal */}
      <Modal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        title={currentProject.id ? "Edit Project" : "Add Project"}
        icon={Award}
        colorTheme="blue"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
            <input
              type="text"
              value={currentProject.name}
              onChange={(e) => setCurrentProject({ ...currentProject, name: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Project Title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contribution</label>
            <textarea
              rows={4}
              value={currentProject.contribution}
              onChange={(e) => setCurrentProject({ ...currentProject, contribution: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Describe your contribution..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowProjectModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm"
              onClick={saveProject}
            >
              {currentProject.id ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Knowledge Sharing Modal */}
      <Modal
        isOpen={showBehaviourModal}
        onClose={() => setShowBehaviourModal(false)}
        title="Knowledge Sharing Assessment"
        icon={Users}
        colorTheme="purple"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">




          <div className="rounded-md bg-purple-50 border border-purple-100 p-3 text-xs text-gray-700">
            <span className="font-semibold">KPP Description: </span>
            This assessment covers knowledge sharing and leadership
            shown while working with team members and stakeholders.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {masterAttributes.knowledgeSubItems.map((attr) => {
              if (!enabledSections.knowledgeSubItems?.[attr.key]) return null;
              return (
                <div key={attr.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {attr.label}
                  </label>
                  <RatingStars
                    value={formData.behaviourBased?.[attr.key] || 0}
                    onChange={(val) => updateBehaviourRating(attr.key, val)}
                  />
                </div>
              );
            })}
          </div>
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Appraisee Comments *</label>
            <textarea
              rows={3}
              value={formData.behaviourBased.comments}
              onChange={(e) => updateBehaviourRating('comments', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Enter your comments about your knowledge sharing and behavioral performance..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowBehaviourModal(false)}
            >
              Close
            </button>
            <button
              type="button"
              disabled={!String(formData.behaviourBased?.comments || '').trim()}
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowBehaviourModal(false)}
            >
              Save & Close
            </button>
          </div>
        </div>
      </Modal>


      {/* Process Adherence Modal */}
      <Modal
        isOpen={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        title="Process Adherence"
        icon={BarChart3}
        colorTheme="orange"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          {masterAttributes.processSubItems.map((attr) => {
            const isEnabled = enabledSections.processSubItems?.[attr.key];
            if (!isEnabled) return null;

            const descriptions = {
              timesheet: 'Timely submission, accurate entries, daily discipline, correct project allocation, minimal missed timesheets.',
              reportStatus: 'Daily/weekly report timeliness, accuracy, clarity of progress, delay justification, report format compliance.',
              meeting: 'Attendance and punctuality, active participation, action item completion, MOM follow-up.'
            };

            return (
              <div key={attr.key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {attr.label}
                </label>
                {descriptions[attr.key] && (
                  <p className="text-xs text-gray-500 mb-1">{descriptions[attr.key]}</p>
                )}
                <RatingStars
                  value={formData.processAdherence?.[attr.key] || 0}
                  onChange={(value) => updateProcessRating(attr.key, value)}
                />
              </div>
            );
          })}
          <div className="rounded-md bg-orange-50 border border-orange-100 p-3 text-xs text-gray-700">
            <span className="font-semibold">KPP Description: </span>
            Overall adherence to company processes for timesheets, reporting and meeting discipline.
          </div>
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Appraisee Comments *</label>
            <textarea
              rows={3}
              value={formData.processAdherence?.comments || ''}
              onChange={(e) => updateProcessRating('comments', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Enter your comments about your process adherence..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowProcessModal(false)}
            >
              Close
            </button>
            <button
              type="button"
              disabled={!String(formData.processAdherence?.comments || '').trim()}
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowProcessModal(false)}
            >
              Save & Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Technical Based Modal */}
      <Modal
        isOpen={showTechnicalModal}
        onClose={() => setShowTechnicalModal(false)}
        title="Technical Based Assessment"
        icon={Code}
        colorTheme="blue"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          {masterAttributes.technicalSubItems.map((attr) => {
            if (!enabledSections.technicalSubItems?.[attr.key]) return null;
            return (
              <div key={attr.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{attr.label}</label>
                <RatingStars
                  value={formData.technicalBased?.[attr.key] || 0}
                  onChange={(value) => updateTechnicalRating(attr.key, value)}
                />
              </div>
            );
          })}
          <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-xs text-gray-700">
            <span className="font-semibold">KPP Description: </span>
            Technical attributes based on selected division (Software / SDS / Tekla).
          </div>
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Appraisee Comments *</label>
            <textarea
              rows={3}
              value={formData.technicalBased.comments}
              onChange={(e) => updateTechnicalRating('comments', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Enter your comments about your technical performance..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowTechnicalModal(false)}
            >
              Close
            </button>
            <button
              type="button"
              disabled={!String(formData.technicalBased?.comments || '').trim()}
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowTechnicalModal(false)}
            >
              Save & Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Growth Based Modal */}
      <Modal
        isOpen={showGrowthModal}
        onClose={() => setShowGrowthModal(false)}
        title="Growth Based Assessment"
        icon={TrendingUp}
        colorTheme="green"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          {masterAttributes.growthSubItems.map((attr) => {
            if (!enabledSections.growthSubItems?.[attr.key]) return null;
            return (
              <div key={attr.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{attr.label}</label>
                <RatingStars
                  value={formData.growthBased?.[attr.key] || 0}
                  onChange={(value) => updateGrowthRating(attr.key, value)}
                />
              </div>
            );
          })}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Career Goals & Aspirations</label>
            <textarea
              rows={2}
              value={formData.growthBased.careerGoals}
              onChange={(e) => updateGrowthRating('careerGoals', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Describe your career goals for the next 1-3 years..."
            />
          </div>
          <div className="rounded-md bg-green-50 border border-green-100 p-3 text-xs text-gray-700">
            <span className="font-semibold">KPP Description: </span>
            This assessment covers learning new technologies and pursuing relevant certifications for growth.
          </div>
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Appraisee Comments *</label>
            <textarea
              rows={2}
              value={formData.growthBased.comments}
              onChange={(e) => updateGrowthRating('comments', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Enter your comments about your growth and development..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowGrowthModal(false)}
            >
              Close
            </button>
            <button
              type="button"
              disabled={!String(formData.growthBased?.comments || '').trim()}
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowGrowthModal(false)}
            >
              Save & Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Overall Contribution Modal */}
      <Modal
        isOpen={showContributionModal}
        onClose={() => setShowContributionModal(false)}
        title="Overall Contribution"
        icon={FileText}
        colorTheme="purple"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Executive Summary</label>
            <textarea
              rows={8}
              value={formData.overallContribution}
              onChange={(e) => setFormData({ ...formData, overallContribution: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#262760] focus:ring-[#262760] sm:text-sm p-2 border"
              placeholder="Summarize your overall performance for the year. Include key achievements, challenges overcome, and value added to the organization..."
            />
          </div>
          <div className="mt-5 sm:mt-6 flex justify-end space-x-2">
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:text-sm"
              onClick={() => setShowContributionModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#262760] text-base font-medium text-white hover:bg-[#1e2050] focus:outline-none sm:text-sm"
              onClick={() => saveOverallContribution(formData.overallContribution)}
            >
              Save
            </button>
          </div>
        </div>
      </Modal>


      {/* Status Popup */}
      <StatusPopup
        isOpen={statusPopup.isOpen}
        onClose={() => setStatusPopup({ ...statusPopup, isOpen: false })}
        status={statusPopup.status}
        message={statusPopup.message}
      />
    </div>
  );
};

export default SelfAppraisal;
