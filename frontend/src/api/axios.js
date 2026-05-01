import axios from 'axios';

// baseURL always ends with /api — paths below must NOT include /api prefix
const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/api$/, '') + '/api';

const apiClient = axios.create({ baseURL });

// Request interceptor: attach JWT from localStorage as Bearer token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401, clear auth state and redirect to /login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
