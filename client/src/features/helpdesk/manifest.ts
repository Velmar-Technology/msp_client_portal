import { Ticket } from "lucide-react";
import type { FeatureManifest } from "@/routes/featureRegistry";
import { helpdeskRoutes } from "./routes";

/**
 * Self-registering parent feature manifest for Helpdesk (ADR-017).
 * Creates a collapsible '/helpdesk' sidebar item in 'operations' (order: 70)
 * into which child sub-modules ('helpdesk.tickets' and 'helpdesk.kb') inject their items.
 */
export const featureManifest: FeatureManifest = {
  id: "helpdesk",
  routes: helpdeskRoutes,
  navItems: [
    {
      to: "/helpdesk",
      icon: Ticket,
      labelKey: "helpdesk",
      group: "operations",
      order: 70,
      roles: ["CLIENT", "TECHNICIAN", "ADMIN"],
    },
  ],
};
