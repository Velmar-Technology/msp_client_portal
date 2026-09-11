import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-202: License True-Up Reconciliation Rule.
 * Validates that active endpoints/cloud seats do not exceed contract quotas without generating true-up line items.
 *
 * @see BL-202
 */
export class LicenseTrueUpChecker implements InvariantChecker {
  readonly ruleCode = 'BL-202';
  readonly ruleName = 'License True-Up Reconciliation Rule';
  readonly category = 'SUBSCRIPTIONS';

  /**
   * Evaluates subscription and device inventory sequences for contract drift.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const invoiceSequences = sequences.filter((s) => s.entityType === 'INVOICE');
    const violations: InvariantViolation[] = [];

    for (const seq of invoiceSequences) {
      const rawSub = seq.rootContext?.subscription as
        | { id?: string; device_quota?: number; active_devices_count?: number }
        | undefined;

      if (!rawSub) continue;

      const deviceQuota = rawSub.device_quota || 0;
      const activeDevices = rawSub.active_devices_count || 0;

      if (activeDevices > deviceQuota) {
        const excess = activeDevices - deviceQuota;
        violations.push({
          ruleCode: this.ruleCode,
          ruleName: this.ruleName,
          severity: 'HIGH',
          entityId: seq.entityId,
          entityType: 'INVOICE',
          tenantId: seq.tenantId,
          violatedAt: new Date(),
          rationale: `Active device count (${activeDevices}) exceeded subscription quota (${deviceQuota}) without true-up reconciliation (BL-202).`,
          evidence: {
            activeDevices,
            deviceQuota,
            unbilledExcess: excess,
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
