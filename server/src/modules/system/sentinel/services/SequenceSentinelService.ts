import fs from 'fs/promises';
import path from 'path';
import {
  ActionSequence,
  AuditReport,
  InvariantChecker,
  InvariantViolation,
  RuleScorecardEntry,
  SequenceAuditWindow,
} from '../types';
import { SequenceAggregatorService } from './SequenceAggregatorService';
import { VitestRegressionSynthesizer } from './VitestRegressionSynthesizer';

// Ticketing suite
import { SlaCancellationChecker } from '../checkers/ticketing/SlaCancellationChecker';
import { RoundRobinDispatchChecker } from '../checkers/ticketing/RoundRobinDispatchChecker';
import { AlertNoiseFlappingChecker } from '../checkers/ticketing/AlertNoiseFlappingChecker';
import { TierEscalationChecker } from '../checkers/ticketing/TierEscalationChecker';

// Subscriptions & equipment suite
import { QuotaEnforcementChecker } from '../checkers/subscriptions/QuotaEnforcementChecker';
import { LicenseTrueUpChecker } from '../checkers/subscriptions/LicenseTrueUpChecker';
import { FeatureGatingChecker } from '../checkers/subscriptions/FeatureGatingChecker';
import { DeviceVaultSecurityChecker } from '../checkers/subscriptions/DeviceVaultSecurityChecker';
import { VaultProvisioningChecker } from '../checkers/subscriptions/VaultProvisioningChecker';

// Security suite
import { StateMachineChecker } from '../checkers/security/StateMachineChecker';
import { AuthorizationAndJitChecker } from '../checkers/security/AuthorizationAndJitChecker';

// Billing & tax suite
import { SubscriptionReactivationChecker } from '../checkers/billing/SubscriptionReactivationChecker';
import { RenewalSchedulerChecker } from '../checkers/billing/RenewalSchedulerChecker';
import { AutoRenewSyncChecker } from '../checkers/billing/AutoRenewSyncChecker';
import { TaxAndNcfChecker } from '../checkers/billing/TaxAndNcfChecker';
import { NonPaymentEnforcementChecker } from '../checkers/billing/NonPaymentEnforcementChecker';

// Financial & OpEx suite
import { TechnicianBountyChecker } from '../checkers/financial/TechnicianBountyChecker';
import { ProfitSplitChecker } from '../checkers/financial/ProfitSplitChecker';

// CRM & Account health suite
import { CrmPipelineChecker } from '../checkers/crm_health/CrmPipelineChecker';
import { AccountHealthChecker } from '../checkers/crm_health/AccountHealthChecker';

import { SelfHealingService } from './SelfHealingService';

/**
 * Master Orchestration Service for SequenceSentinel.
 * Coordinates multi-domain sequence aggregation, executes the 18 Master Business Logic checkers,
 * compiles diagnostic Markdown audit scorecards, triggers Vitest regression test synthesis,
 * and autonomously remediates operational inconsistencies (Self-Healing).
 */
export class SequenceSentinelService {
  private readonly checkers: InvariantChecker[];

  /**
   * Initializes SequenceSentinelService with default or custom dependencies.
   *
   * @param aggregator - Sequence aggregator service
   * @param synthesizer - Vitest regression test synthesizer
   * @param selfHealing - Autonomous self-healing service
   * @param customCheckers - Optional override for registered checkers
   */
  constructor(
    private readonly aggregator: SequenceAggregatorService = new SequenceAggregatorService(),
    private readonly synthesizer: VitestRegressionSynthesizer = new VitestRegressionSynthesizer(),
    private readonly selfHealing: SelfHealingService = new SelfHealingService(),
    customCheckers?: InvariantChecker[]
  ) {
    this.checkers = customCheckers || [
      new SlaCancellationChecker(),
      new RoundRobinDispatchChecker(),
      new AlertNoiseFlappingChecker(),
      new TierEscalationChecker(),
      new QuotaEnforcementChecker(),
      new LicenseTrueUpChecker(),
      new FeatureGatingChecker(),
      new DeviceVaultSecurityChecker(),
      new VaultProvisioningChecker(),
      new StateMachineChecker(),
      new AuthorizationAndJitChecker(),
      new SubscriptionReactivationChecker(),
      new RenewalSchedulerChecker(),
      new AutoRenewSyncChecker(),
      new TaxAndNcfChecker(),
      new NonPaymentEnforcementChecker(),
      new TechnicianBountyChecker(),
      new ProfitSplitChecker(),
      new CrmPipelineChecker(),
      new AccountHealthChecker(),
    ];
  }

