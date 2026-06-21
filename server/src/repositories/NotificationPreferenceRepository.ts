import { BaseRepository } from './BaseRepository';
import { NotificationPreference, NotificationPreferencesMap } from '../types';
import { db, notificationPreferences } from '../db';
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
};

export class NotificationPreferenceRepository extends BaseRepository<NotificationPreference> {
  constructor() {
    super(notificationPreferences, 'notification_preferences');
  }

  /**
   * Find a user's notification preferences row.
   */
  async findByUserId(userId: string): Promise<NotificationPreference | null> {
    const results = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.user_id, userId));
    return (results[0] as unknown as NotificationPreference) || null;
  }

  /**
   * Insert or update (upsert) user preferences.
   * Uses the unique constraint on user_id for conflict resolution.
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
   * Returns the user's effective preferences (saved or defaults).
   */
  async getEffectivePreferences(userId: string): Promise<NotificationPreferencesMap> {
    const row = await this.findByUserId(userId);
    if (!row) return { ...DEFAULT_PREFERENCES };
    // Merge with defaults to handle any newly added event types
    return { ...DEFAULT_PREFERENCES, ...row.preferences };
  }
}

export const notificationPreferenceRepository = new NotificationPreferenceRepository();
