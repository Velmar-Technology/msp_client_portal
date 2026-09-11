import { db } from '@shared/db';
import {
  tickets,
  ticketEvents,
  technicianEarnings,
  expenses,
  invoices,
  subscriptions,
  tenants,
  users,
  rmmAlerts,
  leads,
  leadActivities,
} from '@shared/db/schema';
import { and, gte, lte, eq, desc } from 'drizzle-orm';
import {
  ActionSequence,
  ActionStep,
  SequenceAuditWindow,
} from '../types';

/**
 * Raw data structure for ticket lifecycle aggregation.
 */
export interface TicketLifecycleRecord {
  ticket: typeof tickets.$inferSelect;
  events: (typeof ticketEvents.$inferSelect)[];
  earning: typeof technicianEarnings.$inferSelect | null;
  expenses: (typeof expenses.$inferSelect)[];
}

/**
 * Raw data structure for invoice and subscription lifecycle aggregation.
 */
export interface BillingLifecycleRecord {
  invoice: typeof invoices.$inferSelect;
  subscription: typeof subscriptions.$inferSelect | null;
  tenant: typeof tenants.$inferSelect | null;
}

/**
 * Raw data structure for CRM deal lifecycle aggregation.
 */
export interface LeadLifecycleRecord {
  lead: typeof leads.$inferSelect;
  activities: (typeof leadActivities.$inferSelect)[];
  provisionedTenant: typeof tenants.$inferSelect | null;
}

/**
 * Port interface for reading operational and audit events from the persistent datastore.
 */
export interface SentinelEventReader {
  fetchTicketLifecycleData(window: SequenceAuditWindow): Promise<TicketLifecycleRecord[]>;
  fetchBillingLifecycleData(window: SequenceAuditWindow): Promise<BillingLifecycleRecord[]>;
  fetchRmmAlertData(window: SequenceAuditWindow): Promise<(typeof rmmAlerts.$inferSelect)[]>;
  fetchLeadLifecycleData(window: SequenceAuditWindow): Promise<LeadLifecycleRecord[]>;
}

/**
 * Default production Drizzle ORM reader implementing SentinelEventReader.
 */
export class DrizzleSentinelEventReader implements SentinelEventReader {
  /**
   * Fetches ticket lifecycle records including events, earnings, and expenses within the time window.
   *
   * @param window - Audit temporal boundaries and optional tenant filter
   * @returns Array of grouped ticket lifecycle records
   */
  async fetchTicketLifecycleData(window: SequenceAuditWindow): Promise<TicketLifecycleRecord[]> {
    const conditions = [
      gte(tickets.created_at, window.startDate),
      lte(tickets.created_at, window.endDate),
    ];
    if (window.tenantId) {
      conditions.push(eq(tickets.tenant_id, window.tenantId));
    }

    const matchedTickets = await db
      .select()
      .from(tickets)
      .where(and(...conditions))
      .orderBy(desc(tickets.created_at));

    const results: TicketLifecycleRecord[] = [];

    for (const ticket of matchedTickets) {
      const events = await db
        .select()
        .from(ticketEvents)
        .where(eq(ticketEvents.ticket_id, ticket.id))
        .orderBy(ticketEvents.created_at);

      const [earning] = await db
        .select()
        .from(technicianEarnings)
        .where(eq(technicianEarnings.ticket_id, ticket.id))
        .limit(1);

      const relatedExpenses = await db
        .select()
        .from(expenses)
        .where(eq(expenses.tenant_id, ticket.tenant_id));

      results.push({
        ticket,
        events,
        earning: earning || null,
        expenses: relatedExpenses,
      });
    }

    return results;
  }

