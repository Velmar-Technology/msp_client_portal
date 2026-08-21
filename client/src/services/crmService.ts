import api from "@/services/api";

export type LeadStage = "NEW" | "QUALIFIED" | "PROPOSITION" | "WON" | "LOST";
export type LeadPriority = "LOW" | "MEDIUM" | "HIGH";
export type QuotationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";

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

export interface GetLeadsParams {
  search?: string;
  stage?: LeadStage;
  priority?: LeadPriority;
  assignedUserId?: string;
  page?: number;
  limit?: number;
}

export const crmService = {
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

  async getStats(): Promise<CrmPipelineStats> {
    const response = await api.get("/crm/stats");
    return response.data.data;
  },

  async getLeadById(id: string): Promise<Lead> {
    const response = await api.get(`/crm/leads/${id}`);
    return response.data.data;
  },

  async createLead(data: CreateLeadPayload): Promise<Lead> {
    const response = await api.post("/crm/leads", data);
    return response.data.data;
  },

  async updateLead(id: string, data: UpdateLeadPayload): Promise<Lead> {
    const response = await api.patch(`/crm/leads/${id}`, data);
    return response.data.data;
  },

  async updateStage(id: string, stage: LeadStage, lostReason?: string | null): Promise<Lead> {
    const response = await api.patch(`/crm/leads/${id}/stage`, { stage, lostReason });
    return response.data.data;
  },

  async sendQuotation(data: SendQuotationPayload): Promise<Quotation> {
    const response = await api.post("/crm/quotations/send", data);
    return response.data.data;
  },

  async resendQuotation(data: ResendQuotationPayload): Promise<Quotation> {
    const response = await api.post("/crm/quotations/resend", data);
    return response.data.data;
  },

  async updateQuotationStatus(quotationId: string, status: QuotationStatus): Promise<Quotation> {
    const response = await api.patch(`/crm/quotations/${quotationId}/status`, { status });
    return response.data.data;
  },

  async getUpcomingActivities(): Promise<LeadActivity[]> {
    const response = await api.get("/crm/activities");
    return response.data.data;
  },

  async convertLeadToSubscription(leadId: string, data: ConvertLeadPayload = {}): Promise<{ lead: Lead; subscription: { id: string; status: string; plan: string; equipment_count: number } }> {
    const response = await api.post(`/crm/leads/${leadId}/convert`, data);
    return response.data.data;
  },

  async getActivities(leadId: string): Promise<LeadActivity[]> {
    const response = await api.get(`/crm/leads/${leadId}/activities`);
    return response.data.data;
  },

  async logActivity(leadId: string, data: CreateActivityPayload): Promise<LeadActivity> {
    const response = await api.post(`/crm/leads/${leadId}/activities`, data);
    return response.data.data;
  },

  async updateActivity(activityId: string, data: { status?: string; summary?: string }): Promise<LeadActivity> {
    const response = await api.patch(`/crm/activities/${activityId}`, data);
    return response.data.data;
  },

  async getQuotations(leadId: string): Promise<Quotation[]> {
    const response = await api.get(`/crm/leads/${leadId}/quotations`);
    return response.data.data;
  },

  async modifySubscription(data: { subId: string; planId: string; equipmentCount: number; leadId?: string }): Promise<unknown> {
    const response = await api.post("/crm/subscriptions/modify", data);
    return response.data.data;
  },

  async cancelSubscription(data: { subId: string; leadId?: string }): Promise<unknown> {
    const response = await api.post("/crm/subscriptions/cancel", data);
    return response.data.data;
  },
};
