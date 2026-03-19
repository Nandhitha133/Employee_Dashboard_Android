// screens/TeamManagementScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  StatusBar,
  Platform,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Picker } from '@react-native-picker/picker';
import { teamAPI, employeeAPI } from '../services/api';
import CommonHeader from '../components/CommonHeader';
import CommonFooter from '../components/CommonFooter';

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
  blue: '#3498db',
  green: '#27ae60',
  red: '#e74c3c',
  purple: '#9b59b6',
  orange: '#f39c12',
  darkBlue: '#1e2b58',
  lightBlue: '#EBF5FF',
  background: '#F5F7FA',
  cardBg: '#FFFFFF',
  border: '#E8ECF0',
  textPrimary: '#2C3E50',
  textSecondary: '#7F8C8D',
  filterBg: '#F8FAFC',
  selectedBg: '#E6F0FF',
  dropdownBg: '#FFFFFF',
  dropdownText: '#000000',
  indigo: '#4F46E5',
  indigoLight: '#EEF2FF',
};

// Define types that match the API response structure
interface ApiEmployee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  phone?: string;
  location?: string;
  employeeId?: string;
  designation?: string;
  division?: string;
  [key: string]: any;
}

interface ApiLeader {
  _id?: string;
  id?: string;
  employeeId: string;
  name: string;
  division?: string;
  location?: string;
}

interface ApiTeam {
  _id?: string;
  id?: string;
  teamCode: string;
  leaderEmployeeId: string;
  division?: string;
  members?: string[];
}

// Local interfaces with consistent property names
interface Leader {
  id: string;
  employeeId: string;
  name: string;
  division?: string;
  location?: string;
  _id?: string; // Optional for backward compatibility
}

interface Team {
  id: string;
  teamCode: string;
  leaderEmployeeId: string;
  division?: string;
  members?: string[];
  _id?: string; // Optional for backward compatibility
}

interface Employee {
  id: string;
  name: string;
  employeeId?: string;
  division?: string;
  location?: string;
  email?: string;
  department?: string;
  position?: string;
  phone?: string;
  designation?: string;
}

interface TeamDetails extends Team {
  members: string[];
}

