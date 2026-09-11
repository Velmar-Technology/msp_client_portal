import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/** Standard ITBIS tax rate in the Dominican Republic */
export const ITBIS_TAX_RATE = 0.18;

/**
 * Invariant Checker enforcing BL-701: NCF Voucher & 18% ITBIS Tax Calculation Rule.
 * Validates that:
 * 1. The tax_amount strictly computes to 18% of subtotal (with +/- 0.02 cent rounding allowance).
 * 2. When an NCF code is assigned, it conforms to the DGII Series B01 standard format.
 *
 * @see BL-701
 */
export class TaxAndNcfChecker implements InvariantChecker {
  readonly ruleCode = 'BL-701';
  readonly ruleName = '18% ITBIS Tax & B01 NCF Voucher Rule';
  readonly category = 'BILLING';

  /**
   * Evaluates invoice sequences for tax computation accuracy and NCF voucher structure.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const invoiceSequences = sequences.filter((s) => s.entityType === 'INVOICE');
    const violations: InvariantViolation[] = [];

    for (const seq of invoiceSequences) {
      const issuedStep = seq.steps.find((s) => s.action === 'INVOICE_ISSUED');
      if (!issuedStep) continue;

      const subtotal = parseFloat((issuedStep.metadata?.subtotal as string) || '0');
      const taxAmount = parseFloat((issuedStep.metadata?.taxAmount as string) || '0');
      const ncfCode = (issuedStep.metadata?.ncfCode as string) || '';

      if (subtotal > 0) {
        const expectedTax = subtotal * ITBIS_TAX_RATE;
        const diff = Math.abs(taxAmount - expectedTax);

        // Discrepancy greater than 2 cents
        if (diff > 0.02) {
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'CRITICAL',
            entityId: seq.entityId,
            entityType: 'INVOICE',
            tenantId: seq.tenantId,
            violatedAt: issuedStep.timestamp,
            rationale: `Invoice tax amount ($${taxAmount.toFixed(2)}) deviated from the mandatory 18% ITBIS ($${expectedTax.toFixed(2)}) by $${diff.toFixed(2)} (BL-701).`,
            evidence: {
              invoiceId: seq.entityId,
              subtotal,
              actualTax: taxAmount,
              expectedTax,
              difference: diff,
            },
            actionSequence: seq,
          });
        }
      }

      // Check NCF format if present
      if (ncfCode && !/^B01\d{8,10}$/i.test(ncfCode)) {
        violations.push({
          ruleCode: this.ruleCode,
          ruleName: this.ruleName,
          severity: 'HIGH',
          entityId: seq.entityId,
          entityType: 'INVOICE',
          tenantId: seq.tenantId,
          violatedAt: issuedStep.timestamp,
          rationale: `Invoice assigned invalid NCF voucher code '${ncfCode}', must match Series B01 format (BL-701).`,
          evidence: {
            invoiceId: seq.entityId,
            ncfCode,
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
