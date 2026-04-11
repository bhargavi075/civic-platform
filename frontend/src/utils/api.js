// frontend/src/utils/api.js
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
    /*
     * FIX BUG 5: Guarantee the Authorization header is always sent.
     *
     * The original code relied solely on axios.defaults.headers.common being
     * set by AuthContext's useEffect. That works correctly when the token is
     * set in the same JS execution context — but there is a race condition:
     *
     *   1. Page hard-refresh → AuthContext mounts → reads token from
     *      localStorage → calls setToken(token)
     *   2. useEffect([token]) fires ASYNCHRONOUSLY — it schedules
     *      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
     *   3. If ReportIssue's handleSubmit fires before step 2 completes (e.g.
     *      user navigates directly to /citizen/report via URL bar and submits
     *      quickly), axios.defaults may still be empty → 401 Unauthorized →
     *      the request silently fails.
     *
     * Defense: read the token directly from localStorage as a fallback.
     * localStorage is synchronous and always up-to-date by the time JS runs.
     *
     * For FormData (multipart/form-data): do NOT set Content-Type manually.
     * axios detects FormData and automatically sets the correct
     * `Content-Type: multipart/form-data; boundary=----XYZ` header.
     * Overriding it here would strip the boundary and break multer on the server.
     */
    const token = localStorage.getItem('civic_token');
    const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

    return axios.post(`${API_BASE}/complaints`, data, {
      headers: authHeader,
      // Timeout: 30s for file uploads (default axios has no timeout)
      timeout: 30000,
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

  // ─── Chat ─────────────────────────────────────────────────────────────────────
  getChats:    ()                  => axios.get(`${API_BASE}/chat`),
  getChat:     (chatId)            => axios.get(`${API_BASE}/chat/${chatId}`),
  createChat:  ()                  => axios.post(`${API_BASE}/chat`),
  sendMessage: (chatId, message)   => axios.post(`${API_BASE}/chat/${chatId}/messages`, message),
  renameChat:  (chatId, title)     => axios.patch(`${API_BASE}/chat/${chatId}/title`, { title }),
  deleteChat:  (chatId)            => axios.delete(`${API_BASE}/chat/${chatId}`),

  // ─── Performance ──────────────────────────────────────────────────────────────
  getDeptOfficers:  (dept)       => axios.get(`${API_BASE}/admin/departments/${encodeURIComponent(dept)}/officers`),
  getOfficerIssues: (officerId)  => axios.get(`${API_BASE}/admin/officers/${officerId}/issues`),

  // ─── SLA Rules ────────────────────────────────────────────────────────────────
  getSlaRules:   ()         => axios.get(`${API_BASE}/sla-rules`),
  saveSlaRule:   (data)     => axios.post(`${API_BASE}/sla-rules`, data),
  updateSlaRule: (id, data) => axios.put(`${API_BASE}/sla-rules/${id}`, data),
  deleteSlaRule: (id)       => axios.delete(`${API_BASE}/sla-rules/${id}`),
};

export default api;
