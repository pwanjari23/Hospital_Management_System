import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request interceptor (prepared for future token/tenant injection)
api.interceptors.request.use(
  (config) => {
    // Placeholder: Attach authorization header or tenant ID here in future steps
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor (centralized error handling)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Placeholder: Handle global 401 unauthenticated or 403 forbidden responses
    return Promise.reject(error);
  }
);

export default api;
