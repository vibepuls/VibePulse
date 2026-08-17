import axios from 'axios';

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://vibepulse-backend-boxi.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,

  async (err) => {
    if (
      err.response?.status === 401 &&
      err.response?.data?.code === 'TOKEN_EXPIRED'
    ) {
      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(err);
        }

        const res = await api.post('/auth/refresh', {
          refreshToken
        });

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('refreshToken', res.data.refreshToken);

        err.config.headers.Authorization = `Bearer ${res.data.token}`;

        return api(err.config);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(err);
  }
);

export default api;
