import type { FeatureManifest } from "@/routes/featureRegistry";
import { baseRoutes } from "./routes";

/**
 * Self-registering parent container manifest for the Base domain (ADR-017 / ADR-018).
 * Houses common core sub-modules (`base.users`, `base.auth`) and establishes
 * shared identity UI primitives for downstream modules.
 *
 * @see ADR-017
 * @see ADR-018
 */
export const featureManifest: FeatureManifest = {
  id: "base",
  routes: baseRoutes,
};
