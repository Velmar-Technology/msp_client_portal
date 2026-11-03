import {
  ConsumableRepository,
  consumableRepository,
  ConsumableCheckoutWithRelations,
} from '../repositories/ConsumableRepository';
import {
  NotificationRepository,
  notificationRepository,
} from '@modules/notifications';
import { UserRepository, userRepository } from '@modules/auth';
import { NotFoundError, ValidationError } from '@shared/errors';
import { logger } from '@shared/utils/logger';
import {
  CreateConsumableInput,
  UpdateConsumableInput,
  CheckoutConsumableInput,
  RestockConsumableInput,
  ConsumableContract,
  ConsumableCheckoutContract,
  ConsumableListResponse,
} from '@shared/contracts';
import { Consumable, NewConsumable, NewConsumableCheckout } from '@shared/db';

/**
 * Domain service managing IT consumables, stock checkouts, and Snipe-IT style low-stock notification triggers.
 */
export class ConsumableService {
  constructor(
    private readonly repo: ConsumableRepository = consumableRepository,
    private readonly notifRepo: NotificationRepository = notificationRepository,
    private readonly userRepo: UserRepository = userRepository
  ) {}

  /**
   * Formats a raw database consumable record into an API-compliant contract.
   *
   * @param record - Consumable database record
   * @returns Formatted ConsumableContract
   */
  private formatConsumable(record: Consumable): ConsumableContract {
    return {
      id: record.id,
      tenantId: record.tenant_id,
      name: record.name,
      category: record.category,
      modelNumber: record.model_number,
      itemNumber: record.item_number,
      manufacturer: record.manufacturer,
      totalQuantity: record.total_quantity,
      minQuantity: record.min_quantity,
      location: record.location,
      purchaseCost: record.purchase_cost ? Number(record.purchase_cost) : null,
      alertState: record.alert_state as ConsumableContract['alertState'],
      createdAt: record.created_at ? record.created_at.toISOString() : new Date().toISOString(),
      updatedAt: record.updated_at ? record.updated_at.toISOString() : new Date().toISOString(),
      deletedAt: record.deleted_at ? record.deleted_at.toISOString() : null,
    };
  }

  /**
   * Formats a checkout ledger row into an API-compliant contract.
   *
   * @param record - Consumable checkout record with joins
   * @returns Formatted ConsumableCheckoutContract
   */
  private formatCheckout(record: ConsumableCheckoutWithRelations): ConsumableCheckoutContract {
    return {
      id: record.id,
      tenantId: record.tenant_id,
      consumableId: record.consumable_id,
      quantity: record.quantity,
      assignedUserId: record.assigned_user_id,
      assignedUserName: record.assigned_user_name ?? null,
      assignedEquipmentId: record.assigned_equipment_id,
      assignedEquipmentName: record.assigned_equipment_name ?? null,
      ticketId: record.ticket_id,
      dispensedById: record.dispensed_by_id,
      dispensedByName: record.dispensed_by_name ?? null,
      notes: record.notes,
      createdAt: record.created_at ? record.created_at.toISOString() : new Date().toISOString(),
    };
  }

  /**
   * Dispatches out-of-stock and low-stock notifications to tenant administrators and technicians.
   *
   * @param tenantId - Tenant UUID
   * @param consumableName - Item display name
   * @param remaining - Remaining units on hand
   * @param minThreshold - Minimum threshold
   * @param isOut - Whether stock reached exact 0
   */
  private async dispatchStockAlert(
    tenantId: string,
    consumableName: string,
    remaining: number,
    minThreshold: number,
    isOut: boolean
  ): Promise<void> {
    try {
      const tenantUsers = await this.userRepo.findAllWithFilters({});
      const targetStaff = tenantUsers.filter(
        (u) => u.role === 'ADMIN' || u.role === 'TECHNICIAN'
      );

      const title = isOut
        ? `Out of Stock: ${consumableName}`
        : `Low Stock Alert: ${consumableName}`;

      const message = isOut
        ? `Consumable "${consumableName}" is completely OUT OF STOCK (0 units remaining). Please reorder immediately.`
        : `Consumable "${consumableName}" has dropped below its alert threshold (${remaining} remaining, minimum: ${minThreshold}).`;

      for (const staff of targetStaff) {
        await this.notifRepo.create({
          user_id: staff.id,
          tenant_id: tenantId,
          type: 'SYSTEM',
          title,
          message,
        });
      }

      logger.warn(
        `[ConsumableAlert] Dispatched ${isOut ? 'OUT_OF_STOCK' : 'LOW_STOCK'} alert for "${consumableName}" (Remaining: ${remaining}) to ${targetStaff.length} staff members`
      );
    } catch (err) {
      logger.error('Failed to dispatch consumable stock notification:', err);
    }
  }

