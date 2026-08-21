import { BaseRepository } from '@shared/repositories/BaseRepository';
import { leadActivities } from '@shared/db/schema';
import { LeadActivity } from '@shared/types';
import { CreateLeadActivityInput, UpdateLeadActivityInput } from '@shared/dtos/crm.dto';
import { db, pool } from '@shared/db';
import { eq, and } from 'drizzle-orm';
import { validate as isUuid } from 'uuid';

export class LeadActivityRepository extends BaseRepository<LeadActivity> {
  constructor() {
    super(leadActivities, 'lead_activities');
  }

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

  async createActivity(data: CreateLeadActivityInput, tenantId: string, userId?: string): Promise<LeadActivity> {
    const result = await db
      .insert(leadActivities)
      .values({
        lead_id: data.leadId,
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

  async updateActivity(id: string, data: UpdateLeadActivityInput, tenantId: string): Promise<LeadActivity | null> {
    if (!id || !isUuid(id)) return null;

    const valuesToUpdate: Record<string, unknown> = {};
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
