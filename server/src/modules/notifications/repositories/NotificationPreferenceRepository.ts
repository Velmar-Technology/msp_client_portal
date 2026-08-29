import { BaseRepository } from '@shared/repositories/BaseRepository';
import { NotificationPreference, NotificationPreferencesMap } from '@shared/types';
import { db, notificationPreferences } from '@shared/db';
import { eq } from 'drizzle-orm';

/**
 * Default preferences used when a user has no saved preference row.
 * All channels enabled except WhatsApp (requires explicit opt-in).
 */
export const DEFAULT_PREFERENCES: NotificationPreferencesMap = {
  TICKET_CREATED:        { in_app: true, email: true, whatsapp: false },
  TICKET_ASSIGNED:       { in_app: true, email: true, whatsapp: false },
  TICKET_STATUS_CHANGED: { in_app: true, email: true, whatsapp: true },
  TICKET_CANCELLED:      { in_app: true, email: true, whatsapp: false },
  NEW_REPLY:             { in_app: true, email: true, whatsapp: false },
  SUBSCRIPTION_EXPIRING_SOON: { in_app: true, email: true, whatsapp: false },
};

/**
 * Data repository managing user notification channel preference overrides and default configurations.
 */
export class NotificationPreferenceRepository extends BaseRepository<NotificationPreference> {
  /**
   * Initializes NotificationPreferenceRepository for the notification_preferences database table.
   */
  constructor() {
    super(notificationPreferences, 'notification_preferences');
  }

  /**
   * Finds a user's notification preferences database row.
   *
   * @param userId - User UUID
   * @returns NotificationPreference entity or null
   */
  async findByUserId(userId: string): Promise<NotificationPreference | null> {
    const results = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.user_id, userId));
    return (results[0] as unknown as NotificationPreference) || null;
  }

  /**
   * Inserts or updates (upserts) user notification preferences.
   *
   * @param userId - User UUID
   * @param tenantId - Tenant UUID
   * @param preferences - NotificationPreferencesMap object
   * @returns Created or updated NotificationPreference entity
   */
  async upsert(
    userId: string,
    tenantId: string,
    preferences: NotificationPreferencesMap
  ): Promise<NotificationPreference> {
    const results = await db
      .insert(notificationPreferences)
      .values({
        user_id: userId,
        tenant_id: tenantId,
        preferences,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.user_id,
        set: {
          preferences,
          updated_at: new Date(),
        },
      })
      .returning();
    return results[0] as unknown as NotificationPreference;
  }

  /**
   * Returns the user's effective preferences merged with global defaults.
   *
   * @param userId - User UUID
   * @returns Effective NotificationPreferencesMap
   */
  async getEffectivePreferences(userId: string): Promise<NotificationPreferencesMap> {
    const row = await this.findByUserId(userId);
    if (!row) return { ...DEFAULT_PREFERENCES };
    // Merge with defaults to handle any newly added event types
    return { ...DEFAULT_PREFERENCES, ...row.preferences };
  }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository();
