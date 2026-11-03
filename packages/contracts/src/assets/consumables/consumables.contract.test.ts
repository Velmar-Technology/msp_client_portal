import { describe, it, expect } from 'vitest';
import {
  CreateConsumableInputSchema,
  CheckoutConsumableInputSchema,
  RestockConsumableInputSchema,
  ConsumableSchema,
} from './consumables.contract';

describe('Consumables Contracts (ADR-017 / Hierarchical)', () => {
  it('validates valid CreateConsumableInput', () => {
    const input = {
      name: 'HP 58A Black Toner',
      category: 'Toner / Ink',
      modelNumber: 'CF258A',
      itemNumber: 'SKU-58A',
      manufacturer: 'HP',
      totalQuantity: 10,
      minQuantity: 3,
      location: 'Closet 2B',
      purchaseCost: 89.99,
    };
    const result = CreateConsumableInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('validates CheckoutConsumableInput with positive quantity', () => {
    const input = {
      quantity: 2,
      notes: 'Dispensed to Sarah for Marketing printer',
    };
    const result = CheckoutConsumableInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects CheckoutConsumableInput with zero quantity', () => {
    const input = { quantity: 0 };
    const result = CheckoutConsumableInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('validates RestockConsumableInput with purchase order details', () => {
    const input = {
      quantity: 15,
      orderNumber: 'PO-2026-901',
      unitCost: 84.5,
    };
    const result = RestockConsumableInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('parses complete Consumable entity schema', () => {
    const consumable = {
      id: 'a0000000-0000-0000-0000-000000000001',
      tenantId: 'b0000000-0000-0000-0000-000000000001',
      name: 'Cat6 Ethernet Cable 10ft',
      category: 'Cables / Adapters',
      modelNumber: 'C6-10FT-BLU',
      itemNumber: 'SKU-C6-10',
      manufacturer: 'CableMatters',
      totalQuantity: 45,
      minQuantity: 10,
      location: 'Bin 4',
      purchaseCost: 4.5,
      alertState: 'NORMAL' as const,
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
      deletedAt: null,
    };
    const result = ConsumableSchema.safeParse(consumable);
    expect(result.success).toBe(true);
  });
});
