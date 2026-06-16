import React, { createContext, useContext, useState, useCallback } from 'react';
import { authService } from '../services/authService';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'CLIENT' | 'TECHNICIAN' | 'ADMIN';
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = authService.getCurrentUser();
    return stored && authService.isAuthenticated() ? stored : null;
  });
  const [isLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login({ email, password });
    setUser(result.user);
  }, []);

  const register = useCallback(async (email: string, name: string, password: string, confirmPassword: string) => {
    const result = await authService.register({ email, name, password, confirmPassword });
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    authService.logout();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
