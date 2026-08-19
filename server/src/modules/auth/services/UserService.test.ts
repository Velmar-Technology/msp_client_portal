import { vi, describe, it, expect, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByRole: vi.fn(),
    findAllClients: vi.fn(),
    updateProfile: vi.fn(),
    updatePassword: vi.fn(),
    bulkUpdateStatus: vi.fn(),
    bulkUpdateRole: vi.fn(),
    updateClientType: vi.fn(),
    bulkUpdateClientType: vi.fn(),
    deleteById: vi.fn(),
    bulkDelete: vi.fn(),
    hashPassword: vi.fn(),
    comparePassword: vi.fn(),
  };
});

vi.mock('@modules/auth/repositories/UserRepository', () => {
  return {
    userRepository: {
      findById: mocks.findById,
      findByEmail: mocks.findByEmail,
      findByRole: mocks.findByRole,
      findAllClients: mocks.findAllClients,
      updateProfile: mocks.updateProfile,
      updatePassword: mocks.updatePassword,
      bulkUpdateStatus: mocks.bulkUpdateStatus,
      bulkUpdateRole: mocks.bulkUpdateRole,
      updateClientType: mocks.updateClientType,
      bulkUpdateClientType: mocks.bulkUpdateClientType,
      deleteById: mocks.deleteById,
      bulkDelete: mocks.bulkDelete,
    },
  };
});


vi.mock('@shared/utils/passwordUtils', () => {
  return {
    hashPassword: mocks.hashPassword,
    comparePassword: mocks.comparePassword,
  };
});

