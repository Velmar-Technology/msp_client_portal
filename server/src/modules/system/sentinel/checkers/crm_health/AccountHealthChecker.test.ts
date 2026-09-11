import { describe, it, expect } from 'vitest';
import { AccountHealthChecker } from './AccountHealthChecker';
import { ActionSequence } from '../../types';

describe('AccountHealthChecker (BL-601)', () => {
  const checker = new AccountHealthChecker();

  it('should pass when an account with score < 70% has a QBR review flagged', async () => {
    const sequence: ActionSequence = {
      entityId: 'tenant-degraded',
      entityType: 'TENANT',
      tenantId: 'tenant-degraded',
      steps: [
        {
          id: 's1',
          entityId: 'tenant-degraded',
          entityType: 'TENANT',
          action: 'HEALTH_SCORE_EVALUATED',
          timestamp: new Date(),
          tenantId: 'tenant-degraded',
          metadata: { healthScore: '65', qbrReviewFlagged: true },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a HIGH violation when score < 70% has no QBR review flagged', async () => {
    const sequence: ActionSequence = {
      entityId: 'tenant-unreviewed',
      entityType: 'TENANT',
      tenantId: 'tenant-unreviewed',
      steps: [
        {
          id: 's1',
          entityId: 'tenant-unreviewed',
          entityType: 'TENANT',
          action: 'HEALTH_SCORE_EVALUATED',
          timestamp: new Date(),
          tenantId: 'tenant-unreviewed',
          metadata: { healthScore: '58', qbrReviewFlagged: false },
        },
      ],
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-601');
    expect(result.violations[0].severity).toBe('HIGH');
  });
});
