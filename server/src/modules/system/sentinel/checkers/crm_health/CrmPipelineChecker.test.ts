import { describe, it, expect } from 'vitest';
import { CrmPipelineChecker } from './CrmPipelineChecker';
import { ActionSequence } from '../../types';

describe('CrmPipelineChecker (BL-501)', () => {
  const checker = new CrmPipelineChecker();

  it('should pass when a WON lead has a provisioned tenant', async () => {
    const sequence: ActionSequence = {
      entityId: 'lead-won-valid',
      entityType: 'LEAD',
      tenantId: 'msp-master',
      steps: [
        {
          id: 's1',
          entityId: 'lead-won-valid',
          entityType: 'LEAD',
          action: 'LEAD_CREATED',
          timestamp: new Date(),
          tenantId: 'msp-master',
        },
        {
          id: 's2',
          entityId: 'lead-won-valid',
          entityType: 'LEAD',
          action: 'STATUS_CHANGED_WON',
          timestamp: new Date(),
          tenantId: 'msp-master',
          newState: { status: 'WON' },
        },
      ],
      rootContext: {
        lead: { id: 'lead-won-valid', status: 'WON', converted_client_id: 'tenant-client-new' },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation when a WON lead lacks a provisioned tenant', async () => {
    const sequence: ActionSequence = {
      entityId: 'lead-won-unprovisioned',
      entityType: 'LEAD',
      tenantId: 'msp-master',
      steps: [
        {
          id: 's1',
          entityId: 'lead-won-unprovisioned',
          entityType: 'LEAD',
          action: 'STATUS_CHANGED_WON',
          timestamp: new Date(),
          tenantId: 'msp-master',
          newState: { status: 'WON' },
        },
      ],
      rootContext: {
        lead: { id: 'lead-won-unprovisioned', status: 'WON', converted_client_id: null },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-501');
    expect(result.violations[0].severity).toBe('CRITICAL');
  });

  it('should pass when a WON lead has client_id in Drizzle schema format', async () => {
    const sequence: ActionSequence = {
      entityId: 'lead-won-drizzle',
      entityType: 'LEAD',
      tenantId: 'msp-master',
      steps: [
        {
          id: 's1',
          entityId: 'lead-won-drizzle',
          entityType: 'LEAD',
          action: 'LEAD_CREATED',
          timestamp: new Date(),
          tenantId: 'msp-master',
          newState: { stage: 'NEW' },
        },
        {
          id: 's2',
          entityId: 'lead-won-drizzle',
          entityType: 'LEAD',
          action: 'STATUS_CHANGED_WON',
          timestamp: new Date(),
          tenantId: 'msp-master',
          newState: { stage: 'WON' },
        },
      ],
      rootContext: {
        lead: { id: 'lead-won-drizzle', stage: 'WON', client_id: 'usr-client-uuid-123' },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(0);
  });

  it('should flag a CRITICAL violation when a WON lead in Drizzle schema format lacks client_id', async () => {
    const sequence: ActionSequence = {
      entityId: 'lead-won-drizzle-unprov',
      entityType: 'LEAD',
      tenantId: 'msp-master',
      steps: [
        {
          id: 's1',
          entityId: 'lead-won-drizzle-unprov',
          entityType: 'LEAD',
          action: 'STATUS_CHANGED_WON',
          timestamp: new Date(),
          tenantId: 'msp-master',
          newState: { stage: 'WON' },
        },
      ],
      rootContext: {
        lead: { id: 'lead-won-drizzle-unprov', stage: 'WON', client_id: null },
      },
    };

    const result = await checker.evaluate([sequence]);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].ruleCode).toBe('BL-501');
    expect(result.violations[0].severity).toBe('CRITICAL');
    expect(result.violations[0].evidence.status).toBe('WON');
  });
});
