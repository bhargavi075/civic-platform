// frontend/src/utils/api.js
// ─── FULL CORRECTED VERSION ─────────────────────────────────────────────

import axios from 'axios';

// ✅ Smart Base URL Handling (Dev + Prod + Env)
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV
    ? 'http://localhost:5000/api'
    : 'https://civic-backend-dlbd.onrender.com/api'); // 🔴 replace with your real backend

// ✅ Axios Instance
const instance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// ✅ Attach Token Automatically (if exists)
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // adjust if you use cookies
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ───────────────────────────────────────────────────────────────────────

export const api = {
  // ─── Auth ────────────────────────────────────────────────────────────
  register: (data) => instance.post('/auth/register', data),
  login:    (data) => instance.post('/auth/login', data),
  getMe:    ()     => instance.get('/auth/me'),

  // ─── Complaints ──────────────────────────────────────────────────────
  getComplaints: (params) =>
    instance.get('/complaints', { params }),

  getComplaint: (id) =>
    instance.get(`/complaints/${id}`),

  createComplaint: (data) => {
    const isFormData = data instanceof FormData;
    return instance.post('/complaints', data, {
      headers: isFormData
        ? { 'Content-Type': 'multipart/form-data' }
        : { 'Content-Type': 'application/json' },
    });
  },

  checkDuplicate: (data) =>
    instance.post('/complaints/check-duplicate', data),

  deleteComplaint: (id) =>
    instance.delete(`/complaints/${id}`),

  voteComplaint: (id) =>
    instance.post(`/complaints/${id}/vote`),

  updateComplaintStatus: (id, data) =>
    instance.patch(`/complaints/${id}/status`, data),

  assignComplaint: (id, officerId) =>
    instance.patch(`/complaints/${id}/assign`, { officerId }),

  // ─── Officer ─────────────────────────────────────────────────────────
  getOfficerComplaints: () =>
    instance.get('/officers/complaints'),

  updateOfficerComplaint: (id, data) =>
    instance.patch(`/officers/complaints/${id}`, data),

  getOfficerStats: () =>
    instance.get('/officers/stats'),

  // ─── Admin ───────────────────────────────────────────────────────────
  getAnalytics: () =>
    instance.get('/admin/analytics'),

  getOfficers: () =>
    instance.get('/admin/officers'),

  createOfficer: (data) =>
    instance.post('/admin/officers', data),

  updateOfficer: (id, data) =>
    instance.put(`/admin/officers/${id}`, data),

  deleteOfficer: (id) =>
    instance.delete(`/admin/officers/${id}`),

  getAdminComplaints: () =>
    instance.get('/admin/complaints'),

  getCitizens: () =>
    instance.get('/admin/citizens'),

  // ─── Departments ─────────────────────────────────────────────────────
  getDepartments: () =>
    instance.get('/departments'),

  createDepartment: (data) =>
    instance.post('/departments', data),

  updateDepartment: (id, data) =>
    instance.put(`/departments/${id}`, data),

  deleteDepartment: (id) =>
    instance.delete(`/departments/${id}`),

  seedDepartments: () =>
    instance.post('/departments/seed'),

  // ─── Chat ────────────────────────────────────────────────────────────
  getChats: () =>
    instance.get('/chat'),

  getChat: (chatId) =>
    instance.get(`/chat/${chatId}`),

  createChat: () =>
    instance.post('/chat'),

  sendMessage: (chatId, message) =>
    instance.post(`/chat/${chatId}/messages`, message),

  renameChat: (chatId, title) =>
    instance.patch(`/chat/${chatId}/title`, { title }),

  deleteChat: (chatId) =>
    instance.delete(`/chat/${chatId}`),

  // ─── Performance ─────────────────────────────────────────────────────
  getDeptOfficers: (dept) =>
    instance.get(`/admin/departments/${encodeURIComponent(dept)}/officers`),

  getOfficerIssues: (officerId) =>
    instance.get(`/admin/officers/${officerId}/issues`),
};

export default api;