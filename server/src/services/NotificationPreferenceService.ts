import {
  NotificationPreferencesMap,
  NotificationEventType,
  NotificationPreference,
} from '../types';
import {
  notificationPreferenceRepository,
  NotificationPreferenceRepository,
  DEFAULT_PREFERENCES,
} from '../repositories/NotificationPreferenceRepository';
import { logger } from '../utils/logger';

/**
 * Events where in_app cannot be disabled.
 * Prevents users from accidentally missing critical operational updates.
 */
const FORCE_IN_APP_EVENTS: NotificationEventType[] = [
  'TICKET_CREATED',
  'TICKET_STATUS_CHANGED',
];

export class NotificationPreferenceService {
  constructor(private preferenceRepo: NotificationPreferenceRepository = notificationPreferenceRepository) {}
  /**
   * Get the user's effective notification preferences.
   * Returns defaults for users who haven't customized yet.
   */
  async getPreferences(userId: string): Promise<NotificationPreferencesMap> {
    return this.preferenceRepo.getEffectivePreferences(userId);
  }

  /**
   * Validate and save updated preferences.
   * Enforces that critical events keep in_app = true.
   */
  async updatePreferences(
    userId: string,
    tenantId: string,
    preferences: NotificationPreferencesMap
  ): Promise<NotificationPreference> {
    // Enforce in_app=true for critical events
    for (const event of FORCE_IN_APP_EVENTS) {
      if (preferences[event]) {
        preferences[event].in_app = true;
      }
    }

    // Fill in missing event types with defaults
    for (const key of Object.keys(DEFAULT_PREFERENCES) as NotificationEventType[]) {
      if (!preferences[key]) {
        preferences[key] = { ...DEFAULT_PREFERENCES[key] };
      }
    }

    logger.info(`Updating notification preferences for user ${userId}`);
    return this.preferenceRepo.upsert(userId, tenantId, preferences);
  }

  /**
   * Quick channel gate — checks if a notification should be dispatched
   * to a given channel for a specific user and event type.
   */
  async shouldNotify(
    userId: string,
    eventType: NotificationEventType,
    channel: 'in_app' | 'email' | 'whatsapp'
  ): Promise<boolean> {
    try {
      const prefs = await this.preferenceRepo.getEffectivePreferences(userId);
      const eventPrefs = prefs[eventType];
      if (!eventPrefs) return true; // Unknown event type → allow (safe default)
      return eventPrefs[channel];
    } catch (error) {
      // On any error, default to allowing the notification (fail-open)
      logger.error('Error checking notification preferences, defaulting to allow', {
        userId,
        eventType,
        channel,
        error,
      });
      return true;
    }
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