  /**
   * Fetches invoice and subscription billing lifecycle records.
   *
   * @param window - Audit temporal boundaries
   * @returns Array of grouped billing lifecycle records
   */
  async fetchBillingLifecycleData(window: SequenceAuditWindow): Promise<BillingLifecycleRecord[]> {
    const conditions = [
      gte(invoices.created_at, window.startDate),
      lte(invoices.created_at, window.endDate),
    ];
    if (window.tenantId) {
      conditions.push(eq(invoices.tenant_id, window.tenantId));
    }

    const matchedInvoices = await db
      .select()
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.created_at));

    const results: BillingLifecycleRecord[] = [];

    for (const invoice of matchedInvoices) {
      let subscription = null;
      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.client_id, invoice.client_id),
            eq(subscriptions.tenant_id, invoice.tenant_id)
          )
        )
        .limit(1);
      subscription = sub || null;

      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.id, invoice.tenant_id))
        .limit(1);

      results.push({
        invoice,
        subscription,
        tenant: tenant || null,
      });
    }

    return results;
  }

  /**
   * Fetches raw RMM alert records for the target window.
   *
   * @param window - Audit temporal boundaries
   * @returns Array of RMM alert records
   */
  async fetchRmmAlertData(window: SequenceAuditWindow): Promise<(typeof rmmAlerts.$inferSelect)[]> {
    const conditions = [
      gte(rmmAlerts.created_at, window.startDate),
      lte(rmmAlerts.created_at, window.endDate),
    ];
    if (window.tenantId) {
      conditions.push(eq(rmmAlerts.tenant_id, window.tenantId));
    }

    return db
      .select()
      .from(rmmAlerts)
      .where(and(...conditions))
      .orderBy(rmmAlerts.created_at);
  }

  /**
   * Fetches CRM lead records with activity logs and provisioned tenant records.
   *
   * @param window - Audit temporal boundaries
   * @returns Array of grouped lead lifecycle records
   */
  async fetchLeadLifecycleData(window: SequenceAuditWindow): Promise<LeadLifecycleRecord[]> {
    const conditions = [
      gte(leads.created_at, window.startDate),
      lte(leads.created_at, window.endDate),
    ];
    if (window.tenantId) {
      conditions.push(eq(leads.tenant_id, window.tenantId));
    }

    const matchedLeads = await db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.created_at));

    const results: LeadLifecycleRecord[] = [];

    for (const lead of matchedLeads) {
      const activities = await db
        .select()
        .from(leadActivities)
        .where(eq(leadActivities.lead_id, lead.id))
        .orderBy(leadActivities.created_at);

      let provisionedTenant = null;
      if (lead.client_id) {
        const [clientUser] = await db
          .select()
          .from(users)
          .where(eq(users.id, lead.client_id))
          .limit(1);

        if (clientUser) {
          const [t] = await db
            .select()
            .from(tenants)
            .where(eq(tenants.id, clientUser.tenant_id))
            .limit(1);
          provisionedTenant = t || null;
        }
      }

      results.push({
        lead,
        activities,
        provisionedTenant,
      });
    }

    return results;
  }
}

/**
 * Service that correlates disparate database events and audit tables into cohesive,
 * chronologically sorted ActionSequence graphs.
 */
export class SequenceAggregatorService {
  /**
   * Initializes SequenceAggregatorService with an injectable event reader.
   *
   * @param eventReader - Reader port querying operational records
   */
  constructor(
    private readonly eventReader: SentinelEventReader = new DrizzleSentinelEventReader()
  ) {}

