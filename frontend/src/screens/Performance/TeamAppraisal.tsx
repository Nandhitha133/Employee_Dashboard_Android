// src/screens/Performance/TeamAppraisal.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CommonHeader from '../../components/CommonHeader';
import { performanceAPI } from '../../services/api';

const { width } = Dimensions.get('window');

// Types
type RootStackParamList = {
  TeamAppraisal: undefined;
  Dashboard: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TeamAppraisal'>;

interface Employee {
  id: number;
  financialYr: string;
  empId: string;
  name: string;
  selfAppraiseeComments: string;
  managerComments: string;
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
  info: '#3B82F6',
};

const TeamAppraisal = () => {
  const navigation = useNavigation<NavigationProp>();
  
  // State for employees list
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // State for search
  const [searchTerm, setSearchTerm] = useState('');

  // State for modal
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch employees on mount
  useEffect(() => {
    fetchTeamAppraisals();
  }, []);

  // Filter employees when search term changes
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp => 
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.empId.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchTerm, employees]);

  const fetchTeamAppraisals = async () => {
    try {
      setLoading(true);
      const response = await performanceAPI.getTeamAppraisals();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Failed to fetch team appraisals', error);
      Alert.alert('Error', 'Failed to fetch team appraisals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTeamAppraisals();
  };

  const handleView = (emp: Employee) => {
    setSelectedEmployee(emp);
    setModalVisible(true);
  };

  const handleEdit = (emp: Employee) => {
    Alert.alert('Edit', `Edit ${emp.name}`);
    // You can navigate to edit screen here
    // navigation.navigate('EditAppraisal', { employee: emp });
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete',
      'Are you sure you want to delete this appraisal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Using deleteSelfAppraisal as per your API
              await performanceAPI.deleteSelfAppraisal(String(id));
              Alert.alert('Success', 'Deleted successfully');
              fetchTeamAppraisals(); // Refresh the list
            } catch (error: any) {
              console.error('Failed to delete', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const renderEmployeeItem = ({ item, index }: { item: Employee; index: number }) => (
    <View style={styles.tableRow}>
      {/* Row 1: S.No, Financial Year, Employee ID, Name */}
      <View style={styles.rowMain}>
        <View style={styles.snoContainer}>
          <Text style={styles.snoText}>{index + 1}</Text>
        </View>
        <View style={styles.detailsContainer}>
          <Text style={styles.financialYear}>{item.financialYr}</Text>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{item.name}</Text>
            <Text style={styles.employeeId}>{item.empId}</Text>
          </View>
        </View>
      </View>

      {/* Row 2: Self Comments */}
      <View style={styles.commentRow}>
        <Text style={styles.commentLabel}>Self:</Text>
        <Text style={styles.commentText} numberOfLines={2}>
          {item.selfAppraiseeComments || 'No comments'}
        </Text>
      </View>

      {/* Row 3: Manager Comments */}
      <View style={styles.commentRow}>
        <Text style={styles.commentLabel}>Manager:</Text>
        <Text style={styles.commentText} numberOfLines={2}>
          {item.managerComments || 'No comments'}
        </Text>
      </View>

      {/* Row 4: Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity onPress={() => handleView(item)} style={styles.actionButton}>
          <Icon name="visibility" size={20} color={COLORS.info} />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
          <Icon name="edit" size={20} color={COLORS.primary} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionButton}>
          <Icon name="delete" size={20} color={COLORS.error} />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
      
      <CommonHeader 
        title="Team Appraisal"
        showBack={true}
        onBack={() => navigation.goBack()}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color={COLORS.gray} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID..."
          placeholderTextColor={COLORS.lightGray}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm !== '' && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Icon name="close" size={20} color={COLORS.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Table Header */}
      <View style={styles.headerContainer}>
        <Text style={[styles.headerText, { flex: 0.5 }]}>S.No</Text>
        <Text style={[styles.headerText, { flex: 1 }]}>Financial Year</Text>
        <Text style={[styles.headerText, { flex: 1.5 }]}>Employee</Text>
        <Text style={[styles.headerText, { flex: 1.5 }]}>Self Comments</Text>
        <Text style={[styles.headerText, { flex: 1.5 }]}>Manager Comments</Text>
        <Text style={[styles.headerText, { flex: 1.5 }]}>Actions</Text>
      </View>

      {/* Employee List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployeeItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="people" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No employees found</Text>
            </View>
          }
        />
      )}

      {/* Simple View Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Employee Details</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={COLORS.white} />
              </TouchableOpacity>
            </View>

            {selectedEmployee && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Name:</Text>
                  <Text style={styles.modalValue}>{selectedEmployee.name}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Employee ID:</Text>
                  <Text style={styles.modalValue}>{selectedEmployee.empId}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Financial Year:</Text>
                  <Text style={styles.modalValue}>{selectedEmployee.financialYr}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Self Comments:</Text>
                  <Text style={styles.modalValue}>{selectedEmployee.selfAppraiseeComments}</Text>
                </View>
                <View style={styles.modalInfoRow}>
                  <Text style={styles.modalLabel}>Manager Comments:</Text>
                  <Text style={styles.modalValue}>{selectedEmployee.managerComments || 'No comments'}</Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lighterGray,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.black,
  },
  headerContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  headerText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tableRow: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  rowMain: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  snoContainer: {
    width: 40,
    justifyContent: 'center',
  },
  snoText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  detailsContainer: {
    flex: 1,
  },
  financialYear: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 4,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  employeeName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginRight: 8,
  },
  employeeId: {
    fontSize: 12,
    color: COLORS.gray,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.lighterGray,
  },
  commentLabel: {
    width: 60,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  commentText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.black,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: COLORS.lighterGray,
    paddingTop: 8,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginLeft: 8,
  },
  actionText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
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
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.lightGray,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    backgroundColor: COLORS.primary,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  modalInfoRow: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lighterGray,
  },
  modalLabel: {
    width: 120,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
  },
  modalValue: {
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
  },
  modalCloseButton: {
    backgroundColor: COLORS.primary,
    padding: 12,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TeamAppraisal;