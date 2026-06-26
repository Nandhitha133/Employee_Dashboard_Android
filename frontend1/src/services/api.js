import axios from 'axios';

const origin = typeof window !== 'undefined' ? window.location.origin : '';
const isVercelHost = typeof window !== 'undefined' && /vercel\.app$/i.test(window.location.host);
const DEFAULT_REMOTE_API_BASE = 'https://employee-react-main.onrender.com/api';

const getAPI_BASE_URL = () => {
  if (process.env.REACT_APP_API_BASE) {
    return process.env.REACT_APP_API_BASE;
  }
  if (!origin) {
    return 'http://127.0.0.1:5003/api';
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
  const isLocal = hostname === 'localhost' || 
                  hostname === '127.0.0.1' || 
                  /^192\.168\./.test(hostname) || 
                  /^10\./.test(hostname) || 
                  /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
  if (isLocal) {
    return `${protocol}//${hostname}:5003/api`;
  }
  return isVercelHost ? DEFAULT_REMOTE_API_BASE : DEFAULT_REMOTE_API_BASE;
};

const API_BASE_URL = getAPI_BASE_URL();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000
});

export const BASE_URL = API_BASE_URL.replace('/api', '');

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const mailAPI = {
  send: (data) => api.post('/mail/send', data),
};

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  verify: () => api.get('/auth/verify'),
  getAllUsers: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
};

export const employeeAPI = {
  getAllEmployees: (status) => api.get('/employees', { params: { status } }),
  getEmployeeById: (id) => api.get(`/employees/${id}`),
  getMyProfile: () => api.get('/employees/me'),
  createEmployee: (data) => api.post('/employees', data),
  updateEmployee: (id, data) => api.put(`/employees/${id}`, data),
  updateMyProfile: (data) => api.put('/employees/me', data),
  deleteEmployee: (id) => api.delete(`/employees/${id}`),
  // Get employees for timesheet purposes only (limited data)
  getTimesheetEmployees: () => api.get('/employees/timesheet/employees'),
};

export const hikvisionAPI = {
  // Connection & Status
  getConnectionStatus: () => api.get('/hik/status'),
  testConnection: () => api.get('/hik/test-connection'),

  // Attendance Data
  getAttendance: (params) => api.get('/hik/attendance-data', { params }),
  pullEvents: (data) => api.post('/hik/pull-events', data),

  // Save Hikvision data to MongoDB
  saveAttendanceToDB: (data) => api.post('/attendance/save-hikvision-attendance', data),

  // Device Information
  getDeviceInfo: () => api.get('/hik/device-info'),

  // Test endpoints
  testSimple: (data) => api.post('/hik/test-simple', data),
  testAttendance: () => api.post('/hik/test-attendance'),
};

export const hikCentralAPI = {
  syncEmployees: () => api.post('/hik-employees/sync-employees'),
  getHikEmployees: (params) => api.get('/hik-employees/hik-employees', { params }),
  getHikEmployeeById: (personId) => api.get(`/hik-employees/hik-employees/${personId}`),
  getAttendanceReport: () => api.post('/hik-employees/attendance-report'),
  getHikAttendance: (params) => api.get('/hik-employees/hik-attendance', { params }),
  syncHikvisionAttendance: () => api.post('/hik-employees/sync-attendance'),
};

export const timesheetAPI = {
  saveTimesheet: (data) => api.post('/timesheets', data),
  getTimesheet: (params) => api.get('/timesheets', { params }),
  getMyTimesheets: () => api.get('/timesheets/my-timesheets'),
  getTimesheetById: (id) => api.get(`/timesheet-history/${id}`),
  updateTimesheetStatus: (id, status) => api.put(`/timesheet-history/${id}/status`, { status }),
  deleteTimesheet: (id) => api.delete(`/timesheets/${id}`),
  getAttendanceData: (params) => api.get('/attendance/my-week', { params }),
  getPermissionUsage: (params) => api.get('/timesheets/permissions/usage', { params }),
};

