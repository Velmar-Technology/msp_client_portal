import axios from 'axios';
import { setupAxiosErrorInterceptor } from '@shared/errors';
import { toast } from 'sonner';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Global response interceptor to show toast notifications for backend errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only toast if we have a response and it's not a 401 (which is handled by refresh/redirect)
    if (error.response && error.response.status !== 401) {
      const errorMsg = error.response.data?.message || 'An unexpected error occurred';
      
      // Prevent double toasting for specific errors that have custom UI/Actions in their respective pages
      const customHandledErrors = ['verify your email', 'verificar tu correo', 'already exists', 'ya existe'];
      const hasCustomHandler = customHandledErrors.some((str) => errorMsg.includes(str));
      
      if (!hasCustomHandler) {
        toast.error(errorMsg);
      }
    }
    return Promise.reject(error);
  }
);

// Response interceptor — handle token refresh on 401 and normalize error output
setupAxiosErrorInterceptor(api, {
  onUnauthorized: async (_clientError, axiosError) => {
    const originalRequest = axiosError.config as (typeof axiosError.config & { _retry?: boolean });
    if (!originalRequest?._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = data.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw _clientError;
      }
    }
  },
});

export default api;

