import { describe, it, expect, beforeEach } from 'vitest';
import { ContinuousAdaptiveTrustService } from './ContinuousAdaptiveTrustService';
import { EntitlementLog, SessionTelemetry } from './types';

describe('ContinuousAdaptiveTrustService', () => {
  let service: ContinuousAdaptiveTrustService;

  beforeEach(() => {
    service = new ContinuousAdaptiveTrustService();
    service.reset();
  });

  describe('evaluateSessionRisk (Zero-Trust Continuous Adaptive Trust)', () => {
    it('returns LOW risk for standard user telemetry', () => {
      const telemetry: SessionTelemetry = {
        userId: 'usr-1',
        clientIp: '192.168.1.100',
        action: 'view_ticket',
        timestamp: new Date(),
        bytesTransferred: 1024,
        geoCountry: 'DO',
      };

      const assessment = service.evaluateSessionRisk(telemetry);
      expect(assessment.riskLevel).toBe('LOW');
      expect(assessment.riskScore).toBe(0);
      expect(assessment.shouldTriggerStepUpMfa).toBe(false);
      expect(assessment.shouldDropSession).toBe(false);
    });

    it('detects massive data transfer spikes and elevates risk', () => {
      const telemetry: SessionTelemetry = {
        userId: 'usr-2',
        clientIp: '192.168.1.100',
        action: 'export_all_customer_data',
        timestamp: new Date(),
        bytesTransferred: 120 * 1024 * 1024, // 120 MB
        geoCountry: 'DO',
      };

      const assessment = service.evaluateSessionRisk(telemetry);
      expect(assessment.riskLevel).toBe('MEDIUM');
      expect(assessment.riskScore).toBe(45);
      expect(assessment.shouldTriggerStepUpMfa).toBe(true);
      expect(assessment.anomalies[0]).toContain('Data transfer spike detected');
    });

    it('detects impossible travel anomalies (rapid geo change)', () => {
      const t1 = new Date();
      const t2 = new Date(t1.getTime() + 10 * 60 * 1000); // 10 minutes later

      service.evaluateSessionRisk({
        userId: 'usr-3',
        clientIp: '10.0.0.1',
        action: 'login',
        timestamp: t1,
        geoCountry: 'DO',
      });

      const secondAssessment = service.evaluateSessionRisk({
        userId: 'usr-3',
        clientIp: '85.20.10.5',
        action: 'download_backup',
        timestamp: t2,
        geoCountry: 'RU',
      });

      expect(secondAssessment.riskScore).toBeGreaterThanOrEqual(60);
      expect(secondAssessment.shouldTriggerStepUpMfa).toBe(true);
      expect(secondAssessment.anomalies.some((a) => a.includes('Impossible travel'))).toBe(true);
    });
  });

  describe('mineRoles (Unsupervised Entitlement Optimization Algorithm)', () => {
    it('clusters entitlement logs, detects drift, and generates least-privilege role recommendations', () => {
      const logs: EntitlementLog[] = [
        // Frequent permissions for Tech
        { userId: 'u1', role: 'TECHNICIAN', permission: 'read_ticket', frequency: 50, lastUsed: new Date() },
        { userId: 'u1', role: 'TECHNICIAN', permission: 'update_ticket', frequency: 40, lastUsed: new Date() },
        { userId: 'u2', role: 'TECHNICIAN', permission: 'read_ticket', frequency: 60, lastUsed: new Date() },
        { userId: 'u2', role: 'TECHNICIAN', permission: 'update_ticket', frequency: 35, lastUsed: new Date() },
        // Dormant / Unused permissions assigned to role
        { userId: 'u1', role: 'TECHNICIAN', permission: 'delete_database', frequency: 0, lastUsed: new Date() },
        { userId: 'u1', role: 'TECHNICIAN', permission: 'manage_billing_gateways', frequency: 0, lastUsed: new Date() },
        { userId: 'u2', role: 'TECHNICIAN', permission: 'delete_database', frequency: 0, lastUsed: new Date() },
        { userId: 'u2', role: 'TECHNICIAN', permission: 'manage_billing_gateways', frequency: 0, lastUsed: new Date() },
      ];

      const suggestions = service.mineRoles(logs);

      expect(suggestions.length).toBe(1);
      const techSuggestion = suggestions[0];
      expect(techSuggestion.proposedRoleName).toBe('TECHNICIAN_Optimized_LeastPrivilege');
      expect(techSuggestion.includedPermissions).toContain('read_ticket');
      expect(techSuggestion.includedPermissions).toContain('update_ticket');
      expect(techSuggestion.includedPermissions).not.toContain('delete_database');
      expect(techSuggestion.includedPermissions).not.toContain('manage_billing_gateways');
      expect(techSuggestion.entitlementDriftDetected).toBe(true);
      expect(techSuggestion.redundancyScore).toBeGreaterThan(0.4);

      // Verify automated PR pruning patch diff
      expect(techSuggestion.pruningPatch).toBeDefined();
      expect(techSuggestion.pruningPatch?.retainedPermissions).toEqual(techSuggestion.includedPermissions);
      expect(techSuggestion.pruningPatch?.revokedPermissions).toContain('delete_database');
      expect(techSuggestion.pruningPatch?.revokedPermissions).toContain('manage_billing_gateways');
      expect(techSuggestion.pruningPatch?.summary).toContain('Automated Right-Sizing');
    });
  });

  describe('Step-Up Challenge Management', () => {
    it('creates, verifies, and validates step-up MFA challenges', () => {
      const challenge = service.createStepUpChallenge('user-101', 'remote_exec_powershell', 'equipment:eq-1');
      expect(challenge.challengeId).toMatch(/^stepup-/);
      expect(challenge.verified).toBe(false);

      expect(service.isStepUpVerified('user-101', 'remote_exec_powershell', 'equipment:eq-1')).toBe(false);

      // Invalid code fails
      const verifiedBad = service.verifyStepUpChallenge(challenge.challengeId, 'invalid');
      expect(verifiedBad).toBe(false);

      // Valid 6-digit MFA code succeeds
      const verifiedGood = service.verifyStepUpChallenge(challenge.challengeId, '123456');
      expect(verifiedGood).toBe(true);

      // Verified status is recognized
      expect(service.isStepUpVerified('user-101', 'remote_exec_powershell', 'equipment:eq-1')).toBe(true);
    });

    it('scores non-compliant devices with risk step-up', () => {
      const telemetry: SessionTelemetry = {
        userId: 'usr-dev-1',
        clientIp: '192.168.1.50',
        action: 'view_invoice',
        timestamp: new Date(),
      };

      const assessment = service.evaluateSessionRisk(telemetry, { deviceCompliant: false });
      expect(assessment.riskScore).toBe(30);
      expect(assessment.riskLevel).toBe('MEDIUM');
      expect(assessment.shouldTriggerStepUpMfa).toBe(true);
      expect(assessment.anomalies[0]).toContain('Non-compliant or unmanaged device');
    });
  });
});
