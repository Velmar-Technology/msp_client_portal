import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-102: Category-Based Round-Robin Dispatch.
 * Verifies that auto-assigned tickets designate an assigned technician and do not remain
 * unassigned indefinitely in the dispatch queue.
 *
 * @see BL-102
 */
export class RoundRobinDispatchChecker implements InvariantChecker {
  readonly ruleCode = 'BL-102';
  readonly ruleName = 'Round-Robin Dispatch & Assignment Rule';
  readonly category = 'TICKETING';

  /** Maximum time allowed in milliseconds for an auto-dispatch queue to assign a technician (15 mins) */
  private readonly maxDispatchWaitMs = 15 * 60 * 1000;

  /**
   * Evaluates ticket sequences to ensure dispatch assignments took place.
   *
   * @param sequences - List of action sequences
   * @returns Evaluation result with pass/fail metrics and violations
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const ticketSequences = sequences.filter((s) => s.entityType === 'TICKET');
    const violations: InvariantViolation[] = [];

    for (const seq of ticketSequences) {
      const createdStep = seq.steps.find((step) => step.action === 'TICKET_CREATED');
      if (!createdStep) continue;

      const rawTicket = seq.rootContext?.ticket as { assigned_tech_id?: string | null } | undefined;
      const isAssigned =
        Boolean(rawTicket?.assigned_tech_id) ||
        seq.steps.some(
          (step) =>
            step.action === 'TICKET_ASSIGNED' ||
            step.action.startsWith('STATUS_CHANGED_IN_PROGRESS') ||
            (step.actorRole === 'TECHNICIAN' && step.action !== 'COMMISSION_RECORDED')
        );

      if (!isAssigned) {
        const lastStep = seq.steps[seq.steps.length - 1];
        const elapsedSinceCreated = Date.now() - createdStep.timestamp.getTime();

        if (elapsedSinceCreated > this.maxDispatchWaitMs) {
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'HIGH',
            entityId: seq.entityId,
            entityType: 'TICKET',
            tenantId: seq.tenantId,
            violatedAt: lastStep.timestamp,
            rationale: `Ticket '${seq.entityId}' remained unassigned past the dispatch threshold of 15 minutes (BL-102).`,
            evidence: {
              category: createdStep.metadata?.category,
              priority: createdStep.metadata?.priority,
              createdAt: createdStep.timestamp.toISOString(),
              elapsedMinutes: Math.round(elapsedSinceCreated / 60000),
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
