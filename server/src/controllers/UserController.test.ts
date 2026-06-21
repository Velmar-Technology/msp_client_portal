import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';

const mocks = vi.hoisted(() => {
  return {
    updateProfile: vi.fn(),
  };
});

vi.mock('../services/UserService', () => {
  return {
    userService: {
      updateProfile: mocks.updateProfile,
    },
  };
});

import { userController } from './UserController';

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
});
