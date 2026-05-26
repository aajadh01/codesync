const API_URL =
  window.location.origin.includes('localhost:5173') ||
  window.location.origin.includes('127.0.0.1:5173')
    ? 'http://localhost:5000/api'
    : '/api';

/**
 * Configure global axios configuration
 */
import axios from 'axios';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authorization token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('codesync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
