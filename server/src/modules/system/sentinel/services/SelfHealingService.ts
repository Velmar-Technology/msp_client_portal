import { logger } from '@shared/utils/logger';
import { InvariantViolation, RemediationHandler, RemediationResult } from '../types';
import { SubscriptionReactivationRemediator } from '../remediators/SubscriptionReactivationRemediator';
import { TierEscalationRemediator } from '../remediators/TierEscalationRemediator';
import { TechnicianBountyRemediator } from '../remediators/TechnicianBountyRemediator';
import { NonPaymentEnforcementRemediator } from '../remediators/NonPaymentEnforcementRemediator';

/**
 * Service that coordinates autonomous self-healing and restorative actions for detected
 * business logic violations, enforcing strict circuit breakers to prevent runaway cascades.
 */
export class SelfHealingService {
  private readonly remediators: Map<string, RemediationHandler> = new Map();
  /** Track remediation attempts per tenant for circuit breaking (sliding 1-hour window) */
  private readonly tenantRemediationLog: Map<string, number[]> = new Map();

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
   * @returns List of executed remediation results
   */
  async autoHealViolations(violations: InvariantViolation[]): Promise<RemediationResult[]> {
    const results: RemediationResult[] = [];

    for (const violation of violations) {
      const remediator = this.remediators.get(violation.ruleCode);
      if (!remediator) {
        continue; // No autonomous remediator registered for this rule
      }

      // Check tenant circuit breaker
      if (!this.checkCircuitBreaker(violation.tenantId)) {
        logger.warn(
          `[Sentinel Circuit Breaker Tripped] Exceeded max auto-remediations (${this.maxRemediationsPerHour}/hr) for tenant '${violation.tenantId}'. Skipping rule '${violation.ruleCode}'.`
        );
        results.push({
          ruleCode: violation.ruleCode,
          entityId: violation.entityId,
          tenantId: violation.tenantId,
          success: false,
          actionTaken: 'CIRCUIT_BREAKER_TRIPPED',
          error: `Circuit breaker active: exceeded ${this.maxRemediationsPerHour} auto-remediations per hour`,
          remediatedAt: new Date(),
        });
        continue;
      }

      // Record attempt timestamp for tenant
      this.recordAttempt(violation.tenantId);

      try {
        const result = await remediator.remediate(violation);
        results.push(result);
      } catch (err: any) {
        logger.error(
          `[Sentinel Self-Healing Crash] Unexpected failure in remediator '${remediator.name}':`,
          err
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
