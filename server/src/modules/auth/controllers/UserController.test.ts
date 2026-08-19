import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  return {
    updateProfile: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    bulkUpdateRole: vi.fn(),
    updateUserClientType: vi.fn(),
    bulkUpdateClientType: vi.fn(),
    deleteUser: vi.fn(),
    bulkDeleteUsers: vi.fn(),
  };
});

vi.mock('@modules/auth/services/UserService', () => {
  return {
    userService: {
      updateProfile: mocks.updateProfile,
      bulkUpdateStatus: mocks.bulkUpdateStatus,
      bulkUpdateRole: mocks.bulkUpdateRole,
      updateUserClientType: mocks.updateUserClientType,
      bulkUpdateClientType: mocks.bulkUpdateClientType,
      deleteUser: mocks.deleteUser,
      bulkDeleteUsers: mocks.bulkDeleteUsers,
    },
  };
});

import { userController } from './UserController';
import { UserRole } from '@shared/types';

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

  describe('updateClientType', () => {
    it('should call userService.updateUserClientType and return updated user', async () => {
      const req = {
        user: { userId: 'admin-1' },
        params: { id: 'u-1' },
        body: { clientType: 'ENTERPRISE' },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      const mockUpdatedUser = { id: 'u-1', client_type: 'ENTERPRISE' };
      mocks.updateUserClientType.mockResolvedValue(mockUpdatedUser);

      await userController.updateClientType(req, res);

      expect(mocks.updateUserClientType).toHaveBeenCalledWith('admin-1', 'u-1', 'ENTERPRISE');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockUpdatedUser,
      });
    });
  });

  describe('bulkUpdateClientType', () => {
    it('should call userService.bulkUpdateClientType and return result', async () => {
      const req = {
        user: { userId: 'admin-1' },
        body: { userIds: ['u-1', 'u-2'], clientType: 'ENTERPRISE' },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      mocks.bulkUpdateClientType.mockResolvedValue({ updatedCount: 2 });

      await userController.bulkUpdateClientType(req, res);

      expect(mocks.bulkUpdateClientType).toHaveBeenCalledWith('admin-1', ['u-1', 'u-2'], 'ENTERPRISE');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { updatedCount: 2 },
      });
    });
  });

  describe('deleteUser', () => {
    it('should call userService.deleteUser and return success message', async () => {
      const req = {
        user: { userId: 'admin-1' },
        params: { id: 'u-1' },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      mocks.deleteUser.mockResolvedValue(undefined);

      await userController.deleteUser(req, res);

      expect(mocks.deleteUser).toHaveBeenCalledWith('admin-1', 'u-1');
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully',
      });
    });
  });

  describe('bulkDelete', () => {
    it('should call userService.bulkDeleteUsers and return result', async () => {
      const req = {
        user: { userId: 'admin-1' },
        body: { userIds: ['u-1', 'u-2'] },
      } as unknown as Request;

      const res = {
        json: vi.fn(),
      } as unknown as Response;

      mocks.bulkDeleteUsers.mockResolvedValue({ deletedCount: 2 });

      await userController.bulkDelete(req, res);

      expect(mocks.bulkDeleteUsers).toHaveBeenCalledWith('admin-1', ['u-1', 'u-2']);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { deletedCount: 2 },
      });
    });
  });
});


