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
    clientType: string
  ) => Promise<void>;
  loginWithGoogle: (idToken: string, tenantName?: string, rememberMe?: boolean) => Promise<void>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  logout: () => void;
  updateUser: (updatedFields: Partial<AuthUser>) => void;
}

/**
 * AuthProvider is kept for backward compatibility with existing imports,
 * but it no longer provides a React Context. It simply renders its children.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Hook to consume auth state.
 * Backed by Zustand for clean state access and centralized actions.
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
