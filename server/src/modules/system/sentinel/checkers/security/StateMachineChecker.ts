import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/** Allowed status transitions for standard tickets */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'WAITING_ON_CLIENT', 'CANCELLED', 'RESOLVED', 'CLOSED'],
  IN_PROGRESS: ['WAITING_ON_CLIENT', 'RESOLVED', 'CLOSED', 'CANCELLED'],
  WAITING_ON_CLIENT: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'], // can reopen to IN_PROGRESS
  CLOSED: ['IN_PROGRESS'], // reopening requires formal trigger
  CANCELLED: [], // Terminal state
};

/**
 * Invariant Checker enforcing BL-301: RBAC & State Machine Matrix Rule.
 * Asserts that:
 * 1. State transitions conform to the canonical state machine transitions.
 * 2. Terminal states (like CANCELLED) cannot transition into other states.
 * 3. Client actors can only trigger transitions to CANCELLED.
 *
 * @see BL-301
 */
export class StateMachineChecker implements InvariantChecker {
  readonly ruleCode = 'BL-301';
  readonly ruleName = 'RBAC & Lifecycle State Machine Invariant Rule';
  readonly category = 'SECURITY';

  /**
   * Evaluates ticket sequences for illegal status jumps or unauthorized actor transitions.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const ticketSequences = sequences.filter((s) => s.entityType === 'TICKET');
    const violations: InvariantViolation[] = [];

    for (const seq of ticketSequences) {
      let currentStatus = 'OPEN';

      for (const step of seq.steps) {
        if (!step.action.startsWith('STATUS_CHANGED_')) continue;

        const newStatus = step.newState?.status as string;
        const oldStatus = (step.previousState?.status as string) || currentStatus;

        if (newStatus && oldStatus) {
          const allowed = VALID_STATUS_TRANSITIONS[oldStatus] || [];

          if (!allowed.includes(newStatus)) {
            violations.push({
              ruleCode: this.ruleCode,
              ruleName: this.ruleName,
              severity: 'CRITICAL',
              entityId: seq.entityId,
              entityType: 'TICKET',
              tenantId: seq.tenantId,
              violatedAt: step.timestamp,
              rationale: `Disallowed state transition from '${oldStatus}' to '${newStatus}' on ticket '${seq.entityId}' (BL-301).`,
              evidence: {
                ticketId: seq.entityId,
                oldStatus,
                newStatus,
                allowedTransitions: allowed,
                actorId: step.actorId,
              },
              actionSequence: seq,
            });
          }

          // RBAC enforcement: CLIENT actors can only transition to CANCELLED
          if (step.actorRole === 'CLIENT' && newStatus !== 'CANCELLED') {
            violations.push({
              ruleCode: this.ruleCode,
              ruleName: this.ruleName,
              severity: 'HIGH',
              entityId: seq.entityId,
              entityType: 'TICKET',
              tenantId: seq.tenantId,
              violatedAt: step.timestamp,
              rationale: `Client actor '${step.actorId}' attempted unauthorized status transition to '${newStatus}' (BL-301).`,
              evidence: {
                ticketId: seq.entityId,
                actorId: step.actorId,
                actorRole: 'CLIENT',
                attemptedStatus: newStatus,
              },
              actionSequence: seq,
            });
          }

          currentStatus = newStatus;
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
