import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  crmService,
  type LeadStage,
  type CreateLeadPayload,
  type UpdateLeadPayload,
  type SendQuotationPayload,
  type ConvertLeadPayload,
  type CreateActivityPayload,
  type GetLeadsParams,
  type CreateCustomPlanPayload,
} from "./crmService";

/**
 * ADR-002 / ADR-001: Query Keys and TanStack Query hooks for CRM domain.
 */
export const CRM_QUERY_KEYS = {
  all: ["crm"] as const,
  leads: (filters?: GetLeadsParams) => [...CRM_QUERY_KEYS.all, "leads", filters] as const,
  lead: (id: string) => [...CRM_QUERY_KEYS.all, "lead", id] as const,
  stats: () => [...CRM_QUERY_KEYS.all, "stats"] as const,
  upcomingActivities: () => [...CRM_QUERY_KEYS.all, "activities", "upcoming"] as const,
  leadActivities: (leadId: string) => [...CRM_QUERY_KEYS.all, "lead", leadId, "activities"] as const,
  leadQuotations: (leadId: string) => [...CRM_QUERY_KEYS.all, "lead", leadId, "quotations"] as const,
};

export function useCrmLeads(params: GetLeadsParams = {}) {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.leads(params),
    queryFn: () => crmService.getLeads(params),
  });
}

export function useCrmStats() {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.stats(),
    queryFn: () => crmService.getStats(),
  });
}

export function useLeadDetail(leadId?: string | null) {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.lead(leadId ?? ""),
    queryFn: () => crmService.getLeadById(leadId!),
    enabled: Boolean(leadId),
  });
}

export function useUpcomingActivities() {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.upcomingActivities(),
    queryFn: () => crmService.getUpcomingActivities(),
  });
}

export function useLeadActivities(leadId?: string | null) {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.leadActivities(leadId ?? ""),
    queryFn: () => crmService.getActivities(leadId!),
    enabled: Boolean(leadId),
  });
}

export function useLeadQuotations(leadId?: string | null) {
  return useQuery({
    queryKey: CRM_QUERY_KEYS.leadQuotations(leadId ?? ""),
    queryFn: () => crmService.getQuotations(leadId!),
    enabled: Boolean(leadId),
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLeadPayload) => crmService.createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.all });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadPayload }) => crmService.updateLead(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.leads() });
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.lead(vars.id) });
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.stats() });
    },
  });
}

export function useUpdateLeadStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, lostReason }: { id: string; stage: LeadStage; lostReason?: string | null }) =>
      crmService.updateStage(id, stage, lostReason),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.leads() });
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.lead(vars.id) });
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.stats() });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => crmService.deleteLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.all });
    },
  });
}

export function useSendQuotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SendQuotationPayload) => crmService.sendQuotation(data),
    onSuccess: (_, vars) => {
      if (vars.leadId) {
        queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.leadQuotations(vars.leadId) });
        queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.leadActivities(vars.leadId) });
      }
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.stats() });
    },
  });
}

export function useConvertLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data?: ConvertLeadPayload }) =>
      crmService.convertLeadToSubscription(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.all });
    },
  });
}

export function useLogActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data: CreateActivityPayload }) =>
      crmService.logActivity(leadId, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.leadActivities(vars.leadId) });
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.upcomingActivities() });
    },
  });
}

export function useCreateCustomPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCustomPlanPayload) => crmService.createCustomPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CRM_QUERY_KEYS.all });
    },
  });
}
