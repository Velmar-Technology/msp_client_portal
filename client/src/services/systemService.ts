import api from './api';

export interface StorageStatus {
  used: number;
  available: number | 'unlimited' | 'unknown';
  total: number | 'unlimited' | 'unknown';
  percentage: number;
  status: 'online' | 'offline';
}

export const systemService = {
  async getStorageUsage(): Promise<StorageStatus> {
    const response = await api.get('/system/storage');
    return response.data.data;
  },
};
