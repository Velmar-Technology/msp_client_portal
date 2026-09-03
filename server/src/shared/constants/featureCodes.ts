/**
 * Canonical Feature Codes for MSP Subscription Plans.
 * Sourced from the master catalog (client/src/constants/featureCatalog.ts).
 */
export const FEATURE_CODES = {
  HELPDESK_SUPPORT: 'HELPDESK_SUPPORT',
  SECURITY_MONITORING: 'SECURITY_MONITORING',
  CLOUD_STORAGE: 'CLOUD_STORAGE',
  BACKUP_INCLUDED: 'BACKUP_INCLUDED',
  SLA_LEVEL: 'SLA_LEVEL',
  RMM_PATCH_MANAGEMENT: 'RMM_PATCH_MANAGEMENT',
  ONSITE_SUPPORT: 'ONSITE_SUPPORT',
  CONTENT_FILTERING: 'CONTENT_FILTERING',
  PREMIUM_CONTENT_FILTERING: 'PREMIUM_CONTENT_FILTERING',
  EDR_SECURITY: 'EDR_SECURITY',
  M365_BACKUP: 'M365_BACKUP',
  EDR_M365_BACKUP: 'EDR_M365_BACKUP',
  VULNERABILITY_SCANNING: 'VULNERABILITY_SCANNING',
  IDENTITY_MFA_MANAGEMENT: 'IDENTITY_MFA_MANAGEMENT',
  ASSET_LIFECYCLE: 'ASSET_LIFECYCLE',
  VCIO_REVIEW: 'VCIO_REVIEW',
  COMPLIANCE_AUDIT: 'COMPLIANCE_AUDIT',
  REPORTING_LEVEL: 'REPORTING_LEVEL',
  PASSWORD_MANAGER: 'PASSWORD_MANAGER',
  DARK_WEB_MONITORING: 'DARK_WEB_MONITORING',
  PASSWORD_DARK_WEB: 'PASSWORD_DARK_WEB',
  PHISHING_TRAINING: 'PHISHING_TRAINING',
  STORE_DISCOUNT: 'STORE_DISCOUNT',
  CUSTOM_FEATURE: 'CUSTOM_FEATURE',
} as const;

export type FeatureCode = typeof FEATURE_CODES[keyof typeof FEATURE_CODES];

/**
 * Composite bundle expansions.
 * Tiers selling bundled packages automatically grant entitlement to their constituent services.
 */
export const FEATURE_BUNDLE_EXPANSIONS: Record<string, readonly string[]> = {
  [FEATURE_CODES.PASSWORD_DARK_WEB]: [
    FEATURE_CODES.PASSWORD_MANAGER,
    FEATURE_CODES.DARK_WEB_MONITORING,
  ],
  [FEATURE_CODES.EDR_M365_BACKUP]: [
    FEATURE_CODES.EDR_SECURITY,
    FEATURE_CODES.M365_BACKUP,
  ],
  [FEATURE_CODES.PREMIUM_CONTENT_FILTERING]: [
    FEATURE_CODES.CONTENT_FILTERING,
  ],
} as const;

/**
 * Decomposes composite / bundled plan feature codes into their granular feature capabilities.
 * For example, 'PASSWORD_DARK_WEB' grants both 'PASSWORD_MANAGER' and 'DARK_WEB_MONITORING'.
 *
 * @param features - List of raw feature codes from active subscriptions
 * @returns Deduplicated array including all original feature codes plus any unlocked sub-features
 */
export function expandFeatureBundles(features: Iterable<string>): string[] {
  const result = new Set<string>();
  for (const feat of features) {
    if (!feat) continue;
    result.add(feat);
    const subFeatures = FEATURE_BUNDLE_EXPANSIONS[feat];
    if (subFeatures) {
      for (const sub of subFeatures) {
        result.add(sub);
      }
    }
  }
  return Array.from(result);
}