  /**
   * Lists all consumables for a tenant with aggregate KPI summary metrics.
   *
   * @param tenantId - Tenant UUID
   * @param search - Optional search query
   * @returns ConsumableListResponse
   * @throws {ValidationError} When tenantId is missing
   */
  async listConsumables(tenantId: string, search?: string): Promise<ConsumableListResponse> {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const records = await this.repo.listByTenant(tenantId, search);
    const consumables = records.map((r) => this.formatConsumable(r));

    const outOfStockCount = consumables.filter((c) => c.totalQuantity === 0).length;
    const lowStockCount = consumables.filter(
      (c) => c.totalQuantity > 0 && c.totalQuantity <= c.minQuantity
    ).length;

    return {
      consumables,
      total: consumables.length,
      lowStockCount,
      outOfStockCount,
    };
  }

  /**
   * Retrieves single consumable by ID.
   *
   * @param tenantId - Tenant UUID
   * @param id - Consumable UUID
   * @returns ConsumableContract
   * @throws {NotFoundError} If consumable is not found
   */
  async getConsumable(tenantId: string, id: string): Promise<ConsumableContract> {
    const record = await this.repo.findByIdAndTenant(id, tenantId);
    if (!record) {
      throw new NotFoundError(`Consumable with ID ${id} not found`);
    }
    return this.formatConsumable(record);
  }

  /**
   * Creates a new consumable record.
   *
   * @param tenantId - Tenant UUID
   * @param input - Create input payload
   * @returns Created ConsumableContract
   */
  async createConsumable(
    tenantId: string,
    input: CreateConsumableInput
  ): Promise<ConsumableContract> {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const initialQty = input.totalQuantity ?? 0;
    const minQty = input.minQuantity ?? 5;

    let alertState: 'NORMAL' | 'LOW_STOCK_NOTIFIED' | 'OUT_OF_STOCK_NOTIFIED' = 'NORMAL';
    if (initialQty === 0) {
      alertState = 'OUT_OF_STOCK_NOTIFIED';
    } else if (initialQty <= minQty) {
      alertState = 'LOW_STOCK_NOTIFIED';
    }

    const newRecord: NewConsumable = {
      tenant_id: tenantId,
      name: input.name,
      category: input.category,
      model_number: input.modelNumber ?? null,
      item_number: input.itemNumber ?? null,
      manufacturer: input.manufacturer ?? null,
      total_quantity: initialQty,
      min_quantity: minQty,
      location: input.location ?? null,
      purchase_cost: input.purchaseCost ? Number(input.purchaseCost) : null,
      alert_state: alertState,
    };

    const created = await this.repo.create(newRecord);
    return this.getConsumable(tenantId, created.id);
  }

  /**
   * Updates an existing consumable.
   *
   * @param tenantId - Tenant UUID
   * @param id - Consumable UUID
   * @param input - Partial update payload
   * @returns Updated ConsumableContract
   * @throws {NotFoundError} If consumable does not exist
   */
  async updateConsumable(
    tenantId: string,
    id: string,
    input: UpdateConsumableInput
  ): Promise<ConsumableContract> {
    const existing = await this.repo.findByIdAndTenant(id, tenantId);
    if (!existing) {
      throw new NotFoundError(`Consumable with ID ${id} not found`);
    }

    const updatePayload: Partial<NewConsumable> = {};
    if (input.name !== undefined) updatePayload.name = input.name;
    if (input.category !== undefined) updatePayload.category = input.category;
    if (input.modelNumber !== undefined) updatePayload.model_number = input.modelNumber;
    if (input.itemNumber !== undefined) updatePayload.item_number = input.itemNumber;
    if (input.manufacturer !== undefined) updatePayload.manufacturer = input.manufacturer;
    if (input.minQuantity !== undefined) updatePayload.min_quantity = input.minQuantity;
    if (input.location !== undefined) updatePayload.location = input.location;
    if (input.purchaseCost !== undefined) {
      updatePayload.purchase_cost = input.purchaseCost ? Number(input.purchaseCost) : null;
    }

    await this.repo.update(id, tenantId, updatePayload);
    return this.getConsumable(tenantId, id);
  }

  /**
   * Soft-deletes a consumable.
   *
   * @param tenantId - Tenant UUID
   * @param id - Consumable UUID
   * @returns Success confirmation
   * @throws {NotFoundError} If consumable does not exist
   */
  async deleteConsumable(tenantId: string, id: string): Promise<{ success: true }> {
    const deleted = await this.repo.softDelete(id, tenantId);
    if (!deleted) {
      throw new NotFoundError(`Consumable with ID ${id} not found`);
    }
    return { success: true };
  }

