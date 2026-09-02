import api from "@/services/api";
import type { Invoice } from "@/services/invoiceService";
import type { Plan, PlanFeature } from "@/services/planService";

export type LeadStage = "NEW" | "QUALIFIED" | "PROPOSITION" | "WON" | "LOST";
export type LeadPriority = "LOW" | "MEDIUM" | "HIGH";
export type QuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface ConvertLeadResult {
  lead: Lead;
  subscription: { id: string; status: string; plan: string; equipment_count: number };
  invoice?: Invoice;
  clientCreated?: boolean;
}

export interface Lead {
  id: string;
  tenant_id: string;
  client_id?: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone?: string | null;
  company_name?: string | null;
  stage: LeadStage;
  plan_id?: string | null;
  billing_cycle: "monthly" | "annual";
  equipment_count: number;
  expected_revenue: number;
  probability: number;
  priority: LeadPriority;
  assigned_user_id?: string | null;
  assigned_user_name?: string | null;
  assigned_user_email?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  plan_name?: string | null;
  notes?: string | null;
  lost_reason?: string | null;
  next_follow_up_date?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  tenant_id: string;
  lead_id?: string | null;
  client_id?: string | null;
  recipient_name: string;
  recipient_email: string;
  plan_id: string;
  plan_name?: string | null;
  billing_cycle: "monthly" | "annual";
  equipment_count: number;
  subtotal: number;
  tax: number;
  total: number;
  status: QuotationStatus;
  valid_until?: string | null;
  sent_at: string;
  last_reminder_sent_at?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  created_at: string;
}

export type LeadActivity = {
  id: string;
  lead_id: string;
  tenant_id: string;
  user_id?: string | null;
  user_name?: string | null;
  activity_type:
    | "EMAIL_SENT"
    | "QUOTE_SENT"
    | "QUOTE_REMINDER"
    | "QUOTE_STATUS_CHANGE"
    | "CALL"
    | "MEETING"
    | "NOTE"
    | "STAGE_CHANGE"
    | "PLAN_ASSIGNED"
    | "SUB_MODIFIED";
  title: string;
  summary?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  created_at: string;
  lead_contact_name?: string | null;
  lead_company_name?: string | null;
};

export interface CrmPipelineStats {
  totalLeads: number;
  pipelineValue: number;
  wonRevenue: number;
  leadsInProposition: number;
  conversionRate: number;
  stageBreakdown: {
    NEW: { count: number; value: number };
    QUALIFIED: { count: number; value: number };
    PROPOSITION: { count: number; value: number };
    WON: { count: number; value: number };
    LOST: { count: number; value: number };
  };
}

export interface CreateLeadPayload {
  clientId?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  companyName?: string | null;
  stage?: LeadStage;
  planId?: string | null;
  billingCycle?: "monthly" | "annual";
  equipmentCount?: number;
  expectedRevenue?: number;
  probability?: number;
  priority?: LeadPriority;
  assignedUserId?: string | null;
  notes?: string | null;
}

export interface UpdateLeadPayload {
  clientId?: string | null;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string | null;
  companyName?: string | null;
  stage?: LeadStage;
  planId?: string | null;
  billingCycle?: "monthly" | "annual";
  equipmentCount?: number;
  expectedRevenue?: number;
  probability?: number;
  priority?: LeadPriority;
  assignedUserId?: string | null;
  notes?: string | null;
  lostReason?: string | null;
}

export interface SendQuotationPayload {
  leadId?: string | null;
  clientId?: string | null;
  recipientName: string;
  recipientEmail: string;
  planId: string;
  billingCycle: "monthly" | "annual";
  equipmentCount: number;
  validDays?: number;
  notes?: string | null;
}

export interface ResendQuotationPayload {
  quotationId: string;
  isReminder?: boolean;
  customMessage?: string | null;
}

export interface ConvertLeadPayload {
  planId?: string;
  billingCycle?: "monthly" | "annual";
  equipmentCount?: number;
  paymentMethod?: "card" | "transfer";
}

export interface CreateActivityPayload {
  activityType: LeadActivity["activity_type"];
  title: string;
  summary?: string | null;
  dueDate?: string | null;
  status?: "PENDING" | "COMPLETED" | "CANCELLED";
}

export interface UpdateActivityPayload {
  title?: string;
  activityType?: LeadActivity["activity_type"];
  summary?: string | null;
  dueDate?: string | null;
  status?: "PENDING" | "COMPLETED" | "CANCELLED";
}

