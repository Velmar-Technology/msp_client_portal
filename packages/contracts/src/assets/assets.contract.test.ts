import { describe, it, expect } from 'vitest';
import {
  CreateAssetInputSchema,
  UpdateAssetInputSchema,
  AssetSchema,
  AssetTypeSchema,
  AssetStatusSchema,
} from './assets.contract';

describe('Assets Contract Schemas', () => {
  it('validates a valid CreateAssetInput with defaults', () => {
    const input = {
      name: 'Dell PowerEdge R740',
      assetType: 'HARDWARE',
      status: 'ACTIVE',
      model: 'R740',
      serialNumber: 'SN-98234-X',
      manufacturer: 'Dell',
    };

    const parsed = CreateAssetInputSchema.parse(input);
    expect(parsed.name).toBe('Dell PowerEdge R740');
    expect(parsed.assetType).toBe('HARDWARE');
    expect(parsed.status).toBe('ACTIVE');
  });

  it('rejects invalid asset types or statuses', () => {
    expect(() => AssetTypeSchema.parse('INVALID_TYPE')).toThrow();
    expect(() => AssetStatusSchema.parse('DESTROYED')).toThrow();
  });

  it('validates partial update inputs', () => {
    const partialInput = {
      status: 'MAINTENANCE' as const,
      notes: 'Scheduled for RAM upgrade',
    };

    const parsed = UpdateAssetInputSchema.parse(partialInput);
    expect(parsed.status).toBe('MAINTENANCE');
    expect(parsed.notes).toBe('Scheduled for RAM upgrade');
  });

  it('validates a full Asset response structure', () => {
    const asset = {
      id: 'a0000000-0000-0000-0000-000000000001',
      tenantId: 'b0000000-0000-0000-0000-000000000002',
      name: 'Cisco Catalyst 9200',
      assetType: 'NETWORK',
      status: 'ACTIVE',
      model: 'C9200L-24P-4G',
      serialNumber: 'FOC2432S01X',
      manufacturer: 'Cisco',
      assignedClientId: null,
      assignedEquipmentId: null,
      purchaseDate: '2026-01-15T00:00:00Z',
      warrantyExpiresAt: '2029-01-15T00:00:00Z',
      notes: 'Main rack distribution switch',
      createdAt: '2026-01-15T12:00:00Z',
      updatedAt: '2026-01-15T12:00:00Z',
      deletedAt: null,
    };

    const parsed = AssetSchema.parse(asset);
    expect(parsed.id).toBe(asset.id);
    expect(parsed.name).toBe('Cisco Catalyst 9200');
  });
});


import {
  CreateConsumableInputSchema,
  CheckoutConsumableInputSchema,
  RestockConsumableInputSchema,
  ConsumableSchema,
  ConsumableAlertStateSchema,
} from './assets.contract';

describe('Consumables Contract Schemas', () => {
  it('validates a valid CreateConsumableInput with defaults', () => {
    const input = {
      name: 'Cat6 Patch Cable 3ft',
      category: 'Cables',
      totalQuantity: 25,
      minQuantity: 5,
      location: 'Rack 1 Shelf B',
      purchaseCost: 3.5,
    };

    const parsed = CreateConsumableInputSchema.parse(input);
    expect(parsed.name).toBe('Cat6 Patch Cable 3ft');
    expect(parsed.category).toBe('Cables');
    expect(parsed.totalQuantity).toBe(25);
    expect(parsed.minQuantity).toBe(5);
  });

  it('rejects negative stock quantities', () => {
    expect(() =>
      CreateConsumableInputSchema.parse({
        name: 'Toner',
        category: 'Printer Supplies',
        totalQuantity: -1,
      })
    ).toThrow();
  });

  it('validates CheckoutConsumableInput requiring min 1 unit', () => {
    expect(() =>
      CheckoutConsumableInputSchema.parse({
        quantity: 0,
      })
    ).toThrow();

    const valid = CheckoutConsumableInputSchema.parse({
      quantity: 2,
      notes: 'Dispatched to floor 2 conference room',
    });
    expect(valid.quantity).toBe(2);
  });

  it('validates RestockConsumableInput', () => {
    const valid = RestockConsumableInputSchema.parse({
      quantity: 10,
      orderNumber: 'PO-2026-901',
      unitCost: 4.25,
    });
    expect(valid.quantity).toBe(10);
    expect(valid.orderNumber).toBe('PO-2026-901');
  });

  it('validates a complete Consumable entity schema', () => {
    const record = {
      id: 'a0000000-0000-0000-0000-000000000001',
      tenantId: 'b0000000-0000-0000-0000-000000000002',
      name: 'HP 58A Black Toner',
      category: 'Printer Supplies',
      modelNumber: 'CF258A',
      itemNumber: 'SKU-HP-58A',
      manufacturer: 'HP',
      totalQuantity: 2,
      minQuantity: 5,
      location: 'Supply Closet A',
      purchaseCost: 95.0,
      alertState: 'LOW_STOCK_NOTIFIED' as const,
      createdAt: '2026-02-01T00:00:00Z',
      updatedAt: '2026-02-01T00:00:00Z',
      deletedAt: null,
    };

    const parsed = ConsumableSchema.parse(record);
    expect(parsed.id).toBe(record.id);
    expect(parsed.alertState).toBe('LOW_STOCK_NOTIFIED');
  });
});
