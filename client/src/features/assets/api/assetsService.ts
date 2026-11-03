import api from '@/services/api';
import type {
  AssetContract,
  AssetListResponse,
  CreateAssetInput,
  UpdateAssetInput,
  AssetFilterQuery,
  ConsumableContract,
  ConsumableListResponse,
  CreateConsumableInput,
  UpdateConsumableInput,
  CheckoutConsumableInput,
  RestockConsumableInput,
  ConsumableCheckoutContract,
} from '@shared/contracts';

/**
 * Service for IT Asset Management API operations.
 */
export const assetsService = {
  /**
   * Retrieves all IT assets for the tenant with optional search & filtering.
   */
  async getAssets(filters?: AssetFilterQuery): Promise<AssetListResponse> {
    const res = await api.get<{ success: boolean; data: AssetListResponse }>('/assets', {
      params: filters,
    });
    return res.data.data;
  },

  /**
   * Retrieves a single IT asset by ID.
   */
  async getAssetById(id: string): Promise<AssetContract> {
    const res = await api.get<{ success: boolean; data: AssetContract }>(`/assets/${id}`);
    return res.data.data;
  },

  /**
   * Creates a new IT asset record.
   */
  async createAsset(payload: CreateAssetInput): Promise<AssetContract> {
    const res = await api.post<{ success: boolean; data: AssetContract }>('/assets', payload);
    return res.data.data;
  },

  /**
   * Updates an existing IT asset record.
   */
  async updateAsset(id: string, payload: UpdateAssetInput): Promise<AssetContract> {
    const res = await api.patch<{ success: boolean; data: AssetContract }>(`/assets/${id}`, payload);
    return res.data.data;
  },

  /**
   * Soft deletes an IT asset record.
   */
  async deleteAsset(id: string): Promise<{ success: true }> {
    const res = await api.delete<{ success: boolean; data: { success: true } }>(`/assets/${id}`);
    return res.data.data;
  },

  /**
   * Retrieves all consumables for the tenant with optional search.
   */
  async getConsumables(search?: string): Promise<ConsumableListResponse> {
    const res = await api.get<{ success: boolean; data: ConsumableListResponse }>('/assets/consumables', {
      params: search ? { search } : undefined,
    });
    return res.data.data;
  },

  /**
   * Retrieves a single consumable by ID.
   */
  async getConsumableById(id: string): Promise<ConsumableContract> {
    const res = await api.get<{ success: boolean; data: ConsumableContract }>(`/assets/consumables/${id}`);
    return res.data.data;
  },

  /**
   * Creates a new consumable record.
   */
  async createConsumable(payload: CreateConsumableInput): Promise<ConsumableContract> {
    const res = await api.post<{ success: boolean; data: ConsumableContract }>('/assets/consumables', payload);
    return res.data.data;
  },

  /**
   * Updates an existing consumable record.
   */
  async updateConsumable(id: string, payload: UpdateConsumableInput): Promise<ConsumableContract> {
    const res = await api.patch<{ success: boolean; data: ConsumableContract }>(`/assets/consumables/${id}`, payload);
    return res.data.data;
  },

  /**
   * Soft deletes a consumable record.
   */
  async deleteConsumable(id: string): Promise<{ success: true }> {
    const res = await api.delete<{ success: boolean; data: { success: true } }>(`/assets/consumables/${id}`);
    return res.data.data;
  },

  /**
   * Checks out / dispenses consumable stock.
   */
  async checkoutConsumable(id: string, payload: CheckoutConsumableInput): Promise<ConsumableContract> {
    const res = await api.post<{ success: boolean; data: ConsumableContract }>(
      `/assets/consumables/${id}/checkout`,
      payload
    );
    return res.data.data;
  },

  /**
   * Restocks consumable inventory.
   */
  async restockConsumable(id: string, payload: RestockConsumableInput): Promise<ConsumableContract> {
    const res = await api.post<{ success: boolean; data: ConsumableContract }>(
      `/assets/consumables/${id}/restock`,
      payload
    );
    return res.data.data;
  },

  /**
   * Retrieves checkout audit ledger for a consumable.
   */
  async getConsumableCheckouts(id: string): Promise<ConsumableCheckoutContract[]> {
    const res = await api.get<{ success: boolean; data: ConsumableCheckoutContract[] }>(
      `/assets/consumables/${id}/checkouts`
    );
    return res.data.data;
  },
};
