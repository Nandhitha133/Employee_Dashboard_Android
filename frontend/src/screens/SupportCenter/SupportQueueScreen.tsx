import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { supportAPI } from '../../services/api';

const STATUS_FILTERS = [
  { label: 'All Statuses', value: '' },
  { label: 'Open', value: 'Open' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
  { label: 'Reopened', value: 'Reopened' },
];

const PRIORITY_FILTERS = [
  { label: 'All Priorities', value: '' },
  { label: 'Critical', value: 'Critical' },
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' },
];

const SupportQueueScreen = () => {
  const navigation = useNavigation() as any;
  const route = useRoute() as any;

  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Handle incoming filters from dashboard
  useEffect(() => {
    const dashboardFilter = route.params?.filter;
    if (dashboardFilter) {
      if (dashboardFilter === 'HighPriority') {
        setPriorityFilter('High'); // default to High when clicked from HighPriority
        setStatusFilter('');
      } else if (dashboardFilter === 'all') {
        setStatusFilter('');
        setPriorityFilter('');
      } else {
        setStatusFilter(dashboardFilter);
        setPriorityFilter('');
      }
    }
  }, [route.params?.filter]);

  const fetchTickets = async () => {
    try {
      const res = await supportAPI.getAllTickets();
      setTickets(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching tickets for queue:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Open':
        return { bg: '#eff6ff', text: '#2563eb' };
      case 'Resolved':
        return { bg: '#d1fae5', text: '#059669' };
      case 'Closed':
        return { bg: '#f1f5f9', text: '#475569' };
      case 'Reopened':
        return { bg: '#f5f3ff', text: '#7c3aed' };
      default:
        return { bg: '#f8fafc', text: '#64748b' };
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return { bg: '#fee2e2', text: '#ef4444' };
      case 'High':
        return { bg: '#ffedd5', text: '#f97316' };
      case 'Medium':
        return { bg: '#fef3c7', text: '#d97706' };
      case 'Low':
        return { bg: '#eff6ff', text: '#3b82f6' };
      default:
        return { bg: '#f1f5f9', text: '#64748b' };
    }
  };

  const filteredTickets = tickets.filter(t => {
    const empName = typeof t.employeeId === 'object' && t.employeeId ? t.employeeId.name : '';
    const empIdStr = typeof t.employeeId === 'object' && t.employeeId ? t.employeeId.employeeId : (t.employeeId || '');

    const matchesSearch = 
      t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ticketId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      empName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      empIdStr?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = !statusFilter || t.status === statusFilter;
    
    let matchesPriority = true;
    if (priorityFilter === 'High') {
      matchesPriority = t.priority === 'High' || t.priority === 'Critical';
    } else if (priorityFilter) {
      matchesPriority = t.priority === priorityFilter;
    }

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setPriorityFilter('');
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== '' || priorityFilter !== '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1e293b" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Support Queue</Text>
            <Text style={styles.headerSubtitle}>Manage and resolve all employee support tickets</Text>
          </View>
        </View>
      </View>

      {/* Search and Filters Section */}
      <View style={styles.filterSection}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, Subject or Employee name..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchIcon}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdowns Row */}
        <View style={styles.pickersRow}>
          {/* Status Filter Dropdown */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Status</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
                style={styles.picker}
                dropdownIconColor="#4F1A6F"
              >
                {STATUS_FILTERS.map(f => (
                  <Picker.Item key={f.label} label={f.label} value={f.value} color="#0f172a" />
                ))}
              </Picker>
            </View>
          </View>

          {/* Priority Filter Dropdown */}
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Priority</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value)}
                style={styles.picker}
                dropdownIconColor="#4F1A6F"
              >
                {PRIORITY_FILTERS.map(f => (
                  <Picker.Item key={f.label} label={f.label} value={f.value} color="#0f172a" />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Results Info and Clear */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            Found {filteredTickets.length} ticket{filteredTickets.length !== 1 ? 's' : ''}
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
              <MaterialCommunityIcons name="filter-remove-outline" size={14} color="#ef4444" />
              <Text style={styles.clearBtnText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main List */}
      {isLoading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4F1A6F" />
        </View>
      ) : (
        <FlatList
          data={filteredTickets}
          keyExtractor={item => item._id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F1A6F']} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="ticket-outline" size={64} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No tickets matches your filters</Text>
              <Text style={styles.emptySub}>Try searching or changing status/priority filters.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusStyle = getStatusStyle(item.status);
            const priorityStyle = getPriorityStyle(item.priority);
            return (
              <TouchableOpacity 
                style={styles.ticketCard}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.ticketId}>{item.ticketId || 'N/A'}</Text>
                  <View style={styles.cardBadges}>
                    <View style={[styles.badge, { backgroundColor: priorityStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: priorityStyle.text }]}>
                        {item.priority}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.badgeText, { color: statusStyle.text }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.subjectText} numberOfLines={1}>
                  {item.subject}
                </Text>

                <View style={styles.cardDivider} />

                <View style={styles.cardFooter}>
                  <View style={styles.employeeInfo}>
                    <MaterialCommunityIcons name="account-circle-outline" size={18} color="#64748b" />
                    <Text style={styles.employeeName} numberOfLines={1}>
                      {typeof item.employeeId === 'object' && item.employeeId ? (item.employeeId.name || item.employeeId.employeeId || 'Unknown') : (item.employeeId || 'Unknown')}
                    </Text>
                  </View>
                  <Text style={styles.ticketDate}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  filterSection: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    padding: 0,
  },
  clearSearchIcon: {
    marginLeft: 8,
  },
  pickersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  pickerContainer: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 4,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    height: 44,
    color: '#0f172a',
    backgroundColor: 'transparent',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  resultsCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearBtnText: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  subjectText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 10,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 10,
  },
  employeeName: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  ticketDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default SupportQueueScreen;
