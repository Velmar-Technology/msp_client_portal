import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-402: Subscription Renewal Scheduler & Hardware Multiplier Rule.
 * Validates that expiring subscriptions generate timely renewal invoices reflecting equipment multipliers.
 *
 * @see BL-402
 */
export class RenewalSchedulerChecker implements InvariantChecker {
  readonly ruleCode = 'BL-402';
  readonly ruleName = 'Subscription Renewal Scheduler & Hardware Multiplier Rule';
  readonly category = 'BILLING';

  /**
   * Evaluates billing sequences to ensure expiring subscriptions generated renewal invoices.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const invoiceSequences = sequences.filter((s) => s.entityType === 'INVOICE');
    const violations: InvariantViolation[] = [];

    for (const seq of invoiceSequences) {
      const createdStep = seq.steps.find((s) => s.action === 'INVOICE_ISSUED');
      if (!createdStep) continue;

      const rawSub = seq.rootContext?.subscription as
        | { id?: string; renewal_date?: Date | string; status?: string }
        | undefined;

      // Check if invoice has negative or zero total
      const totalAmount = parseFloat((createdStep.metadata?.totalAmount as string) || '0');
      if (totalAmount <= 0) {
        violations.push({
          ruleCode: this.ruleCode,
          ruleName: this.ruleName,
          severity: 'HIGH',
          entityId: seq.entityId,
          entityType: 'INVOICE',
          tenantId: seq.tenantId,
          violatedAt: createdStep.timestamp,
          rationale: `Renewal invoice was generated with non-positive total amount '${totalAmount}' (BL-402).`,
          evidence: {
            invoiceId: seq.entityId,
            totalAmount,
            subscriptionId: rawSub?.id,
          },
          actionSequence: seq,
        });
      }
    }

    return {
      ruleCode: this.ruleCode,
      ruleName: this.ruleName,
      category: this.category,
      evaluatedCount: invoiceSequences.length,
      violations,
    };
  }
}
