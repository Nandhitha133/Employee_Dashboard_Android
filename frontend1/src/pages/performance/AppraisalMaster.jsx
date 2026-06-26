import React, { useState, useEffect } from 'react';
import { Save, Loader2, Plus, X, Search, Check, Edit, Settings, Trash2 } from 'lucide-react';
import { performanceAPI, employeeAPI } from '../../services/api';

const getPreviousFinancialYearFull = () => {
  const now = new Date();
  const currentStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const prevStartYear = currentStartYear - 1;
  const prevEndYear = prevStartYear + 1;
  return `${prevStartYear}-${prevEndYear}`;
};

const getCurrentFinancialYearFull = () => {
  const now = new Date();
  const currentStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const currentEndYear = currentStartYear + 1;
  return `${currentStartYear}-${currentEndYear}`;
};

const deriveNextFinancialYearFull = (financialYear) => {
  const parts = String(financialYear || '').split(/[-/]/);
  const startYear = parseInt(parts[0], 10);
  if (Number.isNaN(startYear)) return '';
  const nextStart = startYear + 1;
  return `${nextStart}-${nextStart + 1}`;
};

const AppraisalMaster = () => {
  // Main Data (Source of Truth)
  const [matrixData, setMatrixData] = useState([]);

  const [enabledColumns, setEnabledColumns] = useState({
    belowTarget: false,
    metTarget: true,
    target1_1: false,
    target1_25: false,
    target1_5: false
  });

  const [financialYear, setFinancialYear] = useState(getPreviousFinancialYearFull());
  const [editFinancialYear, setEditFinancialYear] = useState(getPreviousFinancialYearFull());
  const financialYears = [getPreviousFinancialYearFull(), getCurrentFinancialYearFull()];

  // Edit Mode State
  const [isEditMode, setIsEditMode] = useState(false);
  const [editMatrixData, setEditMatrixData] = useState([]);
  const [editEnabledColumns, setEditEnabledColumns] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Designation Modal State
  const [designations, setDesignations] = useState([]);
  const [showDesignationModal, setShowDesignationModal] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [tempSelectedDesignations, setTempSelectedDesignations] = useState([]);
  const [disabledDesignations, setDisabledDesignations] = useState([]);

  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    columnKey: null,
    columnName: ''
  });
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    message: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Attribute Modal State
  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [selectedAttributeDesignation, setSelectedAttributeDesignation] = useState(null);
  const [attributeSections, setAttributeSections] = useState({
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
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [attributeSearchTerm, setAttributeSearchTerm] = useState('');
  const [showSubItemPicker, setShowSubItemPicker] = useState(false);
  const [attributesOnly, setAttributesOnly] = useState(false);
  const [showAddAttributesModal, setShowAddAttributesModal] = useState(false);
  const [showChildPanel, setShowChildPanel] = useState({
    knowledgeSharing: false,
    processAdherence: false,
    technicalAssessment: false,
    growthAssessment: false
  });

  const [availableKnowledge, setAvailableKnowledge] = useState([]);
  const [newKnowledgeLabel, setNewKnowledgeLabel] = useState('');
  const [availableProcess, setAvailableProcess] = useState([]);
  const [newProcessLabel, setNewProcessLabel] = useState('');
  const [availableTechnical, setAvailableTechnical] = useState([]);
  const [newTechnicalLabel, setNewTechnicalLabel] = useState('');
  const [availableGrowth, setAvailableGrowth] = useState([]);
  const [newGrowthLabel, setNewGrowthLabel] = useState('');

  const [deleteConfirmationModal, setDeleteConfirmationModal] = useState({
    isOpen: false,
    section: null,
    key: null
  });

  useEffect(() => {
    fetchMasterAttributes();
    fetchDesignations();
  }, []);

  useEffect(() => {
    fetchMatrix();
  }, [financialYear]);

  const fetchMasterAttributes = async () => {
    try {
      const response = await performanceAPI.getMasterAttributes();
      if (response.data) {
        setAvailableKnowledge(response.data.knowledgeSubItems || []);
        setAvailableProcess(response.data.processSubItems || []);
        setAvailableTechnical(response.data.technicalSubItems || []);
        setAvailableGrowth(response.data.growthSubItems || []);
      }
    } catch (error) {
      console.error("Error fetching master attributes", error);
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      if (response.data) {
        const uniqueDesignations = [...new Set(
          response.data
            .map(emp => emp.designation || emp.role || emp.position)
            .filter(Boolean)
        )].sort();
        setDesignations(uniqueDesignations);
      }
    } catch (error) {
      console.error('Error fetching designations:', error);
      setDesignations([
        'Senior Project Manager', 'Project Manager', 'Assistant Project Manager',
        'Team Lead', 'Senior Detailer', 'Checker', 'Modeler',
        'Junior Detailer', 'Trainee'
      ]);
    }
  };

  const handleAddMasterAttribute = async (section, label, setLabel) => {
    if (!label.trim()) return;
    const key = label
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .trim()
      .split(/\s+/)
      .map((w, i) => i === 0 ? w.toLowerCase() : (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
      .join('');
    try {
      await performanceAPI.addMasterAttribute({ section, key, label });
      fetchMasterAttributes();
      setLabel('');
      setSuccessModal({ isOpen: true, message: 'Attribute added successfully!' });
    } catch (error) {
      console.error("Error adding master attribute", error);
    }
  };

  const handleDeleteMasterAttribute = (section, key) => {
    setDeleteConfirmationModal({ isOpen: true, section, key });
  };

  const confirmDeleteMasterAttribute = async () => {
    const { section, key } = deleteConfirmationModal;
    if (!section || !key) return;
    try {
      await performanceAPI.deleteMasterAttribute(section, key);
      fetchMasterAttributes();
      setSuccessModal({ isOpen: true, message: 'Attribute deleted successfully!' });
    } catch (error) {
      console.error("Error deleting master attribute", error);
      alert("Failed to delete attribute");
    } finally {
      setDeleteConfirmationModal({ isOpen: false, section: null, key: null });
    }
  };

  const handleBulkSubItemAction = async (section, key, action) => {
    try {
      await performanceAPI.saveBulkSubItem({
        action: action === 'enable' ? 'add' : 'remove',
        section,
        key,
        value: action === 'enable'
      });
      setSuccessModal({ isOpen: true, message: `Attribute ${action === 'enable' ? 'enabled' : 'disabled'} for all designations successfully!` });
    } catch (error) {
      console.error("Error bulk updating sub-items", error);
      alert("Failed to update attributes in bulk");
    }
  };

  const handleAttributesOpen = () => {
    setShowAttributesModal(true);
    setSelectedAttributeDesignation(null);
    setAttributeSearchTerm('');
  };

  const handleDesignationSelect = async (designation) => {
    setSelectedAttributeDesignation(designation);
    setLoadingAttributes(true);
    try {
      const response = await performanceAPI.getAttributes(designation);
      if (response.data && response.data.sections) {
        const s = response.data.sections;
        setAttributeSections({
          selfAppraisal: s.selfAppraisal ?? true,
          knowledgeSharing: s.knowledgeSharing ?? true,
          knowledgeSubItems: s?.knowledgeSubItems || {},
          processAdherence: s.processAdherence ?? true,
          processSubItems: s?.processSubItems || {},
          technicalAssessment: s.technicalAssessment ?? true,
          technicalSubItems: s?.technicalSubItems || {},
          growthAssessment: s.growthAssessment ?? true,
          growthSubItems: s?.growthSubItems || {}
        });
      }
    } catch (error) {
      console.error("Error fetching attributes", error);
    } finally {
      setLoadingAttributes(false);
    }
  };

  const handleSaveAttributes = async () => {
    if (!selectedAttributeDesignation) return;
    setLoadingAttributes(true);
    try {
      await performanceAPI.saveAttributes({
        designation: selectedAttributeDesignation,
        sections: attributeSections
      });
      setSuccessModal({ isOpen: true, message: 'Attributes saved successfully!' });
    } catch (error) {
      console.error("Error saving attributes", error);
    } finally {
      setLoadingAttributes(false);
    }
  };

  const fetchMatrix = async () => {
    try {
      setLoading(true);
      const response = await performanceAPI.getIncrementMatrix({ financialYear });

      const readMatrixFromResponse = (res) => {
        const d = res?.data;
        if (!d) return { matrix: [], enabledColumns: null };
        if (d.matrix && Array.isArray(d.matrix) && d.matrix.length > 0) {
          return { matrix: d.matrix, enabledColumns: d.enabledColumns || null };
        }
        if (Array.isArray(d) && d.length > 0) {
          return { matrix: d, enabledColumns: null };
        }
        return { matrix: [], enabledColumns: d.enabledColumns || null };
      };

      let { matrix, enabledColumns: enabled } = readMatrixFromResponse(response);

      if (matrix.length === 0) {
        const fallbackYear = deriveNextFinancialYearFull(financialYear);
        const shouldFallback =
          financialYear === getPreviousFinancialYearFull() &&
          fallbackYear === getCurrentFinancialYearFull();
        if (shouldFallback) {
          const fallbackResponse = await performanceAPI.getIncrementMatrix({ financialYear: fallbackYear });
          const fallback = readMatrixFromResponse(fallbackResponse);
          if (fallback.matrix.length > 0) {
            matrix = fallback.matrix;
            enabled = fallback.enabledColumns || enabled;
          }
        }
      }

      setMatrixData(matrix);
      if (enabled) {
        setEnabledColumns(enabled);
      } else {
        setEnabledColumns({
          belowTarget: false,
          metTarget: true,
          target1_1: false,
          target1_25: false,
          target1_5: false
        });
      }
    } catch (error) {
      console.error('Error fetching increment matrix:', error);
      setMatrixData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditOpen = () => {
    setEditMatrixData(JSON.parse(JSON.stringify(matrixData)));
    setEditEnabledColumns({ ...enabledColumns });
    setEditFinancialYear(financialYear);
    setIsEditMode(true);
  };

  const handleEditClose = () => {
    setIsEditMode(false);
    setEditMatrixData([]);
    setEditEnabledColumns({});
  };

  const handleEditSave = async () => {
    try {
      setSaving(true);
      await performanceAPI.saveIncrementMatrix({
        matrixData: editMatrixData,
        enabledColumns: editEnabledColumns,
        financialYear: editFinancialYear
      });

      setSuccessModal({ isOpen: true, message: "Increment Matrix Saved Successfully!" });
      setIsEditMode(false);

      if (financialYear !== editFinancialYear) {
        setFinancialYear(editFinancialYear);
      } else {
        setMatrixData(editMatrixData);
        setEnabledColumns(editEnabledColumns);
      }
    } catch (error) {
      console.error('Error saving increment matrix:', error);
      alert("Failed to save increment matrix");
    } finally {
      setSaving(false);
    }
  };

  const toggleEditColumn = (columnKey) => {
    const columnNames = {
      belowTarget: 'Below Target',
      metTarget: 'Met Target',
      target1_1: '1.1 X Target',
      target1_25: '1.25 X Target',
      target1_5: '1.5 X Target'
    };

    if (!editEnabledColumns[columnKey]) {
      setConfirmationModal({
        isOpen: true,
        columnKey,
        columnName: columnNames[columnKey]
      });
    } else {
      setEditEnabledColumns(prev => ({
        ...prev,
        [columnKey]: false
      }));
    }
  };

  const confirmEnableEditColumn = () => {
    const { columnKey } = confirmationModal;
    if (columnKey) {
      setEditEnabledColumns({
        belowTarget: false,
        metTarget: false,
        target1_1: false,
        target1_25: false,
        target1_5: false,
        [columnKey]: true
      });
    }
    setConfirmationModal({ isOpen: false, columnKey: null, columnName: '' });
  };

  const handleEditInputChange = (categoryId, gradeIndex, field, value) => {
    setEditMatrixData(prevData => prevData.map(category => {
      if (category.id === categoryId) {
        const newRatings = [...category.ratings];
        newRatings[gradeIndex] = { ...newRatings[gradeIndex], [field]: value };
        return { ...category, ratings: newRatings };
      }
      return category;
    }));
  };

  // Designation Modal Handlers
  const openDesignationModal = (category) => {
    setEditingCategoryId(category.id);
    const currentDesignations = category.category
      ? category.category.split(',').map(d => d.trim()).filter(Boolean)
      : [];
    setTempSelectedDesignations(currentDesignations);

    const otherUsed = new Set();
    editMatrixData.forEach(cat => {
      if (cat.id !== category.id && cat.category) {
        const catDesignations = cat.category.split(',').map(d => d.trim()).filter(Boolean);
        catDesignations.forEach(d => otherUsed.add(d));
      }
    });
    setDisabledDesignations(Array.from(otherUsed));

    setSearchTerm('');
    setShowDesignationModal(true);
  };

  const handleDesignationToggle = (designation) => {
    if (disabledDesignations.includes(designation)) return;

    setTempSelectedDesignations(prev => {
      if (prev.includes(designation)) {
        return prev.filter(d => d !== designation);
      } else {
        return [...prev, designation];
      }
    });
  };

  const saveDesignations = () => {
    if (editingCategoryId !== null) {
      const newCategoryString = tempSelectedDesignations.join(', ');
      const updatedMatrixData = editMatrixData.map(cat =>
        cat.id === editingCategoryId
          ? { ...cat, category: newCategoryString }
          : cat
      );
      setEditMatrixData(updatedMatrixData);
      setShowDesignationModal(false);
      setEditingCategoryId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#262760]" />
      </div>
    );
  }

  const getGradeDisplay = (grade) => {
    const gradeMap = {
      'ES': 'Exceeds Expectations (ES)',
      'ME': 'Meets Expectations (ME)',
      'BE': 'Below Expectations (BE)'
    };
    return gradeMap[grade] || grade;
  };

  const renderViewTable = () => (
    <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 border-collapse border border-gray-300">
        <thead className="bg-white">
          <tr>
            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{ width: '20%' }}>Category</th>
            <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{ width: '20%' }}>Ratings</th>
            <th colSpan={Object.values(enabledColumns).filter(Boolean).length} className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100">Annual Increment %</th>
          </tr>
          <tr>
            <th className="border border-gray-300 bg-white"></th>
            <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900">Company Performance</th>
            {enabledColumns.belowTarget && <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#fff2cc]">Below Target</th>}
            {enabledColumns.metTarget && <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#deebf7]">Met Target</th>}
            {enabledColumns.target1_1 && <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#deebf7]">1.1 X Target</th>}
            {enabledColumns.target1_25 && <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#fce4d6]">1.25 X Target</th>}
            {enabledColumns.target1_5 && <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#e2efda]">1.5 X Target</th>}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {matrixData.map((category) => (
            <React.Fragment key={category.id}>
              {category.ratings.map((rating, index) => (
                <tr key={`${category.id}-${rating.grade}`}>
                  {index === 0 && (
                    <td
                      rowSpan={category.ratings.length}
                      className="border border-gray-300 px-4 py-2 text-sm text-gray-900 font-medium align-middle bg-white"
                    >
                      <div>
                        {category.category ? category.category.split(',').map((d, i) => (
                          <div key={i} className="py-0.5 leading-snug">{d.trim()}</div>
                        )) : <span className="text-gray-400 italic text-xs">No designations</span>}
                      </div>
                    </td>
                  )}
                  <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900 font-bold">
                    {getGradeDisplay(rating.grade)}
                  </td>
                  {enabledColumns.belowTarget && <td className="border border-gray-300 px-2 py-1 bg-[#fff2cc] text-center text-sm">{rating.belowTarget}</td>}
                  {enabledColumns.metTarget && <td className="border border-gray-300 px-2 py-1 bg-[#deebf7] text-center text-sm">{rating.metTarget}</td>}
                  {enabledColumns.target1_1 && <td className="border border-gray-300 px-2 py-1 bg-[#deebf7] text-center text-sm">{rating.target1_1}</td>}
                  {enabledColumns.target1_25 && <td className="border border-gray-300 px-2 py-1 bg-[#fce4d6] text-center text-sm">{rating.target1_25}</td>}
                  {enabledColumns.target1_5 && <td className="border border-gray-300 px-2 py-1 bg-[#e2efda] text-center text-sm">{rating.target1_5}</td>}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20 p-8 font-sans">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appraisal Master</h1>
            <div className="flex items-center mt-2">
              <label htmlFor="main-financial-year-select" className="text-sm text-gray-500 mr-2">Financial Year:</label>
              <select
                id="main-financial-year-select"
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="text-sm border-gray-300 rounded-md shadow-sm focus:border-[#262760] focus:ring-[#262760] py-1"
              >
                {financialYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleAttributesOpen}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050]"
            >
              <Settings className="h-4 w-4 mr-2" />
              Attributes
            </button>
            <button
              onClick={handleEditOpen}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050]"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Matrix
            </button>
          </div>
        </div>
        {renderViewTable()}
      </div>

      {/* Edit Matrix Modal */}
      {isEditMode && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-7xl max-h-[90vh] flex flex-col border border-gray-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Edit Increment Matrix - {editFinancialYear}</h3>
              <button onClick={handleEditClose} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 border-collapse border border-gray-300">
                  <thead className="bg-white">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{ width: '20%' }}>Category</th>
                      <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{ width: '20%' }}>Ratings</th>
                      <th colSpan="5" className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100">Annual Increment %</th>
                    </tr>
                    <tr>
                      <th className="border border-gray-300 bg-white"></th>
                      <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900">Company Performance</th>
                      {['belowTarget', 'metTarget', 'target1_1', 'target1_25', 'target1_5'].map(col => (
                        <th key={col} className={`border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 ${col === 'belowTarget' ? 'bg-[#fff2cc]' : col === 'target1_25' ? 'bg-[#fce4d6]' : col === 'target1_5' ? 'bg-[#e2efda]' : 'bg-[#deebf7]'}`}>
                          <div className="flex flex-col items-center gap-1">
                            {col.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                            <button
                              onClick={() => toggleEditColumn(col)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${editEnabledColumns[col] ? 'bg-[#262760]' : 'bg-gray-300'}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${editEnabledColumns[col] ? 'translate-x-4.5' : 'translate-x-1'}`} />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {editMatrixData.map((category) => (
                      <tr key={category.id}>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-900 align-top bg-white relative">
                          <button onClick={() => openDesignationModal(category)} className="absolute top-1 left-1 p-1 rounded hover:bg-gray-100 text-blue-600"><Plus size={16} /></button>
                          <div className="mt-6">{category.category || <span className="text-gray-400 italic text-xs">No designations</span>}</div>
                        </td>
                        <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900 font-bold align-top">
                          {category.ratings.map((rating, idx) => (
                            <div key={idx} className="py-1 border-b last:border-b-0 border-dashed border-gray-200">{getGradeDisplay(rating.grade)}</div>
                          ))}
                        </td>
                        {['belowTarget', 'metTarget', 'target1_1', 'target1_25', 'target1_5'].map(col => (
                          <td key={col} className={`border border-gray-300 px-2 py-1 align-top ${editEnabledColumns[col] ? (col === 'belowTarget' ? 'bg-[#fff2cc]' : col === 'target1_25' ? 'bg-[#fce4d6]' : col === 'target1_5' ? 'bg-[#e2efda]' : 'bg-[#deebf7]') : 'bg-gray-100'}`}>
                            {category.ratings.map((rating, idx) => (
                              <div key={idx} className="py-1 border-b last:border-b-0 border-dashed border-gray-200">
                                <input
                                  type="text"
                                  value={rating[col]}
                                  onChange={(e) => handleEditInputChange(category.id, idx, col, e.target.value)}
                                  className="w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1"
                                  disabled={!editEnabledColumns[col]}
                                />
                              </div>
                            ))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center justify-end p-4 border-t border-gray-100 bg-gray-50 space-x-3">
              <button onClick={handleEditClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50">Cancel</button>
              <button onClick={handleEditSave} disabled={saving} className="inline-flex items-center px-4 py-2 bg-[#262760] text-white rounded-md text-sm font-medium hover:bg-[#1e2050] disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attributes Modal */}
      {showAttributesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Appraisal Attributes</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddAttributesModal(true)} className="px-3 py-1.5 rounded-md text-sm border bg-[#262760] text-white">Manage Master Attributes</button>
                <button onClick={() => setShowAttributesModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/2 flex flex-col bg-white border-r border-gray-200">
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search..."
                      className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                      value={attributeSearchTerm}
                      onChange={(e) => setAttributeSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2">
                  {designations.filter(d => d.toLowerCase().includes(attributeSearchTerm.toLowerCase())).map(designation => (
                    <button
                      key={designation}
                      onClick={() => handleDesignationSelect(designation)}
                      className={`w-full text-left px-4 py-3 rounded-md text-sm mb-1 ${selectedAttributeDesignation === designation ? 'bg-[#262760] text-white' : 'hover:bg-gray-100 text-gray-700'}`}
                    >
                      {designation}
                    </button>
                  ))}
                </div>
              </div>

              <div className="w-1/2 p-6 overflow-y-auto bg-gray-50">
                {selectedAttributeDesignation ? (
                  <div className="space-y-6">
                    <h4 className="text-lg font-semibold text-[#262760]">{selectedAttributeDesignation}</h4>
                    {loadingAttributes ? (
                      <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin text-[#262760]" /></div>
                    ) : (
                      <div className="space-y-4">
                        {[
                          { title: 'Knowledge Sharing', key: 'knowledgeSubItems', items: availableKnowledge, color: 'purple' },
                          { title: 'Process Adherence', key: 'processSubItems', items: availableProcess, color: 'orange' },
                          { title: 'Technical Assessment', key: 'technicalSubItems', items: availableTechnical, color: 'blue' },
                          { title: 'Growth Assessment', key: 'growthSubItems', items: availableGrowth, color: 'green' }
                        ].map(section => (
                          <div key={section.key} className={`border border-${section.color}-100 rounded-md p-3 bg-${section.color}-50`}>
                            <div className={`text-xs font-semibold text-${section.color}-700 mb-2 uppercase`}>{section.title}</div>
                            {section.items.map(sub => (
                              <div key={sub.key} className="flex items-center justify-between p-2 mb-1 bg-white rounded border border-gray-100">
                                <span className="text-sm text-gray-700">{sub.label}</span>
                                <input
                                  type="checkbox"
                                  checked={attributeSections[section.key]?.[sub.key] ?? false}
                                  onChange={(e) => setAttributeSections(prev => ({
                                    ...prev,
                                    [section.key]: { ...(prev[section.key] || {}), [sub.key]: e.target.checked }
                                  }))}
                                  className="h-4 w-4 text-[#262760]"
                                />
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    <button onClick={handleSaveAttributes} className="w-full inline-flex justify-center items-center px-4 py-2 bg-[#262760] text-white rounded-md text-sm font-medium hover:bg-[#1e2050]">
                      <Save className="h-4 w-4 mr-2" /> Save Attributes
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400"><Edit size={48} className="opacity-20 mb-4" /><p>Select a designation</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Attribute Manager Popup */}
      {showAddAttributesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border border-gray-200 overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-gray-50">
              <h4 className="text-xl font-bold text-gray-900">Manage Master Attributes</h4>
              <button onClick={() => setShowAddAttributesModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {[
                { title: 'Knowledge Sharing', key: 'knowledgeSubItems', items: availableKnowledge, label: newKnowledgeLabel, setLabel: setNewKnowledgeLabel, color: 'purple' },
                { title: 'Process Adherence', key: 'processSubItems', items: availableProcess, label: newProcessLabel, setLabel: setNewProcessLabel, color: 'orange' },
                { title: 'Technical Assessment', key: 'technicalSubItems', items: availableTechnical, label: newTechnicalLabel, setLabel: setNewTechnicalLabel, color: 'blue' },
                { title: 'Growth Assessment', key: 'growthSubItems', items: availableGrowth, label: newGrowthLabel, setLabel: setNewGrowthLabel, color: 'green' }
              ].map(section => (
                <div key={section.key} className={`border border-${section.color}-100 rounded-lg p-4 bg-${section.color}-50/50`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`text-sm font-bold text-${section.color}-800`}>{section.title}</div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={section.label}
                      onChange={(e) => section.setLabel(e.target.value)}
                      placeholder="New attribute label..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#262760] focus:border-[#262760]"
                    />
                    <button
                      onClick={() => handleAddMasterAttribute(section.key, section.label, section.setLabel)}
                      className="px-4 py-2 bg-[#262760] text-white rounded-md text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {section.items.map(sub => (
                      <div key={sub.key} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-md shadow-sm group">
                        <span className="text-sm font-medium text-gray-700">{sub.label}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleBulkSubItemAction(section.key, sub.key, 'enable')}
                            className="px-2 py-1 text-[10px] bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                            title="Enable for all designations"
                          >
                            Enable All
                          </button>
                          <button
                            onClick={() => handleBulkSubItemAction(section.key, sub.key, 'disable')}
                            className="px-2 py-1 text-[10px] bg-red-100 text-red-700 rounded hover:bg-red-200"
                            title="Disable for all designations"
                          >
                            Disable All
                          </button>
                          <button
                            onClick={() => handleDeleteMasterAttribute(section.key, sub.key)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {section.items.length === 0 && <p className="text-xs text-center text-gray-400 italic py-2">No master attributes</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setShowAddAttributesModal(false)} className="px-6 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals from before */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"><div className="bg-white p-6 rounded-lg text-center"><Check className="mx-auto text-emerald-500 mb-2" size={32} /><h3>Success</h3><p>{successModal.message}</p><button onClick={() => setSuccessModal({ isOpen: false })} className="mt-4 px-4 py-2 bg-[#262760] text-white rounded">OK</button></div></div>
      )}
      {deleteConfirmationModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg text-center max-w-sm">
            <Trash2 className="mx-auto text-red-500 mb-2" size={32} />
            <h3 className="font-bold">Delete Attribute</h3>
            <p className="text-sm text-gray-500 my-4">Are you sure? This will remove the attribute globally.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDeleteConfirmationModal({ isOpen: false })} className="px-4 py-2 border border-gray-300 rounded">Cancel</button>
              <button onClick={confirmDeleteMasterAttribute} className="px-4 py-2 bg-red-600 text-white rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
      {showDesignationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <div className="flex justify-between mb-4"><h3 className="font-bold">Select Designations</h3><button onClick={() => setShowDesignationModal(false)}><X size={20} /></button></div>
            <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
              {designations.map(d => (
                <label key={d} className={`flex items-center gap-2 p-2 rounded ${disabledDesignations.includes(d) ? 'opacity-50' : 'hover:bg-gray-50'}`}>
                  <input type="checkbox" disabled={disabledDesignations.includes(d)} checked={tempSelectedDesignations.includes(d)} onChange={() => handleDesignationToggle(d)} />
                  <span className="text-sm">{d} {disabledDesignations.includes(d) && '(Used)'}</span>
                </label>
              ))}
            </div>
            <button onClick={saveDesignations} className="w-full py-2 bg-[#262760] text-white rounded">Save Designations</button>
          </div>
        </div>
      )}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg max-w-sm text-center">
            <h3 className="font-bold mb-4">Confirm Change</h3>
            <p className="text-sm text-gray-600 mb-6">Enable {confirmationModal.columnName}?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmationModal({ isOpen: false })} className="px-4 py-2 border border-gray-300 rounded">Cancel</button>
              <button onClick={confirmEnableEditColumn} className="px-4 py-2 bg-[#262760] text-white rounded">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalMaster;
