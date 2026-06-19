import api from './api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  tenantName: string;
  password: string;
  confirmPassword: string;
}

export interface GoogleAuthPayload {
  idToken: string;
  tenantName?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'CLIENT' | 'TECHNICIAN' | 'ADMIN';
    language: string;
    tenantId: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export const authService = {
  async login(data: LoginPayload): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    const result = response.data.data as AuthResponse;
    localStorage.setItem('accessToken', result.tokens.accessToken);
    localStorage.setItem('refreshToken', result.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    return result;
  },

  async register(data: RegisterPayload): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    const result = response.data.data as AuthResponse;
    localStorage.setItem('accessToken', result.tokens.accessToken);
    localStorage.setItem('refreshToken', result.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    return result;
  },

  async loginWithGoogle(data: GoogleAuthPayload): Promise<AuthResponse> {
    const response = await api.post('/auth/google', data);
    const result = response.data.data as AuthResponse;
    localStorage.setItem('accessToken', result.tokens.accessToken);
    localStorage.setItem('refreshToken', result.tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(result.user));
    return result;
  },

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string, confirmPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password, confirmPassword });
  },
};
