import { FEATURE_CATALOG } from "./featureCatalog";

/**
 * Subscription & Plan Constants
 */

export const PLAN_CLIENT_TYPES = ["CLIENT", "ENTERPRISE", "STUDENT", "OTHER"] as const;
export type PlanClientType = (typeof PLAN_CLIENT_TYPES)[number];

export const SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-primary/10 text-primary border-primary/20",
  EXPIRING: "bg-secondary text-secondary-foreground border-border",
  EXPIRED: "bg-destructive/10 text-destructive border-destructive/20",
  CANCELLED: "bg-muted text-muted-foreground border-border",
};

/** Canonical 24 feature codes matching FEATURE_CATALOG */
export const FEATURE_CODES = {
  HELPDESK_SUPPORT: "HELPDESK_SUPPORT",
  SECURITY_MONITORING: "SECURITY_MONITORING",
  CLOUD_STORAGE: "CLOUD_STORAGE",
  BACKUP_INCLUDED: "BACKUP_INCLUDED",
  SLA_LEVEL: "SLA_LEVEL",
  RMM_PATCH_MANAGEMENT: "RMM_PATCH_MANAGEMENT",
  ONSITE_SUPPORT: "ONSITE_SUPPORT",
  CONTENT_FILTERING: "CONTENT_FILTERING",
  PREMIUM_CONTENT_FILTERING: "PREMIUM_CONTENT_FILTERING",
  EDR_SECURITY: "EDR_SECURITY",
  M365_BACKUP: "M365_BACKUP",
  EDR_M365_BACKUP: "EDR_M365_BACKUP",
  VULNERABILITY_SCANNING: "VULNERABILITY_SCANNING",
  IDENTITY_MFA_MANAGEMENT: "IDENTITY_MFA_MANAGEMENT",
  ASSET_LIFECYCLE: "ASSET_LIFECYCLE",
  VCIO_REVIEW: "VCIO_REVIEW",
  COMPLIANCE_AUDIT: "COMPLIANCE_AUDIT",
  REPORTING_LEVEL: "REPORTING_LEVEL",
  PASSWORD_MANAGER: "PASSWORD_MANAGER",
  DARK_WEB_MONITORING: "DARK_WEB_MONITORING",
  PASSWORD_DARK_WEB: "PASSWORD_DARK_WEB",
  PHISHING_TRAINING: "PHISHING_TRAINING",
  STORE_DISCOUNT: "STORE_DISCOUNT",
  CUSTOM_FEATURE: "CUSTOM_FEATURE",
} as const;

export type FeatureCode = (typeof FEATURE_CATALOG)[number]["code"] | string;

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

/** Mapping from feature code to minimum recommended upgrade plan ID */
export const FEATURE_UPGRADE_TIER_MAP: Record<string, string> = {
  [FEATURE_CODES.PASSWORD_MANAGER]: "PL-003", // Advanced Plan
  [FEATURE_CODES.PASSWORD_DARK_WEB]: "PL-003", // Advanced Plan
  [FEATURE_CODES.RMM_PATCH_MANAGEMENT]: "PL-001", // Basic Plan
  [FEATURE_CODES.CLOUD_STORAGE]: "PL-001", // Basic Plan
  [FEATURE_CODES.HELPDESK_SUPPORT]: "PL-001", // Basic Plan
  [FEATURE_CODES.BACKUP_INCLUDED]: "PL-001", // Basic Plan
  [FEATURE_CODES.SECURITY_MONITORING]: "PL-002", // Standard Plan
  [FEATURE_CODES.EDR_SECURITY]: "PL-003", // Advanced Plan
  [FEATURE_CODES.M365_BACKUP]: "PL-003", // Advanced Plan
  [FEATURE_CODES.EDR_M365_BACKUP]: "PL-003", // Advanced Plan
};
