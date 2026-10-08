import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RmmPatchService } from './RmmPatchService';
import { RmmPatchStatus } from '@shared/types';

describe('RmmPatchService', () => {
  let service: RmmPatchService;
  let mockPatchRepo: any;
  let mockTelemetryRepo: any;
  let mockEquipRepo: any;
  let mockSubRepo: any;
  let mockZabbixSvc: any;
  let mockAlertSvc: any;
  let mockGateway: any;

  const tenantId = 'tenant-123';
  const equipmentId = 'equip-456';

  beforeEach(() => {
    mockPatchRepo = {
      findByEquipment: vi.fn().mockResolvedValue([]),
      findPendingByTenant: vi.fn().mockResolvedValue([]),
      createPatch: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'p-1', ...data })),
      updatePatchStatus: vi.fn().mockImplementation((id, status) => Promise.resolve({ id, status })),
      countPendingForEquipment: vi.fn().mockResolvedValue(1),
    };

    mockTelemetryRepo = {
      findByEquipment: vi.fn().mockResolvedValue({ equipment_id: equipmentId, zabbix_host_id: 'zbx-1' }),
      findByTenant: vi.fn().mockResolvedValue([]),
      upsertTelemetry: vi.fn().mockImplementation((data) => Promise.resolve({ id: 't-1', ...data })),
    };

    mockEquipRepo = {
      findById: vi.fn().mockResolvedValue({ id: equipmentId, tenant_id: tenantId, device_name: 'Server-01' }),
      findByTenant: vi.fn().mockResolvedValue([]),
      findByTenantId: vi.fn().mockResolvedValue([]),
      findAllWithDetails: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({ id: equipmentId, updated_at: new Date() }),
    };

    mockSubRepo = {
      findByTenant: vi.fn().mockResolvedValue([
        {
          status: 'ACTIVE',
          plan: { features: [{ code: 'RMM_PATCH_MANAGEMENT' }] },
        },
      ]),
    };

    mockZabbixSvc = {
      syncHost: vi.fn().mockResolvedValue('zbx-1'),
      getHostTelemetry: vi.fn().mockResolvedValue({
        agentStatus: 'ONLINE',
        cpuUsage: 15,
        memoryUsage: 45,
        diskUsage: 30,
      }),
      executePatchScript: vi.fn().mockResolvedValue(true),
    };

    mockAlertSvc = {
      calculateNoiseReductionRatio: vi.fn().mockReturnValue(0.88),
      calculateSelfHealingEfficiency: vi.fn().mockReturnValue(0.90),
      calculateFirstContactResolutionAutomation: vi.fn().mockReturnValue(0.45),
    };

    mockGateway = {
      isAgentConnected: vi.fn().mockReturnValue(false),
      sendCommand: vi.fn(),
    };

    const mockCorrelationSvc: any = {
      detectOsProfile: vi.fn().mockReturnValue({
        equipmentId,
        deviceName: 'Server-01',
        osFamily: 'WINDOWS',
      }),
      correlateAdvisoriesForDevice: vi.fn().mockResolvedValue([
        {
          patchId: 'CVE-2024-21412',
          title: 'Internet Shortcut Files Remote Code Execution Vulnerability Patch',
          severity: 'HIGH',
          status: 'PENDING',
          releaseDate: new Date('2024-02-13'),
          summary: 'Security bypass',
          isKnownExploited: true,
        },
        {
          patchId: 'CVE-2023-38831',
          title: 'WinRAR Remote Code Execution Vulnerability',
          severity: 'HIGH',
          status: 'PENDING',
          releaseDate: new Date('2023-08-23'),
          summary: 'Archive code execution',
          isKnownExploited: true,
        },
      ]),
    };

    service = new RmmPatchService(
      mockPatchRepo,
      mockTelemetryRepo,
      mockEquipRepo,
      mockSubRepo,
      mockZabbixSvc,
      mockAlertSvc,
      mockGateway,
      mockCorrelationSvc
    );
  });

  it('dynamically correlates OSINT security advisories when equipment has no existing patches', async () => {
    const patches = await service.getEquipmentPatches(equipmentId, tenantId);

    expect(mockEquipRepo.findById).toHaveBeenCalledWith(equipmentId);
    expect(mockPatchRepo.createPatch).toHaveBeenCalledTimes(2);
    expect(patches.length).toBe(2);
    expect(patches[0].patch_id).toBe('CVE-2024-21412');
  });

  it('triggers Zabbix telemetry scan and upserts device telemetry when agent is offline', async () => {
    const telemetry = await service.triggerPatchScan(equipmentId, tenantId);

    expect(mockZabbixSvc.syncHost).toHaveBeenCalled();
    expect(mockTelemetryRepo.upsertTelemetry).toHaveBeenCalled();
    expect(telemetry.agent_status).toBe('ONLINE');
  });

  it('captures live Rust endpoint agent diagnostics and skips Zabbix when agent is online', async () => {
    mockGateway.isAgentConnected.mockReturnValue(true);
    mockGateway.sendCommand.mockResolvedValue({
      equipmentId,
      command: 'DIAGNOSE_PC',
      data: {
        hostname: 'DEV-PC-1',
        cpu: { global_usage_pct: 51.9 },
        memory: { usage_pct: 48.9 },
        disks: [
          {
            mount_point: 'C:\\',
            usage_pct: 97.6,
            used_bytes: 267954159616, // ~249.55 GB
            total_bytes: 274426560512, // ~255.58 GB
          },
        ],
      },
      durationMs: 120,
    });

    const telemetry = await service.triggerPatchScan(equipmentId, tenantId);

    expect(mockGateway.isAgentConnected).toHaveBeenCalledWith(equipmentId);
    expect(mockGateway.sendCommand).toHaveBeenCalledWith(equipmentId, 'DIAGNOSE_PC', undefined, 10000);
    expect(mockZabbixSvc.syncHost).not.toHaveBeenCalled();
    expect(mockTelemetryRepo.upsertTelemetry).toHaveBeenCalledWith(
      expect.objectContaining({
        equipment_id: equipmentId,
        tenant_id: tenantId,
        agent_status: 'ONLINE',
        cpu_usage: 51.9,
        memory_usage: 48.9,
        disk_usage: 97.6,
        disk_used_gb: 249.55,
        disk_total_gb: 255.58,
      })
    );
    expect(mockEquipRepo.update).toHaveBeenCalledWith(
      equipmentId,
      expect.objectContaining({ agent_last_seen_at: expect.any(Date) })
    );
    expect(telemetry.agent_status).toBe('ONLINE');
  });

  it('applies patches after checking plan feature entitlement', async () => {
    await service.applyPatches(equipmentId, ['p-1'], tenantId);

    expect(mockZabbixSvc.executePatchScript).toHaveBeenCalledWith('zbx-1', 'p-1');
    expect(mockPatchRepo.updatePatchStatus).toHaveBeenCalledWith('p-1', RmmPatchStatus.INSTALLED, expect.any(Date));
  });

  it('calculates global RMM overview statistics and SLA metrics', async () => {
    const overview = await service.getRmmOverview(tenantId);

    expect(overview.noiseReductionRatio).toBe(0.88);
    expect(overview.selfHealingEfficiency).toBe(0.90);
    expect(overview.automatedFCR).toBe(0.45);
  });
});
