import { userRepository } from '../repositories/UserRepository';
import type { UserListFilters } from '../repositories/UserRepository';
import { AppError } from '../utils/AppError';
import { User, UserRole } from '../types';
import { UpdateProfileInput, ChangePasswordInput } from '../dtos/user.dto';
import { hashPassword, comparePassword } from '../utils/passwordUtils';

export interface UserListResponse {
  users: Omit<User, 'password_hash'>[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UserStats {
  total: number;
  byRole: Record<string, number>;
  active: number;
  inactive: number;
}

export class UserService {
  async getProfile(userId: string): Promise<Omit<User, 'password_hash'>> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');
    const { password_hash, ...profile } = user;
    return profile;
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<Omit<User, 'password_hash'>> {
    if (data.email) {
      const existing = await userRepository.findByEmail(data.email);
      if (existing && existing.id !== userId) {
        throw AppError.conflict('Email already in use');
      }
    }

    const updated = await userRepository.updateProfile(userId, data);
    if (!updated) throw AppError.internal('Failed to update profile');
    const { password_hash, ...profile } = updated;
    return profile;
  }

  async changePassword(userId: string, data: ChangePasswordInput): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound('User not found');

    const isValid = await comparePassword(data.currentPassword, user.password_hash);
    if (!isValid) {
      throw AppError.unauthorized('Invalid current password');
    }

    const hashed = await hashPassword(data.newPassword);
    await userRepository.updatePassword(userId, hashed);
  }

  async getTechnicians(): Promise<Omit<User, 'password_hash'>[]> {
    const techs = await userRepository.findByRole(UserRole.TECHNICIAN);
    return techs.map(({ password_hash, ...t }) => t);
  }

  async getClients(): Promise<Omit<User, 'password_hash'>[]> {
    const clients = await userRepository.findAllClients();
    return clients.map(({ password_hash, ...c }) => c);
  }

  // ---- Admin User Management ----

  async getAllUsers(params: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: string;
    search?: string;
  }): Promise<UserListResponse> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    const filters: UserListFilters = {
      limit,
      offset,
    };

    if (params.role && Object.values(UserRole).includes(params.role as UserRole)) {
      filters.role = params.role as UserRole;
    }
    if (params.isActive !== undefined) {
      filters.isActive = params.isActive === 'true';
    }
    if (params.search) {
      filters.search = params.search;
    }

    const [usersData, total] = await Promise.all([
      userRepository.findAllWithFilters(filters),
      userRepository.countWithFilters(filters),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users: usersData.map(({ password_hash, ...u }) => u),
      total,
      page,
      totalPages,
    };
  }

  async updateUserRole(
    adminUserId: string,
    targetUserId: string,
    newRole: UserRole
  ): Promise<Omit<User, 'password_hash'>> {
    if (adminUserId === targetUserId) {
      throw AppError.forbidden('You cannot change your own role');
    }

    const target = await userRepository.findById(targetUserId);
    if (!target) throw AppError.notFound('User not found');

    const updated = await userRepository.updateRole(targetUserId, newRole);
    if (!updated) throw AppError.internal('Failed to update user role');

    const { password_hash, ...user } = updated;
    return user;
  }

  async toggleUserStatus(
    adminUserId: string,
    targetUserId: string,
    isActive: boolean
  ): Promise<Omit<User, 'password_hash'>> {
    if (adminUserId === targetUserId) {
      throw AppError.forbidden('You cannot change your own status');
    }

    const target = await userRepository.findById(targetUserId);
    if (!target) throw AppError.notFound('User not found');

    const updated = await userRepository.updateStatus(targetUserId, isActive);
    if (!updated) throw AppError.internal('Failed to update user status');

    const { password_hash, ...user } = updated;
    return user;
  }

  async bulkUpdateStatus(
    adminUserId: string,
    targetUserIds: string[],
    isActive: boolean
  ): Promise<{ updatedCount: number }> {
    const validIds = targetUserIds.filter((id) => id !== adminUserId);
    if (validIds.length === 0) {
      return { updatedCount: 0 };
    }
    const updatedCount = await userRepository.bulkUpdateStatus(validIds, isActive);
    return { updatedCount };
  }

  async bulkUpdateRole(
    adminUserId: string,
    targetUserIds: string[],
    newRole: UserRole
  ): Promise<{ updatedCount: number }> {
    const validIds = targetUserIds.filter((id) => id !== adminUserId);
    if (validIds.length === 0) {
      return { updatedCount: 0 };
    }
    const updatedCount = await userRepository.bulkUpdateRole(validIds, newRole);
    return { updatedCount };
  }

  async updateUserClientType(
    _adminUserId: string,
    targetUserId: string,
    newClientType: string
  ): Promise<Omit<User, 'password_hash'>> {
    const target = await userRepository.findById(targetUserId);
    if (!target) throw AppError.notFound('User not found');

    const updated = await userRepository.updateClientType(targetUserId, newClientType);
    if (!updated) throw AppError.internal('Failed to update user client type');

    const { password_hash, ...user } = updated;
    return user;
  }

  async bulkUpdateClientType(
    _adminUserId: string,
    targetUserIds: string[],
    newClientType: string
  ): Promise<{ updatedCount: number }> {
    if (targetUserIds.length === 0) {
      return { updatedCount: 0 };
    }
    const updatedCount = await userRepository.bulkUpdateClientType(targetUserIds, newClientType);
    return { updatedCount };
  }



  async getUserStats(): Promise<UserStats> {
    const [byRole, byStatus] = await Promise.all([
      userRepository.countByRole(),
      userRepository.countByStatus(),
    ]);

    const total = Object.values(byRole).reduce((sum, count) => sum + count, 0);

    return {
      total,
      byRole,
      active: byStatus.active,
      inactive: byStatus.inactive,
    };
  }
}

export const userService = new UserService();
