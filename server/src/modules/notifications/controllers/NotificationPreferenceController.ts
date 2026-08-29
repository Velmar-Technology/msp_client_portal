import { Request, Response } from 'express';
import { ValidationError } from '@shared/errors';
import { notificationPreferenceService } from '@modules/notifications/services/NotificationPreferenceService';

/**
 * Controller handling HTTP requests for user notification preference inspection and updates.
 */
export class NotificationPreferenceController {
  /**
   * Handles querying notification preferences for the authenticated user.
   *
   * @param req - Express request
   * @param res - Express response returning preferences map
   */
  async getPreferences(req: Request, res: Response): Promise<void> {
    const preferences = await notificationPreferenceService.getPreferences(req.user!.userId);
    res.json({
      success: true,
      data: { preferences },
    });
  }

  /**
   * Handles saving updated notification preferences for the authenticated user.
   *
   * @param req - Express request with preferences payload in body
   * @param res - Express response returning updated preferences
   * @throws {ValidationError} When preferences payload is missing or not an object
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
