import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://vibepulse-backend-boxi.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 20000
});

let refreshPromise = null;

const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const original = error.config;

    if (status !== 401 || original?._retry || original?.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearAuth();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') window.location.href = '/login';
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = axios.post(`${API_URL}/auth/refresh`, { refreshToken }, { withCredentials: true })
          .then((res) => {
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('refreshToken', res.data.refreshToken);
            return res.data.token;
          })
          .finally(() => { refreshPromise = null; });
      }

      const token = await refreshPromise;
      original._retry = true;
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${token}`;
      return api(original);
    } catch (refreshError) {
      clearAuth();
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') window.location.href = '/login';
      return Promise.reject(refreshError);
    }
  }
);

export default api;
