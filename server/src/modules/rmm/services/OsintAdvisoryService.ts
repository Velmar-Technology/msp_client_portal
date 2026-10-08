import { logger } from '@shared/utils/logger';
import { cacheManager, CacheManager } from '@shared/utils/cache/CacheManager';
import { RmmPatchSeverity } from '@shared/types';

export interface CisaKevVulnerability {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse?: string;
  notes?: string;
}

export interface CisaKevCatalog {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: CisaKevVulnerability[];
}

export interface OsintAdvisory {
  cveId: string;
  title: string;
  vendor: string;
  product: string;
  severity: RmmPatchSeverity;
  cvssScore?: number;
  isKnownExploited: boolean;
  publishedDate: Date;
  summary: string;
  remediationAction?: string;
}

/**
 * Domain service querying public OSINT threat and vulnerability intelligence feeds (CISA KEV catalog, NIST NVD).
 * Maintains cached threat advisories with TTL to avoid upstream rate limits.
 */
export class OsintAdvisoryService {
  private static readonly CISA_KEV_URL = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
  private static readonly CACHE_TTL_SECONDS = 21600; // 6 hours
  private static readonly CACHE_KEY = 'rmm:osint:cisa_kev_advisories';

  constructor(private cache: CacheManager = cacheManager) {}

  /**
   * Fetches and normalizes the CISA Known Exploited Vulnerabilities catalog.
   * Utilizes CacheManager (Redis + in-memory fallback) with a 6-hour TTL.
   *
   * @param forceRefresh - Optional flag to bypass cache
   * @returns Array of OsintAdvisory records
   */
  async fetchKnownExploitedVulnerabilities(forceRefresh = false): Promise<OsintAdvisory[]> {
    if (forceRefresh) {
      await this.cache.del(OsintAdvisoryService.CACHE_KEY);
    }

    return this.cache.wrap<OsintAdvisory[]>(
      OsintAdvisoryService.CACHE_KEY,
      OsintAdvisoryService.CACHE_TTL_SECONDS,
      async () => {
        try {
          logger.info('[OsintAdvisoryService] Fetching CISA KEV catalog feed...');
          const response = await fetch(OsintAdvisoryService.CISA_KEV_URL, {
            headers: {
              'User-Agent': 'Velmar-MSP-Client-Portal/1.12.0 (OSINT Threat Engine)',
              Accept: 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`CISA KEV request failed with HTTP ${response.status}: ${response.statusText}`);
          }

          const catalog: CisaKevCatalog = (await response.json()) as CisaKevCatalog;
          if (!catalog || !Array.isArray(catalog.vulnerabilities)) {
            logger.warn('[OsintAdvisoryService] Invalid payload format received from CISA KEV feed');
            return this.getFallbackCatalog();
          }

          logger.info(`[OsintAdvisoryService] Successfully parsed ${catalog.vulnerabilities.length} CISA KEV records`);

          return catalog.vulnerabilities.map((v) => this.mapKevToAdvisory(v));
        } catch (err: any) {
          logger.warn(`[OsintAdvisoryService] Failed to retrieve live CISA KEV feed: ${err?.message}. Falling back to baseline catalog.`);
          return this.getFallbackCatalog();
        }
      }
    );
  }

  /**
   * Maps a single CISA KEV raw record to a standardized OsintAdvisory entity.
   *
   * @param kev - Raw CISA KEV entry
   * @returns Normalized OsintAdvisory
   */
  private mapKevToAdvisory(kev: CisaKevVulnerability): OsintAdvisory {
    return {
      cveId: kev.cveID,
      title: kev.vulnerabilityName || `${kev.vendorProject} ${kev.product} Vulnerability`,
      vendor: kev.vendorProject,
      product: kev.product,
      severity: RmmPatchSeverity.CRITICAL, // CISA KEV entries are actively exploited in the wild -> Critical SLA
      isKnownExploited: true,
      publishedDate: new Date(kev.dateAdded),
      summary: kev.shortDescription,
      remediationAction: kev.requiredAction,
    };
  }

  /**
   * Safe offline / airgapped fallback catalog containing high-profile enterprise advisories.
   *
   * @returns Baseline OsintAdvisory array
   */
  getFallbackCatalog(): OsintAdvisory[] {
    return [
      {
        cveId: 'CVE-2024-21626',
        title: 'RunC Container Escape & Host Filesystem Leak',
        vendor: 'Linux / Open Containers',
        product: 'runc / Linux Kernel',
        severity: RmmPatchSeverity.CRITICAL,
        isKnownExploited: true,
        publishedDate: new Date('2024-01-31'),
        summary: 'A file descriptor leak vulnerability in runc allows container escapes to host root filesystem.',
        remediationAction: 'Apply runc 1.1.12 update or restart container daemons.',
      },
      {
        cveId: 'CVE-2024-21412',
        title: 'Microsoft Windows SmartScreen Remote Code Execution Bypass',
        vendor: 'Microsoft',
        product: 'Windows 11 / Windows 10',
        severity: RmmPatchSeverity.HIGH,
        isKnownExploited: true,
        publishedDate: new Date('2024-02-13'),
        summary: 'Internet Shortcut Files Security Feature Bypass Vulnerability in Windows Defender SmartScreen.',
        remediationAction: 'Install Microsoft Cumulative Security Update KB5034123 or newer.',
      },
      {
        cveId: 'CVE-2023-38831',
        title: 'WinRAR Remote Code Execution via Spoofed Extension Archive',
        vendor: 'RARLAB',
        product: 'WinRAR',
        severity: RmmPatchSeverity.HIGH,
        isKnownExploited: true,
        publishedDate: new Date('2023-08-23'),
        summary: 'Processing crafted ZIP archives causes execution of malicious payload when viewing decoy file.',
        remediationAction: 'Upgrade WinRAR to version 6.23 or higher.',
      },
    ];
  }
}

export const osintAdvisoryService = new OsintAdvisoryService();
