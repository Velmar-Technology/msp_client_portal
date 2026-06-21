import { Request, Response } from 'express';
import { userService } from '../services/UserService';
import { UpdateProfileInput, ChangePasswordInput } from '../dtos/user.dto';

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
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const avatarUrl = `/uploads/${req.file.filename}`;
    await userService.updateProfile(req.user!.userId, { avatar_url: avatarUrl });
    res.json({ success: true, data: { avatarUrl } });
  }
}

export const userController = new UserController();
