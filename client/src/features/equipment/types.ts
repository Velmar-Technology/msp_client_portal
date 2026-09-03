/**
 * Ephemeral UI types for Equipment and Devices feature per ADR-002.
 * Strictly forbidden from declaring backend entity interfaces or contracts.
 */

export type DeviceTab = 'devices' | 'rmm' | 'slots';

export type DeviceModalType =
  | 'activate-otp'
  | 'add-device'
  | 'deploy-agent'
  | 'nextcloud-info'
  | 'delete-device';

export interface DeviceFilterState {
  search?: string;
  status?: string;
  clientId?: string;
  planId?: string;
  page?: number;
  limit?: number;
}
