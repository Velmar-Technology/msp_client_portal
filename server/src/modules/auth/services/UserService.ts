import { userRepository, UserRepository } from '@modules/auth';
import type { UserListFilters } from '@modules/auth/repositories/UserRepository';
import { NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, InternalServerError } from '@shared/errors';
import { User, UserRole } from '@shared/types';
import { UpdateProfileInput, ChangePasswordInput } from '@shared/dtos/user.dto';
import { hashPassword, comparePassword } from '@shared/utils/passwordUtils';

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

function sanitizeUser(user: User): Omit<User, 'password_hash'> {
  const sanitized = { ...user };
  delete (sanitized as Partial<User>).password_hash;
  return sanitized;
}

export class UserService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async getProfile(userId: string): Promise<Omit<User, 'password_hash'>> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return sanitizeUser(user);
  }

  async updateProfile(userId: string, data: UpdateProfileInput): Promise<Omit<User, 'password_hash'>> {
    if (data.email) {
      const existing = await this.userRepo.findByEmail(data.email);
      if (existing && existing.id !== userId) {
        throw new ConflictError('Email already in use');
      }
    }

    const updated = await this.userRepo.updateProfile(userId, data);
    if (!updated) throw new InternalServerError('Failed to update profile');
    return sanitizeUser(updated);
  }

  async changePassword(userId: string, data: ChangePasswordInput): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    const isValid = await comparePassword(data.currentPassword, user.password_hash);
    if (!isValid) {
      throw new UnauthorizedError('Invalid current password');
    }

    const hashed = await hashPassword(data.newPassword);
    await this.userRepo.updatePassword(userId, hashed);
  }

  async getTechnicians(): Promise<Omit<User, 'password_hash'>[]> {
    const techs = await this.userRepo.findByRole(UserRole.TECHNICIAN);
    return techs.map(sanitizeUser);
  }

  async getClients(): Promise<Omit<User, 'password_hash'>[]> {
    const clients = await this.userRepo.findAllClients();
    return clients.map(sanitizeUser);
  }

  // ---- Admin User Management ----

  async getAllUsers(params: {
    page?: number;
    limit?: number;
    role?: string;
    isActive?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<UserListResponse> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const offset = (page - 1) * limit;

    const ALLOWED_SORT_COLUMNS = ['name', 'role', 'client_type', 'is_active', 'created_at'];

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
    if (params.sortBy && ALLOWED_SORT_COLUMNS.includes(params.sortBy)) {
      filters.sortBy = params.sortBy;
    }
    if (params.sortOrder === 'asc' || params.sortOrder === 'desc') {
      filters.sortOrder = params.sortOrder;
    }

    const [usersData, total] = await Promise.all([
      this.userRepo.findAllWithFilters(filters),
      this.userRepo.countWithFilters(filters),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      users: usersData.map(sanitizeUser),
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
      throw new ForbiddenError('You cannot change your own role');
    }

    const target = await this.userRepo.findById(targetUserId);
    if (!target) throw new NotFoundError('User not found');

    const updated = await this.userRepo.updateRole(targetUserId, newRole);
    if (!updated) throw new InternalServerError('Failed to update user role');

    return sanitizeUser(updated);
  }

  async toggleUserStatus(
    adminUserId: string,
    targetUserId: string,
    isActive: boolean
  ): Promise<Omit<User, 'password_hash'>> {
    if (adminUserId === targetUserId) {
      throw new ForbiddenError('You cannot change your own status');
    }

    const target = await this.userRepo.findById(targetUserId);
    if (!target) throw new NotFoundError('User not found');

    const updated = await this.userRepo.updateStatus(targetUserId, isActive);
    if (!updated) throw new InternalServerError('Failed to update user status');

    return sanitizeUser(updated);
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
    const updatedCount = await this.userRepo.bulkUpdateStatus(validIds, isActive);
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
    const updatedCount = await this.userRepo.bulkUpdateRole(validIds, newRole);
    return { updatedCount };
  }

  async updateUserClientType(
    _adminUserId: string,
    targetUserId: string,
    newClientType: string
  ): Promise<Omit<User, 'password_hash'>> {
    const target = await this.userRepo.findById(targetUserId);
    if (!target) throw new NotFoundError('User not found');

    const updated = await this.userRepo.updateClientType(targetUserId, newClientType);
    if (!updated) throw new InternalServerError('Failed to update user client type');

    return sanitizeUser(updated);
  }

  async bulkUpdateClientType(
    _adminUserId: string,
    targetUserIds: string[],
    newClientType: string
  ): Promise<{ updatedCount: number }> {
    if (targetUserIds.length === 0) {
      return { updatedCount: 0 };
    }
    const updatedCount = await this.userRepo.bulkUpdateClientType(targetUserIds, newClientType);
    return { updatedCount };
  }

  async deleteUser(adminUserId: string, targetUserId: string): Promise<void> {
    if (adminUserId === targetUserId) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    const target = await this.userRepo.findById(targetUserId);
    if (!target) throw new NotFoundError('User not found');

    await this.userRepo.deleteById(targetUserId);
  }

  async bulkDeleteUsers(
    adminUserId: string,
    targetUserIds: string[]
  ): Promise<{ deletedCount: number }> {
    const validIds = targetUserIds.filter((id) => id !== adminUserId);
    if (validIds.length === 0) {
      return { deletedCount: 0 };
    }
    const deletedCount = await this.userRepo.bulkDelete(validIds);
    return { deletedCount };
  }



  async getUserStats(): Promise<UserStats> {
    const [byRole, byStatus] = await Promise.all([
      this.userRepo.countByRole(),
      this.userRepo.countByStatus(),
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