  /**
   * Executes a full integrity audit over the target temporal window, with optional self-healing.
   *
   * @param window - Audit temporal boundaries and optional tenant filter
   * @param options - Execution flags (`generateTests`, `autoHeal`, `saveReport`, `reportOutputDir`)
   * @returns Comprehensive AuditReport
   */
  async runAudit(
    window: SequenceAuditWindow,
    options: {
      generateTests?: boolean;
      autoHeal?: boolean;
      dryRun?: boolean;
      saveReport?: boolean;
      reportOutputDir?: string;
    } = {}
  ): Promise<AuditReport> {
    // 1. Ingest and assemble sequences across all domains
    const sequences: ActionSequence[] = await this.aggregator.aggregateAll(window);

    // 2. Evaluate all registered invariant checkers in parallel
    const evaluationPromises = this.checkers.map((checker) => checker.evaluate(sequences));
    const results = await Promise.all(evaluationPromises);

    // 3. Aggregate violations and compile scorecard
    const allViolations: InvariantViolation[] = [];
    const scorecard: RuleScorecardEntry[] = [];

    for (const result of results) {
      allViolations.push(...result.violations);
      scorecard.push({
        ruleCode: result.ruleCode,
        ruleName: result.ruleName,
        category: result.category,
        evaluatedCount: result.evaluatedCount,
        violationCount: result.violations.length,
        status:
          result.violations.length === 0
            ? 'PASS'
            : result.violations.some((v) => v.severity === 'CRITICAL')
            ? 'FAIL'
            : 'WARN',
      });
    }

    // 4. Synthesize regression tests for detected violations if requested
    const synthesizedTestPaths: string[] = [];
    if (options.generateTests && allViolations.length > 0) {
      for (const violation of allViolations) {
        try {
          const testPath = await this.synthesizer.saveRegressionTest(violation);
          synthesizedTestPaths.push(testPath);
        } catch {
          // Continue generating remaining tests
        }
      }
    }

    // 5. Execute autonomous self-healing remediation if enabled or dry-run requested
    let remediations;
    if ((options.autoHeal || options.dryRun) && allViolations.length > 0) {
      remediations = await this.selfHealing.autoHealViolations(allViolations, {
        dryRun: options.dryRun,
      });
    }

    const deadLetterQueue =
      typeof this.selfHealing.getDeadLetterQueue === 'function'
        ? this.selfHealing.getDeadLetterQueue()
        : [];

    const report: AuditReport = {
      generatedAt: new Date(),
      auditWindow: window,
      totalSequencesEvaluated: sequences.length,
      totalViolations: allViolations.length,
      scorecard,
      violations: allViolations,
      synthesizedTestPaths,
      remediations,
      deadLetterQueue: deadLetterQueue.length > 0 ? deadLetterQueue : undefined,
    };

    // 6. Optionally save Markdown report to disk
    if (options.saveReport) {
      await this.saveMarkdownReport(report, options.reportOutputDir);
    }

    return report;
  }

  /**
   * Formats and writes the audit report as human-readable Markdown.
   *
   * @param report - Completed audit report
   * @param customDir - Target output directory
   * @returns Written file path
   */
  async saveMarkdownReport(report: AuditReport, customDir?: string): Promise<string> {
    const targetDir = customDir || path.resolve(process.cwd(), '../docs/audits');
    await fs.mkdir(targetDir, { recursive: true });

    const fileName = `sentinel-audit-${report.generatedAt.toISOString().slice(0, 10)}.md`;
    const fullPath = path.join(targetDir, fileName);

    const markdown = this.formatMarkdownReport(report);
    await fs.writeFile(fullPath, markdown, 'utf-8');

    return fullPath;
  }

