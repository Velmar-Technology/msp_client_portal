import { describe, it, expect } from 'vitest';
import { FeatureGatingChecker } from './FeatureGatingChecker';
import { ActionSequence } from '../../types';

describe('FeatureGatingChecker (BL-204)', () => {
  const checker = new FeatureGatingChecker();

  it('should pass when all executed features are entitled', async () => {
    const sequence: ActionSequence = {
      entityId: 't-1',
      entityType: 'TENANT',
      tenantId: 'tenant-1',
      steps: [
        {
          id: 's-1',
          entityId: 't-1',
          entityType: 'TENANT',
          action: 'EXECUTE_FEATURE',
          timestamp: new Date(),
          tenantId: 'tenant-1',
          metadata: { featureCode: 'ADVANCED_RMM', planEntitled: true },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a HIGH violation when an unentitled feature is executed', async () => {
    const sequence: ActionSequence = {
      entityId: 't-unentitled',
      entityType: 'TENANT',
      tenantId: 'tenant-2',
      steps: [
        {
          id: 's-2',
          entityId: 't-unentitled',
          entityType: 'TENANT',
          action: 'EXECUTE_FEATURE',
          timestamp: new Date(),
          tenantId: 'tenant-2',
          metadata: { featureCode: 'CUSTOM_BRANDING', planEntitled: false },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-204');
    expect(result.violations[0].evidence.featureCode).toBe('CUSTOM_BRANDING');
  });
});
