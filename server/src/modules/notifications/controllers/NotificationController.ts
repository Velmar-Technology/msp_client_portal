import { Request, Response } from 'express';
import { NotFoundError } from '@shared/errors';
import { notificationService } from '@modules/notifications/services/NotificationService';

/**
 * Controller handling HTTP requests for user in-app notification retrieval, read markers, and live SSE streaming.
 */
export class NotificationController {
  /**
   * Handles querying all in-app notifications and unread count for the authenticated user.
   *
   * @param req - Express request
   * @param res - Express response returning notifications and unreadCount
   */
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

  /**
   * Handles marking a single notification as read.
   *
   * @param req - Express request with notification ID in params
   * @param res - Express response returning updated notification
   * @throws {NotFoundError} When notification is not found or unauthorized
   */
  async markAsRead(req: Request, res: Response): Promise<void> {
    const notification = await notificationService.markAsRead(req.params.id as string, req.user!.userId);
    if (!notification) {
      throw new NotFoundError('Notification not found or unauthorized');
    }
    res.json({ success: true, data: notification });
  }

  /**
   * Handles marking all notifications for the authenticated user as read.
   *
   * @param req - Express request
   * @param res - Express response returning count of marked notifications
   */
  async markAllAsRead(req: Request, res: Response): Promise<void> {
    const count = await notificationService.markAllAsRead(req.user!.userId);
    res.json({ success: true, data: { count } });
  }

  /**
   * Handles clearing/deleting all in-app notifications for the authenticated user.
   *
   * @param req - Express request
   * @param res - Express response returning count of cleared notifications
   */
  async clearAll(req: Request, res: Response): Promise<void> {
    const count = await notificationService.clearAllForUser(req.user!.userId);
    res.json({ success: true, data: { count } });
  }

  /**
   * Handles establishing a persistent Server-Sent Events (SSE) stream for live updates.
   *
   * @param req - Express request
   * @param res - Express response holding the SSE stream
   */
  async stream(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    notificationService.registerSSEClient(userId, res);
  }
}

export const notificationController = new NotificationController();
