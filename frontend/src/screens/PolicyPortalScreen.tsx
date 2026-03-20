// screens/PolicyPortalScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import IconCommunity from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import { policyAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import RenderHTML from 'react-native-render-html';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#0A0F2C',
  secondary: '#1A237E',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#666666',
  lightGray: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  background: '#F9FAFB',
  cardBg: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  filterBg: '#F9FAFB',
  red: '#EF4444',
  redLight: '#FEE2E2',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
  indigoDark: '#262760',
  blue: '#3B82F6',
  blueLight: '#EBF5FF',
  green: '#10B981',
  greenLight: '#E8F5E9',
  purple: '#9B59B6',
  purpleLight: '#F3E8FF',
  pink: '#EC4899',
  pinkLight: '#FCE7F3',
  emerald: '#10B981',
  emeraldLight: '#D1FAE5',
  shadow: '#000000',
};

interface Policy {
  _id: string;
  title: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  isTemp?: boolean;
}

const PolicyPortalScreen = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activePolicy, setActivePolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Edit states
  const [editingContent, setEditingContent] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [content, setContent] = useState('');
  const [policyTitle, setPolicyTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isNewPolicy, setIsNewPolicy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');

  // Delete modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<string | null>(null);

  // Get user role from session storage
  const user = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);
  const role = user.role || 'employees';
  const isReadOnly = role === 'employees' || role === 'projectmanager';

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await policyAPI.list();
      const items = Array.isArray(res.data) ? res.data : [];
      setPolicies(items);
      
      // Select first policy if available and no active policy
      if (items.length > 0 && !activePolicy) {
        const first = items[0];
        setActivePolicy(first);
        setContent(first.content || '');
        setPolicyTitle(first.title || '');
        setOriginalTitle(first.title || '');
        setOriginalContent(first.content || '');
      }
    } catch (err: any) {
      console.error('Failed to fetch policies:', err);
      setError(err.response?.data?.message || 'Failed to load policies');
      Alert.alert('Error', 'Failed to load policies. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPolicies();
  };

  // Validate if title is unique (excluding current policy)
  const isTitleUnique = (title: string, currentPolicyId: string | null = null): boolean => {
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
    const newPolicyDraft: Policy = {
      _id: `temp-${Date.now()}`,
      title: 'New Policy',
      content: '# New Policy\n\nAdd your policy content here...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemp: true,
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
  const handleDeletePolicy = async (id: string) => {
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
      Alert.alert('Success', 'Policy deleted successfully');
    } catch (err: any) {
      console.error('Failed to delete policy:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to delete policy. Please try again.');
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
      let updated: Policy;

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
        Alert.alert('Success', 'Policy created successfully');
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
        Alert.alert('Success', 'Policy updated successfully');
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
    } catch (err: any) {
      console.error('Failed to save policy:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to save policy. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle policy selection
  const handleSelectPolicy = (policy: Policy) => {
    // If currently editing a new policy, warn user
    if (isNewPolicy && activePolicy?.isTemp) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Switching policies will discard them. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              // Remove temp policy from list
              const updatedPolicies = policies.filter(p => p._id !== activePolicy._id);
              setPolicies(updatedPolicies);
              setIsNewPolicy(false);
              
              setActivePolicy(policy);
              setContent(policy.content);
              setPolicyTitle(policy.title);
              setOriginalTitle(policy.title);
              setOriginalContent(policy.content);
              setEditingContent(false);
              setEditingTitle(false);
              setTitleError('');
              setContentError('');
            }
          }
        ]
      );
      return;
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
  const handleContentChange = (text: string) => {
    setContent(text);
    
    // Real-time validation feedback
    if (text.trim().length === 0) {
      setContentError('Content cannot be empty');
    } else if (text.trim().length < 25) {
      setContentError(`Content must be at least 25 characters (current: ${text.trim().length})`);
    } else if (text.trim().length > 50000) {
      setContentError('Content must not exceed 50,000 characters');
    } else {
      setContentError('');
    }
  };

  // Handle title editing
  const handleTitleChange = (text: string) => {
    setPolicyTitle(text);
    
    // Real-time validation feedback
    if (text.trim().length === 0) {
      setTitleError('Title cannot be empty');
    } else if (text.trim().length < 3) {
      setTitleError('Title must be at least 3 characters');
    } else if (text.trim().length > 100) {
      setTitleError('Title must not exceed 100 characters');
    } else if (!isTitleUnique(text, activePolicy?._id)) {
      setTitleError('A policy with this title already exists');
    } else {
      setTitleError('');
    }
  };

  // Format markdown content to HTML for display
  const formatContentForDisplay = (text: string): string => {
    if (!text) return '';
    
    return text
      .replace(/^# (.*$)/gm, '<h1 style="font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 12px;">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 style="font-size: 18px; font-weight: 600; color: #374151; margin-top: 16px; margin-bottom: 8px;">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 style="font-size: 16px; font-weight: 600; color: #4B5563; margin-top: 12px; margin-bottom: 4px;">$1</h3>')
      .replace(/^- (.*$)/gm, '<li style="margin-left: 16px; margin-bottom: 4px;">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 600; color: #111827;">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
      .replace(/\n\n/g, '</p><p style="color: #6B7280; margin-bottom: 8px; line-height: 1.5;">')
      .replace(/\n---\n/g, '<hr style="border: none; border-top: 1px solid #E5E7EB; margin: 16px 0;">');
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader title="Policy Portal" showBack={true} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        <View style={styles.container}>
          <View style={styles.mainLayout}>
            {/* Left Column - Policy Content */}
            <View style={styles.contentColumn}>
              <View style={styles.policyCard}>
                {activePolicy ? (
                  <>
                    {/* Policy Title Bar */}
                    <View style={styles.titleBar}>
                      <View style={styles.titleContainer}>
                        {editingTitle ? (
                          <View style={styles.titleEditContainer}>
                            <TextInput
                              value={policyTitle}
                              onChangeText={handleTitleChange}
                              style={[styles.titleInput, titleError && styles.inputError]}
                              placeholder="Policy Title"
                              placeholderTextColor={COLORS.gray}
                              onSubmitEditing={handleSaveChanges}
                            />
                            {titleError && (
                              <Text style={styles.errorText}>{titleError}</Text>
                            )}
                          </View>
                        ) : (
                          <Text style={styles.titleText}>{policyTitle}</Text>
                        )}
                      </View>
                      <View style={styles.titleActions}>
                        <Text style={styles.updatedDate}>
                          Updated: {formatDate(activePolicy.updatedAt)}
                        </Text>
                        {!isReadOnly && (
                          <View style={styles.editActions}>
                            <TouchableOpacity
                              onPress={() => {
                                if (editingTitle) {
                                  handleSaveChanges();
                                } else {
                                  setOriginalTitle(policyTitle);
                                  setEditingTitle(true);
                                }
                              }}
                              disabled={isSaving}
                              style={styles.iconButton}
                            >
                              {editingTitle ? (
                                <Icon name="check" size={18} color={isSaving ? COLORS.gray : COLORS.indigo} />
                              ) : (
                                <Icon name="edit" size={18} color={COLORS.textSecondary} />
                              )}
                            </TouchableOpacity>
                            {editingTitle && !isSaving && (
                              <TouchableOpacity
                                onPress={handleCancelTitleEdit}
                                style={styles.iconButton}
                              >
                                <Icon name="close" size={18} color={COLORS.red} />
                              </TouchableOpacity>
                            )}
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Content Area */}
                    <View style={styles.contentArea}>
                      {editingContent ? (
                        <View>
                          <TextInput
                            value={content}
                            onChangeText={handleContentChange}
                            multiline
                            numberOfLines={20}
                            style={[styles.contentInput, contentError && styles.inputError]}
                            placeholder="# Enter policy content here"
                            placeholderTextColor={COLORS.gray}
                            textAlignVertical="top"
                          />
                          {contentError && (
                            <Text style={styles.errorText}>{contentError}</Text>
                          )}
                        </View>
                      ) : (
                        <ScrollView style={styles.contentDisplay}>
                          <RenderHTML
                            contentWidth={width - 64}
                            source={{ html: formatContentForDisplay(content) }}
                            baseStyle={styles.htmlContent}
                          />
                        </ScrollView>
                      )}

                      {/* Edit Content Button */}
                      {!isReadOnly && (
                        <View style={styles.editContentContainer}>
                          <View style={styles.editContentButtons}>
                            <TouchableOpacity
                              onPress={() => {
                                if (editingContent) {
                                  handleSaveChanges();
                                } else {
                                  setOriginalContent(content);
                                  setEditingContent(true);
                                }
                              }}
                              disabled={isSaving}
                              style={[styles.saveButton, isSaving && styles.disabledButton]}
                            >
                              {isSaving ? (
                                <ActivityIndicator size="small" color={COLORS.white} />
                              ) : editingContent ? (
                                <>
                                  <Icon name="check" size={16} color={COLORS.white} />
                                  <Text style={styles.buttonText}>Save Content</Text>
                                </>
                              ) : (
                                <>
                                  <Icon name="edit" size={16} color={COLORS.white} />
                                  <Text style={styles.buttonText}>Edit Content</Text>
                                </>
                              )}
                            </TouchableOpacity>
                            {editingContent && !isSaving && (
                              <TouchableOpacity
                                onPress={handleCancelContentEdit}
                                style={styles.cancelButton}
                              >
                                <Icon name="close" size={16} color={COLORS.textSecondary} />
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <Icon name="description" size={64} color={COLORS.lightGray} />
                    <Text style={styles.emptyTitle}>No Policy Selected</Text>
                    <Text style={styles.emptyText}>Select a policy from the list or create a new one</Text>
                    {!isReadOnly && (
                      <TouchableOpacity
                        onPress={handleAddPolicy}
                        style={styles.createButton}
                      >
                        <Icon name="add" size={18} color={COLORS.white} />
                        <Text style={styles.createButtonText}>Create New Policy</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Right Column - Policy List */}
            <View style={styles.listColumn}>
              <View style={styles.listCard}>
                <View style={styles.listHeader}>
                  <Text style={styles.listTitle}>POLICIES LIST</Text>
                </View>

                <ScrollView style={styles.policyList} showsVerticalScrollIndicator={true}>
                  {policies.map((policy) => (
                    <TouchableOpacity
                      key={policy._id}
                      onPress={() => handleSelectPolicy(policy)}
                      style={[
                        styles.policyItem,
                        activePolicy?._id === policy._id && styles.activePolicyItem,
                      ]}
                    >
                      <View style={styles.policyItemContent}>
                        <Icon
                          name="description"
                          size={18}
                          color={activePolicy?._id === policy._id ? COLORS.indigo : COLORS.gray}
                          style={styles.policyIcon}
                        />
                        <View style={styles.policyInfo}>
                          <Text
                            style={[
                              styles.policyTitle,
                              activePolicy?._id === policy._id && styles.activePolicyTitle,
                            ]}
                            numberOfLines={1}
                          >
                            {policy.title}
                          </Text>
                          <Text style={styles.policyDate}>
                            Updated: {formatDate(policy.updatedAt)}
                          </Text>
                        </View>
                      </View>
                      {!isReadOnly && (
                        <TouchableOpacity
                          onPress={() => {
                            setPolicyToDelete(policy._id);
                            setShowDeleteConfirm(true);
                          }}
                          style={styles.deleteIcon}
                        >
                          <Icon name="delete-outline" size={18} color={COLORS.gray} />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  ))}

                  {/* Empty state */}
                  {policies.length === 0 && (
                    <View style={styles.emptyListState}>
                      <Icon name="description" size={48} color={COLORS.lightGray} />
                      <Text style={styles.emptyListText}>No policies yet</Text>
                    </View>
                  )}

                  {/* Add Policy Button */}
                  {!isReadOnly && (
                    <View style={styles.addPolicyContainer}>
                      <TouchableOpacity
                        onPress={handleAddPolicy}
                        style={styles.addPolicyButton}
                      >
                        <Icon name="add" size={18} color={COLORS.indigo} />
                        <Text style={styles.addPolicyText}>Add New Policy</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowDeleteConfirm(false);
          setPolicyToDelete(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Icon name="warning" size={32} color={COLORS.error} />
              <Text style={styles.modalTitle}>Delete Policy</Text>
            </View>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete this policy? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setPolicyToDelete(null);
                }}
                style={styles.modalCancelButton}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => policyToDelete && handleDeletePolicy(policyToDelete)}
                style={styles.modalDeleteButton}
              >
                <Text style={styles.modalDeleteText}>Delete Policy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Policy • Portal • Documents • "
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  mainLayout: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 16,
  },
  contentColumn: {
    flex: 2,
  },
  listColumn: {
    flex: 1,
  },
  policyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    minHeight: 500,
  },
  titleBar: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: 16,
  },
  titleContainer: {
    marginBottom: 8,
  },
  titleEditContainer: {
    marginBottom: 4,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 8,
    backgroundColor: COLORS.white,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  titleActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updatedDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  contentArea: {
    padding: 16,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: COLORS.white,
    color: COLORS.textPrimary,
    minHeight: 400,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  contentDisplay: {
    maxHeight: 500,
  },
  htmlContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  editContentContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  editContentButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.indigo,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: COLORS.gray,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.indigo,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  listHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    padding: 12,
    backgroundColor: COLORS.filterBg,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  policyList: {
    maxHeight: 500,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    cursor: 'pointer',
  },
  activePolicyItem: {
    backgroundColor: COLORS.indigoLight,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.indigo,
  },
  policyItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  policyIcon: {
    marginRight: 12,
  },
  policyInfo: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  activePolicyTitle: {
    color: COLORS.indigo,
    fontWeight: '600',
  },
  policyDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  deleteIcon: {
    padding: 4,
  },
  emptyListState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  addPolicyContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  addPolicyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  addPolicyText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.indigo,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  modalDeleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.error,
    borderRadius: 8,
  },
  modalDeleteText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.white,
  },
});

export default PolicyPortalScreen;