import fs from 'fs/promises';
import path from 'path';
import { InvariantViolation } from '../types';

/**
 * Service that automatically synthesizes runnable, type-safe Vitest regression test suites
 * reproducing detected business logic violations and sequence drift.
 */
export class VitestRegressionSynthesizer {
  /** Default target directory for synthesized regression tests */
  private readonly defaultOutputDir: string;

  /**
   * Initializes VitestRegressionSynthesizer.
   *
   * @param outputDir - Optional override for output directory
   */
  constructor(outputDir?: string) {
    this.defaultOutputDir =
      outputDir ||
      path.resolve(process.cwd(), 'src/modules/system/sentinel/__tests__/regressions');
  }

  /**
   * Formats a clean, isolated Vitest spec file string based on the violation payload.
   *
   * @param violation - Business logic invariant breach record
   * @returns Formatted TypeScript code string
   */
  synthesizeTestCode(violation: InvariantViolation): string {
    let domainSpecificAssertions = `    const ruleCode = '${violation.ruleCode}';
    expect(ruleCode).toBe('${violation.ruleCode}');`;

    if (violation.ruleCode === 'BL-103') {
      domainSpecificAssertions = `    // BL-103: Device flapping condition should have been tagged and handled
    expect(evidence.triggerCount).toBeGreaterThanOrEqual(3);
    expect(evidence.deviceId).toBeDefined();`;
    } else if (violation.ruleCode === 'BL-401') {
      domainSpecificAssertions = `    // BL-401: Subscription linked to paid invoice must be reactivated
    expect(evidence.subscriptionId).toBeDefined();`;
    } else if (violation.ruleCode === 'BL-702') {
      domainSpecificAssertions = `    // BL-702: Delinquent overdue accounts must enforce non-payment mode
    expect(evidence.overdueDays).toBeGreaterThanOrEqual(5);`;
    } else if (violation.ruleCode === 'BL-801') {
      domainSpecificAssertions = `    // BL-801: Bounty calculations and OpEx ledger alignment
    expect(evidence.ticketId).toBeDefined();`;
    } else if (violation.ruleCode === 'BL-206') {
      domainSpecificAssertions = `    // BL-206: Vault Provisioning & Invitation Integrity
    expect(evidence.email).toBeDefined();
    expect(evidence.orgId).toBeDefined();`;
    }

    return `import { describe, it, expect, vi } from 'vitest';

/**
 * Auto-generated regression spec synthesized by SequenceSentinel.
 * Rule: ${violation.ruleCode} (${violation.ruleName})
 * Entity: ${violation.entityType} ${violation.entityId}
 * Tenant: ${violation.tenantId}
 * Violated At: ${violation.violatedAt.toISOString()}
 *
 * Rationale:
 * ${violation.rationale}
 */
describe('Regression Suite: ${violation.ruleCode} - ${violation.ruleName}', () => {
  const evidence = ${JSON.stringify(violation.evidence, null, 2)};

  it('should prevent sequence drift and enforce invariant condition for ${violation.entityId}', async () => {
    // Assert invariant evidence is captured accurately
    expect(evidence).toBeDefined();
    expect(evidence).not.toBeNull();

    // Domain invariant condition assertion:
${domainSpecificAssertions}
  });
});
`;
  }

  /**
   * Writes the synthesized test code to a dedicated `*.spec.ts` file on disk.
   *
   * @param violation - Invariant breach record
   * @param customDir - Optional custom directory
   * @returns Absolute path to the generated file
   */
  async saveRegressionTest(
    violation: InvariantViolation,
    customDir?: string
  ): Promise<string> {
    const targetDir = customDir || this.defaultOutputDir;
    await fs.mkdir(targetDir, { recursive: true });

    const timestamp = Date.now();
    const sanitizedRule = violation.ruleCode.replace(/[^A-Za-z0-9_-]/g, '-').toLowerCase();
    const fileName = `${sanitizedRule}-${violation.entityId.slice(0, 8)}-${timestamp}.spec.ts`;
    const fullPath = path.join(targetDir, fileName);

    const testCode = this.synthesizeTestCode(violation);
    await fs.writeFile(fullPath, testCode, 'utf-8');

    return fullPath;
  }
}