  /**
   * Checks out / dispenses units of a consumable and executes low-stock notification triggers.
   *
   * @param tenantId - Tenant UUID
   * @param id - Consumable UUID
   * @param input - Checkout payload
   * @param dispensedById - ID of the technician/admin performing the action
   * @returns Updated ConsumableContract
   * @throws {NotFoundError} When consumable does not exist
   * @throws {ValidationError} When requested quantity exceeds available stock
   */
  async checkout(
    tenantId: string,
    id: string,
    input: CheckoutConsumableInput,
    dispensedById: string
  ): Promise<ConsumableContract> {
    const consumable = await this.repo.findByIdAndTenant(id, tenantId);
    if (!consumable) {
      throw new NotFoundError(`Consumable with ID ${id} not found`);
    }

    if (input.quantity > consumable.total_quantity) {
      throw new ValidationError(
        `Insufficient stock. Available: ${consumable.total_quantity}, Requested: ${input.quantity}`
      );
    }

    const newQuantity = consumable.total_quantity - input.quantity;
    let newAlertState = consumable.alert_state;

    // Boundary Transition Alerting (Snipe-IT style)
    if (newQuantity === 0 && consumable.alert_state !== 'OUT_OF_STOCK_NOTIFIED') {
      newAlertState = 'OUT_OF_STOCK_NOTIFIED';
      await this.dispatchStockAlert(
        tenantId,
        consumable.name,
        newQuantity,
        consumable.min_quantity,
        true
      );
    } else if (
      newQuantity <= consumable.min_quantity &&
      consumable.alert_state === 'NORMAL'
    ) {
      newAlertState = 'LOW_STOCK_NOTIFIED';
      await this.dispatchStockAlert(
        tenantId,
        consumable.name,
        newQuantity,
        consumable.min_quantity,
        false
      );
    }

    // 1. Record checkout in ledger
    const checkoutRecord: NewConsumableCheckout = {
      tenant_id: tenantId,
      consumable_id: id,
      quantity: input.quantity,
      assigned_user_id: input.assignedUserId ?? null,
      assigned_equipment_id: input.assignedEquipmentId ?? null,
      ticket_id: input.ticketId ?? null,
      dispensed_by_id: dispensedById,
      notes: input.notes ?? null,
    };
    await this.repo.createCheckout(checkoutRecord);

    // 2. Decrement quantity and record alert state
    await this.repo.update(id, tenantId, {
      total_quantity: newQuantity,
      alert_state: newAlertState,
    });

    return this.getConsumable(tenantId, id);
  }

  /**
   * Restocks consumable inventory and automatically clears alert suppression.
   *
   * @param tenantId - Tenant UUID
   * @param id - Consumable UUID
   * @param input - Restock payload
   * @returns Updated ConsumableContract
   * @throws {NotFoundError} When consumable does not exist
   */
  async restock(
    tenantId: string,
    id: string,
    input: RestockConsumableInput
  ): Promise<ConsumableContract> {
    const consumable = await this.repo.findByIdAndTenant(id, tenantId);
    if (!consumable) {
      throw new NotFoundError(`Consumable with ID ${id} not found`);
    }

    const newQuantity = consumable.total_quantity + input.quantity;
    let newAlertState = consumable.alert_state;

    // Reset alert suppression if stock rises above minimum threshold
    if (newQuantity > consumable.min_quantity) {
      newAlertState = 'NORMAL';
    } else if (newQuantity > 0 && consumable.alert_state === 'OUT_OF_STOCK_NOTIFIED') {
      newAlertState = 'LOW_STOCK_NOTIFIED';
    }

    const updatePayload: Partial<NewConsumable> = {
      total_quantity: newQuantity,
      alert_state: newAlertState,
    };
    if (input.unitCost !== undefined && input.unitCost !== null) {
      updatePayload.purchase_cost = Number(input.unitCost);
    }

    await this.repo.update(id, tenantId, updatePayload);
    return this.getConsumable(tenantId, id);
  }

  /**
   * Retrieves checkout ledger history for a specific consumable.
   *
   * @param tenantId - Tenant UUID
   * @param consumableId - Consumable UUID
   * @returns Array of ConsumableCheckoutContract records
   */
  async getCheckouts(
    tenantId: string,
    consumableId: string
  ): Promise<ConsumableCheckoutContract[]> {
    const records = await this.repo.listCheckouts(tenantId, consumableId);
    return records.map((r) => this.formatCheckout(r));
  }
}

export const consumableService = new ConsumableService();
