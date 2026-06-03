import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// افزودن توکن به هر درخواست
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// مدیریت خودکار refresh token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('no refresh token');
        const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
        localStorage.setItem('access_token', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  },
);

// ─── Auth ───────────────────────────────────────────────
export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/send-otp', { phone }),
  verifyOtp: (token: string, otp: string) => api.post('/auth/verify-otp', { token, otp }),
  register: (data: { name: string; email: string; password: string }) => 
    api.post('/auth/register', data),
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/users/me'),
};

// ─── Exams ──────────────────────────────────────────────
export const examsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get('/exams', { params }),
  create: (data: { title: string; description?: string; settings?: object }) =>
    api.post('/exams', data),
  get: (id: string) => api.get(`/exams/${id}`),
  update: (id: string, data: object) => api.put(`/exams/${id}`, data),
  delete: (id: string) => api.delete(`/exams/${id}`),
  publish: (id: string) => api.post(`/exams/${id}/publish`),
  duplicate: (id: string) => api.post(`/exams/${id}/duplicate`),
};

// ─── Questions ──────────────────────────────────────────
export const questionsApi = {
  list: (examId: string) => api.get(`/exams/${examId}/questions`),
  create: (examId: string, data: object) => api.post(`/exams/${examId}/questions`, data),
  update: (examId: string, id: string, data: object) =>
    api.put(`/exams/${examId}/questions/${id}`, data),
  delete: (examId: string, id: string) => api.delete(`/exams/${examId}/questions/${id}`),
  reorder: (examId: string, order: string[]) =>
    api.put(`/exams/${examId}/questions/reorder`, { order }),
};

// ─── Submissions ────────────────────────────────────────
export const submissionsApi = {
  start: (examId: string, guestName?: string) =>
    api.post(`/exams/${examId}/start`, { guestName }),
  saveAnswer: (submissionId: string, questionId: string, data: object) =>
    api.put(`/submissions/${submissionId}/answers/${questionId}`, data),
  complete: (submissionId: string) => api.post(`/submissions/${submissionId}/complete`),
  getResult: (submissionId: string) => api.get(`/submissions/${submissionId}/result`),
};

// ─── Reports ────────────────────────────────────────────
export const reportsApi = {
  dashboard: () => api.get('/reports/dashboard'),
  studentDashboard: () => api.get('/reports/student-dashboard'),
  examReport: (examId: string) => api.get(`/reports/exams/${examId}`),
};

// ─── Certificates ───────────────────────────────────────
export const certificatesApi = {
  verify: (code: string) => api.get(`/certificates/verify/${code}`),
  myList: () => api.get('/certificates/my'),
};

// ─── AI ─────────────────────────────────────────────────
export const aiApi = {
  generateFromText: (data: object) => api.post('/ai/generate-questions', data),
  chat: (data: object) => api.post('/ai/chat', data),
};

// ─── Payments ───────────────────────────────────────────
export const paymentsApi = {
  getPlans: () => api.get('/payments/plans'),
  createPayment: (planId: string, gateway?: string) =>
    api.post('/payments/create', { planId, gateway }),
};
