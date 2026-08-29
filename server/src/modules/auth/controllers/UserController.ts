import { Request, Response } from 'express';
import { InvalidFileTypeError } from '@shared/errors';
import { userService } from '@modules/auth/services/UserService';
import {
  UpdateProfileInput,
  ChangePasswordInput,
  UpdateUserRoleInput,
  UpdateUserStatusInput,
  BulkUpdateUserStatusInput,
  BulkUpdateUserRoleInput,
  UpdateUserClientTypeInput,
  BulkUpdateUserClientTypeInput,
  BulkDeleteUsersInput,
} from '@shared/dtos/user.dto';
import { UserRole } from '@shared/types';

/**
 * Controller handling user profile management, avatar uploads,
 * directory queries, and administrative user moderation endpoints.
 */
export class UserController {
  /**
   * Retrieves the authenticated user's profile.
   *
   * @param req - Express request with authenticated UserContext
   * @param res - Express response returning sanitized user profile
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    const profile = await userService.getProfile(req.user!.userId);
    res.json({ success: true, data: profile });
  }

  /**
   * Updates the authenticated user's profile details.
   *
   * @param req - Express request containing UpdateProfileInput body
   * @param res - Express response returning updated profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdateProfileInput;
    const profile = await userService.updateProfile(req.user!.userId, data);
    res.json({ success: true, data: profile });
  }

  /**
   * Updates the authenticated user's account password.
   *
   * @param req - Express request containing ChangePasswordInput body
   * @param res - Express response confirming password update
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    const data = req.body as ChangePasswordInput;
    await userService.changePassword(req.user!.userId, data);
    res.json({ success: true, message: 'Password updated successfully' });
  }

  /**
   * Retrieves all active technician accounts.
   *
   * @param _req - Express request
   * @param res - Express response returning list of technicians
   */
  async getTechnicians(_req: Request, res: Response): Promise<void> {
    const technicians = await userService.getTechnicians();
    res.json({ success: true, data: technicians });
  }

  /**
   * Handles user profile avatar image upload and stores the relative asset URL.
   *
   * @param req - Express request with uploaded file via upload middleware
   * @param res - Express response returning updated avatar URL
   * @throws {InvalidFileTypeError} When no file is attached to the request
   */
  async uploadAvatar(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new InvalidFileTypeError('No file uploaded');
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    await userService.updateProfile(req.user!.userId, { avatar_url: avatarUrl });
    res.json({ success: true, data: { avatarUrl } });
  }

  /**
   * Retrieves all active client users.
   *
   * @param _req - Express request
   * @param res - Express response returning list of clients
   */
  async getClients(_req: Request, res: Response): Promise<void> {
    const clients = await userService.getClients();
    res.json({ success: true, data: clients });
  }

  // ---- Admin User Management ----

  /**
   * Retrieves a paginated list of users for administration (Admin only).
   *
   * @param req - Express request with query parameters (page, limit, role, isActive, search, sortBy, sortOrder)
   * @param res - Express response returning paginated users list and metadata
   */
  async getAllUsers(req: Request, res: Response): Promise<void> {
    const { page, limit, role, isActive, search, sortBy, sortOrder } = req.query;
    const result = await userService.getAllUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      role: role as string | undefined,
      isActive: isActive as string | undefined,
      search: search as string | undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as string | undefined,
    });
    res.json({ success: true, data: result });
  }

  /**
   * Retrieves aggregated platform user counts and role metrics (Admin only).
   *
   * @param _req - Express request
   * @param res - Express response returning user statistics
   */
  async getStats(_req: Request, res: Response): Promise<void> {
    const stats = await userService.getUserStats();
    res.json({ success: true, data: stats });
  }

  /**
   * Updates the role of a target user (Admin only).
   *
   * @param req - Express request with target user ID in params and UpdateUserRoleInput body
   * @param res - Express response returning modified user profile
   */
  async updateRole(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const data = req.body as UpdateUserRoleInput;
    const user = await userService.updateUserRole(
      req.user!.userId,
      id,
      data.role as UserRole
    );
    res.json({ success: true, data: user });
  }

  /**
   * Toggles the active status of a user (Admin only).
   *
   * @param req - Express request with target user ID in params and UpdateUserStatusInput body
   * @param res - Express response returning modified user profile
   */
  async toggleStatus(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const data = req.body as UpdateUserStatusInput;
    const user = await userService.toggleUserStatus(
      req.user!.userId,
      id,
      data.is_active
    );
    res.json({ success: true, data: user });
  }

  /**
   * Bulk updates active status for an array of users (Admin only).
   *
   * @param req - Express request containing BulkUpdateUserStatusInput body
   * @param res - Express response returning number of updated records
   */
  async bulkToggleStatus(req: Request, res: Response): Promise<void> {
    const data = req.body as BulkUpdateUserStatusInput;
    const result = await userService.bulkUpdateStatus(
      req.user!.userId,
      data.userIds,
      data.is_active
    );
    res.json({ success: true, data: result });
  }

  /**
   * Bulk updates system role for an array of users (Admin only).
   *
   * @param req - Express request containing BulkUpdateUserRoleInput body
   * @param res - Express response returning number of updated records
   */
  async bulkUpdateRole(req: Request, res: Response): Promise<void> {
    const data = req.body as BulkUpdateUserRoleInput;
    const result = await userService.bulkUpdateRole(
      req.user!.userId,
      data.userIds,
      data.role as UserRole
    );
    res.json({ success: true, data: result });
  }

  /**
   * Updates the client type classification of a user (Admin only).
   *
   * @param req - Express request with target user ID in params and UpdateUserClientTypeInput body
   * @param res - Express response returning updated user profile
   */
  async updateClientType(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    const data = req.body as UpdateUserClientTypeInput;
    const user = await userService.updateUserClientType(
      req.user!.userId,
      id,
      data.clientType
    );
    res.json({ success: true, data: user });
  }

  /**
   * Bulk updates client type classification for an array of users (Admin only).
   *
   * @param req - Express request containing BulkUpdateUserClientTypeInput body
   * @param res - Express response returning number of updated records
   */
  async bulkUpdateClientType(req: Request, res: Response): Promise<void> {
    const data = req.body as BulkUpdateUserClientTypeInput;
    const result = await userService.bulkUpdateClientType(
      req.user!.userId,
      data.userIds,
      data.clientType
    );
    res.json({ success: true, data: result });
  }

  /**
   * Deletes a user account (Admin only).
   *
   * @param req - Express request with target user ID in params
   * @param res - Express response confirming deletion
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    await userService.deleteUser(req.user!.userId, id);
    res.json({ success: true, message: 'User deleted successfully' });
  }

  /**
   * Bulk deletes multiple user accounts (Admin only).
   *
   * @param req - Express request containing BulkDeleteUsersInput body
   * @param res - Express response returning count of deleted records
   */
  async bulkDelete(req: Request, res: Response): Promise<void> {
    const data = req.body as BulkDeleteUsersInput;
    const result = await userService.bulkDeleteUsers(
      req.user!.userId,
      data.userIds
    );
    res.json({ success: true, data: result });
  }
}

export const userController = new UserController();
