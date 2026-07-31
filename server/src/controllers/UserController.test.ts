import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  return {
    updateProfile: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    bulkUpdateRole: vi.fn(),
  };
});

vi.mock('../services/UserService', () => {
  return {
    userService: {
      updateProfile: mocks.updateProfile,
      bulkUpdateStatus: mocks.bulkUpdateStatus,
      bulkUpdateRole: mocks.bulkUpdateRole,
    },
  };
});

import { userController } from './UserController';
import { UserRole } from '../types';

describe('UserController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadAvatar', () => {
    it('should return 400 if no file is uploaded', async () => {
      const req = {
        user: { userId: 'user-1' },
        file: undefined,
      } as unknown as Request;

      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      await userController.uploadAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'No file uploaded',
      });
    });

    it('should upload avatar and return success status and url', async () => {
      const req = {
        user: { userId: 'user-1' },
        file: { filename: 'test-avatar.png' },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      mocks.updateProfile.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        name: 'John Doe',
        avatar_url: '/uploads/test-avatar.png',
      });

      await userController.uploadAvatar(req, res);

      expect(mocks.updateProfile).toHaveBeenCalledWith('user-1', {
        avatar_url: '/uploads/test-avatar.png',
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          avatarUrl: '/uploads/test-avatar.png',
        },
      });
    });
  });

  describe('bulkToggleStatus', () => {
    it('should call userService.bulkUpdateStatus and return result', async () => {
      const req = {
        user: { userId: 'admin-1' },
        body: { userIds: ['u-1', 'u-2'], is_active: false },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      mocks.bulkUpdateStatus.mockResolvedValue({ updatedCount: 2 });

      await userController.bulkToggleStatus(req, res);

      expect(mocks.bulkUpdateStatus).toHaveBeenCalledWith('admin-1', ['u-1', 'u-2'], false);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { updatedCount: 2 },
      });
    });
  });

  describe('bulkUpdateRole', () => {
    it('should call userService.bulkUpdateRole and return result', async () => {
      const req = {
        user: { userId: 'admin-1' },
        body: { userIds: ['u-1', 'u-2'], role: UserRole.TECHNICIAN },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      mocks.bulkUpdateRole.mockResolvedValue({ updatedCount: 2 });

      await userController.bulkUpdateRole(req, res);

      expect(mocks.bulkUpdateRole).toHaveBeenCalledWith('admin-1', ['u-1', 'u-2'], UserRole.TECHNICIAN);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { updatedCount: 2 },
      });
    });
  });
});

