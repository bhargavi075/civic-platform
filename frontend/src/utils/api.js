// frontend/src/utils/api.js
// ─── FULL REPLACEMENT — includes all existing endpoints + new chat endpoints ───
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const api = {
  // ─── Auth ─────────────────────────────────────────────────────────────────────
  register: (data) => axios.post(`${API_BASE}/auth/register`, data),
  login:    (data) => axios.post(`${API_BASE}/auth/login`, data),
  getMe:    ()     => axios.get(`${API_BASE}/auth/me`),

  // ─── Complaints ───────────────────────────────────────────────────────────────
  getComplaints:   (params) => axios.get(`${API_BASE}/complaints`, { params }),
  getComplaint:    (id)     => axios.get(`${API_BASE}/complaints/${id}`),
  createComplaint: (data) => {
    const isFormData = data instanceof FormData;
    return axios.post(`${API_BASE}/complaints`, data, {
      headers: isFormData
        ? { 'Content-Type': 'multipart/form-data' }
        : { 'Content-Type': 'application/json' },
    });
  },
  checkDuplicate:        (data)          => axios.post(`${API_BASE}/complaints/check-duplicate`, data),
  deleteComplaint:       (id)            => axios.delete(`${API_BASE}/complaints/${id}`),
  voteComplaint:         (id)            => axios.post(`${API_BASE}/complaints/${id}/vote`),
  updateComplaintStatus: (id, data)      => axios.patch(`${API_BASE}/complaints/${id}/status`, data),
  assignComplaint:       (id, officerId) => axios.patch(`${API_BASE}/complaints/${id}/assign`, { officerId }),

  // ─── Officer ──────────────────────────────────────────────────────────────────
  getOfficerComplaints:   ()         => axios.get(`${API_BASE}/officers/complaints`),
  updateOfficerComplaint: (id, data) => axios.patch(`${API_BASE}/officers/complaints/${id}`, data),
  getOfficerStats:        ()         => axios.get(`${API_BASE}/officers/stats`),

  // ─── Admin ────────────────────────────────────────────────────────────────────
  getAnalytics:       ()         => axios.get(`${API_BASE}/admin/analytics`),
  getOfficers:        ()         => axios.get(`${API_BASE}/admin/officers`),
  createOfficer:      (data)     => axios.post(`${API_BASE}/admin/officers`, data),
  updateOfficer:      (id, data) => axios.put(`${API_BASE}/admin/officers/${id}`, data),
  deleteOfficer:      (id)       => axios.delete(`${API_BASE}/admin/officers/${id}`),
  getAdminComplaints: ()         => axios.get(`${API_BASE}/admin/complaints`),
  getCitizens:        ()         => axios.get(`${API_BASE}/admin/citizens`),

  // ─── Departments ──────────────────────────────────────────────────────────────
  getDepartments:   ()         => axios.get(`${API_BASE}/departments`),
  createDepartment: (data)     => axios.post(`${API_BASE}/departments`, data),
  updateDepartment: (id, data) => axios.put(`${API_BASE}/departments/${id}`, data),
  deleteDepartment: (id)       => axios.delete(`${API_BASE}/departments/${id}`),
  seedDepartments:  ()         => axios.post(`${API_BASE}/departments/seed`),

  // ─── Chat (NEW) ───────────────────────────────────────────────────────────────
  // Returns all chat sessions for current user (no messages, sidebar-only)
  getChats: () =>
    axios.get(`${API_BASE}/chat`),

  // Returns a single chat with all messages
  getChat: (chatId) =>
    axios.get(`${API_BASE}/chat/${chatId}`),

  // Creates a new empty chat session
  createChat: () =>
    axios.post(`${API_BASE}/chat`),

  // Appends a message to a chat: { sender: 'user'|'bot', text: string }
  sendMessage: (chatId, message) =>
    axios.post(`${API_BASE}/chat/${chatId}/messages`, message),

  // Rename a chat
  renameChat: (chatId, title) =>
    axios.patch(`${API_BASE}/chat/${chatId}/title`, { title }),

  // Permanently delete a chat from DB
  deleteChat: (chatId) =>
    axios.delete(`${API_BASE}/chat/${chatId}`),
  // ─── Performance (NEW) ───────────────────────────────────────────────────────
  // Officers in a department with stats (for Performance tab sidebar)
  getDeptOfficers: (dept) =>
    axios.get(`${API_BASE}/admin/departments/${encodeURIComponent(dept)}/officers`),

  // Full officer profile + all assigned issues
  getOfficerIssues: (officerId) =>
    axios.get(`${API_BASE}/admin/officers/${officerId}/issues`),

};

export default api;
