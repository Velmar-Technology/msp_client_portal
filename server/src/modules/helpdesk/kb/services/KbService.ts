import { NotFoundError } from '@shared/errors';
import type { CreateKbInput, UpdateKbInput } from '@shared/contracts';
import type { KbEntity, NewKbEntity } from '../kb.schema';

export interface KbStorePort {
  findAllByTenant(tenantId: string): Promise<KbEntity[]>;
  findByIdAndTenant(id: string, tenantId: string): Promise<KbEntity | null>;
  createRecord(data: NewKbEntity): Promise<KbEntity>;
}

/**
 * Domain service managing Kb lifecycle and business invariants (ADR-017).
 */
export class KbService {
  constructor(private store?: KbStorePort) {}

  /**
   * Lists all Kb records scoped to the active tenant.
   *
   * @param tenantId - Tenant UUID
   * @returns Array of KbEntity records
   */
  async list(tenantId: string): Promise<KbEntity[]> {
    if (!this.store) return [];
    return this.store.findAllByTenant(tenantId);
  }

  /**
   * Retrieves a single Kb record by ID within the tenant boundary.
   *
   * @param id - Record UUID
   * @param tenantId - Tenant UUID
   * @returns Matching KbEntity
   * @throws {NotFoundError} If record does not exist in tenant
   */
  async getById(id: string, tenantId: string): Promise<KbEntity> {
    const record = await this.store?.findByIdAndTenant(id, tenantId);
    if (!record) {
      throw new NotFoundError('Kb record not found');
    }
    return record;
  }

  /**
   * Creates a new Kb record for the tenant.
   *
   * @param tenantId - Tenant UUID
   * @param input - Validated creation input
   * @returns Newly created KbEntity
   */
  async create(tenantId: string, input: CreateKbInput): Promise<KbEntity> {
    if (!this.store) {
      throw new NotFoundError('Kb store not initialized');
    }
    return this.store.createRecord({
      tenant_id: tenantId,
      name: input.name,
      status: input.status ?? 'ACTIVE',
      notes: input.notes ?? null,
    });
  }

  /**
   * Placeholder update hook for Kb.
   *
   * @param id - Record UUID
   * @param tenantId - Tenant UUID
   * @param _input - Validated update input
   * @returns Existing KbEntity
   */
  async update(id: string, tenantId: string, _input: UpdateKbInput): Promise<KbEntity> {
    return this.getById(id, tenantId);
  }
}

export const kbService = new KbService();
