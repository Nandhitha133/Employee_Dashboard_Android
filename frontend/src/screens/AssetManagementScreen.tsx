import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { assetAPI, employeeAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

const COLORS = {
  primary: '#f8fafc',
  secondary: '#4F1A6F',
  white: '#FFFFFF',
  gray: '#64748b',
  lightGray: '#e2e8f0',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  darkBlue: '#ffffff',
  cardBg: '#ffffff',
  textMuted: '#64748b',
};

type TabType = 'Dashboard' | 'Asset Master' | 'Allocations' | 'Requests' | 'Tickets' | 'Maintenance';

export default function AssetManagementScreen() {
  const navigation = useNavigation();

  // Role details
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('Dashboard');

  // Loaders & Data lists
  const [loading, setLoading] = useState<boolean>(false);
  const [assets, setAssets] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Modals visibility
  const [assetModalVisible, setAssetModalVisible] = useState<boolean>(false);
  const [allocateModalVisible, setAllocateModalVisible] = useState<boolean>(false);
  const [requestModalVisible, setRequestModalVisible] = useState<boolean>(false);
  const [ticketModalVisible, setTicketModalVisible] = useState<boolean>(false);
  const [resolveModalVisible, setResolveModalVisible] = useState<boolean>(false);
  const [maintenanceModalVisible, setMaintenanceModalVisible] = useState<boolean>(false);

  // Form states
  // 1. Asset Form
  const [assetName, setAssetName] = useState<string>('');
  const [assetCategory, setAssetCategory] = useState<string>('Laptop');
  const [assetBrandModel, setAssetBrandModel] = useState<string>('');
  const [assetSerial, setAssetSerial] = useState<string>('');
  const [assetCost, setAssetCost] = useState<string>('');
  const [assetLocation, setAssetLocation] = useState<string>('Chennai Office');
  // 2. Allocation Form
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  // 3. Request Form
  const [reqCategory, setReqCategory] = useState<string>('Laptop');
  const [reqType, setReqType] = useState<string>('New Asset');
  const [reqReason, setReqReason] = useState<string>('');
  // 4. Ticket Form
  const [ticketAssetId, setTicketAssetId] = useState<string>('');
  const [ticketIssueType, setTicketIssueType] = useState<string>('Software');
  const [ticketPriority, setTicketPriority] = useState<string>('Medium');
  const [ticketDesc, setTicketDesc] = useState<string>('');
  // 5. Resolution Form
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  // 6. Maintenance Form
  const [maintAssetId, setMaintAssetId] = useState<string>('');
  const [maintType, setMaintType] = useState<string>('Repair');
  const [maintCost, setMaintCost] = useState<string>('');
  const [maintStartDate, setMaintStartDate] = useState<string>('');
  const [maintEndDate, setMaintEndDate] = useState<string>('');
  const [maintVendor, setMaintVendor] = useState<string>('');
  const [maintDesc, setMaintDesc] = useState<string>('');

  // Fetch initial profile & check permissions
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await AsyncStorage.getItem('user');
        if (data) {
          const u = JSON.parse(data);
          setCurrentUser(u);
          const role = u.role?.toLowerCase();
          setIsAdmin(['admin', 'hr', 'director'].includes(role));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchProfile();
  }, []);

  // Fetch data depending on activeTab
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'Dashboard') {
        const [assetRes, ticketRes, requestRes] = await Promise.all([
          assetAPI.getAllAssets(),
          assetAPI.getTickets(),
          assetAPI.getRequests(),
        ]);
        setAssets(assetRes.data || []);
        setTickets(ticketRes.data || []);
        setRequests(requestRes.data || []);
      } else if (activeTab === 'Asset Master') {
        const res = await assetAPI.getAllAssets();
        setAssets(res.data || []);
      } else if (activeTab === 'Allocations') {
        const [assetRes, empRes] = await Promise.all([
          assetAPI.getAllAssets(),
          employeeAPI.getAllEmployees(),
        ]);
        setAssets(assetRes.data || []);
        setEmployees(empRes.data || []);
      } else if (activeTab === 'Requests') {
        const res = await assetAPI.getRequests();
        setRequests(res.data || []);
      } else if (activeTab === 'Tickets') {
        const [ticketRes, assetRes] = await Promise.all([
          assetAPI.getTickets(),
          assetAPI.getAllAssets(),
        ]);
        setTickets(ticketRes.data || []);
        setAssets(assetRes.data || []);
      } else if (activeTab === 'Maintenance') {
        const [maintRes, assetRes] = await Promise.all([
          assetAPI.getMaintenance(),
          assetAPI.getAllAssets(),
        ]);
        setMaintenance(maintRes.data || []);
        setAssets(assetRes.data || []);
      }
    } catch (err) {
      console.error('Error loading asset module data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, isAdmin]);

  // Tab configurations
  const getTabs = (): TabType[] => {
    if (isAdmin) {
      return ['Dashboard', 'Asset Master', 'Allocations', 'Requests', 'Tickets', 'Maintenance'];
    }
    return ['Dashboard', 'Requests', 'Tickets'];
  };

  // --- ACTIONS ---

  // 1. Create Asset
  const handleCreateAsset = async () => {
    if (!assetName || !assetBrandModel || !assetSerial) {
      Alert.alert('Validation Error', 'Asset Name, Brand/Model, and Serial Number are required.');
      return;
    }
    try {
      await assetAPI.createAsset({
        name: assetName,
        category: assetCategory,
        brandModel: assetBrandModel,
        serialNumber: assetSerial,
        cost: assetCost,
        location: assetLocation,
      });
      Alert.alert('Success', 'Asset created successfully!');
      setAssetModalVisible(false);
      resetAssetForm();
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to create asset record.');
    }
  };

  // 2. Allocate Asset
  const handleAllocate = async () => {
    if (!selectedAssetId || !selectedEmployeeId) {
      Alert.alert('Validation Error', 'Please select both an asset and an employee.');
      return;
    }
    try {
      const selectedEmp = employees.find(e => e.employeeId === selectedEmployeeId);
      await assetAPI.allocate({
        assetId: selectedAssetId,
        assignedToId: selectedEmployeeId,
        assignedToName: selectedEmp?.name || 'Employee',
      });
      Alert.alert('Success', 'Asset allocated successfully!');
      setAllocateModalVisible(false);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Allocation assignment failed.');
    }
  };

  // 3. Deallocate Asset
  const handleDeallocate = async (assetId: string) => {
    Alert.alert(
      'Deallocate Asset',
      'Are you sure you want to deallocate this asset from the employee?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Deallocate', 
          style: 'destructive',
          onPress: async () => {
            try {
              await assetAPI.deallocate({ assetId });
              Alert.alert('Success', 'Asset returned to available inventory.');
              fetchData();
            } catch (err) {
              Alert.alert('Error', 'Failed to deallocate asset.');
            }
          }
        }
      ]
    );
  };

  // 4. Submit Request
  const handleSubmitRequest = async () => {
    if (!reqReason) {
      Alert.alert('Validation Error', 'Please supply a brief reason for the request.');
      return;
    }
    try {
      await assetAPI.createRequest({
        category: reqCategory,
        requestType: reqType,
        reason: reqReason,
      });
      Alert.alert('Success', 'Asset request submitted successfully!');
      setRequestModalVisible(false);
      setReqReason('');
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Could not submit request.');
    }
  };

  // 5. Update Request Status (Admin)
  const handleRequestStatus = async (id: string, status: 'Approved' | 'Rejected') => {
    try {
      await assetAPI.updateRequestStatus(id, status);
      Alert.alert('Success', `Request is now ${status}`);
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to update request.');
    }
  };

  // 6. Raise Support Ticket
  const handleRaiseTicket = async () => {
    if (!ticketAssetId || !ticketDesc) {
      Alert.alert('Validation Error', 'Please select an asset and write a description.');
      return;
    }
    try {
      await assetAPI.createTicket({
        assetId: ticketAssetId,
        issueType: ticketIssueType,
        priority: ticketPriority,
        description: ticketDesc,
      });
      Alert.alert('Success', 'Support ticket opened successfully!');
      setTicketModalVisible(false);
      setTicketDesc('');
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Could not open support ticket.');
    }
  };

  // 7. Resolve Ticket (Admin)
  const handleResolveTicket = async () => {
    if (!resolutionNotes) {
      Alert.alert('Validation Error', 'Please enter resolution notes.');
      return;
    }
    try {
      await assetAPI.resolveTicket(selectedTicketId, {
        resolutionNotes,
      });
      Alert.alert('Success', 'Ticket marked resolved.');
      setResolveModalVisible(false);
      setResolutionNotes('');
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to resolve ticket.');
    }
  };

  // 8. Create Maintenance Log
  const handleCreateMaintenance = async () => {
    if (!maintAssetId || !maintCost || !maintStartDate || !maintEndDate) {
      Alert.alert('Validation Error', 'Please fill in Asset, Cost, Start, and End dates.');
      return;
    }
    try {
      await assetAPI.createMaintenance({
        assetId: maintAssetId,
        maintenanceType: maintType,
        cost: maintCost,
        startDate: maintStartDate,
        endDate: maintEndDate,
        vendorName: maintVendor,
        description: maintDesc,
      });
      Alert.alert('Success', 'Maintenance record created successfully.');
      setMaintenanceModalVisible(false);
      resetMaintenanceForm();
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Failed to save maintenance record.');
    }
  };

  const resetAssetForm = () => {
    setAssetName('');
    setAssetCategory('Laptop');
    setAssetBrandModel('');
    setAssetSerial('');
    setAssetCost('');
    setAssetLocation('Chennai Office');
  };

  const resetMaintenanceForm = () => {
    setMaintAssetId('');
    setMaintType('Repair');
    setMaintCost('');
    setMaintStartDate('');
    setMaintEndDate('');
    setMaintVendor('');
    setMaintDesc('');
  };

  // Render Category stats for Admin Dashboard
  const getCategoryStats = () => {
    const stats: Record<string, { total: number; assigned: number }> = {};
    assets.forEach((a) => {
      const cat = a.category || 'Other';
      if (!stats[cat]) stats[cat] = { total: 0, assigned: 0 };
      stats[cat].total += 1;
      if (a.status === 'Assigned') stats[cat].assigned += 1;
    });
    return Object.entries(stats);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <CommonHeader title="Asset Management" backgroundColor="#4F1A6F" />

      {/* TOP TAB CONTROLS */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {getTabs().map((tab) => {
            const isTabActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isTabActive && styles.activeTabButton]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isTabActive && styles.activeTabText]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* MAIN SCREEN BODY */}
      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchData} />}>
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'Dashboard' && (
          <View>
            {/* STAT CARDS ROW */}
            <View style={styles.statGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{assets.length}</Text>
                <Text style={styles.statLabel}>Total Assets</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.success }]}>
                  {assets.filter(a => a.status === 'Assigned').length}
                </Text>
                <Text style={styles.statLabel}>Allocated</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.info }]}>
                  {assets.filter(a => a.status === 'Available').length}
                </Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
            </View>

            <View style={styles.statGrid}>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.error }]}>
                  {assets.filter(a => a.status === 'Damaged').length}
                </Text>
                <Text style={styles.statLabel}>Damaged</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.warning }]}>
                  {requests.filter(r => r.status === 'Pending').length}
                </Text>
                <Text style={styles.statLabel}>Pending Req</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={[styles.statValue, { color: COLORS.error }]}>
                  {tickets.filter(t => t.status === 'Pending').length}
                </Text>
                <Text style={styles.statLabel}>Open Tickets</Text>
              </View>
            </View>

            {/* EMPLOYEE ASSIGNED ASSETS PANEL */}
            {!isAdmin ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Assigned Assets</Text>
                {assets.filter(a => a.assignedToId === currentUser?.employeeId).length === 0 ? (
                  <Text style={styles.emptyText}>You are not currently allocated any company assets.</Text>
                ) : (
                  assets.filter(a => a.assignedToId === currentUser?.employeeId).map(a => (
                    <View key={a.id} style={styles.itemCard}>
                      <View style={styles.cardHeader}>
                        <Text style={styles.itemName}>{a.name}</Text>
                        <Text style={styles.itemId}>{a.id}</Text>
                      </View>
                      <Text style={styles.itemDesc}>{a.brandModel} • S/N: {a.serialNumber}</Text>
                      <Text style={styles.itemLoc}>Location: {a.location} • Condition: {a.condition}</Text>
                    </View>
                  ))
                )}
                
                <View style={styles.dashboardButtonRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setRequestModalVisible(true)}>
                    <Icon name="add-shopping-cart" size={18} color="#FFF" />
                    <Text style={styles.btnText}>Request Asset</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error }]} onPress={() => setTicketModalVisible(true)}>
                    <Icon name="report-problem" size={18} color="#FFF" />
                    <Text style={styles.btnText}>Report Issue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // ADMIN CATEGORIES PERCENT BAR
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Asset Allocations by Category</Text>
                {getCategoryStats().map(([cat, val]) => {
                  const percent = val.total > 0 ? (val.assigned / val.total) * 100 : 0;
                  return (
                    <View key={cat} style={styles.progressContainer}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>{cat}</Text>
                        <Text style={styles.progressVal}>{val.assigned}/{val.total} assigned</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: ASSET MASTER (ADMIN ONLY) */}
        {activeTab === 'Asset Master' && isAdmin && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Inventory Master List</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setAssetModalVisible(true)}>
                <Icon name="add" size={18} color="#FFF" />
                <Text style={styles.createBtnText}>Add Asset</Text>
              </TouchableOpacity>
            </View>

            {assets.length === 0 ? (
              <Text style={styles.emptyText}>No assets found in master inventory.</Text>
            ) : (
              assets.map((asset) => (
                <View key={asset.id} style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{asset.name}</Text>
                    <Text style={[styles.statusTag, asset.status === 'Available' ? styles.tagSuccess : styles.tagWarning]}>
                      {asset.status}
                    </Text>
                  </View>
                  <Text style={styles.itemDesc}>{asset.brandModel} • S/N: {asset.serialNumber} • ₹{asset.cost}</Text>
                  <Text style={styles.itemLoc}>Location: {asset.location} • Condition: {asset.condition}</Text>
                  {asset.assignedToName && (
                    <Text style={styles.itemAlloc}>Assigned to: {asset.assignedToName} ({asset.assignedToId})</Text>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: ALLOCATIONS (ADMIN ONLY) */}
        {activeTab === 'Allocations' && isAdmin && (
          <View>
            <Text style={styles.sectionTitle}>Allocate & Retrieve Inventory</Text>
            {assets.length === 0 ? (
              <Text style={styles.emptyText}>No assets listed in database.</Text>
            ) : (
              assets.map((asset) => (
                <View key={asset.id} style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{asset.name}</Text>
                    <Text style={styles.itemId}>{asset.id}</Text>
                  </View>
                  <Text style={styles.itemDesc}>{asset.brandModel} • S/N: {asset.serialNumber}</Text>
                  
                  <View style={styles.allocationFooter}>
                    {asset.status === 'Available' ? (
                      <TouchableOpacity 
                        style={styles.allocateBtn} 
                        onPress={() => { setSelectedAssetId(asset.id); setAllocateModalVisible(true); }}
                      >
                        <Icon name="assignment-ind" size={16} color="#FFF" />
                        <Text style={styles.allocateText}>Assign Asset</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.allocatedUserContainer}>
                        <Text style={styles.allocatedUserText}>Assigned: {asset.assignedToName}</Text>
                        <TouchableOpacity style={styles.deallocateBtn} onPress={() => handleDeallocate(asset.id)}>
                          <Text style={styles.deallocateText}>Deallocate</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: REQUESTS */}
        {activeTab === 'Requests' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Asset Procurement Requests</Text>
              {!isAdmin && (
                <TouchableOpacity style={styles.createBtn} onPress={() => setRequestModalVisible(true)}>
                  <Icon name="add" size={18} color="#FFF" />
                  <Text style={styles.createBtnText}>New Request</Text>
                </TouchableOpacity>
              )}
            </View>

            {requests.length === 0 ? (
              <Text style={styles.emptyText}>No procurement requests submitted.</Text>
            ) : (
              requests.map((req) => (
                <View key={req.id} style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{req.category} ({req.requestType})</Text>
                    <Text style={[styles.statusTag, req.status === 'Approved' ? styles.tagSuccess : req.status === 'Pending' ? styles.tagWarning : styles.tagError]}>
                      {req.status}
                    </Text>
                  </View>
                  <Text style={styles.itemDesc}>Requested on: {req.requestDate} by {req.employeeName}</Text>
                  <Text style={styles.itemLoc}>Reason: {req.reason}</Text>

                  {isAdmin && req.status === 'Pending' && (
                    <View style={styles.approvalBtnRow}>
                      <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleRequestStatus(req.id, 'Approved')}>
                        <Text style={styles.btnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleRequestStatus(req.id, 'Rejected')}>
                        <Text style={styles.btnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 5: TICKETS */}
        {activeTab === 'Tickets' && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Support Tickets</Text>
              {!isAdmin && (
                <TouchableOpacity style={styles.createBtn} onPress={() => setTicketModalVisible(true)}>
                  <Icon name="add" size={18} color="#FFF" />
                  <Text style={styles.createBtnText}>Raise Ticket</Text>
                </TouchableOpacity>
              )}
            </View>

            {tickets.length === 0 ? (
              <Text style={styles.emptyText}>No support tickets reported.</Text>
            ) : (
              tickets.map((t) => (
                <View key={t.id} style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{t.assetName} • {t.issueType}</Text>
                    <Text style={[styles.statusTag, t.status === 'Resolved' ? styles.tagSuccess : styles.tagWarning]}>
                      {t.status}
                    </Text>
                  </View>
                  <Text style={styles.itemDesc}>Raised by {t.employeeName} • Priority: {t.priority}</Text>
                  <Text style={styles.itemLoc}>Issue: {t.description}</Text>
                  {t.resolutionNotes ? (
                    <Text style={styles.resolutionText}>Notes: {t.resolutionNotes}</Text>
                  ) : null}

                  {isAdmin && t.status === 'Pending' && (
                    <TouchableOpacity 
                      style={styles.resolveBtn} 
                      onPress={() => { setSelectedTicketId(t.id); setResolveModalVisible(true); }}
                    >
                      <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 6: MAINTENANCE (ADMIN ONLY) */}
        {activeTab === 'Maintenance' && isAdmin && (
          <View>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Maintenance & Repairs log</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setMaintenanceModalVisible(true)}>
                <Icon name="add" size={18} color="#FFF" />
                <Text style={styles.createBtnText}>Schedule Repair</Text>
              </TouchableOpacity>
            </View>

            {maintenance.length === 0 ? (
              <Text style={styles.emptyText}>No scheduled maintenance listings found.</Text>
            ) : (
              maintenance.map((m) => (
                <View key={m.id} style={styles.itemCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.itemName}>{m.assetName} ({m.maintenanceType})</Text>
                    <Text style={[styles.statusTag, m.status === 'Completed' ? styles.tagSuccess : styles.tagWarning]}>
                      {m.status}
                    </Text>
                  </View>
                  <Text style={styles.itemDesc}>Vendor: {m.vendorName} • Cost: ₹{m.cost}</Text>
                  <Text style={styles.itemLoc}>Duration: {m.startDate} to {m.endDate}</Text>
                  <Text style={styles.itemLoc}>Job Details: {m.description}</Text>
                </View>
              ))
            )}
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL 1: ADD ASSET */}
      <Modal visible={assetModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Asset to Inventory</Text>

            <TextInput style={styles.input} placeholder="Asset Name" placeholderTextColor="#64748B" value={assetName} onChangeText={setAssetName} />
            
            <Text style={styles.pickerLabel}>Category</Text>
            <View style={styles.inputPicker}>
              <Picker selectedValue={assetCategory} onValueChange={setAssetCategory} style={{ color: '#0f172a' }} dropdownIconColor="#4F1A6F">
                <Picker.Item label="Laptop" value="Laptop" />
                <Picker.Item label="Desktop" value="Desktop" />
                <Picker.Item label="Mobile" value="Mobile" />
                <Picker.Item label="Monitor" value="Monitor" />
                <Picker.Item label="Peripheral" value="Peripheral" />
              </Picker>
            </View>

            <TextInput style={styles.input} placeholder="Brand & Model" placeholderTextColor="#64748B" value={assetBrandModel} onChangeText={setAssetBrandModel} />
            <TextInput style={styles.input} placeholder="Serial Number" placeholderTextColor="#64748B" value={assetSerial} onChangeText={setAssetSerial} />
            <TextInput style={styles.input} placeholder="Purchase Cost (INR)" placeholderTextColor="#64748B" keyboardType="numeric" value={assetCost} onChangeText={setAssetCost} />
            
            <Text style={styles.pickerLabel}>Office Location</Text>
            <View style={styles.inputPicker}>
              <Picker selectedValue={assetLocation} onValueChange={setAssetLocation} style={{ color: '#0f172a' }} dropdownIconColor="#4F1A6F">
                <Picker.Item label="Chennai Office" value="Chennai Office" />
                <Picker.Item label="Hosur Office" value="Hosur Office" />
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setAssetModalVisible(false); resetAssetForm(); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateAsset}>
                <Text style={styles.submitText}>Save Asset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ALLOCATE ASSET */}
      <Modal visible={allocateModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Allocate Asset</Text>
            <Text style={styles.modalSub}>Asset: {selectedAssetId}</Text>

            <Text style={styles.pickerLabel}>Select Employee</Text>
            <View style={styles.inputPicker}>
              <Picker selectedValue={selectedEmployeeId} onValueChange={setSelectedEmployeeId} style={{ color: '#0f172a' }} dropdownIconColor="#4F1A6F">
                <Picker.Item label="Select Employee" value="" />
                {employees.map(e => <Picker.Item key={e.employeeId} label={`${e.name} (${e.employeeId})`} value={e.employeeId} />)}
              </Picker>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAllocateModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAllocate}>
                <Text style={styles.submitText}>Confirm Allocate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: SUBMIT REQUEST */}
      <Modal visible={requestModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Raise Asset Request</Text>

            <Text style={styles.pickerLabel}>Category</Text>
            <View style={styles.inputPicker}>
              <Picker selectedValue={reqCategory} onValueChange={setReqCategory} style={{ color: '#0f172a' }} dropdownIconColor="#4F1A6F">
                <Picker.Item label="Laptop" value="Laptop" />
                <Picker.Item label="Desktop" value="Desktop" />
                <Picker.Item label="Mobile" value="Mobile" />
                <Picker.Item label="Monitor" value="Monitor" />
                <Picker.Item label="Peripheral" value="Peripheral" />
              </Picker>
            </View>

            <Text style={styles.pickerLabel}>Request Type</Text>
            <View style={styles.inputPicker}>
              <Picker selectedValue={reqType} onValueChange={setReqType} style={{ color: '#0f172a' }} dropdownIconColor="#4F1A6F">
                <Picker.Item label="New Asset" value="New Asset" />
                <Picker.Item label="Replacement" value="Replacement" />
                <Picker.Item label="Upgrade" value="Upgrade" />
                <Picker.Item label="Return" value="Return" />
              </Picker>
            </View>

            <TextInput 
              style={[styles.input, { height: 80, marginTop: 12 }]} 
              placeholder="Why do you require this asset?" 
              placeholderTextColor="#64748B" 
              multiline 
              value={reqReason} 
              onChangeText={setReqReason} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRequestModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitRequest}>
                <Text style={styles.submitText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: RAISE SUPPORT TICKET */}
      <Modal visible={ticketModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Report Asset Technical Issue</Text>

            <Text style={styles.pickerLabel}>Select Asset</Text>
            <View style={styles.inputPicker}>
              <Picker selectedValue={ticketAssetId} onValueChange={setTicketAssetId} style={{ color: '#0f172a' }} dropdownIconColor="#4F1A6F">
                <Picker.Item label="Select Asset" value="" />
                {assets.filter(a => a.assignedToId === currentUser?.employeeId).map(a => (
                  <Picker.Item key={a.id} label={`${a.name} (${a.id})`} value={a.id} />
                ))}
              </Picker>
            </View>

            <Text style={styles.pickerLabel}>Issue Type</Text>
            <View style={styles.inputPicker}>
              <Picker selectedValue={ticketIssueType} onValueChange={setTicketIssueType} style={{ color: '#0f172a' }} dropdownIconColor="#4F1A6F">
                <Picker.Item label="Software Issue" value="Software Issue" />
                <Picker.Item label="Hardware Damage" value="Hardware Damage" />
                <Picker.Item label="Access / License Issue" value="Access / License Issue" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>

            <Text style={styles.pickerLabel}>Priority</Text>
            <View style={styles.inputPicker}>
              <Picker selectedValue={ticketPriority} onValueChange={setTicketPriority} style={{ color: '#0f172a' }} dropdownIconColor="#4F1A6F">
                <Picker.Item label="Low" value="Low" />
                <Picker.Item label="Medium" value="Medium" />
                <Picker.Item label="High" value="High" />
              </Picker>
            </View>

            <TextInput 
              style={[styles.input, { height: 80, marginTop: 12 }]} 
              placeholder="Describe the technical issue in detail..." 
              placeholderTextColor="#64748B" 
              multiline 
              value={ticketDesc} 
              onChangeText={setTicketDesc} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTicketModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleRaiseTicket}>
                <Text style={styles.submitText}>Submit Ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: RESOLVE TICKET */}
      <Modal visible={resolveModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Resolve Technical Support Ticket</Text>

            <TextInput 
              style={[styles.input, { height: 100, marginTop: 12 }]} 
              placeholder="Resolution notes (explain how this issue was resolved)..." 
              placeholderTextColor="#64748B" 
              multiline 
              value={resolutionNotes} 
              onChangeText={setResolutionNotes} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setResolveModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleResolveTicket}>
                <Text style={styles.submitText}>Resolve Ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: CREATE MAINTENANCE LOG */}
      <Modal visible={maintenanceModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Schedule Asset Repair / AMC</Text>

            <Text style={styles.pickerLabel}>Select Asset</Text>
            <View style={styles.inputPicker}>
              <Picker selectedValue={maintAssetId} onValueChange={setMaintAssetId} style={{ color: '#0f172a' }} dropdownIconColor="#4F1A6F">
                <Picker.Item label="Select Asset" value="" />
                {assets.map(a => <Picker.Item key={a.id} label={`${a.name} (${a.id})`} value={a.id} />)}
              </Picker>
            </View>

            <Text style={styles.pickerLabel}>Type</Text>
            <View style={styles.inputPicker}>
              <Picker selectedValue={maintType} onValueChange={setMaintType} style={{ color: '#0f172a' }} dropdownIconColor="#4F1A6F">
                <Picker.Item label="Preventive Maintenance" value="Preventive" />
                <Picker.Item label="Repair Job" value="Repair" />
                <Picker.Item label="AMC Contract Service" value="AMC" />
                <Picker.Item label="Warranty Claim" value="Warranty" />
              </Picker>
            </View>

            <TextInput style={styles.input} placeholder="Maintenance Cost (INR)" placeholderTextColor="#64748B" keyboardType="numeric" value={maintCost} onChangeText={setMaintCost} />
            <TextInput style={styles.input} placeholder="Start Date (YYYY-MM-DD)" placeholderTextColor="#64748B" value={maintStartDate} onChangeText={setMaintStartDate} />
            <TextInput style={styles.input} placeholder="End Date (YYYY-MM-DD)" placeholderTextColor="#64748B" value={maintEndDate} onChangeText={setMaintEndDate} />
            <TextInput style={styles.input} placeholder="Vendor Service Center Name" placeholderTextColor="#64748B" value={maintVendor} onChangeText={setMaintVendor} />
            
            <TextInput 
              style={[styles.input, { height: 60 }]} 
              placeholder="Detailed description of works..." 
              placeholderTextColor="#64748B" 
              multiline 
              value={maintDesc} 
              onChangeText={setMaintDesc} 
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setMaintenanceModalVisible(false); resetMaintenanceForm(); }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateMaintenance}>
                <Text style={styles.submitText}>Save Maintenance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CommonFooter />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  tabBar: {
    height: 48,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingHorizontal: 8,
  },
  tabButton: {
    paddingHorizontal: 16,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.secondary,
  },
  tabText: {
    color: COLORS.textMuted,
    fontWeight: 'bold',
    fontSize: 13,
  },
  activeTabText: {
    color: COLORS.secondary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  statCard: {
    backgroundColor: '#ffffff',
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statValue: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    color: '#1e293b',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 12,
  },
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 6,
    marginBottom: 6,
  },
  itemName: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  itemId: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemDesc: {
    color: '#334155',
    fontSize: 12,
    marginBottom: 2,
  },
  itemLoc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  itemAlloc: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  dashboardButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionBtn: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  createBtn: {
    backgroundColor: COLORS.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  createBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 10,
    fontWeight: 'bold',
  },
  tagSuccess: {
    backgroundColor: COLORS.success,
    color: '#FFF',
  },
  tagWarning: {
    backgroundColor: COLORS.warning,
    color: '#FFF',
  },
  tagError: {
    backgroundColor: COLORS.error,
    color: '#FFF',
  },
  allocationFooter: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  allocateBtn: {
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  allocateText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 11,
    marginLeft: 4,
  },
  allocatedUserContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  allocatedUserText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  deallocateBtn: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deallocateText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  approvalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  approveBtn: {
    backgroundColor: COLORS.success,
    marginLeft: 8,
  },
  rejectBtn: {
    backgroundColor: COLORS.error,
    marginLeft: 8,
  },
  resolveBtn: {
    backgroundColor: COLORS.success,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 10,
  },
  resolveBtnText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  resolutionText: {
    color: COLORS.success,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    color: '#334155',
    fontSize: 12,
  },
  progressVal: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    width: '90%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  modalSub: {
    color: COLORS.secondary,
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    color: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  pickerLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  inputPicker: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelText: {
    color: COLORS.textMuted,
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
