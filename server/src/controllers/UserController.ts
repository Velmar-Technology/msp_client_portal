import { Request, Response } from 'express';
import { userService } from '../services/UserService';
import { UpdateProfileInput } from '../dtos/user.dto';

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

  async getTechnicians(req: Request, res: Response): Promise<void> {
    const technicians = await userService.getTechnicians();
    res.json({ success: true, data: technicians });
  }
}

export const userController = new UserController();
