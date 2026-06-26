import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { supportAPI } from '../../services/api';

const SupportDashboardScreen = () => {
  const navigation = useNavigation() as any;
  const isFocused = useIsFocused();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchStats = async () => {
    try {
      const res = await supportAPI.getDashboardStats();
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching support stats:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      fetchStats();
    }
  }, [isFocused]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F1A6F" />
      </View>
    );
  }

  const cards = stats ? [
    { title: 'Total Tickets', value: stats.total, icon: 'ticket', color: '#2563eb', bg: '#eff6ff', filterKey: 'all' },
    { title: 'Open Tickets', value: stats.open, icon: 'message-outline', color: '#d97706', bg: '#fef3c7', filterKey: 'Open' },
    { title: 'Resolved', value: stats.resolved, icon: 'check-circle-outline', color: '#059669', bg: '#d1fae5', filterKey: 'Resolved' },
    { title: 'Closed', value: stats.closed, icon: 'close-circle-outline', color: '#475569', bg: '#f1f5f9', filterKey: 'Closed' },
    { title: 'Reopen Tickets', value: stats.reopened, icon: 'refresh', color: '#7c3aed', bg: '#f5f3ff', filterKey: 'Reopened' },
    { title: 'High Priority', value: stats.highPriority, icon: 'alert-circle-outline', color: '#e11d48', bg: '#fff1f2', filterKey: 'HighPriority' },
  ] : [];

  const filteredTickets = (stats?.recent || []).filter((ticket: any) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'HighPriority') return ticket.priority === 'High' || ticket.priority === 'Critical';
    return ticket.status === activeFilter;
  });

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return '#ef4444';
      case 'High':
        return '#f97316';
      default:
        return '#3b82f6';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4F1A6F']} />}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.headerTitle}>Support Dashboard</Text>
            <Text style={styles.headerSubtitle}>Analytics and overview of support activity</Text>
          </View>
          <TouchableOpacity 
            style={styles.viewAllBtn}
            onPress={() => navigation.navigate('SupportQueue')}
          >
            <Text style={styles.viewAllBtnText}>View All Tickets</Text>
            <MaterialCommunityIcons name="arrow-up-right" size={16} color="#fff" style={styles.btnIcon} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardsContainer}>
        {cards.map((card, i) => {
          const isActive = activeFilter === card.filterKey;
          return (
            <TouchableOpacity 
              key={i} 
              style={[styles.card, isActive && styles.cardActive]}
              onPress={() => setActiveFilter(card.filterKey)}
            >
              <View style={[styles.iconContainer, { backgroundColor: card.bg }]}>
                <MaterialCommunityIcons name={card.icon as any} size={22} color={card.color} />
              </View>
              <Text style={styles.cardTitle} numberOfLines={1}>{card.title}</Text>
              <Text style={styles.cardValue}>{card.value != null ? card.value : 0}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleContainer}>
            <Text style={styles.sectionTitle}>Recently Raised Issues</Text>
            {activeFilter !== 'all' && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{filteredTickets.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity 
            onPress={() => navigation.navigate('SupportQueue', { filter: activeFilter })}
          >
            <Text style={styles.viewFullListText}>View Full List</Text>
          </TouchableOpacity>
        </View>
        
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="ticket-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyStateText}>No tickets found.</Text>
          </View>
        ) : (
          filteredTickets.map((ticket: any) => {
            const statusStyle = getStatusStyle(ticket.status);
            return (
              <TouchableOpacity 
                key={ticket._id} 
                style={styles.ticketItem}
              >
                <View style={styles.ticketLeft}>
                  <View style={[styles.priorityBar, { backgroundColor: getPriorityColor(ticket.priority) }]} />
                  <View style={styles.ticketContent}>
                    <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                    <Text style={styles.ticketMeta} numberOfLines={1}>
                      Raised by {typeof ticket.employeeId === 'object' && ticket.employeeId ? (ticket.employeeId.name || ticket.employeeId.employeeId || 'Unknown') : (ticket.employeeId || 'Unknown')} • {ticket.category}
                    </Text>
                  </View>
                </View>
                <View style={styles.ticketRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{ticket.status}</Text>
                  </View>
                  <Text style={styles.ticketDate}>
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  viewAllBtn: {
    backgroundColor: '#4F1A6F',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  viewAllBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  btnIcon: {
    marginLeft: 4,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: {
    borderColor: '#4F1A6F',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
  },
  recentSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 8,
    minHeight: 300,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  filterBadge: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  filterBadgeText: {
    fontSize: 11,
    color: '#7c3aed',
    fontWeight: '700',
  },
  viewFullListText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  ticketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ticketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  priorityBar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: 10,
  },
  ticketContent: {
    flex: 1,
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 3,
  },
  ticketMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  ticketRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  ticketDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 12,
  },
});

export default SupportDashboardScreen;