import { userService } from './UserService';
import { UserRole } from '@shared/types';

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return profile and omit password_hash', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'John Doe',
        role: UserRole.CLIENT,
        language: 'en_US',
        password_hash: 'hashed-password',
      };
      mocks.findById.mockResolvedValue(mockUser);

      const result = await userService.getProfile('user-1');

      expect(mocks.findById).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        name: 'John Doe',
        role: UserRole.CLIENT,
        language: 'en_US',
      });
      expect((result as any).password_hash).toBeUndefined();
    });

    it('should throw not found AppError if user does not exist', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(userService.getProfile('user-1')).rejects.toMatchObject({
        message: 'User not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('updateProfile', () => {
    it('should update profile and return it omitting password_hash', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'new@example.com',
        name: 'John New',
        role: UserRole.CLIENT,
        language: 'es_DO',
        password_hash: 'hashed-password',
      };
      mocks.findByEmail.mockResolvedValue(null);
      mocks.updateProfile.mockResolvedValue(mockUser);

      const result = await userService.updateProfile('user-1', {
        email: 'new@example.com',
        name: 'John New',
        language: 'es_DO',
      });

      expect(mocks.findByEmail).toHaveBeenCalledWith('new@example.com');
      expect(mocks.updateProfile).toHaveBeenCalledWith('user-1', {
        email: 'new@example.com',
        name: 'John New',
        language: 'es_DO',
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'new@example.com',
        name: 'John New',
        role: UserRole.CLIENT,
        language: 'es_DO',
      });
    });

    it('should update profile and include avatar_url if provided', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        name: 'John Doe',
        role: UserRole.CLIENT,
        language: 'en_US',
        avatar_url: '/uploads/new-avatar.png',
        password_hash: 'hashed-password',
      };
      mocks.findByEmail.mockResolvedValue(null);
      mocks.updateProfile.mockResolvedValue(mockUser);

      const result = await userService.updateProfile('user-1', {
        avatar_url: '/uploads/new-avatar.png',
      });

      expect(mocks.updateProfile).toHaveBeenCalledWith('user-1', {
        avatar_url: '/uploads/new-avatar.png',
      });
      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        name: 'John Doe',
        role: UserRole.CLIENT,
        language: 'en_US',
        avatar_url: '/uploads/new-avatar.png',
      });
    });

    it('should throw conflict AppError if email is already in use by another user', async () => {
      const existingUser = {
        id: 'user-2',
        email: 'inuse@example.com',
      };
      mocks.findByEmail.mockResolvedValue(existingUser);

      await expect(
        userService.updateProfile('user-1', { email: 'inuse@example.com' })
      ).rejects.toMatchObject({
        message: 'Email already in use',
        statusCode: 409,
        code: 'CONFLICT',
      });
    });
  });

  describe('changePassword', () => {
    it('should successfully change password if current password is valid', async () => {
      const mockUser = {
        id: 'user-1',
        password_hash: 'hashed-current',
      };
      mocks.findById.mockResolvedValue(mockUser);
      mocks.comparePassword.mockResolvedValue(true);
      mocks.hashPassword.mockResolvedValue('hashed-new');
      mocks.updatePassword.mockResolvedValue(undefined);

      await userService.changePassword('user-1', {
        currentPassword: 'oldPassword123',
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      });

      expect(mocks.findById).toHaveBeenCalledWith('user-1');
      expect(mocks.comparePassword).toHaveBeenCalledWith('oldPassword123', 'hashed-current');
      expect(mocks.hashPassword).toHaveBeenCalledWith('newPassword123');
      expect(mocks.updatePassword).toHaveBeenCalledWith('user-1', 'hashed-new');
    });

    it('should throw not found AppError if user does not exist', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(
        userService.changePassword('user-1', {
          currentPassword: 'oldPassword123',
          newPassword: 'newPassword123',
          confirmPassword: 'newPassword123',
        })
      ).rejects.toMatchObject({
        message: 'User not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });

    it('should throw unauthorized AppError if current password is incorrect', async () => {
      const mockUser = {
        id: 'user-1',
        password_hash: 'hashed-current',
      };
      mocks.findById.mockResolvedValue(mockUser);
      mocks.comparePassword.mockResolvedValue(false);

      await expect(
        userService.changePassword('user-1', {
          currentPassword: 'wrongPassword',
          newPassword: 'newPassword123',
          confirmPassword: 'newPassword123',
        })
      ).rejects.toMatchObject({
        message: 'Invalid current password',
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });

      expect(mocks.updatePassword).not.toHaveBeenCalled();
    });
  });

  describe('getClients', () => {
    it('should return all clients omitting password_hash', async () => {
      const mockClients = [
        { id: 'c-1', name: 'Alice', role: UserRole.CLIENT, password_hash: 'hash1' },
        { id: 'c-2', name: 'Bob', role: UserRole.CLIENT, password_hash: 'hash2' },
      ];
      mocks.findAllClients.mockResolvedValue(mockClients);

      const result = await userService.getClients();

      expect(mocks.findAllClients).toHaveBeenCalled();
      expect(result).toEqual([
        { id: 'c-1', name: 'Alice', role: UserRole.CLIENT },
        { id: 'c-2', name: 'Bob', role: UserRole.CLIENT },
      ]);
      expect((result[0] as any).password_hash).toBeUndefined();
    });
  });

  describe('bulkUpdateStatus', () => {
    it('should exclude admin user id and update status for remaining target users', async () => {
      mocks.bulkUpdateStatus.mockResolvedValue(2);

      const result = await userService.bulkUpdateStatus('admin-1', ['admin-1', 'user-2', 'user-3'], true);

      expect(mocks.bulkUpdateStatus).toHaveBeenCalledWith(['user-2', 'user-3'], true);
      expect(result).toEqual({ updatedCount: 2 });
    });

    it('should return updatedCount 0 if no valid target users remain after excluding admin', async () => {
      const result = await userService.bulkUpdateStatus('admin-1', ['admin-1'], false);

      expect(mocks.bulkUpdateStatus).not.toHaveBeenCalled();
      expect(result).toEqual({ updatedCount: 0 });
    });
  });

  describe('bulkUpdateRole', () => {
    it('should exclude admin user id and update role for remaining target users', async () => {
      mocks.bulkUpdateRole.mockResolvedValue(2);

      const result = await userService.bulkUpdateRole('admin-1', ['admin-1', 'user-2', 'user-3'], UserRole.TECHNICIAN);

      expect(mocks.bulkUpdateRole).toHaveBeenCalledWith(['user-2', 'user-3'], UserRole.TECHNICIAN);
      expect(result).toEqual({ updatedCount: 2 });
    });
  });

  describe('updateUserClientType', () => {
    it('should update user client type and return user omitting password_hash', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        client_type: 'ENTERPRISE',
        password_hash: 'hashed',
      };
      mocks.findById.mockResolvedValue(mockUser);
      mocks.updateClientType.mockResolvedValue(mockUser);

      const result = await userService.updateUserClientType('admin-1', 'user-1', 'ENTERPRISE');

      expect(mocks.findById).toHaveBeenCalledWith('user-1');
      expect(mocks.updateClientType).toHaveBeenCalledWith('user-1', 'ENTERPRISE');
      expect(result).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        client_type: 'ENTERPRISE',
      });
      expect((result as any).password_hash).toBeUndefined();
    });

    it('should throw not found AppError if target user does not exist', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(
        userService.updateUserClientType('admin-1', 'user-1', 'ENTERPRISE')
      ).rejects.toMatchObject({
        message: 'User not found',
        statusCode: 404,
        code: 'NOT_FOUND',
      });
    });
  });

  describe('bulkUpdateClientType', () => {
    it('should update client type for target users', async () => {
      mocks.bulkUpdateClientType.mockResolvedValue(2);

      const result = await userService.bulkUpdateClientType('admin-1', ['user-2', 'user-3'], 'ENTERPRISE');

      expect(mocks.bulkUpdateClientType).toHaveBeenCalledWith(['user-2', 'user-3'], 'ENTERPRISE');
      expect(result).toEqual({ updatedCount: 2 });
    });

    it('should return updatedCount 0 if empty user array', async () => {
      const result = await userService.bulkUpdateClientType('admin-1', [], 'ENTERPRISE');

      expect(mocks.bulkUpdateClientType).not.toHaveBeenCalled();
      expect(result).toEqual({ updatedCount: 0 });
    });
  });

  describe('deleteUser', () => {
    it('should delete user if found and not self', async () => {
      const mockUser = { id: 'user-1', name: 'Test User' };
      mocks.findById.mockResolvedValue(mockUser);
      mocks.deleteById.mockResolvedValue(true);

      await userService.deleteUser('admin-1', 'user-1');

      expect(mocks.findById).toHaveBeenCalledWith('user-1');
      expect(mocks.deleteById).toHaveBeenCalledWith('user-1');
    });

    it('should throw forbidden error if admin attempts to delete self', async () => {
      await expect(
        userService.deleteUser('admin-1', 'admin-1')
      ).rejects.toMatchObject({
        message: 'You cannot delete your own account',
        statusCode: 403,
      });

      expect(mocks.deleteById).not.toHaveBeenCalled();
    });

    it('should throw not found error if user does not exist', async () => {
      mocks.findById.mockResolvedValue(null);

      await expect(
        userService.deleteUser('admin-1', 'user-99')
      ).rejects.toMatchObject({
        message: 'User not found',
        statusCode: 404,
      });

      expect(mocks.deleteById).not.toHaveBeenCalled();
    });
  });

  describe('bulkDeleteUsers', () => {
    it('should exclude admin id and delete remaining users', async () => {
      mocks.bulkDelete.mockResolvedValue(2);

      const result = await userService.bulkDeleteUsers('admin-1', ['admin-1', 'user-2', 'user-3']);

      expect(mocks.bulkDelete).toHaveBeenCalledWith(['user-2', 'user-3']);
      expect(result).toEqual({ deletedCount: 2 });
    });

    it('should return deletedCount 0 if only admin id was provided', async () => {
      const result = await userService.bulkDeleteUsers('admin-1', ['admin-1']);

      expect(mocks.bulkDelete).not.toHaveBeenCalled();
      expect(result).toEqual({ deletedCount: 0 });
    });
  });
});


