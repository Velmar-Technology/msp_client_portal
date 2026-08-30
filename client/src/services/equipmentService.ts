import api from "@/services/api";
import { getAuthItem } from "@/lib/authStorage";

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
  monthly_ticket_count?: number;
  monthly_ticket_limit?: number | null;
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

/**
 * Hardware equipment and device inventory service.
 * Manages device onboarding via OTP, slot allocation, deactivation, Nextcloud storage credentials, and agent deploy scripts.
 */
export const equipmentService = {
  /**
   * Retrieves all hardware devices associated with the current client tenant.
   *
   * @returns Promise resolving to array of SubscriptionEquipment devices.
   */
  async getMyDevices(): Promise<SubscriptionEquipment[]> {
    const response = await api.get('/equipment/my-devices');
    return response.data.data;
  },

  /**
   * Retrieves all device slots for a specific subscription.
   *
   * @param subId - Subscription UUID.
   * @returns Promise resolving to array of SubscriptionEquipment slot objects.
   */
  async getSlots(subId: string): Promise<SubscriptionEquipment[]> {
    const response = await api.get(`/equipment/subscriptions/${subId}/slots`);
    return response.data.data;
  },

  /**
   * Activates an equipment slot using a one-time provisioning passcode (OTP).
   *
   * @param data - Activation payload containing OTP, subscriptionId, slotIndex, deviceName, and deviceSerial.
   * @returns Promise resolving to activated SubscriptionEquipment record.
   * @throws {ValidationError} If OTP is invalid or expired.
   */
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

  /**
   * Resolves agent device identity information using an activation OTP.
   *
   * @param otp - One-time provisioning passcode.
   * @returns Promise resolving to hostname, serial, and lastSeenAt timestamp.
   */
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

  /**
   * Deactivates and clears an assigned device slot.
   *
   * @param subId - Subscription UUID.
   * @param slotIndex - Slot index number (0-based).
   * @returns Promise resolving to updated SubscriptionEquipment record.
   */
  async deactivateSlot(subId: string, slotIndex: number): Promise<SubscriptionEquipment> {
    const response = await api.post(`/equipment/subscriptions/${subId}/slots/${slotIndex}/deactivate`);
    return response.data.data;
  },

  /**
   * Re-pairs/regenerates an OTP code for an unactivated or broken device slot.
   *
   * @param subId - Subscription UUID.
   * @param slotIndex - Slot index number.
   * @returns Promise resolving to updated SubscriptionEquipment with fresh OTP.
   */
  async repairSlot(subId: string, slotIndex: number): Promise<SubscriptionEquipment> {
    const response = await api.post(`/equipment/subscriptions/${subId}/slots/${slotIndex}/re-pair`);
    return response.data.data;
  },

  /**
   * Admin: Retrieves global hardware inventory across all client subscriptions.
   *
   * @returns Promise resolving to full array of SubscriptionEquipment devices.
   */
  async getAllDevicesForAdmin(): Promise<SubscriptionEquipment[]> {
    const response = await api.get('/equipment/admin/devices');
    return response.data.data;
  },

  /**
   * Admin: Directly provisions an administrative device record.
   *
   * @param data - Device attributes (name, serial, tenantId).
   * @returns Promise resolving to created SubscriptionEquipment entity.
   */
  async addAdminDevice(data: {
    deviceName: string;
    deviceSerial?: string;
    tenantId?: string;
  }): Promise<SubscriptionEquipment> {
    const response = await api.post('/equipment/admin/devices', data);
    return response.data.data;
  },

  /**
   * Admin: Deletes an administrative device record.
   *
   * @param equipmentId - Equipment UUID.
   * @returns Promise resolving to deletion confirmation.
   */
  async deleteAdminDevice(equipmentId: string): Promise<{ success: boolean; id: string }> {
    const response = await api.delete(`/equipment/admin/devices/${equipmentId}`);
    return response.data.data;
  },

  /**
   * Fetches Nextcloud cloud storage access credentials and quota utilization for a device slot.
   *
   * @param subId - Subscription UUID.
   * @param slotIndex - Slot index number.
   * @returns Promise resolving to Nextcloud credentials and storage metrics.
   */
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

  /**
   * Constructs the URL for downloading the automated RMM agent deployment script with a 5-minute short-lived token.
   *
   * @param subId - Subscription UUID.
   * @param slotIndex - Slot index number.
   * @returns Promise resolving to script download URL.
   */
  async getDeployScriptUrl(subId: string, slotIndex: number): Promise<string> {
    const baseUrl = api.defaults.baseURL || '/api/v1';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanBaseUrl = baseUrl.startsWith('http')
      ? baseUrl
      : `${origin}${baseUrl.startsWith('/') ? '' : '/'}${baseUrl}`;

    try {
      const response = await api.get(`/equipment/subscriptions/${subId}/slots/${slotIndex}/deploy-token`);
      const deployToken = response.data?.data?.token;
      if (deployToken) {
        return `${cleanBaseUrl}/equipment/subscriptions/${subId}/slots/${slotIndex}/deploy-script?token=${encodeURIComponent(deployToken)}`;
      }
    } catch {
      // Fallback to accessToken from storage if offline or during degraded state
    }

    const token = getAuthItem('accessToken');
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${cleanBaseUrl}/equipment/subscriptions/${subId}/slots/${slotIndex}/deploy-script${tokenQuery}`;
  },
};
