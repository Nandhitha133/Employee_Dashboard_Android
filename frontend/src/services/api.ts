// src/services/api.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Types
export interface LoginCredentials {
  employeeId: string;
  password: string;
}

export interface ForgotPasswordData {
  employeeId: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId?: string;
}

export interface Employee {
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
  appraiser?: string;
  reviewer?: string;
  director?: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  date: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Define types for better type safety
interface RequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface QueuedRequest {
  config: RequestConfig;
  timestamp: number;
}

// Navigation ref type
interface NavigationRef {
  navigate: (screen: string, params?: any) => void;
}

// Navigation service - FIXED: removed the extra navigate property
export const navigationRef: { current: NavigationRef | null } = {
  current: null
};

// Helper function for navigation
export const navigateToLogin = (): void => {
  if (navigationRef.current) {
    navigationRef.current.navigate('Login');
  }
};

// Environment-based configuration for Render
const API_BASE_URL = 'https://employee-react-main.onrender.com/api';

// Create axios instance with increased timeout for Render cold starts
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60 seconds for Render's cold starts
  headers: {
    'Content-Type': 'application/json',
    'X-Platform': Platform.OS, // 'ios' or 'android'
    'X-App-Version': '1.0.0',
    'Accept': 'application/json',
  }
});

export const BASE_URL = API_BASE_URL.replace('/api', '');

// Queue for offline requests
const requestQueue: QueuedRequest[] = [];
let isProcessingQueue = false;

// Simple network connectivity check
const checkNetworkConnectivity = async (): Promise<boolean> => {
  return true;
};

// Process offline queue when back online
const processOfflineQueue = async (): Promise<void> => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  
  isProcessingQueue = true;
  console.log('🔄 Processing', requestQueue.length, 'offline requests...');
  
  while (requestQueue.length > 0) {
    const req = requestQueue.shift();
    if (req) {
      try {
        await api(req.config);
        console.log('✅ Offline request completed:', req.config.url);
      } catch (error) {
        console.error('❌ Offline request failed:', req.config.url, error);
      }
    }
  }
  
  isProcessingQueue = false;
};

