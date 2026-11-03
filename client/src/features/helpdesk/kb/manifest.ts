import { BookOpen } from "lucide-react";
import type { FeatureManifest } from "@/routes/featureRegistry";
import { kbRoutes } from "./routes";

/**
 * Self-registering hierarchical child manifest for Helpdesk Knowledge Base (ADR-017).
 * Nests under parent 'helpdesk' ('/helpdesk') in the sidebar and '/helpdesk/kb' in the router.
 */
export const featureManifest: FeatureManifest = {
  id: "helpdesk.kb",
  parentId: "helpdesk",
  routes: kbRoutes,
  navItems: [
    {
      to: "/helpdesk/kb",
      parentTo: "/helpdesk",
      icon: BookOpen,
      labelKey: "help",
      group: "operations",
      order: 20,
      roles: ["CLIENT", "TECHNICIAN", "ADMIN", "GUEST"],
      requiredPermission: ["helpdesk:kb:read", "tickets:read"],
    },
  ],
};
