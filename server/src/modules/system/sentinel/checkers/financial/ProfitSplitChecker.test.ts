import { describe, it, expect } from 'vitest';
import { ProfitSplitChecker } from './ProfitSplitChecker';
import { ActionSequence } from '../../types';

describe('ProfitSplitChecker (BL-802)', () => {
  const checker = new ProfitSplitChecker();

  it('should pass when net profit is split exactly 70% to HQ and 30% to Lead Engineer', async () => {
    // Gross = 10,000, OpEx = 2,000 -> Net = 8,000. HQ = 5,600 (70%), Lead = 2,400 (30%)
    const sequence: ActionSequence = {
      entityId: 'fin-period-valid',
      entityType: 'TENANT',
      tenantId: 'msp-master',
      steps: [
        {
          id: 's1',
          entityId: 'fin-period-valid',
          entityType: 'TENANT',
          action: 'PROFIT_DISTRIBUTED',
          timestamp: new Date(),
          tenantId: 'msp-master',
          metadata: {
            grossRevenue: '10000.00',
            totalOpex: '2000.00',
            hqDistributed: '5600.00',
            leadDistributed: '2400.00',
          },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation when distribution math violates 70/30 split', async () => {
    // Net = 8,000. But HQ distributed 5,000 and Lead distributed 3,000!
    const sequence: ActionSequence = {
      entityId: 'fin-period-wrong',
      entityType: 'TENANT',
      tenantId: 'msp-master',
      steps: [
        {
          id: 's1',
          entityId: 'fin-period-wrong',
          entityType: 'TENANT',
          action: 'PROFIT_DISTRIBUTED',
          timestamp: new Date(),
          tenantId: 'msp-master',
          metadata: {
            grossRevenue: '10000.00',
            totalOpex: '2000.00',
            hqDistributed: '5000.00',
            leadDistributed: '3000.00',
          },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-802');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });
});
