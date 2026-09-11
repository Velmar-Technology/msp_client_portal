import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-402: Auto-Renew Recurring Agreement Integrity.
 * Audits recurring PayPal billing agreements (I-..., MOCK-SUB-...) to prevent zombie
 * auto-debits on cancelled subscriptions, past-due renewal stagnation, and slot desync.
 *
 * @see BL-402
 */
export class AutoRenewSyncChecker implements InvariantChecker {
  readonly ruleCode = 'BL-402';
  readonly ruleName = 'Auto-Renew Recurring Agreement Integrity Rule';
  readonly category = 'BILLING';

  /**
   * Evaluates action sequences to verify recurring PayPal subscription agreement consistency.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const invoiceSequences = sequences.filter((s) => s.entityType === 'INVOICE');
    const violations: InvariantViolation[] = [];
    const now = new Date();
    const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24-hour grace period past renewal date

    for (const seq of invoiceSequences) {
      const rawSub = seq.rootContext?.subscription as
        | {
            id?: string;
            renewal_date?: Date | string;
            status?: string;
            paypal_order_id?: string | null;
            equipment_count?: number;
          }
        | undefined;

      if (!rawSub || !rawSub.paypal_order_id) continue;

      const isRecurringAgreement =
        rawSub.paypal_order_id.startsWith('I-') ||
        rawSub.paypal_order_id.startsWith('MOCK-SUB-');

      if (!isRecurringAgreement) continue;

      // Invariant Check 1: Zombie recurring agreement on cancelled subscription
      if (rawSub.status === 'CANCELLED') {
        const hasRevocationStep = seq.steps.some(
          (s) =>
            s.action === 'PAYPAL_SUBSCRIPTION_CANCELLED' ||
            s.action === 'SUBSCRIPTION_CANCELLED' ||
            s.metadata?.paypalAgreementCancelled === true
        );

        if (!hasRevocationStep) {
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'CRITICAL',
            entityId: seq.entityId,
            entityType: 'INVOICE',
            tenantId: seq.tenantId,
            violatedAt: new Date(),
            rationale: `Cancelled subscription '${rawSub.id}' still has active PayPal recurring agreement '${rawSub.paypal_order_id}' linked without revocation (BL-402).`,
            evidence: {
              subscriptionId: rawSub.id,
              paypalOrderId: rawSub.paypal_order_id,
              subscriptionStatus: rawSub.status,
            },
            actionSequence: seq,
          });
        }
      }

      // Invariant Check 2: Past-due auto-renew stagnation (>24h overdue without payment)
      if (rawSub.status === 'ACTIVE' && rawSub.renewal_date) {
        const renewalDate = new Date(rawSub.renewal_date);
        const hasRenewalPayment = seq.steps.some(
          (s) => s.action === 'INVOICE_PAID' || s.newState?.status === 'PAID'
        );

        if (!hasRenewalPayment && now.getTime() - renewalDate.getTime() > GRACE_PERIOD_MS) {
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'HIGH',
            entityId: seq.entityId,
            entityType: 'INVOICE',
            tenantId: seq.tenantId,
            violatedAt: renewalDate,
            rationale: `Recurring PayPal subscription agreement '${rawSub.paypal_order_id}' is past due (${renewalDate.toISOString()}) without a recorded renewal capture (BL-402).`,
            evidence: {
              subscriptionId: rawSub.id,
              paypalOrderId: rawSub.paypal_order_id,
              renewalDate: renewalDate.toISOString(),
              hoursOverdue: Math.round((now.getTime() - renewalDate.getTime()) / (60 * 60 * 1000)),
            },
            actionSequence: seq,
          });
        }
      }

      // Invariant Check 3: Non-positive equipment slots on recurring subscription
      if (rawSub.equipment_count !== undefined && rawSub.equipment_count <= 0) {
        violations.push({
          ruleCode: this.ruleCode,
          ruleName: this.ruleName,
          severity: 'HIGH',
          entityId: seq.entityId,
          entityType: 'INVOICE',
          tenantId: seq.tenantId,
          violatedAt: new Date(),
          rationale: `Recurring PayPal subscription '${rawSub.id}' has invalid non-positive equipment count '${rawSub.equipment_count}' (BL-402).`,
          evidence: {
            subscriptionId: rawSub.id,
            equipmentCount: rawSub.equipment_count,
            paypalOrderId: rawSub.paypal_order_id,
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
