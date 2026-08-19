import { Request, Response } from 'express';
import { ValidationError } from '@shared/errors';
import { notificationPreferenceService } from '@modules/notifications/services/NotificationPreferenceService';

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
      throw new ValidationError('Invalid preferences payload. Expected an object mapping event types to channel toggles.');
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
