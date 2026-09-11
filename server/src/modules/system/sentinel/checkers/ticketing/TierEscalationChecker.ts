import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/** Thresholds in minutes before unworked tickets must escalate to Tier 2 */
export const TIER_ESCALATION_THRESHOLDS_MINUTES: Record<string, number> = {
  CRITICAL: 10,
  HIGH: 20,
  MEDIUM: 45,
  LOW: 120,
};

/**
 * Invariant Checker enforcing BL-104: Tier Escalation Timings.
 * Verifies that unworked tickets in OPEN status escalate to Tier 2 within priority deadlines:
 * CRITICAL (10m), HIGH (20m), MEDIUM (45m), LOW (120m).
 *
 * @see BL-104
 */
export class TierEscalationChecker implements InvariantChecker {
  readonly ruleCode = 'BL-104';
  readonly ruleName = 'Capacity-Weighted Tier Escalation Timing Rule';
  readonly category = 'TICKETING';

  /**
   * Evaluates ticket sequences for timely Tier 2 escalation.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const ticketSequences = sequences.filter((s) => s.entityType === 'TICKET');
    const violations: InvariantViolation[] = [];

    for (const seq of ticketSequences) {
      const createdStep = seq.steps.find((s) => s.action === 'TICKET_CREATED');
      if (!createdStep) continue;

      const priority = ((createdStep.metadata?.priority as string) || 'MEDIUM').toUpperCase();
      const thresholdMinutes = TIER_ESCALATION_THRESHOLDS_MINUTES[priority] || 45;
      const thresholdMs = thresholdMinutes * 60 * 1000;

      // Find first technician response or status change beyond OPEN
      const firstActivityStep = seq.steps.find(
        (s) =>
          s.action !== 'TICKET_CREATED' &&
          (s.action.startsWith('STATUS_CHANGED_') || s.action === 'TICKET_ASSIGNED' || s.actorRole === 'TECHNICIAN')
      );

      const escalationStep = seq.steps.find(
        (s) => s.action === 'TIER_ESCALATED' || s.metadata?.notes?.toString().includes('Tier 2')
      );

      // Check elapsed time until work started or until present
      const evaluationTime = firstActivityStep ? firstActivityStep.timestamp.getTime() : Date.now();
      const elapsedMs = evaluationTime - createdStep.timestamp.getTime();

      if (elapsedMs > thresholdMs && !escalationStep && (!firstActivityStep || firstActivityStep.action === 'STATUS_CHANGED_OPEN')) {
        violations.push({
          ruleCode: this.ruleCode,
          ruleName: this.ruleName,
          severity: priority === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          entityId: seq.entityId,
          entityType: 'TICKET',
          tenantId: seq.tenantId,
          violatedAt: new Date(createdStep.timestamp.getTime() + thresholdMs),
          rationale: `Unworked ${priority} ticket breached the ${thresholdMinutes}-minute threshold without escalating to Tier 2 (BL-104).`,
          evidence: {
            priority,
            createdAt: createdStep.timestamp.toISOString(),
            elapsedMinutes: Math.round(elapsedMs / 60000),
            thresholdMinutes,
          },
          actionSequence: seq,
        });
      }
    }

    return {
      ruleCode: this.ruleCode,
      ruleName: this.ruleName,
      category: this.category,
      evaluatedCount: ticketSequences.length,
      violations,
    };
  }
}
