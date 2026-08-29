import api from "@/services/api";

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

/**
 * Preventative and scheduled hardware maintenance service.
 * Coordinates maintenance windows, technician assignments, and service schedules.
 */
export const maintenanceService = {
  /**
   * Retrieves scheduled maintenance tasks matching filter criteria.
   *
   * @param params - Query parameters (startDate, endDate, clientId, techId, equipmentId, status).
   * @returns Promise resolving to list of DeviceMaintenance records.
   */
  async getMaintenances(params?: MaintenanceFilterParams): Promise<DeviceMaintenance[]> {
    const response = await api.get('/maintenance', { params });
    return response.data.data;
  },

  /**
   * Retrieves a specific maintenance task by its unique ID.
   *
   * @param id - Maintenance UUID.
   * @returns Promise resolving to DeviceMaintenance entity.
   * @throws {NotFoundError} If maintenance record does not exist.
   */
  async getById(id: string): Promise<DeviceMaintenance> {
    const response = await api.get(`/maintenance/${id}`);
    return response.data.data;
  },

  /**
   * Schedules a new device maintenance task.
   *
   * @param payload - Maintenance creation attributes (equipmentId, scheduledDate, monthsAhead, maintenanceType, assignedTechId, title, notes).
   * @returns Promise resolving to scheduled DeviceMaintenance entity.
   */
  async createMaintenance(payload: CreateMaintenancePayload): Promise<DeviceMaintenance> {
    const response = await api.post('/maintenance', payload);
    return response.data.data;
  },

  /**
   * Updates an existing maintenance schedule, status, or assigned technician.
   *
   * @param id - Maintenance UUID.
   * @param payload - Updated maintenance attributes.
   * @returns Promise resolving to updated DeviceMaintenance entity.
   */
  async updateMaintenance(id: string, payload: UpdateMaintenancePayload): Promise<DeviceMaintenance> {
    const response = await api.put(`/maintenance/${id}`, payload);
    return response.data.data;
  },

  /**
   * Cancels and deletes a scheduled maintenance task.
   *
   * @param id - Maintenance UUID.
   * @returns Promise resolving to boolean indicating success.
   */
  async deleteMaintenance(id: string): Promise<boolean> {
    const response = await api.delete(`/maintenance/${id}`);
    return response.data.data.success;
  },
};
