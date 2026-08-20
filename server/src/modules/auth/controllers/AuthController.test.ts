import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { UserRole } from '@shared/types';

const mocks = vi.hoisted(() => {
  return {
    login: vi.fn(),
    googleAuth: vi.fn(),
    register: vi.fn(),
    refreshToken: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  };
});

vi.mock('@modules/auth/services/AuthService', () => ({
  authService: {
    login: mocks.login,
    googleAuth: mocks.googleAuth,
    register: mocks.register,
    refreshToken: mocks.refreshToken,
    forgotPassword: mocks.forgotPassword,
    resetPassword: mocks.resetPassword,
    verifyEmail: mocks.verifyEmail,
  },
}));

import { authController } from './AuthController';

function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('AuthController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should extract IP from x-forwarded-for header and pass to authService', async () => {
      const loginResult = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'John',
          role: UserRole.CLIENT,
          language: 'en_US',
          tenantId: 'tenant-1',
          avatarUrl: null,
          lastLoginAt: null,
          lastLoginIp: null,
        },
        tokens: { accessToken: 'at', refreshToken: 'rt' },
      };
      mocks.login.mockResolvedValue(loginResult);

      const req = {
        body: { email: 'user@example.com', password: 'pass123' },
        headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18' },
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = createMockResponse();

      await authController.login(req, res);

      // Should use the first IP from x-forwarded-for
      expect(mocks.login).toHaveBeenCalledWith(
        { email: 'user@example.com', password: 'pass123' },
        '203.0.113.50'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: loginResult,
      });
    });

    it('should fallback to req.ip when x-forwarded-for is absent', async () => {
      const loginResult = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'John',
          role: UserRole.CLIENT,
          language: 'en_US',
          tenantId: 'tenant-1',
          avatarUrl: null,
          lastLoginAt: '2025-06-15T10:00:00.000Z',
          lastLoginIp: '10.0.0.1',
        },
        tokens: { accessToken: 'at', refreshToken: 'rt' },
      };
      mocks.login.mockResolvedValue(loginResult);

      const req = {
        body: { email: 'user@example.com', password: 'pass123' },
        headers: {},
        ip: '::ffff:192.168.1.100',
      } as unknown as Request;
      const res = createMockResponse();

      await authController.login(req, res);

      expect(mocks.login).toHaveBeenCalledWith(
        { email: 'user@example.com', password: 'pass123' },
        '::ffff:192.168.1.100'
      );
    });

    it('should use "unknown" when both x-forwarded-for and req.ip are absent', async () => {
      const loginResult = {
        user: {
          id: 'user-1',
          email: 'user@example.com',
          name: 'John',
          role: UserRole.CLIENT,
          language: 'en_US',
          tenantId: 'tenant-1',
          avatarUrl: null,
          lastLoginAt: null,
          lastLoginIp: null,
        },
        tokens: { accessToken: 'at', refreshToken: 'rt' },
      };
      mocks.login.mockResolvedValue(loginResult);

      const req = {
        body: { email: 'user@example.com', password: 'pass123' },
        headers: {},
        ip: undefined,
      } as unknown as Request;
      const res = createMockResponse();

      await authController.login(req, res);

      expect(mocks.login).toHaveBeenCalledWith(
        { email: 'user@example.com', password: 'pass123' },
        'unknown'
      );
    });
  });

  describe('googleAuth', () => {
    it('should extract IP and pass to authService.googleAuth', async () => {
      const authResult = {
        user: {
          id: 'user-2',
          email: 'google@example.com',
          name: 'Jane',
          role: UserRole.CLIENT,
          language: 'en_US',
          tenantId: 'tenant-2',
          avatarUrl: null,
          lastLoginAt: '2025-06-14T08:00:00.000Z',
          lastLoginIp: '172.16.0.1',
        },
        tokens: { accessToken: 'at', refreshToken: 'rt' },
        isNewUser: false,
      };
      mocks.googleAuth.mockResolvedValue(authResult);

      const req = {
        body: { idToken: 'some-google-token' },
        headers: { 'x-forwarded-for': '100.200.50.25' },
        ip: '127.0.0.1',
      } as unknown as Request;
      const res = createMockResponse();

      await authController.googleAuth(req, res);

      expect(mocks.googleAuth).toHaveBeenCalledWith(
        { idToken: 'some-google-token' },
        '100.200.50.25'
      );
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: authResult,
      });
    });

    it('should fallback to req.ip for google auth when no forwarded header', async () => {
      const authResult = {
        user: {
          id: 'user-2',
          email: 'google@example.com',
          name: 'Jane',
          role: UserRole.CLIENT,
          language: 'en_US',
          tenantId: 'tenant-2',
          avatarUrl: null,
          lastLoginAt: null,
          lastLoginIp: null,
        },
        tokens: { accessToken: 'at', refreshToken: 'rt' },
        isNewUser: true,
      };
      mocks.googleAuth.mockResolvedValue(authResult);

      const req = {
        body: { idToken: 'token-123' },
        headers: {},
        ip: '10.20.30.40',
      } as unknown as Request;
      const res = createMockResponse();

      await authController.googleAuth(req, res);

      expect(mocks.googleAuth).toHaveBeenCalledWith(
        { idToken: 'token-123' },
        '10.20.30.40'
      );
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail with email and otp and return success', async () => {
      mocks.verifyEmail.mockResolvedValue(undefined);

      const req = {
        body: { email: 'test@example.com', otp: '123456' },
      } as unknown as Request;
      const res = createMockResponse();

      await authController.verifyEmail(req, res);

      expect(mocks.verifyEmail).toHaveBeenCalledWith('test@example.com', '123456');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Email verified successfully. You can now log in.',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword and return success message', async () => {
      mocks.forgotPassword.mockResolvedValue(undefined);

      const req = {
        body: { email: 'user@example.com' },
      } as unknown as Request;
      const res = createMockResponse();

      await authController.forgotPassword(req, res);

      expect(mocks.forgotPassword).toHaveBeenCalledWith('user@example.com');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset link has been sent to your email.',
      });
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword and return success message', async () => {
      mocks.resetPassword.mockResolvedValue(undefined);

      const req = {
        body: { token: 'valid-reset-token', password: 'NewPassword123!' },
      } as unknown as Request;
      const res = createMockResponse();

      await authController.resetPassword(req, res);

      expect(mocks.resetPassword).toHaveBeenCalledWith('valid-reset-token', 'NewPassword123!');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Password reset successfully',
      });
    });
  });
});
