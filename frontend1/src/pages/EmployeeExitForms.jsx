import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { exitFormalityAPI, employeeAPI } from '../services/api';
import { message } from 'antd';
import Modal from '../components/Modals/Modal';
import {
  ArrowLeftIcon,
  UserIcon,
  BriefcaseIcon,
  CalendarIcon,
  EnvelopeIcon,
  IdentificationIcon,
  DocumentTextIcon,
  TrashIcon,
  CheckBadgeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const ExitForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewDetails, setViewDetails] = useState(false);
  const [employeeInfo, setEmployeeInfo] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    position: '',
    joinDate: '',
    email: ''
  });
  
  const [formData, setFormData] = useState({
    _id: null,
    proposedLastWorkingDay: '',
    reasonForLeaving: '',
    reasonDetails: '',
    feedback: '',
    suggestions: '',
    assetsToReturn: [],
    status: 'draft',
    currentStage: 'initiation'
  });

  const reasonsForLeaving = [
    { id: 'better_opportunity', label: 'Better Opportunity', color: 'from-blue-400 to-blue-600' },
    { id: 'career_change', label: 'Career Change', color: 'from-purple-400 to-purple-600' },
    { id: 'career_growth', label: 'Career Growth', color: 'from-green-400 to-green-600' },
    { id: 'personal_reasons', label: 'Personal Reasons', color: 'from-pink-400 to-pink-600' },
    { id: 'health_issues', label: 'Health Issues', color: 'from-red-400 to-red-600' },
    { id: 'relocation', label: 'Relocation', color: 'from-orange-400 to-orange-600' },
    { id: 'dissatisfaction', label: 'Dissatisfaction', color: 'from-yellow-400 to-yellow-600' },
    { id: 'retirement', label: 'Retirement', color: 'from-gray-400 to-gray-600' },
    { id: 'work_culture', label: 'Work Culture', color: 'from-teal-400 to-teal-600' },
    { id: 'team_lead', label: 'Team Lead/Management', color: 'from-cyan-400 to-cyan-600' },
    { id: 'compensation', label: 'Compensation', color: 'from-emerald-400 to-emerald-600' },
    { id: 'other', label: 'Other', color: 'from-indigo-400 to-indigo-600' }
  ];

  const defaultAssets = [
    // { item: '', category: 'Hardware', serialNumber: '', status: 'Pending', remarks: '', type: 'custom' }
  ];

  const commonAssets = [
    'Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headset', 'Docking Station',
    'Mobile Phone', 'SIM Card', 'ID Card', 'Access Card', 'Office Keys',
    'Drawer Keys', 'Vehicle Keys', 'Corporate Credit Card', 'Uniform',
    'Safety Gear', 'Other'
  ];

  const [declarationChecked, setDeclarationChecked] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Employee Profile
      const empRes = await employeeAPI.getMyProfile();
      const emp = empRes.data;
      setEmployeeInfo({
        employeeId: emp.employeeId,
        employeeName: emp.name,
        department: emp.division || emp.department,
        position: emp.position,
        joinDate: emp.dateOfJoining,
        email: emp.email
      });

      // 2. Fetch Existing Exit Form
      const exitRes = await exitFormalityAPI.getMyExit();
      if (exitRes.data?.data && exitRes.data.data.length > 0) {
        const existingForm = exitRes.data.data[0];
        
        // Transform assets from backend format
        const formattedAssets = (existingForm.assetsToReturn || []).map(asset => {
          const parts = (asset.assetDetails || '').split(' || ');
          // Handle legacy data or empty details
          if (parts.length <= 1) {
             return {
               item: parts[0] || asset.assetType,
               category: 'Hardware',
               serialNumber: '',
               remarks: '',
               status: asset.returned ? 'Returned' : 'Pending',
               returned: asset.returned,
               type: 'custom' 
             };
          }
          
          return {
            item: parts[0] || '',
            category: parts[1] || 'Hardware',
            serialNumber: parts[2] || '',
            remarks: parts[3] || '',
            status: asset.returned ? 'Returned' : 'Pending',
            returned: asset.returned,
            type: 'custom'
          };
        });

        setFormData({
          _id: existingForm._id,
          proposedLastWorkingDay: existingForm.proposedLastWorkingDay ? existingForm.proposedLastWorkingDay.split('T')[0] : '',
          reasonForLeaving: existingForm.reasonForLeaving,
          reasonDetails: existingForm.reasonDetails,
          feedback: existingForm.feedback,
          suggestions: existingForm.suggestions,
          assetsToReturn: formattedAssets.length > 0 ? formattedAssets : defaultAssets,
          status: existingForm.status,
          currentStage: existingForm.currentStage
        });
      } else {
        setFormData(prev => ({ ...prev, assetsToReturn: defaultAssets }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReasonChange = (reasonId) => {
    setFormData(prev => ({ ...prev, reasonForLeaving: reasonId }));
  };

  const handleAssetChange = (index, field, value) => {
    const updatedAssets = [...formData.assetsToReturn];
    updatedAssets[index][field] = value;
    setFormData(prev => ({ ...prev, assetsToReturn: updatedAssets }));
  };

  const handleAddAsset = () => {
    // Check if the last asset row is complete
    const assets = formData.assetsToReturn;
    if (assets.length > 0) {
      const lastAsset = assets[assets.length - 1];
      if (!lastAsset.item || !lastAsset.serialNumber) {
        message.warning("Please complete the current asset details before adding a new one.");
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      assetsToReturn: [
        ...prev.assetsToReturn,
        { item: '', category: 'Hardware', serialNumber: '', status: 'Pending', remarks: '', type: 'custom' }
      ]
    }));
  };

  const handleRemoveAsset = (index) => {
    setFormData(prev => ({
      ...prev,
      assetsToReturn: prev.assetsToReturn.filter((_, i) => i !== index)
    }));
  };

  const handleDeleteDraft = async () => {
    if (!formData._id) return;
    
    setSaving(true);
    try {
      await exitFormalityAPI.remove(formData._id);
      message.success("Draft deleted successfully.");
      setDeleteModalOpen(false);
      
      // Reset form
      setFormData({
        _id: null,
        proposedLastWorkingDay: '',
        reasonForLeaving: '',
        reasonDetails: '',
        feedback: '',
        suggestions: '',
        assetsToReturn: defaultAssets,
        status: 'draft',
        currentStage: 'initiation'
      });
      setDeclarationChecked(false);
    } catch (error) {
      console.error('Error deleting draft:', error);
      message.error("Failed to delete draft: " + (error.response?.data?.error || error.message));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (isDraft = true) => {
    if (!isDraft) {
      if (!declarationChecked) {
        message.warning("Please accept the declaration before submitting.");
        return;
      }
      if (!formData.proposedLastWorkingDay || !formData.reasonForLeaving) {
         message.warning("Please fill in Proposed Last Working Day and Reason for Leaving.");
         return;
      }
    }

    setSaving(true);
    try {
      // Transform assets for backend
      const assetsForBackend = formData.assetsToReturn.map(asset => {
         const itemLower = (asset.item || '').toLowerCase();
         let type = 'other';
         if (itemLower.includes('laptop')) type = 'laptop';
         else if (itemLower.includes('mobile') || itemLower.includes('phone')) type = 'mobile';
         else if (itemLower.includes('access card')) type = 'access_card';
         else if (itemLower.includes('id card')) type = 'id_card';
         else if (itemLower.includes('key')) type = 'keys';
         else if (itemLower.includes('document')) type = 'documents';

         const details = [
           asset.item || '',
           asset.category || 'Hardware',
           asset.serialNumber || '',
           asset.remarks || ''
         ].join(' || ');

         return {
           assetType: type,
           assetDetails: details,
           returned: asset.status === 'Returned'
         };
      });

      const payload = {
        ...formData,
        assetsToReturn: assetsForBackend,
        status: isDraft ? 'draft' : 'submitted'
      };

      if (formData._id) {
        await exitFormalityAPI.updateExit(formData._id, payload);
        if (!isDraft) await exitFormalityAPI.submitExit(formData._id);
      } else {
        const res = await exitFormalityAPI.createExit(payload);
        setFormData(prev => ({ ...prev, _id: res.data.data._id }));
        if (!isDraft) await exitFormalityAPI.submitExit(res.data.data._id);
      }
      
      message.success(isDraft ? 'Saved as draft!' : 'Submitted successfully!');
      if (!isDraft) {
        // Refresh data to update status to 'submitted'
        fetchInitialData();
        window.scrollTo(0, 0);
      } else {
        fetchInitialData();
      }
    } catch (error) {
      console.error('Error saving form:', error);
      message.error('Failed to save form. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#262760]">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white"></div>
    </div>
  );

  // Show "Under Processing" state if submitted and not viewing details
  if (formData.status === 'submitted' && !viewDetails) {
    return (
      <div className="min-h-screen bg-[#262760] p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center space-y-6 animate-fade-in">
          <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-indigo-100">
            <ClockIcon className="h-12 w-12 text-indigo-600" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-gray-900">Form Under Processing</h2>
            <p className="text-gray-500 text-lg">
              Your exit formalities form has been submitted and is currently under review.
            </p>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-800 border border-indigo-100">
            <p><strong>Next Step:</strong> Manager Approval</p>
            <p className="mt-1 opacity-80">You will be notified once the status changes.</p>
          </div>
          
          <div className="pt-6 space-y-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-3.5 bg-[#1e2050] text-white rounded-xl font-bold hover:bg-[#2a2c6a] transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => setViewDetails(true)}
              className="w-full py-3.5 bg-white border-2 border-indigo-100 text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 hover:border-indigo-200 transition-all"
            >
              View Submitted Form
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#262760] p-6 pb-20">
      <div className="max-w-6xl mx-auto">
        
        {viewDetails && (
          <button
            onClick={() => setViewDetails(false)}
            className="mb-6 flex items-center text-white/80 hover:text-white transition-colors font-medium"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back to Status
          </button>
        )}

        <div className="space-y-8">
          {/* Employee Info Section */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
            <div className="bg-[#1e2050] px-6 py-4 border-b border-indigo-900/20">
              <h2 className="text-lg font-bold text-white flex items-center">
                <UserIcon className="h-6 w-6 mr-2 text-indigo-300" />
                Employee Information
              </h2>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="group">
                <label className="flex items-center text-sm font-semibold text-gray-500 mb-1">
                  <IdentificationIcon className="h-4 w-4 mr-1 text-indigo-400" /> Employee ID
                </label>
                <div className="text-gray-900 font-bold text-lg border-b-2 border-transparent group-hover:border-indigo-200 transition-colors pb-1">
                  {employeeInfo.employeeId}
                </div>
              </div>
              <div className="group">
                <label className="flex items-center text-sm font-semibold text-gray-500 mb-1">
                  <UserIcon className="h-4 w-4 mr-1 text-purple-400" /> Name
                </label>
                <div className="text-gray-900 font-bold text-lg border-b-2 border-transparent group-hover:border-purple-200 transition-colors pb-1">
                  {employeeInfo.employeeName}
                </div>
              </div>
              <div className="group">
                <label className="flex items-center text-sm font-semibold text-gray-500 mb-1">
                  <BriefcaseIcon className="h-4 w-4 mr-1 text-pink-400" /> Department
                </label>
                <div className="text-gray-900 font-bold text-lg border-b-2 border-transparent group-hover:border-pink-200 transition-colors pb-1">
                  {employeeInfo.department}
                </div>
              </div>
              <div className="group">
                <label className="flex items-center text-sm font-semibold text-gray-500 mb-1">
                  <CheckBadgeIcon className="h-4 w-4 mr-1 text-teal-400" /> Position
                </label>
                <div className="text-gray-900 font-bold text-lg border-b-2 border-transparent group-hover:border-teal-200 transition-colors pb-1">
                  {employeeInfo.position}
                </div>
              </div>
              <div className="group">
                <label className="flex items-center text-sm font-semibold text-gray-500 mb-1">
                  <CalendarIcon className="h-4 w-4 mr-1 text-orange-400" /> Date of Joining
                </label>
                <div className="text-gray-900 font-bold text-lg border-b-2 border-transparent group-hover:border-orange-200 transition-colors pb-1">
                  {employeeInfo.joinDate ? new Date(employeeInfo.joinDate).toLocaleDateString() : '-'}
                </div>
              </div>
              <div className="group">
                <label className="flex items-center text-sm font-semibold text-gray-500 mb-1">
                  <EnvelopeIcon className="h-4 w-4 mr-1 text-blue-400" /> Email
                </label>
                <div className="text-gray-900 font-bold text-lg border-b-2 border-transparent group-hover:border-blue-200 transition-colors pb-1">
                  {employeeInfo.email}
                </div>
              </div>
            </div>
          </div>

          {/* Separation Details */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
            <div className="bg-[#1e2050] px-6 py-4 border-b border-indigo-900/20">
              <h3 className="text-lg font-bold text-white flex items-center">
                <DocumentTextIcon className="h-6 w-6 mr-2 text-indigo-300" />
                Separation Details
              </h3>
            </div>
            <div className="p-8 space-y-8">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Proposed Last Working Day <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="proposedLastWorkingDay"
                  value={formData.proposedLastWorkingDay}
                  onChange={handleInputChange}
                  disabled={formData.status !== 'draft'}
                  className="w-full md:w-1/3 rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 bg-gray-50 hover:bg-white transition-colors"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-4">
                  Reason for Leaving <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {reasonsForLeaving.map((reason) => (
                    <div 
                      key={reason.id}
                      onClick={() => formData.status === 'draft' && handleReasonChange(reason.id)}
                      className={`
                        cursor-pointer rounded-xl p-4 flex items-center transition-all duration-200 border-2 shadow-sm relative overflow-hidden group
                        ${formData.reasonForLeaving === reason.id 
                          ? 'border-transparent ring-2 ring-offset-2 ring-indigo-500 transform scale-105 z-10' 
                          : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}
                        ${formData.status !== 'draft' ? 'opacity-75 cursor-not-allowed' : ''}
                      `}
                    >
                      {/* Background Gradient on Select */}
                      {formData.reasonForLeaving === reason.id && (
                        <div className={`absolute inset-0 bg-[#1e2050] opacity-10`} />
                      )}
                      
                      <div className={`
                        w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 z-10
                        ${formData.reasonForLeaving === reason.id 
                          ? 'border-indigo-600 bg-white' 
                          : 'border-gray-300 group-hover:border-gray-400'}
                      `}>
                        {formData.reasonForLeaving === reason.id && (
                          <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <span className={`text-sm z-10 ${formData.reasonForLeaving === reason.id ? 'text-gray-900 font-bold' : 'text-gray-600 group-hover:text-gray-900'}`}>
                        {reason.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Detailed Reason / Comments
                </label>
                <textarea
                  name="reasonDetails"
                  value={formData.reasonDetails}
                  onChange={handleInputChange}
                  disabled={formData.status !== 'draft'}
                  rows={3}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 py-3 px-4 bg-gray-50 hover:bg-white transition-colors"
                  placeholder="Please provide more details about your decision..."
                />
              </div>
            </div>
          </div>

          {/* Assets Handover */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
            <div className="bg-[#1e2050] px-6 py-4 flex justify-between items-center border-b border-indigo-900/20">
              <h3 className="text-lg font-bold text-white flex items-center">
                <CheckBadgeIcon className="h-6 w-6 mr-2 text-indigo-300" />
                Assets Handover
              </h3>
              {formData.status === 'draft' && (
                <button
                  type="button"
                  onClick={handleAddAsset}
                  className="px-4 py-1.5 bg-white/10 text-white hover:bg-white/20 rounded-lg text-sm font-bold backdrop-blur-sm transition-colors border border-white/20"
                >
                  + Add Asset
                </button>
              )}
            </div>
            
            <div className="p-6">
              <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Asset Item</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Serial No.</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Remarks</th>
                      {formData.status === 'draft' && (
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {formData.assetsToReturn.map((asset, index) => (
                      <tr key={index} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <select
                            value={asset.item}
                            onChange={(e) => handleAssetChange(index, 'item', e.target.value)}
                            disabled={formData.status !== 'draft'}
                            className="w-full rounded-lg border-gray-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
                          >
                            <option value="">Select Asset</option>
                            {commonAssets.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={asset.category || 'Hardware'}
                            onChange={(e) => handleAssetChange(index, 'category', e.target.value)}
                            disabled={formData.status !== 'draft'}
                            className="w-full rounded-lg border-gray-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
                          >
                            <option value="Hardware">Hardware</option>
                            <option value="Software">Software</option>
                            <option value="Access">Access</option>
                            <option value="Documents">Documents</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={asset.serialNumber || ''}
                            onChange={(e) => handleAssetChange(index, 'serialNumber', e.target.value)}
                            disabled={formData.status !== 'draft'}
                            placeholder="Serial / ID"
                            className="w-full rounded-lg border-gray-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={asset.status || 'Pending'}
                            onChange={(e) => handleAssetChange(index, 'status', e.target.value)}
                            disabled={formData.status !== 'draft'}
                            className="w-full rounded-lg border-gray-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Returned">Returned</option>
                            <option value="Lost">Lost</option>
                            <option value="Damaged">Damaged</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={asset.remarks || ''}
                            onChange={(e) => handleAssetChange(index, 'remarks', e.target.value)}
                            disabled={formData.status !== 'draft'}
                            placeholder="Optional"
                            className="w-full rounded-lg border-gray-200 text-sm focus:ring-indigo-500 focus:border-indigo-500 py-2"
                          />
                        </td>
                        {formData.status === 'draft' && (
                          <td className="px-6 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveAsset(index)}
                              className="text-red-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-full"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {formData.assetsToReturn.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-sm text-gray-500 italic">
                          No assets listed. Click "Add Asset" to begin your checklist.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Feedback & Suggestions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
              <div className="bg-[#1e2050] px-6 py-4 border-b border-indigo-900/20">
                <h3 className="text-lg font-bold text-white">Experience Feedback</h3>
              </div>
              <div className="p-6">
                <textarea
                  name="feedback"
                  value={formData.feedback}
                  onChange={handleInputChange}
                  disabled={formData.status !== 'draft'}
                  rows={4}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-4 bg-gray-50"
                  placeholder="How was your overall experience working here?"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-indigo-100">
              <div className="bg-[#1e2050] px-6 py-4 border-b border-indigo-900/20">
                <h3 className="text-lg font-bold text-white">Suggestions</h3>
              </div>
              <div className="p-6">
                <textarea
                  name="suggestions"
                  value={formData.suggestions}
                  onChange={handleInputChange}
                  disabled={formData.status !== 'draft'}
                  rows={4}
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-4 bg-gray-50"
                  placeholder="Any suggestions for us to improve?"
                />
              </div>
            </div>
          </div>

          {/* Declaration & Actions */}
          <div className="bg-white rounded-2xl shadow-xl border border-indigo-100 overflow-hidden">
            <div className="p-8 bg-gradient-to-b from-white to-gray-50">
              <label className="flex items-start cursor-pointer group">
                <div className="flex items-center h-6">
                  <input
                    type="checkbox"
                    checked={declarationChecked}
                    onChange={(e) => setDeclarationChecked(e.target.checked)}
                    disabled={formData.status !== 'draft'}
                    className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <div className="ml-3">
                  <span className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">I Accept the Declaration</span>
                  <p className="text-gray-500 text-sm mt-1">
                    I hereby declare that I have returned all company assets in my possession and the information provided above is accurate. 
                    I understand that any unreturned assets may result in a deduction from my final settlement.
                  </p>
                </div>
              </label>

              {formData.status === 'draft' && (
                <div className="mt-8 flex justify-end items-center space-x-4 border-t border-gray-200 pt-6">
                  {formData._id && (
                    <button
                      type="button"
                      onClick={() => setDeleteModalOpen(true)}
                      disabled={saving}
                      className="mr-auto px-4 py-3 rounded-xl text-red-600 font-medium hover:bg-red-50 hover:text-red-700 transition-all flex items-center"
                    >
                      <TrashIcon className="h-5 w-5 mr-2" />
                      Delete Draft
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={saving}
                    className="px-6 py-3 rounded-xl border-2 border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-all shadow-sm"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit(false)}
                    disabled={saving || !formData.proposedLastWorkingDay || !formData.reasonForLeaving}
                    className="px-8 py-3 rounded-xl bg-[#1e2050] text-white font-bold shadow-lg shadow-indigo-900/30 hover:shadow-indigo-900/50 hover:bg-[#262760] hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Submitting...' : 'Submit Exit Form'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            Are you sure you want to delete this draft? This action cannot be undone.
          </p>
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
            onClick={() => setDeleteModalOpen(false)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
            onClick={handleDeleteDraft}
            disabled={saving}
          >
            {saving ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ExitForm;
