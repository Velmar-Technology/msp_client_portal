import { AssetRepository, assetRepository, AssetWithRelations } from '../repositories/AssetRepository';
import { NotFoundError, ValidationError } from '@shared/errors';
import {
  CreateAssetInput,
  UpdateAssetInput,
  AssetFilterQuery,
  AssetContract,
  AssetListResponse,
} from '@shared/contracts';
import { Asset, NewAsset } from '@shared/db';

/**
 * Domain service managing IT asset inventory, lifecycle transitions, and client hardware mappings.
 *
 * @see BL-204
 */
export class AssetService {
  /**
   * Initializes AssetService with injected repository.
   *
   * @param repo - Asset repository instance
   */
  constructor(private readonly repo: AssetRepository = assetRepository) {}

  /**
   * Formats a raw database asset record into an API-compliant AssetContract.
   *
   * @param record - Asset record with relation joins
   * @returns Formatted AssetContract
   */
  private formatAsset(record: AssetWithRelations): AssetContract {
    return {
      id: record.id,
      tenantId: record.tenant_id,
      name: record.name,
      assetType: record.asset_type as AssetContract['assetType'],
      status: record.status as AssetContract['status'],
      model: record.model,
      serialNumber: record.serial_number,
      manufacturer: record.manufacturer,
      assignedClientId: record.assigned_client_id,
      assignedClientName: record.assigned_client_name ?? null,
      assignedEquipmentId: record.assigned_equipment_id,
      assignedEquipmentName: record.assigned_equipment_name ?? null,
      purchaseDate: record.purchase_date ? record.purchase_date.toISOString() : null,
      warrantyExpiresAt: record.warranty_expires_at ? record.warranty_expires_at.toISOString() : null,
      notes: record.notes,
      createdAt: record.created_at ? record.created_at.toISOString() : new Date().toISOString(),
      updatedAt: record.updated_at ? record.updated_at.toISOString() : new Date().toISOString(),
      deletedAt: record.deleted_at ? record.deleted_at.toISOString() : null,
    };
  }

  /**
   * Lists all assets for a tenant matching optional criteria.
   *
   * @param tenantId - Tenant UUID
   * @param filters - Optional search, type, and status filters
   * @returns Asset list response with aggregate counts
   * @throws {ValidationError} When tenantId is missing
   */
  async listAssets(tenantId: string, filters?: AssetFilterQuery): Promise<AssetListResponse> {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const records = await this.repo.listByTenant(tenantId, filters);
    const assets = records.map((r) => this.formatAsset(r));

    const activeCount = assets.filter((a) => a.status === 'ACTIVE').length;
    const maintenanceCount = assets.filter((a) => a.status === 'MAINTENANCE').length;

    return {
      assets,
      total: assets.length,
      activeCount,
      maintenanceCount,
    };
  }

  /**
   * Retrieves a single asset by unique ID within the tenant context.
   *
   * @param tenantId - Tenant UUID
   * @param id - Asset UUID
   * @returns AssetContract representation
   * @throws {NotFoundError} If the asset does not exist or has been deleted
   */
  async getAsset(tenantId: string, id: string): Promise<AssetContract> {
    const record = await this.repo.findByIdAndTenant(id, tenantId);
    if (!record) {
      throw new NotFoundError(`Asset with ID ${id} not found`);
    }
    return this.formatAsset(record);
  }

  /**
   * Creates a new IT asset record within the caller's tenant.
   *
   * @param tenantId - Tenant UUID
   * @param input - Validated creation payload
   * @returns Newly created AssetContract
   * @throws {ValidationError} If tenantId is missing
   */
  async createAsset(tenantId: string, input: CreateAssetInput): Promise<AssetContract> {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const newRecord: NewAsset = {
      tenant_id: tenantId,
      name: input.name,
      asset_type: input.assetType ?? 'HARDWARE',
      status: input.status ?? 'ACTIVE',
      model: input.model ?? null,
      serial_number: input.serialNumber ?? null,
      manufacturer: input.manufacturer ?? null,
      assigned_client_id: input.assignedClientId ?? null,
      assigned_equipment_id: input.assignedEquipmentId ?? null,
      purchase_date: input.purchaseDate ? new Date(input.purchaseDate) : null,
      warranty_expires_at: input.warrantyExpiresAt ? new Date(input.warrantyExpiresAt) : null,
      notes: input.notes ?? null,
    };

    const created = await this.repo.create(newRecord);
    return this.getAsset(tenantId, created.id);
  }

  /**
   * Updates an existing IT asset for a tenant.
   *
   * @param tenantId - Tenant UUID
   * @param id - Asset UUID
   * @param input - Partial update payload
   * @returns Updated AssetContract
   * @throws {NotFoundError} If the asset does not exist
   */
  async updateAsset(
    tenantId: string,
    id: string,
    input: UpdateAssetInput
  ): Promise<AssetContract> {
    const existing = await this.repo.findByIdAndTenant(id, tenantId);
    if (!existing) {
      throw new NotFoundError(`Asset with ID ${id} not found`);
    }

    const updatePayload: Partial<NewAsset> = {};
    if (input.name !== undefined) updatePayload.name = input.name;
    if (input.assetType !== undefined) updatePayload.asset_type = input.assetType;
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.model !== undefined) updatePayload.model = input.model;
    if (input.serialNumber !== undefined) updatePayload.serial_number = input.serialNumber;
    if (input.manufacturer !== undefined) updatePayload.manufacturer = input.manufacturer;
    if (input.assignedClientId !== undefined) updatePayload.assigned_client_id = input.assignedClientId;
    if (input.assignedEquipmentId !== undefined) updatePayload.assigned_equipment_id = input.assignedEquipmentId;
    if (input.purchaseDate !== undefined) {
      updatePayload.purchase_date = input.purchaseDate ? new Date(input.purchaseDate) : null;
    }
    if (input.warrantyExpiresAt !== undefined) {
      updatePayload.warranty_expires_at = input.warrantyExpiresAt ? new Date(input.warrantyExpiresAt) : null;
    }
    if (input.notes !== undefined) updatePayload.notes = input.notes;

    await this.repo.update(id, tenantId, updatePayload);
    return this.getAsset(tenantId, id);
  }

  /**
   * Soft-deletes an asset from the tenant inventory.
   *
   * @param tenantId - Tenant UUID
   * @param id - Asset UUID
   * @returns Success acknowledgment
   * @throws {NotFoundError} If the asset does not exist
   */
  async deleteAsset(tenantId: string, id: string): Promise<{ success: true }> {
    const deleted = await this.repo.softDelete(id, tenantId);
    if (!deleted) {
      throw new NotFoundError(`Asset with ID ${id} not found`);
    }
    return { success: true };
  }
}

export const assetService = new AssetService();
