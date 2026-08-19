import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import type {
  MspServerConfig,
  TicketSummary,
  DeviceTelemetry,
  DevicePatch,
  EquipmentSlot,
  ClientHealthReport,
} from '../types.js';

export class MspApiClient {
  private client: AxiosInstance;
  private config: MspServerConfig;

  constructor(config: MspServerConfig) {
    this.config = config;
    const baseURL = config.apiUrl.replace(/\/+$/, '');
    
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiToken ? { Authorization: `Bearer ${config.apiToken}` } : {}),
        ...(config.tenantId ? { 'X-Tenant-Id': config.tenantId } : {}),
      },
    });
  }

  private async request<T>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.client.request<T>(config);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        const message =
          error.response.data?.message ||
          error.response.data?.error ||
          error.response.statusText ||
          'API request failed';
        throw new Error(`[MSP API Error ${status}]: ${message}`);
      }
      throw new Error(`[MSP Connection Error]: ${error.message}`);
    }
  }

  // --- Ticket Endpoints ---
  async getTicket(ticketId: string): Promise<TicketSummary> {
    return this.request<TicketSummary>({
      method: 'GET',
      url: `/tickets/${ticketId}`,
    });
  }

  async listTickets(params?: {
    status?: string;
    priority?: string;
    category?: string;
    assignedTechId?: string;
    tenantId?: string;
  }): Promise<TicketSummary[]> {
    return this.request<TicketSummary[]>({
      method: 'GET',
      url: '/tickets',
      params,
    });
  }

  async addTicketReply(ticketId: string, message: string, isInternal: boolean = false): Promise<any> {
    return this.request({
      method: 'POST',
      url: `/tickets/${ticketId}/responses`,
      data: { message, isInternal },
    });
  }

  async updateTicketStatus(
    ticketId: string,
    status: TicketSummary['status'],
    notes?: string
  ): Promise<TicketSummary> {
    return this.request<TicketSummary>({
      method: 'PATCH',
      url: `/tickets/${ticketId}/status`,
      data: { status, notes },
    });
  }

  // --- Equipment & Inventory Endpoints ---
  async getClientEquipment(tenantId?: string): Promise<EquipmentSlot[]> {
    return this.request<EquipmentSlot[]>({
      method: 'GET',
      url: '/equipment/slots',
      params: tenantId ? { tenantId } : undefined,
    });
  }

  // --- RMM Telemetry & Diagnostics ---
  async getDeviceTelemetry(equipmentId: string): Promise<DeviceTelemetry> {
    return this.request<DeviceTelemetry>({
      method: 'GET',
      url: `/rmm/telemetry/${equipmentId}`,
    });
  }

  async listDevicePatches(equipmentId: string, status?: string): Promise<DevicePatch[]> {
    return this.request<DevicePatch[]>({
      method: 'GET',
      url: `/rmm/patches/${equipmentId}`,
      params: status ? { status } : undefined,
    });
  }

  async getDeviceMaintenances(equipmentId: string): Promise<any[]> {
    return this.request<any[]>({
      method: 'GET',
      url: `/rmm/maintenance/equipment/${equipmentId}`,
    });
  }

  // --- Account Health / QBR Scoring (BL-501) ---
  async getClientHealth(tenantId: string): Promise<ClientHealthReport> {
    // Queries composite health metrics calculated per BL-501
    return this.request<ClientHealthReport>({
      method: 'GET',
      url: `/system/health/${tenantId}`,
    });
  }
}
