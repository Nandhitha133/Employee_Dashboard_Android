// services/resumeAPI.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL configuration
const API_BASE_URL = 'https://employee-react-main.onrender.com/api'; // Updated from localhost for production
export const BASE_URL = API_BASE_URL.replace('/api', '');

// Response interfaces
export interface Resume {
  _id: string;
  candidateName: string;
  email: string;
  phone: string;
  division: string;
  experience: number;
  resumeType: string;
  remarks?: string;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: {
    _id: string;
    name: string;
    email: string;
  };
  updatedBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

export interface ResumeListResponse {
  success: boolean;
  data: Resume[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface ResumeSingleResponse {
  success: boolean;
  data: Resume;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export interface ResumeListParams {
  search?: string;
  division?: string;
  resumeType?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Service Class
class ResumeAPIService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // Increased timeout for Render cold starts
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          console.error('Unauthorized access - please login again');
        } else if (error.response?.status === 403) {
          console.error('Forbidden - insufficient permissions');
        } else if (error.response?.status === 404) {
          console.error('Resource not found');
        } else if (error.response?.status === 500) {
          console.error('Server error');
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get list of resumes with optional filters
   */
  async list(params?: ResumeListParams): Promise<AxiosResponse<ResumeListResponse>> {
    try {
      const config: AxiosRequestConfig = {};
      if (params) {
        config.params = params;
      }
      return await this.api.get('/resumes', config);
    } catch (error) {
      console.error('Error fetching resumes:', error);
      throw error;
    }
  }

  /**
   * Get a single resume by ID
   */
  async getById(id: string): Promise<AxiosResponse<ResumeSingleResponse>> {
    try {
      return await this.api.get(`/resumes/${id}`);
    } catch (error) {
      console.error('Error fetching resume:', error);
      throw error;
    }
  }

  /**
   * Create a new resume with file upload
   */
  async create(formData: FormData): Promise<AxiosResponse<ResumeSingleResponse>> {
    try {
      return await this.api.post('/resumes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      console.error('Error creating resume:', error);
      throw error;
    }
  }

  /**
   * Update an existing resume
   */
  async update(id: string, formData: FormData): Promise<AxiosResponse<ResumeSingleResponse>> {
    try {
      return await this.api.put(`/resumes/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      console.error('Error updating resume:', error);
      throw error;
    }
  }

  /**
   * Delete a resume
   */
  async remove(id: string): Promise<AxiosResponse<DeleteResponse>> {
    try {
      return await this.api.delete(`/resumes/${id}`);
    } catch (error) {
      console.error('Error deleting resume:', error);
      throw error;
    }
  }

  /**
   * Download resume file
   */
  async download(id: string): Promise<AxiosResponse<Blob>> {
    try {
      return await this.api.get(`/resumes/${id}/download`, {
        responseType: 'blob',
      });
    } catch (error) {
      console.error('Error downloading resume:', error);
      throw error;
    }
  }

  /**
   * Get download URL for a resume
   */
  getDownloadUrl(id: string): string {
    return `${API_BASE_URL}/resumes/${id}/download`;
  }

  /**
   * Get full URL for a resume file
   */
  getResumeFileUrl(path: string): string {
    if (!path) return '';
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    return `${BASE_URL}/${cleanPath}`;
  }

  /**
   * Bulk delete resumes
   */
  async bulkDelete(ids: string[]): Promise<AxiosResponse<DeleteResponse>> {
    try {
      return await this.api.delete('/resumes/bulk', { data: { ids } });
    } catch (error) {
      console.error('Error bulk deleting resumes:', error);
      throw error;
    }
  }

  /**
   * Get resume statistics
   */
  async getStatistics(): Promise<AxiosResponse<{
    success: boolean;
    data: {
      total: number;
      byDivision: Record<string, number>;
      byType: Record<string, number>;
      byExperience: {
        lessThan1: number;
        between1And3: number;
        between3And5: number;
        between5And10: number;
        moreThan10: number;
      };
    };
  }>> {
    try {
      return await this.api.get('/resumes/statistics');
    } catch (error) {
      console.error('Error fetching resume statistics:', error);
      throw error;
    }
  }

  /**
   * Search resumes with advanced filters
   */
  async search(params: {
    query: string;
    fields?: string[];
    division?: string;
    resumeType?: string;
    minExperience?: number;
    maxExperience?: number;
  }): Promise<AxiosResponse<ResumeListResponse>> {
    try {
      return await this.api.get('/resumes/search', { params });
    } catch (error) {
      console.error('Error searching resumes:', error);
      throw error;
    }
  }

  /**
   * Export resumes to CSV
   */
  async exportToCSV(params?: ResumeListParams): Promise<AxiosResponse<Blob>> {
    try {
      return await this.api.get('/resumes/export/csv', {
        params,
        responseType: 'blob',
      });
    } catch (error) {
      console.error('Error exporting resumes:', error);
      throw error;
    }
  }

  /**
   * Export resumes to Excel
   */
  async exportToExcel(params?: ResumeListParams): Promise<AxiosResponse<Blob>> {
    try {
      return await this.api.get('/resumes/export/excel', {
        params,
        responseType: 'blob',
      });
    } catch (error) {
      console.error('Error exporting resumes:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const resumeAPI = new ResumeAPIService();

// Export individual methods for backward compatibility
export const {
  list,
  getById,
  create,
  update,
  remove,
} = resumeAPI;

// Default export
export default resumeAPI;