export interface CreateCustomPlanPayload {
  name: string;
  description?: string | null;
  price: number;
  perDevicePrice?: number;
  billingCycle?: "monthly" | "annual";
  currency?: "USD" | "DOP";
  ticketQuota?: number | null;
  taxExempt?: boolean;
  slaTier?: {
    criticalMins: number;
    highMins: number;
    medMins: number;
    lowMins: number;
  } | null;
  features?: (string | PlanFeature)[];
  leadId?: string | null;
  clientId?: string | null;
}

export interface GetLeadsParams {
  search?: string;
  stage?: LeadStage;
  priority?: LeadPriority;
  assignedUserId?: string;
  page?: number;
  limit?: number;
}

/**
 * CRM, lead pipeline, quotations, and activity management service.
 * Handles lead lifecycle tracking, quotation dispatch, deal conversion, and scheduled follow-ups.
 */
export const crmService = {
  /**
   * Retrieves a paginated list of CRM leads matching search, stage, or assignment filters.
   *
   * @param params - Filtering parameters (search keyword, stage, priority, assignedUserId, page, limit).
   * @returns Promise resolving to lead list and total count.
   */
  async getLeads(params: GetLeadsParams = {}): Promise<{ leads: Lead[]; total: number }> {
    const qs = new URLSearchParams();
    if (params.search) qs.append("search", params.search);
    if (params.stage) qs.append("stage", params.stage);
    if (params.priority) qs.append("priority", params.priority);
    if (params.assignedUserId) qs.append("assignedUserId", params.assignedUserId);
    if (params.page) qs.append("page", String(params.page));
    if (params.limit) qs.append("limit", String(params.limit));

    const response = await api.get(`/crm/leads${qs.toString() ? `?${qs.toString()}` : ""}`);
    return {
      leads: response.data.data,
      total: response.data.pagination?.total || response.data.data.length,
    };
  },

  /**
   * Fetches aggregate CRM pipeline metrics and conversion statistics.
   *
   * @returns Promise resolving to CrmPipelineStats summary.
   */
  async getStats(): Promise<CrmPipelineStats> {
    const response = await api.get("/crm/stats");
    return response.data.data;
  },

  /**
   * Retrieves a single lead by its unique identifier.
   *
   * @param id - Lead UUID.
   * @returns Promise resolving to Lead entity.
   * @throws {NotFoundError} If lead does not exist.
   */
  async getLeadById(id: string): Promise<Lead> {
    const response = await api.get(`/crm/leads/${id}`);
    return response.data.data;
  },

  /**
   * Creates a new CRM sales lead in the pipeline.
   *
   * @param data - Lead creation details (contact info, deal value, priority, assigned user).
   * @returns Promise resolving to created Lead entity.
   */
  async createLead(data: CreateLeadPayload): Promise<Lead> {
    const response = await api.post("/crm/leads", data);
    return response.data.data;
  },

  /**
   * Updates an existing CRM lead's attributes.
   *
   * @param id - Lead UUID.
   * @param data - Partial lead fields to update.
   * @returns Promise resolving to updated Lead entity.
   */
  async updateLead(id: string, data: UpdateLeadPayload): Promise<Lead> {
    const response = await api.patch(`/crm/leads/${id}`, data);
    return response.data.data;
  },

  /**
   * Transitions a lead to a new pipeline stage.
   *
   * @see BL-501 (CRM Lead Pipeline)
   * @param id - Lead UUID.
   * @param stage - Target stage ('NEW' | 'QUALIFIED' | 'PROPOSITION' | 'WON' | 'LOST').
   * @param lostReason - Optional explanation when stage transitions to 'LOST'.
   * @returns Promise resolving to updated Lead entity.
   */
  async updateStage(id: string, stage: LeadStage, lostReason?: string | null): Promise<Lead> {
    const response = await api.patch(`/crm/leads/${id}/stage`, { stage, lostReason });
    return response.data.data;
  },

  /**
   * Permanently deletes a CRM lead record.
   *
   * @param id - Lead UUID.
   * @returns Promise resolving when lead is removed.
   */
  async deleteLead(id: string): Promise<void> {
    await api.delete(`/crm/leads/${id}`);
  },

  /**
   * Dispatches a commercial quotation to a prospective lead or client.
   *
   * @param data - Quotation details (recipient, plan, cycle, equipment count, validity period).
   * @returns Promise resolving to created Quotation record.
   */
  async sendQuotation(data: SendQuotationPayload): Promise<Quotation> {
    const response = await api.post("/crm/quotations/send", data);
    return response.data.data;
  },

  /**
   * Re-sends or sends a reminder email for an existing quotation.
   *
   * @param data - Resend payload with quotation ID and optional custom message.
   * @returns Promise resolving to updated Quotation record.
   */
  async resendQuotation(data: ResendQuotationPayload): Promise<Quotation> {
    const response = await api.post("/crm/quotations/resend", data);
    return response.data.data;
  },

  /**
   * Updates the approval status of a quotation.
   *
   * @param quotationId - Quotation UUID.
   * @param status - Target QuotationStatus ('DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED').
   * @returns Promise resolving to updated Quotation record.
   */
  async updateQuotationStatus(quotationId: string, status: QuotationStatus): Promise<Quotation> {
    const response = await api.patch(`/crm/quotations/${quotationId}/status`, { status });
    return response.data.data;
  },

  /**
   * Retrieves pending or upcoming scheduled activities across all leads.
   *
   * @returns Promise resolving to array of upcoming LeadActivity items.
   */
  async getUpcomingActivities(): Promise<LeadActivity[]> {
    const response = await api.get("/crm/activities");
    return response.data.data;
  },

  /**
   * Converts a WON lead into an active client subscription and provisions initial invoices.
   *
   * @see BL-501 (CRM Lead Pipeline)
   * @param leadId - Lead UUID.
   * @param data - Conversion attributes (plan, cycle, equipment count, payment method).
   * @returns Promise resolving to ConvertLeadResult containing lead, subscription, and invoice details.
   */
  async convertLeadToSubscription(leadId: string, data: ConvertLeadPayload = {}): Promise<ConvertLeadResult> {
    const response = await api.post(`/crm/leads/${leadId}/convert`, { ...data, leadId });
    return response.data.data;
  },

  /**
   * Retrieves all logged activities and interaction history for a specific lead.
   *
   * @param leadId - Lead UUID.
   * @returns Promise resolving to array of LeadActivity records.
   */
  async getActivities(leadId: string): Promise<LeadActivity[]> {
    const response = await api.get(`/crm/leads/${leadId}/activities`);
    return response.data.data;
  },

  /**
   * Logs a new interaction activity (call, email, meeting, note) for a lead.
   *
   * @param leadId - Lead UUID.
   * @param data - Activity payload (type, title, summary, due date, status).
   * @returns Promise resolving to created LeadActivity record.
   */
  async logActivity(leadId: string, data: CreateActivityPayload): Promise<LeadActivity> {
    const response = await api.post(`/crm/leads/${leadId}/activities`, data);
    return response.data.data;
  },

  /**
   * Updates an existing activity entry.
   *
   * @param activityId - Activity UUID.
   * @param data - Updated activity attributes.
   * @returns Promise resolving to updated LeadActivity record.
   */
  async updateActivity(activityId: string, data: UpdateActivityPayload): Promise<LeadActivity> {
    const response = await api.patch(`/crm/activities/${activityId}`, data);
    return response.data.data;
  },

  /**
   * Deletes a logged activity record.
   *
   * @param activityId - Activity UUID.
   * @returns Promise resolving upon activity deletion.
   */
  async deleteActivity(activityId: string): Promise<void> {
    await api.delete(`/crm/activities/${activityId}`);
  },

  /**
   * Retrieves all quotations generated for a specific lead.
   *
   * @param leadId - Lead UUID.
   * @returns Promise resolving to array of Quotation records.
   */
  async getQuotations(leadId: string): Promise<Quotation[]> {
    const response = await api.get(`/crm/leads/${leadId}/quotations`);
    return response.data.data;
  },

  /**
   * Modifies an active subscription associated with a lead/client.
   *
   * @param data - Subscription modification payload (subId, planId, equipmentCount, leadId).
   * @returns Promise resolving to modified subscription payload.
   */
  async modifySubscription(data: { subId: string; planId: string; equipmentCount: number; leadId?: string }): Promise<unknown> {
    const response = await api.post("/crm/subscriptions/modify", data);
    return response.data.data;
  },

  /**
   * Cancels a subscription associated with a lead/client.
   *
   * @param data - Cancellation payload (subId, optional leadId).
   * @returns Promise resolving to cancellation response.
   */
  async cancelSubscription(data: { subId: string; leadId?: string }): Promise<unknown> {
    const response = await api.post("/crm/subscriptions/cancel", data);
    return response.data.data;
  },

  /**
   * Creates a bespoke custom subscription plan and binds it to a lead or client.
   *
   * @param data - Custom plan specifications
   * @returns Promise resolving to created Plan entity
   */
  async createCustomPlan(data: CreateCustomPlanPayload): Promise<Plan> {
    const response = await api.post("/crm/custom-plans", data);
    return response.data.data;
  },
};
