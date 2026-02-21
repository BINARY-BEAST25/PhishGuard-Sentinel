import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  verify: (token) => API.post('/auth/verify', { token }),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (data) => API.post('/auth/reset-password', data),
  getMe: () => API.get('/auth/me'),
};

export const childAPI = {
  add: (data) => API.post('/child/add', data),
  list: () => API.get('/child/list'),
  get: (id) => API.get(`/child/${id}`),
  update: (id, data) => API.put(`/child/${id}`, data),
  remove: (id) => API.delete(`/child/remove/${id}`),
};

export const activityAPI = {
  getHistory: (params) => API.get('/activity/history', { params }),
  getAnalytics: (params) => API.get('/activity/analytics', { params }),
};

export default API;
