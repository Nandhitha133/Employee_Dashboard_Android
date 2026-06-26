import React, { useEffect, useState } from 'react';
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
import { performanceAPI } from '../services/api';

const TAB_ORDER = ['knowledge', 'process', 'technical', 'growth', 'projects', 'summary'];

// Enhanced Rating Stars Component with Labels
const RatingStars = ({ value, readOnly = true, size = "h-5 w-5", showValue = true }) => {
  const stars = [1, 2, 3, 4, 5];
  const numericValue = Number(value) || 0;

  return (
    <div className="flex items-center space-x-1">
      {stars.map((star) => (
        <button
          key={star}
          type="button"
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
const RatingComparisonRow = ({ label, selfValue, managerValue }) => (
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
        <span className="text-xs text-indigo-500 mr-2 w-16 font-bold">Manager:</span>
        <RatingStars
          value={managerValue}
          readOnly={true}
          size="h-4 w-4"
          showValue={false}
        />
        <span className="ml-2 text-xs text-indigo-700 font-bold">
          {managerValue ? `${managerValue}/5` : 'Not rated'}
        </span>
      </div>
    </div>
  </div>
);

// Comment Comparison Card Component
const CommentComparisonCard = ({
  title,
  selfComment,
  managerComment,
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
            <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">Manager Assessment</span>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-200 shadow-sm">
            <p className="text-sm text-indigo-900 italic font-medium leading-relaxed">
              {managerComment ? `"${managerComment}"` : 'No manager comments yet'}
            </p>
          </div>
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

const ReviewerViewModal = ({ selectedEmployee, onClose, formatDisplayDate, hasCompensationAccess }) => {
  const [activeTab, setActiveTab] = useState('knowledge');
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

  const getAttributeLabel = (section, key) => {
    const list = masterAttributes[section] || [];
    const item = list.find(it => it.key === key);
    return item ? item.label : key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const getEnabledItems = (sectionKey) => {
    const enabledMap = enabledSections?.[sectionKey] || {};
    const masterList = masterAttributes?.[sectionKey] || [];
    return masterList.filter(attr => enabledMap[attr.key]);
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

  const goToNextTab = () => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (currentIndex < TAB_ORDER.length - 1) {
      setActiveTab(TAB_ORDER[currentIndex + 1]);
    }
  };

  if (!selectedEmployee) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl overflow-hidden text-left align-middle transition-all transform">
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
                      {(() => {
                        const s = selectedEmployee.status || '';
                        const map = {
                          submitted: 'Pending Review',
                          managerInProgress: 'Under Review',
                          reviewerPending: 'Reviewer Pending',
                          reviewerInProgress: 'Reviewer Working',
                          reviewerApproved: 'Ready for Director',
                          directorInProgress: 'Director Review',
                          directorPushedBack: 'Correction Needed',
                          directorApproved: 'Approved',
                          released: 'Awaiting Acceptance',
                          accepted_pending_effect: 'Accepted',
                          effective: 'Completed'
                        };
                        return map[s] || s;
                      })()}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-white/10 hover:bg-white/20 rounded-full p-2 text-white transition-colors focus:outline-none"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-white px-6 sticky top-0 z-10">
            <nav className="flex space-x-6 overflow-x-auto">
              {['knowledge', 'process', 'technical', 'growth', 'projects', 'summary'].map((tab) => {
                const labels = {
                  knowledge: 'Knowledge Sharing',
                  process: 'Process Adherence',
                  technical: 'Technical Assessment',
                  growth: 'Growth Assessment',
                  projects: 'Key Projects',
                  summary: 'Summary & Rating'
                };
                const Icons = {
                  knowledge: Users,
                  process: BarChart3,
                  technical: Code,
                  growth: TrendingUp,
                  projects: Briefcase,
                  summary: Award
                };
                const TabIcon = Icons[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab
                      ? 'border-[#262760] text-[#262760]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <TabIcon className="h-4 w-4 inline mr-2" />
                    {labels[tab]}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Modal Content */}
          <div className="flex-1 px-6 py-6 space-y-6 bg-gray-50">
            {/* Knowledge Sharing Tab */}
            {activeTab === 'knowledge' && (
              <div className="space-y-6">
                <SectionHeader icon={Users} title="Knowledge Sharing Assessment" color="purple">
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">View Only Mode</span>
                </SectionHeader>
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
                        />
                      );
                    })}
                  </div>
                </div>
                <CommentComparisonCard
                  title="Knowledge Sharing Comments"
                  selfComment={selectedEmployee.behaviourBased?.comments}
                  managerComment={selectedEmployee.behaviourManagerComments}
                  icon={MessageSquare}
                  color="purple"
                />
              </div>
            )}

            {/* Process Adherence Tab */}
            {activeTab === 'process' && (
              <div className="space-y-6">
                <SectionHeader icon={BarChart3} title="Process Adherence Assessment" color="orange">
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">View Only Mode</span>
                </SectionHeader>
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
                        />
                      );
                    })}
                  </div>
                </div>
                <CommentComparisonCard
                  title="Process Adherence Comments"
                  selfComment={selectedEmployee.processAdherence?.comments}
                  managerComment={selectedEmployee.processManagerComments}
                  icon={MessageSquare}
                  color="orange"
                />
              </div>
            )}

            {/* Technical Assessment Tab */}
            {activeTab === 'technical' && (
              <div className="space-y-6">
                <SectionHeader icon={Code} title="Technical Assessment" color="blue">
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">View Only Mode</span>
                </SectionHeader>
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
                        />
                      );
                    })}
                  </div>
                </div>
                <CommentComparisonCard
                  title="Technical Assessment Comments"
                  selfComment={selectedEmployee.technicalBased?.comments}
                  managerComment={selectedEmployee.technicalManagerComments}
                  icon={MessageSquare}
                  color="blue"
                />
              </div>
            )}

            {/* Growth Assessment Tab */}
            {activeTab === 'growth' && (
              <div className="space-y-6">
                <SectionHeader icon={TrendingUp} title="Growth Assessment" color="green">
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">View Only Mode</span>
                </SectionHeader>
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
                        />
                      );
                    })}
                  </div>
                  {selectedEmployee.growthBased?.careerGoals && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2">Career Goals</h5>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-700">{selectedEmployee.growthBased.careerGoals}</p>
                      </div>
                    </div>
                  )}
                </div>
                <CommentComparisonCard
                  title="Growth Assessment Comments"
                  selfComment={selectedEmployee.growthBased?.comments}
                  managerComment={selectedEmployee.growthManagerComments}
                  icon={MessageSquare}
                  color="green"
                />
              </div>
            )}

            {/* Key Projects Tab */}
            {activeTab === 'projects' && (
              <div className="space-y-6">
                <SectionHeader icon={Briefcase} title="Key Projects" color="blue">
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">View Only Mode</span>
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
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">View Only Mode</span>
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

                {/* Manager Review */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-4 border-b border-gray-100 pb-2">Manager Final Review</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Performance Rating</label>
                      <div className="text-sm font-bold text-[#262760]">{selectedEmployee.appraiserRating || 'Not Rated'}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Leadership Potential</label>
                      <div className="text-sm font-medium text-gray-800">{selectedEmployee.leadership || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Attitude</label>
                      <div className="text-sm font-medium text-gray-800">{selectedEmployee.attitude || '-'}</div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Communication</label>
                      <div className="text-sm font-medium text-gray-800">{selectedEmployee.communication || '-'}</div>
                    </div>
                  </div>

                  {hasCompensationAccess && (
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6 mt-4">
                      <div className="flex items-center mb-3">
                        <DollarSign className="h-5 w-5 text-indigo-600 mr-2" />
                        <h5 className="text-sm font-bold text-indigo-900">TAT Details</h5>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-md border border-indigo-100 p-3 shadow-sm">
                          <div className="text-[10px] font-bold text-indigo-400 uppercase">Current Salary</div>
                          <div className="text-sm font-black text-gray-800">{Number(selectedEmployee.currentSalary || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-white rounded-md border border-indigo-100 p-3 shadow-sm">
                          <div className="text-[10px] font-bold text-indigo-400 uppercase">Increment %</div>
                          <div className="text-sm font-black text-gray-800">{Number(selectedEmployee.incrementPercentage || 0)}%</div>
                        </div>
                        <div className="bg-white rounded-md border border-indigo-100 p-3 shadow-sm">
                          <div className="text-[10px] font-bold text-indigo-400 uppercase">Increment Correction %</div>
                          <div className="text-sm font-black text-blue-600">{Number(selectedEmployee.incrementCorrectionPercentage || 0)}%</div>
                        </div>
                        <div className="bg-white rounded-md border border-indigo-100 p-3 shadow-sm">
                          <div className="text-[10px] font-bold text-indigo-400 uppercase">Increment Amount</div>
                          <div className="text-sm font-black text-emerald-600">{Number(selectedEmployee.incrementAmount || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-white rounded-md border border-indigo-100 p-3 shadow-sm">
                          <div className="text-[10px] font-bold text-indigo-400 uppercase">Revised Salary</div>
                          <div className="text-sm font-black text-gray-800">{Number(selectedEmployee.revisedSalary || 0).toLocaleString('en-IN')}</div>
                        </div>
                        <div className="bg-white rounded-md border border-indigo-100 p-3 shadow-sm">
                          <div className="text-[10px] font-bold text-indigo-400 uppercase">Performance Pay</div>
                          <div className="text-sm font-black text-gray-800">{Number(selectedEmployee.performancePay || 0).toLocaleString('en-IN')}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <label className="block text-xs font-semibold text-gray-600 mb-2 flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2 text-[#262760]" />
                      Final Manager Comments
                    </label>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-800 italic leading-relaxed">
                        {selectedEmployee.managerComments ? `"${selectedEmployee.managerComments}"` : <span className="text-gray-400 not-italic">No overall manager comments</span>}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-white border-t border-gray-200 flex items-center justify-between sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="text-xs text-gray-500 font-medium italic hidden sm:block">
            </div>
            <div className="flex space-x-3 w-full sm:w-auto justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg shadow-sm text-sm font-bold hover:bg-gray-50 focus:outline-none transition-colors"
              >
                Close
              </button>
              {activeTab !== 'summary' && (
                <button
                  onClick={goToNextTab}
                  className="px-6 py-2.5 bg-[#262760] text-white border border-transparent rounded-lg shadow-sm text-sm font-bold hover:bg-[#1e2050] focus:outline-none flex items-center transition-all"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewerViewModal;
