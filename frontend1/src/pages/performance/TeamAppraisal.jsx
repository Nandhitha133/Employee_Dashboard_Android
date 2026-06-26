import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  Edit,
  Eye,
  Save,
  X,
  MessageSquare,
  CheckCircle,
  FileText,
  Star,
  TrendingUp,
  Clock,
  ChevronRight,
  DollarSign,
  User,
  Briefcase,
  Code,
  BarChart3,
  Award,
  Target,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Send
} from 'lucide-react';

// Dropdown Options
const APPRAISERS = ['BalaSubiramaniyam', 'Uvaraj', 'Arunkumar.P', 'Harisankar', 'arunkumar.D', 'gopinath'];
const REVIEWERS = ['Arunkumar.p'];
const DIRECTORS = ['Balasubiramaniyam', 'Uvaraj'];

// Users allowed to view Compensation details (normalized to lowercase for comparison)
const ALLOWED_COMPENSATION_VIEWERS = ['arunkumar.p', 'balasubiramaniyam', 'uvaraj'];

import { performanceAPI } from '../../services/api';

const TAB_ORDER = ['knowledge', 'process', 'technical', 'growth', 'projects', 'summary'];

const getPreviousFinancialYearLabel = () => {
  const now = new Date();
  const currentStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const prevStartYear = currentStartYear - 1;
  const prevEndYear = String(prevStartYear + 1).slice(2);
  return `${prevStartYear}-${prevEndYear}`;
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
const RatingComparisonRow = ({ label, selfValue, managerValue, onManagerChange, isEditable }) => (
  <div className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 last:border-0">
    <div className="col-span-4 text-sm font-medium text-gray-700">{label}</div>
    <div className="col-span-3">
      <div className="flex items-center">
        <span className="text-xs text-gray-500 mr-2 w-16">Self:</span>
        <RatingStars value={selfValue} readOnly={true} size="h-4 w-4" showValue={false} />
        <span className="ml-2 text-xs text-gray-600">{selfValue}/5</span>
      </div>
    </div>
    <div className="col-span-5">
      <div className="flex items-center">
        <span className="text-xs text-gray-500 mr-2 w-16">Manager:</span>
        <RatingStars
          value={managerValue}
          onChange={onManagerChange}
          readOnly={!isEditable}
          size="h-4 w-4"
          showValue={false}
        />
        {isEditable && (
          <span className="ml-2 text-xs text-gray-500">
            {managerValue ? `${managerValue}/5` : 'Not rated'}
          </span>
        )}
      </div>
    </div>
  </div>
);

// Comment Comparison Card Component
const CommentComparisonCard = ({
  title,
  selfComment,
  managerComment,
  onManagerCommentChange,
  isEditable,
  icon: Icon,
  color = "blue"
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: 'text-blue-600'
    },
    purple: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      text: 'text-purple-700',
      icon: 'text-purple-600'
    },
    green: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      icon: 'text-green-600'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      icon: 'text-orange-600'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className={`${colors.bg} rounded-lg border ${colors.border} overflow-hidden`}>
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center">
        {Icon && <Icon className={`h-5 w-5 mr-2 ${colors.icon}`} />}
        <h4 className="font-semibold text-gray-800">{title}</h4>
      </div>

      <div className="p-4 space-y-4">
        {/* Self Comment */}
        <div>
          <div className="flex items-center mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Self Assessment</span>
            <span className="ml-2 px-2 py-0.5 bg-white text-xs rounded-full border border-gray-200">Employee</span>
          </div>
          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
            <p className="text-sm text-gray-800 italic leading-relaxed">
              "{selfComment || 'No comments provided'}"
            </p>
          </div>
        </div>

        {/* Manager Comment */}
        <div>
          <div className="flex items-center mb-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Manager Assessment</span>
            <span className="ml-2 px-2 py-0.5 bg-[#262760] text-white text-xs rounded-full">You</span>
          </div>
          {isEditable ? (
            <textarea
              value={managerComment || ''}
              onChange={(e) => onManagerCommentChange(e.target.value)}
              rows={4}
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:ring-[#262760] focus:border-[#262760] text-sm p-3"
              placeholder={`Enter your feedback for ${title.toLowerCase()}...`}
            />
          ) : (
            <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-800 italic leading-relaxed">
                {managerComment ? `"${managerComment}"` : 'No manager comments yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Section Header Component
const SectionHeader = ({ icon: Icon, title, color = "blue", children }) => {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-700',
    purple: 'from-purple-600 to-purple-700',
    green: 'from-green-600 to-green-700',
    orange: 'from-orange-600 to-orange-700',
    indigo: 'from-[#262760] to-[#1e2050]'
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center">
        <div className={`bg-gradient-to-r ${colorClasses[color]} p-2 rounded-lg shadow-sm mr-3`}>
          {Icon && <Icon className="h-5 w-5 text-white" />}
        </div>
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
};

// Main Component
const TeamAppraisal = () => {
  // Get current user from session
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const currentUser = user.name || '';
  const openFy = getPreviousFinancialYearLabel();

  // Helper to check if current user has access
  const hasCompensationAccess = ALLOWED_COMPENSATION_VIEWERS.includes(currentUser.toLowerCase());

  // State for employees list
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  // State for modal
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [financialYearFilter, setFinancialYearFilter] = useState(openFy);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [activeTab, setActiveTab] = useState('knowledge'); // knowledge, process, technical, growth, summary

  // Appraiser Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewEmployee, setReviewEmployee] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: '',
    behaviouralRatings: {
      knowledgeSharing: 0,
      teamWork: 0,
      communication: 0,
      ownership: 0
    },
    comments: '',
    strengths: '',
    areasOfImprovement: ''
  });

  // Attribute Configuration State
  const [enabledSections, setEnabledSections] = useState({
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
    const fetchAttributes = async () => {
      if (!selectedEmployee?.designation) return;
      try {
        const response = await performanceAPI.getAttributes(selectedEmployee.designation);
        if (response.data && response.data.sections) {
          setEnabledSections({
            knowledgeSharing: response.data.sections.knowledgeSharing ?? true,
            knowledgeSubItems: response.data.sections?.knowledgeSubItems || {},
            processAdherence: response.data.sections.processAdherence ?? true,
            processSubItems: response.data.sections?.processSubItems || {},
            technicalAssessment: response.data.sections.technicalAssessment ?? true,
            technicalSubItems: response.data.sections?.technicalSubItems || {},
            growthAssessment: response.data.sections.growthAssessment ?? true,
            growthSubItems: response.data.sections?.growthSubItems || {}
          });
        }
      } catch (error) {
        console.error("Error fetching attributes", error);
      }
    };
    fetchAttributes();
  }, [selectedEmployee?.designation]);

  const getStatusLabel = (status) => {
    switch (status) {
      case 'submitted': return 'Pending Review';
      case 'managerInProgress': return 'Under Review';
      case 'reviewerPending': return 'Submitted to Reviewer';
      case 'reviewerInProgress': return 'Reviewer Working';
      case 'reviewerApproved': return 'Ready for Director';
      case 'directorInProgress': return 'Under Director Review';
      case 'directorPushedBack': return 'Returned for Correction';
      case 'directorApproved': return 'Approved';
      case 'released': return 'Completed';
      case 'accepted_pending_effect':
      case 'effective': return 'Completed';
      default: return status;
    }
  };

  // Effect to fetch employees
  useEffect(() => {
    fetchTeamAppraisals();
  }, []);

  const fetchTeamAppraisals = async () => {
    try {
      setLoading(true);
      const response = await performanceAPI.getTeamAppraisals();
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Failed to fetch team appraisals", error);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const getEnabledItems = (sectionKey) => {
    const enabledMap = enabledSections?.[sectionKey] || {};
    const masterList = masterAttributes?.[sectionKey] || [];
    return masterList.filter(attr => enabledMap[attr.key]);
  };

  const getAttributeLabel = (section, key) => {
    const list = masterAttributes[section] || [];
    const item = list.find(it => it.key === key);
    return item ? item.label : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  // Handlers
  const handleView = (emp) => {
    setSelectedEmployee(emp);
  };

  const handleEdit = (emp) => {
    setSelectedEmployee(emp);
    setActiveTab('knowledge');

  };

  const isEditable = selectedEmployee && ['submitted', 'managerInProgress'].includes(selectedEmployee.status);

  const handleInputChange = (id, field, value) => {
    // Update local state for immediate feedback
    setSelectedEmployee(prev => ({ ...prev, [field]: value }));

    // Also update the list view
    setEmployees(prev => prev.map(emp =>
      emp.id === id ? { ...emp, [field]: value } : emp
    ));

  };

  const handleManagerRatingChange = (category, field, value) => {
    const capitalizedField = field.charAt(0).toUpperCase() + field.slice(1);
    const hardcodedKey = `${category}${capitalizedField}Manager`;
    const mapKey = `${category}ManagerRatings`;

    setSelectedEmployee(prev => {
      const updatedRatings = { ...(prev[mapKey] || {}) };
      updatedRatings[field] = value;
      return {
        ...prev,
        [hardcodedKey]: value,
        [mapKey]: updatedRatings
      };
    });

    setEmployees(prev => prev.map(emp =>
      emp.id === selectedEmployee.id ? {
        ...emp,
        [hardcodedKey]: value,
        [mapKey]: { ...(emp[mapKey] || {}), [field]: value }
      } : emp
    ));
  };

  const handleManagerCommentChange = (category, value) => {
    setSelectedEmployee(prev => ({
      ...prev,
      [`${category}ManagerComments`]: value
    }));

    setEmployees(prev => prev.map(emp =>
      emp.id === selectedEmployee.id ? {
        ...emp,
        [`${category}ManagerComments`]: value
      } : emp
    ));
  };

  const updateIncrementState = (id, percentage) => {
    setSelectedEmployee(prev => {
      const currentSalary = Number(prev?.currentSalary || 0);
      const correctionPct = Number(prev?.incrementCorrectionPercentage || 0);
      const pct = Number(percentage || 0);
      const totalPct = pct + correctionPct;
      const incrementAmount =
        currentSalary > 0 && totalPct !== 0 ? Math.round((currentSalary * totalPct) / 100) : Number(prev?.incrementAmount || 0);
      const revisedSalary =
        currentSalary > 0 ? Math.round(currentSalary + incrementAmount) : Number(prev?.revisedSalary || 0);

      return { ...prev, incrementPercentage: pct, incrementAmount, revisedSalary };
    });

    setEmployees(prev => prev.map(emp => {
      if (emp.id !== id) return emp;
      const currentSalary = Number(emp?.currentSalary || 0);
      const correctionPct = Number(emp?.incrementCorrectionPercentage || 0);
      const pct = Number(percentage || 0);
      const totalPct = pct + correctionPct;
      const incrementAmount =
        currentSalary > 0 && totalPct !== 0 ? Math.round((currentSalary * totalPct) / 100) : Number(emp?.incrementAmount || 0);
      const revisedSalary =
        currentSalary > 0 ? Math.round(currentSalary + incrementAmount) : Number(emp?.revisedSalary || 0);

      return { ...emp, incrementPercentage: pct, incrementAmount, revisedSalary };
    }));
  };

  const handleSave = async () => {
    try {
      await performanceAPI.updateTeamAppraisal(selectedEmployee.id, selectedEmployee);
      setNotification({ type: 'success', message: 'Review saved successfully!' });
      fetchTeamAppraisals();
    } catch (error) {
      console.error("Failed to save review", error);
      setNotification({ type: 'error', message: 'Failed to save review' });
    }
  };

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const handleSubmit = () => {
    setShowSubmitConfirm(true);
  };

  const performSubmitReview = async () => {
    if (!selectedEmployee) return;
    try {
      setSubmitLoading(true);
      // Auto-save the latest changes before final submission to ensure backend validation passes
      await performanceAPI.updateTeamAppraisal(selectedEmployee.id, selectedEmployee);
      
      await performanceAPI.submitToReviewer(selectedEmployee.id);
      setNotification({ type: 'success', message: 'Review successfully submitted to Reviewer!' });
      setSelectedEmployee(null);
      setShowSubmitConfirm(false);
      fetchTeamAppraisals();
    } catch (error) {
      console.error("Failed to submit review", error);
      const msg = error.response?.data?.message || 'Failed to submit review';
      setNotification({ type: 'error', message: msg });
    } finally {
      setSubmitLoading(false);
      setShowSubmitConfirm(false);
    }
  };

  const handleSendBack = async () => {
    if (!selectedEmployee) return;
    const reason = window.prompt("Enter reason for sending back to employee:");
    if (!reason) return;
    try {
      await performanceAPI.sendBackToEmployee(selectedEmployee.id, { 
        reason,
        status: 'submitted',
        isReturnedToEmployee: true
      });
      setNotification({ type: 'success', message: 'Appraisal sent back to employee.' });
      setSelectedEmployee(null);
      fetchTeamAppraisals();
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to send back.' });
    }
  };

  const handleOpenReviewModal = (emp) => {
    setSelectedEmployee(emp);
    setActiveTab('knowledge');
  };

  const handleSaveReview = async (submitReview = false) => {
    if (submitReview && (!reviewData.rating || !reviewData.comments)) {
      setNotification({ type: 'error', message: 'Performance Rating and Comments are mandatory for submission.' });
      return;
    }

    try {
      setSubmitLoading(true);
      await performanceAPI.saveManagerReview(reviewEmployee.id, { ...reviewData, submitReview });
      setNotification({ 
        type: 'success', 
        message: submitReview ? 'Review submitted successfully!' : 'Review saved as draft!' 
      });
      setIsReviewModalOpen(false);
      fetchTeamAppraisals();
    } catch (error) {
      console.error("Failed to save review", error);
      setNotification({ type: 'error', message: 'Failed to save review' });
    } finally {
      setSubmitLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'managerInProgress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'reviewerPending': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'reviewerInProgress': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'reviewerApproved': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'directorPushedBack': return 'bg-red-100 text-red-800 border-red-200';
      case 'directorApproved': return 'bg-green-100 text-green-800 border-green-200';
      case 'released': return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'accepted_pending_effect':
      case 'effective': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatEmployeeMetaLine = (emp) => {
    const parts = [emp?.department, emp?.empId].filter(Boolean);
    return parts.length ? parts.join(' • ') : '-';
  };

  // Filter Logic
  const getDivisionValue = (emp) => String(emp?.division || '').trim();
  const getLocationValue = (emp) => String(emp?.location || emp?.branch || '').trim();

  const uniqueDivisions = [...new Set(employees.map(getDivisionValue).filter(Boolean))].sort();
  const uniqueLocations = [...new Set(employees.map(getLocationValue).filter(Boolean))].sort();
  const uniqueYears = useMemo(() => {
    const years = [...new Set(employees.map(e => e.financialYr).filter(Boolean)), openFy].filter(Boolean);
    return years.length ? years.sort() : [openFy];
  }, [employees, openFy]);

  useEffect(() => {
    if (!uniqueYears.length) return;
    if (!financialYearFilter || !uniqueYears.includes(financialYearFilter)) {
      setFinancialYearFilter(uniqueYears[0]);
    }
  }, [uniqueYears, financialYearFilter]);

  const filteredEmployees = employees.filter(emp => {
    // Stage Filter: SHOW ALL for tracking
    const isVisible = true;
    if (!isVisible) return false;

    const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.empId?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDivision = !divisionFilter || getDivisionValue(emp) === divisionFilter;
    const matchesLocation = !locationFilter || getLocationValue(emp) === locationFilter;
    const matchesYear = !financialYearFilter || emp.financialYr === financialYearFilter;
    return matchesSearch && matchesDivision && matchesLocation && matchesYear;
  });

  // Get technical fields based on division
  const getTechnicalFields = (division) => {
    const div = division || 'Software';
    if (div === 'SDS') {
      return [
        { key: 'codingSkills', label: 'Structural Drawing Accuracy' },
        { key: 'testing', label: 'Steel Connection Knowledge' },
        { key: 'debugging', label: 'Bolt & Weld Detailing Accuracy' },
        { key: 'sds', label: 'GA / Shop / Erection Drawing Quality' },
        { key: 'tekla', label: 'Drawing Revision & Error Reduction' }
      ];
    }
    if (div === 'Tekla') {
      return [
        { key: 'codingSkills', label: '3D Modeling Accuracy' },
        { key: 'testing', label: 'Clash Detection Handling' },
        { key: 'debugging', label: 'Model Integrity & Cleanliness' },
        { key: 'sds', label: 'Complex Connection Modeling' },
        { key: 'tekla', label: 'Anchor Bolt Layout & Output' }
      ];
    }
    return [
      { key: 'codingSkills', label: 'Code Quality' },
      { key: 'testing', label: 'System Architecture Understanding' },
      { key: 'debugging', label: 'Debugging & Issue Resolution' },
      { key: 'sds', label: 'API Integration Skills' },
      { key: 'tekla', label: 'Testing & Validation' }
    ];
  };

  const goToNextTab = () => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (currentIndex === -1) return;
    if (currentIndex < TAB_ORDER.length - 1) {
      setActiveTab(TAB_ORDER[currentIndex + 1]);
    }
  };

  const canSubmitReview = isEditable && activeTab === 'summary' && !!(
    selectedEmployee &&
    selectedEmployee.appraiserRating &&
    selectedEmployee.leadership &&
    selectedEmployee.attitude &&
    selectedEmployee.communication
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-8 font-sans p-8">
      <div className="w-full">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">

            {/* Financial Year Filter */}
            <select
              value={financialYearFilter}
              onChange={(e) => setFinancialYearFilter(e.target.value)}
              className="border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] py-2 px-3"
            >
              {uniqueYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
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

            {/* Division Filter */}
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] py-2 px-3"
            >
              <option value="">All Divisions</option>
              {uniqueDivisions.map(div => (
                <option key={div} value={div}>{div}</option>
              ))}
            </select>

            {/* Location Filter */}
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#262760] py-2 px-3"
            >
              <option value="">All Locations</option>
              {uniqueLocations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>


          </div>
        </div>

        <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading team appraisals...</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#262760] sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">S.No</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Financial Yr</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Employee Name</th>
                  {hasCompensationAccess && (
                    <>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Current Salary</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Increment %</th>
                      <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Increment Correction %</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Increment Amount</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Revised Salary</th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Performance Pay</th>
                    </>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Self Appraisee Comments</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Manager Comments</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEmployees.map((emp, index) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.financialYr}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{emp.empId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span>{emp.name}</span>
                        {emp.employeeStatus && emp.employeeStatus !== 'Active' && (
                          <span className={`text-[10px] font-bold uppercase mt-0.5 ${emp.employeeStatus === 'Exited' ? 'text-red-500' : 'text-orange-500'}`}>
                            {emp.employeeStatus}
                          </span>
                        )}
                      </div>
                    </td>
                    {hasCompensationAccess && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {Number(emp.currentSalary || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          {Number(emp.incrementPercentage || 0)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                          {Number(emp.incrementCorrectionPercentage || 0)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {Number(emp.incrementAmount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                          {Number(emp.revisedSalary || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {Number(emp.performancePay || 0).toLocaleString('en-IN')}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {emp.selfAppraiseeComments || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {emp.managerComments || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(emp.status)}`}>
                        {getStatusLabel(emp.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex justify-center items-center space-x-2">
                        {!['submitted', 'managerInProgress', 'directorPushedBack'].includes(emp.status) && (
                          <button
                            onClick={() => handleOpenReviewModal(emp)}
                            className="flex items-center space-x-1 bg-white text-gray-700 px-3 py-1.5 rounded text-xs hover:bg-gray-50 transition-all shadow-sm border border-gray-200"
                          >
                            <Eye className="h-3.5 w-3.5 text-gray-500" />
                            <span>View</span>
                          </button>
                        )}
                        {['submitted', 'managerInProgress', 'directorPushedBack'].includes(emp.status) && (
                          <button
                            disabled={emp.employeeStatus !== 'Active'}
                            onClick={() => handleOpenReviewModal(emp)}
                            className={`flex items-center space-x-1 px-3 py-1.5 rounded text-xs transition-all shadow-sm ${
                              emp.employeeStatus === 'Active' 
                                ? 'bg-[#262760] text-white hover:bg-[#1e2050]' 
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                            }`}
                            title={emp.employeeStatus !== 'Active' ? 'Cannot review inactive or exited employee' : ''}
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span>{['managerInProgress', 'directorPushedBack'].includes(emp.status) ? 'Edit Review' : 'Add Rating / Review'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-50 backdrop-blur-sm" onClick={() => setSelectedEmployee(null)}></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block w-full max-w-7xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-xl">
              <div className="flex flex-col max-h-[90vh] overflow-y-auto">

                {/* Modal Header */}
                <div className="px-6 py-6 bg-gradient-to-r from-[#262760] to-indigo-800 text-white sticky top-0 z-20">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white font-bold text-2xl mr-4 border-2 border-white/30">
                        {selectedEmployee.name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold">{selectedEmployee.name}</h2>
                        <div className="flex items-center text-indigo-100 text-sm mt-1 flex-wrap gap-2">
                          <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{selectedEmployee.designation}</span>
                          <span>{formatEmployeeMetaLine(selectedEmployee)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(selectedEmployee.status)}`}>
                            {selectedEmployee.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedEmployee(null)}
                      className="bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors focus:outline-none"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="border-b border-gray-200 bg-white px-6 sticky top-0 z-10">
                  <nav className="flex space-x-6 overflow-x-auto">
                    <button
                      onClick={() => setActiveTab('knowledge')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'knowledge'
                        ? 'border-[#262760] text-[#262760]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Users className="h-4 w-4 inline mr-2" />
                      Knowledge Sharing
                    </button>
                    <button
                      onClick={() => setActiveTab('process')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'process'
                        ? 'border-[#262760] text-[#262760]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <BarChart3 className="h-4 w-4 inline mr-2" />
                      Process Adherence
                    </button>
                    <button
                      onClick={() => setActiveTab('technical')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'technical'
                        ? 'border-[#262760] text-[#262760]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Code className="h-4 w-4 inline mr-2" />
                      Technical Assessment
                    </button>
                    <button
                      onClick={() => setActiveTab('growth')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'growth'
                        ? 'border-[#262760] text-[#262760]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <TrendingUp className="h-4 w-4 inline mr-2" />
                      Growth Assessment
                    </button>
                    <button
                      onClick={() => setActiveTab('projects')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'projects'
                        ? 'border-[#262760] text-[#262760]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Briefcase className="h-4 w-4 inline mr-2" />
                      Key Projects
                    </button>
                    <button
                      onClick={() => setActiveTab('summary')}
                      className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'summary'
                        ? 'border-[#262760] text-[#262760]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Award className="h-4 w-4 inline mr-2" />
                      Summary & Rating
                    </button>
                  </nav>
                </div>

                {/* Modal Content */}
                <div className="flex-1 px-6 py-6 space-y-6 bg-gray-50">

                  {/* Knowledge Sharing Tab */}
                  {activeTab === 'knowledge' && (
                    <div className="space-y-6">
                      <SectionHeader icon={Users} title="Knowledge Sharing Assessment" color="purple">
                        {isEditable && (
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">Editable</span>
                        )}
                      </SectionHeader>

                      {/* Ratings Comparison */}
                      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                          <Star className="h-4 w-4 mr-2 text-yellow-500" />
                          Ratings Comparison
                        </h4>

                        <div className="space-y-2">
                          {getEnabledItems('knowledgeSubItems').map(({ key }) => {
                            const capitalizedField = key.charAt(0).toUpperCase() + key.slice(1);
                            const hardcodedKey = `behaviour${capitalizedField}Manager`;
                            const managerVal = selectedEmployee.behaviourManagerRatings?.[key] || selectedEmployee[hardcodedKey] || 0;

                            return (
                              <RatingComparisonRow
                                key={key}
                                label={getAttributeLabel('knowledgeSubItems', key)}
                                selfValue={selectedEmployee.behaviourBased?.[key] || 0}
                                managerValue={managerVal}
                                onManagerChange={(val) => handleManagerRatingChange('behaviour', key, val)}
                                isEditable={isEditable}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Comments */}
                      <CommentComparisonCard
                        title="Knowledge Sharing Comments"
                        selfComment={selectedEmployee.behaviourBased?.comments}
                        managerComment={selectedEmployee.behaviourManagerComments}
                        onManagerCommentChange={(val) => handleManagerCommentChange('behaviour', val)}
                        isEditable={isEditable}
                        icon={MessageSquare}
                        color="purple"
                      />
                    </div>
                  )}

                  {/* Process Adherence Tab */}
                  {activeTab === 'process' && (
                    <div className="space-y-6">
                      <SectionHeader icon={BarChart3} title="Process Adherence Assessment" color="orange">
                        {isEditable && (
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">Editable</span>
                        )}
                      </SectionHeader>

                      {/* Ratings Comparison */}
                      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                          <Star className="h-4 w-4 mr-2 text-yellow-500" />
                          Ratings Comparison
                        </h4>


                        <div className="space-y-2">
                          {getEnabledItems('processSubItems').map(({ key }) => {
                            const capitalizedField = key.charAt(0).toUpperCase() + key.slice(1);
                            const hardcodedKey = `process${capitalizedField}Manager`;
                            const managerVal = selectedEmployee.processManagerRatings?.[key] || selectedEmployee[hardcodedKey] || 0;

                            return (
                              <RatingComparisonRow
                                key={key}
                                label={getAttributeLabel('processSubItems', key)}
                                selfValue={selectedEmployee.processAdherence?.[key] || 0}
                                managerValue={managerVal}
                                onManagerChange={(val) => handleManagerRatingChange('process', key, val)}
                                isEditable={isEditable}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Comments */}
                      <CommentComparisonCard
                        title="Process Adherence Comments"
                        selfComment={selectedEmployee.processAdherence?.comments}
                        managerComment={selectedEmployee.processManagerComments}
                        onManagerCommentChange={(val) => handleManagerCommentChange('process', val)}
                        isEditable={isEditable}
                        icon={MessageSquare}
                        color="orange"
                      />
                    </div>
                  )}

                  {/* Technical Assessment Tab */}
                  {activeTab === 'technical' && (
                    <div className="space-y-6">
                      <SectionHeader icon={Code} title="Technical Assessment" color="blue">
                        {isEditable && (
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">Editable</span>
                        )}
                      </SectionHeader>

                      {/* Ratings Comparison */}
                      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                          <Star className="h-4 w-4 mr-2 text-yellow-500" />
                          Ratings Comparison
                        </h4>

                        <div className="space-y-2">
                          {getEnabledItems('technicalSubItems').map(({ key }) => {
                            const capitalizedField = key.charAt(0).toUpperCase() + key.slice(1);
                            const hardcodedKey = `technical${capitalizedField}Manager`;
                            const managerVal = selectedEmployee.technicalManagerRatings?.[key] || selectedEmployee[hardcodedKey] || 0;

                            return (
                              <RatingComparisonRow
                                key={key}
                                label={getAttributeLabel('technicalSubItems', key)}
                                selfValue={selectedEmployee.technicalBased?.[key] || 0}
                                managerValue={managerVal}
                                onManagerChange={(val) => handleManagerRatingChange('technical', key, val)}
                                isEditable={isEditable}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* Comments */}
                      <CommentComparisonCard
                        title="Technical Assessment Comments"
                        selfComment={selectedEmployee.technicalBased?.comments}
                        managerComment={selectedEmployee.technicalManagerComments}
                        onManagerCommentChange={(val) => handleManagerCommentChange('technical', val)}
                        isEditable={isEditable}
                        icon={MessageSquare}
                        color="blue"
                      />
                    </div>
                  )}

                  {/* Growth Assessment Tab */}
                  {activeTab === 'growth' && (
                    <div className="space-y-6">
                      <SectionHeader icon={TrendingUp} title="Growth Assessment" color="green">
                        {isEditable && (
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">Editable</span>
                        )}
                      </SectionHeader>

                      {/* Ratings Comparison */}
                      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
                          <Star className="h-4 w-4 mr-2 text-yellow-500" />
                          Ratings Comparison
                        </h4>


                        <div className="space-y-2">
                          {getEnabledItems('growthSubItems').map(({ key }) => {
                            const capitalizedField = key.charAt(0).toUpperCase() + key.slice(1);
                            const hardcodedKey = `growth${capitalizedField}Manager`;
                            const managerVal = selectedEmployee.growthManagerRatings?.[key] || selectedEmployee[hardcodedKey] || 0;

                            return (
                              <RatingComparisonRow
                                key={key}
                                label={getAttributeLabel('growthSubItems', key)}
                                selfValue={selectedEmployee.growthBased?.[key] || 0}
                                managerValue={managerVal}
                                onManagerChange={(val) => handleManagerRatingChange('growth', key, val)}
                                isEditable={isEditable}
                              />
                            );
                          })}
                        </div>

                        {/* Career Goals */}
                        {selectedEmployee.growthBased?.careerGoals && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h5 className="text-sm font-semibold text-gray-700 mb-2">Career Goals</h5>
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-700">{selectedEmployee.growthBased.careerGoals}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Comments */}
                      <CommentComparisonCard
                        title="Growth Assessment Comments"
                        selfComment={selectedEmployee.growthBased?.comments}
                        managerComment={selectedEmployee.growthManagerComments}
                        onManagerCommentChange={(val) => handleManagerCommentChange('growth', val)}
                        isEditable={isEditable}
                        icon={MessageSquare}
                        color="green"
                      />
                    </div>
                  )}

                  {/* Key Projects Tab */}
                  {activeTab === 'projects' && (
                    <div className="space-y-6">
                      <SectionHeader icon={Briefcase} title="Key Projects" color="blue">
                        <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">View Only</span>
                      </SectionHeader>

                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        {selectedEmployee.projects && selectedEmployee.projects.length > 0 ? (
                          <div className="divide-y divide-gray-200">
                            {selectedEmployee.projects.map((project, index) => (
                              <div key={index} className="p-6 hover:bg-gray-50 transition-colors">
                                <h4 className="font-bold text-[#262760] text-lg mb-3 flex items-center">
                                  <span className="bg-blue-100 text-blue-800 text-xs font-medium mr-2 px-2.5 py-0.5 rounded border border-blue-200">
                                    Project {index + 1}
                                  </span>
                                  {project.name}
                                </h4>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                  <p className="text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">{project.contribution}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-12 text-center">
                            <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No projects recorded</h3>
                            <p className="mt-1 text-sm text-gray-500">The employee has not added any key projects for this appraisal period.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Summary & Rating Tab */}
                  {activeTab === 'summary' && (
                    <div className="space-y-6">
                      <SectionHeader icon={Award} title="Overall Summary & Rating" color="indigo">
                        {isEditable && (
                          <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">Editable</span>
                        )}
                      </SectionHeader>

                      {/* Overall Contribution */}
                      {selectedEmployee.overallContribution && (
                        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Self Overall Contribution</h4>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-sm text-gray-700 leading-relaxed">{selectedEmployee.overallContribution}</p>
                          </div>
                        </div>
                      )}

                      {/* Manager Rating Section */}
                      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4">Manager Review</h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Performance Rating</label>
                            <select
                              value={selectedEmployee.appraiserRating}
                              onChange={(e) => handleInputChange(selectedEmployee.id, 'appraiserRating', e.target.value)}
                              disabled={!isEditable}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] text-sm p-2.5 bg-white border disabled:bg-gray-100"
                            >
                              <option value="">Select Rating...</option>
                              <option value="ES">Exceeds Expectations (ES)</option>
                              <option value="ME">Meets Expectations (ME)</option>
                              <option value="BE">Below Expectations (BE)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Leadership Potential</label>
                            <select
                              value={selectedEmployee.leadership || ''}
                              onChange={(e) => handleInputChange(selectedEmployee.id, 'leadership', e.target.value)}
                              disabled={!isEditable}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] text-sm p-2.5 bg-white border disabled:bg-gray-100"
                            >
                              <option value="">Select Leadership...</option>
                              <option value="Ready to Lead">Ready to Lead</option>
                              <option value="Under Development">Under Development</option>
                              <option value="Not yet reach the level">Not yet reach the level</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Attitude</label>
                            <select
                              value={selectedEmployee.attitude || ''}
                              onChange={(e) => handleInputChange(selectedEmployee.id, 'attitude', e.target.value)}
                              disabled={!isEditable}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] text-sm p-2.5 bg-white border disabled:bg-gray-100"
                            >
                              <option value="">Select Attitude...</option>
                              <option value="Excellent">Excellent</option>
                              <option value="Average">Average</option>
                              <option value="Poor">Poor</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Communication</label>
                            <select
                              value={selectedEmployee.communication || ''}
                              onChange={(e) => handleInputChange(selectedEmployee.id, 'communication', e.target.value)}
                              disabled={!isEditable}
                              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] text-sm p-2.5 bg-white border disabled:bg-gray-100"
                            >
                              <option value="">Select Communication...</option>
                              <option value="Excellent">Excellent</option>
                              <option value="Average">Average</option>
                              <option value="Poor">Poor</option>
                            </select>
                          </div>
                        </div>

                        {hasCompensationAccess && (
                          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6">
                            <div className="flex items-center mb-3">
                              <DollarSign className="h-5 w-5 text-indigo-600 mr-2" />
                              <h5 className="text-sm font-bold text-indigo-900">TAT Details</h5>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="bg-white rounded-md border border-indigo-100 p-3">
                                <div className="text-xs font-semibold text-gray-600">Current Salary</div>
                                <div className="text-sm font-bold text-gray-900">{Number(selectedEmployee.currentSalary || 0).toLocaleString('en-IN')}</div>
                              </div>
                              <div className="bg-white rounded-md border border-indigo-100 p-3">
                                <div className="text-xs font-semibold text-gray-600">Increment %</div>
                                {isEditable ? (
                                  <input 
                                    type="number"
                                    value={selectedEmployee.incrementPercentage || 0}
                                    onChange={(e) => handleInputChange(selectedEmployee.id, 'incrementPercentage', e.target.value)}
                                    className="w-full text-sm font-bold text-gray-900 border-0 p-0 focus:ring-0 appearance-none bg-transparent"
                                  />
                                ) : (
                                  <div className="text-sm font-bold text-gray-900">{Number(selectedEmployee.incrementPercentage || 0)}%</div>
                                )}
                              </div>
                              <div className="bg-white rounded-md border border-indigo-100 p-3">
                                <div className="text-xs font-semibold text-gray-600">Increment Correction %</div>
                                {isEditable ? (
                                  <input 
                                    type="number"
                                    value={selectedEmployee.incrementCorrectionPercentage || 0}
                                    onChange={(e) => handleInputChange(selectedEmployee.id, 'incrementCorrectionPercentage', e.target.value)}
                                    className="w-full text-sm font-bold text-gray-900 border-0 p-0 focus:ring-0 appearance-none bg-transparent"
                                  />
                                ) : (
                                  <div className="text-sm font-bold text-gray-900">{Number(selectedEmployee.incrementCorrectionPercentage || 0)}%</div>
                                )}
                              </div>
                              <div className="bg-white rounded-md border border-indigo-100 p-3">
                                <div className="text-xs font-semibold text-gray-600">Increment Amount</div>
                                <div className="text-sm font-bold text-gray-900">{Number(selectedEmployee.incrementAmount || 0).toLocaleString('en-IN')}</div>
                              </div>
                              <div className="bg-white rounded-md border border-indigo-100 p-3">
                                <div className="text-xs font-semibold text-gray-600">Revised Salary</div>
                                {isEditable ? (
                                  <input 
                                    type="number"
                                    value={selectedEmployee.revisedSalary || 0}
                                    onChange={(e) => handleInputChange(selectedEmployee.id, 'revisedSalary', e.target.value)}
                                    className="w-full text-sm font-bold text-gray-900 border-0 p-0 focus:ring-0 appearance-none bg-transparent"
                                  />
                                ) : (
                                  <div className="text-sm font-bold text-gray-900">{Number(selectedEmployee.revisedSalary || 0).toLocaleString('en-IN')}</div>
                                )}
                              </div>
                              <div className="bg-white rounded-md border border-indigo-100 p-3">
                                <div className="text-xs font-semibold text-gray-600">Performance Pay</div>
                                {isEditable ? (
                                  <input 
                                    type="number"
                                    value={selectedEmployee.performancePay || 0}
                                    onChange={(e) => handleInputChange(selectedEmployee.id, 'performancePay', e.target.value)}
                                    className="w-full text-sm font-bold text-gray-900 border-0 p-0 focus:ring-0 appearance-none bg-transparent"
                                  />
                                ) : (
                                  <div className="text-sm font-bold text-gray-900">{Number(selectedEmployee.performancePay || 0).toLocaleString('en-IN')}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Final Manager Comments */}
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center">
                            <MessageSquare className="h-4 w-4 mr-2 text-[#262760]" />
                            Final Manager Comments
                          </label>
                          <textarea
                            value={selectedEmployee.managerComments || ''}
                            onChange={(e) => handleInputChange(selectedEmployee.id, 'managerComments', e.target.value)}
                            rows={4}
                            disabled={!isEditable}
                            className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-[#262760] focus:border-[#262760] text-sm p-3 disabled:bg-gray-100"
                            placeholder="Enter your final feedback and comments..."
                          />
                        </div>

                        {/* Director Push Back Reason */}
                        {selectedEmployee.status === 'directorPushedBack' && selectedEmployee.pushBack?.reason && (
                          <div className="mt-6 bg-[#fff4e5] border-l-4 border-[#ff9800] p-[10px] rounded-[6px] shadow-sm">
                            <div className="flex items-center text-[#663c00] font-bold text-xs uppercase tracking-widest mb-2">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              Director Comment
                            </div>
                            <p className="text-sm text-[#663c00] italic leading-relaxed">
                              {selectedEmployee.pushBack.reason}
                            </p>
                          </div>
                        )}
                      </div>


                    </div>
                  )}
                </div>

                <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between sticky bottom-0">
                  <div className="text-xs text-gray-500 font-medium italic">
                    {isEditable ? "Editing Phase 1: Provide ratings and comments. Financials will be finalized in Phase 2." : "View Only Mode"}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setSelectedEmployee(null)}
                      className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm text-sm font-bold hover:bg-gray-50 focus:outline-none"
                    >
                      Close
                    </button>
                    {activeTab !== 'summary' && (
                      <button
                        onClick={goToNextTab}
                        className="px-6 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-md shadow-sm text-sm font-bold hover:bg-blue-100 focus:outline-none flex items-center transition-all"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    )}
                    {isEditable && (
                      <>
                        <button
                          onClick={handleSave}
                          className="px-6 py-2 bg-emerald-600 text-white rounded-md shadow-sm text-sm font-bold hover:bg-emerald-700 focus:outline-none transition-colors"
                        >
                          Save Draft
                        </button>
                        <button
                          onClick={handleSubmit}
                          className="px-6 py-2 bg-[#262760] text-white rounded-md shadow-sm text-sm font-bold hover:bg-[#1e2050] focus:outline-none transition-colors flex items-center"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Submit to Reviewer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-[#262760] mt-1 mr-3" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Submit Review?
                </h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to submit this review? It will be sent to the Reviewer for moderation.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
                onClick={() => setShowSubmitConfirm(false)}
                disabled={submitLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-[#262760] rounded-md shadow-sm hover:bg-[#1e2050] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={performSubmitReview}
                disabled={submitLoading}
              >
                {submitLoading ? 'Submitting...' : 'Yes, Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex items-start">
              <AlertCircle className="h-6 w-6 text-[#262760] mt-1 mr-3" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  {notification.type === 'error' ? 'Error' : 'Success'}
                </h3>
                <p className="text-sm text-gray-600">{notification.message}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-[#262760] rounded-md shadow-sm hover:bg-[#1e2050] focus:outline-none"
                onClick={() => setNotification(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamAppraisal;
