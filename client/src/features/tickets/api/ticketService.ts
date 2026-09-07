import api from '@/services/api';
import type { AxiosRequestConfig } from 'axios';
import type {
  CreateTicketInput,
  TicketAttachmentContract,
  TicketQueryInput,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  AgentFlightRecorder,
} from '@shared/contracts';

export interface TicketItem {
  id: string;
  title: string;
  description: string;
  category: TicketCategory | 'REPAIR' | 'WARRANTY' | 'SERVICE_OUTAGE' | 'PREVENTATIVE_MAINTENANCE' | 'HELPDESK' | 'AI';
  status: TicketStatus | 'OPEN' | 'IN_PROGRESS' | 'AWAITING_PAYMENT' | 'RESOLVED' | 'RESOLVED_AUTOMATED' | 'CLOSED' | 'CANCELLED';
  priority: TicketPriority | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  client_id?: string;
  clientId?: string;
  assigned_tech_id?: string | null;
  assignedTechId?: string | null;
  equipment_id?: string | null;
  equipmentId?: string | null;
  client_name?: string;
  clientName?: string;
  client_email?: string;
  clientEmail?: string;
  assigned_tech_name?: string | null;
  assignedTechName?: string | null;
  assigned_tech_email?: string | null;
  assignedTechEmail?: string | null;
  device_name?: string | null;
  deviceName?: string | null;
  source?: 'PORTAL' | 'AGENT' | 'EMAIL' | 'ALERT';
  reporter_name?: string | null;
  reporterName?: string | null;
  reporter_email?: string | null;
  reporterEmail?: string | null;
  device_snapshot?: AgentFlightRecorder | null;
  deviceSnapshot?: AgentFlightRecorder | null;
  created_at: string;
  createdAt?: string;
  updated_at: string;
  updatedAt?: string;
  events?: TicketTimelineItem[];
  attachments?: TicketAttachmentContract[];
}

export interface TicketAttachmentItem {
  id: string;
  ticketId?: string;
  ticket_id?: string;
  responseId?: string | null;
  response_id?: string | null;
  filename: string;
  path: string;
  mimeType?: string;
  mime_type?: string;
  sizeBytes?: number;
  size_bytes?: number;
  uploadedAt?: string;
  uploaded_at?: string;
}

export interface TicketTimelineItem {
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

export interface TicketResponseItem {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  tenant_id: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
  author_name?: string | null;
  authorName?: string | null;
  attachments?: TicketAttachmentItem[];
}

/**
 * ADR-002: API service client for Tickets.
 * Encapsulates all HTTP communication with the backend ticket domain.
 */
export const ticketService = {
  /**
   * Retrieves a paginated list of tickets according to filter and sorting criteria.
   */
  async getAll(
    params?: Record<string, string | number> | TicketQueryInput,
    config?: AxiosRequestConfig,
  ): Promise<{
    data: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const response = await api.get('/tickets', { params, ...config });
    return response.data;
  },

  /**
   * Retrieves detailed ticket information by its unique identifier.
   */
  async getById(id: string): Promise<any> {
    const response = await api.get(`/tickets/${id}`);
    return response.data.data;
  },

  /**
   * Submits a new support ticket.
   * Enforces subscription feature quota and automatically triggers round-robin technician dispatch.
   *
   * @see BL-102 (Round-Robin Dispatch)
   * @see BL-201 (Feature Quota)
   */
  async create(data: CreateTicketInput | Record<string, unknown>): Promise<any> {
    const response = await api.post('/tickets', data);
    return response.data.data;
  },

  /**
   * Updates the workflow status of an existing ticket.
   * Enforces 1-hour SLA cancellation window for WARRANTY / SERVICE_OUTAGE tickets.
   *
   * @see BL-101 (1-Hour SLA Cancellation)
   * @see BL-301 (RBAC & State Machine)
   */
  async updateStatus(id: string, status: string, notes?: string): Promise<any> {
    const response = await api.patch(`/tickets/${id}/status`, { status, notes });
    return response.data.data;
  },

  /**
   * Fetches the complete audit timeline of status and assignment events for a ticket.
   */
  async getTimeline(id: string): Promise<TicketTimelineItem[]> {
    const response = await api.get(`/tickets/${id}/timeline`);
    return response.data.data;
  },

  /**
   * Retrieves all file attachments uploaded for a given ticket.
   */
  async getAttachments(id: string): Promise<TicketAttachmentContract[]> {
    const response = await api.get(`/tickets/${id}/attachments`);
    return response.data.data;
  },

  /**
   * Uploads and attaches a file to a support ticket.
   */
  async uploadAttachment(id: string, file: File): Promise<TicketAttachmentContract> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/tickets/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  /**
   * Fetches aggregate counts of tickets grouped by status for dashboard metrics.
   */
  async getStatusSummary(): Promise<Record<string, number>> {
    const response = await api.get('/tickets/summary');
    return response.data.data;
  },

  /**
   * Assigns a ticket to a specific technician.
   */
  async assign(id: string, technicianId: string): Promise<any> {
    const response = await api.patch(`/tickets/${id}/assign`, { technicianId });
    return response.data.data;
  },

  /**
   * Retrieves conversation reply thread for a ticket.
   */
  async getResponses(id: string): Promise<TicketResponseItem[]> {
    const response = await api.get(`/tickets/${id}/responses`);
    return response.data.data;
  },

  /**
   * Appends a new communication reply to a ticket thread, optionally attaching files.
   */
  async createResponse(id: string, message: string, files?: File[]): Promise<TicketResponseItem> {
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
