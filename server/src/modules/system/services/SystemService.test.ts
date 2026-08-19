import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemService } from './SystemService';

describe('SystemService', () => {
  let mockDbPool: any;
  let mockStorageService: any;
  let systemService: SystemService;

  beforeEach(() => {
    mockDbPool = {
      execute: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    mockStorageService = {
      getStorageUsage: vi.fn().mockResolvedValue({
        used: 100,
        available: 900,
        total: 1000,
        percentage: 10,
        status: 'online',
      }),
    };
    systemService = new SystemService(mockDbPool, mockStorageService);
  });

  it('should return operational status when DB and Storage are healthy', async () => {
    const result = await systemService.getApiStatus();

    expect(result.overallStatus).toBe('OPERATIONAL');
    expect(result.totalServices).toBeGreaterThan(5);
    expect(result.operationalCount).toBe(result.totalServices);
    expect(result.degradedCount).toBe(0);
    expect(result.downCount).toBe(0);
    expect(result.services.find((s) => s.id === 'db_postgres')?.status).toBe('OPERATIONAL');
    expect(result.services.find((s) => s.id === 'nextcloud_storage')?.status).toBe('OPERATIONAL');
  });

  it('should reflect degraded status when storage is offline', async () => {
    mockStorageService.getStorageUsage.mockResolvedValueOnce({
      used: 100,
      available: 900,
      total: 1000,
      percentage: 10,
      status: 'offline',
    });

    const result = await systemService.getApiStatus();

    expect(result.overallStatus).toBe('DEGRADED');
    expect(result.degradedCount).toBeGreaterThan(0);
    expect(result.services.find((s) => s.id === 'nextcloud_storage')?.status).toBe('DEGRADED');
  });

  it('should handle database errors gracefully and set status to DOWN', async () => {
    mockDbPool.execute.mockRejectedValueOnce(new Error('Connection failed'));

    const result = await systemService.getApiStatus();

    expect(result.overallStatus).toBe('DOWN');
    expect(result.downCount).toBe(1);
    expect(result.services.find((s) => s.id === 'db_postgres')?.status).toBe('DOWN');
  });

  it('should evaluate environment variables status and mask secrets properly', async () => {
    const customEnv = {
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      JWT_SECRET: 'super_secret_jwt_key_123456789',
      WHATSAPP_API_KEY: 'your_api_key_here',
      ZABBIX_WEBHOOK_SECRET: 'secret_key',
    };

    const envStatus = systemService.getEnvVariablesStatus(customEnv);

    expect(envStatus.length).toBe(34);

    const dbHost = envStatus.find((e) => e.key === 'DB_HOST');
    expect(dbHost?.status).toBe('CONFIGURED');
    expect(dbHost?.valueDisplay).toBe('localhost');
    expect(dbHost?.isSecret).toBe(false);

    const jwtSecret = envStatus.find((e) => e.key === 'JWT_SECRET');
    expect(jwtSecret?.status).toBe('CONFIGURED');
    expect(jwtSecret?.isSecret).toBe(true);
    expect(jwtSecret?.valueDisplay).not.toBe('super_secret_jwt_key_123456789');
    expect(jwtSecret?.valueDisplay).toContain('••••••••');

    const whatsappKey = envStatus.find((e) => e.key === 'WHATSAPP_API_KEY');
    expect(whatsappKey?.status).toBe('DEFAULT_PLACEHOLDER');

    const missingVar = envStatus.find((e) => e.key === 'GOOGLE_CLIENT_ID');
    expect(missingVar?.status).toBe('MISSING');
    expect(missingVar?.valueDisplay).toBe('UNSET');
  });

  it('should include envVariables and metrics in getApiStatus() payload', async () => {
    const result = await systemService.getApiStatus();

    expect(result.envVariables).toBeDefined();
    expect(Array.isArray(result.envVariables)).toBe(true);
    expect(result.envTotal).toBe(34);
    expect(typeof result.envConfiguredCount).toBe('number');
    expect(typeof result.envDegradedCount).toBe('number');
    expect(typeof result.envMissingCount).toBe('number');
  });
});

