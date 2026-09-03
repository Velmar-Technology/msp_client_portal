import api from "@/services/api";
import type { AxiosRequestConfig } from 'axios';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: 'REPAIR' | 'WARRANTY' | 'SERVICE_OUTAGE' | 'PREVENTATIVE_MAINTENANCE' | 'HELPDESK' | 'AI';
  status: 'OPEN' | 'IN_PROGRESS' | 'AWAITING_PAYMENT' | 'RESOLVED' | 'RESOLVED_AUTOMATED' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  client_id: string;
  assigned_tech_id: string | null;
  equipment_id: string | null;
  client_name?: string;
  client_email?: string;
  assigned_tech_name?: string | null;
  assigned_tech_email?: string | null;
  device_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  response_id?: string | null;
  filename: string;
  path: string;
  mime_type: string;
  size_bytes: number;
  uploaded_at: string;
}

export interface TicketEvent {
  id: string;
  ticket_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  changed_by_name?: string;
  changed_by_role?: string;
  notes: string | null;
  created_at: string;
}

export interface TicketResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  tenant_id: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
  attachments?: TicketAttachment[];
}

export interface CreateTicketPayload {
  title: string;
  description: string;
  category: string;
  priority?: string;
  equipmentId?: string | null;
}

/**
 * Support ticket service.
 * Manages ticket lifecycle, categorization, SLA constraints, file attachments, and technician assignment.
 */
export const ticketService = {
  /**
   * Retrieves a paginated list of tickets according to filter and sorting criteria.
   *
   * @param params - Query parameters for pagination, status filters, priority, and category.
   * @param config - Optional Axios request configuration (e.g. AbortSignal).
   * @returns Promise resolving to paginated tickets data and metadata.
   */
  async getAll(params?: Record<string, string | number>, config?: AxiosRequestConfig): Promise<{ data: Ticket[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const response = await api.get('/tickets', { params, ...config });
    return response.data;
  },

  /**
   * Retrieves detailed ticket information by its unique identifier.
   *
   * @param id - Ticket UUID.
   * @returns Promise resolving to full ticket details.
   * @throws {NotFoundError} If the ticket is not found or user lacks access.
   */
  async getById(id: string): Promise<Ticket> {
    const response = await api.get(`/tickets/${id}`);
    return response.data.data;
  },

  /**
   * Submits a new support ticket.
   * Enforces subscription feature quota and automatically triggers round-robin technician dispatch.
   *
   * @see BL-102 (Round-Robin Dispatch)
   * @see BL-201 (Feature Quota)
   * @param data - Ticket payload including title, description, category, priority, and optional hardware equipment ID.
   * @returns Promise resolving to created Ticket entity.
   * @throws {TicketLimitExceededError} If ticket creation exceeds plan quota.
   * @throws {ValidationError} If required fields are missing or invalid.
   */
  async create(data: CreateTicketPayload): Promise<Ticket> {
    const response = await api.post('/tickets', data);
    return response.data.data;
  },

  /**
   * Updates the workflow status of an existing ticket.
   * Enforces 1-hour SLA cancellation window for WARRANTY / SERVICE_OUTAGE tickets.
   *
   * @see BL-101 (1-Hour SLA Cancellation)
   * @see BL-301 (RBAC & State Machine)
   * @param id - Ticket UUID.
   * @param status - Target status ('OPEN' | 'IN_PROGRESS' | 'AWAITING_PAYMENT' | 'RESOLVED' | 'CLOSED' | 'CANCELLED').
   * @param notes - Optional reason or resolution notes.
   * @returns Promise resolving to updated Ticket entity.
   * @throws {SlaViolationError} If cancellation is attempted outside the 60-minute window for SLA-governed tickets.
   * @throws {InvalidTransitionError} If the status transition violates the state machine.
   */
  async updateStatus(id: string, status: string, notes?: string): Promise<Ticket> {
    const response = await api.patch(`/tickets/${id}/status`, { status, notes });
    return response.data.data;
  },

  /**
   * Fetches the complete audit timeline of status and assignment events for a ticket.
   *
   * @param id - Ticket UUID.
   * @returns Promise resolving to ordered list of TicketEvent objects.
   */
  async getTimeline(id: string): Promise<TicketEvent[]> {
    const response = await api.get(`/tickets/${id}/timeline`);
    return response.data.data;
  },

  /**
   * Retrieves all file attachments uploaded for a given ticket.
   *
   * @param id - Ticket UUID.
   * @returns Promise resolving to list of TicketAttachment records.
   */
  async getAttachments(id: string): Promise<TicketAttachment[]> {
    const response = await api.get(`/tickets/${id}/attachments`);
    return response.data.data;
  },

  /**
   * Uploads and attaches a file to a support ticket.
   *
   * @param id - Ticket UUID.
   * @param file - File object from browser file input.
   * @returns Promise resolving to created TicketAttachment record.
   * @throws {ValidationError} If file exceeds allowed size or MIME type restrictions.
   */
  async uploadAttachment(id: string, file: File): Promise<TicketAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/tickets/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  /**
   * Fetches aggregate counts of tickets grouped by status for dashboard metrics.
   *
   * @returns Promise resolving to map of status keys to ticket counts.
   */
  async getStatusSummary(): Promise<Record<string, number>> {
    const response = await api.get('/tickets/summary');
    return response.data.data;
  },

  /**
   * Assigns a ticket to a specific technician.
   *
   * @param id - Ticket UUID.
   * @param technicianId - Target technician user UUID.
   * @returns Promise resolving to updated Ticket entity.
   * @throws {ForbiddenError} If non-admin/unauthorized user attempts assignment.
   */
  async assign(id: string, technicianId: string): Promise<Ticket> {
    const response = await api.patch(`/tickets/${id}/assign`, { technicianId });
    return response.data.data;
  },

  /**
   * Retrieves conversation reply thread for a ticket.
   *
   * @param id - Ticket UUID.
   * @returns Promise resolving to array of TicketResponse items with attachments.
   */
  async getResponses(id: string): Promise<TicketResponse[]> {
    const response = await api.get(`/tickets/${id}/responses`);
    return response.data.data;
  },

  /**
   * Appends a new communication reply to a ticket thread, optionally attaching files.
   *
   * @param id - Ticket UUID.
   * @param message - Text message content.
   * @param files - Optional list of File objects to upload alongside the reply.
   * @returns Promise resolving to created TicketResponse item.
   */
  async createResponse(id: string, message: string, files?: File[]): Promise<TicketResponse> {
    const formData = new FormData();
    formData.append('message', message);
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('files', file);
      });
    }
    const response = await api.post(`/tickets/${id}/responses`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },
};
