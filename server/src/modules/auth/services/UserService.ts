import { userRepository, UserRepository, type UserListFilters } from '../repositories/UserRepository';
import { apiKeyRepository, ApiKeyRepository } from '../repositories/ApiKeyRepository';
import { NotFoundError, ConflictError, UnauthorizedError, ForbiddenError, InternalServerError } from '@shared/errors';
import { User, UserRole, JwtPayload, ApiKeySummary, GeneratedApiKey, ApiKeyExpiry } from '@shared/types';
import { UpdateProfileInput, ChangePasswordInput } from '@shared/dtos/user.dto';
import { hashPassword, comparePassword } from '@shared/utils/passwordUtils';
import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { env } from '@shared/config/env';

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

/**
 * Domain service managing user profiles, password changes, technician/client directories,
 * and administrative user lifecycle operations.
 */
export class UserService {
  /**
   * Initializes UserService with UserRepository and ApiKeyRepository dependencies.
   *
   * @param userRepo - Data repository for user operations
   * @param apiKeyRepo - Data repository for persisted API keys
   */
  constructor(
    private userRepo: UserRepository = userRepository,
    private apiKeyRepo: ApiKeyRepository = apiKeyRepository
  ) {}

  /**
   * Retrieves the sanitized profile of a user by ID.
   *
   * @param userId - Unique user identifier
   * @returns Sanitized user profile without password hash
   * @throws {NotFoundError} When user does not exist
   */
  async getProfile(userId: string): Promise<Omit<User, 'password_hash'>> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return sanitizeUser(user);
  }

  /**
   * Updates an existing user's profile details with conflict checking for email addresses.
   *
   * @param userId - Unique user identifier
   * @param data - Updated profile attributes
   * @returns Sanitized updated user entity
   * @throws {ConflictError} When requested email address is already claimed by another user
   * @throws {InternalServerError} When database update fails
   */
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

  /**
   * Changes the current user's password after verifying existing credentials.
   *
   * @param userId - Unique user identifier
   * @param data - Current and new password payload
   * @returns Resolves when password update succeeds
   * @throws {NotFoundError} When user does not exist
   * @throws {UnauthorizedError} When current password verification fails
   */
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

  /**
   * Retrieves all active technician users in the platform.
   *
   * @returns List of sanitized technician user profiles
   */
  async getTechnicians(): Promise<Omit<User, 'password_hash'>[]> {
    const techs = await this.userRepo.findByRole(UserRole.TECHNICIAN);
    return techs.map(sanitizeUser);
  }

  /**
   * Retrieves all active client users across tenants.
   *
   * @returns List of sanitized client user profiles
   */
  async getClients(): Promise<Omit<User, 'password_hash'>[]> {
    const clients = await this.userRepo.findAllClients();
    return clients.map(sanitizeUser);
  }

  // ---- Admin User Management ----

  /**
   * Retrieves a paginated list of users with multi-column filtering and sorting.
   *
   * @param params - Pagination, search, role, status, and sorting parameters
   * @returns Paginated result object with list of users, total count, and page metadata
   */
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

  /**
   * Updates the role of a target user account (Admin only). Prevents self-demotion.
   *
   * @param adminUserId - Authenticated admin ID initiating the request
   * @param targetUserId - ID of user whose role is being changed
   * @param newRole - Target UserRole value
   * @returns Updated sanitized user entity
   * @throws {ForbiddenError} When admin attempts to modify their own role
   * @throws {NotFoundError} When target user is not found
   * @throws {InternalServerError} When database update fails
   */
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

  /**
   * Activates or disables a user account. Prevents admin self-deactivation.
   *
   * @param adminUserId - Authenticated admin ID initiating the request
   * @param targetUserId - ID of user being updated
   * @param isActive - New active status
   * @returns Updated sanitized user entity
   * @throws {ForbiddenError} When admin attempts to deactivate their own account
   * @throws {NotFoundError} When target user is not found
   * @throws {InternalServerError} When database update fails
   */
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

  /**
   * Updates the active status of multiple users simultaneously, skipping self-updates.
   *
   * @param adminUserId - Authenticated admin ID
   * @param targetUserIds - Array of target user IDs
   * @param isActive - New active status
   * @returns Object containing count of updated users
   */
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

  /**
   * Updates the system role for multiple users in bulk, skipping self-updates.
   *
   * @param adminUserId - Authenticated admin ID
   * @param targetUserIds - Array of target user IDs
   * @param newRole - New target UserRole
   * @returns Object containing count of updated users
   */
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

  /**
   * Updates the client type classification for a user.
   *
   * @param _adminUserId - Authenticated admin ID
   * @param targetUserId - ID of user being updated
   * @param newClientType - New client type string
   * @returns Updated sanitized user entity
   * @throws {NotFoundError} When target user is not found
   * @throws {InternalServerError} When database update fails
   */
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

  /**
   * Updates the client type classification for multiple users in bulk.
   *
   * @param _adminUserId - Authenticated admin ID
   * @param targetUserIds - Array of target user IDs
   * @param newClientType - New client type string
   * @returns Object containing count of updated users
   */
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

  /**
   * Deletes a user account. Prevents admin self-deletion.
   *
   * @param adminUserId - Authenticated admin ID
   * @param targetUserId - ID of user to delete
   * @returns Resolves when deletion is complete
   * @throws {ForbiddenError} When admin attempts to delete own account
   * @throws {NotFoundError} When target user is not found
   */
  async deleteUser(adminUserId: string, targetUserId: string): Promise<void> {
    if (adminUserId === targetUserId) {
      throw new ForbiddenError('You cannot delete your own account');
    }

    const target = await this.userRepo.findById(targetUserId);
    if (!target) throw new NotFoundError('User not found');

    await this.userRepo.deleteById(targetUserId);
  }

  /**
   * Deletes multiple user accounts in bulk, filtering out the admin's own ID.
   *
   * @param adminUserId - Authenticated admin ID
   * @param targetUserIds - Array of target user IDs
   * @returns Object containing count of deleted users
   */
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

  /**
   * Aggregates platform-wide user statistics including total users, role breakdown, and active counts.
   *
   * @returns Platform user metrics summary
   */
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

  /**
   * Generates an API key (JWT token) for the authenticated user, persists a hashed record,
   * and returns the plaintext key exactly once for secure display at creation time.
   * Keys default to 30 days, but a non-expiring ("forever") token can be requested.
   *
   * @param userId - Unique user identifier
   * @param options - Key configuration: optional name, description, and expiration policy
   * @returns Generated API key metadata including the one-time plaintext token
   * @throws {NotFoundError} When user does not exist
   * @throws {InternalServerError} When token generation fails
   */
  async generateApiKey(
    userId: string,
    options?: { name?: string; description?: string | null; expiresIn?: ApiKeyExpiry }
  ): Promise<GeneratedApiKey> {
    const user = await this.userRepo.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    // Prepare JWT payload with user information
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    };

    const expiresIn: ApiKeyExpiry = options?.expiresIn ?? '30d';
    // Standard keys expire after 30 days; "forever" keys carry no exp claim and never expire
    const token =
      expiresIn === 'forever'
        ? jwt.sign(payload, env.JWT_SECRET)
        : jwt.sign(payload, env.JWT_SECRET, { expiresIn: '30d' });

    // Persist only a SHA-256 digest so the plaintext key is never stored or recoverable
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const keyName = options?.name?.trim() || 'Default Key';
    const keyDescription = options?.description?.trim() || null;

    const created = await this.apiKeyRepo.create({
      userId: user.id,
      tenantId: user.tenant_id,
      name: keyName,
      description: keyDescription,
      expiresIn,
      tokenHash,
    });

    return {
      id: created.id,
      name: created.name,
      description: created.description,
      expiresIn: created.expires_in,
      fullKey: token,
      createdAt: created.created_at,
      lastUsedAt: created.last_used_at,
    };
  }

  /**
   * Lists API key metadata (never plaintext tokens) owned by a user, newest first.
   *
   * @param userId - Unique user identifier
   * @returns Array of API key summaries without underlying secrets
   */
  async listApiKeys(userId: string): Promise<ApiKeySummary[]> {
    const keys = await this.apiKeyRepo.findByUserId(userId);
    return keys.map((key) => ({
      id: key.id,
      name: key.name,
      description: key.description,
      expiresIn: key.expires_in,
      createdAt: key.created_at,
      lastUsedAt: key.last_used_at,
    }));
  }

  /**
   * Deletes an API key only when it is owned by the requesting user.
   *
   * @param userId - Unique user identifier
   * @param keyId - API key identifier to remove
   * @throws {NotFoundError} When the key does not exist or is not owned by the user
   */
  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    const existing = await this.apiKeyRepo.findByIdAndUser(keyId, userId);
    if (!existing) throw new NotFoundError('API key not found');

    await this.apiKeyRepo.deleteById(keyId, userId);
  }
}

export const userService = new UserService();
