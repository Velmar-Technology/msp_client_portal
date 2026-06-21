import axios from 'axios';
import { ClientError, SerializedErrorSchema } from '@shared/errors';

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

// Response interceptor — handle token refresh on 401 and normalize error output
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 1. Attempt token refresh on 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
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
        
        // Return a standardized ClientError for authentication failure
        const clientError = new ClientError(
          'Session expired. Please log in again.',
          'UNAUTHORIZED_ERROR',
          'N/A',
          false
        );
        return Promise.reject(clientError);
      }
    }

    // 2. Parse and normalize any other errors to standardized ClientError
    if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
      const axiosError = error as any;
      let clientError: ClientError;

      if (axiosError.response && axiosError.response.data) {
        const parseResult = SerializedErrorSchema.safeParse(axiosError.response.data);

        if (parseResult.success) {
          const apiError = parseResult.data;
          clientError = new ClientError(
            apiError.message,
            apiError.code,
            apiError.correlationId,
            false,
            apiError.details
          );
        } else {
          clientError = new ClientError(
            axiosError.message || 'An unexpected API error occurred',
            'UNKNOWN_API_ERROR',
            'N/A',
            false,
            { rawData: axiosError.response.data }
          );
        }
      } else {
        clientError = new ClientError(
          'Could not connect to the server. Check your connection.',
          'NETWORK_ERROR',
          'N/A',
          true
        );
      }

      return Promise.reject(clientError);
    }

    return Promise.reject(error);
  },
);

export default api;

