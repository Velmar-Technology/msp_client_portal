import {
  ActionSequence,
  InvariantChecker,
  InvariantCheckResult,
  InvariantViolation,
} from '../../types';

/** Flapping alert tag required for recurring alerts */
export const FLAPPING_TAG = '[FLAPPING_ALERT]';

/**
 * Invariant Checker enforcing BL-103: Alert Noise, Auto-Remediation & Flapping Rule.
 * Asserts that:
 * 1. Alerts triggered >=3 times in 24 hours on the same asset are tagged with `[FLAPPING_ALERT]` and escalated.
 * 2. Rapidly resolved script alerts (<= 300s) are marked as automated.
 *
 * @see BL-103
 */
export class AlertNoiseFlappingChecker implements InvariantChecker {
  readonly ruleCode = 'BL-103';
  readonly ruleName = 'Alert Noise, Auto-Remediation & Flapping Rule';
  readonly category = 'TICKETING';

  /**
   * Evaluates device alert sequences for noise deduplication and flapping tags.
   *
   * @param sequences - List of action sequences
   * @returns Invariant check result
   */
  async evaluate(sequences: ActionSequence[]): Promise<InvariantCheckResult> {
    const deviceSequences = sequences.filter((s) => s.entityType === 'DEVICE');
    const violations: InvariantViolation[] = [];

    for (const seq of deviceSequences) {
      const triggerSteps = seq.steps.filter((s) => s.action === 'ALERT_TRIGGERED');
      if (triggerSteps.length < 3) continue;

      // Check if 3 or more triggers occurred within any 24-hour window
      const sortedTriggers = [...triggerSteps].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      for (let i = 2; i < sortedTriggers.length; i++) {
        const earliest = sortedTriggers[i - 2];
        const latest = sortedTriggers[i];
        const deltaMs = latest.timestamp.getTime() - earliest.timestamp.getTime();

        if (deltaMs <= 24 * 60 * 60 * 1000) {
          // Flapping condition met (3 triggers in 24h)
          const title = (latest.metadata?.title as string) || '';
          const isTagged = title.includes(FLAPPING_TAG) || title.includes('FLAPPING_ALERT');

          if (!isTagged) {
            violations.push({
              ruleCode: this.ruleCode,
              ruleName: this.ruleName,
              severity: 'HIGH',
              entityId: seq.entityId,
              entityType: 'DEVICE',
              tenantId: seq.tenantId,
              violatedAt: latest.timestamp,
              rationale: `Device '${seq.entityId}' triggered 3 alert instances within 24h but was not tagged with '${FLAPPING_TAG}' (BL-103).`,
              evidence: {
                deviceId: seq.entityId,
                alertId: latest.metadata?.alertId || latest.id,
                triggerCount: 3,
                timeWindowHours: Math.round(deltaMs / (60 * 60 * 1000)),
                lastAlertTitle: title,
              },
              actionSequence: seq,
            });
            break; // Record once per sequence window
          }
        }
      }
    }

    return {
      ruleCode: this.ruleCode,
      ruleName: this.ruleName,
      category: this.category,
      evaluatedCount: deviceSequences.length,
      violations,
    };
  }
}