export const projectAPI = {
  getAllProjects: () => api.get('/projects'),
  createProject: (data) => api.post('/projects', data),
  updateProject: (id, data) => api.put(`/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/projects/${id}`),
};

export const policyAPI = {
  list: () => api.get('/policies'),
  create: (data) => api.post('/policies', data),
  update: (id, data) => api.put(`/policies/${id}`, data),
  remove: (id) => api.delete(`/policies/${id}`),
};

export const leaveAPI = {
  apply: (data) => api.post('/leaves', data),
  myLeaves: () => api.get('/leaves/my'),
  myBalance: () => api.get('/leaves/my-balance'),
  getBalance: (params) => api.get('/leaves/balance', params ? { params } : undefined),
  saveBalance: (data) => api.put('/leaves/balance/save', data),
  syncAllBalances: () => api.post('/leaves/balance/sync-all'),
  list: (params) => api.get('/leaves', params ? { params } : undefined),
  getLedger: (employeeId, params) => api.get(`/leaves/ledger/${employeeId}`, params ? { params } : undefined),
  runAllocation: (data) => api.post('/leaves/run-allocation', data),
  getAllocationHistory: () => api.get('/leaves/allocation-history'),
  updateStatus: (id, status, rejectionReason) => api.put(`/leaves/${id}/status`, { status, rejectionReason }),
  update: (id, data) => api.put(`/leaves/${id}`, data),
  remove: (id) => api.delete(`/leaves/${id}`),
  getPreviewSplit: (days, employeeId) => api.get('/leaves/preview-split', { params: { days, employeeId } }),
  downloadDocument: (documentUrl) => {
    const raw = typeof documentUrl === 'string' ? documentUrl.trim() : '';
    if (!raw) return Promise.reject(new Error('Invalid documentUrl'));
    const apiPath = raw.startsWith('/api/') ? raw.replace(/^\/api/, '') : raw;
    return api.get(apiPath, { responseType: 'blob' });
  }
};

export const allocationAPI = {
  getAllAllocations: () => api.get('/allocations'),
  createAllocation: (data) => api.post('/allocations', data),
  updateAllocation: (id, data) => api.put(`/allocations/${id}`, data),
  deleteAllocation: (id) => api.delete(`/allocations/${id}`),
  getProjectCode: (projectName) => api.get(`/allocations/project-code/${encodeURIComponent(projectName)}`),
};

export const accessAPI = {
  // Local Access Control
  getMyLogs: (params) => api.get('/access/my-logs', { params }),
  punch: (data) => api.post('/access/punch', data),
  getStats: (params) => api.get('/access/stats', { params }),
  getEmployeeLogs: (params) => api.get('/access/logs', { params }),
  getEmployees: () => api.get('/employees'),

  // Hikvision Integration
  getHikvisionConnectionStatus: () => hikvisionAPI.getConnectionStatus(),
  pullHikvisionEvents: (data) => hikvisionAPI.pullEvents(data),
  getHikvisionAttendance: (params) => hikvisionAPI.getAttendance(params),
  syncHikvisionData: () => hikvisionAPI.pullEvents({}),

  // Local Database Attendance
  getLocalAttendance: (params) => api.get('/attendance', { params }),
  createAttendanceRecord: (data) => api.post('/attendance', data),
  getAttendanceSummary: () => api.get('/attendance/summary'),

  // Fallback methods
  testHikvisionConnection: () => hikvisionAPI.testConnection(),
};

export const attendanceAPI = {
  // Local attendance records
  getAll: (params) => api.get('/attendance', { params }),
  create: (data) => api.post('/attendance', data),
  getSummary: (params) => api.get('/attendance/summary', params ? { params } : undefined),
  getYearSummary: (employeeId, params) =>
    api.get(`/attendance/year-summary/${encodeURIComponent(employeeId)}`, { params }),
  saveYearSummary: (employeeId, data) => api.put(`/attendance/year-summary/${encodeURIComponent(employeeId)}`, data),
  regularize: (data) => api.post('/attendance/regularize', data),

  update: (id, data) => api.put(`/attendance/${id}`, data),
  remove: (id) => api.delete(`/attendance/${id}`),
  // Hikvision integration
  getHikvision: (params) => hikvisionAPI.getAttendance(params),
  syncHikvision: () => hikvisionAPI.pullEvents({}),
};

