import api from './api';

export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
export type MaintenanceType = 'PREDEFINED_6M' | 'PREDEFINED_3M' | 'PREDEFINED_12M' | 'CUSTOM_DATE';

export interface DeviceMaintenance {
  id: string;
  equipment_id: string;
  subscription_id: string;
  client_id: string;
  tenant_id: string;
  assigned_tech_id: string | null;
  scheduled_date: string;
  status: MaintenanceStatus;
  title: string;
  notes: string | null;
  maintenance_type: MaintenanceType;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  device_name?: string | null;
  device_serial?: string | null;
  client_name?: string | null;
  client_email?: string | null;
  assigned_tech_name?: string | null;
  service_name?: string | null;
}

export interface CreateMaintenancePayload {
  equipmentId: string;
  scheduledDate?: string;
  monthsAhead?: number;
  maintenanceType?: MaintenanceType;
  assignedTechId?: string | null;
  title?: string;
  notes?: string;
}

export interface UpdateMaintenancePayload {
  scheduledDate?: string;
  status?: MaintenanceStatus;
  assignedTechId?: string | null;
  title?: string;
  notes?: string;
}

export interface MaintenanceFilterParams {
  startDate?: string;
  endDate?: string;
  clientId?: string;
  techId?: string;
  equipmentId?: string;
  status?: MaintenanceStatus;
}

export const maintenanceService = {
  async getMaintenances(params?: MaintenanceFilterParams): Promise<DeviceMaintenance[]> {
    const response = await api.get('/maintenance', { params });
    return response.data.data;
  },

  async getById(id: string): Promise<DeviceMaintenance> {
    const response = await api.get(`/maintenance/${id}`);
    return response.data.data;
  },

  async createMaintenance(payload: CreateMaintenancePayload): Promise<DeviceMaintenance> {
    const response = await api.post('/maintenance', payload);
    return response.data.data;
  },

  async updateMaintenance(id: string, payload: UpdateMaintenancePayload): Promise<DeviceMaintenance> {
    const response = await api.put(`/maintenance/${id}`, payload);
    return response.data.data;
  },

  async deleteMaintenance(id: string): Promise<boolean> {
    const response = await api.delete(`/maintenance/${id}`);
    return response.data.data.success;
  },
};
