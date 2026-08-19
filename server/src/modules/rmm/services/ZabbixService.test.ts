import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ZabbixService } from './ZabbixService';

describe('ZabbixService', () => {
  let service: ZabbixService;

  beforeEach(() => {
    service = new ZabbixService('http://localhost:8080/api_jsonrpc.php', 'Admin', 'zabbix');
  });

  it('generates deterministic host metrics when Zabbix API is offline', async () => {
    const equipmentId = '11111111-2222-3333-4444-555555555555';
    const metrics = await service.getHostTelemetry(equipmentId);

    expect(metrics).toBeDefined();
    expect(metrics.zabbixHostId).toContain('zbx-11111111');
    expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
    expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
    expect(metrics.diskUsage).toBeGreaterThanOrEqual(0);
  });

  it('handles host syncing fallback cleanly', async () => {
    const equipmentId = 'abcd-1234-efgh-5678';
    const hostId = await service.syncHost(equipmentId, 'Workstation-01');

    expect(hostId).toBeDefined();
    expect(typeof hostId).toBe('string');
  });

  it('executes patch script call returning boolean success', async () => {
    const result = await service.executePatchScript('zbx-abcd', 'KB5034123');
    expect(result).toBe(true);
  });
});
