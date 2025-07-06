import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  validateToken: (token) => api.get('/auth/validate', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  changePassword: (currentPassword, newPassword) => 
    api.put('/auth/change-password', { currentPassword, newPassword }),
   googleLogin: () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentIncidents: () => api.get('/dashboard/recent-incidents'),
  getChartData: () => api.get('/dashboard/chart-data'),
};

// Incidents API
export const incidentsAPI = {
  getAll: (params) => api.get('/incidents', { params }),
  getById: (id) => api.get(`/incidents/${id}`),
  create: (incidentData) => api.post('/incidents', incidentData),
  update: (id, updates) => api.put(`/incidents/${id}`, updates),
  delete: (id) => api.delete(`/incidents/${id}`),
  assign: (id, assigneeData) => api.put(`/incidents/${id}/assign`, assigneeData),
  resolve: (id, resolutionData) => api.put(`/incidents/${id}/resolve`, resolutionData),
  uploadAttachment: (id, formData) => 
    api.post(`/incidents/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  addComment: (id, comment) => api.post(`/incidents/${id}/comments`, { comment }),
  getComments: (id) => api.get(`/incidents/${id}/comments`),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  getTeamMembers: () => api.get('/users/team-members'),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (categoryData) => api.post('/categories', categoryData),
  update: (id, categoryData) => api.put(`/categories/${id}`, categoryData),
  delete: (id) => api.delete(`/categories/${id}`),
};

// SLA API
export const slaAPI = {
  getSettings: () => api.get('/sla/settings'),
  updateSettings: (settings) => api.put('/sla/settings', settings),
  getPerformance: () => api.get('/sla/performance'),
};

// Analytics API
export const analyticsAPI = {
  getIncidentTrends: (timeRange) => api.get(`/analytics/trends?range=${timeRange}`),
  getPerformanceMetrics: () => api.get('/analytics/performance'),
  getResolutionRates: () => api.get('/analytics/resolution-rates'),
  getCategoryBreakdown: () => api.get('/analytics/categories'),
  exportReport: (reportType, filters) => 
    api.post('/analytics/export', { reportType, filters }, {
      responseType: 'blob'
    }),
};


export default api;