import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-401: Subscription Reactivation on Payment.
 * Validates that when an invoice was successfully paid, any linked expired subscription
 * was reactivated to 'ACTIVE'.
 *
 * @see BL-401
 */
export class SubscriptionReactivationChecker implements InvariantChecker {
  readonly ruleCode = 'BL-401';
  readonly ruleName = 'Subscription Reactivation on Payment Rule';
  readonly category = 'BILLING';

  /**
   * Evaluates invoice sequences to ensure paid invoices reactivated linked subscriptions.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const invoiceSequences = sequences.filter((s) => s.entityType === 'INVOICE');
    const violations: InvariantViolation[] = [];

    for (const seq of invoiceSequences) {
      const isPaid = seq.steps.some(
        (step) => step.action === 'INVOICE_PAID' || step.newState?.status === 'PAID'
      );

      if (isPaid) {
        const rawSub = seq.rootContext?.subscription as { status?: string; id?: string } | undefined;

        if (rawSub && (rawSub.status === 'EXPIRED' || rawSub.status === 'SUSPENDED')) {
          const paidStep = seq.steps.find((s) => s.action === 'INVOICE_PAID') || seq.steps[seq.steps.length - 1];

          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'CRITICAL',
            entityId: seq.entityId,
            entityType: 'INVOICE',
            tenantId: seq.tenantId,
            violatedAt: paidStep.timestamp,
            rationale: `Invoice was paid, but linked subscription '${rawSub.id}' remained in '${rawSub.status}' instead of 'ACTIVE' (BL-401).`,
            evidence: {
              invoiceId: seq.entityId,
              subscriptionId: rawSub.id,
              subscriptionStatus: rawSub.status,
              paidAt: paidStep.timestamp.toISOString(),
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
      evaluatedCount: invoiceSequences.length,
      violations,
    };
  }
}
