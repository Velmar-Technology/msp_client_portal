import { Users } from "lucide-react";
import type { FeatureManifest } from "@/routes/featureRegistry";
import { usersRoutes } from "@/features/users";

/**
 * Self-registering child manifest for Base Users (ADR-017 / ADR-018).
 * Mounts protected user management routes and attaches Dynamic RBAC sidebar entry.
 *
 * @see ADR-017
 * @see ADR-018
 */
export const featureManifest: FeatureManifest = {
  id: "base.users",
  parentId: "base",
  routes: usersRoutes,
  navItems: [
    {
      to: "/admin/users",
      icon: Users,
      labelKey: "userManagement",
      group: "management",
      order: 40,
      roles: ["ADMIN"],
      requiredPermission: "users:read",
    },
  ],
};
