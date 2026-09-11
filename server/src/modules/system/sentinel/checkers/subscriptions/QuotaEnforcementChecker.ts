import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/**
 * Invariant Checker enforcing BL-201: Feature & Ticket Quota Rule.
 * Validates that the number of tickets created for a tenant within a billing month
 * does not exceed the allowed plan quota without authorized overage.
 *
 * @see BL-201
 */
export class QuotaEnforcementChecker implements InvariantChecker {
  readonly ruleCode = 'BL-201';
  readonly ruleName = 'Monthly Plan Ticket Quota Rule';
  readonly category = 'SUBSCRIPTIONS';

  /** Default monthly ticket allowance per device when not explicitly configured */
  private readonly defaultTicketsPerDevice = 5;

  /**
   * Evaluates ticket sequences grouped by tenant to check monthly quota compliance.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const ticketSequences = sequences.filter((s) => s.entityType === 'TICKET');
    const violations: InvariantViolation[] = [];

    // Group tickets by tenant and month
    const tenantMonthMap = new Map<string, ActionSequence[]>();

    for (const seq of ticketSequences) {
      const createdStep = seq.steps.find((s) => s.action === 'TICKET_CREATED');
      if (!createdStep) continue;

      const date = createdStep.timestamp;
      const key = `${seq.tenantId}-${date.getFullYear()}-${date.getMonth()}`;
      const existing = tenantMonthMap.get(key) || [];
      existing.push(seq);
      tenantMonthMap.set(key, existing);
    }

    for (const [key, seqList] of tenantMonthMap.entries()) {
      const [tenantId] = key.split('-');
      const sampleSeq = seqList[0];
      const rawSub = sampleSeq.rootContext?.subscription as
        | { plan_id?: string; device_quota?: number; max_tickets?: number }
        | undefined;

      const allowedQuota =
        rawSub?.max_tickets ||
        (rawSub?.device_quota ? rawSub.device_quota * this.defaultTicketsPerDevice : 100);

      if (seqList.length > allowedQuota) {
        const excessCount = seqList.length - allowedQuota;
        const lastSeq = seqList[seqList.length - 1];
        const lastStep = lastSeq.steps[lastSeq.steps.length - 1];

        violations.push({
          ruleCode: this.ruleCode,
          ruleName: this.ruleName,
          severity: 'HIGH',
          entityId: tenantId,
          entityType: 'TENANT',
          tenantId,
          violatedAt: lastStep.timestamp,
          rationale: `Tenant '${tenantId}' exceeded monthly ticket quota (${seqList.length} created vs ${allowedQuota} allowed) without authorized overage (BL-201).`,
          evidence: {
            tenantId,
            totalCreated: seqList.length,
            allowedQuota,
            excessTickets: excessCount,
          },
          actionSequence: lastSeq,
        });
      }
    }

    return {
      ruleCode: this.ruleCode,
      ruleName: this.ruleName,
      category: this.category,
      evaluatedCount: tenantMonthMap.size,
      violations,
    };
  }
}
