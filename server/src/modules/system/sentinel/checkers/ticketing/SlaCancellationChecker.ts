import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/** Maximum elapsed time in milliseconds allowed for cancelling warranty/service outage tickets (60 mins) */
export const SLA_CANCELLATION_WINDOW_MS = 60 * 60 * 1000;

/** Categories subject to strict 1-hour SLA cancellation rules */
export const RESTRICTED_SLA_CATEGORIES = new Set(['WARRANTY', 'SERVICE_OUTAGE']);

/**
 * Invariant Checker enforcing BL-101: 1-Hour SLA Cancellation Rule.
 * Validates that any cancellation of WARRANTY or SERVICE_OUTAGE tickets occurred within 60 minutes of creation.
 *
 * @see BL-101
 */
export class SlaCancellationChecker implements InvariantChecker {
  readonly ruleCode = 'BL-101';
  readonly ruleName = '1-Hour SLA Cancellation Constraint';
  readonly category = 'TICKETING';

  /**
   * Evaluates ticket action sequences against the 60-minute cancellation rule.
   *
   * @param sequences - List of action sequences
   * @returns Evaluation result with pass/fail metrics and any detected violations
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const ticketSequences = sequences.filter((s) => s.entityType === 'TICKET');
    const violations: InvariantViolation[] = [];

    for (const seq of ticketSequences) {
      const createdStep = seq.steps.find((step) => step.action === 'TICKET_CREATED');
      if (!createdStep) continue;

      const category = (createdStep.metadata?.category as string) || '';
      if (!RESTRICTED_SLA_CATEGORIES.has(category.toUpperCase())) {
        continue;
      }

      // Check if ticket transition reached CANCELLED
      const cancelStep = seq.steps.find(
        (step) =>
          step.action === 'STATUS_CHANGED_CANCELLED' ||
          step.newState?.status === 'CANCELLED'
      );

      if (cancelStep) {
        const elapsedMs = cancelStep.timestamp.getTime() - createdStep.timestamp.getTime();

        if (elapsedMs > SLA_CANCELLATION_WINDOW_MS) {
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'CRITICAL',
            entityId: seq.entityId,
            entityType: 'TICKET',
            tenantId: seq.tenantId,
            violatedAt: cancelStep.timestamp,
            rationale: `Ticket in category '${category}' was cancelled after ${Math.round(
              elapsedMs / 60000
            )} minutes, breaching the 60-minute cancellation SLA limit (BL-101).`,
            evidence: {
              category,
              createdAt: createdStep.timestamp.toISOString(),
              cancelledAt: cancelStep.timestamp.toISOString(),
              elapsedMinutes: Math.round(elapsedMs / 60000),
              slaWindowMinutes: 60,
              actorId: cancelStep.actorId,
            },
            actionSequence: seq,
          });
        }
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
