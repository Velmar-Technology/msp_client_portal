import { Settings } from "lucide-react";
import type { FeatureManifest } from "@/routes/featureRegistry";
import { settingsRoutes } from "./routes";

/**
 * Self-registering manifest for Base Settings (ADR-017 / ADR-019).
 * Mounts the unified /settings hub and attaches account sidebar navigation item.
 *
 * @see ADR-016
 * @see ADR-017
 * @see ADR-019
 */
export const featureManifest: FeatureManifest = {
  id: "base.settings",
  parentId: "base",
  routes: settingsRoutes,
  navItems: [
    {
      to: "/settings",
      icon: Settings,
      labelKey: "settings",
      group: "account",
      order: 100,
      roles: ["ADMIN", "TECHNICIAN", "CLIENT", "GUEST"],
      requiredPermission: "settings:read",
    },
  ],
};
