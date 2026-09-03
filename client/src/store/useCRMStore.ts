import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  crmService,
  type Lead,
  type LeadStage,
  type Quotation,
  type LeadActivity,
  type CrmPipelineStats,
  type CreateLeadPayload,
  type UpdateLeadPayload,
  type SendQuotationPayload,
  type ResendQuotationPayload,
  type ConvertLeadPayload,
  type ConvertLeadResult,
  type CreateActivityPayload,
  type UpdateActivityPayload,
  type GetLeadsParams,
  type CreateCustomPlanPayload,
} from "@/services/crmService";
import type { Plan } from "@/features/subscriptions";

export interface CRMState {
  leads: Lead[];
  totalLeads: number;
  stats: CrmPipelineStats | null;
  selectedLead: Lead | null;
  leadActivities: LeadActivity[];
  leadQuotations: Quotation[];
  upcomingActivities: LeadActivity[];
  loading: boolean;
  statsLoading: boolean;
  detailLoading: boolean;
  actionLoading: boolean;
  viewMode: "table" | "kanban";
  filters: GetLeadsParams;

  setViewMode: (mode: "table" | "kanban") => void;
  setFilters: (filters: Partial<GetLeadsParams>) => void;
  setSelectedLead: (lead: Lead | null) => void;

  fetchLeads: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchUpcomingActivities: () => Promise<void>;
  fetchLeadDetail: (leadId: string) => Promise<void>;
  createLead: (data: CreateLeadPayload) => Promise<Lead>;
  updateLead: (id: string, data: UpdateLeadPayload) => Promise<Lead>;
  updateLeadStage: (id: string, stage: LeadStage, lostReason?: string | null) => Promise<void>;
  bulkUpdateStage: (ids: string[], stage: LeadStage) => Promise<void>;
  deleteLead: (id: string) => Promise<void>;
  bulkDeleteLeads: (ids: string[]) => Promise<void>;
  sendQuotation: (data: SendQuotationPayload) => Promise<Quotation>;
  resendQuotation: (data: ResendQuotationPayload) => Promise<Quotation>;
  updateQuotationStatus: (quotationId: string, status: Quotation["status"]) => Promise<Quotation>;
  convertLeadToSubscription: (leadId: string, data?: ConvertLeadPayload) => Promise<ConvertLeadResult>;
  logActivity: (leadId: string, data: CreateActivityPayload) => Promise<void>;
  updateActivity: (activityId: string, data: UpdateActivityPayload) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
  modifySubscription: (data: { subId: string; planId: string; equipmentCount: number; leadId?: string }) => Promise<void>;
  cancelSubscription: (data: { subId: string; leadId?: string }) => Promise<void>;
  createCustomPlan: (data: CreateCustomPlanPayload) => Promise<Plan>;
}

/**
 * CRM pipeline and lead management store.
 * Manages lead lists, kanban/table view modes, sales quotations, and lead activities.
 *
 * @see BL-501 (CRM Lead Pipeline)
 */
