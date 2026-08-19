import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserRole } from '@shared/types';

const mocks = vi.hoisted(() => {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateLastLogin: vi.fn(),
    findBySubdomain: vi.fn(),
    findByName: vi.fn(),
    createTenant: vi.fn(),
    hashPassword: vi.fn(),
    comparePassword: vi.fn(),
    jwtSign: vi.fn(),
    jwtVerify: vi.fn(),
    verifyEmail: vi.fn(),
    setOTP: vi.fn(),
  };
});

vi.mock('@modules/auth/repositories/UserRepository', () => ({
  userRepository: {
    findByEmail: mocks.findByEmail,
    findById: mocks.findById,
    create: mocks.create,
    updateLastLogin: mocks.updateLastLogin,
    verifyEmail: mocks.verifyEmail,
    setOTP: mocks.setOTP,
  },
}));

vi.mock('@modules/auth/repositories/TenantRepository', () => ({
  tenantRepository: {
    findBySubdomain: mocks.findBySubdomain,
    findByName: mocks.findByName,
    create: mocks.createTenant,
  },
}));

vi.mock('@shared/utils/passwordUtils', () => ({
  hashPassword: mocks.hashPassword,
  comparePassword: mocks.comparePassword,
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: mocks.jwtSign,
    verify: mocks.jwtVerify,
  },
}));

vi.mock('@shared/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@shared/config/env', () => ({
  env: {
    JWT_SECRET: 'test-jwt-secret',
    JWT_EXPIRES_IN: '24h',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_REFRESH_EXPIRES_IN: '7d',
    NODE_ENV: 'test',
    GOOGLE_CLIENT_ID: '',
  },
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: vi.fn(),
}));

import { authService } from './AuthService';