  /**
   * Generates a GitHub-flavored Markdown document from an AuditReport.
   *
   * @param report - Audit report
   * @returns Formatted Markdown string
   */
  formatMarkdownReport(report: AuditReport): string {
    const lines: string[] = [];

    lines.push(`# SequenceSentinel Integrity Diagnostic Report`);
    lines.push(`**Generated:** ${report.generatedAt.toISOString()}`);
    lines.push(`**Audit Window:** ${report.auditWindow.startDate.toISOString()} to ${report.auditWindow.endDate.toISOString()}`);
    lines.push(`**Total Sequences Evaluated:** ${report.totalSequencesEvaluated}`);
    lines.push(`**Total Violations Detected:** ${report.totalViolations}`);
    lines.push('');

    lines.push(`## Business Logic Scorecard (BL-101 to BL-802)`);
    lines.push('| Rule Code | Rule Name | Category | Evaluated | Violations | Status |');
    lines.push('| :--- | :--- | :--- | :---: | :---: | :---: |');

    for (const row of report.scorecard) {
      const icon = row.status === 'PASS' ? '✅ PASS' : row.status === 'FAIL' ? '❌ FAIL' : '⚠️ WARN';
      lines.push(`| **${row.ruleCode}** | ${row.ruleName} | ${row.category} | ${row.evaluatedCount} | ${row.violationCount} | ${icon} |`);
    }
    lines.push('');

    if (report.violations.length > 0) {
      lines.push(`## Violation Details & Evidence`);
      for (const [idx, v] of report.violations.entries()) {
        lines.push(`### ${idx + 1}. [${v.severity}] ${v.ruleCode}: ${v.ruleName}`);
        lines.push(`- **Entity:** \`${v.entityType} ${v.entityId}\` (Tenant: \`${v.tenantId}\`)`);
        lines.push(`- **Violated At:** ${v.violatedAt.toISOString()}`);
        lines.push(`- **Rationale:** ${v.rationale}`);
        lines.push('```json');
        lines.push(JSON.stringify(v.evidence, null, 2));
        lines.push('```');
        lines.push('');
      }
    } else {
      lines.push(`> [!NOTE]\n> Zero business logic violations detected across all evaluated sequences.`);
    }

    if (report.synthesizedTestPaths && report.synthesizedTestPaths.length > 0) {
      lines.push(`## Auto-Generated Vitest Regression Specs`);
      for (const testPath of report.synthesizedTestPaths) {
        lines.push(`- \`${testPath}\``);
      }
      lines.push('');
    }

    if (report.remediations && report.remediations.length > 0) {
      lines.push(`## Autonomous Remediation (Self-Healing Executions)`);
      lines.push('| Rule | Entity | Status | Action Taken | Details / Error |');
      lines.push('| :--- | :--- | :---: | :--- | :--- |');
      for (const r of report.remediations) {
        const icon = r.simulated ? '🔍 SIMULATED' : r.success ? '✅ REPAIRED' : '❌ FAILED';
        const info = r.success ? JSON.stringify(r.details || {}) : r.error || 'Unknown';
        lines.push(`| **${r.ruleCode}** | \`${r.entityId}\` | ${icon} | \`${r.actionTaken}\` | ${info} |`);
      }
      lines.push('');
    }

    if (report.deadLetterQueue && report.deadLetterQueue.length > 0) {
      lines.push(`## ⚠️ Dead-Letter Queue (DLQ) Incidents`);
      lines.push('| Rule | Tenant | Entity | Reason | Error Details |');
      lines.push('| :--- | :--- | :--- | :--- | :--- |');
      for (const item of report.deadLetterQueue) {
        lines.push(`| **${item.ruleCode}** | \`${item.tenantId}\` | \`${item.entityId}\` | \`${item.reason}\` | ${item.errorDetails} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
