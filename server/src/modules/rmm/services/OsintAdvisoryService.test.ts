import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OsintAdvisoryService, OsintAdvisory } from './OsintAdvisoryService';
import { PatchCorrelationService } from './PatchCorrelationService';
import { RmmPatchSeverity, RmmPatchStatus } from '@shared/types';

describe('OsintAdvisoryService & PatchCorrelationService', () => {
  let osintService: OsintAdvisoryService;
  let correlationService: PatchCorrelationService;
  let mockCache: any;

  beforeEach(() => {
    mockCache = {
      del: vi.fn().mockResolvedValue(true),
      wrap: vi.fn().mockImplementation((key, ttl, fn) => fn()),
    };

    osintService = new OsintAdvisoryService(mockCache);
    correlationService = new PatchCorrelationService(osintService);
  });

  describe('OsintAdvisoryService', () => {
    it('returns fallback security catalog when external CISA KEV fetch encounters network errors', async () => {
      // Mock global fetch rejection
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network unreachable')));

      const advisories = await osintService.fetchKnownExploitedVulnerabilities();

      expect(advisories.length).toBeGreaterThan(0);
      expect(advisories.some((a) => a.cveId === 'CVE-2024-21626')).toBe(true);
      expect(advisories.some((a) => a.cveId === 'CVE-2024-21412')).toBe(true);

      vi.unstubAllGlobals();
    });

    it('fetches and parses live CISA KEV JSON catalog correctly', async () => {
      const mockCisaResponse = {
        title: 'CISA Catalog of Known Exploited Vulnerabilities',
        catalogVersion: '2024.03.01',
        dateReleased: '2024-03-01T00:00:00.000Z',
        count: 1,
        vulnerabilities: [
          {
            cveID: 'CVE-2024-99999',
            vendorProject: 'Microsoft',
            product: 'Windows Kernel',
            vulnerabilityName: 'Windows Elevation of Privilege Vulnerability',
            dateAdded: '2024-03-01',
            shortDescription: 'Windows Kernel allows local authenticated attacker to gain SYSTEM privileges.',
            requiredAction: 'Apply vendor mitigation.',
            dueDate: '2024-03-21',
          },
        ],
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: vi.fn().mockResolvedValue(mockCisaResponse),
        })
      );

      const advisories = await osintService.fetchKnownExploitedVulnerabilities();

      expect(advisories.length).toBe(1);
      expect(advisories[0].cveId).toBe('CVE-2024-99999');
      expect(advisories[0].severity).toBe(RmmPatchSeverity.CRITICAL);
      expect(advisories[0].isKnownExploited).toBe(true);

      vi.unstubAllGlobals();
    });
  });

  describe('PatchCorrelationService', () => {
    it('detects Windows OS profile from device hostname and name', () => {
      const profile = correlationService.detectOsProfile({
        id: 'equip-win',
        device_name: 'Finance Executive Laptop',
        agent_hostname: 'WS-FINANCE-01',
      });

      expect(profile.osFamily).toBe('WINDOWS');
    });

    it('detects Linux OS profile from server hostname and name', () => {
      const profile = correlationService.detectOsProfile({
        id: 'equip-linux',
        device_name: 'Production Kubernetes Node',
        agent_hostname: 'ACME-PROD-SRV01',
      });

      expect(profile.osFamily).toBe('LINUX');
    });

    it('correlates Linux container escape vulnerabilities (RunC) for Linux hosts', async () => {
      const mockAdvisories: OsintAdvisory[] = [
        {
          cveId: 'CVE-2024-21626',
          title: 'Linux Kernel RunC Container Escape Fix',
          vendor: 'Linux',
          product: 'runc / Linux Kernel',
          severity: RmmPatchSeverity.CRITICAL,
          isKnownExploited: true,
          publishedDate: new Date('2024-01-31'),
          summary: 'File descriptor leak container escape.',
        },
        {
          cveId: 'CVE-2024-21412',
          title: 'Microsoft Windows SmartScreen RCE',
          vendor: 'Microsoft',
          product: 'Windows 11',
          severity: RmmPatchSeverity.HIGH,
          isKnownExploited: true,
          publishedDate: new Date('2024-02-13'),
          summary: 'Windows smartscreen bypass.',
        },
      ];

      vi.spyOn(osintService, 'fetchKnownExploitedVulnerabilities').mockResolvedValue(mockAdvisories);

      const profile = correlationService.detectOsProfile({
        id: 'equip-linux',
        device_name: 'Linux Database Server',
        agent_hostname: 'UBUNTU-DB-01',
      });

      const candidates = await correlationService.correlateAdvisoriesForDevice(profile);

      expect(candidates.length).toBe(1);
      expect(candidates[0].patchId).toBe('CVE-2024-21626');
      expect(candidates[0].severity).toBe(RmmPatchSeverity.CRITICAL);
      expect(candidates[0].status).toBe(RmmPatchStatus.PENDING);
    });
  });
});
