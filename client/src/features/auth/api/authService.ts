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
  phoneNumber?: string;
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
    phoneNumber?: string | null;
    avatarUrl?: string | null;
    lastLoginAt?: string | null;
    lastLoginIp?: string | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export type User = AuthResponse['user'];

/** Persist tokens + user to the correct store (localStorage or sessionStorage). */
function persistAuthData(result: AuthResponse): void {
  setAuthItem('accessToken', result.tokens.accessToken);
  setAuthItem('refreshToken', result.tokens.refreshToken);
  setAuthItem('user', JSON.stringify(result.user));
}

/**
 * Authentication and credential management service.
 * Handles JWT token storage, login/registration, OTP verification, and password resets.
 */
export const authService = {
  /**
   * Authenticates a user with email and password credentials.
   *
   * @param data - Credentials payload (email and plaintext password).
   * @param rememberMe - Whether to persist tokens in localStorage vs sessionStorage. Defaults to true.
   * @returns Promise resolving to authenticated user details and access/refresh tokens.
   * @throws {UnauthorizedError} If invalid credentials are provided.
   */
  async login(data: LoginPayload, rememberMe = true): Promise<AuthResponse> {
    // Set the storage preference BEFORE persisting tokens
    setRememberMe(rememberMe);

    const response = await api.post('/auth/login', data);
    const result = response.data.data as AuthResponse;
    persistAuthData(result);
    return result;
  },

  /**
   * Registers a new client user account and tenant.
   *
   * @param data - Registration payload with user profile, tenant name, and password confirmation.
   * @returns Promise resolving when registration succeeds and OTP email is dispatched.
   * @throws {ConflictError} If the email or tenant name already exists.
   * @throws {ValidationError} If passwords fail complexity or match validation.
   */
  async register(data: RegisterPayload): Promise<void> {
    await api.post('/auth/register', data);
  },

  /**
   * Verifies a user's email address using a one-time passcode (OTP).
   *
   * @param email - Target user email address.
   * @param otp - 6-digit one-time passcode.
   * @returns Promise resolving on successful email verification.
   * @throws {ValidationError} If the OTP is invalid or expired.
   */
  async verifyEmail(email: string, otp: string): Promise<void> {
    await api.post('/auth/verify-email', { email, otp });
  },

  /**
   * Authenticates or creates an account using a Google OAuth ID token.
   *
   * @param data - Google ID token payload and optional tenant name.
   * @param rememberMe - Whether to persist tokens in localStorage vs sessionStorage.
   * @returns Promise resolving to user profile and JWT tokens.
   * @throws {UnauthorizedError} If the Google ID token is invalid or expired.
   */
  async loginWithGoogle(data: GoogleAuthPayload, rememberMe = true): Promise<AuthResponse> {
    setRememberMe(rememberMe);

    const response = await api.post('/auth/google', data);
    const result = response.data.data as AuthResponse;
    persistAuthData(result);
    return result;
  },

  /**
   * Clears all session tokens and redirects the user to the login screen.
   *
   * @returns void
   */
  logout(): void {
    clearAuthData();
    window.location.href = '/login';
  },

  /**
   * Retrieves the currently authenticated user object stored in browser storage.
   *
   * @returns User object if present and valid JSON, otherwise null.
   */
  getCurrentUser() {
    const user = getAuthItem('user');
    return user ? JSON.parse(user) : null;
  },

  /**
   * Checks if an access token exists in browser storage.
   *
   * @returns boolean indicating whether the client holds an active access token.
   */
  isAuthenticated(): boolean {
    return !!getAuthItem('accessToken');
  },

  /**
   * Initiates a password reset flow by sending a reset link to the given email.
   *
   * @param email - Target registered email address.
   * @returns Promise resolving when reset email has been dispatched.
   */
  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  /**
   * Completes a password reset operation using a verified reset token.
   *
   * @param token - One-time password reset token from email link.
   * @param password - New password string.
   * @param confirmPassword - Confirmation string matching new password.
   * @returns Promise resolving when password is successfully updated.
   * @throws {ValidationError} If passwords mismatch or token is expired/invalid.
   */
  async resetPassword(token: string, password: string, confirmPassword: string): Promise<void> {
    await api.post('/auth/reset-password', { token, password, confirmPassword });
  },
};

