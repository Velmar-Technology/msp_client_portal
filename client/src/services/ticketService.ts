import api from './api';

export interface Ticket {
  id: string;
  title: string;
  description: string;
  category: 'REPAIR' | 'WARRANTY' | 'SERVICE_OUTAGE';
  status: 'OPEN' | 'IN_PROGRESS' | 'AWAITING_PAYMENT' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  client_id: string;
  assigned_tech_id: string | null;
  client_name?: string;
  client_email?: string;
  assigned_tech_name?: string | null;
  assigned_tech_email?: string | null;
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
}

export const ticketService = {
  async getAll(params?: Record<string, string | number>): Promise<{ data: Ticket[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const response = await api.get('/tickets', { params });
    return response.data;
  },

  async getById(id: string): Promise<Ticket> {
    const response = await api.get(`/tickets/${id}`);
    return response.data.data;
  },

  async create(data: CreateTicketPayload): Promise<Ticket> {
    const response = await api.post('/tickets', data);
    return response.data.data;
  },

  async updateStatus(id: string, status: string, notes?: string): Promise<Ticket> {
    const response = await api.patch(`/tickets/${id}/status`, { status, notes });
    return response.data.data;
  },

  async getTimeline(id: string): Promise<TicketEvent[]> {
    const response = await api.get(`/tickets/${id}/timeline`);
    return response.data.data;
  },

  async getAttachments(id: string): Promise<TicketAttachment[]> {
    const response = await api.get(`/tickets/${id}/attachments`);
    return response.data.data;
  },

  async uploadAttachment(id: string, file: File): Promise<TicketAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/tickets/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async getStatusSummary(): Promise<Record<string, number>> {
    const response = await api.get('/tickets/summary');
    return response.data.data;
  },

  async assign(id: string, technicianId: string): Promise<Ticket> {
    const response = await api.patch(`/tickets/${id}/assign`, { technicianId });
    return response.data.data;
  },

  async getResponses(id: string): Promise<TicketResponse[]> {
    const response = await api.get(`/tickets/${id}/responses`);
    return response.data.data;
  },

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
