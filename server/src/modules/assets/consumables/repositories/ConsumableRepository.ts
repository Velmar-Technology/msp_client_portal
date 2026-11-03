import { BaseRepository } from '@shared/repositories/BaseRepository';
import {
  db,
  consumables,
  consumableCheckouts,
  users,
  subscriptionEquipment,
  Consumable,
  NewConsumable,
  ConsumableCheckout,
  NewConsumableCheckout,
} from '@shared/db';
import { eq, and, isNull, desc, ilike, or, SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export interface ConsumableCheckoutWithRelations extends ConsumableCheckout {
  assigned_user_name?: string | null;
  assigned_equipment_name?: string | null;
  dispensed_by_name?: string | null;
}

/**
 * Data repository for IT consumables inventory and checkout ledger.
 */
export class ConsumableRepository extends BaseRepository<Consumable> {
  constructor() {
    super(consumables, 'consumables');
  }

  /**
   * Retrieves all non-deleted consumables for a tenant with optional search filtering.
   *
   * @param tenantId - Tenant UUID
   * @param search - Optional search term
   * @returns Array of Consumables
   */
  async listByTenant(tenantId: string, search?: string): Promise<Consumable[]> {
    const conditions: SQL[] = [
      eq(consumables.tenant_id, tenantId),
      isNull(consumables.deleted_at),
    ];

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(consumables.name, term),
          ilike(consumables.category, term),
          ilike(consumables.model_number, term),
          ilike(consumables.item_number, term),
          ilike(consumables.manufacturer, term)
        )!
      );
    }

    const rows = await db
      .select()
      .from(consumables)
      .where(and(...conditions))
      .orderBy(desc(consumables.created_at));

    return rows as Consumable[];
  }

  /**
   * Finds a specific consumable by ID and tenant.
   *
   * @param id - Consumable UUID
   * @param tenantId - Tenant UUID
   * @returns Consumable entity or null
   */
  async findByIdAndTenant(id: string, tenantId: string): Promise<Consumable | null> {
    const rows = await db
      .select()
      .from(consumables)
      .where(
        and(
          eq(consumables.id, id),
          eq(consumables.tenant_id, tenantId),
          isNull(consumables.deleted_at)
        )
      );

    return (rows[0] as Consumable) || null;
  }

  /**
   * Inserts a new consumable record.
   *
   * @param data - New consumable payload
   * @returns Created Consumable
   */
  async create(data: NewConsumable): Promise<Consumable> {
    const results = await db.insert(consumables).values(data).returning();
    return results[0] as Consumable;
  }

  /**
   * Updates an existing consumable.
   *
   * @param id - Consumable UUID
   * @param tenantId - Tenant UUID
   * @param data - Partial update payload
   * @returns Updated Consumable or null
   */
  async update(
    id: string,
    tenantId: string,
    data: Partial<NewConsumable>
  ): Promise<Consumable | null> {
    const results = await db
      .update(consumables)
      .set({
        ...data,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(consumables.id, id),
          eq(consumables.tenant_id, tenantId),
          isNull(consumables.deleted_at)
        )
      )
      .returning();

    return (results[0] as Consumable) || null;
  }

  /**
   * Soft-deletes a consumable.
   *
   * @param id - Consumable UUID
   * @param tenantId - Tenant UUID
   * @returns Boolean indicating deletion success
   */
  async softDelete(id: string, tenantId: string): Promise<boolean> {
    const results = await db
      .update(consumables)
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where(
        and(
          eq(consumables.id, id),
          eq(consumables.tenant_id, tenantId),
          isNull(consumables.deleted_at)
        )
      )
      .returning();

    return results.length > 0;
  }

  /**
   * Records a checkout action in the consumable ledger.
   *
   * @param data - Checkout record payload
   * @returns Created ConsumableCheckout
   */
  async createCheckout(data: NewConsumableCheckout): Promise<ConsumableCheckout> {
    const results = await db.insert(consumableCheckouts).values(data).returning();
    return results[0] as ConsumableCheckout;
  }

  /**
   * Retrieves all checkout ledger entries for a consumable.
   *
   * @param tenantId - Tenant UUID
   * @param consumableId - Consumable UUID
   * @returns Array of checkouts with joined names
   */
  async listCheckouts(
    tenantId: string,
    consumableId: string
  ): Promise<ConsumableCheckoutWithRelations[]> {
    const recipientUsers = alias(users, 'recipient_user');
    const dispenserUsers = alias(users, 'dispenser_user');

    const rows = await db
      .select({
        checkout: consumableCheckouts,
        recipientName: recipientUsers.name,
        equipmentName: subscriptionEquipment.device_name,
        dispenserName: dispenserUsers.name,
      })
      .from(consumableCheckouts)
      .leftJoin(recipientUsers, eq(consumableCheckouts.assigned_user_id, recipientUsers.id))
      .leftJoin(subscriptionEquipment, eq(consumableCheckouts.assigned_equipment_id, subscriptionEquipment.id))
      .leftJoin(dispenserUsers, eq(consumableCheckouts.dispensed_by_id, dispenserUsers.id))
      .where(
        and(
          eq(consumableCheckouts.tenant_id, tenantId),
          eq(consumableCheckouts.consumable_id, consumableId)
        )
      )
      .orderBy(desc(consumableCheckouts.created_at));

    return rows.map((r) => ({
      ...r.checkout,
      assigned_user_name: r.recipientName ?? null,
      assigned_equipment_name: r.equipmentName ?? null,
      dispensed_by_name: r.dispenserName ?? null,
    }));
  }
}

export const consumableRepository = new ConsumableRepository();
