import { describe, it, expect } from 'vitest';
import { TaxAndNcfChecker } from './TaxAndNcfChecker';
import { ActionSequence } from '../../types';

describe('TaxAndNcfChecker (BL-701)', () => {
  const checker = new TaxAndNcfChecker();

  it('should pass for compliant 18% ITBIS tax calculations and valid B01 NCF vouchers', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-tax-valid',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-tax-valid',
          entityType: 'INVOICE',
          action: 'INVOICE_ISSUED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: {
            subtotal: '1000.00',
            taxAmount: '180.00',
            ncfCode: 'B0100000001',
          },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation for tax calculation discrepancy exceeding tolerance', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-tax-wrong',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-tax-wrong',
          entityType: 'INVOICE',
          action: 'INVOICE_ISSUED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: {
            subtotal: '1000.00',
            taxAmount: '120.00', // 12% instead of 18%!
          },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-701');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });

  it('should flag a HIGH violation for malformed NCF voucher codes', async () => {
    const sequence: ActionSequence = {
      entityId: 'inv-ncf-invalid',
      entityType: 'INVOICE',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's1',
          entityId: 'inv-ncf-invalid',
          entityType: 'INVOICE',
          action: 'INVOICE_ISSUED',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: {
            subtotal: '1000.00',
            taxAmount: '180.00',
            ncfCode: 'INVALID-NCF-999', // Not B01!
          },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-701');
  });
});
