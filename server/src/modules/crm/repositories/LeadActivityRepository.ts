import { BaseRepository } from '@shared/repositories/BaseRepository';
import { leadActivities } from '@shared/db/schema';
import { LeadActivity } from '@shared/types';
import { CreateLeadActivityInput, UpdateLeadActivityInput } from '@shared/dtos/crm.dto';
import { db, pool } from '@shared/db';
import { eq, and } from 'drizzle-orm';
import { isUuid } from '@shared/utils/validation';

/**
 * Data repository managing CRM timeline events, tasks, calls, reminders, and stage transitions.
 */
export class LeadActivityRepository extends BaseRepository<LeadActivity> {
  /**
   * Initializes LeadActivityRepository for the lead_activities database table.
   */
  constructor() {
    super(leadActivities, 'lead_activities');
  }

  /**
   * Helper mapping database row into standardized LeadActivity entity.
   *
   * @param row - Raw Postgres row
   * @returns Formatted LeadActivity entity
   */
  private mapActivityRow(row: Record<string, unknown>): LeadActivity {
    return {
      id: row.id as string,
      lead_id: row.lead_id as string,
      tenant_id: row.tenant_id as string,
      user_id: (row.user_id as string) ?? null,
      user_name: (row.user_name as string) ?? null,
      activity_type: row.activity_type as LeadActivity['activity_type'],
      title: row.title as string,
      summary: (row.summary as string) ?? null,
      due_date: row.due_date ? new Date(row.due_date as string) : null,
      completed_at: row.completed_at ? new Date(row.completed_at as string) : null,
      status: row.status as LeadActivity['status'],
      created_at: new Date(row.created_at as string),
      lead_contact_name: (row.lead_contact_name as string) ?? null,
      lead_company_name: (row.lead_company_name as string) ?? null,
    };
  }

  /**
   * Retrieves all chronological activity events logged for a specific lead.
   *
   * @param leadId - Lead UUID
   * @param tenantId - Tenant UUID
   * @returns Array of LeadActivity entities
   */
  async findByLead(leadId: string, tenantId: string): Promise<LeadActivity[]> {
    if (!leadId || !isUuid(leadId)) return [];

    const sqlQuery = `
      SELECT
        la.*,
        u.name as user_name
      FROM lead_activities la
      LEFT JOIN users u ON la.user_id = u.id
      WHERE la.lead_id = $1 AND la.tenant_id = $2
      ORDER BY la.created_at DESC
    `;

    const res = await pool.query(sqlQuery, [leadId, tenantId]);
    return res.rows.map((row) => this.mapActivityRow(row));
  }

  /**
   * Creates and inserts a new activity log entry or scheduled task.
   *
   * @param data - CreateLeadActivityInput parameters
   * @param tenantId - Tenant UUID
   * @param userId - Optional creator user UUID
   * @returns Created LeadActivity entity
   */
  async createActivity(data: CreateLeadActivityInput, tenantId: string, userId?: string): Promise<LeadActivity> {
    const result = await db
      .insert(leadActivities)
      .values({
        lead_id: data.leadId!,
        tenant_id: tenantId,
        user_id: userId || null,
        activity_type: data.activityType,
        title: data.title,
        summary: data.summary || null,
        due_date: data.dueDate ? new Date(data.dueDate) : null,
        status: data.status || 'COMPLETED',
        completed_at: data.status === 'COMPLETED' ? new Date() : null,
      })
      .returning();

    const created = result[0];
    return this.mapActivityRow(created);
  }

  /**
   * Retrieves pending tasks and reminder activities due within the next 7 days across the tenant.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of upcoming LeadActivity entities
   */
  async findUpcomingByTenant(tenantId: string): Promise<LeadActivity[]> {
    const sqlQuery = `
      SELECT
        la.*,
        u.name as user_name,
        l.contact_name as lead_contact_name,
        l.company_name as lead_company_name
      FROM lead_activities la
      LEFT JOIN users u ON la.user_id = u.id
      INNER JOIN leads l ON la.lead_id = l.id
      WHERE la.tenant_id = $1
        AND la.status = 'PENDING'
        AND la.due_date IS NOT NULL
        AND la.due_date <= NOW() + INTERVAL '7 days'
      ORDER BY la.due_date ASC
      LIMIT 50
    `;

    const res = await pool.query(sqlQuery, [tenantId]);
    return res.rows.map((row) => this.mapActivityRow(row));
  }

  /**
   * Updates an existing lead activity record.
   *
   * @param id - Activity UUID
   * @param data - Update fields
   * @param tenantId - Tenant UUID
   * @returns Updated LeadActivity entity or null
   */
  async updateActivity(id: string, data: UpdateLeadActivityInput, tenantId: string): Promise<LeadActivity | null> {
    if (!id || !isUuid(id)) return null;

    const valuesToUpdate: Record<string, unknown> = {};
    if (data.title !== undefined) valuesToUpdate.title = data.title;
    if (data.activityType !== undefined) valuesToUpdate.activity_type = data.activityType;
    if (data.dueDate !== undefined) valuesToUpdate.due_date = data.dueDate ? new Date(data.dueDate) : null;
    if (data.status !== undefined) {
      valuesToUpdate.status = data.status;
      if (data.status === 'COMPLETED') {
        valuesToUpdate.completed_at = new Date();
      }
    }
    if (data.summary !== undefined) valuesToUpdate.summary = data.summary;
    if (data.completedAt !== undefined) valuesToUpdate.completed_at = data.completedAt ? new Date(data.completedAt) : null;

    await db
      .update(leadActivities)
      .set(valuesToUpdate)
      .where(and(eq(leadActivities.id, id), eq(leadActivities.tenant_id, tenantId)));

    return this.findActivityById(id, tenantId);
  }

  /**
   * Deletes an activity record by UUID.
   *
   * @param id - Activity UUID
   * @param tenantId - Tenant UUID
   * @returns True if deleted, false otherwise
   */
  async deleteActivity(id: string, tenantId: string): Promise<boolean> {
    if (!id || !isUuid(id)) return false;
    const result = await db
      .delete(leadActivities)
      .where(and(eq(leadActivities.id, id), eq(leadActivities.tenant_id, tenantId)))
      .returning();
    return result.length > 0;
  }

  /**
   * Finds a single activity by UUID joined with user metadata.
   *
   * @param id - Activity UUID
   * @param tenantId - Optional tenant UUID
   * @returns LeadActivity entity or null
   */
  async findActivityById(id: string, tenantId?: string): Promise<LeadActivity | null> {
    if (!id || !isUuid(id)) return null;

    let sqlQuery = `
      SELECT
        la.*,
        u.name as user_name
      FROM lead_activities la
      LEFT JOIN users u ON la.user_id = u.id
      WHERE la.id = $1
    `;
    const params: unknown[] = [id];

    if (tenantId) {
      sqlQuery += ' AND la.tenant_id = $2';
      params.push(tenantId);
    }

    const res = await pool.query(sqlQuery, params);
    if (!res.rows || res.rows.length === 0) return null;
    return this.mapActivityRow(res.rows[0]);
  }
}

export const leadActivityRepository = new LeadActivityRepository();