export const adminTimesheetAPI = {
  list: (params) => api.get('/admin-timesheet/list', { params }),
  approve: (id) => api.put(`/admin-timesheet/approve/${id}`),
  reject: (id, reason) => api.put(`/admin-timesheet/reject/${id}`, { reason }),
  summary: (params) => api.get('/admin-timesheet/summary', { params }),
};

export const specialPermissionAPI = {
  create: (formData) => api.post('/special-permissions', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  my: (params) => api.get('/special-permissions/my', { params }),
  list: (params) => api.get('/special-permissions/list', { params }),
  approve: (id) => api.put(`/special-permissions/approve/${id}`),
  reject: (id, reason) => api.put(`/special-permissions/reject/${id}`, { reason }),
};

export const attendanceApprovalAPI = {
  request: (data) => api.post('/attendance-approval/request', data),
  list: (params) => api.get('/attendance-approval/list', { params }),
  approve: (id) => api.put(`/attendance-approval/approve/${id}`),
  reject: (id, reason) => api.put(`/attendance-approval/reject/${id}`, { reason }),
};

export const teamAPI = {
  getLeaders: (type) => api.get('/teams/leaders', type ? { params: { type } } : undefined),
  list: () => api.get('/teams'),
  getByCode: (teamCode) => api.get(`/teams/${encodeURIComponent(teamCode)}`),
  upsert: (data) => api.post('/teams', data),
  addMember: (teamCode, employeeId) => api.post(`/teams/${encodeURIComponent(teamCode)}/members`, { employeeId }),
  removeMember: (teamCode, employeeId) => api.delete(`/teams/${encodeURIComponent(teamCode)}/members/${encodeURIComponent(employeeId)}`),
};

export const internAPI = {
  getAll: () => api.get('/interns'),
  getById: (id) => api.get(`/interns/${id}`),
  search: (params) => api.get('/interns/search', { params }),
  create: (data) => api.post('/interns', data),
  update: (id, data) => api.put(`/interns/${id}`, data),
  remove: (id) => api.delete(`/interns/${id}`),
};

export const performanceAPI = {
  // Self Appraisal Endpoints
  getMySelfAppraisals: () => api.get('/performance/self-appraisals/me'),
  getSelfAppraisalById: (id) => api.get(`/performance/self-appraisals/${id}`),
  getAppraisalById: (id) => api.get(`/performance/self-appraisals/${id}`),
  createSelfAppraisal: (data) => api.post('/performance/self-appraisals', data),
  updateSelfAppraisal: (id, data) => api.put(`/performance/self-appraisals/${id}`, data),
  deleteSelfAppraisal: (id) => api.delete(`/performance/self-appraisals/${id}`),
  
  // For Team Appraisal (Manager View)
  getTeamAppraisals: () => api.get('/performance/team-appraisals'),
  updateTeamAppraisal: (id, data) => api.put(`/performance/team-appraisals/${id}`, data),
  saveManagerReview: (id, data) => api.put(`/performance/team-appraisals/${id}/review`, data),
  submitToReviewer: (id) => api.post(`/performance/team-appraisals/${id}/approve`),
  sendBackToEmployee: (id, data) => api.post(`/performance/team-appraisals/${id}/send-back`, data),
  
  // Reviewer View (Legacy/Specific)
  getReviewerAppraisals: (params) => api.get('/performance/reviewer', { params }),
  updateReviewerAppraisal: (id, data) => api.put(`/performance/reviewer/${id}`, data),
  openReviewerAppraisal: (id) => api.post(`/performance/reviewer/${id}/open`),
  reviewerSubmitToDirector: (ids) => api.post('/performance/reviewer/submit-director', { ids }), // Reviewer's batch submit
  
  getDirectorAppraisals: (params) => api.get('/performance/director', { params }),
  updateDirectorAppraisal: (id, data) => api.put(`/performance/director/${id}`, data),
  openDirectorAppraisal: (id) => api.post(`/performance/director/${id}/open`),
  directorApprove: (id) => api.post(`/performance/director/${id}/approve`),
  directorPushBack: (id, data) => api.post(`/performance/director/${id}/push-back`, data),
  directorReject: (id) => api.post(`/performance/director/${id}/reject`),
  directorRelease: (ids) => api.post('/performance/director/release', { ids }),
  revokeAppraisal: (id, reason) => api.post(`/performance/director/revoke/${id}`, { reason }),

  // Appraisal-linked Promotion Endpoints
  updatePromotion: (id, data) => api.post(`/performance/director/${id}/promotion`, data),

  getIncrementMatrix: (params) => api.get('/performance/increment-master', { params }),
  saveIncrementMatrix: (data) => api.post('/performance/increment-master', data),
  calculateIncrementFromMatrix: (data) => api.post('/performance/increment-master/calculate', data),

  getIncrementSummary: (params) => api.get('/performance/increment-summary', { params }),

  // Attributes
  getAttributes: (designation) => api.get(`/performance/attributes/${designation}`),
  saveAttributes: (data) => api.post('/performance/attributes', data),
  saveBulkSubItem: (data) => api.post('/performance/attributes/bulk-subitem', data),
  getMasterAttributes: () => api.get('/performance/attributes/master'),
  addMasterAttribute: (data) => api.post('/performance/attributes/master/add', data),
  deleteMasterAttribute: (section, key) => api.delete(`/performance/attributes/master/${section}/${key}`),
  calculateIncrement: (data) => api.post('/performance/calculate-increment', data),
};

export const payrollAPI = {
  list: () => api.get('/payroll'),
  create: (data) => api.post('/payroll', data),
  update: (id, data) => api.put(`/payroll/${id}`, data),
  remove: (id) => api.delete(`/payroll/${id}`),
  getById: (id) => api.get(`/payroll/${id}`),
  getByEmployeeId: (employeeId) => api.get('/payroll').then(res => {
    const list = Array.isArray(res.data) ? res.data : [];
    const found = list.find(p => String(p.employeeId || '').toLowerCase() === String(employeeId || '').toLowerCase());
    return { data: found || null };
  }),
  getSnapshot: (fy, employeeId) => api.get(`/payroll/snapshot/${fy}/${employeeId}`),
  getSnapshotsList: (fy) => api.get(`/payroll/snapshot/${fy}`)
};

export const payrollHistoryAPI = {
  getSnapshot: (fy) => api.get(`/payroll/history/snapshot/${fy}`),
  getHistory: (employeeId, params) => api.get(`/payroll/history/${employeeId}`, { params }),
  update: (id, data) => api.put(`/payroll/history/${id}`, data),
  delete: (id) => api.delete(`/payroll/history/${id}`)
};

export const monthlyPayrollAPI = {
  save: (data) => api.post('/monthly-payroll/run', data),
  list: (params) => api.get('/monthly-payroll', { params }),
  getEmployeeHistory: (employeeId) => api.get(`/monthly-payroll/history/${employeeId}`),
  markEmailSent: (data) => api.put('/monthly-payroll/mark-email-sent', data),
  markPaid: (data) => api.put('/monthly-payroll/mark-paid', data),
  delete: (month) => api.delete(`/monthly-payroll/${month}`)
};

export const holidayAllowanceAPI = {
  saveBulk: (data) => api.post('/holiday-allowances/bulk-save', data),
  list: (params) => api.get('/holiday-allowances', { params }),
  getSummary: (params) => api.get('/holiday-allowances/summary', { params }),
};

export const regionalHolidayAPI = {
  list: () => api.get('/regional-holidays'),
  create: (data) => api.post('/regional-holidays', data),
  remove: (id) => api.delete(`/regional-holidays/${id}`)
};

export const officeHolidayAPI = {
  list: () => api.get('/office-holidays'),
  create: (data) => api.post('/office-holidays', data),
  remove: (id) => api.delete(`/office-holidays/${id}`)
};

export const loanAPI = {
  list: (params) => api.get('/loans', { params }),
  getById: (id) => api.get(`/loans/${id}`),
  create: (data) => api.post('/loans', data),
  update: (id, data) => api.put(`/loans/${id}`, data),
  delete: (id) => api.delete(`/loans/${id}`),
  togglePayment: (id) => api.patch(`/loans/${id}/payment`),
};

export const expenditureAPI = {
  healthCheck: () => api.get('/expenditure/health-check'),
  saveMonthlyRecord: (data) => api.post('/expenditure/save-monthly', data),
  updateRecord: (id, data) => api.put(`/expenditure/update/${id}`, data),
  getSummary: (params) => api.get('/expenditure/summary', { params }),
  getRecordById: (id) => api.get(`/expenditure/record/${id}`),
  deleteRecord: (id) => api.delete(`/expenditure/record/${id}`),
  getExpenseTypes: () => api.get('/expenditure/expense-types'),
  addExpenseType: (data) => api.post('/expenditure/expense-types', data),
};

export const exitFormalityAPI = {
  getAll: (params) => api.get('/exit-formalities', { params }),
  getPending: (params) => api.get('/exit-formalities/pending', { params }),
  getCompleted: (params) => api.get('/exit-formalities/completed', { params }),
  getDrafts: (params) => api.get('/exit-formalities/drafts', { params }),
  getMyExit: () => api.get('/exit-formalities/me'),
  getExitById: (id) => api.get(`/exit-formalities/${id}`),
  createExit: (data) => api.post('/exit-formalities', data),
  updateExit: (id, data) => api.put(`/exit-formalities/${id}`, data),
  submitExit: (id) => api.post(`/exit-formalities/${id}/submit`),
  getClearance: (id) => api.get(`/exit-formalities/${id}/clearance`),
  updateClearance: (id, department, status, remarks) => api.put(`/exit-formalities/${id}/clearance/${department}`, { status, remarks }),
  reject: (id, reason) => api.post(`/exit-formalities/${id}/reject`, { reason }),
  managerApprove: (id) => api.post(`/exit-formalities/${id}/manager-approve`),
  approve: (id) => api.post(`/exit-formalities/${id}/approve`),
  hrApprove: (id) => api.post(`/exit-formalities/${id}/hr-approve`),
  cancel: (id) => api.post(`/exit-formalities/${id}/cancel`),
  remove: (id) => api.delete(`/exit-formalities/${id}`),
};

export const compensationAPI = {
  getAll: () => api.get('/compensation'),
  getById: (id) => api.get(`/compensation/${id}`),
  create: (data) => api.post('/compensation', data),
  update: (id, data) => api.put(`/compensation/${id}`, data),
  delete: (id) => api.delete(`/compensation/${id}`),
};

export const insuranceAPI = {
  getAll: () => api.get('/insurance'),
  create: (data) => api.post('/insurance', data),
  update: (id, data) => api.put(`/insurance/${id}`, data),
  delete: (id) => api.delete(`/insurance/${id}`),
};

export const insuranceClaimAPI = {
  getAll: () => api.get('/insurance-claims'),
  create: (data) => api.post('/insurance-claims', data),
  update: (id, data) => api.put(`/insurance-claims/${id}`, data),
  delete: (id) => api.delete(`/insurance-claims/${id}`),
};

export const marriageAllowanceAPI = {
  list: (params) => api.get('/marriage-allowances', { params }),
  getById: (id) => api.get(`/marriage-allowances/${id}`),
  create: (formData) => api.post('/marriage-allowances', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/marriage-allowances/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/marriage-allowances/${id}`)
};

export const promotionAPI = {
  promoteEmployee: (data) => api.post('/promoteEmployee', data),
  getPromotionHistory: (params) => api.get('/promotionHistory', params ? { params } : undefined),
  getPromotionRequests: (params) => api.get('/promotionRequests', params ? { params } : undefined),
  approvePromotionRequest: (id) => api.put(`/promotionRequests/${id}/approve`),
  rejectPromotionRequest: (id, reason) => api.put(`/promotionRequests/${id}/reject`, { reason }),
  getMyLatestApprovedPromotion: () => api.get('/promotionHistory/me/latest', { params: { status: 'Approved' } }),
};

export const supportAPI = {
  createTicket: (formData) => api.post('/support/tickets', formData),
  getMyTickets: () => api.get('/support/tickets/my'),
  getAllTickets: (params) => api.get('/support/tickets/all', { params }),
  getTicketById: (id) => api.get(`/support/tickets/${id}`),
  updateStatus: (id, data) => api.put(`/support/tickets/${id}/status`, data),
  addComment: (id, data) => api.post(`/support/tickets/${id}/comments`, data),
  getDashboardStats: () => api.get('/support/dashboard-stats'),
};

// Announcements (management + public active list)
authAPI.announcement = {
  getAll: async () => {
    const res = await api.get('/announcements');
    return res.data;
  },
  getActive: async () => {
    const res = await api.get('/announcements/active');
    return res.data;
  },
  create: async (data) => {
    const res = await api.post('/announcements', data);
    return res.data;
  },
  update: async (id, data) => {
    const res = await api.put('/announcements/${id}', data);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete('/announcements/${id}');
    return res.data;
  }
};

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`)
};

export const celebrationAPI = {
  getCalendar: (params) => api.get('/celebrations/calendar', { params }),
  getWishStats: (params) => api.get('/celebrations/stats', { params }),
  sendWish: (data) => api.post('/celebrations/wish', data),
  updateWish: (id, data) => api.put(`/celebrations/wish/${id}`, data),
  deleteWish: (id) => api.delete(`/celebrations/wish/${id}`),
  replyWish: (wishId, data) => api.post(`/celebrations/wish/${wishId}/reply`, data),
};

export const performancePayAPI = {
  getAll: (params) => api.get('/performance-pay', { params }),
  create: (data) => api.post('/performance-pay', data),
  update: (id, data) => api.put(`/performance-pay/${id}`, data),
  remove: (id) => api.delete(`/performance-pay/${id}`),
  approve: (ids) => api.post('/performance-pay/approve', { ids }),
  generateLetter: (ids) => api.post('/performance-pay/generate-letter', { ids }),
  credit: (ids) => api.post('/performance-pay/credit', { ids }),
  getPendingPayroll: () => api.get('/performance-pay/pending-payroll'),
};

export const conferenceBookingAPI = {
  getAll: () => api.get('/conference-bookings'),
  create: (data) => api.post('/conference-bookings', data),
  updateStatus: (id, data) => api.put(`/conference-bookings/${id}/status`, data),
  block: (data) => api.post('/conference-bookings/block', data),
};

export const assetAPI = {
  getAllAssets: () => api.get('/assets'),
  createAsset: (data) => api.post('/assets', data),
  updateAsset: (id, data) => api.put(`/assets/${id}`, data),
  deleteAsset: (id) => api.delete(`/assets/${id}`),
  allocate: (data) => api.post('/assets/allocate', data),
  deallocate: (data) => api.post('/assets/deallocate', data),
  getTickets: () => api.get('/assets/tickets'),
  createTicket: (data) => api.post('/assets/tickets', data),
  resolveTicket: (id, data) => api.put(`/assets/tickets/${id}/resolve`, data),
  getRequests: () => api.get('/assets/requests'),
  createRequest: (data) => api.post('/assets/requests', data),
  updateRequestStatus: (id, status) => api.put(`/assets/requests/${id}/status`, { status }),
  getMaintenance: () => api.get('/assets/maintenance'),
  createMaintenance: (data) => api.post('/assets/maintenance', data),
};

export default api;

