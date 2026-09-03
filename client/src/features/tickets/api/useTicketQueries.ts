import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from './ticketService';
import type {
  CreateTicketInput,
  UpdateTicketStatusInput,
  AssignTicketInput,
  TicketQueryInput,
} from '@shared/contracts';

/**
 * ADR-002 / ADR-001: Query Keys and TanStack Query hooks for Tickets.
 */
export const TICKET_QUERY_KEYS = {
  all: ['tickets'] as const,
  lists: () => [...TICKET_QUERY_KEYS.all, 'list'] as const,
  list: (filters: TicketQueryInput | Record<string, unknown>) =>
    [...TICKET_QUERY_KEYS.lists(), filters] as const,
  details: () => [...TICKET_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...TICKET_QUERY_KEYS.details(), id] as const,
  timeline: (id: string) => [...TICKET_QUERY_KEYS.detail(id), 'timeline'] as const,
  attachments: (id: string) => [...TICKET_QUERY_KEYS.detail(id), 'attachments'] as const,
  responses: (id: string) => [...TICKET_QUERY_KEYS.detail(id), 'responses'] as const,
  summary: () => [...TICKET_QUERY_KEYS.all, 'summary'] as const,
};

/**
 * SOTA / ADR-003 Query Options for Ticket loaders and hooks
 */
export const ticketQueryOptions = {
  list: (filters: TicketQueryInput | Record<string, unknown> = {}) => ({
    queryKey: TICKET_QUERY_KEYS.list(filters),
    queryFn: async () => {
      const response = await ticketService.getAll(filters as Record<string, string | number>);
      return {
        tickets: response.data || [],
        total: response.pagination?.total ?? 0,
        page: response.pagination?.page ?? 1,
        limit: response.pagination?.limit ?? 10,
        totalPages: response.pagination?.totalPages ?? 1,
      };
    },
  }),
  detail: (id: string) => ({
    queryKey: TICKET_QUERY_KEYS.detail(id),
    queryFn: async () => {
      if (!id) throw new Error('Ticket ID required');
      return await ticketService.getById(id);
    },
  }),
};

/**
 * Query hook for paginated and filtered ticket list.
 */
export function useTickets(filters: TicketQueryInput | Record<string, unknown> = {}) {
  return useQuery({
    ...ticketQueryOptions.list(filters),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Query hook for fetching a single ticket by its UUID.
 */
export function useTicket(id?: string) {
  return useQuery({
    ...ticketQueryOptions.detail(id || ''),
    enabled: Boolean(id),
  });
}

/**
 * Query hook for fetching a ticket's audit timeline.
 */
export function useTicketTimeline(id?: string) {
  return useQuery({
    queryKey: TICKET_QUERY_KEYS.timeline(id || ''),
    queryFn: async () => {
      if (!id) return [];
      return await ticketService.getTimeline(id);
    },
    enabled: Boolean(id),
  });
}

/**
 * Query hook for fetching attachments for a ticket.
 */
export function useTicketAttachments(id?: string) {
  return useQuery({
    queryKey: TICKET_QUERY_KEYS.attachments(id || ''),
    queryFn: async () => {
      if (!id) return [];
      return await ticketService.getAttachments(id);
    },
    enabled: Boolean(id),
  });
}

/**
 * Query hook for fetching ticket reply responses.
 */
export function useTicketResponses(id?: string) {
  return useQuery({
    queryKey: TICKET_QUERY_KEYS.responses(id || ''),
    queryFn: async () => {
      if (!id) return [];
      return await ticketService.getResponses(id);
    },
    enabled: Boolean(id),
  });
}

/**
 * Query hook for aggregate ticket summary counts.
 */
export function useTicketSummary() {
  return useQuery({
    queryKey: TICKET_QUERY_KEYS.summary(),
    queryFn: async () => {
      return await ticketService.getStatusSummary();
    },
  });
}

/**
 * Mutation hook for creating a new ticket.
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTicketInput | Record<string, unknown>) => {
      return await ticketService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.summary() });
    },
  });
}

/**
 * Mutation hook for transitioning ticket status.
 */
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateTicketStatusInput | { status: string; notes?: string | null };
    }) => {
      return await ticketService.updateStatus(id, data.status, data.notes ?? undefined);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.timeline(variables.id) });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.summary() });
    },
  });
}

/**
 * Mutation hook for assigning a technician.
 */
export function useAssignTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AssignTicketInput | { technicianId: string } }) => {
      return await ticketService.assign(id, data.technicianId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.timeline(variables.id) });
    },
  });
}

/**
 * Mutation hook for adding a response to a ticket thread.
 */
export function useCreateTicketResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, message, files }: { id: string; message: string; files?: File[] }) => {
      return await ticketService.createResponse(id, message, files);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.responses(variables.id) });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.detail(variables.id) });
    },
  });
}

/**
 * Mutation hook for uploading a file attachment to a ticket.
 */
export function useUploadTicketAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      return await ticketService.uploadAttachment(id, file);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.attachments(variables.id) });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.detail(variables.id) });
    },
  });
}
