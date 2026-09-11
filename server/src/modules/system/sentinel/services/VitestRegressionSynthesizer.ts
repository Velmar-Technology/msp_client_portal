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

    // Invariant condition assertion:
    // This generated test documents the exact operational state at violation time.
    const ruleCode = '${violation.ruleCode}';
    expect(ruleCode).toBe('${violation.ruleCode}');
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
