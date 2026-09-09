import api from '@/services/api';
import { getAuthItem } from '@/lib/authStorage';
import type { SubscriptionEquipment, DeviceVaultDetails } from '@shared/contracts';

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
  async activateWithOtp(data: {
    otp: string;
    subscriptionId: string;
    slotIndex: number;
    deviceName?: string;
    deviceSerial?: string;
  }): Promise<SubscriptionEquipment> {
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
   * @param data - Device attributes (name, serial, tenantId, otp).
   * @returns Promise resolving to created SubscriptionEquipment entity.
   */
  async addAdminDevice(data: {
    deviceName: string;
    deviceSerial?: string;
    tenantId?: string;
    otp: string;
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
  async getNextcloudInfo(
    subId: string,
    slotIndex: number,
  ): Promise<{
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

  /**
   * Constructs the URL for downloading the automated MSP Agent deployment script with a short-lived token.
   *
   * @param subId - Subscription UUID.
   * @param slotIndex - Slot index number.
   * @returns Promise resolving to script download URL.
   */
  async getAgentDeployScriptUrl(subId: string, slotIndex: number): Promise<string> {
    const baseUrl = api.defaults.baseURL || '/api/v1';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const cleanBaseUrl = baseUrl.startsWith('http')
      ? baseUrl
      : `${origin}${baseUrl.startsWith('/') ? '' : '/'}${baseUrl}`;

    try {
      const response = await api.get(`/equipment/subscriptions/${subId}/slots/${slotIndex}/deploy-token`);
      const deployToken = response.data?.data?.token;
      if (deployToken) {
        return `${cleanBaseUrl}/equipment/subscriptions/${subId}/slots/${slotIndex}/agent-deploy-script?token=${encodeURIComponent(deployToken)}`;
      }
    } catch {
      // Fallback to accessToken from storage if offline or during degraded state
    }

    const token = getAuthItem('accessToken');
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${cleanBaseUrl}/equipment/subscriptions/${subId}/slots/${slotIndex}/agent-deploy-script${tokenQuery}`;
  },

  /**
   * Retrieves the Vaultwarden password management status and connection details for an equipment slot.
   *
   * @param equipmentId - Equipment slot UUID.
   * @returns Promise resolving to DeviceVaultDetails.
   */
  async getDeviceVault(equipmentId: string): Promise<DeviceVaultDetails> {
    const response = await api.get(`/equipment/${equipmentId}/vault`);
    return response.data.data;
  },

  /**
   * Provisions a dedicated Vaultwarden collection and device identity for an equipment slot.
   *
   * @param equipmentId - Equipment slot UUID.
   * @returns Promise resolving to provisioned DeviceVaultDetails.
   */
  async provisionDeviceVault(equipmentId: string): Promise<DeviceVaultDetails> {
    const response = await api.post(`/equipment/${equipmentId}/vault/provision`);
    return response.data.data;
  },

  /**
   * Revokes active Vaultwarden credentials and locks session for an equipment slot.
   *
   * @param equipmentId - Equipment slot UUID.
   * @param reason - Optional revocation reason.
   * @returns Promise resolving to locked DeviceVaultDetails.
   */
  async revokeDeviceVault(equipmentId: string, reason?: string): Promise<DeviceVaultDetails> {
    const response = await api.post(`/equipment/${equipmentId}/vault/revoke`, { reason });
    return response.data.data;
  },

  /**
   * Triggers an autonomous self-upgrade on a remote endpoint agent.
   *
   * @param equipmentId - Equipment slot UUID.
   * @param targetVersion - Optional target semver version.
   * @returns Promise resolving to upgrade status confirmation.
   */
  async upgradeAgent(
    equipmentId: string,
    targetVersion?: string
  ): Promise<{
    success: boolean;
    message: string;
    targetVersion: string;
    equipmentId: string;
    rollbackTimeoutSecs: number;
  }> {
    const response = await api.post(`/rmm/agent/${equipmentId}/upgrade`, {
      targetVersion,
    });
    return response.data;
  },
};
