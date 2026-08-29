import { BaseRepository } from '@shared/repositories/BaseRepository';
import { Notification } from '@shared/types';
import { db, notifications } from '@shared/db';
import { eq, and, desc, count } from 'drizzle-orm';

/**
 * Data repository managing user in-app notification alerts, unread counters, and bulk read/delete operations.
 */
export class NotificationRepository extends BaseRepository<Notification> {
  /**
   * Initializes NotificationRepository for the notifications database table.
   */
  constructor() {
    super(notifications, 'notifications');
  }

  /**
   * Inserts a new unread in-app notification record.
   *
   * @param data - Notification attributes
   * @returns Created Notification entity
   */
  async create(data: {
    user_id: string;
    title: string;
    message: string;
    link?: string;
    ticket_id?: string;
    type: string;
    metadata?: Record<string, any>;
    tenant_id: string;
  }): Promise<Notification> {
    const results = await db
      .insert(notifications)
      .values({
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        link: data.link || null,
        ticket_id: data.ticket_id || null,
        type: data.type,
        read: false,
        metadata: data.metadata || null,
        tenant_id: data.tenant_id,
      })
      .returning();
    return results[0] as Notification;
  }

  /**
   * Retrieves a paginated list of notifications for a user ordered by creation date descending.
   *
   * @param userId - User UUID
   * @param limit - Maximum records
   * @param offset - Offset index
   * @returns Array of Notification entities
   */
  async findByUser(userId: string, limit = 50, offset = 0): Promise<Notification[]> {
    const results = await db
      .select()
      .from(notifications)
      .where(eq(notifications.user_id, userId))
      .orderBy(desc(notifications.created_at))
      .limit(limit)
      .offset(offset);
    return results as unknown as Notification[];
  }

  /**
   * Retrieves the count of unread notifications for a user.
   *
   * @param userId - User UUID
   * @returns Number of unread notifications
   */
  async getUnreadCount(userId: string): Promise<number> {
    const results = await db
      .select({ val: count() })
      .from(notifications)
      .where(and(eq(notifications.user_id, userId), eq(notifications.read, false)));
    return results[0]?.val ?? 0;
  }

  /**
   * Marks a specific notification as read.
   *
   * @param id - Notification UUID
   * @param userId - User UUID
   * @returns Updated Notification entity or null
   */
  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const results = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.user_id, userId)))
      .returning();
    return (results[0] as unknown as Notification) || null;
  }

  /**
   * Marks all unread notifications for a user as read.
   *
   * @param userId - User UUID
   * @returns Number of updated records
   */
  async markAllAsRead(userId: string): Promise<number> {
    const results = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.user_id, userId), eq(notifications.read, false)))
      .returning();
    return results.length;
  }

  /**
   * Deletes all notifications for a user.
   *
   * @param userId - User UUID
   * @returns Number of deleted records
   */
  async deleteAllForUser(userId: string): Promise<number> {
    const results = await db
      .delete(notifications)
      .where(eq(notifications.user_id, userId))
      .returning();
    return results.length;
  }
}

export const notificationRepository = new NotificationRepository();
