import type { FeatureManifest } from "@/routes/featureRegistry";
import { baseRoutes } from "./routes";

/**
 * Self-registering pure parent container manifest for the Base domain (ADR-017 / ADR-018).
 * Houses core sub-features (`base.users`, `base.settings`) and establishes
 * the `/base` URL hierarchy.
 *
 * @see ADR-017
 * @see ADR-018
 */
export const featureManifest: FeatureManifest = {
  id: "base",
  routes: baseRoutes,
};
