import api from "@/services/api";

export interface StorageStatus {
  used: number;
  available: number | 'unlimited' | 'unknown';
  total: number | 'unlimited' | 'unknown';
  percentage: number;
  status: 'online' | 'offline';
}

export interface ApiStatusItem {
  id: string;
  name: string;
  category: 'CORE' | 'SERVICES' | 'BUSINESS' | 'INTEGRATION';
  endpoint: string;
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  latencyMs: number;
  uptimePercentage: number;
  lastChecked: string;
  message?: string;
}

export type EnvVarCategory =
  | 'DATABASE'
  | 'SERVER'
  | 'SECURITY'
  | 'EMAIL'
  | 'WHATSAPP'
  | 'UPLOADS'
  | 'OAUTH'
  | 'STORAGE'
  | 'PAYPAL'
  | 'RMM';

export interface EnvVarStatusItem {
  key: string;
  category: EnvVarCategory;
  status: 'CONFIGURED' | 'DEFAULT_PLACEHOLDER' | 'MISSING';
  isSecret: boolean;
  valueDisplay: string;
  description: string;
}

export interface SystemApiStatusResponse {
  overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  averageLatencyMs: number;
  totalServices: number;
  operationalCount: number;
  degradedCount: number;
  downCount: number;
  lastChecked: string;
  services: ApiStatusItem[];
  envVariables: EnvVarStatusItem[];
  envTotal: number;
  envConfiguredCount: number;
  envDegradedCount: number;
  envMissingCount: number;
}

export const systemService = {
  async getStorageUsage(): Promise<StorageStatus> {
    const response = await api.get('/system/storage');
    return response.data.data;
  },

  async getApiStatus(): Promise<SystemApiStatusResponse> {
    const response = await api.get('/system/api-status');
    return response.data.data;
  },
};
