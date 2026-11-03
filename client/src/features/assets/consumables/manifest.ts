import type { FeatureManifest } from '@/routes/featureRegistry';

/**
 * Self-registering feature manifest for IT Consumables (ADR-017).
 * Per the 1–3 Page Consolidation Rule (ADR-016), consumables navigation is integrated
 * into the unified '/assets' page via in-page tabs (?tab=consumables) without separate
 * sidebar sub-items or conflicting sub-routes.
 */
export const featureManifest: FeatureManifest = {
  id: 'assets.consumables',
  parentId: 'assets',
};
