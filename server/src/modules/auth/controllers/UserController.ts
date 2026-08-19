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

export class UserController {
  async getProfile(req: Request, res: Response): Promise<void> {
    const profile = await userService.getProfile(req.user!.userId);
    res.json({ success: true, data: profile });
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    const data = req.body as UpdateProfileInput;
    const profile = await userService.updateProfile(req.user!.userId, data);
    res.json({ success: true, data: profile });
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    const data = req.body as ChangePasswordInput;
    await userService.changePassword(req.user!.userId, data);
    res.json({ success: true, message: 'Password updated successfully' });
  }

  async getTechnicians(_req: Request, res: Response): Promise<void> {
    const technicians = await userService.getTechnicians();
    res.json({ success: true, data: technicians });
  }

  async uploadAvatar(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new InvalidFileTypeError('No file uploaded');
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    await userService.updateProfile(req.user!.userId, { avatar_url: avatarUrl });
    res.json({ success: true, data: { avatarUrl } });
  }

  async getClients(_req: Request, res: Response): Promise<void> {
    const clients = await userService.getClients();
    res.json({ success: true, data: clients });
  }

  // ---- Admin User Management ----

  async getAllUsers(req: Request, res: Response): Promise<void> {
    const { page, limit, role, isActive, search } = req.query;
    const result = await userService.getAllUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      role: role as string | undefined,
      isActive: isActive as string | undefined,
      search: search as string | undefined,
    });
    res.json({ success: true, data: result });
  }

  async getStats(_req: Request, res: Response): Promise<void> {
    const stats = await userService.getUserStats();
    res.json({ success: true, data: stats });
  }

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

  async bulkToggleStatus(req: Request, res: Response): Promise<void> {
    const data = req.body as BulkUpdateUserStatusInput;
    const result = await userService.bulkUpdateStatus(
      req.user!.userId,
      data.userIds,
      data.is_active
    );
    res.json({ success: true, data: result });
  }

  async bulkUpdateRole(req: Request, res: Response): Promise<void> {
    const data = req.body as BulkUpdateUserRoleInput;
    const result = await userService.bulkUpdateRole(
      req.user!.userId,
      data.userIds,
      data.role as UserRole
    );
    res.json({ success: true, data: result });
  }

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

  async bulkUpdateClientType(req: Request, res: Response): Promise<void> {
    const data = req.body as BulkUpdateUserClientTypeInput;
    const result = await userService.bulkUpdateClientType(
      req.user!.userId,
      data.userIds,
      data.clientType
    );
    res.json({ success: true, data: result });
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    const id = req.params.id as string;
    await userService.deleteUser(req.user!.userId, id);
    res.json({ success: true, message: 'User deleted successfully' });
  }

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