  /**
   * Assembles action sequences for tickets created or modified within the audit window.
   *
   * @param window - Audit temporal window and optional tenant filter
   * @returns Array of chronologically sorted ticket ActionSequence graphs
   */
  async aggregateTicketSequences(window: SequenceAuditWindow): Promise<ActionSequence[]> {
    const records = await this.eventReader.fetchTicketLifecycleData(window);
    const sequences: ActionSequence[] = [];

    for (const record of records) {
      const { ticket, events, earning, expenses: relatedExpenses } = record;
      const steps: ActionStep[] = [];

      // Step 1: Initial creation event
      steps.push({
        id: `ticket-created-${ticket.id}`,
        entityId: ticket.id,
        entityType: 'TICKET',
        action: 'TICKET_CREATED',
        timestamp: ticket.created_at || new Date(),
        actorId: ticket.client_id,
        actorRole: 'CLIENT',
        tenantId: ticket.tenant_id,
        metadata: {
          category: ticket.category,
          priority: ticket.priority,
          source: ticket.source,
          title: ticket.title,
        },
        newState: {
          status: 'OPEN',
        },
      });

      // Step 2: Lifecycle events (transitions, assignments)
      for (const ev of events) {
        let action = ev.new_status ? `STATUS_CHANGED_${ev.new_status}` : 'EVENT_LOGGED';
        if (ev.notes && (ev.notes.includes('assigned to technician') || ev.notes.includes('auto-assigned'))) {
          action = 'TICKET_ASSIGNED';
        } else if (ev.notes && (ev.notes.includes('Escalated to Tier 2') || ev.notes.includes('Auto-Heal BL-104'))) {
          action = 'TIER_ESCALATED';
        }

        steps.push({
          id: ev.id,
          entityId: ticket.id,
          entityType: 'TICKET',
          action,
          timestamp: ev.created_at || new Date(),
          actorId: ev.changed_by,
          tenantId: ev.tenant_id,
          metadata: {
            notes: ev.notes,
          },
          previousState: {
            status: ev.old_status,
          },
          newState: {
            status: ev.new_status,
          },
        });
      }

      // Step 3: Commission earning recording (if present)
      if (earning) {
        const rawEarning = earning as any;
        const totalAmount = rawEarning.final_amount ?? rawEarning.total_earning ?? earning.final_amount;
        steps.push({
          id: earning.id,
          entityId: ticket.id,
          entityType: 'TICKET',
          action: 'COMMISSION_RECORDED',
          timestamp: earning.created_at || earning.earned_at || new Date(),
          actorId: earning.technician_id,
          actorRole: 'TECHNICIAN',
          tenantId: earning.tenant_id,
          metadata: {
            baseAmount: earning.base_amount,
            bonusAmount: earning.sla_bonus_amount,
            totalEarning: totalAmount,
            status: earning.status,
          },
        });
      }

      // Sort steps strictly chronologically
      steps.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      sequences.push({
        entityId: ticket.id,
        entityType: 'TICKET',
        tenantId: ticket.tenant_id,
        steps,
        rootContext: {
          ticket,
          earning,
          expenses: relatedExpenses,
        },
      });
    }

    return sequences;
  }

  /**
   * Assembles action sequences for invoices and linked subscriptions.
   *
   * @param window - Audit temporal window and optional tenant filter
   * @returns Array of invoice ActionSequence graphs
   */
  async aggregateInvoiceSequences(window: SequenceAuditWindow): Promise<ActionSequence[]> {
    const records = await this.eventReader.fetchBillingLifecycleData(window);
    const sequences: ActionSequence[] = [];

    for (const record of records) {
      const { invoice, subscription, tenant } = record;
      const steps: ActionStep[] = [];
      const rawInvoice = invoice as any;

      const subtotal = rawInvoice.amount ?? rawInvoice.subtotal ?? 0;
      const taxAmount = rawInvoice.tax_amount ?? 0;
      const totalAmount = rawInvoice.total ?? rawInvoice.total_amount ?? 0;
      const ncfCode = rawInvoice.ncf ?? rawInvoice.ncf_code ?? '';

      steps.push({
        id: `invoice-created-${invoice.id}`,
        entityId: invoice.id,
        entityType: 'INVOICE',
        action: 'INVOICE_ISSUED',
        timestamp: invoice.created_at || new Date(),
        tenantId: invoice.tenant_id,
        metadata: {
          subtotal,
          taxAmount,
          totalAmount,
          ncfCode,
          dueDate: invoice.due_date,
        },
        newState: {
          status: invoice.status,
        },
      });

      const isPaid = invoice.status === 'PAID' || Boolean(rawInvoice.paid_at);
      if (isPaid) {
        const paidAt = rawInvoice.paid_at || invoice.last_email_sent_at || invoice.created_at || new Date();
        steps.push({
          id: `invoice-paid-${invoice.id}`,
          entityId: invoice.id,
          entityType: 'INVOICE',
          action: 'INVOICE_PAID',
          timestamp: paidAt,
          tenantId: invoice.tenant_id,
          metadata: {
            paymentMethod: rawInvoice.payment_method || 'PAYPAL',
            transactionId: rawInvoice.paypal_order_id || subscription?.paypal_order_id || null,
          },
          newState: {
            status: 'PAID',
          },
        });
      }

      steps.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      sequences.push({
        entityId: invoice.id,
        entityType: 'INVOICE',
        tenantId: invoice.tenant_id,
        steps,
        rootContext: {
          invoice,
          subscription,
          tenant,
        },
      });
    }

    return sequences;
  }

