import { OsintAdvisory, OsintAdvisoryService, osintAdvisoryService } from './OsintAdvisoryService';
import { RmmPatchSeverity, RmmPatchStatus } from '@shared/types';
import { logger } from '@shared/utils/logger';

export interface DeviceOsProfile {
  equipmentId: string;
  deviceName?: string | null;
  agentHostname?: string | null;
  osFamily: 'WINDOWS' | 'LINUX' | 'MACOS' | 'UNKNOWN';
  rawOsString?: string;
  architecture?: string;
}

export interface CorrelatedPatchCandidate {
  patchId: string;
  title: string;
  severity: RmmPatchSeverity;
  status: RmmPatchStatus;
  releaseDate: Date;
  summary: string;
  isKnownExploited: boolean;
}

/**
 * Service correlating endpoint hardware/telemetry profiles against OSINT vulnerability intelligence.
 */
export class PatchCorrelationService {
  constructor(private osintService: OsintAdvisoryService = osintAdvisoryService) {}

  /**
   * Infers operating system profile from device metadata and hostname patterns.
   *
   * @param device - Device metadata
   * @returns Inferred DeviceOsProfile
   */
  detectOsProfile(device: {
    id: string;
    device_name?: string | null;
    agent_hostname?: string | null;
  }): DeviceOsProfile {
    const raw = `${device.device_name || ''} ${device.agent_hostname || ''}`.toUpperCase();

    let osFamily: DeviceOsProfile['osFamily'] = 'WINDOWS';

    if (raw.includes('LINUX') || raw.includes('UBUNTU') || raw.includes('DEBIAN') || raw.includes('CENTOS') || raw.includes('RHEL') || raw.includes('PROD-SRV')) {
      osFamily = 'LINUX';
    } else if (raw.includes('MAC') || raw.includes('DARWIN') || raw.includes('APPLE')) {
      osFamily = 'MACOS';
    } else if (raw.includes('WIN') || raw.includes('WS-') || raw.includes('LAPTOP') || raw.includes('DESKTOP') || raw.includes('PC')) {
      osFamily = 'WINDOWS';
    }

    return {
      equipmentId: device.id,
      deviceName: device.device_name,
      agentHostname: device.agent_hostname,
      osFamily,
      rawOsString: raw,
    };
  }

  /**
   * Correlates an endpoint device profile with ingested CISA KEV and threat intelligence advisories.
   *
   * @param profile - Endpoint OS profile
   * @returns Array of patch candidates to provision
   */
  async correlateAdvisoriesForDevice(profile: DeviceOsProfile): Promise<CorrelatedPatchCandidate[]> {
    const advisories = await this.osintService.fetchKnownExploitedVulnerabilities();

    const matched: CorrelatedPatchCandidate[] = [];

    for (const adv of advisories) {
      if (this.isAdvisoryApplicable(profile, adv)) {
        matched.push({
          patchId: adv.cveId,
          title: adv.title,
          severity: adv.severity,
          status: RmmPatchStatus.PENDING,
          releaseDate: adv.publishedDate,
          summary: adv.summary,
          isKnownExploited: adv.isKnownExploited,
        });
      }
    }

    // If no specific match was filtered, provide relevant OS-specific baseline advisories
    if (matched.length === 0) {
      const fallback = this.osintService.getFallbackCatalog();
      for (const adv of fallback) {
        if (this.isAdvisoryApplicable(profile, adv)) {
          matched.push({
            patchId: adv.cveId,
            title: adv.title,
            severity: adv.severity,
            status: RmmPatchStatus.PENDING,
            releaseDate: adv.publishedDate,
            summary: adv.summary,
            isKnownExploited: adv.isKnownExploited,
          });
        }
      }
    }

    logger.info(
      `[PatchCorrelationService] Correlated ${matched.length} OSINT patch advisories for ${profile.equipmentId} (OS: ${profile.osFamily})`
    );

    return matched;
  }

  /**
   * Evaluates if a given vulnerability advisory targets the device OS family or ecosystem.
   *
   * @param profile - Endpoint device profile
   * @param advisory - OSINT advisory
   * @returns boolean indicating applicability
   */
  private isAdvisoryApplicable(profile: DeviceOsProfile, advisory: OsintAdvisory): boolean {
    const targetText = `${advisory.vendor} ${advisory.product} ${advisory.title}`.toUpperCase();

    if (profile.osFamily === 'WINDOWS') {
      return (
        targetText.includes('WINDOWS') ||
        targetText.includes('MICROSOFT') ||
        targetText.includes('WINRAR') ||
        targetText.includes('CHROME') ||
        targetText.includes('EDGE') ||
        targetText.includes('OFFICE')
      );
    }

    if (profile.osFamily === 'LINUX') {
      return (
        targetText.includes('LINUX') ||
        targetText.includes('KERNEL') ||
        targetText.includes('RUNC') ||
        targetText.includes('UBUNTU') ||
        targetText.includes('DEBIAN') ||
        targetText.includes('OPENSSL') ||
        targetText.includes('CONTAINER')
      );
    }

    if (profile.osFamily === 'MACOS') {
      return targetText.includes('APPLE') || targetText.includes('MACOS') || targetText.includes('SAFARI');
    }

    return true;
  }
}

export const patchCorrelationService = new PatchCorrelationService();
