import { BaseRepository } from '@shared/repositories/BaseRepository';
import { RmmPatchItem, RmmPatchStatus, RmmPatchSeverity } from '@shared/types';
import { db, rmmPatches } from '@shared/db';
import { eq, and, sql } from 'drizzle-orm';

/**
 * Data repository managing OS and software patch records, pending counts, and deployment status updates.
 */
export class RmmPatchRepository extends BaseRepository<RmmPatchItem> {
  /**
   * Initializes RmmPatchRepository for the rmm_patches database table.
   */
  constructor() {
    super(rmmPatches, 'rmm_patches');
  }

  /**
   * Retrieves all patches associated with a specific equipment slot in a tenant.
   *
   * @param equipmentId - Equipment UUID
   * @param tenantId - Tenant UUID
   * @returns Array of RmmPatchItem entities
   */
  async findByEquipment(equipmentId: string, tenantId: string): Promise<RmmPatchItem[]> {
    const results = await db
      .select()
      .from(rmmPatches)
      .where(and(eq(rmmPatches.equipment_id, equipmentId), eq(rmmPatches.tenant_id, tenantId)));
    return results as RmmPatchItem[];
  }

  /**
   * Retrieves all pending patches across all equipment belonging to a tenant.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of pending RmmPatchItem entities
   */
  async findPendingByTenant(tenantId: string): Promise<RmmPatchItem[]> {
    const results = await db
      .select()
      .from(rmmPatches)
      .where(and(eq(rmmPatches.tenant_id, tenantId), eq(rmmPatches.status, RmmPatchStatus.PENDING)));
    return results as RmmPatchItem[];
  }

  /**
   * Inserts a new patch record.
   *
   * @param data - Patch record attributes
   * @returns Created RmmPatchItem entity
   */
  async createPatch(data: {
    equipment_id: string;
    patch_id: string;
    title: string;
    severity?: string;
    status?: string;
    release_date?: Date | null;
    tenant_id: string;
  }): Promise<RmmPatchItem> {
    const results = await db
      .insert(rmmPatches)
      .values({
        equipment_id: data.equipment_id,
        patch_id: data.patch_id,
        title: data.title,
        severity: data.severity ?? RmmPatchSeverity.MEDIUM,
        status: data.status ?? RmmPatchStatus.PENDING,
        release_date: data.release_date ?? new Date(),
        tenant_id: data.tenant_id,
      })
      .returning();
    return results[0] as RmmPatchItem;
  }

  /**
   * Updates patch deployment status and sets installed_at timestamp.
   *
   * @param id - Patch UUID
   * @param status - Target RmmPatchStatus
   * @param installedAt - Optional installation timestamp
   * @returns Updated RmmPatchItem entity or null
   */
  async updatePatchStatus(id: string, status: string, installedAt?: Date | null): Promise<RmmPatchItem | null> {
    const results = await db
      .update(rmmPatches)
      .set({
        status,
        installed_at: installedAt !== undefined ? installedAt : (status === RmmPatchStatus.INSTALLED ? new Date() : null),
        updated_at: new Date(),
      })
      .where(eq(rmmPatches.id, id))
      .returning();
    return (results[0] as RmmPatchItem) || null;
  }

  /**
   * Returns the count of pending patches for an equipment asset.
   *
   * @param equipmentId - Equipment UUID
   * @returns Count of pending patches
   */
  async countPendingForEquipment(equipmentId: string): Promise<number> {
    const results = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rmmPatches)
      .where(and(eq(rmmPatches.equipment_id, equipmentId), eq(rmmPatches.status, RmmPatchStatus.PENDING)));
    return results[0]?.count ?? 0;
  }
}

export const rmmPatchRepository = new RmmPatchRepository();
