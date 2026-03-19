// src/screens/Performance/SelfAppraisal.tsx
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  RefreshControl,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommonHeader from '../../components/CommonHeader';
import WorkflowTracker from '../../components/Performance/WorkflowTracker';
import { performanceAPI } from '../../services/api';
import { APPRAISAL_STAGES, getWorkflowForUser } from '../../utils/performanceUtils';

// Types
type RootStackParamList = {
  SelfAppraisal: undefined;
  Dashboard: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'SelfAppraisal'>;

interface Project {
  id?: number;
  name: string;
  contribution: string;
}

interface Appraisal {
  id?: number;
  year: string;
  appraiser?: string;
  status: string;
  releaseLetter?: string;
  projects: Project[];
  overallContribution: string;
  employeeId?: string;
  employeeName?: string;
  designation?: string;
  department?: string;
}

interface User {
  id: string;
  name: string;
  employeeId: string;
  designation: string;
  department: string;
  role: string;
  email: string;
}

// Colors
const COLORS = {
  primary: '#262760',
  primaryDark: '#1e2050',
  primaryLight: '#4f4b8c',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#9CA3AF',
  lighterGray: '#E5E7EB',
  background: '#F9FAFB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
};

const SelfAppraisal = () => {
  const navigation = useNavigation<NavigationProp>();
  
  // View State: 'list' or 'edit'
  const [viewMode, setViewMode] = useState<'list' | 'edit'>('list');
  
  // User state
  const [user, setUser] = useState<User>({
    id: '',
    name: '',
    employeeId: '',
    designation: '',
    department: '',
    role: '',
    email: '',
  });

  // Workflow state based on user
  const [userWorkflow, setUserWorkflow] = useState<any>(null);

  // Appraisals List State
  const [appraisals, setAppraisals] = useState<Appraisal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form Data State
  const [formData, setFormData] = useState<Appraisal>({
    year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
    status: 'Draft',
    projects: [],
    overallContribution: '',
  });

  // Modal States
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showContributionModal, setShowContributionModal] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project>({ name: '', contribution: '' });
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Available years for dropdown
  const years = ['2023-24', '2024-25', '2025-26', '2026-27', '2027-28'];

  // Load user data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  // Update workflow when user data changes
  useEffect(() => {
    if (user.department && user.designation) {
      const workflow = getWorkflowForUser(user.department, user.designation);
      setUserWorkflow(workflow);
      console.log('User workflow:', workflow);
    }
  }, [user.department, user.designation]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (viewMode === 'list') {
        fetchAppraisals();
      }
    }, [viewMode])
  );

  const loadUserData = async () => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        setUser({
          id: userData.id || '',
          name: userData.name || '',
          employeeId: userData.employeeId || '',
          designation: userData.designation || userData.role || '',
          department: userData.department || '',
          role: userData.role || '',
          email: userData.email || '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const fetchAppraisals = async () => {
    try {
      setLoading(true);
      const response = await performanceAPI.getMySelfAppraisals();
      setAppraisals(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch appraisals', error);
      // Mock data for demo
      setAppraisals([
        {
          id: 1,
          year: '2024-25',
          appraiser: 'John Doe',
          status: 'Submitted',
          releaseLetter: 'appraisal_2024-25.pdf',
          projects: [
            { id: 101, name: 'Project Alpha', contribution: 'Lead developer, implemented core features.' },
            { id: 102, name: 'Project Beta', contribution: 'Fixed critical bugs and improved performance.' }
          ],
          overallContribution: 'Successfully delivered two major projects and mentored junior developers.'
        },
        {
          id: 2,
          year: '2023-24',
          appraiser: 'Jane Smith',
          status: 'Released',
          releaseLetter: 'appraisal_2023-24.pdf',
          projects: [
            { id: 201, name: 'Legacy System Migration', contribution: 'Migrated database to new server.' }
          ],
          overallContribution: 'Completed migration ahead of schedule.'
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppraisals();
  };

  const handleNewAppraisal = () => {
    setFormData({
      year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(-2),
      status: 'Draft',
      projects: [],
      overallContribution: '',
    });
    setViewMode('edit');
  };

  const handleEditAppraisal = async (appraisal: Appraisal) => {
    try {
      setLoading(true);
      // Convert number id to string for API call
      const id = String(appraisal.id);
      const response = await performanceAPI.getSelfAppraisalById(id);
      setFormData(response.data);
      setViewMode('edit');
    } catch (error: any) {
      console.error('Failed to fetch appraisal details', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch appraisal details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAppraisal = (id: number) => {
    Alert.alert(
      'Delete Appraisal',
      'Are you sure you want to delete this appraisal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Convert number id to string for API call
              await performanceAPI.deleteSelfAppraisal(String(id));
              fetchAppraisals();
              Alert.alert('Success', 'Appraisal deleted successfully');
            } catch (error: any) {
              console.error('Failed to delete appraisal', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete appraisal');
            }
          }
        }
      ]
    );
  };

  const handleDownloadLetter = (fileName?: string) => {
    Alert.alert('Download', `Downloading ${fileName || 'appraisal letter'}...`);
  };

  // Project Modal Handlers
  const openAddProjectModal = () => {
    setCurrentProject({ name: '', contribution: '' });
    setIsEditingProject(false);
    setEditingIndex(null);
    setShowProjectModal(true);
  };

  const openEditProjectModal = (project: Project, index: number) => {
    setCurrentProject(project);
    setIsEditingProject(true);
    setEditingIndex(index);
    setShowProjectModal(true);
  };

  const saveProject = () => {
    if (!currentProject.name.trim()) {
      Alert.alert('Error', 'Please enter project name');
      return;
    }
    if (!currentProject.contribution.trim()) {
      Alert.alert('Error', 'Please enter your contribution');
      return;
    }

    if (isEditingProject && editingIndex !== null) {
      // Update existing project
      const updatedProjects = [...formData.projects];
      updatedProjects[editingIndex] = {
        name: currentProject.name,
        contribution: currentProject.contribution,
      };
      setFormData({ ...formData, projects: updatedProjects });
    } else {
      // Add new project
      setFormData({
        ...formData,
        projects: [...formData.projects, { name: currentProject.name, contribution: currentProject.contribution }]
      });
    }
    setShowProjectModal(false);
  };

  const removeProject = (index: number) => {
    Alert.alert(
      'Remove Project',
      'Are you sure you want to remove this project?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedProjects = formData.projects.filter((_, i) => i !== index);
            setFormData({ ...formData, projects: updatedProjects });
          }
        }
      ]
    );
  };

  const handleSubmit = async (action: 'Save' | 'Submit') => {
    if (formData.projects.length === 0) {
      Alert.alert('Error', 'Please add at least one project');
      return;
    }

    if (!formData.overallContribution.trim()) {
      Alert.alert('Error', 'Please add overall contribution');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        ...formData,
        status: action === 'Submit' ? 'Submitted' : 'Draft',
        employeeId: user.employeeId,
        employeeName: user.name,
        designation: user.designation,
        department: user.department,
        workflow: userWorkflow, // Include workflow configuration
      };

      let response;
      if (formData.id) {
        // Convert number id to string for API call
        response = await performanceAPI.updateSelfAppraisal(String(formData.id), payload);
      } else {
        response = await performanceAPI.createSelfAppraisal(payload);
      }

      Alert.alert(
        'Success',
        `Self appraisal ${action === 'Submit' ? 'submitted' : 'saved'} successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              fetchAppraisals();
              setViewMode('list');
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('Failed to save appraisal', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save appraisal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (viewMode === 'edit') {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to go back?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => setViewMode('list') }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Render List View
  const renderListView = () => (
    <View style={styles.container}>
      <CommonHeader 
        title="Self Appraisal"
        showBack={true}
        onBack={handleBack}
        rightComponent={
          <TouchableOpacity onPress={handleNewAppraisal} style={styles.newButton}>
            <Icon name="add" size={24} color={COLORS.white} />
            <Text style={styles.newButtonText}>New</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading appraisals...</Text>
          </View>
        ) : appraisals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="assignment" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyText}>No appraisals found</Text>
            <Text style={styles.emptySubText}>Tap the New button to create your first appraisal</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {appraisals.map((item, index) => (
              <View key={String(item.id ?? index)} style={styles.appraisalCard}>
                <View style={styles.cardHeader}>
                  <View>
                    <Text style={styles.yearText}>FY {item.year}</Text>
                    {item.appraiser && (
                      <Text style={styles.appraiserText}>Appraiser: {item.appraiser}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, 
                    { backgroundColor: 
                      item.status === 'Submitted' ? COLORS.warning :
                      item.status === 'Released' ? COLORS.success :
                      item.status === 'Draft' ? COLORS.lightGray :
                      COLORS.info 
                    }
                  ]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleEditAppraisal(item)}
                  >
                    <Icon name="edit" size={20} color={COLORS.primary} />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => Alert.alert('Info', 'View details coming soon')}
                  >
                    <Icon name="visibility" size={20} color={COLORS.info} />
                    <Text style={styles.actionText}>View</Text>
                  </TouchableOpacity>

                  {item.releaseLetter && (
                    <TouchableOpacity 
                      style={styles.actionButton}
                      onPress={() => handleDownloadLetter(item.releaseLetter)}
                    >
                      <Icon name="download" size={20} color={COLORS.success} />
                      <Text style={styles.actionText}>Download</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDeleteAppraisal(item.id!)}
                  >
                    <Icon name="delete" size={20} color={COLORS.error} />
                    <Text style={styles.actionText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.projectsCount}>
                    {item.projects.length} Project{item.projects.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );

  // Render Edit View
  const renderEditView = () => (
    <View style={styles.container}>
      <CommonHeader 
        title="Self Appraisal"
        showBack={true}
        onBack={handleBack}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.editContainer}
      >
        <ScrollView style={styles.editContent} showsVerticalScrollIndicator={false}>
          {/* Workflow Tracker - Now passing stages correctly */}
          <View style={styles.section}>
            <WorkflowTracker 
             currentStageId="appraisee" 
              userFlow={APPRAISAL_STAGES}  // Pass stages directly as userFlow
              />
          </View>

          {/* Financial Year Selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Year</Text>
            <View style={styles.yearSelector}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearOption,
                    formData.year === year && styles.yearOptionSelected
                  ]}
                  onPress={() => setFormData({ ...formData, year })}
                >
                  <Text style={[
                    styles.yearOptionText,
                    formData.year === year && styles.yearOptionTextSelected
                  ]}>
                    {year}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Workflow Info Section (if available) */}
          {userWorkflow && (
            <View style={styles.workflowInfo}>
              <Text style={styles.workflowTitle}>Your Appraisal Workflow</Text>
              <View style={styles.workflowGrid}>
                <View style={styles.workflowItem}>
                  <Text style={styles.workflowLabel}>Appraiser</Text>
                  <Text style={styles.workflowValue}>{userWorkflow.appraiser}</Text>
                </View>
                <View style={styles.workflowItem}>
                  <Text style={styles.workflowLabel}>Reviewer</Text>
                  <Text style={styles.workflowValue}>{userWorkflow.reviewer}</Text>
                </View>
                <View style={styles.workflowItem}>
                  <Text style={styles.workflowLabel}>Director</Text>
                  <Text style={styles.workflowValue}>{userWorkflow.director}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Projects Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Key Projects</Text>
              <TouchableOpacity onPress={openAddProjectModal} style={styles.addButton}>
                <Icon name="add" size={20} color={COLORS.white} />
                <Text style={styles.addButtonText}>Add Project</Text>
              </TouchableOpacity>
            </View>

            {formData.projects.length === 0 ? (
              <View style={styles.emptyProjects}>
                <Icon name="folder-open" size={48} color={COLORS.lightGray} />
                <Text style={styles.emptyProjectsText}>No projects added yet</Text>
                <Text style={styles.emptyProjectsSubText}>Tap "Add Project" to get started</Text>
              </View>
            ) : (
              formData.projects.map((project, index) => (
                <View key={index} style={styles.projectCard}>
                  <View style={styles.projectHeader}>
                    <Text style={styles.projectName}>{index + 1}. {project.name}</Text>
                    <View style={styles.projectActions}>
                      <TouchableOpacity 
                        onPress={() => openEditProjectModal(project, index)}
                        style={styles.projectActionButton}
                      >
                        <Icon name="edit" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => removeProject(index)}
                        style={styles.projectActionButton}
                      >
                        <Icon name="delete" size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.projectContribution} numberOfLines={2}>
                    {project.contribution}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Overall Contribution Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Overall Contribution</Text>
              <TouchableOpacity 
                onPress={() => setShowContributionModal(true)}
                style={styles.editContributionButton}
              >
                <Icon 
                  name={formData.overallContribution ? "edit" : "add"} 
                  size={20} 
                  color={COLORS.primary} 
                />
                <Text style={styles.editContributionText}>
                  {formData.overallContribution ? 'Edit' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>

            {formData.overallContribution ? (
              <View style={styles.contributionCard}>
                <Text style={styles.contributionText}>{formData.overallContribution}</Text>
              </View>
            ) : (
              <View style={styles.emptyContribution}>
                <Icon name="description" size={32} color={COLORS.lightGray} />
                <Text style={styles.emptyContributionText}>No contribution summary added</Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.saveButton, submitting && styles.buttonDisabled]}
              onPress={() => handleSubmit('Save')}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Icon name="save" size={20} color={COLORS.white} />
                  <Text style={styles.buttonText}>Save Draft</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={() => handleSubmit('Submit')}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Icon name="send" size={20} color={COLORS.white} />
                  <Text style={styles.buttonText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Project Modal */}
      <Modal
        visible={showProjectModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowProjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isEditingProject ? 'Edit Project' : 'Add Project'}
              </Text>
              <TouchableOpacity onPress={() => setShowProjectModal(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Project Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter project name"
                  placeholderTextColor={COLORS.lightGray}
                  value={currentProject.name}
                  onChangeText={(text) => setCurrentProject({ ...currentProject, name: text })}
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Your Contribution</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe your contribution..."
                  placeholderTextColor={COLORS.lightGray}
                  value={currentProject.contribution}
                  onChangeText={(text) => setCurrentProject({ ...currentProject, contribution: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowProjectModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveProject}
              >
                <Text style={styles.modalSaveText}>
                  {isEditingProject ? 'Update' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Contribution Modal */}
      <Modal
        visible={showContributionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContributionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Overall Contribution</Text>
              <TouchableOpacity onPress={() => setShowContributionModal(false)}>
                <Icon name="close" size={24} color={COLORS.gray} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Executive Summary</Text>
                <TextInput
                  style={[styles.input, styles.largeTextArea]}
                  placeholder="Summarize your overall performance, achievements, and contributions..."
                  placeholderTextColor={COLORS.lightGray}
                  value={formData.overallContribution}
                  onChangeText={(text) => setFormData({ ...formData, overallContribution: text })}
                  multiline
                  numberOfLines={8}
                  textAlignVertical="top"
                  maxLength={2000}
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowContributionModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={() => setShowContributionModal(false)}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  return viewMode === 'list' ? renderListView() : renderEditView();
};

// Add all the styles here (same as before)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.lightGray,
    marginTop: 8,
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  newButtonText: {
    color: COLORS.white,
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
  },
  appraisalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  yearText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  appraiserText: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderTopWidth: 1,
    borderTopColor: COLORS.lighterGray,
    paddingTop: 12,
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lighterGray,
    paddingTop: 8,
  },
  projectsCount: {
    fontSize: 12,
    color: COLORS.lightGray,
  },
  editContainer: {
    flex: 1,
  },
  editContent: {
    padding: 16,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  yearSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  yearOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.lighterGray,
  },
  yearOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  yearOptionText: {
    fontSize: 13,
    color: COLORS.gray,
  },
  yearOptionTextSelected: {
    color: COLORS.white,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 12,
    marginLeft: 4,
  },
  emptyProjects: {
    alignItems: 'center',
    padding: 24,
  },
  emptyProjectsText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 8,
  },
  emptyProjectsSubText: {
    fontSize: 12,
    color: COLORS.lightGray,
    marginTop: 4,
  },
  projectCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  projectName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    flex: 1,
  },
  projectActions: {
    flexDirection: 'row',
  },
  projectActionButton: {
    padding: 4,
    marginLeft: 8,
  },
  projectContribution: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
  },
  editContributionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  editContributionText: {
    fontSize: 12,
    color: COLORS.primary,
    marginLeft: 4,
  },
  contributionCard: {
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
  },
  contributionText: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  emptyContribution: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  emptyContributionText: {
    fontSize: 13,
    color: COLORS.lightGray,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 32,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray,
    paddingVertical: 14,
    borderRadius: 8,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Workflow Info Styles
  workflowInfo: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '20',
  },
  workflowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 12,
  },
  workflowGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workflowItem: {
    flex: 1,
    alignItems: 'center',
  },
  workflowLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 4,
  },
  workflowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lighterGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.lighterGray,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lighterGray,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.black,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  largeTextArea: {
    height: 200,
    textAlignVertical: 'top',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  modalCancelText: {
    color: COLORS.gray,
    fontSize: 14,
  },
  modalSaveButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  modalSaveText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
  },
});

export default SelfAppraisal;