import type { FeatureManifest } from "@/routes/featureRegistry";

/**
 * Self-registering pure parent container manifest for the Base domain (ADR-017 / ADR-018).
 * Acts as an organizational container for core sub-features (`base.users`, `base.settings`)
 * without imposing a parent URL prefix on their canonical root routes.
 *
 * @see ADR-017
 * @see ADR-018
 */
export const featureManifest: FeatureManifest = {
  id: "base",
};
