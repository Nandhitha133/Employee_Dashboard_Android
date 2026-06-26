import api, { BASE_URL } from './api';

export const resumeAPI = {
  list: (params) => api.get('/resumes', { params }),
  getById: (id) => api.get(`/resumes/${id}`),
  create: (formData) =>
    api.post('/resumes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  update: (id, formData) =>
    api.put(`/resumes/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  remove: (id) => api.delete(`/resumes/${id}`),
};

export { BASE_URL };

