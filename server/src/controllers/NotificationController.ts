import { Request, Response } from 'express';
import { notificationService } from '../services/NotificationService';

export class NotificationController {
  async getAll(req: Request, res: Response): Promise<void> {
    const notifications = await notificationService.getUserNotifications(req.user!.userId);
    const unreadCount = await notificationService.getUnreadCount(req.user!.userId);
    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    const notification = await notificationService.markAsRead(req.params.id as string, req.user!.userId);
    if (!notification) {
      res.status(404).json({ success: false, message: 'Notification not found or unauthorized' });
      return;
    }
    res.json({ success: true, data: notification });
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    const count = await notificationService.markAllAsRead(req.user!.userId);
    res.json({ success: true, data: { count } });
  }

  async clearAll(req: Request, res: Response): Promise<void> {
    const count = await notificationService.clearAllForUser(req.user!.userId);
    res.json({ success: true, data: { count } });
  }

  async stream(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    notificationService.registerSSEClient(userId, res);
  }
}

export const notificationController = new NotificationController();
