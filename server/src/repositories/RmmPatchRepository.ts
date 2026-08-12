import { BaseRepository } from './BaseRepository';
import { RmmPatchItem, RmmPatchStatus, RmmPatchSeverity } from '../types';
import { db, rmmPatches } from '../db';
import { eq, and, sql } from 'drizzle-orm';

export class RmmPatchRepository extends BaseRepository<RmmPatchItem> {
  constructor() {
    super(rmmPatches, 'rmm_patches');
  }

  async findByEquipment(equipmentId: string, tenantId: string): Promise<RmmPatchItem[]> {
    const results = await db
      .select()
      .from(rmmPatches)
      .where(and(eq(rmmPatches.equipment_id, equipmentId), eq(rmmPatches.tenant_id, tenantId)));
    return results as RmmPatchItem[];
  }

  async findPendingByTenant(tenantId: string): Promise<RmmPatchItem[]> {
    const results = await db
      .select()
      .from(rmmPatches)
      .where(and(eq(rmmPatches.tenant_id, tenantId), eq(rmmPatches.status, RmmPatchStatus.PENDING)));
    return results as RmmPatchItem[];
  }

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

  async countPendingForEquipment(equipmentId: string): Promise<number> {
    const results = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(rmmPatches)
      .where(and(eq(rmmPatches.equipment_id, equipmentId), eq(rmmPatches.status, RmmPatchStatus.PENDING)));
    return results[0]?.count ?? 0;
  }
}

export const rmmPatchRepository = new RmmPatchRepository();
