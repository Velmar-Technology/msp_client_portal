import api from "@/services/api";

export interface SubscriptionEquipment {
  id: string;
  subscription_id: string;
  slot_index: number;
  status: 'PENDING_ACTIVATION' | 'ACTIVE';
  device_name: string | null;
  device_serial: string | null;
  agent_instance_id?: string | null;
  agent_hostname?: string | null;
  agent_serial?: string | null;
  agent_last_seen_at?: string | null;
  otp: string | null;
  otp_expires_at: string | null;
  nextcloud_username: string | null;
  nextcloud_password: string | null;
  tenant_id: string;
  nextcloud_used_bytes?: number;
  nextcloud_total_bytes?: number;
  agent_status?: 'ONLINE' | 'OFFLINE' | 'UNKNOWN' | string | null;
  cpu_usage?: number | null;
  memory_usage?: number | null;
  disk_usage?: number | string | null;
  disk_used_gb?: number | string | null;
  disk_total_gb?: number | string | null;
  pending_patch_count?: number | null;
  uptime?: string | number | null;
  uptime_seconds?: number | null;
  last_sync_at?: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
  client_email?: string;
  client_role?: string;
  service_name?: string;
  plan?: string;
  tenant_name?: string;
  subscription_status?: string;
}

export const equipmentService = {
  async getMyDevices(): Promise<SubscriptionEquipment[]> {
    const response = await api.get('/equipment/my-devices');
    return response.data.data;
  },

  async getSlots(subId: string): Promise<SubscriptionEquipment[]> {
    const response = await api.get(`/equipment/subscriptions/${subId}/slots`);
    return response.data.data;
  },

  async activateWithOtp(
    data: {
      otp: string;
      subscriptionId: string;
      slotIndex: number;
      deviceName?: string;
      deviceSerial?: string;
    }
  ): Promise<SubscriptionEquipment> {
    const response = await api.post('/equipment/activate-with-otp', data);
    return response.data.data;
  },

  async getAgentIdentityByOtp(otp: string): Promise<{
    hostname: string | null;
    serial: string | null;
    lastSeenAt: string | null;
  }> {
    const response = await api.get('/equipment/agent-identity', {
      params: { otp },
    });
    return response.data.data;
  },

  async deactivateSlot(subId: string, slotIndex: number): Promise<SubscriptionEquipment> {
    const response = await api.post(`/equipment/subscriptions/${subId}/slots/${slotIndex}/deactivate`);
    return response.data.data;
  },

  async getAllDevicesForAdmin(): Promise<SubscriptionEquipment[]> {
    const response = await api.get('/equipment/admin/devices');
    return response.data.data;
  },

  async addAdminDevice(data: {
    deviceName: string;
    deviceSerial?: string;
    tenantId?: string;
  }): Promise<SubscriptionEquipment> {
    const response = await api.post('/equipment/admin/devices', data);
    return response.data.data;
  },

  async deleteAdminDevice(equipmentId: string): Promise<{ success: boolean; id: string }> {
    const response = await api.delete(`/equipment/admin/devices/${equipmentId}`);
    return response.data.data;
  },

  async getNextcloudInfo(subId: string, slotIndex: number): Promise<{
    nextcloud_username: string | null;
    nextcloud_password: string | null;
    nextcloud_used_bytes: number;
    nextcloud_total_bytes: number;
    device_name: string | null;
    device_serial: string | null;
    status: string;
  }> {
    const response = await api.get(`/equipment/subscriptions/${subId}/slots/${slotIndex}/nextcloud`);
    return response.data.data;
  },

  async getDeployScriptUrl(subId: string, slotIndex: number): Promise<string> {
    const baseUrl = api.defaults.baseURL || '';
    return `${baseUrl}/equipment/subscriptions/${subId}/slots/${slotIndex}/deploy-script`;
  },
};