  /**
   * Assembles action sequences for RMM alerts grouped by device.
   *
   * @param window - Audit temporal window and optional tenant filter
   * @returns Array of device alert ActionSequence graphs
   */
  async aggregateAlertSequences(window: SequenceAuditWindow): Promise<ActionSequence[]> {
    const alerts = await this.eventReader.fetchRmmAlertData(window);
    const alertsByDevice = new Map<string, typeof alerts>();

    for (const alert of alerts) {
      const raw = alert as any;
      const deviceId = raw.asset_id || raw.device_id || 'unassigned-device';
      const existing = alertsByDevice.get(deviceId) || [];
      existing.push(alert);
      alertsByDevice.set(deviceId, existing);
    }

    const sequences: ActionSequence[] = [];

    for (const [deviceId, deviceAlerts] of alertsByDevice.entries()) {
      const tenantId = deviceAlerts[0]?.tenant_id || 'unknown-tenant';
      const steps: ActionStep[] = deviceAlerts.map((alt) => {
        const raw = alt as any;
        const status = raw.status || 'TRIGGERED';
        const action = status === 'RESOLVED' ? 'ALERT_RESOLVED' : 'ALERT_TRIGGERED';
        const timestamp = raw.created_at || raw.received_at || new Date();

        return {
          id: raw.id,
          entityId: deviceId,
          entityType: 'DEVICE',
          action,
          timestamp,
          tenantId: raw.tenant_id,
          metadata: {
            alertId: raw.id,
            severity: raw.severity || 'HIGH',
            title: raw.title || raw.alert_type || 'Alert',
            source: raw.resolution_source || null,
            durationSeconds: raw.duration_seconds || 0,
          },
          newState: {
            status,
          },
        };
      });

      steps.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      sequences.push({
        entityId: deviceId,
        entityType: 'DEVICE',
        tenantId,
        steps,
        rootContext: {
          alerts: deviceAlerts,
        },
      });
    }

    return sequences;
  }

  /**
   * Assembles action sequences for CRM leads and opportunity stages.
   *
   * @param window - Audit temporal window and optional tenant filter
   * @returns Array of lead ActionSequence graphs
   */
  async aggregateLeadSequences(window: SequenceAuditWindow): Promise<ActionSequence[]> {
    const records = await this.eventReader.fetchLeadLifecycleData(window);
    const sequences: ActionSequence[] = [];

    for (const record of records) {
      const { lead, activities, provisionedTenant } = record;
      const steps: ActionStep[] = [];
      const rawLead = lead as any;

      steps.push({
        id: `lead-created-${lead.id}`,
        entityId: lead.id,
        entityType: 'LEAD',
        action: 'LEAD_CREATED',
        timestamp: lead.created_at || new Date(),
        tenantId: lead.tenant_id,
        metadata: {
          companyName: lead.company_name,
          contactName: lead.contact_name,
          estimatedValue: rawLead.expected_revenue ?? rawLead.estimated_value ?? 0,
        },
        newState: {
          status: 'NEW',
        },
      });

      for (const act of activities) {
        const rawAct = act as any;
        const actType = rawAct.activity_type ?? rawAct.type ?? 'NOTE';
        steps.push({
          id: act.id,
          entityId: lead.id,
          entityType: 'LEAD',
          action: `ACTIVITY_${actType}`,
          timestamp: act.created_at || new Date(),
          actorId: rawAct.user_id ?? rawAct.performed_by ?? undefined,
          tenantId: act.tenant_id,
          metadata: {
            subject: rawAct.title ?? rawAct.subject ?? '',
            details: rawAct.summary ?? rawAct.details ?? '',
          },
        });
      }

      steps.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      sequences.push({
        entityId: lead.id,
        entityType: 'LEAD',
        tenantId: lead.tenant_id,
        steps,
        rootContext: {
          lead,
          activities,
          provisionedTenant,
        },
      });
    }

    return sequences;
  }

  /**
   * Aggregates sequences across all supported operational domains in parallel.
   *
   * @param window - Audit temporal boundaries
   * @returns Unified list of all reconstructed action sequences
   */
  async aggregateAll(window: SequenceAuditWindow): Promise<ActionSequence[]> {
    const [ticketSeq, invoiceSeq, alertSeq, leadSeq] = await Promise.all([
      this.aggregateTicketSequences(window),
      this.aggregateInvoiceSequences(window),
      this.aggregateAlertSequences(window),
      this.aggregateLeadSequences(window),
    ]);

    return [...ticketSeq, ...invoiceSeq, ...alertSeq, ...leadSeq];
  }
}
