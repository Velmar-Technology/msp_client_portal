import { Request, Response } from 'express';
import { notificationPreferenceService } from '../services/NotificationPreferenceService';

export class NotificationPreferenceController {
  /**
   * GET /api/v1/notification-preferences
   * Returns the current user's notification preferences.
   */
  async getPreferences(req: Request, res: Response): Promise<void> {
    const preferences = await notificationPreferenceService.getPreferences(req.user!.userId);
    res.json({
      success: true,
      data: { preferences },
    });
  }

  /**
   * PUT /api/v1/notification-preferences
   * Updates the current user's notification preferences.
   */
  async updatePreferences(req: Request, res: Response): Promise<void> {
    const { preferences } = req.body;

    if (!preferences || typeof preferences !== 'object') {
      res.status(400).json({
        success: false,
        message: 'Invalid preferences payload. Expected an object mapping event types to channel toggles.',
      });
      return;
    }

    const updated = await notificationPreferenceService.updatePreferences(
      req.user!.userId,
      req.user!.tenantId,
      preferences
    );

    res.json({
      success: true,
      data: { preferences: updated.preferences },
    });
  }
}

export const notificationPreferenceController = new NotificationPreferenceController();
