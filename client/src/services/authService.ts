import api from "@/services/api";
import {
  getAuthItem,
  setAuthItem,
  clearAuthData,
  setRememberMe,
} from "@/lib/authStorage";

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
  clientType: string;
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
    clientType?: string;
    avatarUrl?: string | null;
    lastLoginAt?: string | null;
    lastLoginIp?: string | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/** Persist tokens + user to the correct store (localStorage or sessionStorage). */
function persistAuthData(result: AuthResponse): void {
  setAuthItem('accessToken', result.tokens.accessToken);
  setAuthItem('refreshToken', result.tokens.refreshToken);
  setAuthItem('user', JSON.stringify(result.user));
}

export const authService = {
  async login(data: LoginPayload, rememberMe = true): Promise<AuthResponse> {
    // Set the storage preference BEFORE persisting tokens
    setRememberMe(rememberMe);

    const response = await api.post('/auth/login', data);
    const result = response.data.data as AuthResponse;
    persistAuthData(result);
    return result;
  },

  async register(data: RegisterPayload): Promise<void> {
    await api.post('/auth/register', data);
  },

  async verifyEmail(email: string, otp: string): Promise<void> {
    await api.post('/auth/verify-email', { email, otp });
  },

  async loginWithGoogle(data: GoogleAuthPayload, rememberMe = true): Promise<AuthResponse> {
    setRememberMe(rememberMe);

    const response = await api.post('/auth/google', data);
    const result = response.data.data as AuthResponse;
    persistAuthData(result);
    return result;
  },

  logout(): void {
    clearAuthData();
    window.location.href = '/login';
  },

  getCurrentUser() {
    const user = getAuthItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated(): boolean {
    return !!getAuthItem('accessToken');
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string, confirmPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password, confirmPassword });
  },
};

