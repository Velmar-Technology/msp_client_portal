import { BaseRepository } from '@shared/repositories/BaseRepository';
import { db, assets, users, subscriptionEquipment, Asset, NewAsset } from '@shared/db';
import { eq, and, isNull, desc, ilike, or, SQL } from 'drizzle-orm';
import { AssetFilterQuery } from '@shared/contracts';

export interface AssetWithRelations extends Asset {
  assigned_client_name?: string | null;
  assigned_equipment_name?: string | null;
}

/**
 * Data repository for IT asset inventory, status transitions, and client/hardware bindings.
 */
export class AssetRepository extends BaseRepository<Asset> {
  constructor() {
    super(assets, 'assets');
  }

  /**
   * Retrieves all non-deleted assets for a tenant with optional filtering.
   *
   * @param tenantId - Tenant UUID
   * @param filters - Optional search, type, status, and client filters
   * @returns Array of assets with linked client and equipment names
   */
  async listByTenant(
    tenantId: string,
    filters?: AssetFilterQuery
  ): Promise<AssetWithRelations[]> {
    const conditions: SQL[] = [
      eq(assets.tenant_id, tenantId),
      isNull(assets.deleted_at),
    ];

    if (filters?.type) {
      conditions.push(eq(assets.asset_type, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(assets.status, filters.status));
    }
    if (filters?.assignedClientId) {
      conditions.push(eq(assets.assigned_client_id, filters.assignedClientId));
    }
    if (filters?.search && filters.search.trim().length > 0) {
      const term = `%${filters.search.trim()}%`;
      conditions.push(
        or(
          ilike(assets.name, term),
          ilike(assets.model, term),
          ilike(assets.serial_number, term),
          ilike(assets.manufacturer, term)
        )!
      );
    }

    const rows = await db
      .select({
        asset: assets,
        clientName: users.name,
        equipmentName: subscriptionEquipment.device_name,
      })
      .from(assets)
      .leftJoin(users, eq(assets.assigned_client_id, users.id))
      .leftJoin(subscriptionEquipment, eq(assets.assigned_equipment_id, subscriptionEquipment.id))
      .where(and(...conditions))
      .orderBy(desc(assets.created_at));

    return rows.map((r) => ({
      ...r.asset,
      assigned_client_name: r.clientName ?? null,
      assigned_equipment_name: r.equipmentName ?? null,
    }));
  }

  /**
   * Finds a specific asset belonging to a tenant.
   *
   * @param id - Asset UUID
   * @param tenantId - Tenant UUID
   * @returns Asset with relations or null if not found
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<AssetWithRelations | null> {
    const rows = await db
      .select({
        asset: assets,
        clientName: users.name,
        equipmentName: subscriptionEquipment.device_name,
      })
      .from(assets)
      .leftJoin(users, eq(assets.assigned_client_id, users.id))
      .leftJoin(subscriptionEquipment, eq(assets.assigned_equipment_id, subscriptionEquipment.id))
      .where(and(eq(assets.id, id), eq(assets.tenant_id, tenantId), isNull(assets.deleted_at)));

    if (!rows[0]) return null;
    return {
      ...rows[0].asset,
      assigned_client_name: rows[0].clientName ?? null,
      assigned_equipment_name: rows[0].equipmentName ?? null,
    };
  }

  /**
   * Inserts a new asset record into the database.
   *
   * @param data - New asset entity payload
   * @returns Created Asset
   */
  async create(data: NewAsset): Promise<Asset> {
    const results = await db.insert(assets).values(data).returning();
    return results[0] as Asset;
  }

  /**
   * Updates an existing asset for a tenant.
   *
   * @param id - Asset UUID
   * @param tenantId - Tenant UUID
   * @param data - Partial asset payload
   * @returns Updated Asset or null
   */
  async update(id: string, tenantId: string, data: Partial<NewAsset>): Promise<Asset | null> {
    const results = await db
      .update(assets)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(and(eq(assets.id, id), eq(assets.tenant_id, tenantId), isNull(assets.deleted_at)))
      .returning();

    return (results[0] as Asset) || null;
  }

  /**
   * Soft-deletes an asset by setting deleted_at timestamp.
   *
   * @param id - Asset UUID
   * @param tenantId - Tenant UUID
   * @returns Boolean indicating whether deletion succeeded
   */
  async softDelete(id: string, tenantId: string): Promise<boolean> {
    const results = await db
      .update(assets)
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where(and(eq(assets.id, id), eq(assets.tenant_id, tenantId), isNull(assets.deleted_at)))
      .returning();

    return results.length > 0;
  }
}

export const assetRepository = new AssetRepository();
