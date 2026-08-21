import { BaseRepository } from '@shared/repositories/BaseRepository';
import { leads } from '@shared/db/schema';
import { Lead, LeadStage, LeadPriority, CrmPipelineStats } from '@shared/types';
import { CreateLeadInput, UpdateLeadInput, GetLeadsQueryInput } from '@shared/dtos/crm.dto';
import { db, pool } from '@shared/db';
import { eq, and } from 'drizzle-orm';
import { validate as isUuid } from 'uuid';

export class LeadRepository extends BaseRepository<Lead> {
  constructor() {
    super(leads, 'leads');
  }

  async findByTenant(tenantId: string, query: GetLeadsQueryInput = {}): Promise<{ leads: Lead[]; total: number }> {
    const { search, stage, priority, assignedUserId, page = 1, limit = 50 } = query;
    const offset = (page - 1) * limit;

    const conditions: string[] = ['l.tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (search && search.trim()) {
      conditions.push(
        `(l.contact_name ILIKE $${paramIndex} OR l.contact_email ILIKE $${paramIndex} OR l.company_name ILIKE $${paramIndex} OR l.notes ILIKE $${paramIndex})`
      );
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (stage) {
      conditions.push(`l.stage = $${paramIndex}`);
      params.push(stage);
      paramIndex++;
    }

    if (priority) {
      conditions.push(`l.priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (assignedUserId && isUuid(assignedUserId)) {
      conditions.push(`l.assigned_user_id = $${paramIndex}`);
      params.push(assignedUserId);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countSql = `SELECT COUNT(*) FROM leads l WHERE ${whereClause}`;
    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0]?.count || '0', 10);

    const leadsSql = `
      SELECT 
        l.*,
        u.name as client_name,
        u.email as client_email,
        assigned.name as assigned_user_name,
        assigned.email as assigned_user_email,
        p.name as raw_plan_name,
        (
          SELECT la.due_date 
          FROM lead_activities la 
          WHERE la.lead_id = l.id AND la.status = 'PENDING' AND la.due_date >= NOW() 
          ORDER BY la.due_date ASC 
          LIMIT 1
        ) as next_follow_up_date
      FROM leads l
      LEFT JOIN users u ON l.client_id = u.id
      LEFT JOIN users assigned ON l.assigned_user_id = assigned.id
      LEFT JOIN plans p ON l.plan_id = p.id
      WHERE ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const leadsRes = await pool.query(leadsSql, params);

    const formattedLeads: Lead[] = leadsRes.rows.map((row) => ({
      id: row.id,
      tenant_id: row.tenant_id,
      client_id: row.client_id,
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      company_name: row.company_name,
      stage: row.stage as LeadStage,
      plan_id: row.plan_id,
      billing_cycle: row.billing_cycle,
      equipment_count: Number(row.equipment_count || 1),
      expected_revenue: Number(row.expected_revenue || 0),
      probability: Number(row.probability || 0),
      priority: row.priority as LeadPriority,
      assigned_user_id: row.assigned_user_id,
      assigned_user_name: row.assigned_user_name,
      assigned_user_email: row.assigned_user_email,
      client_name: row.client_name,
      client_email: row.client_email,
      plan_name: typeof row.raw_plan_name === 'object' && row.raw_plan_name !== null
        ? (row.raw_plan_name.en_US || row.raw_plan_name.es_DO || Object.values(row.raw_plan_name)[0])
        : row.raw_plan_name || row.plan_id,
      notes: row.notes,
      lost_reason: row.lost_reason,
      next_follow_up_date: row.next_follow_up_date ? new Date(row.next_follow_up_date) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    }));

    return { leads: formattedLeads, total };
  }

  async findLeadById(id: string, tenantId?: string): Promise<Lead | null> {
    if (!id || !isUuid(id)) return null;

    let sqlQuery = `
      SELECT 
        l.*,
        u.name as client_name,
        u.email as client_email,
        assigned.name as assigned_user_name,
        assigned.email as assigned_user_email,
        p.name as raw_plan_name,
        (
          SELECT la.due_date 
          FROM lead_activities la 
          WHERE la.lead_id = l.id AND la.status = 'PENDING' AND la.due_date >= NOW() 
          ORDER BY la.due_date ASC 
          LIMIT 1
        ) as next_follow_up_date
      FROM leads l
      LEFT JOIN users u ON l.client_id = u.id
      LEFT JOIN users assigned ON l.assigned_user_id = assigned.id
      LEFT JOIN plans p ON l.plan_id = p.id
      WHERE l.id = $1
    `;
    const params: unknown[] = [id];

    if (tenantId) {
      sqlQuery += ' AND l.tenant_id = $2';
      params.push(tenantId);
    }

    const res = await pool.query(sqlQuery, params);
    if (!res.rows || res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      client_id: row.client_id,
      contact_name: row.contact_name,
      contact_email: row.contact_email,
      contact_phone: row.contact_phone,
      company_name: row.company_name,
      stage: row.stage as LeadStage,
      plan_id: row.plan_id,
      billing_cycle: row.billing_cycle,
      equipment_count: Number(row.equipment_count || 1),
      expected_revenue: Number(row.expected_revenue || 0),
      probability: Number(row.probability || 0),
      priority: row.priority as LeadPriority,
      assigned_user_id: row.assigned_user_id,
      assigned_user_name: row.assigned_user_name,
      assigned_user_email: row.assigned_user_email,
      client_name: row.client_name,
      client_email: row.client_email,
      plan_name: typeof row.raw_plan_name === 'object' && row.raw_plan_name !== null
        ? (row.raw_plan_name.en_US || row.raw_plan_name.es_DO || Object.values(row.raw_plan_name)[0])
        : row.raw_plan_name || row.plan_id,
      notes: row.notes,
      lost_reason: row.lost_reason,
      next_follow_up_date: row.next_follow_up_date ? new Date(row.next_follow_up_date) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }

  async createLead(data: CreateLeadInput, tenantId: string): Promise<Lead> {
    const result = await db
      .insert(leads)
      .values({
        tenant_id: tenantId,
        client_id: data.clientId || null,
        contact_name: data.contactName,
        contact_email: data.contactEmail,
        contact_phone: data.contactPhone || null,
        company_name: data.companyName || null,
        stage: data.stage || LeadStage.NEW,
        plan_id: data.planId || null,
        billing_cycle: data.billingCycle || 'monthly',
        equipment_count: data.equipmentCount ?? 1,
        expected_revenue: data.expectedRevenue ?? 0,
        probability: data.probability ?? 10,
        priority: data.priority || LeadPriority.MEDIUM,
        assigned_user_id: data.assignedUserId || null,
        notes: data.notes || null,
      })
      .returning();

    const created = result[0];
    const fullLead = await this.findLeadById(created.id, tenantId);
    return fullLead || (created as unknown as Lead);
  }

  async updateLead(id: string, data: UpdateLeadInput, tenantId: string): Promise<Lead | null> {
    if (!id || !isUuid(id)) return null;

    const valuesToUpdate: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (data.clientId !== undefined) valuesToUpdate.client_id = data.clientId;
    if (data.contactName !== undefined) valuesToUpdate.contact_name = data.contactName;
    if (data.contactEmail !== undefined) valuesToUpdate.contact_email = data.contactEmail;
    if (data.contactPhone !== undefined) valuesToUpdate.contact_phone = data.contactPhone;
    if (data.companyName !== undefined) valuesToUpdate.company_name = data.companyName;
    if (data.stage !== undefined) valuesToUpdate.stage = data.stage;
    if (data.planId !== undefined) valuesToUpdate.plan_id = data.planId;
    if (data.billingCycle !== undefined) valuesToUpdate.billing_cycle = data.billingCycle;
    if (data.equipmentCount !== undefined) valuesToUpdate.equipment_count = data.equipmentCount;
    if (data.expectedRevenue !== undefined) valuesToUpdate.expected_revenue = data.expectedRevenue;
    if (data.probability !== undefined) valuesToUpdate.probability = data.probability;
    if (data.priority !== undefined) valuesToUpdate.priority = data.priority;
    if (data.assignedUserId !== undefined) valuesToUpdate.assigned_user_id = data.assignedUserId;
    if (data.notes !== undefined) valuesToUpdate.notes = data.notes;
    if (data.lostReason !== undefined) valuesToUpdate.lost_reason = data.lostReason;

    await db
      .update(leads)
      .set(valuesToUpdate)
      .where(and(eq(leads.id, id), eq(leads.tenant_id, tenantId)));

    return this.findLeadById(id, tenantId);
  }

  async getPipelineStats(tenantId: string): Promise<CrmPipelineStats> {
    const sqlQuery = `
      SELECT 
        stage,
        COUNT(*) as count,
        COALESCE(SUM(expected_revenue), 0) as total_value
      FROM leads
      WHERE tenant_id = $1
      GROUP BY stage
    `;

    const res = await pool.query(sqlQuery, [tenantId]);
    const breakdown: Record<string, { count: number; value: number }> = {
      NEW: { count: 0, value: 0 },
      QUALIFIED: { count: 0, value: 0 },
      PROPOSITION: { count: 0, value: 0 },
      WON: { count: 0, value: 0 },
      LOST: { count: 0, value: 0 },
    };

    let totalLeads = 0;
    let pipelineValue = 0;
    let wonRevenue = 0;
    let leadsInProposition = 0;

    for (const row of res.rows) {
      const stage = row.stage as string;
      const count = parseInt(row.count, 10);
      const val = parseFloat(row.total_value);

      if (breakdown[stage]) {
        breakdown[stage] = { count, value: val };
      }
      totalLeads += count;

      if (stage !== 'WON' && stage !== 'LOST') {
        pipelineValue += val;
      }
      if (stage === 'WON') {
        wonRevenue += val;
      }
      if (stage === 'PROPOSITION') {
        leadsInProposition += count;
      }
    }

    const wonCount = breakdown.WON.count;
    const closedCount = wonCount + breakdown.LOST.count;
    const conversionRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : (totalLeads > 0 ? Math.round((wonCount / totalLeads) * 100) : 0);

    return {
      totalLeads,
      pipelineValue: Math.round(pipelineValue * 100) / 100,
      wonRevenue: Math.round(wonRevenue * 100) / 100,
      leadsInProposition,
      conversionRate,
      stageBreakdown: breakdown as CrmPipelineStats['stageBreakdown'],
    };
  }
}

export const leadRepository = new LeadRepository();
