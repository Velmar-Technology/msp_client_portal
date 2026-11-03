import { Ticket } from "lucide-react";
import type { FeatureManifest } from "@/routes/featureRegistry";
import { ticketRoutes } from "./routes";

/**
 * Self-registering hierarchical child manifest for Helpdesk Tickets (ADR-017).
 * Nests under parent 'helpdesk' ('/helpdesk') in the sidebar and '/helpdesk/tickets' in the router.
 */
export const featureManifest: FeatureManifest = {
  id: "helpdesk.tickets",
  parentId: "helpdesk",
  routes: ticketRoutes,
  navItems: [
    {
      to: "/helpdesk/tickets",
      parentTo: "/helpdesk",
      icon: Ticket,
      labelKey: "tickets",
      group: "operations",
      order: 10,
      counterKey: "tickets",
      roles: ["CLIENT", "TECHNICIAN", "ADMIN"],
      requiredPermission: ["helpdesk:tickets:read", "tickets:read"],
    },
  ],
};
