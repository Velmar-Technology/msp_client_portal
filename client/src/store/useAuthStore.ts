import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { authService } from '../services/authService';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'CLIENT' | 'TECHNICIAN' | 'ADMIN';
  language: string;
  tenantId: string;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    name: string,
    tenantName: string,
    password: string,
    confirmPassword: string
  ) => Promise<void>;
  loginWithGoogle: (idToken: string, tenantName?: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedFields: Partial<AuthUser>) => void;
}

const getInitialUser = (): AuthUser | null => {
  try {
    const stored = authService.getCurrentUser();
    return stored && authService.isAuthenticated() ? stored : null;
  } catch (err) {
    console.error('Failed to get initial user from localStorage', err);
    return null;
  }
};

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: getInitialUser(),
      isLoading: false,
      isAuthenticated: !!getInitialUser(),

      login: async (email, password) => {
        set({ isLoading: true }, false, 'auth/login_request');
        try {
          const result = await authService.login({ email, password });
          set(
            {
              user: result.user,
              isAuthenticated: true,
              isLoading: false,
            },
            false,
            'auth/login_success'
          );
        } catch (error) {
          set({ isLoading: false }, false, 'auth/login_failure');
          throw error;
        }
      },

      register: async (email, name, tenantName, password, confirmPassword) => {
        set({ isLoading: true }, false, 'auth/register_request');
        try {
          const result = await authService.register({
            email,
            name,
            tenantName,
            password,
            confirmPassword,
          });
          set(
            {
              user: result.user,
              isAuthenticated: true,
              isLoading: false,
            },
            false,
            'auth/register_success'
          );
        } catch (error) {
          set({ isLoading: false }, false, 'auth/register_failure');
          throw error;
        }
      },

      loginWithGoogle: async (idToken, tenantName) => {
        set({ isLoading: true }, false, 'auth/google_login_request');
        try {
          const result = await authService.loginWithGoogle({ idToken, tenantName });
          set(
            {
              user: result.user,
              isAuthenticated: true,
              isLoading: false,
            },
            false,
            'auth/google_login_success'
          );
        } catch (error) {
          set({ isLoading: false }, false, 'auth/google_login_failure');
          throw error;
        }
      },

      logout: () => {
        authService.logout();
        set(
          {
            user: null,
            isAuthenticated: false,
          },
          false,
          'auth/logout'
        );
      },

      updateUser: (updatedFields) => {
        set(
          (state) => {
            if (!state.user) return state;
            const updatedUser = { ...state.user, ...updatedFields };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return { user: updatedUser };
          },
          false,
          'auth/update_user'
        );
      },
    }),
    { name: 'AuthStore' }
  )
);
