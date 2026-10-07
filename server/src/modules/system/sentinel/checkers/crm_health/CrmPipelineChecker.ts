import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

export const VALID_LEAD_TRANSITIONS: Record<string, string[]> = {
  NEW: ['QUALIFIED', 'LOST'],
  QUALIFIED: ['PROPOSAL', 'LOST'],
  PROPOSAL: ['NEGOTIATION', 'LOST'],
  NEGOTIATION: ['WON', 'LOST'],
  WON: [], // terminal
  LOST: ['NEW'], // can re-engage
};

/**
 * Invariant Checker enforcing BL-501: CRM Lead Pipeline Progression & Auto-Provisioning.
 * Validates that:
 * 1. Leads follow the linear stage pipeline.
 * 2. Leads reaching 'WON' status have a provisioned tenant.
 *
 * @see BL-501
 */
export class CrmPipelineChecker implements InvariantChecker {
  readonly ruleCode = 'BL-501';
  readonly ruleName = 'CRM Lead Pipeline & Tenant Auto-Provisioning Rule';
  readonly category = 'CRM_HEALTH';

  /**
   * Evaluates lead sequences for valid stage transitions and WON auto-provisioning.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const leadSequences = sequences.filter((s) => s.entityType === 'LEAD');
    const violations: InvariantViolation[] = [];

    for (const seq of leadSequences) {
      const rawLead = seq.rootContext?.lead as
        | { id?: string; stage?: string; status?: string; client_id?: string | null; converted_client_id?: string | null }
        | undefined;

      const leadStage = rawLead?.stage || rawLead?.status;
      const isWon =
        leadStage === 'WON' ||
        seq.steps.some(
          (s) =>
            s.action === 'STATUS_CHANGED_WON' ||
            s.newState?.status === 'WON' ||
            s.newState?.stage === 'WON'
        );

      if (isWon) {
        const hasProvisionedTenant =
          Boolean(rawLead?.client_id) ||
          Boolean(rawLead?.converted_client_id) ||
          Boolean(seq.rootContext?.provisionedTenant);

        if (!hasProvisionedTenant) {
          const lastStep = seq.steps[seq.steps.length - 1];
          violations.push({
            ruleCode: this.ruleCode,
            ruleName: this.ruleName,
            severity: 'CRITICAL',
            entityId: seq.entityId,
            entityType: 'LEAD',
            tenantId: seq.tenantId,
            violatedAt: lastStep?.timestamp || new Date(),
            rationale: `Deal '${seq.entityId}' progressed to 'WON' but did not auto-provision a client tenant (BL-501).`,
            evidence: {
              leadId: seq.entityId,
              status: leadStage || 'WON',
              convertedClientId: rawLead?.client_id || rawLead?.converted_client_id || null,
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
      evaluatedCount: leadSequences.length,
      violations,
    };
  }
}
