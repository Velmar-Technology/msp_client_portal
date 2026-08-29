import React from 'react';
import { useAuthStore } from "@/store/useAuthStore";
import type { AuthUser } from "@/store/useAuthStore";

export type { AuthUser };

export interface AuthContextType {
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
  loginWithGoogle: (idToken: string, tenantName?: string, rememberMe?: boolean) => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedFields: Partial<AuthUser>) => void;
}

/**
 * AuthProvider component wrapper.
 * Kept for backward compatibility with existing imports; delegates global auth state to Zustand.
 *
 * @param props - Component children to render.
 * @returns React element.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Custom hook to consume global authentication state and dispatch auth actions.
 * Backed by `useAuthStore` (Zustand) for optimized selector subscriptions.
 *
 * @returns AuthContextType containing current user, authentication status, and auth methods.
 */
export function useAuth(): AuthContextType {
  const store = useAuthStore();
  return {
    user: store.user,
    isLoading: store.isLoading,
    isAuthenticated: store.isAuthenticated,
    login: store.login,
    register: store.register,
    verifyEmail: store.verifyEmail,
    loginWithGoogle: store.loginWithGoogle,
    logout: store.logout,
    updateUser: store.updateUser,
  };
}
