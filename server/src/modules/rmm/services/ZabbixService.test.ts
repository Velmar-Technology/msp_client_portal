import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZabbixService } from './ZabbixService';

describe('ZabbixService', () => {
  let service: ZabbixService;

  beforeEach(() => {
    service = new ZabbixService('http://localhost:9999/api_jsonrpc.php', 'Admin', 'zabbix');
  });

  it('generates deterministic host metrics with UNKNOWN status when Zabbix API is offline', async () => {
    const equipmentId = '11111111-2222-3333-4444-555555555555';
    const metrics = await service.getHostTelemetry(equipmentId);

    expect(metrics).toBeDefined();
    expect(metrics.zabbixHostId).toContain('zbx-11111111');
    expect(metrics.agentStatus).toBe('UNKNOWN');
    expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
    expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    expect(metrics.diskUsage).toBeGreaterThanOrEqual(0);
  });

  it('returns UNKNOWN status for fallback telemetry (not fake ONLINE/OFFLINE)', async () => {
    const equipmentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const metrics = await service.getHostTelemetry(equipmentId);

    expect(metrics.agentStatus).toBe('UNKNOWN');
  });

  it('handles host syncing fallback cleanly', async () => {
    const equipmentId = 'abcd-1234-efgh-5678';
    const hostId = await service.syncHost(equipmentId, 'Workstation-01');

    expect(hostId).toBeDefined();
    expect(typeof hostId).toBe('string');
    expect(hostId).toMatch(/^zbx-/);
  });

  it('executes patch script call returning boolean success', async () => {
    const result = await service.executePatchScript('zbx-abcd', 'KB5034123');
    expect(result).toBe(true);
  });

  it('checkHealth returns unreachable when Zabbix API is offline', async () => {
    const health = await service.checkHealth();

    expect(health).toBeDefined();
    expect(health.reachable).toBe(false);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('checkHealth caches results within TTL window', async () => {
    const health1 = await service.checkHealth();
    const health2 = await service.checkHealth();

    expect(health1.latencyMs).toBe(health2.latencyMs);
    expect(health1.reachable).toBe(health2.reachable);
  });

  it('isConnected returns false when API is unreachable', async () => {
    await service.checkHealth();
    expect(service.isConnected()).toBe(false);
  });

  it('authenticate returns null when API is unreachable', async () => {
    const token = await service.authenticate();
    expect(token).toBeNull();
  });

  it('getHostTelemetry with real zabbixHostId but offline API returns fallback', async () => {
    const equipmentId = 'test-equipment-001';
    const metrics = await service.getHostTelemetry(equipmentId, '12345');

    expect(metrics.agentStatus).toBe('UNKNOWN');
    expect(metrics.zabbixHostId).toBe('12345');
  });

  it('getHostTelemetry with zbx- prefix skips API call entirely', async () => {
    const equipmentId = 'test-equipment-002';
    const metrics = await service.getHostTelemetry(equipmentId, 'zbx-test002');

    expect(metrics.agentStatus).toBe('UNKNOWN');
    expect(metrics.zabbixHostId).toBe('zbx-test002');
  });
});
