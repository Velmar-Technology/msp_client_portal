import { describe, it, expect, vi } from 'vitest';
import { VitestRegressionSynthesizer } from './VitestRegressionSynthesizer';
import { InvariantViolation } from '../types';
import fs from 'fs/promises';

vi.mock('fs/promises');

describe('VitestRegressionSynthesizer', () => {
  const synthesizer = new VitestRegressionSynthesizer();

  const mockViolation: InvariantViolation = {
    ruleCode: 'BL-101',
    ruleName: '1-Hour SLA Cancellation Constraint',
    severity: 'CRITICAL',
    entityId: 'ticket-999',
    entityType: 'TICKET',
    tenantId: 'tenant-1',
    violatedAt: new Date('2026-09-10T12:00:00Z'),
    rationale: 'Late cancellation after 75m',
    evidence: { elapsedMinutes: 75, category: 'WARRANTY' },
  };

  it('should synthesize valid Vitest TypeScript code matching violation details', () => {
    const code = synthesizer.synthesizeTestCode(mockViolation);
    expect(code).toContain("describe('Regression Suite: BL-101");
    expect(code).toContain('ticket-999');
    expect(code).toContain('Late cancellation after 75m');
    expect(code).toContain('"elapsedMinutes": 75');
  });

  it('should save synthesized test file to disk', async () => {
    vi.mocked(fs.mkdir).mockResolvedValue(undefined as any);
    vi.mocked(fs.writeFile).mockResolvedValue(undefined as any);

    const filePath = await synthesizer.saveRegressionTest(mockViolation, '/tmp/regressions');
    expect(filePath).toContain('bl-101-ticket-9');
    expect(fs.writeFile).toHaveBeenCalled();
  });
});
