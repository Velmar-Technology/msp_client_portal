import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RmmPatchService } from './RmmPatchService';
import { RmmPatchSeverity, RmmPatchStatus } from '../types';

describe('RmmPatchService', () => {
  let service: RmmPatchService;
  let mockPatchRepo: any;
  let mockTelemetryRepo: any;
  let mockEquipRepo: any;
  let mockSubRepo: any;
  let mockZabbixSvc: any;
  let mockAlertSvc: any;

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

    service = new RmmPatchService(
      mockPatchRepo,
      mockTelemetryRepo,
      mockEquipRepo,
      mockSubRepo,
      mockZabbixSvc,
      mockAlertSvc
    );
  });

  it('seeds default security patches if equipment has no existing patches', async () => {
    const patches = await service.getEquipmentPatches(equipmentId, tenantId);

    expect(mockEquipRepo.findById).toHaveBeenCalledWith(equipmentId);
    expect(mockPatchRepo.createPatch).toHaveBeenCalledTimes(3);
    expect(patches.length).toBe(3);
  });

  it('triggers Zabbix telemetry scan and upserts device telemetry', async () => {
    const telemetry = await service.triggerPatchScan(equipmentId, tenantId);

    expect(mockZabbixSvc.syncHost).toHaveBeenCalled();
    expect(mockTelemetryRepo.upsertTelemetry).toHaveBeenCalled();
    expect(telemetry.agent_status).toBe('ONLINE');
  });

  it('applies patches after checking plan feature entitlement', async () => {
    const applied = await service.applyPatches(equipmentId, ['p-1'], tenantId);

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
