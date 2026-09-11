import { logger } from '@shared/utils/logger';
import {
  DeadLetterRecord,
  InvariantViolation,
  RemediationHandler,
  RemediationResult,
} from '../types';
import { SubscriptionReactivationRemediator } from '../remediators/SubscriptionReactivationRemediator';
import { TierEscalationRemediator } from '../remediators/TierEscalationRemediator';
import { TechnicianBountyRemediator } from '../remediators/TechnicianBountyRemediator';
import { NonPaymentEnforcementRemediator } from '../remediators/NonPaymentEnforcementRemediator';
import { FlappingAlertRemediator } from '../remediators/FlappingAlertRemediator';

/** Options for auto-healing invocation */
export interface AutoHealOptions {
  /** When true, simulates remediation actions without persisting database mutations */
  dryRun?: boolean;
}

/**
 * Service that coordinates autonomous self-healing and restorative actions for detected
 * business logic violations, enforcing strict circuit breakers to prevent runaway cascades.
 */
export class SelfHealingService {
  private readonly remediators: Map<string, RemediationHandler> = new Map();
  /** Track remediation attempts per tenant for circuit breaking (sliding 1-hour window) */
  private readonly tenantRemediationLog: Map<string, number[]> = new Map();
  /** In-memory Dead-Letter Queue (DLQ) for failed or circuit-tripped remediations */
  private readonly deadLetterQueue: DeadLetterRecord[] = [];

  /** Max allowed auto-remediations per tenant within an hour */
  private readonly maxRemediationsPerHour = 5;

  /**
   * Initializes SelfHealingService with default or custom remediator handlers.
   *
   * @param customRemediators - Optional custom handlers
   */
  constructor(customRemediators?: RemediationHandler[]) {
    const handlers = customRemediators || [
      new SubscriptionReactivationRemediator(),
      new TierEscalationRemediator(),
      new TechnicianBountyRemediator(),
      new NonPaymentEnforcementRemediator(),
      new FlappingAlertRemediator(),
    ];

    for (const handler of handlers) {
      this.remediators.set(handler.ruleCode, handler);
    }
  }

  /**
   * Evaluates a collection of violations and executes registered autonomous remediations
   * while respecting tenant safety circuit breakers.
   *
   * @param violations - List of detected invariant breaches
   * @param options - Execution options (e.g. dryRun)
   * @returns List of executed remediation results
   */
  async autoHealViolations(
    violations: InvariantViolation[],
    options: AutoHealOptions = {}
  ): Promise<RemediationResult[]> {
    const results: RemediationResult[] = [];

    for (const violation of violations) {
      const remediator = this.remediators.get(violation.ruleCode);
      if (!remediator) {
        continue; // No autonomous remediator registered for this rule
      }

      // Check tenant circuit breaker
      if (!this.checkCircuitBreaker(violation.tenantId)) {
        const errorMsg = `Circuit breaker active: exceeded ${this.maxRemediationsPerHour} auto-remediations per hour`;
        logger.warn(
          `[Sentinel Circuit Breaker Tripped] Exceeded max auto-remediations (${this.maxRemediationsPerHour}/hr) for tenant '${violation.tenantId}'. Skipping rule '${violation.ruleCode}'.`
        );

        this.enqueueDeadLetter(
          violation,
          'CIRCUIT_BREAKER_TRIPPED',
          errorMsg
        );

        results.push({
          ruleCode: violation.ruleCode,
          entityId: violation.entityId,
          tenantId: violation.tenantId,
          success: false,
          actionTaken: 'CIRCUIT_BREAKER_TRIPPED',
          error: errorMsg,
          remediatedAt: new Date(),
          simulated: options.dryRun,
        });
        continue;
      }

      // If dry-run mode, simulate remediation without executing mutations
      if (options.dryRun) {
        logger.info(
          `[Sentinel Dry-Run Simulation] Would execute remediator '${remediator.name}' for rule '${violation.ruleCode}' on entity '${violation.entityId}' (Tenant: '${violation.tenantId}').`
        );
        results.push({
          ruleCode: violation.ruleCode,
          entityId: violation.entityId,
          tenantId: violation.tenantId,
          success: true,
          actionTaken: 'SIMULATED_REMEDIATION',
          details: {
            intendedRemediator: remediator.name,
            ruleCode: violation.ruleCode,
            evidence: violation.evidence,
          },
          remediatedAt: new Date(),
          simulated: true,
        });
        continue;
      }

      // Record attempt timestamp for tenant
      this.recordAttempt(violation.tenantId);

      try {
        const result = await remediator.remediate(violation);
        if (!result.success) {
          this.enqueueDeadLetter(
            violation,
            'REMEDIATOR_ERROR',
            result.error || 'Remediator returned failure status'
          );
        }
        results.push(result);
      } catch (err: any) {
        logger.error(
          `[Sentinel Self-Healing Crash] Unexpected failure in remediator '${remediator.name}':`,
          err
        );
        this.enqueueDeadLetter(
          violation,
          'UNHANDLED_EXCEPTION',
          err.message || 'Unknown exception'
        );
        results.push({
          ruleCode: violation.ruleCode,
          entityId: violation.entityId,
          tenantId: violation.tenantId,
          success: false,
          actionTaken: 'UNHANDLED_REMEDIATOR_ERROR',
          error: err.message,
          remediatedAt: new Date(),
        });
      }
    }

    return results;
  }

  /**
   * Retrieves all dead-letter records captured during this process lifecycle.
   *
   * @returns Array of DeadLetterRecord
   */
  getDeadLetterQueue(): DeadLetterRecord[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Enqueues a failed or rejected remediation event into the Dead-Letter Queue.
   */
  private enqueueDeadLetter(
    violation: InvariantViolation,
    reason: DeadLetterRecord['reason'],
    errorDetails: string
  ): void {
    const record: DeadLetterRecord = {
      id: `dlq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ruleCode: violation.ruleCode,
      entityId: violation.entityId,
      tenantId: violation.tenantId,
      reason,
      errorDetails,
      timestamp: new Date(),
      violationSnapshot: {
        rationale: violation.rationale,
        evidence: violation.evidence,
      },
    };
    this.deadLetterQueue.push(record);
  }

  /**
   * Verifies whether a tenant has exceeded the rate-limited circuit breaker threshold.
   *
   * @param tenantId - Tenant UUID
   * @returns boolean true if within allowed limits
   */
  private checkCircuitBreaker(tenantId: string): boolean {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    const timestamps = (this.tenantRemediationLog.get(tenantId) || []).filter(
      (ts) => ts > oneHourAgo
    );
    this.tenantRemediationLog.set(tenantId, timestamps);

    return timestamps.length < this.maxRemediationsPerHour;
  }

  /**
   * Records a timestamped remediation attempt for circuit breaking.
   */
  private recordAttempt(tenantId: string): void {
    const timestamps = this.tenantRemediationLog.get(tenantId) || [];
    timestamps.push(Date.now());
    this.tenantRemediationLog.set(tenantId, timestamps);
  }
}
