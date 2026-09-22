import axios from 'axios';
import { getStoredToken, clearStoredToken } from '../utils/tokenStorage';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let onUnauthorizedHandler = null;

/**
 * Register a global listener for 401 unauthenticated events (e.g. to reset React auth state)
 */
export const registerUnauthorizedHandler = (handler) => {
  onUnauthorizedHandler = handler;
};

// Request interceptor: attach Bearer token if available
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthenticated
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredToken();
      if (typeof onUnauthorizedHandler === 'function') {
        onUnauthorizedHandler();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
