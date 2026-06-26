import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { supportAPI } from '../../services/api';
import DocumentPicker from 'react-native-document-picker';

const CATEGORIES = [
  'Attendance Issue',
  'Leave Management Issue',
  'Timesheet Issue',
  'Payroll & Salary Issue',
  'PF/ESI Issue',
  'Appraisal Issue',
  'Employee Letter/Document Issue/download issues',
  'Portal Bug/Error',
  'Technical Support',
  'Exit & Relieving Process Issue',
  'HR Support',
  'General Query',
  'Other'
];

const PRIORITIES = [
  { label: 'Low', color: '#10b981', bg: '#ecfdf5' },
  { label: 'Medium', color: '#f59e0b', bg: '#fef3c7' },
  { label: 'High', color: '#f97316', bg: '#ffedd5' },
  { label: 'Critical', color: '#ef4444', bg: '#fee2e2' }
];

const RaiseTicketScreen = () => {
  const navigation = useNavigation() as any;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    priority: 'Medium',
    subject: '',
    description: ''
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const handleSelectAttachments = async () => {
    if (attachments.length >= 5) {
      Alert.alert('Limit Reached', 'You can only upload up to 5 files.');
      return;
    }
    try {
      const results = await DocumentPicker.pick({
        type: [
          DocumentPicker.types.images,
          DocumentPicker.types.pdf,
          Platform.OS === 'ios' ? 'com.microsoft.word.doc' : 'application/msword',
          Platform.OS === 'ios' ? 'org.openxmlformats.wordprocessingml.document' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ],
        allowMultiSelection: true,
      });

      if (results && results.length > 0) {
        // Validation: 10MB per file
        const validFiles = results.filter(file => {
          const sizeInMB = (file.size || 0) / (1024 * 1024);
          if (sizeInMB > 10) {
            Alert.alert('File Too Large', `${file.name} exceeds the 10MB limit.`);
            return false;
          }
          return true;
        });

        if (attachments.length + validFiles.length > 5) {
          Alert.alert('Limit Reached', 'You can only upload up to 5 files in total.');
          const spaceLeft = 5 - attachments.length;
          setAttachments([...attachments, ...validFiles.slice(0, spaceLeft)]);
        } else {
          setAttachments([...attachments, ...validFiles]);
        }
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('Error picking document:', err);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard this ticket request?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.category || !formData.subject || !formData.description) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    try {
      const submissionData = new FormData();
      submissionData.append('category', formData.category);
      submissionData.append('priority', formData.priority);
      submissionData.append('subject', formData.subject);
      submissionData.append('description', formData.description);

      attachments.forEach((file: any) => {
        submissionData.append('attachments', {
          uri: file.uri,
          type: file.type || 'application/octet-stream',
          name: file.name || 'file',
        } as any);
      });

      await supportAPI.createTicket(submissionData);
      
      Alert.alert('Success', 'Ticket raised successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to raise ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (!type) return 'file-outline';
    if (type.startsWith('image/')) return 'image';
    if (type.includes('pdf')) return 'file-pdf-box';
    if (type.includes('word') || type.includes('msword')) return 'file-word';
    return 'file-document';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} nestedScrollEnabled={true}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Raise a Ticket</Text>
          <TouchableOpacity 
            style={styles.historyButton}
            onPress={() => navigation.navigate('SupportDashboard')}
          >
            <MaterialCommunityIcons name="history" size={18} color="#4F1A6F" />
            <Text style={styles.historyButtonText}>History</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>Please fill out the form below to register your concern.</Text>
      </View>

      {/* Issue Category */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Issue Category <Text style={styles.required}>*</Text></Text>
        <TouchableOpacity 
          style={[styles.dropdownButton, showCategoryDropdown && styles.dropdownButtonActive]}
          onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
        >
          <Text style={formData.category ? styles.dropdownText : styles.dropdownPlaceholder}>
            {formData.category || 'Select Category'}
          </Text>
          <MaterialCommunityIcons name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'} size={24} color="#64748b" />
        </TouchableOpacity>
        
        {showCategoryDropdown && (
          <ScrollView 
            style={styles.dropdownList} 
            nestedScrollEnabled={true} 
            keyboardShouldPersistTaps="handled"
          >
            {CATEGORIES.map((cat, idx) => (
              <TouchableOpacity 
                key={idx} 
                style={[styles.dropdownItem, formData.category === cat && styles.dropdownItemSelect]}
                onPress={() => {
                  setFormData({ ...formData, category: cat });
                  setShowCategoryDropdown(false);
                }}
              >
                <Text style={[styles.dropdownItemText, formData.category === cat && styles.dropdownItemTextSelect]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Priority Level */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Priority Level</Text>
        <View style={styles.priorityContainer}>
          {PRIORITIES.map(p => {
            const isActive = formData.priority === p.label;
            return (
              <TouchableOpacity
                key={p.label}
                style={[
                  styles.priorityButton,
                  isActive && { backgroundColor: p.color, borderColor: p.color }
                ]}
                onPress={() => setFormData({ ...formData, priority: p.label })}
              >
                <Text style={[
                  styles.priorityText,
                  { color: isActive ? '#fff' : '#64748b' }
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Subject Line */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Subject Line <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="Brief summary of the issue"
          placeholderTextColor="#94a3b8"
          value={formData.subject}
          onChangeText={t => setFormData({ ...formData, subject: t })}
        />
      </View>

      {/* Description */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Full Description <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Provide as much detail as possible..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={formData.description}
          onChangeText={t => setFormData({ ...formData, description: t })}
        />
      </View>

      {/* Evidence & Attachments */}
      <View style={styles.formGroup}>
        <Text style={styles.label}>Evidence & Attachments</Text>
        <TouchableOpacity 
          style={styles.uploadZone}
          onPress={handleSelectAttachments}
        >
          <MaterialCommunityIcons name="cloud-upload-outline" size={36} color="#4F1A6F" />
          <Text style={styles.uploadTitle}>Click to browse attachments</Text>
          <Text style={styles.uploadSubtitle}>Upload up to 5 files (Max 10MB each)</Text>
        </TouchableOpacity>

        {attachments.length > 0 && (
          <View style={styles.attachmentsList}>
            {attachments.map((file, idx) => (
              <View key={idx} style={styles.attachmentCard}>
                <View style={styles.attachmentInfo}>
                  <MaterialCommunityIcons 
                    name={getFileIcon(file.type)} 
                    size={24} 
                    color="#4F1A6F" 
                    style={styles.attachmentIcon} 
                  />
                  <View style={styles.attachmentTextContainer}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.attachmentSize}>
                      {formatSize(file.size || 0)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.removeBtn}
                  onPress={() => removeAttachment(idx)}
                >
                  <MaterialCommunityIcons name="close-circle" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.discardButton}
          onPress={handleDiscard}
        >
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Submit Request</Text>
              <MaterialCommunityIcons name="send" size={16} color="#fff" style={styles.submitIcon} />
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.responseHint}>
        Our team typically responds within 24 hours.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f1a6f15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  historyButtonText: {
    fontSize: 13,
    color: '#4F1A6F',
    fontWeight: '600',
    marginLeft: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    height: 120,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownButtonActive: {
    borderColor: '#4F1A6F',
  },
  dropdownText: {
    fontSize: 16,
    color: '#0f172a',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemSelect: {
    backgroundColor: '#4f1a6f08',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#334155',
  },
  dropdownItemTextSelect: {
    color: '#4F1A6F',
    fontWeight: '600',
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  uploadZone: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
  },
  uploadSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  attachmentsList: {
    marginTop: 12,
    gap: 8,
  },
  attachmentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
  },
  attachmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  attachmentIcon: {
    marginRight: 10,
  },
  attachmentTextContainer: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  attachmentSize: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  removeBtn: {
    padding: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  discardButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  discardButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    backgroundColor: '#4F1A6F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#4F1A6F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  submitIcon: {
    marginLeft: 8,
  },
  responseHint: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748b',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default RaiseTicketScreen;