// Shared mock user factory
function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'John Doe',
    password_hash: 'hashed-password',
    role: UserRole.CLIENT,
    specialty: null,
    is_active: true,
    email_verified: true,
    language: 'en_US',
    avatar_url: null,
    last_login_at: null,
    last_login_ip: null,
    tenant_id: 'tenant-1',
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
    ...overrides,
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.jwtSign.mockReturnValue('mock-token');
  });

  // ============================
  // LOGIN
  // ============================
  describe('login', () => {
    it('should login successfully and return user data with null lastLoginAt on first login', async () => {
      const mockUser = createMockUser();
      mocks.findByEmail.mockResolvedValue(mockUser);
      mocks.comparePassword.mockResolvedValue(true);
      mocks.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.login(
        { email: 'user@example.com', password: 'password123' },
        '192.168.1.100'
      );

      expect(mocks.findByEmail).toHaveBeenCalledWith('user@example.com');
      expect(mocks.comparePassword).toHaveBeenCalledWith('password123', 'hashed-password');
      expect(mocks.updateLastLogin).toHaveBeenCalledWith('user-1', '192.168.1.100');
      expect(result.user.lastLoginAt).toBeNull();
      expect(result.user.lastLoginIp).toBeNull();
      expect(result.user.id).toBe('user-1');
      expect(result.tokens).toBeDefined();
    });

    it('should return previous login data when user has logged in before', async () => {
      const previousDate = new Date('2025-06-15T10:30:00Z');
      const mockUser = createMockUser({
        last_login_at: previousDate,
        last_login_ip: '10.0.0.5',
      });
      mocks.findByEmail.mockResolvedValue(mockUser);
      mocks.comparePassword.mockResolvedValue(true);
      mocks.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.login(
        { email: 'user@example.com', password: 'password123' },
        '192.168.1.200'
      );

      expect(result.user.lastLoginAt).toBe('2025-06-15T10:30:00.000Z');
      expect(result.user.lastLoginIp).toBe('10.0.0.5');
      expect(mocks.updateLastLogin).toHaveBeenCalledWith('user-1', '192.168.1.200');
    });

    it('should call updateLastLogin with the new IP address', async () => {
      const mockUser = createMockUser();
      mocks.findByEmail.mockResolvedValue(mockUser);
      mocks.comparePassword.mockResolvedValue(true);
      mocks.updateLastLogin.mockResolvedValue(undefined);

      await authService.login(
        { email: 'user@example.com', password: 'password123' },
        '203.0.113.42'
      );

      expect(mocks.updateLastLogin).toHaveBeenCalledTimes(1);
      expect(mocks.updateLastLogin).toHaveBeenCalledWith('user-1', '203.0.113.42');
    });

    it('should throw unauthorized error for invalid email', async () => {
      mocks.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'unknown@example.com', password: 'pass' }, '1.2.3.4')
      ).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      expect(mocks.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should throw forbidden error for unverified email', async () => {
      const mockUser = createMockUser({ email_verified: false });
      mocks.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.login({ email: 'user@example.com', password: 'password123' }, '1.2.3.4')
      ).rejects.toMatchObject({
        message: 'Please verify your email address before logging in',
        statusCode: 403,
        code: 'FORBIDDEN',
      });

      expect(mocks.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should throw unauthorized error for invalid password', async () => {
      const mockUser = createMockUser();
      mocks.findByEmail.mockResolvedValue(mockUser);
      mocks.comparePassword.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'user@example.com', password: 'wrong' }, '1.2.3.4')
      ).rejects.toMatchObject({
        message: 'Invalid email or password',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      expect(mocks.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should throw forbidden error for deactivated account', async () => {
      const mockUser = createMockUser({ is_active: false });
      mocks.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.login({ email: 'user@example.com', password: 'pass' }, '1.2.3.4')
      ).rejects.toMatchObject({
        message: 'Account has been deactivated',
        statusCode: 403,
        code: 'FORBIDDEN',
      });

      expect(mocks.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should not call updateLastLogin before password validation', async () => {
      const mockUser = createMockUser();
      mocks.findByEmail.mockResolvedValue(mockUser);
      mocks.comparePassword.mockResolvedValue(false);

      await expect(
        authService.login({ email: 'user@example.com', password: 'wrong' }, '1.2.3.4')
      ).rejects.toThrow();

      expect(mocks.updateLastLogin).not.toHaveBeenCalled();
    });
  });

  // ============================
  // GOOGLE AUTH
  // ============================
  describe('googleAuth', () => {
    it('should login existing user via mock Google token and track last login', async () => {
      const previousDate = new Date('2025-06-14T08:00:00Z');
      const mockUser = createMockUser({
        last_login_at: previousDate,
        last_login_ip: '172.16.0.1',
      });
      mocks.findByEmail.mockResolvedValue(mockUser);
      mocks.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.googleAuth(
        { idToken: 'mock-google-token-user@example.com-John' },
        '10.10.10.10'
      );

      expect(result.isNewUser).toBe(false);
      expect(result.user.lastLoginAt).toBe('2025-06-14T08:00:00.000Z');
      expect(result.user.lastLoginIp).toBe('172.16.0.1');
      expect(mocks.updateLastLogin).toHaveBeenCalledWith('user-1', '10.10.10.10');
    });

    it('should register new user via mock Google token with null lastLogin data', async () => {
      mocks.findByEmail.mockResolvedValue(null);
      mocks.findBySubdomain.mockResolvedValue(null);
      mocks.createTenant.mockResolvedValue({ id: 'tenant-new', name: "John's Workspace", subdomain: 'johnsworkspace' });
      mocks.hashPassword.mockResolvedValue('random-hashed-pw');
      const newUser = createMockUser({ id: 'user-new', email: 'new@example.com', name: 'John', tenant_id: 'tenant-new' });
      mocks.create.mockResolvedValue(newUser);
      mocks.updateLastLogin.mockResolvedValue(undefined);

      const result = await authService.googleAuth(
        { idToken: 'mock-google-token-new@example.com-John' },
        '5.5.5.5'
      );

      expect(result.isNewUser).toBe(true);
      expect(result.user.lastLoginAt).toBeNull();
      expect(result.user.lastLoginIp).toBeNull();
      expect(mocks.updateLastLogin).toHaveBeenCalledWith('user-new', '5.5.5.5');
      expect(mocks.verifyEmail).toHaveBeenCalledWith('user-new');
    });

    it('should throw forbidden for deactivated Google auth user', async () => {
      const mockUser = createMockUser({ is_active: false });
      mocks.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.googleAuth(
          { idToken: 'mock-google-token-user@example.com-John' },
          '1.1.1.1'
        )
      ).rejects.toMatchObject({
        message: 'Account has been deactivated',
        statusCode: 403,
        code: 'FORBIDDEN',
      });

      expect(mocks.updateLastLogin).not.toHaveBeenCalled();
    });
  });

  // ============================
  // REGISTER (no last login on registration)
  // ============================
  describe('register', () => {
    it('should register a new user without calling updateLastLogin', async () => {
      mocks.findByEmail.mockResolvedValue(null);
      mocks.findBySubdomain.mockResolvedValue(null);
      mocks.findByName.mockResolvedValue(null);
      mocks.createTenant.mockResolvedValue({ id: 'tenant-1', name: 'Acme', subdomain: 'acme' });
      mocks.hashPassword.mockResolvedValue('hashed-pw');
      mocks.create.mockResolvedValue(createMockUser({ tenant_id: 'tenant-1' }));

      const result = await authService.register({
        email: 'user@example.com',
        name: 'John Doe',
        tenantName: 'Acme',
        password: 'password123',
        confirmPassword: 'password123',
        clientType: 'CLIENT'
      });

      expect(result.user).toBeDefined();
      expect(result.message).toBe('Registration successful. Please check your email (user@example.com) to verify your account.');
      expect(mocks.updateLastLogin).not.toHaveBeenCalled();
      expect(mocks.setOTP).toHaveBeenCalledWith('user-1', expect.any(String), expect.any(Date));
    });
  });

  // ============================
  // VERIFY EMAIL
  // ============================
  describe('verifyEmail', () => {
    it('should verify email successfully with valid OTP', async () => {
      const mockUser = createMockUser({ 
        email_verified: false, 
        otp_code: '123456', 
        otp_expires: new Date(Date.now() + 15 * 60000) 
      });
      mocks.findByEmail.mockResolvedValue(mockUser);
      mocks.verifyEmail.mockResolvedValue(undefined);

      await expect(authService.verifyEmail('user@example.com', '123456')).resolves.toBeUndefined();
      expect(mocks.verifyEmail).toHaveBeenCalledWith('user-1');
    });

    it('should throw bad request for invalid email', async () => {
      mocks.findByEmail.mockResolvedValue(null);
      await expect(authService.verifyEmail('unknown@example.com', '123456')).rejects.toMatchObject({
        message: 'Invalid email or OTP',
        statusCode: 400,
      });
    });

    it('should throw bad request if email already verified', async () => {
      const mockUser = createMockUser({ email_verified: true });
      mocks.findByEmail.mockResolvedValue(mockUser);
      await expect(authService.verifyEmail('user@example.com', '123456')).rejects.toMatchObject({
        message: 'Email is already verified',
        statusCode: 400,
      });
    });

    it('should throw bad request for incorrect OTP', async () => {
      const mockUser = createMockUser({ 
        email_verified: false, 
        otp_code: '654321', 
        otp_expires: new Date(Date.now() + 15 * 60000) 
      });
      mocks.findByEmail.mockResolvedValue(mockUser);
      await expect(authService.verifyEmail('user@example.com', '123456')).rejects.toMatchObject({
        message: 'Invalid OTP',
        statusCode: 400,
      });
    });

    it('should throw bad request for expired OTP', async () => {
      const mockUser = createMockUser({ 
        email_verified: false, 
        otp_code: '123456', 
        otp_expires: new Date(Date.now() - 15 * 60000) 
      });
      mocks.findByEmail.mockResolvedValue(mockUser);
      await expect(authService.verifyEmail('user@example.com', '123456')).rejects.toMatchObject({
        message: 'OTP has expired',
        statusCode: 400,
      });
    });
  });
});
