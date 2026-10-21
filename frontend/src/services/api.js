import axios from 'axios';

const API_URL =
  window.location.origin.includes('localhost:5173') ||
  window.location.origin.includes('127.0.0.1:5173')
    ? 'http://localhost:5000/api'
    : '/api';

/**
 * Global Axios instance with auth interceptors
 */
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach bearer token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('codesync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: automatically detect 401/403 expired or revoked tokens
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      const url = error.config?.url || '';
      // Don't intercept auth login/register submission failures as session expirations
      if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
        try {
          localStorage.removeItem('codesync_token');
          if (window.CodeSyncNative?.logout) {
            window.CodeSyncNative.logout();
          }
        } catch (e) {}
        window.dispatchEvent(new CustomEvent('codesync_auth_unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
