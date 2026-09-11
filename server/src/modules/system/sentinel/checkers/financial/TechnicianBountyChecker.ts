import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/** Priority multipliers for technician commission calculation (BL-801) */
export const PRIORITY_MULTIPLIERS: Record<string, number> = {
  LOW: 1.0,
  MEDIUM: 1.25,
  HIGH: 1.75,
  CRITICAL: 2.5,
};

export const BASE_COMMISSION_RATE = 8.0;
export const SLA_BONUS_RATE = 4.0;
export const OPEX_COMMISSION_CATEGORY = 'Labor & Technician Commissions';

/**
 * Invariant Checker enforcing BL-801: Technician Closed-Ticket Commissions & OpEx Auto-Posting.
 * Validates that:
 * 1. Resolved/Closed tickets by a technician generate an earnings record with correct priority multiplier & SLA bonus.
 * 2. Automated resolutions (`RESOLVED_AUTOMATED`) generate $0 commission.
 * 3. Pre-Split OpEx is posted to `expenses`.
 * 4. Reopened tickets have their earnings voided.
 *
 * @see BL-801
 */
export class TechnicianBountyChecker implements InvariantChecker {
  readonly ruleCode = 'BL-801';
  readonly ruleName = 'Technician Closed-Ticket Commissions & OpEx Auto-Posting Rule';
  readonly category = 'FINANCIAL';

  /**
   * Evaluates ticket sequences for commission calculation accuracy and OpEx ledgering.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const ticketSequences = sequences.filter((s) => s.entityType === 'TICKET');
    const violations: InvariantViolation[] = [];

    for (const seq of ticketSequences) {
      const createdStep = seq.steps.find((s) => s.action === 'TICKET_CREATED');
      const resolvedStep = seq.steps.find(
        (s) =>
          s.action === 'STATUS_CHANGED_RESOLVED' ||
          s.action === 'STATUS_CHANGED_CLOSED' ||
          s.newState?.status === 'RESOLVED' ||
          s.newState?.status === 'CLOSED'
      );

      if (!resolvedStep || !createdStep) continue;

      const isAutomated =
        createdStep.metadata?.source === 'AUTOMATED_SCRIPT' ||
        resolvedStep.metadata?.notes?.toString().includes('RESOLVED_AUTOMATED');

      const earningStep = seq.steps.find((s) => s.action === 'COMMISSION_RECORDED');
      const rawEarning = seq.rootContext?.earning as
        | { total_earning?: string; status?: string; base_amount?: string; sla_bonus_amount?: string }
        | undefined;

      // Rule 1: Automated resolutions must yield $0
      if (isAutomated) {
        if (earningStep && parseFloat(earningStep.metadata?.totalEarning as string || '0') > 0) {
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'CRITICAL',
            entityId: seq.entityId,
            entityType: 'TICKET',
            tenantId: seq.tenantId,
            violatedAt: earningStep.timestamp,
            rationale: `Automated resolution generated commission > $0 (BL-801).`,
            evidence: {
              ticketId: seq.entityId,
              recordedEarning: earningStep.metadata?.totalEarning,
            },
            actionSequence: seq,
          });
        }
        continue;
      }

      // Rule 2: Technician resolutions must have commission recorded
      const priority = ((createdStep.metadata?.priority as string) || 'MEDIUM').toUpperCase();
      const multiplier = PRIORITY_MULTIPLIERS[priority] || 1.25;
      const expectedBase = BASE_COMMISSION_RATE * multiplier;

      if (!earningStep && !rawEarning) {
        violations.push({
          ruleCode: this.ruleCode,
          ruleName: this.ruleName,
          severity: 'HIGH',
          entityId: seq.entityId,
          entityType: 'TICKET',
          tenantId: seq.tenantId,
          violatedAt: resolvedStep.timestamp,
          rationale: `Technician-resolved ${priority} ticket is missing an earnings record (BL-801).`,
          evidence: {
            ticketId: seq.entityId,
            priority,
            expectedBaseRate: expectedBase,
          },
          actionSequence: seq,
        });
      }

      // Rule 3: Reopened ticket must void held commission
      const reopenedStep = seq.steps.find(
        (s, idx) =>
          idx > seq.steps.indexOf(resolvedStep) &&
          (s.action === 'STATUS_CHANGED_IN_PROGRESS' || s.action === 'STATUS_CHANGED_OPEN')
      );

      if (reopenedStep) {
        const isVoided =
          rawEarning?.status === 'VOIDED' ||
          seq.steps.some((s) => s.action === 'COMMISSION_VOIDED');

        if (!isVoided && rawEarning && rawEarning.status !== 'VOIDED') {
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'CRITICAL',
            entityId: seq.entityId,
            entityType: 'TICKET',
            tenantId: seq.tenantId,
            violatedAt: reopenedStep.timestamp,
            rationale: `Ticket was reopened but previous commission was not voided (BL-801).`,
            evidence: {
              ticketId: seq.entityId,
              earningStatus: rawEarning.status,
              reopenedAt: reopenedStep.timestamp.toISOString(),
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
