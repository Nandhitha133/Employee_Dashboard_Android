import React, { useEffect, useState } from 'react';
import { teamAPI, employeeAPI, authAPI } from '../../services/api';
import Modal from '../../components/Modals/Modal';



const TeamManagement = () => {
  const [leaders, setLeaders] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTeamCode, setSelectedTeamCode] = useState('');
  const [teamDetails, setTeamDetails] = useState(null);
  const [form, setForm] = useState({ teamCode: '', leaderEmployeeId: '', division: '' });
  const [memberEmployeeId, setMemberEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', division: '' });
  const [empFilters, setEmpFilters] = useState({ location: '', division: '', managerEmpId: '' });
  const [selectedLeaderEmpId, setSelectedLeaderEmpId] = useState('');
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [selectedEmpForManager, setSelectedEmpForManager] = useState('');
  const [managerPassword, setManagerPassword] = useState('Cde@123456');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [leadersRes, teamsRes, employeesRes] = await Promise.all([
        teamAPI.getLeaders('project'),
        teamAPI.list(),
        employeeAPI.getAllEmployees()
      ]);
      setLeaders(leadersRes.data || []);
      setTeams(teamsRes.data || []);
      setEmployees(employeesRes.data || []);
      try {
        const usersRes = await authAPI.getAllUsers();
        setUsers(usersRes.data || []);
      } catch (e) {
        setUsers([]);
      }
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const uniqueDivisions = Array.from(new Set(leaders.map(l => l.division).filter(Boolean)));
  const uniqueEmpLocations = Array.from(new Set(employees.map(e => e.location).filter(Boolean)));
  const uniqueEmpDivisions = Array.from(new Set(employees.map(e => e.division).filter(Boolean)));
  const filteredLeaders = leaders.filter(l => {
    const s = filters.search.trim().toLowerCase();
    const matchesSearch = !s || l.name.toLowerCase().includes(s) || String(l.employeeId).toLowerCase().includes(s);
    const matchesDivision = !filters.division || l.division === filters.division;
    return matchesSearch && matchesDivision;
  });

  const filteredEmployees = employees.filter(e => {
    const matchLocation = !empFilters.location || e.location === empFilters.location;
    const matchDivision = !empFilters.division || e.division === empFilters.division;
    let matchManager = true;
    if (empFilters.managerEmpId) {
      const team = teams.find(t => t.leaderEmployeeId === empFilters.managerEmpId);
      const members = team?.members || [];
      matchManager = members.includes(e.employeeId);
    }
    return matchLocation && matchDivision && matchManager;
  });
  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const getNum = (id) => {
      const m = String(id || '').match(/^CDE(\d{3})$/i);
      return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
    };
    const na = getNum(a.employeeId);
    const nb = getNum(b.employeeId);
    if (na !== nb) return na - nb;
    return String(a.employeeId).localeCompare(String(b.employeeId));
  });

  const employeesById = employees.reduce((acc, emp) => {
    acc[emp.employeeId] = emp;
    return acc;
  }, {});

  const adminPmOptions = Array.from(
    new Map(
      users
        .filter(u => ['projectmanager', 'manager', 'director'].includes(u.role) && u.employeeId)
        .map(u => [u.employeeId, u])
    ).values()
  )
    .map(u => {
      const emp = employeesById[u.employeeId];
      const displayName = emp?.name || u.name || u.employeeId;
      let roleLabel = 'Reporting Manager';
      if (u.role === 'manager') roleLabel = 'General Manager';
      if (u.role === 'director') roleLabel = 'Director';
      return { value: u.employeeId, label: `${u.employeeId} - ${displayName} (${roleLabel})` };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const getAssignedManagerEmpId = (employeeId) => {
    const team = teams.find(t => (t.members || []).includes(employeeId));
    return team?.leaderEmployeeId || '';
  };

  const getLeaderLabel = (leaderEmployeeId) => {
    if (!leaderEmployeeId) return '';
    const emp = employeesById[leaderEmployeeId];
    if (emp?.name) return `${leaderEmployeeId} - ${emp.name}`;
    const leader = leaders.find(l => l.employeeId === leaderEmployeeId);
    return leader?.name ? `${leaderEmployeeId} - ${leader.name}` : leaderEmployeeId;
  };

  const handleAssignManager = async (employeeId, leaderEmployeeId) => {
    try {
      setLoading(true);
      setError('');

      const currentTeam = teams.find(t => (t.members || []).includes(employeeId));
      const currentLeader = currentTeam?.leaderEmployeeId || '';
      const nextLeader = String(leaderEmployeeId || '');

      if (currentTeam && currentLeader && currentLeader !== nextLeader) {
        await teamAPI.removeMember(currentTeam.teamCode, employeeId);
      }

      if (!nextLeader) {
        await loadData();
        return;
      }

      let targetTeam = teams.find(t => t.leaderEmployeeId === nextLeader);
      if (!targetTeam) {
        const division = employeesById[nextLeader]?.division || leaders.find(l => l.employeeId === nextLeader)?.division || '';
        const teamCode = `TEAM-${nextLeader}`;
        await teamAPI.upsert({ teamCode, leaderEmployeeId: nextLeader, division });
        targetTeam = { teamCode, leaderEmployeeId: nextLeader, members: [] };
      }

      await teamAPI.addMember(targetTeam.teamCode, employeeId);
      await loadData();
    } catch (e) {
      setError('Failed to assign Admin/PM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const s = filters.search.trim();
    if (filteredLeaders.length === 1) {
      const only = filteredLeaders[0];
      if (only?.employeeId && only.employeeId !== selectedLeaderEmpId) {
        handleSelectLeader(only.employeeId);
      }
      return;
    }
    if (s) {
      const exact = leaders.find(l => String(l.employeeId).toLowerCase() === s.toLowerCase() || l.name.toLowerCase() === s.toLowerCase());
      if (exact && exact.employeeId !== selectedLeaderEmpId) {
        handleSelectLeader(exact.employeeId);
        return;
      }
    }
    if (filteredLeaders.length === 0) {
      if (selectedLeaderEmpId) {
        setSelectedLeaderEmpId('');
        setSelectedTeamCode('');
        setTeamDetails(null);
      }
    }
  }, [filters.search, filters.division, leaders]);

  const handleSaveTeam = async () => {
    if (!form.teamCode || !form.leaderEmployeeId) return;
    try {
      setLoading(true);
      await teamAPI.upsert({ teamCode: form.teamCode.trim(), leaderEmployeeId: form.leaderEmployeeId, division: form.division });
      await loadData();
      setSelectedTeamCode(form.teamCode.trim());
      const teamRes = await teamAPI.getByCode(form.teamCode.trim());
      setTeamDetails(teamRes.data);
    } catch (e) {
      setError('Failed to save team');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (code) => {
    setSelectedTeamCode(code);
    if (!code) { setTeamDetails(null); return; }
    try {
      const res = await teamAPI.getByCode(code);
      setTeamDetails(res.data);
      setForm(prev => ({ ...prev, teamCode: res.data.teamCode, leaderEmployeeId: res.data.leaderEmployeeId, division: res.data.division || '' }));
    } catch (e) {
      setTeamDetails(null);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeamCode || !memberEmployeeId) return;
    try {
      setLoading(true);
      await teamAPI.addMember(selectedTeamCode, memberEmployeeId.trim());
      const res = await teamAPI.getByCode(selectedTeamCode);
      setTeamDetails(res.data);
      setMemberEmployeeId('');
    } catch (e) {
      setError('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (employeeId) => {
    try {
      setLoading(true);
      await teamAPI.removeMember(selectedTeamCode, employeeId);
      const res = await teamAPI.getByCode(selectedTeamCode);
      setTeamDetails(res.data);
    } catch (e) {
      setError('Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const getLeaderName = (id) => {
    const leader = leaders.find(l => l.employeeId === id);
    return leader ? leader.name : '';
  };

  const handleSelectLeader = async (leaderEmpId) => {
    setSelectedLeaderEmpId(leaderEmpId);
    setForm(prev => ({ ...prev, leaderEmployeeId: leaderEmpId }));
    const teamForLeader = teams.find(t => t.leaderEmployeeId === leaderEmpId);
    if (teamForLeader) {
      await handleSelectTeam(teamForLeader.teamCode);
    } else {
      setSelectedTeamCode('');
      setTeamDetails(null);
    }
  };

  const nonManagerEmployees = employees.filter(emp => {
    return !adminPmOptions.some(opt => opt.value === emp.employeeId);
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const handleAddReportingManager = async (e) => {
    e.preventDefault();
    if (!selectedEmpForManager) {
      setModalError('Please select an employee');
      return;
    }
    setLoading(true);
    setModalError('');
    setModalSuccess('');
    try {
      const emp = employees.find(emp => emp.employeeId === selectedEmpForManager);
      if (!emp) {
        setModalError('Employee not found');
        setLoading(false);
        return;
      }

      // Check if user already exists
      const existingUser = users.find(u => String(u.employeeId || '').toLowerCase() === String(selectedEmpForManager).toLowerCase() || String(u.email || '').toLowerCase() === String(emp.email || '').toLowerCase());
      
      if (existingUser) {
        // User exists, check if they are already admin/projectmanager
        if (['admin', 'projectmanager', 'manager', 'director'].includes(existingUser.role)) {
          setModalError(`${emp.name} is already a Reporting Manager, General Manager, Director, or Admin.`);
          setLoading(false);
          return;
        }
        // Promote user to projectmanager
        await authAPI.updateUser(existingUser._id, {
          ...existingUser,
          role: 'projectmanager'
        });
        setModalSuccess(`Successfully updated ${emp.name}'s role to Reporting Manager.`);
      } else {
        // Create new user account with role projectmanager
        if (!emp.email) {
          setModalError('Selected employee does not have an email address. Cannot create user account.');
          setLoading(false);
          return;
        }
        await authAPI.createUser({
          name: emp.name,
          email: emp.email,
          password: managerPassword,
          role: 'projectmanager',
          employeeId: emp.employeeId,
          permissions: ['timesheet_access', 'attendance_approval', 'leave_access', 'team_access']
        });
        setModalSuccess(`Successfully created user account for ${emp.name} as Reporting Manager.`);
      }
      
      // Reload lists
      await loadData();
      
      // Keep modal open briefly then close
      setTimeout(() => {
        setShowAddManagerModal(false);
        setModalSuccess('');
        setSelectedEmpForManager('');
      }, 1500);
      
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to add Reporting Manager');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveReportingManagerRole = async (userId) => {
    const userObj = users.find(u => u._id === userId);
    if (!userObj) return;
    
    if (!window.confirm(`Are you sure you want to remove the Reporting Manager role from ${userObj.name}? They will be reverted to a normal Employee role.`)) {
      return;
    }
    
    setLoading(true);
    setModalError('');
    setModalSuccess('');
    try {
      await authAPI.updateUser(userId, {
        ...userObj,
        role: 'employees'
      });
      setModalSuccess(`Successfully removed Reporting Manager role from ${userObj.name}.`);
      await loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to remove Reporting Manager role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full">

      {/* <h1 className="text-2xl font-semibold text-gray-800 mb-4">Team Management</h1> */}
      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 gap-6 w-full">

        <div className=" bg-white rounded-lg shadow p-4">
          {/* <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-700">Reporting Managers</h2>
            <button onClick={loadData} disabled={loading} className="px-3 py-2 rounded bg-gray-700 text-white">Refresh</button>
          </div> */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by name or 
               id"
              className="w-full border rounded px-3 py-2"
            />
            <select
              value={filters.division}
              onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Divisions</option>
              {uniqueDivisions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={selectedLeaderEmpId}
              onChange={(e) => handleSelectLeader(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Sr.Team Leader</option>
              {filteredLeaders.map(l => (
                <option key={l._id} value={l.employeeId}>{l.employeeId} - {l.name} - {l.division || '-'}</option>
              ))}
            </select>
          </div> */}
          {/* <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Division</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeaders.map(l => (
                  <tr key={l._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectLeader(l.employeeId)}>
                    <td className="px-4 py-2 text-sm text-gray-900">{l.employeeId}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{l.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{l.division || '-'}</td>
                  </tr>
                ))}
                {filteredLeaders.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-500" colSpan={3}>No leaders found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div> */}

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-medium text-gray-700">Employees Filter</h3>
              {(empFilters.location || empFilters.division || empFilters.managerEmpId) && (
                <button
                  onClick={() => setEmpFilters({ location: '', division: '', managerEmpId: '' })}
                  className="px-4 py-2 bg-[#262760] hover:bg-[#1f204d] text-white text-sm rounded transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <select
                value={empFilters.location}
                onChange={(e) => setEmpFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Locations</option>
                {uniqueEmpLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <select
                value={empFilters.division}
                onChange={(e) => setEmpFilters(prev => ({ ...prev, division: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Divisions</option>
                {uniqueEmpDivisions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={empFilters.managerEmpId}
                onChange={(e) => setEmpFilters(prev => ({ ...prev, managerEmpId: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Reporting Managers</option>
                {adminPmOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <div className="h-[calc(100vh-280px)] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#262760] sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-left text-m font-medium text-white uppercase bg-[#262760]">Employee ID</th>
                        <th className="px-4 py-2 text-left text-m font-medium text-white uppercase bg-[#262760]">Employee Name</th>
                        <th className="px-4 py-2 text-left text-m font-medium text-white uppercase bg-[#262760]">Division</th>
                        <th className="px-4 py-2 text-left text-m font-medium text-white uppercase bg-[#262760]">Location</th>
                        <th className="px-4 py-2 text-left text-m font-medium text-white uppercase bg-[#262760]">
                          <div className="flex items-center gap-2 justify-between">
                            <span>Reporting Manager</span>
                            <button
                              onClick={() => {
                                setSelectedEmpForManager('');
                                setManagerPassword('Cde@123456');
                                setModalError('');
                                setModalSuccess('');
                                setShowAddManagerModal(true);
                              }}
                              title="Add/Promote Reporting Manager"
                              className="bg-green-600 hover:bg-green-700 text-white rounded px-2 py-1 text-xs transition-colors flex items-center justify-center font-bold normal-case"
                            >
                              + Add
                            </button>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedEmployees.map(e => {
                        const assignedManagerEmpId = getAssignedManagerEmpId(e.employeeId);
                        const hasManagerInOptions = assignedManagerEmpId
                          ? adminPmOptions.some(o => o.value === assignedManagerEmpId)
                          : true;
                        return (
                          <tr key={e._id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{e.employeeId}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{e.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{e.division || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{e.location || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              <div className="flex items-center gap-1.5">
                                <select
                                  className="w-full border rounded px-2 py-1"
                                  value={assignedManagerEmpId}
                                  disabled={loading}
                                  onChange={(ev) => handleAssignManager(e.employeeId, ev.target.value)}
                                >
                                  <option value="">Unassigned</option>
                                  {assignedManagerEmpId && !hasManagerInOptions && (
                                    <option value={assignedManagerEmpId}>{getLeaderLabel(assignedManagerEmpId)}</option>
                                  )}
                                  {adminPmOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                                {assignedManagerEmpId && (
                                  <button
                                    onClick={() => handleAssignManager(e.employeeId, "")}
                                    disabled={loading}
                                    title="Unassign Reporting Manager"
                                    className="text-red-500 hover:text-red-700 font-bold p-1 text-sm transition-colors"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredEmployees.length === 0 && (
                        <tr>
                          <td className="px-4 py-4 text-sm text-gray-500" colSpan={5}>No employees found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>

      {selectedLeaderEmpId && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-700">Manage Team Members</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-sm text-gray-600">Selected Leader</div>
              <div className="text-base font-medium">{selectedLeaderEmpId} {getLeaderName(selectedLeaderEmpId)}</div>
            </div>
            {!selectedTeamCode && (
              <div>
                <input value={form.teamCode} onChange={(e) => setForm(prev => ({ ...prev, teamCode: e.target.value }))} className="w-full border rounded px-3 py-2" placeholder="Enter team code to create" />
              </div>
            )}
            {!selectedTeamCode && (
              <div className="flex items-end">
                <button onClick={handleSaveTeam} disabled={loading || !form.teamCode || !form.leaderEmployeeId} className="w-full bg-[#262760] hover:bg-[#1f204d] text-white rounded px-3 py-2">Save Team</button>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600">Employee ID</label>
              <input value={memberEmployeeId} onChange={(e) => setMemberEmployeeId(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="Enter employee id" />
            </div>
            <div className="flex items-end">
              <button onClick={handleAddMember} disabled={loading || !selectedTeamCode || !memberEmployeeId} className="w-full bg-[#262760] hover:bg-[#1f204d] text-white rounded px-3 py-2">Add to Team</button>
            </div>
          </div>

          {teamDetails && (
            <div className="border rounded p-3">
              <div className="mb-3">
                <div className="text-sm text-gray-600">Team</div>
                <div className="text-lg font-medium">{teamDetails.teamCode}</div>
              </div>
              <div className="mb-3">
                <div className="text-sm text-gray-600">Leader</div>
                <div className="text-lg font-medium">{teamDetails.leaderEmployeeId} {getLeaderName(teamDetails.leaderEmployeeId)}</div>
              </div>
              <div className="mb-2 text-sm text-gray-600">Members</div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(teamDetails.members || []).map(m => (
                      <tr key={m}>
                        <td className="px-4 py-2 text-sm text-gray-900">{m}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleRemoveMember(m)} className="px-3 py-1 rounded bg-red-600 text-white">Remove</button>
                        </td>
                      </tr>
                    ))}
                    {(teamDetails.members || []).length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-sm text-gray-500" colSpan={2}>No members yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      <Modal
        isOpen={showAddManagerModal}
        onClose={() => setShowAddManagerModal(false)}
        title="Add/Promote Reporting Manager"
      >
        <form onSubmit={handleAddReportingManager} className="space-y-6 text-gray-700">
          {modalError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-sm font-medium animate-pulse">
              <span>⚠️</span>
              <span>{modalError}</span>
            </div>
          )}
          {modalSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border-l-4 border-green-500 rounded text-green-700 text-sm font-medium">
              <span>🚀</span>
              <span>{modalSuccess}</span>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select Employee to Promote</label>
            <div className="relative">
              <select
                value={selectedEmpForManager}
                onChange={(e) => {
                  setSelectedEmpForManager(e.target.value);
                  setModalError('');
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-50 text-gray-800 font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-transparent focus:bg-white shadow-sm"
                required
              >
                <option value="">-- Choose from available employees --</option>
                {nonManagerEmployees.map(emp => (
                  <option key={emp._id} value={emp.employeeId}>
                    {emp.employeeId} - {emp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedEmpForManager && (() => {
            const emp = employees.find(e => e.employeeId === selectedEmpForManager);
            if (!emp) return null;
            const initials = emp.name ? emp.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'EM';
            const userExists = users.some(u => String(u.employeeId || '').toLowerCase() === String(selectedEmpForManager).toLowerCase() || String(u.email || '').toLowerCase() === String(emp?.email || '').toLowerCase());
            
            return (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5 shadow-sm space-y-4 transition-all duration-300 transform translate-y-0 scale-100">
                {/* Employee Profile Header Card */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#262760] to-[#4c4eaf] text-white flex items-center justify-center font-bold text-lg shadow-md">
                    {initials}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-gray-800">{emp.name}</h4>
                    <p className="text-xs font-semibold text-gray-500">ID: {emp.employeeId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-white border rounded-lg p-2.5 shadow-sm">
                    <span className="block text-gray-400 font-semibold uppercase tracking-wider mb-0.5" style={{ fontSize: '10px' }}>Division</span>
                    <span className="font-semibold text-gray-700">{emp.division || 'Not Assigned'}</span>
                  </div>
                  <div className="bg-white border rounded-lg p-2.5 shadow-sm">
                    <span className="block text-gray-400 font-semibold uppercase tracking-wider mb-0.5" style={{ fontSize: '10px' }}>Location</span>
                    <span className="font-semibold text-gray-700">{emp.location || 'Not Assigned'}</span>
                  </div>
                </div>

                {userExists ? (
                  <div className="bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl p-3 flex items-start gap-2.5">
                    <span className="text-base mt-0.5">✓</span>
                    <div>
                      <p className="font-bold">Existing user account found</p>
                      <p className="text-green-600 mt-0.5">This user's role will be automatically changed to "Reporting Manager" (projectmanager).</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-xl p-3 flex items-start gap-2.5">
                      <span className="text-base mt-0.5">✦</span>
                      <div>
                        <p className="font-bold">New user account required</p>
                        <p className="text-indigo-600 mt-0.5">A fresh system user account will be generated for this employee to log in as a Reporting Manager.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Set Initial Password</label>
                      <input
                        type="text"
                        value={managerPassword}
                        onChange={(e) => setManagerPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-[#262760] focus:border-transparent shadow-sm"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="pt-4 border-t border-gray-200">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Reporting Managers</label>
            <div className="max-h-40 overflow-y-auto space-y-2 border rounded-lg p-2 bg-gray-50">
              {users.filter(u => ['projectmanager', 'manager', 'director'].includes(u.role) && u.employeeId).length === 0 ? (
                <div className="text-gray-400 text-xs py-2 text-center">No reporting managers assigned yet.</div>
              ) : (
                users.filter(u => ['projectmanager', 'manager', 'director'].includes(u.role) && u.employeeId).map(m => {
                  const emp = employeesById[m.employeeId];
                  let roleLabel = 'Reporting Manager';
                  if (m.role === 'manager') roleLabel = 'General Manager';
                  if (m.role === 'director') roleLabel = 'Director';
                  return (
                    <div key={m._id} className="flex justify-between items-center bg-white p-2 rounded-md shadow-sm border border-gray-150 text-xs">
                      <div>
                        <span className="font-semibold text-gray-700">{m.employeeId}</span> - <span className="text-gray-800">{emp?.name || m.name}</span> <span className="text-gray-400 font-medium">({roleLabel})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveReportingManagerRole(m._id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50 font-semibold px-2 py-1 rounded transition-colors"
                        title="Remove Reporting Manager Role"
                      >
                        Delete
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowAddManagerModal(false)}
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 bg-white font-semibold transition hover:bg-gray-50 shadow-sm"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-[#262760] to-[#404294] hover:from-[#1f204d] hover:to-[#333575] text-white rounded-lg font-semibold transition shadow-md flex items-center gap-2"
              disabled={loading || !selectedEmpForManager}
            >
              {loading ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1"></span>
                  Saving...
                </>
              ) : (
                'Designate as Manager'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeamManagement;
