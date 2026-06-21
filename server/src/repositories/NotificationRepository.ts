import { BaseRepository } from './BaseRepository';
import { Notification } from '../types';
import { db, notifications } from '../db';
import { eq, and, desc, count } from 'drizzle-orm';

export class NotificationRepository extends BaseRepository<Notification> {
  constructor() {
    super(notifications, 'notifications');
  }

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

  async getUnreadCount(userId: string): Promise<number> {
    const results = await db
      .select({ val: count() })
      .from(notifications)
      .where(and(eq(notifications.user_id, userId), eq(notifications.read, false)));
    return results[0]?.val ?? 0;
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    const results = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, id), eq(notifications.user_id, userId)))
      .returning();
    return (results[0] as unknown as Notification) || null;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const results = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.user_id, userId), eq(notifications.read, false)))
      .returning();
    return results.length;
  }

  async deleteAllForUser(userId: string): Promise<number> {
    const results = await db
      .delete(notifications)
      .where(eq(notifications.user_id, userId))
      .returning();
    return results.length;
  }
}

export const notificationRepository = new NotificationRepository();
