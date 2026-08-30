import {
  EntitlementLog,
  RiskAssessment,
  RoleMiningSuggestion,
  SessionTelemetry,
} from './types';

/**
 * Service providing Continuous Adaptive Trust (Zero-Trust Session Scoring)
 * and Unsupervised Role Mining Entitlement Optimization.
 */
export class ContinuousAdaptiveTrustService {
  // In-memory telemetry cache for real-time velocity & anomaly tracking
  private recentSessions: Map<string, SessionTelemetry[]> = new Map();

  /**
   * Maximum allowed data transfer per single operation before flagging anomaly (50 MB).
   */
  private readonly DATA_SPIKE_THRESHOLD_BYTES = 50 * 1024 * 1024;

  /**
   * Maximum actions in a 60-second window before velocity anomaly triggers.
   */
  private readonly VELOCITY_SPIKE_THRESHOLD = 40;

  /**
   * Evaluates continuous real-time session risk based on streaming telemetry.
   *
   * @param event - Incoming session telemetry event
   * @returns RiskAssessment containing calculated riskScore and enforcement triggers
   */
  evaluateSessionRisk(event: SessionTelemetry): RiskAssessment {
    const anomalies: string[] = [];
    let riskScore = 0;

    const userHistory = this.recentSessions.get(event.userId) || [];

    // 1. Data Exfiltration / Spike Detection
    if (event.bytesTransferred && event.bytesTransferred > this.DATA_SPIKE_THRESHOLD_BYTES) {
      anomalies.push(`Data transfer spike detected: ${(event.bytesTransferred / 1024 / 1024).toFixed(1)}MB`);
      riskScore += 45;
    }

    // 2. Velocity Anomaly (Burst / Brute Force)
    const now = event.timestamp.getTime();
    const oneMinuteAgo = now - 60000;
    const recentActions = userHistory.filter((h) => h.timestamp.getTime() > oneMinuteAgo);

    if (recentActions.length >= this.VELOCITY_SPIKE_THRESHOLD) {
      anomalies.push(`High request velocity: ${recentActions.length} actions in 60s`);
      riskScore += 35;
    }

    // 3. Geographic / IP Disparity Anomaly (Impossible Travel)
    if (userHistory.length > 0) {
      const lastSession = userHistory[userHistory.length - 1];
      const timeDiffMinutes = (now - lastSession.timestamp.getTime()) / 60000;

      if (
        event.geoCountry &&
        lastSession.geoCountry &&
        event.geoCountry !== lastSession.geoCountry &&
        timeDiffMinutes < 120
      ) {
        anomalies.push(
          `Impossible travel: geo changed from ${lastSession.geoCountry} to ${event.geoCountry} in ${timeDiffMinutes.toFixed(0)}m`,
        );
        riskScore += 60;
      }
    }

    // Store telemetry event
    userHistory.push(event);
    if (userHistory.length > 100) {
      userHistory.shift();
    }
    this.recentSessions.set(event.userId, userHistory);

    // Determine Risk Level & Enforcement Triggers
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (riskScore >= 75) {
      riskLevel = 'CRITICAL';
    } else if (riskScore >= 50) {
      riskLevel = 'HIGH';
    } else if (riskScore >= 25) {
      riskLevel = 'MEDIUM';
    }

    return {
      riskScore,
      riskLevel,
      anomalies,
      shouldTriggerStepUpMfa: riskLevel === 'MEDIUM' || riskLevel === 'HIGH',
      shouldDropSession: riskLevel === 'CRITICAL',
    };
  }

  /**
   * Unsupervised Role Mining Algorithm:
   * Analyzes raw corporate entitlement usage logs, identifies permission sprawl/drift,
   * and generates optimized least-privilege role recommendations.
   *
   * @param logs - Historical entitlement usage logs
   * @param frequencyThreshold - Minimum percentage of users who must use a permission for inclusion (0.0 to 1.0)
   * @returns Array of optimized RoleMiningSuggestion templates
   */
  mineRoles(
    logs: EntitlementLog[],
    frequencyThreshold = 0.3,
  ): RoleMiningSuggestion[] {
    const roleGroups = new Map<string, { users: Set<string>; permissions: Map<string, number>; totalActions: number }>();

    for (const log of logs) {
      if (!roleGroups.has(log.role)) {
        roleGroups.set(log.role, {
          users: new Set(),
          permissions: new Map(),
          totalActions: 0,
        });
      }

      const group = roleGroups.get(log.role)!;
      group.users.add(log.userId);
      group.totalActions += log.frequency;

      const currentCount = group.permissions.get(log.permission) || 0;
      group.permissions.set(log.permission, currentCount + log.frequency);
    }

    const suggestions: RoleMiningSuggestion[] = [];

    for (const [roleName, data] of roleGroups.entries()) {
      const activePermissions: string[] = [];
      let unusedCount = 0;

      for (const [perm, count] of data.permissions.entries()) {
        const usageRatio = count / (data.totalActions || 1);
        if (usageRatio >= frequencyThreshold || count >= 5) {
          activePermissions.push(perm);
        } else {
          unusedCount++;
        }
      }

      const totalPermissions = data.permissions.size;
      const redundancyScore = totalPermissions > 0 ? unusedCount / totalPermissions : 0;
      const entitlementDriftDetected = redundancyScore > 0.4;

      suggestions.push({
        proposedRoleName: `${roleName}_Optimized_LeastPrivilege`,
        includedPermissions: activePermissions,
        affectedUsers: Array.from(data.users),
        redundancyScore: Math.round(redundancyScore * 100) / 100,
        entitlementDriftDetected,
      });
    }

    return suggestions;
  }

  /**
   * Resets internal telemetry state (for testing and memory recycling).
   */
  reset(): void {
    this.recentSessions.clear();
  }
}

export const continuousAdaptiveTrustService = new ContinuousAdaptiveTrustService();