// Request interceptor with AsyncStorage
api.interceptors.request.use(
  async (config: RequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      const deviceId = await AsyncStorage.getItem('deviceId');
      if (deviceId) {
        config.headers['X-Device-ID'] = deviceId;
      }

      // Simple network check (optional)
      const isConnected = await checkNetworkConnectivity();
      if (!isConnected) {
        // Store request for offline processing
        requestQueue.push({ config: { ...config }, timestamp: Date.now() });
        throw new Error('No internet connection');
      }

      // Log request for debugging
      console.log('🚀 API Request:', config.method?.toUpperCase(), config.baseURL, config.url);
      
      // Add timestamp to prevent caching
      if (config.method?.toUpperCase() === 'GET') {
        config.params = {
          ...config.params,
          _t: Date.now()
        };
      }
    } catch (error) {
      console.error('Error in request interceptor:', error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor with navigation handling
api.interceptors.response.use(
  (response) => {
    // Log response for debugging
    console.log('✅ API Response:', response.status, response.config.url);
    return response;
  },
  async (error: AxiosError) => {
    // Log error for debugging
    console.error('❌ API Error:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
    });

    // Handle network errors
    if (error.message === 'No internet connection') {
      // Store failed request for retry
      if (error.config) {
        requestQueue.push({ config: error.config as RequestConfig, timestamp: Date.now() });
      }
      return Promise.reject({ 
        message: 'No internet connection. Request queued for retry.', 
        offline: true 
      });
    }

    if (error.response?.status === 401) {
      try {
        // Clear all auth data
        await AsyncStorage.multiRemove(['token', 'user', 'refreshToken']);
        
        // Navigate to login using helper function
        navigateToLogin();
      } catch (storageError) {
        console.error('Error clearing storage:', storageError);
      }
    }
    
    // Handle timeout specifically for Render cold starts
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout - server might be waking up from sleep');
      return Promise.reject({ 
        message: 'Server is starting up. Please try again in a moment.', 
        timeout: true 
      });
    }
    
    if (!error.response) {
      console.error('Network error - no response from server. Check if server is running.');
      return Promise.reject({ 
        message: 'Cannot connect to server. Please check your connection.', 
        network: true 
      });
    }
    
    return Promise.reject(error);
  }
);

// ==================== API ENDPOINTS ====================

export const mailAPI = {
  send: (data: any) => api.post('/mail/send', data),
};

export const authAPI = {
  login: (credentials: LoginCredentials) => api.post<LoginResponse>('/auth/login', credentials),
  forgotPassword: (data: ForgotPasswordData) => api.post('/auth/forgot-password', data),
  resetPassword: (data: ResetPasswordData) => api.post('/auth/reset-password', data),
  verify: () => api.get<User>('/auth/verify'),
  getAllUsers: () => api.get<User[]>('/auth/users'),
  createUser: (data: Partial<User>) => api.post<User>('/auth/users', data),
  updateUser: (id: string, data: Partial<User>) => api.put<User>(`/auth/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
  
  // Announcements
  announcement: {
    getAll: () => api.get<Announcement[]>('/announcements'),
    getActive: () => api.get<Announcement[]>('/announcements/active'),
    create: (data: Partial<Announcement>) => api.post<Announcement>('/announcements', data),
    update: (id: string, data: Partial<Announcement>) => api.put<Announcement>(`/announcements/${id}`, data),
    delete: (id: string) => api.delete(`/announcements/${id}`),
  }
};

export const employeeAPI = {
  getAllEmployees: () => api.get<Employee[]>('/employees'),
  getEmployeeById: (id: string) => api.get<Employee>(`/employees/${id}`),
  getMyProfile: () => api.get<Employee>('/employees/me'),
  createEmployee: (data: Partial<Employee>) => api.post<Employee>('/employees', data),
  updateEmployee: (id: string, data: Partial<Employee>) => api.put<Employee>(`/employees/${id}`, data),
  updateMyProfile: (data: Partial<Employee>) => api.put<Employee>('/employees/me', data),
  deleteEmployee: (id: string) => api.delete(`/employees/${id}`),
  getTimesheetEmployees: () => api.get<any>('/employees/timesheet/employees'),
  getEmployeesByDivision: (division: string) => api.get(`/employees/division/${division}`),
};

export const hikvisionAPI = {
  getConnectionStatus: () => api.get('/hik/status'),
  testConnection: () => api.get('/hik/test-connection'),
  getAttendance: (params?: any) => api.get('/hik/attendance-data', { params }),
  pullEvents: (data?: any) => api.post('/hik/pull-events', data),
  saveAttendanceToDB: (data: any) => api.post('/attendance/save-hikvision-attendance', data),
  getDeviceInfo: () => api.get('/hik/device-info'),
  testSimple: (data?: any) => api.post('/hik/test-simple', data),
  testAttendance: () => api.post('/hik/test-attendance'),
};

export const hikCentralAPI = {
  syncEmployees: () => api.post('/hik-employees/sync-employees'),
  getHikEmployees: (params?: any) => api.get('/hik-employees/hik-employees', { params }),
  getHikEmployeeById: (personId: string) => api.get(`/hik-employees/hik-employees/${personId}`),
  getAttendanceReport: () => api.post('/hik-employees/attendance-report'),
  getHikAttendance: (params?: any) => api.get('/hik-employees/hik-attendance', { params }),
  syncHikvisionAttendance: () => api.post('/hik-employees/sync-attendance'),
};

export const timesheetAPI = {
  saveTimesheet: (data: any) => api.post('/timesheets', data),
  getTimesheet: (params?: any) => api.get('/timesheets', { params }),
  getMyTimesheets: () => api.get('/timesheets/my-timesheets'),
  getTimesheetById: (id: string) => api.get(`/timesheet-history/${id}`),
  updateTimesheetStatus: (id: string, status: string) => api.put(`/timesheet-history/${id}/status`, { status }),
  deleteTimesheet: (id: string) => api.delete(`/timesheets/${id}`),
  getAttendanceData: (params?: any) => api.get('/attendance/my-week', { params }),
  getPermissionUsage: (params?: any) => api.get('/timesheets/permissions/usage', { params }),
};

// Fixed specialPermissionAPI with proper FormData typing
export const specialPermissionAPI = {
  create: (formData: FormData) => api.post('/special-permissions', formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  }),
  getAll: (params?: any) => api.get('/special-permissions/list', { params }),
  my: (params?: any) => api.get('/special-permissions/my', { params }),
  getById: (id: string) => api.get(`/special-permissions/${id}`),
  update: (id: string, data: any) => api.put(`/special-permissions/${id}`, data),
  delete: (id: string) => api.delete(`/special-permissions/${id}`),
  approve: (id: string) => api.put(`/special-permissions/${id}/approve`),
  reject: (id: string, reason: string) => api.put(`/special-permissions/${id}/reject`, { reason }),
  uploadAttachment: (id: string, file: any) => {
    const formData = new FormData();
    // FIXED: Properly append file for React Native
    formData.append('attachment', {
      uri: file.uri,
      type: file.type || 'application/octet-stream',
      name: file.name || 'file',
    } as any);
    return api.post(`/special-permissions/${id}/attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const projectAPI = {
  getProjects: (params?: any) => api.get('/projects', { params }),
  getProjectById: (id: string) => api.get(`/projects/${id}`),
  createProject: (data: any) => api.post('/projects', data),
  updateProject: (id: string, data: any) => api.put(`/projects/${id}`, data),
  deleteProject: (id: string) => api.delete(`/projects/${id}`),
  getProjectsByDivision: (division: string) => api.get(`/projects/division/${division}`),
};

export const policyAPI = {
  list: () => api.get('/policies'),
  create: (data: any) => api.post('/policies', data),
  update: (id: string, data: any) => api.put(`/policies/${id}`, data),
  remove: (id: string) => api.delete(`/policies/${id}`),
};

export const leaveAPI = {
  apply: (data: any) => api.post('/leaves', data),
  myLeaves: () => api.get('/leaves/my'),
  myBalance: () => api.get('/leaves/my-balance'),
  getBalance: (params?: any) => api.get('/leaves/balance', params ? { params } : undefined),
  saveBalance: (data: any) => api.put('/leaves/balance/save', data),
  syncAllBalances: () => api.post('/leaves/balance/sync-all'),
  list: (params?: any) => api.get('/leaves', params ? { params } : undefined),
  updateStatus: (id: string, status: string, rejectionReason?: string) => 
    api.put(`/leaves/${id}/status`, { status, rejectionReason }),
  update: (id: string, data: any) => api.put(`/leaves/${id}`, data),
  remove: (id: string) => api.delete(`/leaves/${id}`)
};

export const allocationAPI = {
  getAllAllocations: (params?: any) => api.get('/allocations', { params }),
  createAllocation: (data: any) => api.post('/allocations', data),
  updateAllocation: (id: string, data: any) => api.put(`/allocations/${id}`, data),
  deleteAllocation: (id: string) => api.delete(`/allocations/${id}`),
  getProjectCode: (projectName: string) => 
    api.get(`/allocations/project-code/${encodeURIComponent(projectName)}`),
  getAllocationById: (id: string) => api.get(`/allocations/${id}`),
  getMyAllocations: (employeeId: string) => api.get(`/allocations/employee/${employeeId}`),
};

export const accessAPI = {
  getMyLogs: (params?: any) => api.get('/access/my-logs', { params }),
  punch: (data: any) => api.post('/access/punch', data),
  getStats: (params?: any) => api.get('/access/stats', { params }),
  getEmployeeLogs: (params?: any) => api.get('/access/logs', { params }),
  getEmployees: () => api.get('/employees'),
  getHikvisionConnectionStatus: () => hikvisionAPI.getConnectionStatus(),
  pullHikvisionEvents: (data?: any) => hikvisionAPI.pullEvents(data),
  getHikvisionAttendance: (params?: any) => hikvisionAPI.getAttendance(params),
  syncHikvisionData: () => hikvisionAPI.pullEvents({}),
  getLocalAttendance: (params?: any) => api.get('/attendance', { params }),
  createAttendanceRecord: (data: any) => api.post('/attendance', data),
  getAttendanceSummary: () => api.get('/attendance/summary'),
  testHikvisionConnection: () => hikvisionAPI.testConnection(),
};

export const attendanceAPI = {
  getAll: (params?: any) => api.get('/attendance', { params }),
  create: (data: any) => api.post('/attendance', data),
  getSummary: (params?: any) => api.get('/attendance/summary', params ? { params } : undefined),
  getYearSummary: (employeeId: string, params?: any) =>
    api.get(`/attendance/year-summary/${encodeURIComponent(employeeId)}`, { params }),
  saveYearSummary: (employeeId: string, data: any) => 
    api.put(`/attendance/year-summary/${encodeURIComponent(employeeId)}`, data),
  regularize: (data: any) => api.post('/attendance/regularize', data),
  update: (id: string, data: any) => api.put(`/attendance/${id}`, data),
  remove: (id: string) => api.delete(`/attendance/${id}`),
  getHikvision: (params?: any) => hikvisionAPI.getAttendance(params),
  syncHikvision: () => hikvisionAPI.pullEvents({}),
};

// In api.ts
export const adminTimesheetAPI = {
  list: (params?: any) => api.get<any>('/admin-timesheet/list', { params }),
  approve: (id: string) => api.put(`/admin-timesheet/approve/${id}`),
  reject: (id: string, reason: string) => api.put(`/admin-timesheet/reject/${id}`, { reason }),
  summary: (params?: any) => api.get('/admin-timesheet/summary', { params }),
};

export const adminSpecialPermissionAPI = {
  create: (formData: FormData) => api.post('/admin-special-permissions', formData, { 
    headers: { 'Content-Type': 'multipart/form-data' } 
  }),
  getAll: (params?: any) => api.get('/admin-special-permissions', { params }),
  my: (params?: any) => api.get('/admin-special-permissions/my', { params }),
  getById: (id: string) => api.get(`/admin-special-permissions/${id}`),
  update: (id: string, data: any) => api.put(`/admin-special-permissions/${id}`, data),
  delete: (id: string) => api.delete(`/admin-special-permissions/${id}`),
  approve: (id: string) => api.put(`/admin-special-permissions/${id}/approve`),
  reject: (id: string, reason: string) => api.put(`/admin-special-permissions/${id}/reject`, { reason }),
  uploadAttachment: (id: string, file: any) => {
    const formData = new FormData();
    formData.append('attachment', {
      uri: file.uri,
      type: file.type || 'application/octet-stream',
      name: file.name || 'file',
    } as any);
    return api.post(`/admin-special-permissions/${id}/attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const attendanceApprovalAPI = {
  request: (data: any) => api.post('/attendance-approval/request', data),
  list: (params?: any) => api.get('/attendance-approval/list', { params }),
  approve: (id: string) => api.put(`/attendance-approval/approve/${id}`),
  reject: (id: string, reason: string) => api.put(`/attendance-approval/reject/${id}`, { reason }),
};

export const teamAPI = {
  getLeaders: (type?: string) => api.get('/teams/leaders', type ? { params: { type } } : undefined),
  list: () => api.get('/teams'),
  getByCode: (teamCode: string) => api.get(`/teams/${encodeURIComponent(teamCode)}`),
  upsert: (data: any) => api.post('/teams', data),
  addMember: (teamCode: string, employeeId: string) => 
    api.post(`/teams/${encodeURIComponent(teamCode)}/members`, { employeeId }),
  removeMember: (teamCode: string, employeeId: string) => 
    api.delete(`/teams/${encodeURIComponent(teamCode)}/members/${encodeURIComponent(employeeId)}`),
};

export const internAPI = {
  getAll: () => api.get('/interns'),
  getById: (id: string) => api.get(`/interns/${id}`),
  search: (params?: any) => api.get('/interns/search', { params }),
  create: (data: any) => api.post('/interns', data),
  update: (id: string, data: any) => api.put(`/interns/${id}`, data),
  remove: (id: string) => api.delete(`/interns/${id}`),
};

export const performanceAPI = {
  getMySelfAppraisals: () => api.get('/performance/self-appraisals/me'),
  getSelfAppraisalById: (id: string) => api.get(`/performance/self-appraisals/${id}`),
  createSelfAppraisal: (data: any) => api.post('/performance/self-appraisals', data),
  updateSelfAppraisal: (id: string, data: any) => api.put(`/performance/self-appraisals/${id}`, data),
  deleteSelfAppraisal: (id: string) => api.delete(`/performance/self-appraisals/${id}`),
  getTeamAppraisals: () => api.get('/performance/team-appraisals'),
  updateTeamAppraisal: (id: string, data: any) => api.put(`/performance/team-appraisals/${id}`, data),
  getReviewerAppraisals: () => api.get('/performance/reviewer'),
  updateReviewerAppraisal: (id: string, data: any) => api.put(`/performance/reviewer/${id}`, data),
  submitToDirector: (ids: string[]) => api.post('/performance/reviewer/submit-director', { ids }),
  getDirectorAppraisals: () => api.get('/performance/director'),
  updateDirectorAppraisal: (id: string, data: any) => api.put(`/performance/director/${id}`, data),
  getIncrementMatrix: (params?: any) => api.get('/performance/increment-master', { params }),
  saveIncrementMatrix: (data: any) => api.post('/performance/increment-master', data),
  calculateIncrement: (data: any) => api.post('/performance/increment-master/calculate', data),
  getIncrementSummary: (params?: any) => api.get('/performance/increment-summary', { params }),
  getAttributes: (designation: string) => api.get(`/performance/attributes/${designation}`),
  saveAttributes: (data: any) => api.post('/performance/attributes', data),
  saveBulkSubItem: (data: any) => api.post('/performance/attributes/bulk-subitem', data),
  getMasterAttributes: () => api.get('/performance/attributes/master'),
  addMasterAttribute: (data: any) => api.post('/performance/attributes/master/add', data),
  deleteMasterAttribute: (section: string, key: string) => 
    api.delete(`/performance/attributes/master/${section}/${key}`),
};

export const payrollAPI = {
  list: () => api.get('/payroll'),
  create: (data: any) => api.post('/payroll', data),
  update: (id: string, data: any) => api.put(`/payroll/${id}`, data),
  remove: (id: string) => api.delete(`/payroll/${id}`),
  getById: (id: string) => api.get(`/payroll/${id}`)
};

export const monthlyPayrollAPI = {
  save: (data: any) => api.post('/monthly-payroll/run', data),
  list: (params?: any) => api.get('/monthly-payroll', { params }),
  getEmployeeHistory: (employeeId: string) => api.get(`/monthly-payroll/history/${employeeId}`),
  markEmailSent: (data: any) => api.put('/monthly-payroll/mark-email-sent', data),
  markPaid: (data: any) => api.put('/monthly-payroll/mark-paid', data),
  delete: (month: string) => api.delete(`/monthly-payroll/${month}`)
};

export const loanAPI = {
  list: (params?: any) => api.get('/loans', { params }),
  getById: (id: string) => api.get(`/loans/${id}`),
  create: (data: any) => api.post('/loans', data),
  update: (id: string, data: any) => api.put(`/loans/${id}`, data),
  delete: (id: string) => api.delete(`/loans/${id}`),
  togglePayment: (id: string) => api.patch(`/loans/${id}/payment`),
};

export const expenditureAPI = {
  healthCheck: () => api.get('/expenditure/health-check'),
  saveMonthlyRecord: (data: any) => api.post('/expenditure/save-monthly', data),
  updateRecord: (id: string, data: any) => api.put(`/expenditure/update/${id}`, data),
  getSummary: (params?: any) => api.get('/expenditure/summary', { params }),
  getRecordById: (id: string) => api.get(`/expenditure/record/${id}`),
  deleteRecord: (id: string) => api.delete(`/expenditure/record/${id}`)
};

export const holidayAllowanceAPI = {
  healthCheck: () => api.get('/holiday-allowance/health'),
  getSummary: (params: any) => api.get('/holiday-allowance/summary', { params }),
  getRecordById: (id: string) => api.get(`/holiday-allowance/${id}`),
  saveMonthlyRecord: (data: any) => api.post('/holiday-allowance', data),
  updateRecord: (id: string, data: any) => api.put(`/holiday-allowance/${id}`, data),
  deleteRecord: (id: string) => api.delete(`/holiday-allowance/${id}`),
  saveBulk: (data: any) => api.post('/holiday-allowances/bulk-save', data),
};

export const exitFormalityAPI = {
  getAll: (params?: any) => api.get('/exit-formalities', { params }),
  getPending: (params?: any) => api.get('/exit-formalities/pending', { params }),
  getCompleted: (params?: any) => api.get('/exit-formalities/completed', { params }),
  getDrafts: (params?: any) => api.get('/exit-formalities/drafts', { params }),
  getMyExit: () => api.get('/exit-formalities/me'),
  getExitById: (id: string) => api.get(`/exit-formalities/${id}`),
  createExit: (data: any) => api.post('/exit-formalities', data),
  updateExit: (id: string, data: any) => api.put(`/exit-formalities/${id}`, data),
  submitExit: (id: string) => api.post(`/exit-formalities/${id}/submit`),
  getClearance: (id: string) => api.get(`/exit-formalities/${id}/clearance`),
  updateClearance: (id: string, department: string, status: string, remarks?: string) => 
    api.put(`/exit-formalities/${id}/clearance/${department}`, { status, remarks }),
  reject: (id: string, reason: string) => api.post(`/exit-formalities/${id}/reject`, { reason }),
  managerApprove: (id: string) => api.post(`/exit-formalities/${id}/manager-approve`),
  approve: (id: string) => api.post(`/exit-formalities/${id}/approve`),
  hrApprove: (id: string) => api.post(`/exit-formalities/${id}/hr-approve`),
  cancel: (id: string) => api.post(`/exit-formalities/${id}/cancel`),
  remove: (id: string) => api.delete(`/exit-formalities/${id}`),
};

export const compensationAPI = {
  getAll: () => api.get('/compensation'),
  getById: (id: string) => api.get(`/compensation/${id}`),
  create: (data: any) => api.post('/compensation', data),
  update: (id: string, data: any) => api.put(`/compensation/${id}`, data),
  delete: (id: string) => api.delete(`/compensation/${id}`),
};

export const insuranceAPI = {
  getAll: () => api.get('/insurance'),
  create: (data: any) => api.post('/insurance', data),
  update: (id: string, data: any) => api.put(`/insurance/${id}`, data),
  delete: (id: string) => api.delete(`/insurance/${id}`),
};

export const insuranceClaimAPI = {
  getAll: () => api.get('/insurance-claims'),
  create: (data: any) => api.post('/insurance-claims', data),
  update: (id: string, data: any) => api.put(`/insurance-claims/${id}`, data),
  delete: (id: string) => api.delete(`/insurance-claims/${id}`),
};

export const marriageAllowanceAPI = {
  list: (params?: any) => api.get('/marriage-allowances', { params }),
  getById: (id: string) => api.get(`/marriage-allowances/${id}`),
  create: (formData: FormData) => api.post('/marriage-allowances', formData, 
    { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, formData: FormData) => api.put(`/marriage-allowances/${id}`, formData, 
    { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id: string) => api.delete(`/marriage-allowances/${id}`)
};

export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`)
};

export const celebrationAPI = {
  getCalendar: (params?: any) => api.get('/celebrations/calendar', { params }),
  getWishStats: (params?: any) => api.get('/celebrations/stats', { params }),
  sendWish: (data: any) => api.post('/celebrations/wish', data),
  replyWish: (wishId: string, data: any) => api.post(`/celebrations/wish/${wishId}/reply`, data),
};

// Helper function to check server status (for Render cold starts)
export const checkServerStatus = async (): Promise<boolean> => {
  try {
    const response = await api.get('/health', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

export default api;