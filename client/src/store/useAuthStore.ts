import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { authService } from "@/features/auth";
import { setAuthItem } from "@/lib/authStorage";

type FaroUser = Parameters<typeof import('@/telemetry/faro').setFaroUser>[0];

let faroHelpers: {
  setFaroUser: typeof import('@/telemetry/faro').setFaroUser;
  resetFaroUser: typeof import('@/telemetry/faro').resetFaroUser;
} | null = null;

async function setFaroUserLazy(user: FaroUser): Promise<void> {
  try {
    if (!faroHelpers) {
      faroHelpers = await import('@/telemetry/faro');
    }
    faroHelpers.setFaroUser(user);
  } catch {
    // Telemetry must never break auth flows
  }
}

function resetFaroUserLazy(): void {
  if (faroHelpers) {
    faroHelpers.resetFaroUser();
    return;
  }
  void import('@/telemetry/faro')
    .then((m) => m.resetFaroUser())
    .catch(() => {});
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'CLIENT' | 'TECHNICIAN' | 'ADMIN';
  language: string;
  tenantId: string;
  clientType?: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  lastLoginAt?: string | null;
  lastLoginIp?: string | null;
  accountStatus?: 'ACTIVE' | 'READ_ONLY' | 'SUSPENDED' | 'PURGED';
  rnc?: string | null;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (
    email: string,
    name: string,
    tenantName: string,
    password: string,
    confirmPassword: string,
    clientType: string,
    phoneNumber?: string
  ) => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  loginWithGoogle: (idToken: string, tenantName?: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  updateUser: (updatedFields: Partial<AuthUser>) => void;
}

const getInitialUser = (): AuthUser | null => {
  try {
    const stored = authService.getCurrentUser();
    const user = stored && authService.isAuthenticated() ? stored : null;
    if (user) {
      void setFaroUserLazy(user);
    }
    return user;
  } catch (err) {
    console.error('Failed to get initial user from localStorage', err);
    return null;
  }
};

/**
 * Global authentication and user session store powered by Zustand.
 * Synchronizes session identity with telemetry (Grafana Faro RUM) and storage abstractions.
 */
export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: getInitialUser(),
      isLoading: false,
      isAuthenticated: !!getInitialUser(),

      login: async (email, password, rememberMe = true) => {
        set({ isLoading: true }, false, 'auth/login_request');
        try {
          const result = await authService.login({ email, password }, rememberMe);
          void setFaroUserLazy(result.user);
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

      register: async (email, name, tenantName, password, confirmPassword, clientType, phoneNumber) => {
        set({ isLoading: true }, false, 'auth/register_request');
        try {
          await authService.register({
            email,
            name,
            tenantName,
            password,
            confirmPassword,
            clientType,
            phoneNumber,
          });
          set(
            {
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

      verifyEmail: async (email, otp) => {
        set({ isLoading: true }, false, 'auth/verify_email_request');
        try {
          await authService.verifyEmail(email, otp);
          set({ isLoading: false }, false, 'auth/verify_email_success');
        } catch (error) {
          set({ isLoading: false }, false, 'auth/verify_email_failure');
          throw error;
        }
      },

      loginWithGoogle: async (idToken, tenantName, rememberMe = true) => {
        set({ isLoading: true }, false, 'auth/google_login_request');
        try {
          const result = await authService.loginWithGoogle({ idToken, tenantName }, rememberMe);
          void setFaroUserLazy(result.user);
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
        resetFaroUserLazy();
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
            setAuthItem('user', JSON.stringify(updatedUser));
            void setFaroUserLazy(updatedUser);
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