const TeamManagementScreen = () => {
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedTeamCode, setSelectedTeamCode] = useState('');
  const [teamDetails, setTeamDetails] = useState<TeamDetails | null>(null);
  const [selectedLeaderEmpId, setSelectedLeaderEmpId] = useState('');
  const [memberEmployeeId, setMemberEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
    message: '',
    type: 'success',
    visible: false
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    division: ''
  });

  const [empFilters, setEmpFilters] = useState({
    location: '',
    division: '',
    managerEmpId: ''
  });

  // Form state
  const [form, setForm] = useState({
    teamCode: '',
    leaderEmployeeId: '',
    division: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const transformLeader = (item: any): Leader => ({
    id: item.id || item._id || '',
    _id: item._id || item.id || '',
    employeeId: item.employeeId || '',
    name: item.name || '',
    division: item.division,
    location: item.location,
  });

  const transformTeam = (item: any): Team => ({
    id: item.id || item._id || '',
    _id: item._id || item.id || '',
    teamCode: item.teamCode || '',
    leaderEmployeeId: item.leaderEmployeeId || '',
    division: item.division,
    members: item.members || [],
  });

  const transformEmployee = (item: any): Employee => ({
    id: item.id || item._id || '',
    name: item.name || '',
    employeeId: item.employeeId || '',
    division: item.division,
    location: item.location,
    email: item.email,
    department: item.department,
    position: item.position,
    phone: item.phone,
    designation: item.designation,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [leadersRes, teamsRes, employeesRes] = await Promise.all([
        teamAPI.getLeaders('project'),
        teamAPI.list(),
        employeeAPI.getAllEmployees()
      ]);
      
      // Transform API data to match local interfaces
      const transformedLeaders = (leadersRes.data || []).map(transformLeader);
      const transformedTeams = (teamsRes.data || []).map(transformTeam);
      const transformedEmployees = (employeesRes.data || []).map(transformEmployee);
      
      setLeaders(transformedLeaders);
      setTeams(transformedTeams);
      setEmployees(transformedEmployees);
    } catch (e) {
      console.error('Failed to load data:', e);
      setError('Failed to load data');
      showNotification('Failed to load data', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  // Unique values for filters
  const uniqueDivisions = Array.from(new Set(leaders.map(l => l.division).filter(Boolean))) as string[];
  const uniqueEmpLocations = Array.from(new Set(employees.map(e => e.location).filter(Boolean))) as string[];
  const uniqueEmpDivisions = Array.from(new Set(employees.map(e => e.division).filter(Boolean))) as string[];

  // Filtered leaders
  const filteredLeaders = leaders.filter(l => {
    const searchTerm = filters.search.trim().toLowerCase();
    const matchesSearch = !searchTerm || 
      (l.name?.toLowerCase().includes(searchTerm) ?? false) || 
      (l.employeeId?.toLowerCase().includes(searchTerm) ?? false);
    const matchesDivision = !filters.division || l.division === filters.division;
    return matchesSearch && matchesDivision;
  });

  // Filtered employees
  const filteredEmployees = employees.filter(e => {
    const matchLocation = !empFilters.location || e.location === empFilters.location;
    const matchDivision = !empFilters.division || e.division === empFilters.division;
    let matchManager = true;
    if (empFilters.managerEmpId) {
      const team = teams.find(t => t.leaderEmployeeId === empFilters.managerEmpId);
      const members = team?.members || [];
      matchManager = e.employeeId ? members.includes(e.employeeId) : false;
    }
    return matchLocation && matchDivision && matchManager;
  });

  // Sort employees by employee ID
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const getNum = (id?: string) => {
      if (!id) return Number.MAX_SAFE_INTEGER;
      const match = id.match(/^CDE(\d{3})$/i);
      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
    };
    const na = getNum(a.employeeId);
    const nb = getNum(b.employeeId);
    if (na !== nb) return na - nb;
    return (a.employeeId || '').localeCompare(b.employeeId || '');
  });

  // Auto-select leader when only one matches
  useEffect(() => {
    const searchTerm = filters.search.trim();
    if (filteredLeaders.length === 1) {
      const only = filteredLeaders[0];
      if (only?.employeeId && only.employeeId !== selectedLeaderEmpId) {
        handleSelectLeader(only.employeeId);
      }
      return;
    }
    if (searchTerm) {
      const exact = leaders.find(l => 
        l.employeeId?.toLowerCase() === searchTerm.toLowerCase() || 
        l.name?.toLowerCase() === searchTerm.toLowerCase()
      );
      if (exact && exact.employeeId !== selectedLeaderEmpId) {
        handleSelectLeader(exact.employeeId);
        return;
      }
    }
    if (filteredLeaders.length === 0 && selectedLeaderEmpId) {
      setSelectedLeaderEmpId('');
      setSelectedTeamCode('');
      setTeamDetails(null);
      setForm({ teamCode: '', leaderEmployeeId: '', division: '' });
    }
  }, [filters.search, filters.division, leaders]);

  const handleSelectLeader = async (leaderEmpId: string) => {
    setSelectedLeaderEmpId(leaderEmpId);
    setForm(prev => ({ ...prev, leaderEmployeeId: leaderEmpId }));
    const teamForLeader = teams.find(t => t.leaderEmployeeId === leaderEmpId);
    if (teamForLeader) {
      await handleSelectTeam(teamForLeader.teamCode);
    } else {
      setSelectedTeamCode('');
      setTeamDetails(null);
      setForm(prev => ({ ...prev, teamCode: '', division: '' }));
    }
  };

  const handleSelectTeam = async (code: string) => {
    setSelectedTeamCode(code);
    if (!code) {
      setTeamDetails(null);
      return;
    }
    try {
      const res = await teamAPI.getByCode(code);
      // Transform the response
      const teamData = res.data;
      const transformedTeam: TeamDetails = {
        id: teamData.id || teamData._id || '',
        _id: teamData._id || teamData.id || '',
        teamCode: teamData.teamCode || '',
        leaderEmployeeId: teamData.leaderEmployeeId || '',
        division: teamData.division,
        members: teamData.members || [],
      };
      setTeamDetails(transformedTeam);
      setForm(prev => ({
        ...prev,
        teamCode: transformedTeam.teamCode,
        leaderEmployeeId: transformedTeam.leaderEmployeeId,
        division: transformedTeam.division || ''
      }));
    } catch (e) {
      console.error('Failed to load team details:', e);
      setTeamDetails(null);
    }
  };

  const handleSaveTeam = async () => {
    if (!form.teamCode || !form.leaderEmployeeId) {
      Alert.alert('Validation Error', 'Team Code and Leader are required');
      return;
    }
    try {
      setLoading(true);
      await teamAPI.upsert({
        teamCode: form.teamCode.trim(),
        leaderEmployeeId: form.leaderEmployeeId,
        division: form.division
      });
      await loadData();
      setSelectedTeamCode(form.teamCode.trim());
      const teamRes = await teamAPI.getByCode(form.teamCode.trim());
      // Transform the response
      const teamData = teamRes.data;
      const transformedTeam: TeamDetails = {
        id: teamData.id || teamData._id || '',
        _id: teamData._id || teamData.id || '',
        teamCode: teamData.teamCode || '',
        leaderEmployeeId: teamData.leaderEmployeeId || '',
        division: teamData.division,
        members: teamData.members || [],
      };
      setTeamDetails(transformedTeam);
      showNotification('Team saved successfully', 'success');
    } catch (e) {
      console.error('Failed to save team:', e);
      showNotification('Failed to save team', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeamCode || !memberEmployeeId) {
      Alert.alert('Validation Error', 'Team and Employee ID are required');
      return;
    }
    try {
      setLoading(true);
      await teamAPI.addMember(selectedTeamCode, memberEmployeeId.trim());
      const res = await teamAPI.getByCode(selectedTeamCode);
      // Transform the response
      const teamData = res.data;
      const transformedTeam: TeamDetails = {
        id: teamData.id || teamData._id || '',
        _id: teamData._id || teamData.id || '',
        teamCode: teamData.teamCode || '',
        leaderEmployeeId: teamData.leaderEmployeeId || '',
        division: teamData.division,
        members: teamData.members || [],
      };
      setTeamDetails(transformedTeam);
      setMemberEmployeeId('');
      showNotification('Member added successfully', 'success');
    } catch (e) {
      console.error('Failed to add member:', e);
      showNotification('Failed to add member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member from the team?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await teamAPI.removeMember(selectedTeamCode, employeeId);
              const res = await teamAPI.getByCode(selectedTeamCode);
              // Transform the response
              const teamData = res.data;
              const transformedTeam: TeamDetails = {
                id: teamData.id || teamData._id || '',
                _id: teamData._id || teamData.id || '',
                teamCode: teamData.teamCode || '',
                leaderEmployeeId: teamData.leaderEmployeeId || '',
                division: teamData.division,
                members: teamData.members || [],
              };
              setTeamDetails(transformedTeam);
              showNotification('Member removed successfully', 'success');
            } catch (e) {
              console.error('Failed to remove member:', e);
              showNotification('Failed to remove member', 'error');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const getLeaderName = (id: string) => {
    const leader = leaders.find(l => l.employeeId === id);
    return leader ? leader.name : '';
  };

  const clearEmpFilters = () => {
    setEmpFilters({ location: '', division: '', managerEmpId: '' });
  };

  const renderNotification = () => {
    if (!notification.visible) return null;
    
    const bgColor = notification.type === 'success' ? COLORS.green : COLORS.red;
    
    return (
      <View style={{ position: 'absolute', top: 60, left: 20, right: 20, zIndex: 1000 }}>
        <View style={{ backgroundColor: bgColor, borderRadius: 8, padding: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 }}>
          <Icon name={notification.type === 'success' ? 'check-circle' : 'error'} size={20} color={COLORS.white} />
          <Text style={{ color: COLORS.white, marginLeft: 8, flex: 1 }}>{notification.message}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <CommonHeader 
        title="Team Management" 
        showBack={true}
      />

      {renderNotification()}

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {error ? (
          <View style={{ backgroundColor: COLORS.error + '20', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: COLORS.error }}>{error}</Text>
          </View>
        ) : null}

        {/* Leaders Filter Section */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 }}>Project Managers</Text>
          
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
            <View style={{ width: '50%', padding: 4 }}>
              <TextInput
                value={filters.search}
                onChangeText={(text) => setFilters(prev => ({ ...prev, search: text }))}
                placeholder="Search by name or ID"
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 14,
                  backgroundColor: COLORS.white,
                  color: COLORS.textPrimary,
                }}
                placeholderTextColor={COLORS.gray}
              />
            </View>

            <View style={{ width: '50%', padding: 4 }}>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={filters.division}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, division: value }))}
                  style={{ height: 50, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Divisions" value="" color={COLORS.gray} />
                  {uniqueDivisions.map(div => (
                    <Picker.Item key={div} label={div} value={div} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Leaders List */}
          <ScrollView horizontal style={{ maxHeight: 200 }}>
            <View>
              <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 4 }}>
                <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee ID</Text>
                <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Name</Text>
                <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Division</Text>
              </View>

              {filteredLeaders.map((leader) => (
                <TouchableOpacity
                  key={leader.id}
                  onPress={() => handleSelectLeader(leader.employeeId)}
                  style={{
                    flexDirection: 'row',
                    paddingVertical: 8,
                    paddingHorizontal: 4,
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.border,
                    backgroundColor: selectedLeaderEmpId === leader.employeeId ? COLORS.lightBlue : COLORS.white,
                  }}
                >
                  <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{leader.employeeId}</Text>
                  <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{leader.name}</Text>
                  <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{leader.division || '-'}</Text>
                </TouchableOpacity>
              ))}

              {filteredLeaders.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.gray }}>No leaders found</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Leaders Dropdown */}
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.gray, marginBottom: 8 }}>Select Project Manager</Text>
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
              <Picker
                selectedValue={selectedLeaderEmpId}
                onValueChange={(value) => handleSelectLeader(value)}
                style={{ height: 50, color: COLORS.dropdownText }}
                dropdownIconColor={COLORS.primary}
              >
                <Picker.Item label="Select Project Manager" value="" color={COLORS.gray} />
                {filteredLeaders.map(l => (
                  <Picker.Item key={l.id} label={`${l.employeeId} - ${l.name}`} value={l.employeeId} color={COLORS.dropdownText} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Employees Section */}
        <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>Employees</Text>
            {(empFilters.location || empFilters.division || empFilters.managerEmpId) ? (
              <TouchableOpacity onPress={clearEmpFilters} style={{ backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}>
                <Text style={{ color: COLORS.white, fontSize: 12 }}>Clear Filters</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Employee Filters */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
            <View style={{ width: '33.33%', padding: 4 }}>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={empFilters.location}
                  onValueChange={(value) => setEmpFilters(prev => ({ ...prev, location: value }))}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Locations" value="" color={COLORS.gray} />
                  {uniqueEmpLocations.map(loc => (
                    <Picker.Item key={loc} label={loc} value={loc} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: '33.33%', padding: 4 }}>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={empFilters.division}
                  onValueChange={(value) => setEmpFilters(prev => ({ ...prev, division: value }))}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Divisions" value="" color={COLORS.gray} />
                  {uniqueEmpDivisions.map(div => (
                    <Picker.Item key={div} label={div} value={div} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={{ width: '33.33%', padding: 4 }}>
              <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, backgroundColor: COLORS.dropdownBg }}>
                <Picker
                  selectedValue={empFilters.managerEmpId}
                  onValueChange={(value) => setEmpFilters(prev => ({ ...prev, managerEmpId: value }))}
                  style={{ height: 45, color: COLORS.dropdownText }}
                  dropdownIconColor={COLORS.primary}
                >
                  <Picker.Item label="All Project Managers" value="" color={COLORS.gray} />
                  {leaders.map(l => (
                    <Picker.Item key={l.id} label={`${l.employeeId} - ${l.name}`} value={l.employeeId} color={COLORS.dropdownText} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Employees Table */}
          <ScrollView horizontal style={{ maxHeight: 300 }}>
            <View>
              <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 4 }}>
                <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee ID</Text>
                <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Name</Text>
                <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Division</Text>
                <Text style={{ width: 100, color: COLORS.white, fontWeight: '600', fontSize: 12, paddingLeft: 4 }}>Location</Text>
              </View>

              {sortedEmployees.map((emp) => (
                <View key={emp.id} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                  <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{emp.employeeId || emp.id}</Text>
                  <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary, fontWeight: '500' }}>{emp.name}</Text>
                  <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{emp.division || '-'}</Text>
                  <Text style={{ width: 100, fontSize: 12, color: COLORS.textSecondary }}>{emp.location || '-'}</Text>
                </View>
              ))}

              {filteredEmployees.length === 0 && (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: COLORS.gray }}>No employees found</Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Team Management Section */}
        {selectedLeaderEmpId ? (
          <View style={{ backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 12 }}>Manage Team Members</Text>

            {/* Selected Leader Info */}
            <View style={{ backgroundColor: COLORS.lightBlue, padding: 12, borderRadius: 8, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, color: COLORS.gray }}>Selected Leader</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>
                {selectedLeaderEmpId} - {getLeaderName(selectedLeaderEmpId)}
              </Text>
            </View>

            {/* Team Code Input (if no team) */}
            {!selectedTeamCode && (
              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <TextInput
                    value={form.teamCode}
                    onChangeText={(text) => setForm(prev => ({ ...prev, teamCode: text }))}
                    placeholder="Enter team code to create"
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 14,
                      backgroundColor: COLORS.white,
                      color: COLORS.textPrimary,
                    }}
                    placeholderTextColor={COLORS.gray}
                  />
                </View>
                <TouchableOpacity
                  onPress={handleSaveTeam}
                  disabled={loading || !form.teamCode}
                  style={{
                    backgroundColor: (loading || !form.teamCode) ? COLORS.gray : COLORS.primary,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 8,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: COLORS.white, fontWeight: '600' }}>Save</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Add Member Section */}
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <TextInput
                  value={memberEmployeeId}
                  onChangeText={setMemberEmployeeId}
                  placeholder="Enter employee ID to add"
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 14,
                    backgroundColor: COLORS.white,
                    color: COLORS.textPrimary,
                  }}
                  placeholderTextColor={COLORS.gray}
                />
              </View>
              <TouchableOpacity
                onPress={handleAddMember}
                disabled={loading || !selectedTeamCode || !memberEmployeeId}
                style={{
                  backgroundColor: (loading || !selectedTeamCode || !memberEmployeeId) ? COLORS.gray : COLORS.green,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 8,
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: COLORS.white, fontWeight: '600' }}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Team Details */}
            {teamDetails && (
              <View style={{ backgroundColor: COLORS.filterBg, borderRadius: 8, padding: 12 }}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray }}>Team Code</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.textPrimary }}>{teamDetails.teamCode}</Text>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, color: COLORS.gray }}>Team Leader</Text>
                  <Text style={{ fontSize: 14, color: COLORS.textPrimary }}>
                    {teamDetails.leaderEmployeeId} - {getLeaderName(teamDetails.leaderEmployeeId)}
                  </Text>
                </View>

                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 }}>Members</Text>
                
                {/* Members List */}
                <ScrollView horizontal style={{ maxHeight: 200 }}>
                  <View>
                    <View style={{ flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 4 }}>
                      <Text style={{ width: 150, color: COLORS.white, fontWeight: '600', fontSize: 12 }}>Employee ID</Text>
                      <Text style={{ width: 80, color: COLORS.white, fontWeight: '600', fontSize: 12, textAlign: 'center' }}>Actions</Text>
                    </View>

                    {(teamDetails.members || []).map((memberId) => (
                      <View key={memberId} style={{ flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
                        <Text style={{ width: 150, fontSize: 12, color: COLORS.textPrimary }}>{memberId}</Text>
                        <View style={{ width: 80, alignItems: 'center' }}>
                          <TouchableOpacity
                            onPress={() => handleRemoveMember(memberId)}
                            style={{ backgroundColor: COLORS.red + '20', padding: 4, borderRadius: 4 }}
                          >
                            <Icon name="delete" size={16} color={COLORS.red} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    {(teamDetails.members || []).length === 0 && (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: COLORS.gray }}>No members yet</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* Footer */}
      <CommonFooter 
        companyName="CALDIM ENGINEERING PVT LTD"
        marqueeText="Team Management • Project Management • "
      />
    </SafeAreaView>
  );
};

export default TeamManagementScreen;