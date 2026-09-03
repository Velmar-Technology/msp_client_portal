import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ticketService } from "@/services/ticketService";
import type { CreateTicketInput, UpdateTicketStatusInput, TicketQueryInput } from "@shared/contracts";

export const TICKET_QUERY_KEYS = {
  all: ["tickets"] as const,
  lists: () => [...TICKET_QUERY_KEYS.all, "list"] as const,
  list: (filters: TicketQueryInput) => [...TICKET_QUERY_KEYS.lists(), filters] as const,
  details: () => [...TICKET_QUERY_KEYS.all, "detail"] as const,
  detail: (id: string) => [...TICKET_QUERY_KEYS.details(), id] as const,
};

/**
 * Query hook for paginated and filtered ticket list.
 * Automatically tracks loading, error, and cached data states.
 */
export function useTickets(filters: TicketQueryInput) {
  return useQuery({
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
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Query hook for fetching a single ticket by its UUID.
 */
export function useTicket(id?: string) {
  return useQuery({
    queryKey: TICKET_QUERY_KEYS.detail(id || ""),
    queryFn: async () => {
      if (!id) throw new Error("Ticket ID required");
      return await ticketService.getById(id);
    },
    enabled: Boolean(id),
  });
}

/**
 * Mutation hook for creating a new ticket.
 * Automatically invalidates active ticket queries upon creation.
 */
export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateTicketInput) => {
      return await ticketService.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.lists() });
    },
  });
}

/**
 * Mutation hook for transitioning ticket status.
 * Automatically invalidates relevant ticket queries and detail views.
 */
export function useUpdateTicketStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTicketStatusInput }) => {
      return await ticketService.updateStatus(id, data.status, data.notes ?? undefined);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: TICKET_QUERY_KEYS.detail(variables.id) });
    },
  });
}
