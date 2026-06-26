// src/pages/AdminPolicyPortal.jsx
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { policyAPI } from '../services/api';
import {
  PlusIcon,
  CheckIcon,
  TrashIcon,
  PencilIcon,
  DocumentTextIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const AdminPolicyPortal = () => {
  const [policies, setPolicies] = useState([]);
  const [activePolicy, setActivePolicy] = useState(null);
  const [editingContent, setEditingContent] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [content, setContent] = useState('');
  const [policyTitle, setPolicyTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null);
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isNewPolicy, setIsNewPolicy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.role || 'employees';
  const isReadOnly = role === 'employees' || role === 'projectmanager';
  const location = useLocation();

  // Load policies from backend on component mount
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await policyAPI.list();
        const items = Array.isArray(res.data) ? res.data : [];
        setPolicies(items);
      } catch (err) {
        console.error('Failed to fetch policies:', err);
      }
    };
    fetchPolicies();
  }, []);

  // Handle URL param or default selection
  useEffect(() => {
    if (policies.length === 0) return;

    const params = new URLSearchParams(location.search);
    const policyId = params.get('id');

    let targetPolicy = null;
    if (policyId) {
      targetPolicy = policies.find(p => p._id === policyId);
    }

    // If specific policy requested via URL, select it.
    if (targetPolicy) {
      if (!activePolicy || activePolicy._id !== targetPolicy._id) {
        setActivePolicy(targetPolicy);
        setContent(targetPolicy.content || '');
        setPolicyTitle(targetPolicy.title || '');
        setOriginalTitle(targetPolicy.title || '');
        setOriginalContent(targetPolicy.content || '');
      }
    } else if (!activePolicy && policies.length > 0) {
      // Default to first policy if nothing selected and no URL param
      const first = policies[0];
      setActivePolicy(first);
      setContent(first.content || '');
      setPolicyTitle(first.title || '');
      setOriginalTitle(first.title || '');
      setOriginalContent(first.content || '');
    }
  }, [policies, location.search]);

  // Validate if title is unique (excluding current policy)
  const isTitleUnique = (title, currentPolicyId = null) => {
    const trimmedTitle = title.trim().toLowerCase();
    return !policies.some(
      policy =>
        policy.title.trim().toLowerCase() === trimmedTitle &&
        policy._id !== currentPolicyId
    );
  };

  // Add new policy - creates a temporary draft
  const handleAddPolicy = () => {
    // Create a temporary new policy object (not saved to backend yet)
    const newPolicyDraft = {
      _id: `temp-${Date.now()}`, // Temporary ID
      title: 'New Policy',
      content: '# New Policy\n\nAdd your policy content here...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemp: true // Flag to identify unsaved policy
    };

    // Add to local state only
    const updatedPolicies = [...policies, newPolicyDraft];
    setPolicies(updatedPolicies);
    setActivePolicy(newPolicyDraft);
    setContent(newPolicyDraft.content);
    setPolicyTitle(newPolicyDraft.title);
    setOriginalTitle(newPolicyDraft.title);
    setOriginalContent(newPolicyDraft.content);
    setIsNewPolicy(true);
    setEditingContent(true);
    setEditingTitle(true);
    setTitleError('');
    setContentError('');
  };

  // Delete policy
  const handleDeletePolicy = async (id) => {
    try {
      // If it's a temporary policy, just remove from state
      if (id.startsWith('temp-')) {
        const updatedPolicies = policies.filter(policy => policy._id !== id);
        setPolicies(updatedPolicies);
        if (activePolicy && activePolicy._id === id) {
          if (updatedPolicies.length > 0) {
            const firstRealPolicy = updatedPolicies[0];
            setActivePolicy(firstRealPolicy);
            setContent(firstRealPolicy.content || '');
            setPolicyTitle(firstRealPolicy.title || '');
            setOriginalTitle(firstRealPolicy.title || '');
            setOriginalContent(firstRealPolicy.content || '');
          } else {
            setActivePolicy(null);
            setContent('');
            setPolicyTitle('');
            setOriginalTitle('');
            setOriginalContent('');
          }
        }
        setIsNewPolicy(false);
        setShowDeleteConfirm(false);
        setPolicyToDelete(null);
        return;
      }

      // Delete from backend
      await policyAPI.remove(id);
      const updatedPolicies = policies.filter(policy => policy._id !== id);
      setPolicies(updatedPolicies);
      if (activePolicy && activePolicy._id === id) {
        if (updatedPolicies.length > 0) {
          setActivePolicy(updatedPolicies[0]);
          setContent(updatedPolicies[0].content || '');
          setPolicyTitle(updatedPolicies[0].title || '');
          setOriginalTitle(updatedPolicies[0].title || '');
          setOriginalContent(updatedPolicies[0].content || '');
        } else {
          setActivePolicy(null);
          setContent('');
          setPolicyTitle('');
          setOriginalTitle('');
          setOriginalContent('');
        }
      }
    } catch (err) {
      console.error('Failed to delete policy:', err);
      alert('Failed to delete policy. Please try again.');
    } finally {
      setShowDeleteConfirm(false);
      setPolicyToDelete(null);
    }
  };

  // Save policy changes with comprehensive validation
  const handleSaveChanges = async () => {
    if (!activePolicy) return;

    setIsSaving(true);
    let hasError = false;

    // Validate title
    const trimmedTitle = policyTitle.trim();
    if (trimmedTitle.length === 0) {
      setTitleError('Title cannot be empty');
      hasError = true;
    } else if (trimmedTitle.length < 3) {
      setTitleError('Title must be at least 3 characters');
      hasError = true;
    } else if (trimmedTitle.length > 100) {
      setTitleError('Title must not exceed 100 characters');
      hasError = true;
    } else if (!isTitleUnique(trimmedTitle, activePolicy._id)) {
      setTitleError('A policy with this title already exists');
      hasError = true;
    } else {
      setTitleError('');
    }

    // Validate content
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      setContentError('Content cannot be empty');
      hasError = true;
    } else if (trimmedContent.length < 25) {
      setContentError('Content must be at least 25 characters');
      hasError = true;
    } else if (trimmedContent.length > 50000) {
      setContentError('Content must not exceed 50,000 characters');
      hasError = true;
    } else {
      setContentError('');
    }

    if (hasError) {
      setIsSaving(false);
      return;
    }

    try {
      let updated;

      // If it's a new temporary policy, create it
      if (activePolicy.isTemp || activePolicy._id.startsWith('temp-')) {
        const res = await policyAPI.create({
          title: trimmedTitle,
          content: trimmedContent
        });
        updated = res.data;

        // Remove temp policy and add real one
        const updatedPolicies = policies
          .filter(p => p._id !== activePolicy._id)
          .concat(updated);
        setPolicies(updatedPolicies);
        setIsNewPolicy(false);
      } else {
        // Update existing policy
        const res = await policyAPI.update(activePolicy._id, {
          title: trimmedTitle,
          content: trimmedContent
        });
        updated = res.data;

        const updatedPolicies = policies.map(policy =>
          policy._id === updated._id ? updated : policy
        );
        setPolicies(updatedPolicies);
      }

      setActivePolicy(updated);
      setOriginalTitle(updated.title);
      setOriginalContent(updated.content);
      setPolicyTitle(updated.title);
      setContent(updated.content);
      setEditingContent(false);
      setEditingTitle(false);
      setTitleError('');
      setContentError('');
    } catch (err) {
      console.error('Failed to save policy:', err);
      if (err.response?.data?.message) {
        alert(`Error: ${err.response.data.message}`);
      } else {
        alert('Failed to save policy. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle policy selection
  const handleSelectPolicy = (policy) => {
    // If currently editing a new policy, warn user
    if (isNewPolicy && activePolicy?.isTemp) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes. Switching policies will discard them. Continue?'
      );
      if (!confirmSwitch) return;

      // Remove temp policy from list
      const updatedPolicies = policies.filter(p => p._id !== activePolicy._id);
      setPolicies(updatedPolicies);
      setIsNewPolicy(false);
    }

    setActivePolicy(policy);
    setContent(policy.content);
    setPolicyTitle(policy.title);
    setOriginalTitle(policy.title);
    setOriginalContent(policy.content);
    setEditingContent(false);
    setEditingTitle(false);
    setTitleError('');
    setContentError('');
  };

  // Cancel title editing
  const handleCancelTitleEdit = () => {
    setPolicyTitle(originalTitle);
    setEditingTitle(false);
    setTitleError('');
  };

  // Cancel content editing
  const handleCancelContentEdit = () => {
    // If it's a new unsaved policy, remove it completely
    if (isNewPolicy && activePolicy?.isTemp) {
      const updatedPolicies = policies.filter(p => p._id !== activePolicy._id);
      setPolicies(updatedPolicies);

      if (updatedPolicies.length > 0) {
        const firstPolicy = updatedPolicies[0];
        setActivePolicy(firstPolicy);
        setContent(firstPolicy.content);
        setPolicyTitle(firstPolicy.title);
        setOriginalTitle(firstPolicy.title);
        setOriginalContent(firstPolicy.content);
      } else {
        setActivePolicy(null);
        setContent('');
        setPolicyTitle('');
        setOriginalTitle('');
        setOriginalContent('');
      }

      setIsNewPolicy(false);
      setEditingContent(false);
      setEditingTitle(false);
      setContentError('');
      setTitleError('');
      return;
    }

    // For existing policies, just revert changes
    setContent(originalContent);
    setPolicyTitle(originalTitle);
    setEditingContent(false);
    setEditingTitle(false);
    setContentError('');
    setTitleError('');
  };

  // Handle content editing
  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Real-time validation feedback
    if (newContent.trim().length === 0) {
      setContentError('Content cannot be empty');
    } else if (newContent.trim().length < 25) {
      setContentError(`Content must be at least 25 characters (current: ${newContent.trim().length})`);
    } else if (newContent.trim().length > 50000) {
      setContentError('Content must not exceed 50,000 characters');
    } else {
      setContentError('');
    }
  };

  // Handle title editing
  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setPolicyTitle(newTitle);

    // Real-time validation feedback
    if (newTitle.trim().length === 0) {
      setTitleError('Title cannot be empty');
    } else if (newTitle.trim().length < 3) {
      setTitleError('Title must be at least 3 characters');
    } else if (newTitle.trim().length > 100) {
      setTitleError('Title must not exceed 100 characters');
    } else if (!isTitleUnique(newTitle, activePolicy?._id)) {
      setTitleError('A policy with this title already exists');
    } else {
      setTitleError('');
    }
  };

  // Format markdown content for display
  const formatContentForDisplay = (text) => {
    if (!text) return '';

    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mb-3">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-medium mt-3 mb-2">$1</h3>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n---\n/g, '<hr class="my-4 border-gray-300">');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Policy Content */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {activePolicy ? (
                <>
                  {/* Policy Title Bar */}
                  <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        {editingTitle ? (
                          <div>
                            <input
                              type="text"
                              value={policyTitle}
                              onChange={handleTitleChange}
                              className={`w-full px-3 py-2 border rounded-lg text-lg font-semibold ${titleError ? 'border-red-500' : 'border-gray-300'
                                }`}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveChanges();
                                }
                              }}
                            />
                            {titleError && (
                              <p className="text-red-500 text-sm mt-1">{titleError}</p>
                            )}
                          </div>
                        ) : (
                          <h2 className="text-lg font-semibold text-gray-900">
                            {policyTitle}
                          </h2>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          Updated: {activePolicy.updatedAt ? new Date(activePolicy.updatedAt).toISOString().split('T')[0] : ''}
                        </span>
                        {!isReadOnly && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (editingTitle) {
                                  handleSaveChanges();
                                } else {
                                  setOriginalTitle(policyTitle);
                                  setEditingTitle(true);
                                }
                              }}
                              disabled={isSaving}
                              className={`p-2 ${isSaving ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-[#262760]'}`}

                              title={editingTitle ? 'Save Title' : 'Edit Title'}
                            >
                              {editingTitle ? (
                                <CheckIcon className="h-4 w-4" />
                              ) : (
                                <PencilIcon className="h-4 w-4" />
                              )}
                            </button>
                            {editingTitle && !isSaving && (
                              <button
                                onClick={handleCancelTitleEdit}
                                className="p-2 text-gray-600 hover:text-red-600"
                                title="Cancel Edit"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-6">
                    {editingContent ? (
                      <div>
                        <textarea
                          value={content}
                          onChange={handleContentChange}
                          className={`w-full h-[400px] p-4 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-[#262760] font-mono text-sm ${contentError ? 'border-red-500' : 'border-gray-300'
                            }`}

                          placeholder="# Enter policy content here"
                        />
                        {contentError && (
                          <p className="text-red-500 text-sm mt-1">{contentError}</p>
                        )}
                      </div>
                    ) : (
                      <div className="prose max-w-none">
                        <div
                          className="policy-content"
                          dangerouslySetInnerHTML={{ __html: formatContentForDisplay(content) }}
                        />
                      </div>
                    )}

                    {/* Edit Content Button */}
                    {!isReadOnly && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              if (editingContent) {
                                handleSaveChanges();
                              } else {
                                setOriginalContent(content);
                                setEditingContent(true);
                              }
                            }}
                            disabled={isSaving}
                            className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg ${isSaving
                              ? 'bg-gray-400 cursor-not-allowed'
                              : 'bg-[#262760] hover:bg-[#1e2050]'
                              } text-white transition-colors`}

                          >
                            {isSaving ? (
                              <>
                                <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                              </>
                            ) : editingContent ? (
                              <>
                                <CheckIcon className="h-4 w-4 mr-2" />
                                Save Content
                              </>
                            ) : (
                              <>
                                <PencilIcon className="h-4 w-4 mr-2" />
                                Edit Content
                              </>
                            )}
                          </button>
                          {editingContent && !isSaving && (
                            <button
                              onClick={handleCancelContentEdit}
                              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300"
                            >
                              <XMarkIcon className="h-4 w-4 mr-2" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Policy Selected</h3>
                  <p className="text-gray-500 mb-6">Select a policy from the list or create a new one</p>
                  {!isReadOnly && (
                    <button
                      onClick={handleAddPolicy}
                      className="inline-flex items-center px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050]"
                    >

                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create New Policy
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Policy List */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="text-base font-semibold text-gray-900">POLICIES LIST</h3>
              </div>

              <div className="p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                <div className="space-y-2">
                  {policies.map((policy) => (
                    <div
                      key={policy._id}
                      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${activePolicy?._id === policy._id
                        ? 'bg-blue-50 border border-[#262760]'
                        : 'hover:bg-gray-50 border border-transparent'
                        }`}

                      onClick={() => handleSelectPolicy(policy)}
                    >
                      <div className="flex items-center">
                        <DocumentTextIcon className={`h-4 w-4 mr-3 ${activePolicy?._id === policy._id ? 'text-[#262760]' : 'text-gray-400'
                          }`} />

                        <div>
                          <div className={`text-sm font-medium ${activePolicy?._id === policy._id ? 'text-[#262760]' : 'text-gray-700'
                            }`}>

                            {policy.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            Updated: {policy.updatedAt ? new Date(policy.updatedAt).toISOString().split('T')[0] : ''}
                          </div>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPolicyToDelete(policy._id);
                            setShowDeleteConfirm(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Empty state */}
                {policies.length === 0 && (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No policies yet</p>
                  </div>
                )}

                {/* Add Policy Button */}
                <div className="mt-6">
                  {!isReadOnly && (
                    <button
                      onClick={handleAddPolicy}
                      className="w-full flex items-center justify-center px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#262760] hover:text-[#262760] hover:bg-blue-50 transition-colors group"
                    >
                      <PlusIcon className="h-4 w-4 mr-2 group-hover:text-[#262760]" />
                      <span className="text-sm font-medium">Add New Policy</span>
                    </button>

                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Policy</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this policy? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPolicyToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePolicy(policyToDelete)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS */}
      <style>{`
        .policy-content h1 {
          font-size: 1.25rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.75rem;
        }

        .policy-content h2 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .policy-content h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #4b5563;
          margin-top: 0.75rem;
          margin-bottom: 0.25rem;
        }

        .policy-content p {
          color: #6b7280;
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }

        .policy-content ul {
          margin-left: 1rem;
          margin-bottom: 0.5rem;
        }

        .policy-content li {
          color: #6b7280;
          margin-bottom: 0.25rem;
          position: relative;
        }

        .policy-content li:before {
          content: "•";
          color: #262760;
          font-weight: bold;

          position: absolute;
          left: -1rem;
        }

        .policy-content hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1rem 0;
        }

        .policy-content strong {
          font-weight: 600;
          color: #111827;
        }

        .policy-content em {
          font-style: italic;
        }

        .prose {
          color: #374151;
        }
      `}</style>
    </div>
  );
};

export default AdminPolicyPortal;
