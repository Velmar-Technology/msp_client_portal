import api from "@/services/api";

export interface SubscriptionEquipment {
  id: string;
  subscription_id: string;
  slot_index: number;
  status: 'PENDING_ACTIVATION' | 'ACTIVE';
  device_name: string | null;
  device_serial: string | null;
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

  async generateOTP(subId: string, slotIndex: number): Promise<SubscriptionEquipment> {
    const response = await api.post(`/equipment/subscriptions/${subId}/slots/${slotIndex}/otp`);
    return response.data.data;
  },

  async activateSlot(
    subId: string,
    slotIndex: number,
    deviceName: string,
    deviceSerial: string
  ): Promise<SubscriptionEquipment> {
    const response = await api.post(`/equipment/subscriptions/${subId}/slots/${slotIndex}/activate`, {
      deviceName,
      deviceSerial,
    });
    return response.data.data;
  },

  async activateWithOtp(otp: string, deviceName: string, deviceSerial: string): Promise<SubscriptionEquipment> {
    const response = await api.post('/equipment/activate-with-otp', {
      otp,
      deviceName,
      deviceSerial,
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
};
