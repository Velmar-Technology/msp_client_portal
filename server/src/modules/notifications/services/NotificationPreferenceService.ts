import {
  NotificationPreferencesMap,
  NotificationEventType,
  NotificationPreference,
} from '@shared/types';
import {
  notificationPreferenceRepository,
  NotificationPreferenceRepository,
  DEFAULT_PREFERENCES,
} from '@modules/notifications/repositories/NotificationPreferenceRepository';
import { logger } from '@shared/utils/logger';

/**
 * Events where in_app cannot be disabled.
 * Prevents users from accidentally missing critical operational updates.
 */
const FORCE_IN_APP_EVENTS: NotificationEventType[] = [
  'TICKET_CREATED',
  'TICKET_STATUS_CHANGED',
];

/**
 * Domain service managing per-user multi-channel notification preferences, default fallbacks, and critical event locks.
 */
export class NotificationPreferenceService {
  /**
   * Initializes NotificationPreferenceService with repository dependency.
   *
   * @param preferenceRepo - Notification preference data repository
   */
  constructor(private preferenceRepo: NotificationPreferenceRepository = notificationPreferenceRepository) {}

  /**
   * Retrieves the user's effective notification preferences, falling back to defaults if unconfigured.
   *
   * @param userId - User UUID
   * @returns NotificationPreferencesMap mapping event types to active channels
   */
  async getPreferences(userId: string): Promise<NotificationPreferencesMap> {
    return this.preferenceRepo.getEffectivePreferences(userId);
  }

  /**
   * Validates and updates notification preferences, enforcing mandatory in-app delivery on critical operational events.
   *
   * @param userId - User UUID
   * @param tenantId - Tenant UUID
   * @param preferences - Updated preferences map
   * @returns Updated NotificationPreference entity
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
   * Evaluates whether a notification should be dispatched to a channel for a specific user and event type.
   *
   * @param userId - User UUID
   * @param eventType - NotificationEventType trigger
   * @param channel - Target channel ('in_app' | 'email' | 'whatsapp')
   * @returns True if channel is enabled or fails open
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