export const useCRMStore = create<CRMState>()(
  devtools(
    (set, get) => ({
      leads: [],
      totalLeads: 0,
      stats: null,
      selectedLead: null,
      leadActivities: [],
      leadQuotations: [],
      upcomingActivities: [],
      loading: false,
      statsLoading: false,
      detailLoading: false,
      actionLoading: false,
      viewMode: "table",
      filters: { page: 1, limit: 10 },

      setViewMode: (viewMode) => set({ viewMode }),

      setFilters: (newFilters) => {
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
        }));
        get().fetchLeads();
      },

      setSelectedLead: (selectedLead) => {
        set({ selectedLead });
        if (selectedLead) {
          get().fetchLeadDetail(selectedLead.id);
        } else {
          set({ leadActivities: [], leadQuotations: [] });
        }
      },

      fetchLeads: async () => {
        set({ loading: true });
        try {
          const { leads, total } = await crmService.getLeads(get().filters);
          set({ leads, totalLeads: total, loading: false });
        } catch (err) {
          set({ loading: false });
          console.error("Failed to fetch leads", err);
        }
      },

      fetchStats: async () => {
        set({ statsLoading: true });
        try {
          const stats = await crmService.getStats();
          set({ stats, statsLoading: false });
        } catch (err) {
          set({ statsLoading: false });
          console.error("Failed to fetch CRM stats", err);
        }
      },

      fetchUpcomingActivities: async () => {
        try {
          const upcomingActivities = await crmService.getUpcomingActivities();
          set({ upcomingActivities });
        } catch (err) {
          console.error("Failed to fetch upcoming activities", err);
        }
      },

      fetchLeadDetail: async (leadId: string) => {
        set({ detailLoading: true });
        try {
          const [lead, activities, quotations] = await Promise.all([
            crmService.getLeadById(leadId),
            crmService.getActivities(leadId),
            crmService.getQuotations(leadId),
          ]);
          set({
            selectedLead: lead,
            leadActivities: activities,
            leadQuotations: quotations,
            detailLoading: false,
          });
        } catch (err) {
          set({ detailLoading: false });
          console.error("Failed to fetch lead details", err);
        }
      },

      createLead: async (data: CreateLeadPayload) => {
        set({ actionLoading: true });
        try {
          const newLead = await crmService.createLead(data);
          set((state) => ({
            leads: [newLead, ...state.leads],
            totalLeads: state.totalLeads + 1,
            actionLoading: false,
          }));
          get().fetchStats();
          return newLead;
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      updateLead: async (id: string, data: UpdateLeadPayload) => {
        set({ actionLoading: true });
        try {
          const updated = await crmService.updateLead(id, data);
          set((state) => ({
            leads: state.leads.map((l) => (l.id === id ? updated : l)),
            selectedLead: state.selectedLead?.id === id ? updated : state.selectedLead,
            actionLoading: false,
          }));
          get().fetchStats();
          return updated;
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      updateLeadStage: async (id: string, stage: LeadStage, lostReason?: string | null) => {
        set({ actionLoading: true });
        try {
          const updated = await crmService.updateStage(id, stage, lostReason);
          set((state) => ({
            leads: state.leads.map((l) => (l.id === id ? updated : l)),
            selectedLead: state.selectedLead?.id === id ? updated : state.selectedLead,
            actionLoading: false,
          }));
          if (get().selectedLead?.id === id) {
            const activities = await crmService.getActivities(id);
            set({ leadActivities: activities });
          }
          get().fetchStats();
          get().fetchUpcomingActivities();
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      bulkUpdateStage: async (ids: string[], stage: LeadStage) => {
        set({ actionLoading: true });
        try {
          const results = await Promise.allSettled(ids.map((id) => crmService.updateStage(id, stage)));
          const failedCount = results.filter((r) => r.status === "rejected").length;
          await get().fetchLeads();
          get().fetchStats();
          get().fetchUpcomingActivities();
          set({ actionLoading: false });
          if (failedCount > 0) {
            throw new Error(`${failedCount} of ${ids.length} stage updates failed`);
          }
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      deleteLead: async (id: string) => {
        set({ actionLoading: true });
        try {
          await crmService.deleteLead(id);
          set((state) => ({
            leads: state.leads.filter((l) => l.id !== id),
            totalLeads: Math.max(0, state.totalLeads - 1),
            selectedLead: state.selectedLead?.id === id ? null : state.selectedLead,
            actionLoading: false,
          }));
          get().fetchStats();
          get().fetchUpcomingActivities();
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      bulkDeleteLeads: async (ids: string[]) => {
        set({ actionLoading: true });
        try {
          const results = await Promise.allSettled(ids.map((id) => crmService.deleteLead(id)));
          const failedCount = results.filter((r) => r.status === "rejected").length;
          await get().fetchLeads();
          get().fetchStats();
          get().fetchUpcomingActivities();
          set({ actionLoading: false });
          if (failedCount > 0) {
            throw new Error(`${failedCount} of ${ids.length} deletes failed`);
          }
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      sendQuotation: async (data: SendQuotationPayload) => {
        set({ actionLoading: true });
        try {
          const quote = await crmService.sendQuotation(data);
          if (data.leadId) {
            await get().fetchLeadDetail(data.leadId);
            await get().fetchLeads();
          }
          get().fetchStats();
          get().fetchUpcomingActivities();
          set({ actionLoading: false });
          return quote;
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      resendQuotation: async (data: ResendQuotationPayload) => {
        set({ actionLoading: true });
        try {
          const quote = await crmService.resendQuotation(data);
          if (get().selectedLead) {
            await get().fetchLeadDetail(get().selectedLead!.id);
          }
          get().fetchUpcomingActivities();
          set({ actionLoading: false });
          return quote;
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      updateQuotationStatus: async (quotationId: string, status) => {
        set({ actionLoading: true });
        try {
          const quote = await crmService.updateQuotationStatus(quotationId, status);
          if (get().selectedLead) {
            await get().fetchLeadDetail(get().selectedLead!.id);
          }
          get().fetchLeads();
          get().fetchStats();
          get().fetchUpcomingActivities();
          set({ actionLoading: false });
          return quote;
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      convertLeadToSubscription: async (leadId: string, data: ConvertLeadPayload = {}) => {
        set({ actionLoading: true });
        try {
          const result = await crmService.convertLeadToSubscription(leadId, data);
          await get().fetchLeadDetail(leadId);
          await get().fetchLeads();
          await get().fetchStats();
          set({ actionLoading: false });
          return result;
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      logActivity: async (leadId: string, data: CreateActivityPayload) => {
        set({ actionLoading: true });
        try {
          const act = await crmService.logActivity(leadId, data);
          set((state) => ({
            leadActivities: [act, ...state.leadActivities],
            actionLoading: false,
          }));
          get().fetchUpcomingActivities();
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      updateActivity: async (activityId: string, data: UpdateActivityPayload) => {
        try {
          const updated = await crmService.updateActivity(activityId, data);
          set((state) => ({
            leadActivities: state.leadActivities.map((a) => (a.id === activityId ? updated : a)),
            upcomingActivities: state.upcomingActivities.map((a) => (a.id === activityId ? updated : a)),
          }));
          get().fetchUpcomingActivities();
        } catch (err) {
          console.error("Failed to update activity", err);
          throw err;
        }
      },

      deleteActivity: async (activityId: string) => {
        try {
          await crmService.deleteActivity(activityId);
          set((state) => ({
            leadActivities: state.leadActivities.filter((a) => a.id !== activityId),
            upcomingActivities: state.upcomingActivities.filter((a) => a.id !== activityId),
          }));
        } catch (err) {
          console.error("Failed to delete activity", err);
          throw err;
        }
      },

      modifySubscription: async (data: { subId: string; planId: string; equipmentCount: number; leadId?: string }) => {
        set({ actionLoading: true });
        try {
          await crmService.modifySubscription(data);
          if (data.leadId) {
            await get().fetchLeadDetail(data.leadId);
          }
          set({ actionLoading: false });
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      cancelSubscription: async (data: { subId: string; leadId?: string }) => {
        set({ actionLoading: true });
        try {
          await crmService.cancelSubscription(data);
          if (data.leadId) {
            await get().fetchLeadDetail(data.leadId);
          }
          set({ actionLoading: false });
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },

      createCustomPlan: async (data: CreateCustomPlanPayload) => {
        set({ actionLoading: true });
        try {
          const plan = await crmService.createCustomPlan(data);
          if (data.leadId) {
            await get().fetchLeads();
            if (get().selectedLead?.id === data.leadId) {
              await get().fetchLeadDetail(data.leadId);
            }
          }
          set({ actionLoading: false });
          return plan;
        } catch (err) {
          set({ actionLoading: false });
          throw err;
        }
      },
    }),
    { name: "crm-store" },
  ),
);
