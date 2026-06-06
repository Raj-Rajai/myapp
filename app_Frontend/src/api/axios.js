import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://myapp-3y37.onrender.com';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fth_token');
      localStorage.removeItem('fth_user');
    }
    return Promise.reject(error);
  }
);

export default api;
